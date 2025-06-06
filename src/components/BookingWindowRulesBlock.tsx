
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookingWindowRule } from "@/types/RuleResult";
import { HelpCircle, AlertTriangle } from "lucide-react";

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
}

// Unit normalization utility
const normalizeAdvanceUnit = (value: number, unit: string): number => {
  switch(unit.toLowerCase()) {
    case 'day':
    case 'days':
      return value * 24;
    case 'week':
    case 'weeks':
      return value * 24 * 7;
    case 'hour':
    case 'hours':
    default:
      return value;
  }
};

// Convert hours back to other units for display
const convertFromHours = (hours: number, targetUnit: string): number => {
  switch(targetUnit.toLowerCase()) {
    case 'day':
    case 'days':
      return Math.round(hours / 24);
    case 'week':
    case 'weeks':
      return Math.round(hours / (24 * 7));
    case 'hour':
    case 'hours':
    default:
      return hours;
  }
};

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
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        return { ...rule, [field]: value };
      }
      return rule;
    }));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const handleUnitChange = (index: number, newUnit: "hours" | "days" | "weeks") => {
    setRules(prev => prev.map((rule, i) => {
      if (i === index) {
        // Convert current value to hours, then to new unit
        const valueInHours = normalizeAdvanceUnit(rule.value || 72, rule.unit || 'hours');
        const newValue = convertFromHours(valueInHours, newUnit);
        
        console.log(`[Unit Conversion] ${rule.value} ${rule.unit} -> ${newValue} ${newUnit} (${valueInHours}h internal)`);
        
        return {
          ...rule,
          value: newValue,
          unit: newUnit
        } as BookingWindowRule;
      }
      return rule;
    }));
  };

  const getUserGroupText = (userScope: string) => {
    switch (userScope) {
      case "all_users": return "all users";
      case "users_with_tags": return "users with any of the tags";
      case "users_with_no_tags": return "users with none of the tags";
      default: return "all users";
    }
  };

  const getConstraintText = (constraint: string) => {
    switch (constraint) {
      case "less_than": return "less than";
      case "more_than": return "more than";
      default: return "less_than";
    }
  };

  const getTimeDisplayHelper = (value: number, unit: string) => {
    const hours = normalizeAdvanceUnit(value, unit);
    if (hours >= 168) {
      const weeks = Math.floor(hours / 168);
      return `= ${weeks} week${weeks !== 1 ? 's' : ''}`;
    } else if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `= ${days} day${days !== 1 ? 's' : ''}`;
    }
    return null;
  };

  const getConstraintExplanation = (constraint: string) => {
    if (constraint === 'less_than') {
      return 'Blocks bookings made too close to the event time (enforces minimum advance notice)';
    } else {
      return 'Blocks bookings made too far in advance (limits how far ahead users can book)';
    }
  };

  const getLogicValidation = (rule: BookingWindowRule) => {
    const hours = normalizeAdvanceUnit(rule.value || 0, rule.unit || 'hours');
    
    if (rule.constraint === 'more_than' && hours < 24) {
      return {
        type: 'warning',
        message: 'Short-term "more than" constraints may be confusing. Consider "less than" for minimum advance notice.'
      };
    }
    
    if (rule.constraint === 'less_than' && hours > 168) {
      return {
        type: 'info',
        message: 'Long-term "less than" constraints typically use "more than" to limit advance booking.'
      };
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Booking Window Rules</h3>
      
      {rules.map((rule, index) => {
        const validation = getLogicValidation(rule);
        
        return (
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
                
                <div className="flex items-center gap-1">
                  <Select value={rule.constraint || 'less_than'} onValueChange={(value) => updateRule(index, 'constraint', value)}>
                    <SelectTrigger className="w-24 h-10">
                      <SelectValue>
                        {getConstraintText(rule.constraint || 'less_than')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      <SelectItem value="less_than">less than</SelectItem>
                      <SelectItem value="more_than">more than</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[350px]">
                        <div className="text-xs space-y-2">
                          <div><strong>less than:</strong> {getConstraintExplanation('less_than')}</div>
                          <div><strong>more than:</strong> {getConstraintExplanation('more_than')}</div>
                          <div className="pt-1 border-t border-slate-200">
                            <div><strong>Example:</strong> "Coaches must book at least 24h in advance" = less than 24h</div>
                            <div><strong>Example:</strong> "No more than 48h in advance" = more than 48h</div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center gap-1">
                  <input 
                    type="number" 
                    value={rule.value || 72} 
                    onChange={(e) => updateRule(index, 'value', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-2 border border-input rounded-md text-sm h-10"
                    placeholder="72"
                  />
                  
                  {getTimeDisplayHelper(rule.value || 72, rule.unit || 'hours') && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-slate-500 cursor-help">
                            {getTimeDisplayHelper(rule.value || 72, rule.unit || 'hours')}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="text-xs">
                            Time conversion helper
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <Select 
                  value={rule.unit || 'hours'} 
                  onValueChange={(value: "hours" | "days" | "weeks") => handleUnitChange(index, value)}
                >
                  <SelectTrigger className="min-w-[100px] h-10">
                    <SelectValue>
                      {rule.unit || 'hours'} in advance
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="hours">hours in advance</SelectItem>
                    <SelectItem value="days">days in advance</SelectItem>
                    <SelectItem value="weeks">weeks in advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {rule.explanation && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border">
                  <strong>Explanation:</strong> {rule.explanation}
                </div>
              )}

              {/* Enhanced validation feedback */}
              {validation && (
                <div className={`text-xs p-2 rounded border mt-2 flex items-center gap-2 ${
                  validation.type === 'warning' 
                    ? 'text-orange-600 bg-orange-50 border-orange-200' 
                    : 'text-blue-600 bg-blue-50 border-blue-200'
                }`}>
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span><strong>Logic Check:</strong> {validation.message}</span>
                </div>
              )}

              {/* Semantic explanation */}
              <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded border mt-2">
                <strong>Rule Logic:</strong> {getConstraintExplanation(rule.constraint || 'less_than')}
              </div>
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
        );
      })}
    </div>
  );
}
