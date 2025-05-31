
import * as React from "react";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ 
  options, 
  selected, 
  onSelectionChange, 
  placeholder = "Select items",
  className
}: MultiSelectProps) {
  const getDisplayValue = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    if (selected.length === 2) return selected.join(", ");
    return `${selected.slice(0, 2).join(", ")} +${selected.length - 2}`;
  };

  const toggleItem = (item: string) => {
    const newSelected = selected.includes(item)
      ? selected.filter(s => s !== item)
      : [...selected, item];
    onSelectionChange(newSelected);
  };

  return (
    <Select>
      <SelectTrigger className={cn("w-40", className)}>
        <SelectValue>{getDisplayValue()}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <div 
            key={option} 
            className="flex items-center space-x-2 p-2 cursor-pointer hover:bg-slate-100" 
            onClick={() => toggleItem(option)}
          >
            <Checkbox 
              checked={selected.includes(option)}
            />
            <span className="text-sm">{option}</span>
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
