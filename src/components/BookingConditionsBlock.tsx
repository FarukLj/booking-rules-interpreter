
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookingCondition } from "@/types/RuleResult";

interface BookingConditionsBlockProps {
  initialConditions?: BookingCondition[];
}

export function BookingConditionsBlock({ initialConditions = [] }: BookingConditionsBlockProps) {
  const [conditions, setConditions] = useState<BookingCondition[]>(
    initialConditions.length > 0 ? initialConditions : [{
      space: ["Space 1"],
      time_range: "09:00–22:00",
      condition_type: "duration",
      operator: "is_less_than",
      value: "1h",
      explanation: "Default booking condition"
    }]
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const timeRangeOptions = ["00:00–24:00", "08:00–18:00", "09:00–17:00", "09:00–22:00", "18:00–24:00"];
  
  const durationOperators = ["is_less_than", "is_less_than_or_equal_to", "is_greater_than", "is_greater_than_or_equal_to", "is_equal_to", "is_not_equal_to", "is_not_a_multiple_of"];
  const tagOperators = ["contains_any_of", "contains_none_of"];
  
  const durationValues = ["15min", "30min", "1h", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];
  const tagValues = ["The Team", "Gold Membership", "Premium Members", "Staff", "Public"];

  const updateCondition = (index: number, field: keyof BookingCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Conditions</h3>
      
      {conditions.map((condition, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Select value={condition.space[0]} onValueChange={(value) => updateCondition(index, 'space', [value])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaceOptions.map(space => (
                  <SelectItem key={space} value={space}>{space}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">at</span>
            
            <Select value={condition.time_range} onValueChange={(value) => updateCondition(index, 'time_range', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map(range => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">a booking is not allowed if</span>
            
            <Select value={condition.condition_type} onValueChange={(value) => updateCondition(index, 'condition_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duration">it's duration</SelectItem>
                <SelectItem value="user_tags">the holder's set of tags</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={condition.operator} onValueChange={(value) => updateCondition(index, 'operator', value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(condition.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                  <SelectItem key={operator} value={operator}>{operator.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={Array.isArray(condition.value) ? condition.value[0] : condition.value} 
              onValueChange={(value) => updateCondition(index, 'value', condition.condition_type === "duration" ? value : [value])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(condition.condition_type === "duration" ? durationValues : tagValues).map(value => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {condition.explanation && (
            <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border">
              {condition.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
