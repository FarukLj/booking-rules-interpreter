
import React from 'react';

interface BookingWindowRowProps {
  row1Content: React.ReactNode; // User scope + tags selectors
  row3Content: React.ReactNode; // Spaces + operator + input + unit selectors
}

export function BookingWindowRow({
  row1Content,
  row3Content,
}: BookingWindowRowProps) {
  return (
    <div className="space-y-2">
      {/* Row 1: User scope and tags selectors */}
      <div className="flex gap-2 items-center">
        {row1Content}
      </div>

      {/* Row 2: Static text */}
      <div className="text-slate-600 font-medium">
        cannot make a booking for
      </div>

      {/* Row 3: Spaces + constraint controls */}
      <div className="flex gap-2 items-center flex-wrap">
        {row3Content}
      </div>
    </div>
  );
}
