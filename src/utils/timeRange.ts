
export interface ParsedTime {
  hour: number;
  minute: number;
}

export function splitTimeRange(str: string): [ParsedTime | null, ParsedTime | null] {
  if (!str) return [null, null];
  
  // Normalize the string: replace em-dashes, en-dashes, and "to" with standard hyphen
  const normalized = str.replace(/—|–|\s+to\s+/gi, '-').replace(/\s+/g, '');
  const [rawStart, rawEnd] = normalized.split('-');

  const parseTime = (timeStr: string): ParsedTime | null => {
    if (!timeStr) return null;
    
    // Match patterns like: 9, 9am, 9:30, 9:30pm, 21:30
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/i);
    if (!match) return null;

    const [, hourStr, minuteStr = '00', ampm] = match;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

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
  const hour = time.hour.toString().padStart(2, '0');
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour}:${minute}`;
}
