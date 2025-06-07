
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Toggle } from "@/components/ui/toggle";
import { PricingRule } from "@/types/RuleResult";
import { Info, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LinkSelect } from "@/components/ui/LinkSelect";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  // Sort rules: fixed rates first, then per-period rates
  const sortedInitialRules = initialRules.sort((a, b) => {
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

  const formatTimeDisplay = (time: string) => {
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
          <div className="bg-[#F1F3F5] p-4 sm:p-3 rounded-lg dark:bg-slate-800">
            {/* Row 1: Natural Language Flow */}
            <div className="flex flex-wrap items-center gap-1 text-sm font-medium mb-3 leading-6">
              <span>Between</span>

              <LinkSelect 
                value={rule.time_range?.split('–')[0] || '09:00'}
                onValueChange={(v) => updateRule(index, 'time_range', `${v}–${rule.time_range?.split('–')[1]}`)}
              >
                {timeOptions.map(t => 
                  <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
                )}
              </LinkSelect>

              <span>and</span>

              <LinkSelect 
                value={rule.time_range?.split('–')[1] || '17:00'}
                onValueChange={(v) => updateRule(index, 'time_range', `${rule.time_range?.split('–')[0]}–${v}`)}
              >
                {timeOptions.map(t => 
                  <SelectItem key={t} value={t}>{formatTimeDisplay(t)}</SelectItem>
                )}
              </LinkSelect>

              <span>on</span>

              <MultiSelect
                triggerVariant="link"
                options={dayOptions}
                selected={rule.days || []}
                onSelectionChange={sel => updateRule(index, 'days', sel)}
                abbreviateDays={true}
              />
              ,

              <MultiSelect
                triggerVariant="link"
                options={spaceOptions}
                selected={rule.space || []}
                onSelectionChange={sel => updateRule(index, 'space', sel)}
              />

              <span>is priced</span>
            </div>
            
            {/* Row 2: Form Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              {/* Price Input + Unit */}
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-md px-3 h-10">
                <span className="text-lg font-semibold">$</span>
                <Input
                  type="number"
                  value={rule.rate?.amount || 25}
                  onChange={e => updateRateField(index, 'amount', e.target.value)}
                  className="border-0 p-0 h-auto text-right flex-1 focus:ring-0"
                />
                <Select 
                  value={rule.rate?.unit || 'per_hour'}
                  onValueChange={v => updateRateField(index, 'unit', v)}
                >
                  <SelectTrigger className="border-0 p-0 h-auto w-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rateUnitOptions.map(u => 
                      <SelectItem key={u} value={u}>{u.replace('_', ' ')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Condition Type */}
              <Select value={rule.condition_type || 'duration'} onValueChange={(value) => {
                updateRule(index, 'condition_type', value);
                if (value === 'duration') {
                  updateRule(index, 'value', '1h');
                } else {
                  updateRule(index, 'value', []);
                }
              }}>
                <SelectTrigger className="h-10">
                  <SelectValue>
                    {rule.condition_type === "duration" ? "duration" : "user tags"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="duration">duration</SelectItem>
                  <SelectItem value="user_tags">user tags</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Operator */}
              <Select value={rule.operator || 'is_greater_than'} onValueChange={(value) => updateRule(index, 'operator', value)}>
                <SelectTrigger className="h-10">
                  <SelectValue>
                    {rule.operator?.replace(/_/g, ' ') || 'is greater than'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                    <SelectItem key={operator} value={operator.replace(/\s/g, '_')}>{operator}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Value */}
              {rule.condition_type === "duration" ? (
                <Select 
                  value={Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'} 
                  onValueChange={(value) => updateRule(index, 'value', value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue>
                      {Array.isArray(rule.value) ? rule.value[0] : rule.value || '1h'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {durationValues.map(value => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10">
                  <MultiSelect
                    options={tagOptions}
                    selected={Array.isArray(rule.value) ? rule.value : []}
                    onSelectionChange={(selected) => updateRule(index, 'value', selected)}
                    placeholder="Select tags"
                  />
                </div>
              )}
            </div>

            {/* Add Condition Button */}
            <div className="mb-3">
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
                  <SelectContent>
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
                  <SelectContent>
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
                  <SelectContent>
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
                    <SelectContent>
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
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border mb-2 dark:bg-blue-900/20 dark:text-blue-400">
                <strong>Logic:</strong> {getPricingLogicText(rule)}
              </div>
            )}
            
            {rule.explanation && (
              <div className="text-xs text-slate-600 bg-white p-2 rounded border dark:bg-slate-700 dark:text-slate-300">
                <strong>Explanation:</strong> {rule.explanation}
              </div>
            )}
          </div>
          
          {index < rules.length - 1 && (
            <div className="flex gap-2 mt-4">
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-slate-400 text-white px-3 py-1.5 text-sm hover:bg-slate-500"
                onClick={() => updateLogicOperator(index, 'AND')}
              >
                <Plus className="h-3 w-3 mr-1" /> and
              </Button>

              <Button
                type="button"
                size="sm"
                className="rounded-full bg-slate-400 text-white px-3 py-1.5 text-sm hover:bg-slate-500"
                onClick={() => updateLogicOperator(index, 'OR')}
              >
                <Plus className="h-3 w-3 mr-1" /> or
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
