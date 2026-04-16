import { Controller, Post, Body, Get, Query, Headers, BadRequestException } from '@nestjs/common';
import { TextService } from './text.service';

@Controller('text')
export class TextController {
  constructor(private readonly textService: TextService) {}

  @Post('check')
  async check(
    @Body('userId') userId: string,
    @Body('language') language: string,
    @Body('text') text: string,
    @Body('skill') skill?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    const uid = parseInt(userId, 10);
    return this.textService.analyzeText(uid, language, text, skill);
  }

  @Post('score')
  async score(
    @Body('userId') userId: string,
    @Body('language') language: string,
    @Body('skill') skill: string,
    @Body('score') score: number,
  ) {
    if (!language) throw new BadRequestException('language is required');
    const uid = parseInt(userId, 10);
    return this.textService.recordScore(uid, language, skill, score);
  }

  @Get('tasks')
  async tasks(
    @Query('language') language: string,
    @Query('level') level: string,
    @Query('skill') skill?: string,
    @Headers('x-user-id') rawUserId?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    if (!level) throw new BadRequestException('level is required');
    const userId = rawUserId ? parseInt(rawUserId, 10) : null;
    return this.textService.getTasks(language, level, skill, userId);
  }

  @Get('by-language')
  async byLanguage(
    @Query('language') language: string,
    @Query('from') from?: string,
    @Query('skill') skill?: string,
    @Query('userId') userId?: string,
  ) {
    if (!language) throw new BadRequestException('language is required');
    return this.textService.getTextsByLanguage(language, from, skill, userId);
  }
}
