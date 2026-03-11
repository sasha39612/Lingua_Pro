/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { json } from 'express';
import { textSchema } from './graphql/text.schema';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('');

  const apolloServer = new ApolloServer({ schema: textSchema });
  await apolloServer.start();

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use(
    '/graphql',
    json(),
    expressMiddleware(apolloServer, {
      context: async ({ req }: any) => ({ req }),
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 4002;
  await app.listen(port);
  console.log(`Text service listening on ${port}`);
}
bootstrap();
