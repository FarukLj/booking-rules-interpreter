
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
        <span className="text-muted-foreground text-sm">{placeholder}</span>
      );
    }

    if (selected.length === 1) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">
            {selected[0]}
            <X
              className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
              onClick={(e) => removeItem(selected[0], e)}
            />
          </Badge>
        </div>
      );
    }

    if (selected.length === 2) {
      return (
        <div className="flex items-center gap-1 flex-wrap">
          {selected.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs px-2 py-0.5 h-5">
              {item}
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={(e) => removeItem(item, e)}
              />
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="text-xs px-2 py-0.5 h-5">
          {selected[0]}
          <X
            className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
            onClick={(e) => removeItem(selected[0], e)}
          />
        </Badge>
        <span className="text-xs text-slate-600 font-medium">
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
            "justify-between font-normal min-h-[2.5rem] h-auto",
            selected.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1 flex-1 min-w-0 py-1">
            {renderDisplayValue()}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto" align="start">
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
              <span className="flex-1">{option}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
