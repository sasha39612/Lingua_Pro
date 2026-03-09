import { createServer, IncomingMessage, ServerResponse } from 'http';
import { graphql } from 'graphql';
import { authSchema, verifyToken } from './graphql/auth.schema';

type GraphQLBody = {
  query?: string;
  variables?: Record<string, unknown>;
  operationName?: string;
};

type RequestContext = {
  token: string | null;
  userId: string | null;
  role: string | null;
};

const PORT = parseInt(process.env.PORT || '4001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const MAX_BODY_BYTES = 1024 * 1024; // 1MB

function setCommonHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Content-Type', 'application/json');
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  setCommonHeaders(res);
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function getTokenFromRequest(req: IncomingMessage): string | null {
  const raw = req.headers.authorization || req.headers.Authorization;
  if (!raw || Array.isArray(raw)) return null;
  const value = raw.trim();
  if (!value.toLowerCase().startsWith('bearer ')) return null;
  return value.slice(7).trim() || null;
}

async function buildContext(req: IncomingMessage): Promise<RequestContext> {
  const token = getTokenFromRequest(req);
  if (!token) {
    return { token: null, userId: null, role: null };
  }

  try {
    const payload: any = await verifyToken(token);
    return {
      token,
      userId: String(payload?.id ?? ''),
      role: String(payload?.role ?? '')
    };
  } catch {
    return { token: null, userId: null, role: null };
  }
}

async function readJsonBody(req: IncomingMessage): Promise<GraphQLBody> {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString('utf8');
      if (raw.length > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
      }
    });

    req.on('end', () => {
      try {
        const parsed = raw ? (JSON.parse(raw) as GraphQLBody) : {};
        resolve(parsed);
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', () => {
      reject(new Error('Failed to read request body'));
    });
  });
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    return sendJson(res, 400, { error: 'Bad request' });
  }

  if (req.method === 'OPTIONS') {
    setCommonHeaders(res);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.url === '/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', service: 'auth-service', uptime: process.uptime(), timestamp: new Date().toISOString() });
  }

  if (req.url !== '/graphql' || req.method !== 'POST') {
    return sendJson(res, 404, { error: 'Not found' });
  }

  try {
    const body = await readJsonBody(req);
    if (!body.query || typeof body.query !== 'string') {
      return sendJson(res, 400, { error: 'GraphQL query is required' });
    }

    const contextValue = await buildContext(req);
    const result = await graphql({
      schema: authSchema,
      source: body.query,
      variableValues: body.variables,
      operationName: body.operationName,
      contextValue
    });

    return sendJson(res, 200, result);
  } catch (error: any) {
    return sendJson(res, 400, { error: error?.message || 'Bad request' });
  }
});

server.listen(PORT, HOST, () => {
  // Keep startup log explicit for container diagnostics.
  console.log(`auth-service listening on http://${HOST}:${PORT}`);
});
