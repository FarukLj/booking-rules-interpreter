
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface PricingRule {
  timeRange: string;
  weekdays: string[];
  space: string;
  price: string;
  rateUnit: string;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
}

interface PricingRulesBlockProps {
  initialRules?: PricingRule[];
}

export function PricingRulesBlock({ initialRules = [] }: PricingRulesBlockProps) {
  const [rules, setRules] = useState<PricingRule[]>(
    initialRules.length > 0 ? initialRules : [{
      timeRange: "09:00–22:00",
      weekdays: ["Monday–Friday"],
      space: "Space 1",
      price: "25",
      rateUnit: "per 1h",
      conditionType: "it's duration",
      conditionOperator: "is greater than",
      conditionValue: "1h"
    }]
  );

  const timeRangeOptions = ["00:00–24:00", "08:00–18:00", "09:00–17:00", "09:00–22:00", "18:00–24:00"];
  const weekdayOptions = ["Monday–Friday", "Saturday–Sunday", "Monday–Sunday", "Weekdays", "Weekends"];
  const spaceOptions = ["Space 1", "Space 2", "Conference Room A", "Studio 3", "Meeting Room B"];
  const rateUnitOptions = ["fixed", "per 15min", "per 30min", "per 1h", "per 2h", "per day"];
  
  const durationOperators = ["is less than", "is less than or equal to", "is greater than", "is greater than or equal to", "is equal to", "is not equal to", "is not a multiple of"];
  const tagOperators = ["contains any of", "contains none of"];
  
  const durationValues = ["15min", "30min", "1h", "1h30min", "2h", "3h", "4h", "6h", "8h", "12h", "24h"];
  const tagValues = ["The Team", "Gold Membership", "Premium Members", "Staff", "Public"];

  const updateRule = (index: number, field: keyof PricingRule, value: string) => {
    setRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
      
      {rules.map((rule, index) => (
        <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">between</span>
            
            <Select value={rule.timeRange} onValueChange={(value) => updateRule(index, 'timeRange', value)}>
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
            
            <Select value={rule.weekdays[0]} onValueChange={(value) => updateRule(index, 'weekdays', value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weekdayOptions.map(days => (
                  <SelectItem key={days} value={days}>{days}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={rule.space} onValueChange={(value) => updateRule(index, 'space', value)}>
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
              value={rule.price} 
              onChange={(e) => updateRule(index, 'price', e.target.value)}
              className="w-20"
              placeholder="25"
            />
            
            <Select value={rule.rateUnit} onValueChange={(value) => updateRule(index, 'rateUnit', value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rateUnitOptions.map(unit => (
                  <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <span className="text-slate-600">for a booking if</span>
            
            <Select value={rule.conditionType} onValueChange={(value) => updateRule(index, 'conditionType', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="it's duration">it's duration</SelectItem>
                <SelectItem value="the holder's set of tags">the holder's set of tags</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={rule.conditionOperator} onValueChange={(value) => updateRule(index, 'conditionOperator', value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(rule.conditionType === "it's duration" ? durationOperators : tagOperators).map(operator => (
                  <SelectItem key={operator} value={operator}>{operator}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={rule.conditionValue} onValueChange={(value) => updateRule(index, 'conditionValue', value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(rule.conditionType === "it's duration" ? durationValues : tagValues).map(value => (
                  <SelectItem key={value} value={value}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}
