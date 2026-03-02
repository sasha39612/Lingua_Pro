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
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

const subgraphUrls = {
  authService: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001/graphql',
  textService: process.env.TEXT_SERVICE_URL || 'http://text-service:4002/graphql',
  audioService: process.env.AUDIO_SERVICE_URL || 'http://audio-service:4003/graphql',
  statsService: process.env.STATS_SERVICE_URL || 'http://stats-service:4004/graphql',
};

const gateway = new ApolloGateway({
  supergraphSdl: new IntrospectAndCompose({
    subgraphs: [
      { name: 'auth', url: subgraphUrls.authService },
      { name: 'text', url: subgraphUrls.textService },
      { name: 'audio', url: subgraphUrls.audioService },
      { name: 'stats', url: subgraphUrls.statsService },
    ],
    pollIntervalInMs: 10000,
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
        context: ({ req }: any) => {
          // Extract and validate JWT, attach to context
          const authContextService = new AuthContextService();
          const authContext = authContextService.extractContext(req);
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
    { provide: APP_GUARD, useClass: JwtAuthGuard }
  ]
})
export class AppModule {}
