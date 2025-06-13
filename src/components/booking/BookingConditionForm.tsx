
import { useState } from 'react';
import { BookingCondition } from '@/types/BookingCondition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Plus } from 'lucide-react';
import { BookingRule, DayOfWeek, TimeUnit } from '@/types/BookingCondition';

interface BookingConditionFormProps {
  condition: BookingCondition;
  onChange: (updates: Partial<BookingCondition>) => void;
  onRemove: () => void;
}

export function BookingConditionForm({ condition, onChange, onRemove }: BookingConditionFormProps) {
  const [newSpaceId, setNewSpaceId] = useState('');

  const addSpaceId = () => {
    if (newSpaceId.trim() && !condition.spaceIds.includes(newSpaceId.trim())) {
      onChange({
        spaceIds: [...condition.spaceIds, newSpaceId.trim()]
      });
      setNewSpaceId('');
    }
  };

  const removeSpaceId = (spaceId: string) => {
    onChange({
      spaceIds: condition.spaceIds.filter(id => id !== spaceId)
    });
  };

  const updateRule = (index: number, updates: Partial<BookingRule>) => {
    const updatedRules = condition.rules.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    );
    onChange({ rules: updatedRules });
  };

  const addRule = () => {
    const newRule: BookingRule = {
      id: crypto.randomUUID(),
      type: 'duration',
      operator: 'less_than',
      value: 30,
      unit: 'minutes'
    };
    onChange({
      rules: [...condition.rules, newRule]
    });
  };

  const removeRule = (index: number) => {
    if (condition.rules.length > 1) {
      onChange({
        rules: condition.rules.filter((_, i) => i !== index)
      });
    }
  };

  const toggleDay = (day: DayOfWeek) => {
    const updatedDays = condition.days.includes(day)
      ? condition.days.filter(d => d !== day)
      : [...condition.days, day];
    onChange({ days: updatedDays });
  };

  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const timeUnits: TimeUnit[] = ['minutes', 'hours', 'days'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Booking Condition
          <Button variant="destructive" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Space IDs */}
        <div>
          <Label>Space IDs</Label>
          <div className="space-y-2">
            {condition.spaceIds.map((spaceId) => (
              <div key={spaceId} className="flex items-center gap-2">
                <Input value={spaceId} readOnly />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeSpaceId(spaceId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add space ID"
                value={newSpaceId}
                onChange={(e) => setNewSpaceId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSpaceId()}
              />
              <Button onClick={addSpaceId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Days */}
        <div>
          <Label>Days</Label>
          <div className="grid grid-cols-4 gap-2">
            {days.map((day) => (
              <div key={day} className="flex items-center space-x-2">
                <Checkbox
                  id={day}
                  checked={condition.days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label htmlFor={day} className="capitalize">
                  {day}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Condition Logic */}
        <div>
          <Label>Logic</Label>
          <Select 
            value={condition.condition} 
            onValueChange={(value: 'AND' | 'OR') => onChange({ condition: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND</SelectItem>
              <SelectItem value="OR">OR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rules */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Rules</Label>
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
          <div className="space-y-3">
            {condition.rules.map((rule, index) => (
              <Card key={rule.id} className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <Label>Type</Label>
                    <Select 
                      value={rule.type} 
                      onValueChange={(value: BookingRule['type']) => updateRule(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="duration">Duration</SelectItem>
                        <SelectItem value="time_interval">Time Interval</SelectItem>
                        <SelectItem value="start_time">Start Time</SelectItem>
                        <SelectItem value="end_time">End Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Operator</Label>
                    <Select 
                      value={rule.operator} 
                      onValueChange={(value: BookingRule['operator']) => updateRule(index, { operator: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_than">Less Than</SelectItem>
                        <SelectItem value="less_than_or_equal">Less Than or Equal</SelectItem>
                        <SelectItem value="greater_than">Greater Than</SelectItem>
                        <SelectItem value="greater_than_or_equal">Greater Than or Equal</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                        <SelectItem value="multiple_of">Multiple Of</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Value</Label>
                    <Input
                      type="number"
                      value={typeof rule.value === 'number' ? rule.value : (rule.value as any).value || 0}
                      onChange={(e) => {
                        const numValue = parseInt(e.target.value);
                        if (typeof rule.value === 'object') {
                          updateRule(index, { 
                            value: { 
                              value: numValue, 
                              unit: (rule.value as any).unit || 'minutes' 
                            } 
                          });
                        } else {
                          updateRule(index, { value: numValue });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex items-end gap-2">
                    {rule.unit && (
                      <div className="flex-1">
                        <Label>Unit</Label>
                        <Select 
                          value={rule.unit} 
                          onValueChange={(value: TimeUnit) => updateRule(index, { unit: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeUnits.map(unit => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {condition.rules.length > 1 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Active Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="active"
            checked={condition.isActive}
            onCheckedChange={(checked) => onChange({ isActive: !!checked })}
          />
          <Label htmlFor="active">Active</Label>
        </div>
      </CardContent>
    </Card>
  );
}
