
export interface TimeObject {
  hour: number;
  minute: number;
}

export function splitTimeRange(str: string): [TimeObject | null, TimeObject | null] {
  if (!str) return [null, null];
  
  // Normalize: replace em-dash, en-dash, or "to" with hyphen, remove spaces
  const normalized = str.trim()
    .replace(/—|–|\s+to\s+/gi, '-')
    .replace(/\s+/g, '');
  
  const parts = normalized.split('-');
  if (parts.length !== 2) return [null, null];
  
  const [rawStart, rawEnd] = parts;
  return [parseTime(rawStart), parseTime(rawEnd)];
}

function parseTime(timeStr: string): TimeObject | null {
  if (!timeStr) return null;
  
  // Match patterns like: 17:00, 5pm, 5:00PM, 05:00am, 17, 5
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  
  const [, hourStr, minuteStr = '00', ampm] = match;
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  
  // Handle 12-hour format conversion
  if (ampm) {
    const isPM = /pm/i.test(ampm);
    if (isPM && hour !== 12) {
      hour += 12;
    } else if (!isPM && hour === 12) {
      hour = 0;
    }
  }
  
  // Validate hour and minute ranges
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  
  return { hour, minute };
}

export function formatTimeDisplay(timeObj: TimeObject): string {
  if (!timeObj) return '';
  
  const { hour, minute } = timeObj;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function timeObjectToTimeString(timeObj: TimeObject): string {
  if (!timeObj) return '';
  
  const { hour, minute } = timeObj;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}
