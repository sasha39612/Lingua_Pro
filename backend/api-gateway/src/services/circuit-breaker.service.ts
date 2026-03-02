import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private breaker: any;

  constructor() {
    this.breaker = new CircuitBreaker(async (args: any) => {
      return args();
    }, {
      timeout: 10_000,
      errorThresholdPercentage: 50,
      resetTimeout: 30_000
    });

    this.breaker.on('open', () => this.logger.warn('Circuit opened'));
    this.breaker.on('halfOpen', () => this.logger.log('Circuit half-open'));
    this.breaker.on('close', () => this.logger.log('Circuit closed'));
    this.breaker.on('fallback', () => this.logger.warn('Fallback triggered'));
  }

  async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    if (fallback) {
      this.breaker.fallback(() => fallback());
    }
    return this.breaker.fire(() => fn());
  }
}
