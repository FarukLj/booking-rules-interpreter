
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Select value={rule.user_scope} onValueChange={(value) => updateRule(index, 'user_scope', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_users">All users</SelectItem>
                  <SelectItem value="users_with_tags">Users with tags</SelectItem>
                  <SelectItem value="users_with_no_tags">Users with no tags</SelectItem>
                </SelectContent>
              </Select>
              
              {rule.user_scope === "users_with_tags" && (
                <>
                  <span className="text-slate-600">with tags</span>
                  <MultiSelect
                    options={tagOptions}
                    selected={rule.tags || []}
                    onSelectionChange={(selected) => updateRule(index, 'tags', selected)}
                    placeholder="Select tags"
                    className="w-32"
                  />
                </>
              )}
              
              <span className="text-slate-600">can book</span>
              
              <Select value={rule.constraint} onValueChange={(value) => updateRule(index, 'constraint', value)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="less_than">less than</SelectItem>
                  <SelectItem value="more_than">more than</SelectItem>
                </SelectContent>
              </Select>
              
              <Input 
                type="number" 
                value={rule.value} 
                onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                className="w-20"
                placeholder="72"
              />
              
              <Select value={rule.unit} onValueChange={(value) => updateRule(index, 'unit', value)}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">hours</SelectItem>
                  <SelectItem value="days">days</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">in advance for</span>
              
              <MultiSelect
                options={spaceOptions}
                selected={rule.spaces}
                onSelectionChange={(selected) => updateRule(index, 'spaces', selected)}
                placeholder="Select spaces"
                className="w-40"
              />
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
