// modules below may not have type declarations available yet
// @ts-ignore
import { buildSubgraphSchema } from '@apollo/subgraph';
// @ts-ignore
import { gql } from 'graphql-tag';
// @ts-ignore - Prisma v7 types export resolution
import { PrismaClient } from '@prisma/client';
// @ts-ignore - Prisma v7 types export resolution
import type { User as PrismaUser } from '@prisma/client';
import * as argon2 from 'argon2';
// @ts-ignore - types may not be installed in this workspace; a declaration shim exists
import * as jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d'; // 7 days by default

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
    language: user.language
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
    @link(url: "https://specs.apollo.dev/federation/v2.0")

  type User @key(fields: "id") {
    id: ID!
    email: String!
    role: String!
    language: String!
  }

  type Query {
    me: User
    user(id: ID!): User
    validateToken(token: String!): User
  }

  type Mutation {
    register(email: String!, password: String!, language: String): AuthPayload
    login(email: String!, password: String!): AuthPayload
    logout: Boolean!
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
        user: async (_: any, { id }: any) => {
          return prisma.user.findUnique({ where: { id: parseInt(id, 10) } });
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
          const existing = await prisma.user.findUnique({ where: { email } });
          if (existing) {
            throw new Error('Email already in use');
          }
          const hash = await argon2.hash(password);
          const user = await prisma.user.create({
            data: {
              email,
              passwordHash: hash,
              language: language || 'english',
              role: 'student'
            }
          });
          const token = await createTokenAndSession(user);
          return { token, user };
        },
        login: async (_: any, { email, password }: any) => {
          const user = await prisma.user.findUnique({ where: { email } });
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
        logout: async (_: any, _args: any, context: any) => {
          const tok = context.token;
          if (tok) {
            await prisma.session.deleteMany({ where: { token: tok } });
          }
          return true;
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
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session) {
      throw new Error('Session revoked');
    }
    return payload;
  } catch (err) {
    throw err;
  }
}
