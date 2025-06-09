
import { useState, useEffect } from "react";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { BufferTimeRule } from "@/types/RuleResult";
import { LinkSelect } from "@/components/ui/LinkSelect";
import { SelectItem } from "@/components/ui/select";
import { useSpaceOptions } from "@/hooks/useSpaceOptions";

interface BufferTimeRulesBlockProps {
  initialRules?: BufferTimeRule[];
  ruleResult?: any; // For extracting spaces from AI results
}

export function BufferTimeRulesBlock({ initialRules = [], ruleResult }: BufferTimeRulesBlockProps) {
  // Get dynamic space options from the hook
  const { spaceOptions, isLoading: spacesLoading, extractedSpaceNames } = useSpaceOptions(ruleResult);

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

  // Helper function to extract space name from space object or string
  const getSpaceName = (space: string | { id: string; name: string }): string => {
    return typeof space === 'string' ? space : space.name;
  };

  // Normalize space values to strings and filter valid ones
  const normalizeSpaces = (spaces: any[]): string[] => {
    if (!spaces) return [];
    
    const normalized = spaces.map(space => getSpaceName(space)).filter(Boolean);

    // Filter out spaces that don't exist in our options
    const validSpaces = normalized.filter(space => spaceOptions.includes(space));
    const invalidSpaces = normalized.filter(space => !spaceOptions.includes(space));
    
    if (invalidSpaces.length > 0) {
      console.warn('Filtered out invalid spaces:', invalidSpaces);
    }
    
    return validSpaces;
  };

  const [rules, setRules] = useState<BufferTimeRule[]>(() => {
    if (initialRules.length > 0) {
      return initialRules.map(rule => ({
        ...rule,
        spaces: normalizeSpaces(rule.spaces),
        buffer_duration: validateDuration(rule.buffer_duration)
      }));
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

  // Update rules when spaceOptions change to filter out invalid spaces
  useEffect(() => {
    if (spaceOptions.length > 0) {
      setRules(prev => prev.map(rule => ({
        ...rule,
        spaces: normalizeSpaces(rule.spaces)
      })));
    }
  }, [spaceOptions]);

  // Debug logging
  useEffect(() => {
    console.log("BufferTimeRulesBlock - rules:", rules);
    console.log("BufferTimeRulesBlock - spaceOptions:", spaceOptions);
    console.log("BufferTimeRulesBlock - extractedSpaceNames:", extractedSpaceNames);
  }, [rules, spaceOptions, extractedSpaceNames]);

  const updateRule = (index: number, field: keyof BufferTimeRule, value: any) => {
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        let updatedValue = value;
        
        // Apply space filtering for spaces field
        if (field === 'spaces') {
          // Convert mixed space types to strings first, then filter
          const normalizedSpaces = Array.isArray(value) 
            ? value.map(space => getSpaceName(space))
            : [];
          updatedValue = normalizedSpaces.filter((space: string) => spaceOptions.includes(space));
        }
        
        const updatedRule = { ...rule, [field]: updatedValue };
        
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

  // Show loading state while spaces are being fetched
  if (spacesLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
        <div className="bg-[#F1F3F5] p-6 sm:p-3 rounded-lg">
          <div className="text-sm text-slate-600">Loading spaces...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Buffer Time Rules</h3>
      
      {/* Show extracted space names for debugging */}
      {extractedSpaceNames.length > 0 && (
        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border">
          <strong>AI-extracted spaces:</strong> {extractedSpaceNames.join(', ')}
        </div>
      )}
      
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
