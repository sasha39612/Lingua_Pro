/// <reference types="node" />
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';

@Controller()
export class HealthController {
  @Public()
  @SkipThrottle()
  @Get('health')
  health() {
    return { status: 'ok', service: 'api-gateway', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }
}
