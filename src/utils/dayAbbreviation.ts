
export const abbreviateDay = (day: string): string => {
  const dayMap: Record<string, string> = {
    'Monday': 'Mon',
    'Tuesday': 'Tue', 
    'Wednesday': 'Wed',
    'Thursday': 'Thu',
    'Friday': 'Fri',
    'Saturday': 'Sat',
    'Sunday': 'Sun'
  };
  return dayMap[day] || day;
};

export const abbreviateDays = (days: string[]): string[] => {
  return days.map(abbreviateDay);
};
