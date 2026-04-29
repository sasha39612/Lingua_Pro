import './instrument';
/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'express';
import { AuthContextService } from './auth/auth-context.service';
import { SentryApolloPlugin } from './graphql/sentry-apollo-plugin';
import * as Sentry from '@sentry/nestjs';
import * as dotenv from 'dotenv';

dotenv.config();

const subgraphUrls = {
  authService: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001/graphql',
  textService: process.env.TEXT_SERVICE_URL || 'http://text-service:4002/graphql',
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('');

  app.use((req: any, _res: any, next: any) => {
    const activeSpan = Sentry.getActiveSpan();
    const sentryTrace = activeSpan ? Sentry.spanToTraceHeader(activeSpan) : undefined;
    // sentry-trace format: {32-char traceId}-{16-char spanId}-{sampled}
    const traceId = sentryTrace
      ? sentryTrace.split('-')[0]
      : (req.headers['x-trace-id'] as string | undefined) || Date.now().toString();
    req.headers['x-trace-id'] = traceId;
    next();
  });

  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'auth', url: subgraphUrls.authService },
        { name: 'text', url: subgraphUrls.textService },
      ],
      pollIntervalInMs: 10000,
    }),
    buildService: ({ url }) =>
      new RemoteGraphQLDataSource({
        url,
        willSendRequest({ request, context }: any) {
          const headers = request.http?.headers;
          if (!headers) return;

          const authHeader =
            context?.req?.headers?.authorization || context?.req?.headers?.Authorization;
          const traceId = context?.req?.headers?.['x-trace-id'];
          const userId = context?.authContext?.userId;
          const userRole = context?.authContext?.user?.role;
          const userLanguage = context?.authContext?.user?.language;

          const incomingSentryTrace = context?.req?.headers?.['sentry-trace'];
          const incomingBaggage = context?.req?.headers?.['baggage'];

          if (authHeader) headers.set('authorization', authHeader);
          if (traceId) headers.set('x-trace-id', String(traceId));
          if (userId) headers.set('x-user-id', String(userId));
          if (userRole) headers.set('x-user-role', String(userRole));
          if (userLanguage) headers.set('x-user-language', String(userLanguage));
          if (incomingSentryTrace) headers.set('sentry-trace', String(incomingSentryTrace));
          if (incomingBaggage) headers.set('baggage', String(incomingBaggage));
        },
      }),
  });

  const apolloServer = new ApolloServer({
    gateway,
    plugins: [SentryApolloPlugin],
    introspection: process.env.NODE_ENV !== 'production',
  });
  await apolloServer.start();

  const authContextService = new AuthContextService();
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(
    '/graphql',
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }: any) => {
        const authContext = await authContextService.extractContext(req);
        return { req, authContext };
      },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 8080;
  await app.listen(port);
  console.log(`API Gateway listening on ${port}`);
}
bootstrap();
