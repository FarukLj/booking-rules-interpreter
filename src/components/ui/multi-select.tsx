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
import { abbreviateDays } from "@/utils/dayAbbreviation";

/** Tailwind classes for each trigger style */
const triggerStyles = {
  input:
    "justify-between font-normal h-10 min-h-[2.5rem] max-h-[2.5rem] border border-slate-300 rounded px-2",
  link:
    "inline-flex items-center gap-1 h-auto px-0 py-0 border-none bg-transparent font-semibold text-blue-700 hover:text-blue-600 focus:outline-none",
} as const;

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerVariant?: "input" | "link";
  abbreviateDays?: boolean;
}

// Helper function for flexible space name matching
const isSpaceMatch = (selected: string, option: string): boolean => {
  if (selected === option) return true;
  return selected.toLowerCase().trim() === option.toLowerCase().trim();
};

export function MultiSelect({ 
  options, 
  selected, 
  onSelectionChange, 
  placeholder = "Select items",
  className,
  triggerVariant = "input",
  abbreviateDays: shouldAbbreviateDays = false
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

  const getDisplayItems = (items: string[]) => {
    return shouldAbbreviateDays ? abbreviateDays(items) : items;
  };

  const renderDisplayValue = () => {
    if (!selected || selected.length === 0) {
      return (
        <span className="text-muted-foreground text-sm truncate">{placeholder}</span>
      );
    }

    // Ensure all selected items are strings and keep them even if not in options
    // Use flexible matching to determine validity
    const validSelected = selected.filter(s => {
      if (typeof s !== "string") return false;
      // If it exactly matches an option, it's valid
      if (options.includes(s)) return true;
      // If it matches an option case-insensitively, it's valid
      return options.some(option => isSpaceMatch(s, option));
    });

    // If we found invalid items, silently fix the selection
    if (validSelected.length !== selected.length) {
      // Only update if we're removing invalid items, but keep items that match flexibly
      const flexibleSelected = selected.filter(s => {
        if (typeof s !== "string") return false;
        return options.some(option => isSpaceMatch(s, option)) || options.includes(s);
      });
      if (flexibleSelected.length !== selected.length) {
        onSelectionChange(flexibleSelected);
      }
    }

    // Display all selected items, even if they don't exactly match options
    const itemsToDisplay = selected.filter(s => typeof s === "string");

    // For link variant, display as clean text like LinkSelect
    if (triggerVariant === "link") {
      const displayItems = getDisplayItems(itemsToDisplay);
      if (itemsToDisplay.length === 1) {
        return <span className="text-blue-700 font-semibold">{displayItems[0]}</span>;
      }
      return <span className="text-blue-700 font-semibold">{displayItems.join(", ")}</span>;
    }

    // For input variant, use the existing chip display logic
    const maxVisibleChips = 3;

    if (itemsToDisplay.length === 1) {
      return (
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span
            className="inline-flex items-center gap-0.5 rounded-full bg-link/10 text-link text-xs px-2 py-0.5 max-w-[160px] truncate"
          >
            <span className="truncate">{itemsToDisplay[0]}</span>
            <X
              className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
              onClick={(e) => removeItem(itemsToDisplay[0], e)}
            />
          </span>
        </div>
      );
    }

    if (itemsToDisplay.length <= maxVisibleChips) {
      return (
        <div className="flex items-center gap-1 min-w-0 flex-1 flex-wrap">
          {itemsToDisplay.slice(0, maxVisibleChips).map((item, index) => (
            <span
              key={item}
              className="inline-flex items-center gap-0.5 rounded-full bg-link/10 text-link text-xs px-2 py-0.5 max-w-[120px] truncate"
            >
              <span className="truncate">{item}</span>
              <X
                className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
                onClick={(e) => removeItem(item, e)}
              />
            </span>
          ))}
        </div>
      );
    }

    // For many items, show first 2 chips + count
    return (
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {itemsToDisplay.slice(0, 2).map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-0.5 rounded-full bg-link/10 text-link text-xs px-2 py-0.5 max-w-[100px] truncate"
          >
            <span className="truncate">{item}</span>
            <X
              className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive flex-shrink-0"
              onClick={(e) => removeItem(item, e)}
            />
          </span>
        ))}
        <span className="text-xs text-slate-600 font-medium flex-shrink-0">
          +{itemsToDisplay.length - 2} more
        </span>
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {triggerVariant === "link" ? (
          <Button
            type="button"
            role="combobox"
            variant="ghost"
            className={cn(triggerStyles.link, className)}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
              {renderDisplayValue()}
            </div>
            <ChevronDown className="h-3 w-3 shrink-0 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            role="combobox"
            variant="outline"
            className={cn(
              triggerStyles.input,
              selected.length === 0 && "text-muted-foreground",
              "min-w-[240px] max-w-[280px] md:max-w-[280px] sm:min-w-[180px]",
              className
            )}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden max-w-[calc(100%-32px)]">
              {renderDisplayValue()}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </Button>
        )}
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
                {(selected.includes(option) || selected.some(s => isSpaceMatch(s, option))) && (
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
