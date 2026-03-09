import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'stats-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}