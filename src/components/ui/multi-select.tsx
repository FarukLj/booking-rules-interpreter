
import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  const toggleItem = (item: string) => {
    const newSelected = selected.includes(item)
      ? selected.filter(s => s !== item)
      : [...selected, item];
    onSelectionChange(newSelected);
  };

  const removeItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = selected.filter(s => s !== item);
    onSelectionChange(newSelected);
  };

  const renderDisplayValue = () => {
    if (!selected || selected.length === 0) {
      return (
        <span className="text-muted-foreground text-sm truncate">{placeholder}</span>
      );
    }

    // Always show first item + count for consistency
    if (selected.length === 1) {
      return (
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 max-w-[120px] truncate">
            <span className="truncate">{selected[0]}</span>
            <X
              className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
              onClick={(e) => removeItem(selected[0], e)}
            />
          </Badge>
        </div>
      );
    }

    // For multiple items, show first item + count
    return (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5 max-w-[100px] truncate">
          <span className="truncate">{selected[0]}</span>
          <X
            className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
            onClick={(e) => removeItem(selected[0], e)}
          />
        </Badge>
        <span className="text-xs text-slate-600 font-medium flex-shrink-0">
          +{selected.length - 1} more
        </span>
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "justify-between font-normal h-10 min-h-[2.5rem] max-h-[2.5rem]",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
            {renderDisplayValue()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto z-50" align="start">
        {options.map((option) => (
          <DropdownMenuItem
            key={option}
            onClick={() => toggleItem(option)}
            className="cursor-pointer"
          >
            <div className="flex items-center space-x-2 w-full">
              <div className="flex h-4 w-4 items-center justify-center">
                {selected.includes(option) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <span className="flex-1 truncate">{option}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
