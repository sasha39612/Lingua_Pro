import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { TextService } from './text.service';

@Controller('text')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Post('check')
  async check(
    @Body('userId') userId: string,
    @Body('language') language: string,
    @Body('text') text: string
  ) {
    const uid = parseInt(userId, 10);
    return this.textService.analyzeText(uid, language, text);
  }

  @Get('tasks')
  async tasks(
    @Query('language') language: string,
    @Query('level') level: string,
    @Query('skill') skill?: string
  ) {
    return this.textService.getTasks(language, level, skill);
  }
}
