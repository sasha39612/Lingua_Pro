/// <reference types="node" />
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('');
  // simple tracing header passthrough (placeholder)
  app.use((req: any, _res: any, next: any) => {
    const traceId = req.headers['x-trace-id'] || Date.now().toString();
    req.headers['x-trace-id'] = traceId;
    next();
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 8080;
  await app.listen(port);
  console.log(`API Gateway listening on ${port}`);
}
bootstrap();
