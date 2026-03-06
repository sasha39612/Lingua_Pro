import { HistoryRepository } from '../repositories/history.repository';
import { Stat } from '../models/stat.model';

export class StatsService {
    private historyRepository: HistoryRepository;

    constructor() {
        this.historyRepository = new HistoryRepository();
    }

    public async getStats(language: string, period: 'week' | 'month' | 'all'): Promise<Stat[]> {
        const historyData = await this.historyRepository.getHistoryData(language, period);
        return this.processStats(historyData);
    }

    private processStats(historyData: any[]): Stat[] {
        // Process the history data to return the required statistics format
        return historyData.map(data => ({
            language: data.language,
            period: data.period,
            data: data.data
        }));
    }
}