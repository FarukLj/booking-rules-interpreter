
import React from 'react';

interface BookingWindowRowProps {
  selectorLeft: React.ReactNode;
  selectorRight: React.ReactNode;
  operator: React.ReactNode;
  valueInput: React.ReactNode;
  unitSelect: React.ReactNode;
  helpIcon: React.ReactNode;
}

export function BookingWindowRow({
  selectorLeft,
  selectorRight,
  operator,
  valueInput,
  unitSelect,
  helpIcon,
}: BookingWindowRowProps) {
  return (
    <div className="space-y-2">
      {/* Row 1: User scope and space selectors */}
      <div className="flex gap-2">
        <div className="flex-1">{selectorLeft}</div>
        <div className="flex-1">{selectorRight}</div>
      </div>

      {/* Row 2: Static text */}
      <div className="text-slate-600 font-medium">
        cannot make a booking for
      </div>

      {/* Row 3: Constraint controls */}
      <div className="flex gap-2 items-center flex-wrap">
        {operator}
        {valueInput}
        {unitSelect}
        {helpIcon}
      </div>
    </div>
  );
}
