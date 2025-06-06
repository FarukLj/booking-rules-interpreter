
// Unit normalization utility
export const normalizeAdvanceUnit = (value: number, unit: string): number => {
  switch(unit.toLowerCase()) {
    case 'day':
    case 'days':
      return value * 24;
    case 'week':
    case 'weeks':
      return value * 24 * 7;
    case 'hour':
    case 'hours':
    default:
      return value;
  }
};

// Convert hours back to other units for display
export const convertFromHours = (hours: number, targetUnit: string): number => {
  switch(targetUnit.toLowerCase()) {
    case 'day':
    case 'days':
      return Math.round(hours / 24);
    case 'week':
    case 'weeks':
      return Math.round(hours / (24 * 7));
    case 'hour':
    case 'hours':
    default:
      return hours;
  }
};

export const getTimeDisplayHelper = (value: number, unit: string) => {
  const hours = normalizeAdvanceUnit(value, unit);
  if (hours >= 168) {
    const weeks = Math.floor(hours / 168);
    return `= ${weeks} week${weeks !== 1 ? 's' : ''}`;
  } else if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `= ${days} day${days !== 1 ? 's' : ''}`;
  }
  return null;
};
