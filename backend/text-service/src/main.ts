import './instrument';
/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'express';
import { textSchema } from './graphql/text.schema';
import { SentryApolloPlugin } from './graphql/sentry-apollo-plugin';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('');

  const apolloServer = new ApolloServer({ schema: textSchema, plugins: [SentryApolloPlugin] });
  await apolloServer.start();

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(json()); // parse JSON bodies for all REST routes
  expressApp.use(
    '/graphql',
    expressMiddleware(apolloServer, {
      context: async ({ req }: any) => {
        const rawUserId = req.headers['x-user-id'];
        const userId = rawUserId ? parseInt(String(rawUserId), 10) : null;
        return { req, userId };
      },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 4002;
  await app.listen(port);
  console.log(`Text service listening on ${port}`);
}
bootstrap();
