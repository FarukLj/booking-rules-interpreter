import { BookingCondition, DayOfWeek } from '@/types/BookingCondition';
import { v4 as uuidv4 } from 'uuid';

const ALL_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface GenerateBookingConditionsOptions {
  spaceName: string;
  timeBlockMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  days?: DayOfWeek[];
}

export function generateBookingConditions({
  spaceName,
  timeBlockMinutes,
  minDurationMinutes,
  maxDurationMinutes,
  days = ALL_DAYS
}: GenerateBookingConditionsOptions): BookingCondition[] {
  const conditions: BookingCondition[] = [];
  const now = Date.now();

  // 1. Time block validation (1-hour blocks)
  if (timeBlockMinutes) {
    conditions.push({
      id: `time-block-${now}-1`,
      spaceIds: [spaceName],
      days,
      condition: 'OR',
      isActive: true,
      rules: [
        {
          id: `time-block-start-${now}-1`,
          type: 'time_interval',
          operator: 'not_equals',
          value: {
            value: timeBlockMinutes,
            unit: 'minutes'
          }
        },
        {
          id: `time-block-end-${now}-2`,
          type: 'time_interval',
          operator: 'not_equals',
          value: {
            value: timeBlockMinutes,
            unit: 'minutes'
          }
        }
      ]
    });
  }

  // 2. Duration conditions (min and max)
  if (minDurationMinutes || maxDurationMinutes) {
    const durationRules: BookingCondition['rules'] = [];
    const durationConditionId = `duration-${now}`;

    if (minDurationMinutes) {
      durationRules.push({
        id: `${durationConditionId}-min`,
        type: 'duration',
        operator: 'less_than',
        value: minDurationMinutes,
        unit: 'minutes'
      });
    }

    if (maxDurationMinutes) {
      if (durationRules.length > 0) {
        durationRules.push({
          id: `${durationConditionId}-and`,
          type: 'duration',
          operator: 'and',
          value: 0
        } as any);
      }
      
      durationRules.push({
        id: `${durationConditionId}-max`,
        type: 'duration',
        operator: 'greater_than',
        value: maxDurationMinutes,
        unit: 'minutes'
      });
    }

    if (durationRules.length > 0) {
      conditions.push({
        id: durationConditionId,
        spaceIds: [spaceName],
        days,
        condition: 'AND',
        isActive: true,
        rules: durationRules
      });
    }
  }

  return conditions;
}
