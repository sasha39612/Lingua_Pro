/// <reference types="node" />
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { AuthContextService } from './auth/auth-context.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Module({
  controllers: [HealthController],
  providers: [
    AuthContextService,
    CircuitBreakerService,
  ],
})
export class AppModule {}
