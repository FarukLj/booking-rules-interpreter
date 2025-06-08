
export const formatTimeDisplay = (time: string) => {
  // Handle special case for 24:00 -> 12:00 AM
  if (time === "24:00") {
    return "12:00 AM";
  }
  
  const hour = parseInt(time.split(':')[0]);
  const minute = time.split(':')[1];
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
};

export const UNIT_LABEL: Record<string, string> = {
  fixed: 'fixed rate',
  per_15min: 'per 15 min',
  per_30min: 'per 30 min',
  per_hour: 'per hour',
  per_2hours: 'per 2 h',
  per_day: 'per day'
};

export function formatUnit(v: string) {
  return UNIT_LABEL[v] ?? v;
}

export const formatRateUnit = (unit: string) => {
  return formatUnit(unit);
};

export const getRateDisplayText = (rate: { amount: number; unit: string }) => {
  return formatRateUnit(rate.unit);
};

// Smart time range logic for "after X PM" scenarios
export const handleSmartTimeRange = (timeRange: string) => {
  // If only start time is provided (like "after 6 PM"), set end time to midnight
  if (!timeRange.includes('–') && !timeRange.includes('-')) {
    // Parse the time and set end to 00:00 (midnight)
    return `${timeRange}–00:00`;
  }
  return timeRange;
};

// Add the normaliseTimeRange function as specified
export function normaliseTimeRange(keyword?: string, current?: string): string {
  if (!keyword) return current ?? "00:00–24:00";
  const [dir, raw] = keyword.split(/\s+/);             // "after 18:00"
  const hhmm = raw || "00:00";
  return dir === "after"
    ? `${hhmm}–24:00`
    : `00:00–${hhmm}`;
}

/**  given "after 18:00" -> "18:00–24:00"
 *   given "before 08:00" -> "00:00–08:00"                       */
export function timeRangeFromKeyword(keyword: string): string {
  const [dir, raw] = keyword.split(' ');
  const hhmm = raw ?? '00:00';
  return dir === 'after'
    ? `${hhmm}–24:00`
    : `00:00–${hhmm}`;
}

export const getPricingLogicText = (rule: any) => {
  if (rule.condition_type === "user_tags") {
    const operator = rule.operator === "contains_any_of" ? "with" : "without";
    const tags = Array.isArray(rule.value) ? rule.value.join(", ") : "";
    return `Price applies to users ${operator} tags: ${tags}`;
  }
  return "";
};
