import { IsIn, IsString, Length } from 'class-validator';

export class GetStatsQueryDto {
  @IsString()
  @Length(2, 10)
  language!: string;

  @IsIn(['week', 'month', 'all'])
  period!: 'week' | 'month' | 'all';
}