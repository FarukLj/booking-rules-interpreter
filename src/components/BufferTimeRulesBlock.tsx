
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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

  const getSelectedSpaces = (spaces: string[]) => {
    if (spaces.length === 0) return "Select spaces";
    if (spaces.length <= 2) return spaces.join(", ");
    return `${spaces.slice(0, 2).join(", ")} +${spaces.length - 2}`;
  };

  const toggleSpace = (ruleIndex: number, space: string) => {
    const rule = rules[ruleIndex];
    const newSpaces = rule.spaces.includes(space)
      ? rule.spaces.filter(s => s !== space)
      : [...rule.spaces, space];
    updateRule(ruleIndex, 'spaces', newSpaces);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-600">For</span>
              
              <Select value={getSelectedSpaces(rule.spaces)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Select spaces">{getSelectedSpaces(rule.spaces)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {spaceOptions.map(space => (
                    <div key={space} className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-slate-100" onClick={() => toggleSpace(index, space)}>
                      <Checkbox 
                        checked={rule.spaces.includes(space)}
                      />
                      <span>{space}</span>
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">, enforce a buffer time of</span>
              
              <Select value={rule.buffer_duration} onValueChange={(value) => updateRule(index, 'buffer_duration', value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
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
