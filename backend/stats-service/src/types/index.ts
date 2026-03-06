export interface Stat {
    language: string;
    period: 'week' | 'month' | 'all';
    data: any; // Replace 'any' with a more specific type based on the structure of your data
}

export interface RequestParams {
    language: string;
    period: 'week' | 'month' | 'all';
}