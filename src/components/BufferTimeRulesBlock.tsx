
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { BufferTimeRule } from "@/types/RuleResult";

interface BufferTimeRulesBlockProps {
  initialRules?: BufferTimeRule[];
}

export function BufferTimeRulesBlock({ initialRules = [] }: BufferTimeRulesBlockProps) {
  const [rules, setRules] = useState<BufferTimeRule[]>(
    initialRules.length > 0 ? initialRules : [{
      spaces: ["Space 1"],
      buffer_duration: "30min",
      explanation: "Default buffer time rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  
  // Generate buffer time options from 15m to 24h in 15-minute increments
  const durationOptions = [];
  for (let i = 15; i <= 60; i += 15) {
    durationOptions.push(`${i}min`);
  }
  for (let i = 2; i <= 24; i++) {
    durationOptions.push(`${i}h`);
  }

  const updateRule = (index: number, field: keyof BufferTimeRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">For</span>
              
              <MultiSelect
                options={spaceOptions}
                selected={rule.spaces || []}
                onSelectionChange={(selected) => updateRule(index, 'spaces', selected)}
                placeholder="Select spaces"
                className="w-40"
              />
              
              <span className="text-slate-600">, enforce a buffer time of</span>
              
              <Select value={rule.buffer_duration || '30min'} onValueChange={(value) => updateRule(index, 'buffer_duration', value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Duration">
                    {rule.buffer_duration || '30min'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(duration => (
                    <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">between bookings</span>
            </div>
            
            {rule.explanation && (
              <div className="mt-3 text-xs text-slate-600 bg-white p-2 rounded border">
                <strong>Explanation:</strong> {rule.explanation}
              </div>
            )}
          </div>
          
          {index < rules.length - 1 && (
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
