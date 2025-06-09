
import { useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { BookingCondition, RuleResult } from "@/types/RuleResult";
import { Info } from "lucide-react";
import { BookingConditionRow } from "./BookingConditionRow";
import { useConditionValidation } from "@/hooks/useConditionValidation";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";

interface BookingConditionsBlockProps {
  initialConditions?: BookingCondition[];
  ruleResult?: RuleResult;
}

export function BookingConditionsBlock({ initialConditions = [], ruleResult }: BookingConditionsBlockProps) {
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

  // Use the validation hook
  useConditionValidation(conditions);

  // Use dynamic space options from the hook
  const { spaceOptions } = useSpaceOptions(ruleResult);
  
  // Static options
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];

  const updateCondition = (index: number, field: keyof BookingCondition, value: any) => {
    setConditions(prev => prev.map((condition, i) => 
      i === index ? { ...condition, [field]: value } : condition
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
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
          <div className="bg-[#F1F3F5] p-6 sm:p-3 rounded-lg">
            <BookingConditionRow
              condition={condition}
              index={index}
              spaceOptions={spaceOptions}
              timeOptions={timeOptions}
              dayOptions={dayOptions}
              tagOptions={tagOptions}
              durationValues={durationValues}
              onConditionChange={updateCondition}
            />
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
