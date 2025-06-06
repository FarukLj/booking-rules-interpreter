
import { Toggle } from "@/components/ui/toggle";

interface LogicOperatorToggleProps {
  operator: string;
  onOperatorChange: (operator: string) => void;
}

export function LogicOperatorToggle({ operator, onOperatorChange }: LogicOperatorToggleProps) {
  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center space-x-2">
        <Toggle
          pressed={operator === "AND"}
          onPressedChange={(pressed) => onOperatorChange(pressed ? "AND" : "OR")}
          className="w-12 h-8"
        >
          AND
        </Toggle>
        <Toggle
          pressed={operator === "OR"}
          onPressedChange={(pressed) => onOperatorChange(pressed ? "OR" : "AND")}
          className="w-12 h-8"
        >
          OR
        </Toggle>
      </div>
    </div>
  );
}
