import { BookingCondition, DayOfWeek } from '@/types/BookingCondition';
import { v4 as uuidv4 } from 'uuid';
import { findSpaceId } from './spaceUtils';

const ALL_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

interface GenerateBookingConditionsOptions {
  spaceName: string;
  availableSpaces: string[];
  timeBlockMinutes?: number;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  days?: DayOfWeek[];
}

export function generateBookingConditions({
  spaceName,
  availableSpaces,
  timeBlockMinutes,
  minDurationMinutes,
  maxDurationMinutes,
  days = [...ALL_DAYS] // Create a new array to avoid reference issues
}: GenerateBookingConditionsOptions): BookingCondition[] {
  const conditions: BookingCondition[] = [];
  const now = Date.now();
  
  // Find the exact space ID from available spaces
  const spaceId = findSpaceId(spaceName, availableSpaces);
  
  if (!spaceId) {
    console.error(`Space "${spaceName}" not found in available spaces`);
    return [];
  }

  // 1. Time block validation (1-hour blocks)
  if (timeBlockMinutes) {
    conditions.push({
      id: `time-block-${now}-1`,
      spaceIds: [spaceId],
      days: [...days], // Ensure we're not mutating the input
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
    const durationConditions: BookingCondition[] = [];
    
    if (minDurationMinutes) {
      durationConditions.push({
        id: `min-duration-${now}`,
        spaceIds: [spaceId],
        days: [...days],
        condition: 'AND',
        isActive: true,
        rules: [{
          id: `min-duration-rule-${now}`,
          type: 'duration',
          operator: 'less_than',
          value: minDurationMinutes,
          unit: 'minutes'
        }]
      });
    }

    if (maxDurationMinutes) {
      durationConditions.push({
        id: `max-duration-${now}`,
        spaceIds: [spaceId],
        days: [...days],
        condition: 'AND',
        isActive: true,
        rules: [{
          id: `max-duration-rule-${now}`,
          type: 'duration',
          operator: 'greater_than',
          value: maxDurationMinutes,
          unit: 'minutes'
        }]
      });
    }

    // Combine all duration conditions
    conditions.push(...durationConditions);
  }

  return conditions;
}
