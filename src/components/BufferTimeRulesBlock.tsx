
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LinkSelect } from '@/components/ui/LinkSelect';
import { Plus, Trash2 } from 'lucide-react';

interface BufferTimeRule {
  id: string;
  buffer_type: 'before' | 'after' | 'between';
  duration: number;
  unit: 'minutes' | 'hours';
  applies_to?: string[];
}

interface BufferTimeRulesBlockProps {
  rules: BufferTimeRule[];
  onRulesChange: (rules: BufferTimeRule[]) => void;
  availableSpaces?: string[];
}

export function BufferTimeRulesBlock({ rules, onRulesChange, availableSpaces = [] }: BufferTimeRulesBlockProps) {
  const addRule = () => {
    const newRule: BufferTimeRule = {
      id: Date.now().toString(),
      buffer_type: 'before',
      duration: 15,
      unit: 'minutes'
    };
    onRulesChange([...rules, newRule]);
  };

  const updateRule = (id: string, field: keyof BufferTimeRule, value: any) => {
    onRulesChange(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const removeRule = (id: string) => {
    onRulesChange(rules.filter(rule => rule.id !== id));
  };

  const bufferTypeOptions = [
    { value: 'before', label: 'Before booking' },
    { value: 'after', label: 'After booking' },
    { value: 'between', label: 'Between bookings' }
  ];

  const unitOptions = [
    { value: 'minutes', label: 'minutes' },
    { value: 'hours', label: 'hours' }
  ];

  return (
    <Card className="bg-[#F1F3F5]">
      <CardHeader>
        <CardTitle className="text-lg">Buffer Time Rules</CardTitle>
        <CardDescription>
          Set buffer time requirements before, after, or between bookings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-3 p-4 bg-white rounded-lg border">
            <div className="flex-1">
              <LinkSelect
                value={rule.buffer_type}
                onValueChange={(value) => updateRule(rule.id, 'buffer_type', value as 'before' | 'after' | 'between')}
                options={bufferTypeOptions}
                className="w-full"
              />
            </div>
            
            <span className="text-sm text-muted-foreground">requires</span>
            
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rule.duration}
                onChange={(e) => updateRule(rule.id, 'duration', parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 text-sm border border-input rounded-md text-center text-foreground bg-white"
                min="0"
                placeholder="15"
              />
              
              <LinkSelect
                value={rule.unit}
                onValueChange={(value) => updateRule(rule.id, 'unit', value as 'minutes' | 'hours')}
                options={unitOptions}
                className="w-24"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeRule(rule.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No buffer time rules configured
          </div>
        )}

        <Button
          onClick={addRule}
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Buffer Time Rule
        </Button>
      </CardContent>
    </Card>
  );
}
