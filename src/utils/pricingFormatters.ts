
export const formatTimeDisplay = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  const minute = time.split(':')[1];
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
};

export const formatRateUnit = (unit: string) => {
  switch (unit) {
    case "fixed": return "fixed rate";
    case "per_15min": return "per 15min";
    case "per_30min": return "per 30min";
    case "per_hour": return "per hour";
    case "per_2hours": return "per 2 hours";
    case "per_day": return "per day";
    default: return unit.replace('_', ' ');
  }
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

export const getPricingLogicText = (rule: any) => {
  if (rule.condition_type === "user_tags") {
    const operator = rule.operator === "contains_any_of" ? "with" : "without";
    const tags = Array.isArray(rule.value) ? rule.value.join(", ") : "";
    return `Price applies to users ${operator} tags: ${tags}`;
  }
  return "";
};
