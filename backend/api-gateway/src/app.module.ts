/// <reference types="node" />
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HealthController } from './health/health.controller';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { LoggerModule } from 'nestjs-pino';
import { GatewayResolver } from './graphql/gateway.resolver';
import { DelegatedResolver } from './graphql/delegated.resolver';
import { MutationDelegationResolver } from './graphql/mutation-delegation.resolver';
import { AuthContextService } from './auth/auth-context.service';
import { ApolloGateway, IntrospectAndCompose, RemoteGraphQLDataSource } from '@apollo/gateway';
import { GqlThrottlerGuard } from './graphql/gql-throttler.guard';

// Only services that expose an Apollo Federation subgraph at /graphql.
// audio-service and stats-service are REST-only — do NOT add them here.
const subgraphUrls = {
  authService: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001/graphql',
  textService: process.env.TEXT_SERVICE_URL || 'http://text-service:4002/graphql',
};

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
        if (!headers) {
          return;
        }

        const authHeader = context?.req?.headers?.authorization || context?.req?.headers?.Authorization;
        const traceId = context?.req?.headers?.['x-trace-id'];
        const userId = context?.authContext?.userId;
        const userRole = context?.authContext?.user?.role;
        const userLanguage = context?.authContext?.user?.language;

        if (authHeader) {
          headers.set('authorization', authHeader);
        }

        if (traceId) {
          headers.set('x-trace-id', String(traceId));
        }

        if (userId) {
          headers.set('x-user-id', String(userId));
        }

        if (userRole) {
          headers.set('x-user-role', String(userRole));
        }

        if (userLanguage) {
          headers.set('x-user-language', String(userLanguage));
        }
      },
    }),
});

@Module({
  imports: [
    LoggerModule.forRoot(),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 120
    }),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: async () => ({
        gateway,
        path: '/graphql',
        context: async ({ req }: any) => {
          // Extract and validate JWT, attach to context
          const authContextService = new AuthContextService();
          const authContext = await authContextService.extractContext(req);
          return { req, authContext };
        },
      }),
    })
  ],
  controllers: [HealthController],
  providers: [
    AuthContextService,
    CircuitBreakerService,
    GatewayResolver,
    DelegatedResolver,
    MutationDelegationResolver,
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard }
  ]
})
export class AppModule {}
