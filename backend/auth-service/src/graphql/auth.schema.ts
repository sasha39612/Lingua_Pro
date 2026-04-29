// modules below may not have type declarations available yet
// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';
// @ts-ignore - Prisma v7 types export resolution
import { PrismaClient } from '../generated/prisma';
// @ts-ignore - Prisma v7 types export resolution
import type { User as PrismaUser } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
// @ts-ignore - types may not be installed in this workspace; a declaration shim exists
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[startup] Required env var ${name} is not set`);
  return v;
}

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/lingua_pro_auth?schema=public';
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = requireEnv('JWT_SECRET');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

const ALLOWED_ROLES = new Set(['student', 'admin']);

const INTERNAL_SERVICE_SECRET = requireEnv('INTERNAL_SERVICE_SECRET');
const ALLOWED_INTERNAL_SERVICES = new Set(['stats-service', 'api-gateway']);

function isInternalServiceCall(context: any): boolean {
  if (!INTERNAL_SERVICE_SECRET) return false;
  const token = context?.internalToken;
  const service = context?.internalService;
  if (!token || !service) return false;
  if (token !== INTERNAL_SERVICE_SECRET) return false;
  if (!ALLOWED_INTERNAL_SERVICES.has(service)) return false;
  console.log(`[auth-service] internal access by service: ${service}`);
  return true;
}

function validateEmail(email: string): void {
  // Basic RFC-like validation that rejects obvious malformed emails.
  const normalized = (email || '').trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(normalized)) {
    throw new Error('Invalid email format');
  }
}

function validatePassword(password: string): void {
  // Minimum complexity policy to avoid weak credentials.
  const pass = password || '';
  if (pass.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(pass) || !/[a-z]/.test(pass) || !/[0-9]/.test(pass)) {
    throw new Error('Password must include upper, lower, and numeric characters');
  }
}

function normalizeRole(role: string): string {
  const normalized = (role || '').trim().toLowerCase();
  if (!ALLOWED_ROLES.has(normalized)) {
    throw new Error('Role must be one of: student, admin');
  }
  return normalized;
}

function requireAuth(context: any): { userId: number; role: string } {
  if (!context?.userId) {
    throw new Error('Unauthorized');
  }
  return {
    userId: parseInt(context.userId, 10),
    role: String(context.role || '')
  };
}

function requireAdmin(context: any): void {
  const auth = requireAuth(context);
  if (auth.role !== 'admin') {
    throw new Error('Forbidden');
  }
}

function parseExpiry(exp: string): number {
  // return seconds
  const match = /^([0-9]+)([smhd])$/.exec(exp);
  if (match) {
    const val = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return val;
      case 'm':
        return val * 60;
      case 'h':
        return val * 3600;
      case 'd':
        return val * 86400;
    }
  }
  const n = parseInt(exp, 10);
  if (!isNaN(n)) return n;
  return 604800; // 7 days
}

async function createTokenAndSession(user: PrismaUser): Promise<string> {
  const expiresInSecs = parseExpiry(JWT_EXPIRY);
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    language: user.language,
    jti: randomUUID()
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresInSecs
  });

  // store session for revocation
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + expiresInSecs * 1000)
    }
  });

  return token;
}

export const authTypeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key"])

  type User @key(fields: "id") {
    id: ID!
    email: String!
    role: String!
    language: String!
    createdAt: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    validateToken(token: String!): User
    # cursor: reserved for future keyset pagination; currently unused
    users(limit: Int, offset: Int, cursor: String): [User!]!
    usersCount: Int!
  }

  type Mutation {
    register(email: String!, password: String!, language: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
    refreshToken(token: String!): AuthPayload
    logout: Boolean!
    updateUserRole(userId: ID!, role: String!): User!
  }

  type AuthPayload {
    token: String!
    user: User!
  }
`;

export const authSchema = buildSubgraphSchema([
  {
    typeDefs: authTypeDefs,
    resolvers: {
      Query: {
        me: async (_: any, _args: any, context: any) => {
          if (!context.userId) return null;
          const id = parseInt(context.userId, 10);
          return prisma.user.findUnique({ where: { id } });
        },
        user: async (_: any, { id }: any, context: any) => {
          const auth = requireAuth(context);
          const targetId = parseInt(id, 10);
          if (auth.role !== 'admin' && auth.userId !== targetId) {
            throw new Error('Forbidden');
          }
          return prisma.user.findUnique({ where: { id: targetId } });
        },
        users: async (_: any, { limit, offset }: any, context: any) => {
          requireAdmin(context);
          const take = Math.min(limit ?? 100, 200); // cap at 200
          const skip = offset ?? 0;
          const rows = await prisma.user.findMany({
            // Stable sort: newest first; secondary sort by id prevents page drift when
            // new users are created between page requests
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
            skip
          });
          return rows.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
        },
        usersCount: async (_: any, _args: any, context: any) => {
          // Accessible by admin users OR by trusted internal services
          if (!isInternalServiceCall(context)) {
            requireAdmin(context);
          }
          return prisma.user.count();
        },
        validateToken: async (_: any, { token }: any) => {
          try {
            const payload: any = await verifyToken(token);
            if (payload && payload.id) {
              return prisma.user.findUnique({ where: { id: parseInt(payload.id, 10) } });
            }
          } catch (err) {
            return null;
          }
          return null;
        }
      },
      Mutation: {
        register: async (_: any, { email, password, language }: any) => {
          validateEmail(email);
          validatePassword(password);
          const normalizedEmail = email.trim().toLowerCase();
          const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
          if (existing) {
            throw new Error('Email already in use');
          }
          const hash = await argon2.hash(password);
          const user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              passwordHash: hash,
              language: language || 'english',
              role: 'student'
            }
          });
          const token = await createTokenAndSession(user);
          return { token, user };
        },
        login: async (_: any, { email, password }: any) => {
          validateEmail(email);
          const normalizedEmail = email.trim().toLowerCase();
          const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
          if (!user) {
            throw new Error('Invalid credentials');
          }
          const valid = await argon2.verify(user.passwordHash, password);
          if (!valid) {
            throw new Error('Invalid credentials');
          }
          const token = await createTokenAndSession(user);
          return { token, user };
        },
        refreshToken: async (_: any, { token }: any) => {
          const payload: any = await verifyToken(token);
          const user = await prisma.user.findUnique({ where: { id: parseInt(payload.id, 10) } });
          if (!user) {
            throw new Error('User not found');
          }

          await prisma.session.deleteMany({ where: { token } });
          const newToken = await createTokenAndSession(user);
          return { token: newToken, user };
        },
        logout: async (_: any, _args: any, context: any) => {
          const tok = context.token;
          if (tok) {
            await prisma.session.deleteMany({ where: { token: tok } });
          }
          return true;
        },
        updateUserRole: async (_: any, { userId, role }: any, context: any) => {
          requireAdmin(context);
          const normalizedRole = normalizeRole(role);
          const id = parseInt(userId, 10);
          return prisma.user.update({
            where: { id },
            data: { role: normalizedRole }
          });
        }
      },
      User: {
        __resolveReference: async (user: any) => {
          // fetch from db to get up-to-date info
          if (user.id) {
            return prisma.user.findUnique({ where: { id: parseInt(user.id, 10) } });
          }
          return null;
        }
      }
    }
  }
]);

// helper for other modules (like API gateway) that want to verify and
// ensure the session backing a token is still active. Returns decoded
// payload if valid, otherwise throws.
export async function verifyToken(token: string) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as any;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) {
    throw new Error('Session revoked');
  }
  return payload;
}
