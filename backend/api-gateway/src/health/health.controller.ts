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
    return { status: 'ok', uptime: process.uptime(), timestamp: Date.now() };
  }
}
