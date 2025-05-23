
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BookingCondition {
  spaces: string[];
  timeRange: string;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
}

interface BookingConditionsBlockProps {
  initialConditions?: BookingCondition[];
}

export function BookingConditionsBlock({ initialConditions = [] }: BookingConditionsBlockProps) {
  const [conditions, setConditions] = useState<BookingCondition[]>(
    initialConditions.length > 0 ? initialConditions : [{
      spaces: ["Space 1"],
      timeRange: "09:00–22:00",
      conditionType: "it's duration",
      conditionOperator: "is less than",
      conditionValue: "1h"
    }]
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const timeRangeOptions = ["00:00–24:00", "08:00–18:00", "09:00–17:00", "09:00–22:00", "18:00–24:00"];
  
  const durationOperators = ["is less than", "is less than or equal to", "is greater than", "is greater than or equal to", "is equal to", "is not equal to", "is not a multiple of"];
  const tagOperators = ["contains any of", "contains none of"];
  
  const durationValues = ["15min", "30min", "1h", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];
  const tagValues = ["The Team", "Gold Membership", "Premium Members", "Staff", "Public"];

  const updateCondition = (index: number, field: keyof BookingCondition, value: string) => {
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
            <Select value={condition.spaces[0]} onValueChange={(value) => updateCondition(index, 'spaces', value)}>
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
            
            <Select value={condition.timeRange} onValueChange={(value) => updateCondition(index, 'timeRange', value)}>
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
            
            <Select value={condition.conditionType} onValueChange={(value) => updateCondition(index, 'conditionType', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it's duration">it's duration</SelectItem>
                <SelectItem value="the holder's set of tags">the holder's set of tags</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={condition.conditionOperator} onValueChange={(value) => updateCondition(index, 'conditionOperator', value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(condition.conditionType === "it's duration" ? durationOperators : tagOperators).map(operator => (
                  <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={condition.conditionValue} onValueChange={(value) => updateCondition(index, 'conditionValue', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(condition.conditionType === "it's duration" ? durationValues : tagValues).map(value => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}
