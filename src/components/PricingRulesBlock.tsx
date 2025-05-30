
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { PricingRule } from "@/types/RuleResult";

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  const [rules, setRules] = useState<PricingRule[]>(
    initialRules.length > 0 ? initialRules : [{
      space: ["Space 1"],
      time_range: "09:00–22:00",
      days: ["Monday–Friday"],
      rate: { amount: 25, unit: "per_hour" },
      condition_type: "duration",
      operator: "is_greater_than",
      value: "1h",
      explanation: "Default pricing rule"
    }]
  );

  const timeRangeOptions = ["00:00–24:00", "08:00–18:00", "09:00–17:00", "09:00–22:00", "18:00–24:00"];
  const weekdayOptions = ["Monday–Friday", "Saturday–Sunday", "Monday–Sunday", "Weekdays", "Weekends"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const rateUnitOptions = ["fixed", "per_15min", "per_30min", "per_hour", "per_2hours", "per_day"];
  
  const durationOperators = ["is_less_than", "is_less_than_or_equal_to", "is_greater_than", "is_greater_than_or_equal_to", "is_equal_to", "is_not_equal_to", "is_not_a_multiple_of"];
  const tagOperators = ["contains_any_of", "contains_none_of"];
  
  const durationValues = ["15min", "30min", "1h", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];
  const tagValues = ["The Team", "Gold Membership", "Premium Members", "Staff", "Public"];

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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">between</span>
            
            <Select value={rule.time_range} onValueChange={(value) => updateRule(index, 'time_range', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map(range => (
                  <SelectItem key={range} value={range}>{range}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">on</span>
            
            <Select value={rule.days[0]} onValueChange={(value) => updateRule(index, 'days', [value])}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekdayOptions.map(days => (
                  <SelectItem key={days} value={days}>{days}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={rule.space[0]} onValueChange={(value) => updateRule(index, 'space', [value])}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {spaceOptions.map(space => (
                  <SelectItem key={space} value={space}>{space}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">is priced</span>
            
            <Input 
              type="number" 
              value={rule.rate.amount} 
              onChange={(e) => updateRateField(index, 'amount', e.target.value)}
              className="w-20"
              placeholder="25"
            />
            
            <Select value={rule.rate.unit} onValueChange={(value) => updateRateField(index, 'unit', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateUnitOptions.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">for a booking if</span>
            
            <Select value={rule.condition_type} onValueChange={(value) => updateRule(index, 'condition_type', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="duration">it's duration</SelectItem>
                <SelectItem value="user_tags">the holder's set of tags</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={rule.operator} onValueChange={(value) => updateRule(index, 'operator', value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(rule.condition_type === "duration" ? durationOperators : tagOperators).map(operator => (
                  <SelectItem key={operator} value={operator}>{operator.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={Array.isArray(rule.value) ? rule.value[0] : rule.value} 
              onValueChange={(value) => updateRule(index, 'value', rule.condition_type === "duration" ? value : [value])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(rule.condition_type === "duration" ? durationValues : tagValues).map(value => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
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
