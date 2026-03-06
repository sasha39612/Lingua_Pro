import { IsIn, IsString, Length } from 'class-validator';

export class GetStatsQueryDto {
  @IsString()
  @Length(2, 8)
  language!: string;

  @IsIn(['week', 'month', 'all'])
  period!: 'week' | 'month' | 'all';
}