
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { BookingCondition } from "@/types/RuleResult";
import { Info } from "lucide-react";

interface BookingConditionsBlockProps {
  initialConditions?: BookingCondition[];
}

export function BookingConditionsBlock({ initialConditions = [] }: BookingConditionsBlockProps) {
  const [conditions, setConditions] = useState<BookingCondition[]>(
    initialConditions.length > 0 ? initialConditions : [{
      space: ["Space 1"],
      time_range: "09:00–17:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      condition_type: "duration",
      operator: "is_less_than",
      value: "30min",
      explanation: "Default booking condition"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, conditions.length - 1)).fill("AND")
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];
  
  const logicOptions = [
    "its duration",
    "the interval from start time to its start",
    "the interval from its end to end time",
    "the holder's set of tags"
  ];

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
  
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];

  const updateCondition = (index: number, field: keyof BookingCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const minute = time.split(':')[1];
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  };

  const getLogicText = (condition: BookingCondition) => {
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

  const getAvailableOperators = (conditionType: string) => {
    if (conditionType === "interval_start" || conditionType === "interval_end") {
      return intervalOperators;
    } else if (conditionType === "user_tags") {
      return tagOperators;
    }
    return durationOperators;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Booking Conditions</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded">
          <Info className="w-3 h-3" />
          <span>Defines when bookings are NOT ALLOWED</span>
        </div>
      </div>
      
      {conditions.map((condition, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <span className="text-slate-600">For</span>
              <MultiSelect
                options={spaceOptions}
                selected={condition.space || []}
                onSelectionChange={(selected) => updateCondition(index, 'space', selected)}
                placeholder="Select spaces"
                className="min-w-0 max-w-[200px]"
              />
              
              <span className="text-slate-600">between</span>
              <Select 
                value={condition.time_range?.split('–')[0] || '09:00'} 
                onValueChange={(value) => {
                  const endTime = condition.time_range?.split('–')[1] || '17:00';
                  updateCondition(index, 'time_range', `${value}–${endTime}`);
                }}
              >
                <SelectTrigger className="w-24 h-10">
                  <SelectValue>
                    {formatTimeDisplay(condition.time_range?.split('–')[0] || '09:00')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">and</span>
              <Select 
                value={condition.time_range?.split('–')[1] || '17:00'} 
                onValueChange={(value) => {
                  const startTime = condition.time_range?.split('–')[0] || '09:00';
                  updateCondition(index, 'time_range', `${startTime}–${value}`);
                }}
              >
                <SelectTrigger className="w-24 h-10">
                  <SelectValue>
                    {formatTimeDisplay(condition.time_range?.split('–')[1] || '17:00')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">on</span>
              <MultiSelect
                options={dayOptions}
                selected={condition.days || []}
                onSelectionChange={(selected) => updateCondition(index, 'days', selected)}
                placeholder="Select days"
                className="min-w-0 max-w-[200px]"
              />
              
              <span className="text-slate-600">, a booking is not allowed if:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <Select 
                value={getLogicText(condition)} 
                onValueChange={(value) => {
                  if (value === "its duration") {
                    updateCondition(index, 'condition_type', 'duration');
                  } else if (value.includes("start time to its start")) {
                    updateCondition(index, 'condition_type', 'interval_start');
                  } else if (value.includes("its end to end time")) {
                    updateCondition(index, 'condition_type', 'interval_end');
                  } else if (value === "the holder's set of tags") {
                    updateCondition(index, 'condition_type', 'user_tags');
                  }
                }}
              >
                <SelectTrigger className="min-w-[180px] h-10">
                  <SelectValue>
                    {getLogicText(condition)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="its duration">its duration</SelectItem>
                  <SelectItem value="the interval from start time to its start">
                    the interval from {formatTimeDisplay(condition.time_range?.split('–')[0] || '09:00')} to its start
                  </SelectItem>
                  <SelectItem value="the interval from its end to end time">
                    the interval from its end to {formatTimeDisplay(condition.time_range?.split('–')[1] || '17:00')}
                  </SelectItem>
                  <SelectItem value="the holder's set of tags">the holder's set of tags</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={condition.operator || 'is_less_than'} onValueChange={(value) => updateCondition(index, 'operator', value)}>
                <SelectTrigger className="min-w-[150px] h-10">
                  <SelectValue>
                    {condition.operator || 'is less than'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {getAvailableOperators(condition.condition_type || 'duration').map(operator => (
                    <SelectItem key={operator} value={operator.replace(' ', '_')}>{operator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {condition.condition_type === "user_tags" ? (
                <MultiSelect
                  options={tagOptions}
                  selected={Array.isArray(condition.value) ? condition.value : []}
                  onSelectionChange={(selected) => updateCondition(index, 'value', selected)}
                  placeholder="Select tags"
                  className="min-w-0 max-w-[200px]"
                />
              ) : (
                <Select 
                  value={Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'} 
                  onValueChange={(value) => updateCondition(index, 'value', value)}
                >
                  <SelectTrigger className="w-20 h-10">
                    <SelectValue>
                      {Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {durationValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            {condition.explanation && (
              <div className="text-xs text-slate-600 bg-white p-2 rounded border">
                <strong>Explanation:</strong> {condition.explanation}
              </div>
            )}
          </div>
          
          {index < conditions.length - 1 && (
            <div className="flex justify-center my-2">
              <div className="flex items-center space-x-2">
                <Toggle
                  pressed={logicOperators[index] === "AND"}
                  onPressedChange={(pressed) => updateLogicOperator(index, pressed ? "AND" : "OR")}
                  className="w-12 h-8"
                >
                  AND
                </Toggle>
                <Toggle
                  pressed={logicOperators[index] === "OR"}
                  onPressedChange={(pressed) => updateLogicOperator(index, pressed ? "OR" : "AND")}
                  className="w-12 h-8"
                >
                  OR
                </Toggle>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
