import { validate } from 'class-validator';
import { GetStatsQueryDto } from './get-stats-query.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function validateDto(data: Partial<GetStatsQueryDto>) {
  const dto = Object.assign(new GetStatsQueryDto(), data);
  return validate(dto);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GetStatsQueryDto', () => {
  it('passes validation with valid language and period=week', async () => {
    const errors = await validateDto({ language: 'English', period: 'week' });
    expect(errors).toHaveLength(0);
  });

  it('passes validation with period=month', async () => {
    const errors = await validateDto({ language: 'German', period: 'month' });
    expect(errors).toHaveLength(0);
  });

  it('passes validation with period=all', async () => {
    const errors = await validateDto({ language: 'Polish', period: 'all' });
    expect(errors).toHaveLength(0);
  });

  it('passes with minimum length language (2 chars)', async () => {
    const errors = await validateDto({ language: 'EN', period: 'week' });
    expect(errors).toHaveLength(0);
  });

  it('passes with maximum length language (10 chars)', async () => {
    const errors = await validateDto({ language: 'Ukrainian', period: 'all' });
    expect(errors).toHaveLength(0);
  });

  it('fails when language is missing', async () => {
    const errors = await validateDto({ period: 'week' } as any);
    const props = errors.map((e) => e.property);
    expect(props).toContain('language');
  });

  it('fails when language is too short (1 char)', async () => {
    const errors = await validateDto({ language: 'E', period: 'week' });
    const props = errors.map((e) => e.property);
    expect(props).toContain('language');
  });

  it('fails when language is too long (>10 chars)', async () => {
    const errors = await validateDto({ language: 'TooLongLang', period: 'week' });
    const props = errors.map((e) => e.property);
    expect(props).toContain('language');
  });

  it('fails when period is missing', async () => {
    const errors = await validateDto({ language: 'English' } as any);
    const props = errors.map((e) => e.property);
    expect(props).toContain('period');
  });

  it('fails when period is an invalid value', async () => {
    const errors = await validateDto({ language: 'English', period: 'year' as any });
    const props = errors.map((e) => e.property);
    expect(props).toContain('period');
  });

  it('fails when period is empty string', async () => {
    const errors = await validateDto({ language: 'English', period: '' as any });
    const props = errors.map((e) => e.property);
    expect(props).toContain('period');
  });
});
