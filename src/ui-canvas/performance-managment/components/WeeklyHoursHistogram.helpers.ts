import dayjs, { type Dayjs } from 'dayjs';
import type { AggregatedRecord, NormalizedTask } from './WeeklyHoursHistogram.types';
import type { GroupByOption } from '../types';

export const formatHours = (value: number): string => {
    const safeValue = Number.isFinite(value) ? value : 0;
    let hours = Math.floor(safeValue);
    let minutes = Math.round((safeValue - hours) * 60);

    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }

    if (hours === 0 && minutes === 0) {
        return '0 min';
    }

    if (hours === 0) {
        return `${minutes} min`;
    }

    if (minutes === 0) {
        return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min`;
};

export const parseDate = (value: unknown): Dayjs | null => {
    if (!value) return null;

    if (typeof value === 'object' && value !== null) {
        if ('toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
            const parsed = dayjs((value as { toDate: () => Date }).toDate());
            return parsed.isValid() ? parsed : null;
        }
        if (dayjs.isDayjs(value)) {
            return (value as Dayjs).isValid() ? (value as Dayjs) : null;
        }
        if (value instanceof Date) {
            const parsed = dayjs(value);
            return parsed.isValid() ? parsed : null;
        }
    }

    if (typeof value === 'string' || typeof value === 'number') {
        const parsed = dayjs(value);
        return parsed.isValid() ? parsed : null;
    }

    return null;
};

export const toHours = (value: unknown): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
};

export const toWeekLabel = (date: Dayjs): { label: string; order: number } => {
    const start = date.startOf('isoWeek');
    const end = date.endOf('isoWeek');
    const week = String(date.isoWeek()).padStart(2, '0');
    return {
        label: `Week ${week} (${start.format('DD.MM')}–${end.format('DD.MM')})`,
        order: start.valueOf(),
    };
};

const applyAggregation = (
    map: Map<string, AggregatedRecord>,
    label: string,
    order: number,
    assigneeId: string,
    hours: number,
) => {
    const existing = map.get(label);
    if (!existing) {
        map.set(label, { label, order, data: { [assigneeId]: hours } });
        return;
    }
    existing.data[assigneeId] = (existing.data[assigneeId] ?? 0) + hours;
};

export const transformData = (tasks: NormalizedTask[], groupBy: GroupByOption): AggregatedRecord[] => {
    const map = new Map<string, AggregatedRecord>();

    tasks.forEach((task) => {
        switch (groupBy) {
            case 'Month': {
                const monthStart = task.created.startOf('month');
                applyAggregation(map, monthStart.format('MMM YYYY'), monthStart.valueOf(), task.assigneeId, task.hours);
                break;
            }
            case 'Daily': {
                const day = task.created.startOf('day');
                applyAggregation(map, day.format('DD MMM'), day.valueOf(), task.assigneeId, task.hours);
                break;
            }
            default: {
                const { label, order } = toWeekLabel(task.created);
                applyAggregation(map, label, order, task.assigneeId, task.hours);
                break;
            }
        }
    });

    return Array.from(map.values()).sort((a, b) => a.order - b.order);
};
