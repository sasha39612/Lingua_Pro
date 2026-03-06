import { Request, Response } from 'express';
import { validationResult, matchedData } from 'express-validator';
import { StatsService } from '../services/stats.service';
import { validateStatsRequest } from '../validators/stats.validator';

type MistakeLike = {
    type?: string;
    mistakeType?: string;
};

type StatLike = Record<string, unknown>;

type ProgressPoint = {
    date: string;
    attempts: number;
    correct: number;
    incorrect: number;
    accuracy: number;
};

type ChartJsDataset = {
    label: string;
    data: number[];
    backgroundColor?: string[] | string;
    borderColor?: string[] | string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
    yAxisID?: 'y' | 'y1';
};

type ChartJsConfigLike = {
    type: 'bar' | 'line' | 'doughnut';
    data: {
        labels: string[];
        datasets: ChartJsDataset[];
    };
    options: Record<string, unknown>;
};

type FrontendCharts = {
    mistakesByType: ChartJsConfigLike;
    progressOverTime: ChartJsConfigLike;
};

export class StatsController {
    private statsService: StatsService;

    constructor() {
        this.statsService = new StatsService();
    }

    private asNumber(value: unknown): number | undefined {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return undefined;
    }

    private toDateKey(value: unknown): string | undefined {
        if (!value) return undefined;
        const d = new Date(String(value));
        if (Number.isNaN(d.getTime())) return undefined;
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    private buildMistakeCountsByType(stats: unknown): Record<string, number> {
        const directMistakes = (stats as { mistakes?: MistakeLike[] })?.mistakes;
        if (Array.isArray(directMistakes)) {
            return directMistakes.reduce<Record<string, number>>((acc, mistake) => {
                const key = mistake.type ?? mistake.mistakeType;
                if (!key) return acc;
                acc[key] = (acc[key] ?? 0) + 1;
                return acc;
            }, {});
        }

        if (!Array.isArray(stats)) return {};

        return (stats as StatLike[]).reduce<Record<string, number>>((acc, item) => {
            const key = (item.type as string | undefined) ?? (item.mistakeType as string | undefined);
            if (!key) return acc;
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
        }, {});
    }

    private buildProgressOverTime(stats: unknown): ProgressPoint[] {
        if (!Array.isArray(stats)) return [];

        const grouped = new Map<string, { attempts: number; correct: number; incorrect: number }>();

        for (const row of stats as StatLike[]) {
            const dateKey =
                this.toDateKey(row.date) ??
                this.toDateKey(row.createdAt) ??
                this.toDateKey(row.timestamp) ??
                this.toDateKey(row.performedAt);

            if (!dateKey) continue;

            const correct =
                this.asNumber(row.correct) ??
                this.asNumber(row.correctCount) ??
                this.asNumber(row.rightAnswers) ??
                0;

            const incorrect =
                this.asNumber(row.incorrect) ??
                this.asNumber(row.incorrectCount) ??
                this.asNumber(row.wrongAnswers) ??
                this.asNumber(row.mistakesCount) ??
                0;

            const attempts =
                this.asNumber(row.attempts) ??
                this.asNumber(row.total) ??
                this.asNumber(row.totalAnswers) ??
                this.asNumber(row.questionsTotal) ??
                (correct + incorrect > 0 ? correct + incorrect : 1);

            const current = grouped.get(dateKey) ?? { attempts: 0, correct: 0, incorrect: 0 };
            current.attempts += attempts;
            current.correct += correct;
            current.incorrect += incorrect;
            grouped.set(dateKey, current);
        }

        return [...grouped.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => {
                const accuracy = value.attempts > 0 ? (value.correct / value.attempts) * 100 : 0;
                return {
                    date,
                    attempts: value.attempts,
                    correct: value.correct,
                    incorrect: value.incorrect,
                    accuracy: Number(accuracy.toFixed(2))
                };
            });
    }

    private buildPalette(count: number): string[] {
        const base = [
            '#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#14B8A6', '#84CC16', '#F97316'
        ];
        return Array.from({ length: count }, (_, i) => base[i % base.length]);
    }

    private buildFrontendCharts(
        mistakeCountsByType: Record<string, number>,
        progressOverTime: ProgressPoint[]
    ): FrontendCharts {
        const sortedMistakes = Object.entries(mistakeCountsByType).sort((a, b) => b[1] - a[1]);
        const mistakeLabels = sortedMistakes.map(([label]) => label);
        const mistakeData = sortedMistakes.map(([, value]) => value);
        const mistakeColors = this.buildPalette(mistakeLabels.length);

        const progressLabels = progressOverTime.map((p) => p.date);

        return {
            mistakesByType: {
                type: 'doughnut',
                data: {
                    labels: mistakeLabels,
                    datasets: [
                        {
                            label: 'Mistakes by type',
                            data: mistakeData,
                            backgroundColor: mistakeColors,
                            borderColor: '#ffffff',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Mistake Distribution' }
                    }
                }
            },
            progressOverTime: {
                type: 'line',
                data: {
                    labels: progressLabels,
                    datasets: [
                        {
                            label: 'Accuracy (%)',
                            data: progressOverTime.map((p) => p.accuracy),
                            borderColor: '#4F46E5',
                            backgroundColor: 'rgba(79,70,229,0.2)',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Attempts',
                            data: progressOverTime.map((p) => p.attempts),
                            borderColor: '#06B6D4',
                            backgroundColor: 'rgba(6,182,212,0.2)',
                            fill: false,
                            tension: 0.3,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Progress Over Time' }
                    },
                    scales: {
                        y: { type: 'linear', position: 'left', min: 0, max: 100 },
                        y1: { type: 'linear', position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }
                    }
                }
            }
        };
    }

    public async getStats(req: Request, res: Response): Promise<void> {
        await Promise.all(validateStatsRequest.map((chain) => chain.run(req)));
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { language, period } = matchedData(req, { locations: ['query'] }) as {
            language: string;
            period: 'week' | 'month' | 'all';
        };

        try {
            const stats = await this.statsService.getStats(language, period);
            const mistakeCountsByType = this.buildMistakeCountsByType(stats);
            const progressOverTime = this.buildProgressOverTime(stats);
            const charts = this.buildFrontendCharts(mistakeCountsByType, progressOverTime);

            res.status(200).json({
                stats,
                mistakeCountsByType,
                progressOverTime,
                charts
            });
        } catch (error) {
            res.status(500).json({ error: 'An error occurred while retrieving statistics.' });
        }
    }
}
