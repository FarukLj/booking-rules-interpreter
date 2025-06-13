'use client';

import { useState, useEffect } from 'react';
import { BookingConditionsManager } from '@/components/booking/BookingConditionsManager';
import { Button } from '@/components/ui/button';
import { BookingCondition } from '@/types/BookingCondition';
import { generateBookingConditions } from '@/lib/bookingConditionGenerator';

export default function BookingConditionsPage() {
  const [conditions, setConditions] = useState<BookingCondition[]>([]);

  const handleGenerateExample = () => {
    const exampleConditions = generateBookingConditions({
      spaceName: 'Basketball Court 2',
      timeBlockMinutes: 60,
      minDurationMinutes: 120,
      maxDurationMinutes: 240,
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    });
    setConditions(exampleConditions);
  };

  useEffect(() => {
    console.log('Current conditions:', conditions);
  }, [conditions]);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Booking Conditions</h1>
        <Button onClick={handleGenerateExample}>
          Generate Example
        </Button>
      </div>
      <div className="space-y-6">
        <BookingConditionsManager
          initialConditions={conditions}
          onChange={setConditions}
        />
      </div>
    </div>
  );
}
