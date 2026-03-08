/// <reference types="node" />
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { textSchema } from './graphql/text.schema';
import { HealthController } from './health/health.controller';
import { TextController } from './text/text.controller';
import { TextService } from './text/text.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    HttpModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      schema: textSchema,
      path: '/graphql',
      context: ({ req }: any) => ({ req })
    })
  ],
  controllers: [HealthController, TextController],
  providers: [TextService, PrismaService]
})
export class AppModule {}
