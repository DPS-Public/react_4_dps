import type { Dayjs } from 'dayjs';

export interface TaskDoc {
    assignee?: string | null;
    assigneeName?: string | null;
    createdAt?: string | Date | null;
    closedDate?: string | Date | null;
    eh?: number | string | null;
    status?: string | null;
    type?: string | null;
    linkedCanvas?: string | null;
    uiCanvasId?: string | null;
    apiCanvasId?: string | null;
    dbCanvasId?: string | null;
}

export interface NormalizedTask {
    assigneeId: string;
    assigneeName: string;
    created: Dayjs;
    closed: Dayjs | null;
    hours: number;
}

export interface AggregatedRecord {
    label: string;
    data: Record<string, number>;
    order: number;
}

export type DateRange = [Dayjs | null, Dayjs | null];
