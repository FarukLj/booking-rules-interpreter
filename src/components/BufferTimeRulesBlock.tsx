
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Meeting Room B"];
  const durationOptions = ["15min", "30min", "45min", "1h", "1h30min", "2h"];

  const updateRule = (index: number, field: keyof BufferTimeRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Add a buffer time of</span>
            
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
            
            <span className="text-slate-600">between bookings in</span>
            
            <Select 
              value={rule.spaces[0]} 
              onValueChange={(value) => updateRule(index, 'spaces', [value])}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaceOptions.map(space => (
                  <SelectItem key={space} value={space}>{space}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {rule.explanation && (
            <div className="mt-2 text-xs text-slate-600 bg-white p-2 rounded border">
              {rule.explanation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
