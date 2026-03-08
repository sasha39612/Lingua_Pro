/*
 * DB-free smoke check for stats-service.
 * Uses compiled StatsService and a mocked PrismaService implementation.
 */

const assert = require('node:assert/strict');
const path = require('node:path');

const { StatsService } = require(path.join(__dirname, '..', 'dist', 'stats', 'stats.service.js'));

class MockPrismaService {
  constructor() {
    this.call = 0;
  }

  async $queryRaw() {
    this.call += 1;

    // 1) aggregate
    if (this.call === 1) {
      return [
        {
          avg_text_score: 0.82,
          avg_pronunciation_score: 0.77,
        },
      ];
    }

    // 2) history
    if (this.call === 2) {
      return [
        { date: '2026-03-01', text_score: 0.8, pronunciation_score: 0.75 },
        { date: '2026-03-02', text_score: 0.84, pronunciation_score: 0.79 },
      ];
    }

    // 3) text feedback rows
    if (this.call === 3) {
      return [
        { feedback: 'Spelling: "studing" -> "studying"; Missing question mark' },
        { feedback: 'Great work! No obvious errors detected.' },
      ];
    }

    // 4) audio feedback rows
    if (this.call === 4) {
      return [
        { feedback: 'Acceptable pronunciation, practice more.', pronunciation_score: 0.72 },
        { feedback: 'Excellent pronunciation!', pronunciation_score: 0.93 },
      ];
    }

    return [];
  }
}

async function main() {
  const service = new StatsService(new MockPrismaService());
  const result = await service.getStats('EN', 'week');

  assert.equal(result.language, 'EN');
  assert.equal(result.period, 'week');

  assert.equal(typeof result.avg_text_score, 'number');
  assert.equal(typeof result.avg_pronunciation_score, 'number');
  assert.equal(typeof result.mistakes_total, 'number');

  assert.ok(result.mistake_counts_by_type);
  assert.ok(result.history);
  assert.ok(result.charts);

  assert.ok(Array.isArray(result.history));
  assert.ok(Array.isArray(result.charts.mistakesByType.labels));
  assert.ok(Array.isArray(result.charts.mistakesByType.values));
  assert.ok(Array.isArray(result.charts.progressOverTime.labels));
  assert.ok(Array.isArray(result.charts.progressOverTime.textScores));
  assert.ok(Array.isArray(result.charts.progressOverTime.pronunciationScores));

  console.log('Mock smoke check passed.\n');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Mock smoke check failed.');
  console.error(error);
  process.exit(1);
});
