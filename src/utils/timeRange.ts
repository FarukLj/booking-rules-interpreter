
export interface ParsedTime {
  hour: number;
  minute: number;
}

export function splitTimeRange(str: string): [ParsedTime | null, ParsedTime | null] {
  // Add defensive check for non-string values
  if (!str || typeof str !== 'string') {
    console.warn('[splitTimeRange] Invalid input - expected string, got:', typeof str, str);
    return [null, null];
  }
  
  // Normalize the string: replace em-dashes, en-dashes, and "to" with standard hyphen
  const normalized = str.replace(/—|–|\s+to\s+/gi, '-').replace(/\s+/g, '');
  
  // Additional safety check after normalization
  if (!normalized || typeof normalized !== 'string') {
    console.warn('[splitTimeRange] Invalid normalized value:', normalized);
    return [null, null];
  }
  
  const parts = normalized.split('-');
  if (parts.length !== 2) {
    console.warn('[splitTimeRange] Invalid time range format:', str);
    return [null, null];
  }
  
  const [rawStart, rawEnd] = parts;

  const parseTime = (timeStr: string): ParsedTime | null => {
    if (!timeStr || typeof timeStr !== 'string') {
      console.warn('[parseTime] Invalid timeStr:', timeStr);
      return null;
    }
    
    // Match patterns like: 9, 9am, 9:30, 9:30pm, 21:30
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
    if (!match) {
      console.warn('[parseTime] No match for timeStr:', timeStr);
      return null;
    }

    const [, hourStr, minuteStr = '00', ampm] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Validate parsed values
    if (isNaN(hour) || isNaN(minute)) {
      console.warn('[parseTime] Invalid parsed values:', { hour, minute });
      return null;
    }

    // Handle AM/PM conversion
    if (ampm) {
      const isAM = /am/i.test(ampm);
      const isPM = /pm/i.test(ampm);
      
      if (isPM && hour !== 12) {
        hour += 12;
      } else if (isAM && hour === 12) {
        hour = 0;
      }
    }

    return { hour, minute };
  };

  return [parseTime(rawStart), parseTime(rawEnd)];
}

export function formatTime(time: ParsedTime): string {
  if (!time || typeof time.hour !== 'number' || typeof time.minute !== 'number') {
    console.warn('[formatTime] Invalid time object:', time);
    return '00:00';
  }
  
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour}:${minute}`;
}
