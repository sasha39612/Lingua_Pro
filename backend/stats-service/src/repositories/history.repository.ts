export class HistoryRepository {
    private historyData: any[]; // Replace 'any' with the appropriate type based on your data structure

    constructor() {
        this.historyData = []; // Initialize with an empty array or fetch from a data source
    }

    public getHistoryData(language: string, period: 'week' | 'month' | 'all'): any[] {
        // Implement logic to filter historyData based on language and period
        return this.historyData.filter(item => {
            // Add filtering logic here
            return item.language === language && this.isWithinPeriod(item.date, period);
        });
    }

    private isWithinPeriod(date: Date, period: 'week' | 'month' | 'all'): boolean {
        const now = new Date();
        const timeDiff = now.getTime() - date.getTime();

        switch (period) {
            case 'week':
                return timeDiff <= 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
            case 'month':
                return timeDiff <= 30 * 24 * 60 * 60 * 1000; // 1 month in milliseconds
            case 'all':
                return true;
            default:
                return false;
        }
    }
}