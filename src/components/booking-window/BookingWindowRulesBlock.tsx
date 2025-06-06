
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BookingWindowRow } from './BookingWindowRow';
import { LogicOperatorToggle } from './LogicOperatorToggle';
import type { BookingWindowRule } from '@/types/RuleResult';

interface BookingWindowRulesBlockProps {
  initialRules?: BookingWindowRule[];
  availableSpaces?: string[];
}

export function BookingWindowRulesBlock({ 
  initialRules = [], 
  availableSpaces = [] 
}: BookingWindowRulesBlockProps) {
  
  const [rules, setRules] = useState<BookingWindowRule[]>(
    initialRules.length > 0 ? initialRules.map((rule, index) => ({
      id: rule.id || Date.now().toString() + index,
      logic_operator: rule.logic_operator || 'AND',
      ...rule
    })) : []
  );
  
  const addRule = () => {
    const newRule: BookingWindowRule = {
      id: Date.now().toString(),
      user_scope: 'all_users',
      spaces: [],
      constraint: 'less_than',
      value: 72,
      unit: 'hours',
      explanation: '',
      logic_operator: 'AND'
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, field: keyof BookingWindowRule, value: any) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const updateLogicOperator = (operator: 'AND' | 'OR') => {
    // Update all rules with the new logic operator
    setRules(rules.map(rule => ({ ...rule, logic_operator: operator })));
  };

  return (
    <Card className="bg-[#F1F3F5]">
      <CardHeader>
        <CardTitle className="text-lg">Booking Window Rules</CardTitle>
        <CardDescription>
          Set booking window restrictions for spaces
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length > 1 && (
          <LogicOperatorToggle 
            operator={rules[0]?.logic_operator || 'AND'}
            onOperatorChange={updateLogicOperator}
          />
        )}

        <div className="space-y-3">
          {rules.map((rule, index) => (
            <div key={rule.id}>
              <BookingWindowRow
                rule={rule}
                onRuleUpdate={(field, value) => updateRule(rule.id!, field, value)}
                onRemove={() => removeRule(rule.id!)}
                availableSpaces={availableSpaces}
                showRemove={rules.length > 1}
              />
              {index < rules.length - 1 && rules.length > 1 && (
                <div className="flex justify-center py-2">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {rules[0]?.logic_operator || 'AND'}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No booking window rules configured
          </div>
        )}

        <Button
          onClick={addRule}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Booking Window Rule
        </Button>
      </CardContent>
    </Card>
  );
}
