
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectTriggerProps,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  children: ReactNode;            // <SelectItem>s
  width?: string;                 // eg "w-28"
}

export function LinkSelect({
  value,
  onValueChange,
  placeholder,
  children,
  width = "w-fit",
}: Props) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={`${width} h-auto px-0 py-0 border-none bg-transparent text-blue-700 font-semibold hover:text-blue-600 focus:ring-0 focus:outline-none`}
      >
        <SelectValue placeholder={placeholder} className="flex items-center">
          {value}
        </SelectValue>
        <ChevronDown className="ml-1 w-3 h-3 shrink-0" />
      </SelectTrigger>
      <SelectContent className="z-[100]" position="popper">
        {children}
      </SelectContent>
    </Select>
  );
}

export function LinkSelectTrigger(props: SelectTriggerProps) {
  return (
    <SelectTrigger
      {...props}
      className={cn(
        "h-auto px-0 py-0 border-none bg-transparent text-blue-700 font-semibold",
        "hover:text-blue-600 focus:ring-0 focus:outline-none",
        props.className
      )}
    >
      {props.children}
      <ChevronDown className="ml-1 w-3 h-3 shrink-0" />
    </SelectTrigger>
  );
}
