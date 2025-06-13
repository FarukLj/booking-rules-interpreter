import { useState } from 'react';
import { BookingCondition } from '@/types/BookingCondition';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { BookingConditionForm } from './BookingConditionForm';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CONDITION: Omit<BookingCondition, 'id'> = {
  spaceIds: [],
  days: [],
  condition: 'AND',
  rules: [],
  isActive: true
};

interface BookingConditionsManagerProps {
  initialConditions?: BookingCondition[];
  onChange: (conditions: BookingCondition[]) => void;
}

export function BookingConditionsManager({ 
  initialConditions = [], 
  onChange 
}: BookingConditionsManagerProps) {
  const [conditions, setConditions] = useState<BookingCondition[]>(
    initialConditions.length > 0 
      ? initialConditions 
      : [{ ...DEFAULT_CONDITION, id: uuidv4() }]
  );

  const updateCondition = (id: string, updates: Partial<BookingCondition>) => {
    const updated = conditions.map(cond => 
      cond.id === id ? { ...cond, ...updates } : cond
    );
    setConditions(updated);
    onChange(updated);
  };

  const addCondition = () => {
    const newCondition = { 
      ...DEFAULT_CONDITION, 
      id: uuidv4() 
    };
    const updated = [...conditions, newCondition];
    setConditions(updated);
    onChange(updated);
  };

  const removeCondition = (id: string) => {
    const updated = conditions.filter(cond => cond.id !== id);
    setConditions(updated.length > 0 ? updated : [{ ...DEFAULT_CONDITION, id: uuidv4() }]);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {conditions.map((condition) => (
        <BookingConditionForm
          key={condition.id}
          condition={condition}
          onChange={(updates) => updateCondition(condition.id, updates)}
          onRemove={() => removeCondition(condition.id)}
        />
      ))}
      
      <Button
        variant="outline"
        onClick={addCondition}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" /> Add Booking Condition
      </Button>
    </div>
  );
}
