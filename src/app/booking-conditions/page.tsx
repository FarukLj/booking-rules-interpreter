'use client';

import { useState, useEffect } from 'react';
import { BookingConditionsManager } from '@/components/booking/BookingConditionsManager';
import { Button } from '@/components/ui/button';
import { BookingCondition } from '@/types/BookingCondition';
import { generateBookingConditions } from '@/lib/bookingConditionGenerator';
import { useSpaceOptions } from '@/hooks/useSpaceOptions';

export default function BookingConditionsPage() {
  const [conditions, setConditions] = useState<BookingCondition[]>([]);
  const { spaceOptions } = useSpaceOptions();

  const handleGenerateExample = () => {
    if (!spaceOptions || spaceOptions.length === 0) {
      console.error('No space options available');
      return;
    }

    const exampleConditions = generateBookingConditions({
      spaceName: 'Basketball Court 2',
      availableSpaces: spaceOptions,
      timeBlockMinutes: 60,
      minDurationMinutes: 120,
      maxDurationMinutes: 240,
    });

    console.log('Generated conditions:', exampleConditions);
    setConditions(exampleConditions);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Booking Conditions</h1>
        <Button 
          onClick={handleGenerateExample}
          disabled={!spaceOptions || spaceOptions.length === 0}
        >
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
