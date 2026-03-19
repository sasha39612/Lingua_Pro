/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as express from 'express';

dotenv.config();

async function bootstrap() {
  // Disable the built-in body parser so we can set a higher limit for base64 audio payloads
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.setGlobalPrefix('');
  const port = process.env.PORT ? Number(process.env.PORT) : 4003;
  await app.listen(port);
  console.log(`Audio service listening on ${port}`);
}
bootstrap();