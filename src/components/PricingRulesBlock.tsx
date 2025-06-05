import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { PricingRule } from "@/types/RuleResult";
import { Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { timeObjectToTimeString, formatTimeDisplay, normalizeTemplateRules } from "@/utils/timeRange";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  // Apply template normalization if needed
  const normalizedRules = initialRules.length > 0 ? 
    normalizeTemplateRules({ parsed_rule_blocks: { pricing_rules: initialRules } }).parsed_rule_blocks.pricing_rules :
    initialRules;

  // Sort rules: fixed rates first, then per-period rates
  const sortedInitialRules = normalizedRules.sort((a, b) => {
    if (a.rate?.unit === "fixed" && b.rate?.unit !== "fixed") return -1;
    if (a.rate?.unit !== "fixed" && b.rate?.unit === "fixed") return 1;
    return 0;
  });
  
  const [rules, setRules] = useState<PricingRule[]>(
    sortedInitialRules.length > 0 ? sortedInitialRules : [{
      space: ["Space 1"],
      time_range: "09:00–17:00",
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      rate: { amount: 25, unit: "per_hour" },
      condition_type: "duration",
      operator: "is_greater_than",
      value: "1h",
      explanation: "Default pricing rule"
    }]
  );
  
  const [logicOperators, setLogicOperators] = useState<string[]>(
    new Array(Math.max(0, rules.length - 1)).fill("AND")
  );

  // Debug logging for time parsing
  useEffect(() => {
    console.debug('PricingRulesBlock: rules updated', rules.length);
    rules.forEach((rule, index) => {
      if (rule.from_time && rule.to_time) {
        console.debug(`[TimeParse] Rule ${index}: from_time={h:${rule.from_time.hour}, m:${rule.from_time.minute}} to_time={h:${rule.to_time.hour}, m:${rule.to_time.minute}}`);
        console.debug(`[TimeParse] Rule ${index}: Time objects are distinct:`, rule.from_time !== rule.to_time);
      } else if (rule.time_range) {
        console.debug(`[TimeParse] Rule ${index}: time_range="${rule.time_range}" but missing from_time/to_time objects`);
      }
    });
  }, [rules]);

  // Validation for positive pricing logic
  useEffect(() => {
    rules.forEach((rule, index) => {
      if (rule.condition_type === "user_tags" && 
          rule.operator === "contains_none_of" && 
          Array.isArray(rule.value) && 
          rule.value.length === 1) {
        console.warn(`PricingRule ${index}: Logic appears double-negative. "contains none of" with single tag may be incorrect for pricing.`);
      }
    });
  }, [rules]);

  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });
  
  const dayOptions = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 1", "Studio 2", "Studio 3", "Meeting Room B", "Court A", "Gym"];
  const rateUnitOptions = ["fixed", "per_15min", "per_30min", "per_hour", "per_2hours", "per_day"];
  const tagOptions = ["Public", "The Team", "Premium Members", "Gold Members", "Basic", "VIP", "Staff", "Instructor", "Pro Member", "Visitor", "Coaches"];
  
  const durationOperators = [
    "is less than",
    "is less than or equal to",
    "is greater than", 
    "is greater than or equal to",
    "is equal to",
    "is not equal to"
  ];
  const tagOperators = ["contains any of", "contains none of"];
  
  const durationValues = ["15min", "30min", "45min", "1h", "1h15min", "1h30min", "2h", "3h", "4h", "6h", "8h"];

  const updateRule = (index: number, field: keyof PricingRule, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const updateRateField = (index: number, field: 'amount' | 'unit', value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { 
        ...rule, 
        rate: { ...rule.rate, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
      } : rule
    ));
  };

  const updateLogicOperator = (index: number, operator: string) => {
    setLogicOperators(prev => prev.map((op, i) => i === index ? operator : op));
  };

  const addSubCondition = (ruleIndex: number) => {
    setRules(prev => prev.map((rule, i) => 
      i === ruleIndex ? { 
        ...rule, 
        sub_conditions: [
          ...(rule.sub_conditions || []),
          {
            condition_type: "duration",
            operator: "is_greater_than",
            value: "1h",
            logic: "AND"
          }
        ]
      } : rule
    ));
  };

  const removeSubCondition = (ruleIndex: number, subIndex: number) => {
    setRules(prev => prev.map((rule, i) => 
      i === ruleIndex ? { 
        ...rule, 
        sub_conditions: rule.sub_conditions?.filter((_, si) => si !== subIndex)
      } : rule
    ));
  };

  const updateSubCondition = (ruleIndex: number, subIndex: number, field: string, value: any) => {
    setRules(prev => prev.map((rule, i) => 
      i === ruleIndex ? { 
        ...rule, 
        sub_conditions: rule.sub_conditions?.map((sub, si) => 
          si === subIndex ? { ...sub, [field]: value } : sub
        )
      } : rule
    ));
  };

  const formatTimeDisplayLocal = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const minute = time.split(':')[1];
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  };

  const getPricingLogicText = (rule: PricingRule) => {
    if (rule.condition_type === "user_tags") {
      const operator = rule.operator === "contains_any_of" ? "with" : "without";
      const tags = Array.isArray(rule.value) ? rule.value.join(", ") : "";
      return `Price applies to users ${operator} tags: ${tags}`;
    }
    return "";
  };

  // Helper function to get time value for dropdown, using from_time/to_time if available
  const getTimeValue = (rule: PricingRule, position: 'start' | 'end'): string => {
    if (position === 'start') {
      if (rule.from_time) {
        const timeString = timeObjectToTimeString(rule.from_time);
        console.debug(`[TimeParse] getTimeValue start: using from_time ${timeString}`);
        return timeString;
      }
      const fallback = rule.time_range?.split('–')[0] || '09:00';
      console.debug(`[TimeParse] getTimeValue start: fallback to time_range ${fallback}`);
      return fallback;
    } else {
      if (rule.to_time) {
        const timeString = timeObjectToTimeString(rule.to_time);
        console.debug(`[TimeParse] getTimeValue end: using to_time ${timeString}`);
        return timeString;
      }
      const fallback = rule.time_range?.split('–')[1] || '17:00';
      console.debug(`[TimeParse] getTimeValue end: fallback to time_range ${fallback}`);
      return fallback;
    }
  };

  const updateTimeRange = (index: number, position: 'start' | 'end', newTime: string) => {
    const rule = rules[index];
    const startTime = position === 'start' ? newTime : getTimeValue(rule, 'start');
    const endTime = position === 'end' ? newTime : getTimeValue(rule, 'end');
    
    console.debug(`[TimeRange] Updating rule ${index} ${position} to ${newTime}, startTime: ${startTime}, endTime: ${endTime}`);
    
    updateRule(index, 'time_range', `${startTime}–${endTime}`);
    
    // Update the time objects
    const [hour, minute] = newTime.split(':').map(Number);
    const timeObj = { hour, minute };
    
    if (position === 'start') {
      console.debug(`[TimeRange] Setting from_time to`, timeObj);
      updateRule(index, 'from_time', timeObj);
    } else {
      console.debug(`[TimeRange] Setting to_time to`, timeObj);
      updateRule(index, 'to_time', timeObj);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
        <div className="flex items-center gap-1 text-xs text-slate-500 bg-green-50 px-2 py-1 rounded">
          <Info className="w-3 h-3" />
          <span>Define rates and conditions for charging</span>
        </div>
      </div>
      
      {rules.map((rule, index) => (
        <div key={index}>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <span className="text-slate-600">Between</span>
              <Select 
                value={getTimeValue(rule, 'start')} 
                onValueChange={(value) => updateTimeRange(index, 'start', value)}
              >
                <SelectTrigger className="w-24 h-10">
                  <SelectValue>
                    {formatTimeDisplayLocal(getTimeValue(rule, 'start'))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplayLocal(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">and</span>
              <Select 
                value={getTimeValue(rule, 'end')} 
                onValueChange={(value) => updateTimeRange(index, 'end', value)}
              >
                <SelectTrigger className="w-24 h-10">
                  <SelectValue>
                    {formatTimeDisplayLocal(getTimeValue(rule, 'end'))}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  {timeOptions.map(time => (
                    <SelectItem key={time} value={time}>{formatTimeDisplayLocal(time)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span className="text-slate-600">on</span>
              <MultiSelect
                options={dayOptions}
                selected={rule.days || []}
                onSelectionChange={(selected) => updateRule(index, 'days', selected)}
                placeholder="Select days"
                className="min-w-0 max-w-[200px]"
              />
              
              <MultiSelect
                options={spaceOptions}
                selected={rule.space || []}
                onSelectionChange={(selected) => updateRule(index, 'space', selected)}
                placeholder="Select spaces"
                className="min-w-0 max-w-[200px]"
              />
              
              <span className="text-slate-600">is priced</span>
              <div className="flex items-center gap-1">
                <span className="text-lg font-semibold">$</span>
                <Input 
                  type="number" 
                  value={rule.rate?.amount || 25} 
                  onChange={(e) => updateRateField(index, 'amount', e.target.value)}
                  className="w-20 h-10"
                  placeholder="25"
                />
                <Select value={rule.rate?.unit || 'per_hour'} onValueChange={(value) => updateRateField(index, 'unit', value)}>
                  <SelectTrigger className="w-28 h-10">
                    <SelectValue>
                      {rule.rate?.unit?.replace('_', ' ') || 'per hour'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {rateUnitOptions.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm mb-3">
              <span className="text-slate-600">for a booking if</span>
              <Select value={rule.condition_type || 'duration'} onValueChange={(value) => {
                updateRule(index, 'condition_type', value);
                // Clear tag list when switching to duration
                if (value === 'duration') {
                  updateRule(index, 'value', '1h');
                } else {
                  updateRule(index, 'value', []);
                }
              }}>
                <SelectTrigger className="w-32 h-10">
                  <SelectValue>
                    {rule.condition_type === "duration" ? "it's duration" : "the holder's set of tags"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="duration">it's duration</SelectItem>
                  <SelectItem value="user_tags">the holder's set of tags</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={rule.operator || 'is_greater_than'} onValueChange={(value) => updateRule(index, 'operator', value)}>
                <SelectTrigger className="min-w-[150px] h-10">
                  <SelectValue>
                    {rule.operator?.replace(/_/g, ' ') || 'is greater than'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="z-50">
                  {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                    <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {rule.condition_type === "duration" ? (
                <Select 
                  value={Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'} 
                  onValueChange={(value) => updateRule(index, 'value', value)}
                >
                  <SelectTrigger className="w-20 h-10">
                    <SelectValue>
                      {Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {durationValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <MultiSelect
                  options={tagOptions}
                  selected={Array.isArray(rule.value) ? rule.value : []}
                  onSelectionChange={(selected) => updateRule(index, 'value', selected)}
                  placeholder="Select tags"
                  className="min-w-0 max-w-[200px]"
                />
              )}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSubCondition(index)}
                className="h-8 px-2"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add condition
              </Button>
            </div>

            {/* Sub-conditions */}
            {rule.sub_conditions && rule.sub_conditions.map((subCondition, subIndex) => (
              <div key={subIndex} className="flex flex-wrap items-center gap-2 text-sm mb-2 ml-4 pl-4 border-l-2 border-slate-300">
                <Select 
                  value={subCondition.logic} 
                  onValueChange={(value) => updateSubCondition(index, subIndex, 'logic', value)}
                >
                  <SelectTrigger className="w-16 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={subCondition.condition_type} 
                  onValueChange={(value) => updateSubCondition(index, subIndex, 'condition_type', value)}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="duration">it's duration</SelectItem>
                    <SelectItem value="user_tags">the holder's set of tags</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select 
                  value={subCondition.operator} 
                  onValueChange={(value) => updateSubCondition(index, subIndex, 'operator', value)}
                >
                  <SelectTrigger className="min-w-[150px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    {(subCondition.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                      <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {subCondition.condition_type === "duration" ? (
                  <Select 
                    value={Array.isArray(subCondition.value) ? subCondition.value[0] : subCondition.value || '1h'} 
                    onValueChange={(value) => updateSubCondition(index, subIndex, 'value', value)}
                  >
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50">
                      {durationValues.map(value => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <MultiSelect
                    options={tagOptions}
                    selected={Array.isArray(subCondition.value) ? subCondition.value : []}
                    onSelectionChange={(selected) => updateSubCondition(index, subIndex, 'value', selected)}
                    placeholder="Select tags"
                    className="min-w-0 max-w-[200px]"
                  />
                )}
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubCondition(index, subIndex)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            
            {rule.condition_type === "user_tags" && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mb-2">
                <strong>Logic:</strong> {getPricingLogicText(rule)}
              </div>
            )}
            
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
