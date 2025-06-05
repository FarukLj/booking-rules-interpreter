
export const formatTimeDisplay = (time: string) => {
  const hour = parseInt(time.split(':')[0]);
  const minute = time.split(':')[1];
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
};

export const getLogicText = (condition: any) => {
  const startTime = condition.time_range?.split('–')[0] || '09:00';
  const endTime = condition.time_range?.split('–')[1] || '17:00';
  
  if (condition.condition_type === "interval_start") {
    return `the interval from ${formatTimeDisplay(startTime)} to its start`;
  } else if (condition.condition_type === "interval_end") {
    return `the interval from its end to ${formatTimeDisplay(endTime)}`;
  } else if (condition.condition_type === "user_tags") {
    return "the holder's set of tags";
  }
  return "its duration";
};

export const getAvailableOperators = (conditionType: string) => {
  const durationOperators = [
    "is less than",
    "is less than or equal to", 
    "is greater than",
    "is greater than or equal to",
    "is equal to",
    "is not equal to",
    "is not a multiple of"
  ];
  const intervalOperators = ["is not a multiple of"];
  const tagOperators = ["contains any of", "contains none of"];
  
  if (conditionType === "interval_start" || conditionType === "interval_end") {
    return intervalOperators;
  } else if (conditionType === "user_tags") {
    return tagOperators;
  }
  return durationOperators;
};

export const getOperatorDisplayText = (operator: string) => {
  return operator.replace(/_/g, ' ');
};

export const getOperatorValue = (displayText: string) => {
  return displayText.replace(/ /g, '_');
};
