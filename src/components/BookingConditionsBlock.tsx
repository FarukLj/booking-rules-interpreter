
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
  
  const durationOperators = ["is_less_than", "is_less_than_or_equal_to", "is_greater_than", "is_greater_than_or_equal_to", "is_equal_to", "is_not_equal_to"];
  const tagOperators = ["contains_any_of", "contains_none_of"];
  
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h"];

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

  const getLogicDescription = (condition: BookingCondition) => {
    const spaces = condition.space.length > 2 ? `${condition.space.slice(0, 2).join(", ")} +${condition.space.length - 2}` : condition.space.join(", ");
    const days = condition.days && condition.days.length > 2 ? `${condition.days.slice(0, 2).join(", ")} +${condition.days.length - 2}` : condition.days?.join(", ") || "All days";
    const tags = Array.isArray(condition.value) ? (condition.value.length > 2 ? `${condition.value.slice(0, 2).join(", ")} +${condition.value.length - 2}` : condition.value.join(", ")) : condition.value;
    
    if (condition.condition_type === "user_tags") {
      return `Booking is blocked for [${tags}] during ${condition.time_range} on ${days} in ${spaces}`;
    } else {
      return `Booking is blocked if duration ${condition.operator.replace(/_/g, ' ')} ${condition.value} during ${condition.time_range} on ${days} in ${spaces}`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Booking Conditions</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 bg-blue-50 px-2 py-1 rounded">
          <Info className="w-3 h-3" />
          <span>Defines who CANNOT book (restriction logic)</span>
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
                className="w-40"
              />
              
              <span className="text-slate-600">from</span>
              
              <Select 
                value={condition.time_range?.split('–')[0] || '09:00'} 
                onValueChange={(value) => {
                  const endTime = condition.time_range?.split('–')[1] || '17:00';
                  updateCondition(index, 'time_range', `${value}–${endTime}`);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="From">
                    {formatTimeDisplay(condition.time_range?.split('–')[0] || '09:00')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplay(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">to</span>
              
              <Select 
                value={condition.time_range?.split('–')[1] || '17:00'} 
                onValueChange={(value) => {
                  const startTime = condition.time_range?.split('–')[0] || '09:00';
                  updateCondition(index, 'time_range', `${startTime}–${value}`);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="To">
                    {formatTimeDisplay(condition.time_range?.split('–')[1] || '17:00')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
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
                className="w-32"
              />
              
              <span className="text-slate-600">, a booking is not allowed if</span>
              
              <Select value={condition.condition_type || 'duration'} onValueChange={(value) => updateCondition(index, 'condition_type', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select condition">
                    {condition.condition_type === "duration" ? "it's duration" : "the holder's set of tags"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duration">it's duration</SelectItem>
                  <SelectItem value="user_tags">the holder's set of tags</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={condition.operator || 'is_less_than'} onValueChange={(value) => updateCondition(index, 'operator', value)}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Select operator">
                    {condition.operator?.replace(/_/g, ' ') || 'is less than'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(condition.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                    <SelectItem key={operator} value={operator}>{operator.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {condition.condition_type === "duration" ? (
                <Select 
                  value={Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'} 
                  onValueChange={(value) => updateCondition(index, 'value', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Select duration">
                      {Array.isArray(condition.value) ? condition.value[0] : condition.value || '30min'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {durationValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <MultiSelect
                  options={tagOptions}
                  selected={Array.isArray(condition.value) ? condition.value : []}
                  onSelectionChange={(selected) => updateCondition(index, 'value', selected)}
                  placeholder="Select excluded tags"
                  className="w-40"
                />
              )}
            </div>
            
            <div className="mb-3 text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
              <strong>Logic:</strong> {getLogicDescription(condition)}
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
