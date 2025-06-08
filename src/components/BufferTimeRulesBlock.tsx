
import { useState, useEffect } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { BufferTimeRule } from "@/types/RuleResult";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { SelectItem } from "@/components/ui/select";

interface BufferTimeRulesBlockProps {
  initialRules?: BufferTimeRule[];
}

export function BufferTimeRulesBlock({ initialRules = [] }: BufferTimeRulesBlockProps) {
  // Generate buffer time options from 15m to 24h in 15-minute increments
  const durationOptions = [];
  for (let i = 15; i <= 60; i += 15) {
    durationOptions.push(`${i}min`);
  }
  for (let i = 2; i <= 24; i++) {
    durationOptions.push(`${i}h`);
  }

  // Validate and fix buffer_duration values
  const validateDuration = (duration: string): string => {
    if (!duration || !durationOptions.includes(duration)) {
      console.log("Invalid duration detected:", duration, "defaulting to 30min");
      return "30min";
    }
    return duration;
  };

  // Updated spaceOptions to include court spaces that AI commonly parses
  const spaceOptions = [
    "Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", 
    "Meeting Room B", "Court A", "Gym",
    // Add court spaces that AI parser commonly generates
    "Court 1", "Court 2", "Court 3", "Court 4", "Court 5", "Court 6", 
    "Court 7", "Court 8", "Court 9", "Court 10", "Court 11", "Court 12",
    "Court 13", "Court 14", "Court 15", "Court 16", "Court 17", "Court 18",
    "Court 19", "Court 20", "Court 21", "Court 22", "Court 23", "Court 24"
  ];

  const [rules, setRules] = useState<BufferTimeRule[]>(() => {
    if (initialRules.length > 0) {
      // Debug logging for initial rules
      console.log("BufferTimeRulesBlock - received initialRules:", initialRules);
      
      return initialRules.map((rule, index) => {
        // Check for invalid spaces and log them
        const invalidSpaces = rule.spaces?.filter(space => !spaceOptions.includes(space)) || [];
        if (invalidSpaces.length > 0) {
          console.warn(`BufferTimeRulesBlock - Rule ${index} has invalid spaces that will be filtered out:`, invalidSpaces);
          console.warn(`BufferTimeRulesBlock - Valid space options:`, spaceOptions);
        }

        return {
          ...rule,
          buffer_duration: validateDuration(rule.buffer_duration)
        };
      });
    }
    return [{
      spaces: ["Space 1"],
      buffer_duration: "30min",
      explanation: "Default buffer time rule"
    }];
  });
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Debug logging
  useEffect(() => {
    console.log("BufferTimeRulesBlock - rules:", rules);
    console.log("BufferTimeRulesBlock - durationOptions:", durationOptions);
    console.log("BufferTimeRulesBlock - spaceOptions:", spaceOptions);
  }, [rules]);

  const updateRule = (index: number, field: keyof BufferTimeRule, value: any) => {
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        const updatedRule = { ...rule, [field]: value };
        
        // Special handling for spaces field to debug filtering
        if (field === 'spaces' && Array.isArray(value)) {
          const invalidSpaces = value.filter(space => !spaceOptions.includes(space));
          if (invalidSpaces.length > 0) {
            console.warn(`BufferTimeRulesBlock - updateRule: Invalid spaces detected and will be filtered:`, invalidSpaces);
          }
        }
        
        // Validate buffer_duration when it's updated
        if (field === 'buffer_duration') {
          updatedRule.buffer_duration = validateDuration(value);
        }
        console.log("Updating rule:", updatedRule);
        return updatedRule;
      }
      return rule;
    }));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-[#F1F3F5] p-6 sm:p-3 rounded-lg">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <span className="text-slate-600">For</span>
              <MultiSelect
                triggerVariant="link"
                options={spaceOptions}
                selected={rule.spaces || []}
                onSelectionChange={(selected) => updateRule(index, 'spaces', selected)}
                placeholder="Select spaces"
              />
              
              <span className="text-slate-600">buffer time of</span>
              <LinkSelect 
                value={rule.buffer_duration} 
                onValueChange={(value) => updateRule(index, 'buffer_duration', value)}
                debug={true}
              >
                {durationOptions.map(duration => (
                  <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                ))}
              </LinkSelect>
              
              <span className="text-slate-600">between bookings</span>
            </div>
            
            {rule.explanation && (
              <div className="text-xs text-slate-600 bg-white p-2 rounded border">
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
