
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { BookingWindowRule } from "@/types/RuleResult";

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
}

export function BookingWindowRulesBlock({ initialRules = [] }: BookingWindowRulesBlockProps) {
  const [rules, setRules] = useState<BookingWindowRule[]>(
    initialRules.length > 0 ? initialRules : [{
      user_scope: "all_users",
      constraint: "less_than",
      value: 72,
      unit: "hours",
      spaces: ["Space 1"],
      explanation: "Default booking window rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor"];

  const updateRule = (index: number, field: keyof BookingWindowRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const getUserGroupText = (userScope: string) => {
    switch (userScope) {
      case "all_users": return "all users";
      case "users_with_tags": return "users with any of the tags";
      case "users_with_no_tags": return "users with none of the tags";
      default: return "all users";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <Select value={rule.user_scope || 'all_users'} onValueChange={(value) => updateRule(index, 'user_scope', value)}>
                <SelectTrigger className="min-w-[160px] h-10">
                  <SelectValue>
                    {getUserGroupText(rule.user_scope || 'all_users')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="all_users">all users</SelectItem>
                  <SelectItem value="users_with_tags">users with any of the tags</SelectItem>
                  <SelectItem value="users_with_no_tags">users with none of the tags</SelectItem>
                </SelectContent>
              </Select>
              
              {(rule.user_scope === "users_with_tags" || rule.user_scope === "users_with_no_tags") && (
                <MultiSelect
                  options={tagOptions}
                  selected={rule.tags || []}
                  onSelectionChange={(selected) => updateRule(index, 'tags', selected)}
                  placeholder="Select tags"
                  className="min-w-0 max-w-[200px]"
                />
              )}
              
              <span className="text-slate-600">cannot make a booking for</span>
              <MultiSelect
                options={spaceOptions}
                selected={rule.spaces || []}
                onSelectionChange={(selected) => updateRule(index, 'spaces', selected)}
                placeholder="Select spaces"
                className="min-w-0 max-w-[200px]"
              />
              
              <Select value={rule.constraint || 'less_than'} onValueChange={(value) => updateRule(index, 'constraint', value)}>
                <SelectTrigger className="w-24 h-10">
                  <SelectValue>
                    {rule.constraint === "less_than" ? "less than" : "more than"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="less_than">less than</SelectItem>
                  <SelectItem value="more_than">more than</SelectItem>
                </SelectContent>
              </Select>
              
              <input 
                type="number" 
                value={rule.value || 72} 
                onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                className="w-20 px-2 py-2 border border-input rounded-md text-sm h-10"
                placeholder="72"
              />
              
              <Select value="hours_in_advance" disabled>
                <SelectTrigger className="min-w-[120px] h-10">
                  <SelectValue>
                    hours in advance
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="hours_in_advance">hours in advance</SelectItem>
                </SelectContent>
              </Select>
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
