export type TimeUnit = 'minutes' | 'hours' | 'days';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeInterval {
  value: number;
  unit: TimeUnit;
}

export interface BookingCondition {
  id: string;
  spaceIds: string[];
  days: DayOfWeek[];
  condition: 'AND' | 'OR';
  rules: BookingRule[];
  isActive: boolean;
}

export interface BookingRule {
  id: string;
  type: 'duration' | 'time_interval' | 'start_time' | 'end_time';
  operator: 'less_than' | 'less_than_or_equal' | 'greater_than' | 'greater_than_or_equal' | 'equals' | 'not_equals' | 'multiple_of';
  value: number | TimeInterval;
  unit?: TimeUnit;
}
