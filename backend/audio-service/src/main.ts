/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('');
  const port = process.env.PORT ? Number(process.env.PORT) : 4003;
  await app.listen(port);
  console.log(`Audio service listening on ${port}`);
}
bootstrap();