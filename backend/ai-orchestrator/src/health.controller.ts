import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'ai-orchestrator',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
