export type GroupByOption = 'Week' | 'Month' | 'Daily' | 'Yearly' | 'Assignee' | 'API Canvas' | 'UI Canvas' | 'DB Canvas';

export interface WeeklyHoursRecord {
  week: string;
  data: Record<string, number>;
}
