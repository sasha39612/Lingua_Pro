import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'audio-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}