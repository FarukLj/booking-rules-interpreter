
import { Button } from "@/components/ui/button";

interface LogicOperatorButtonsProps {
  index: number;
  totalRules: number;
  onUpdateLogicOperator: (index: number, operator: string) => void;
}

export function LogicOperatorButtons({
  index,
  totalRules,
  onUpdateLogicOperator
}: LogicOperatorButtonsProps) {
  // Don't show operator buttons after the last rule
  if (index >= totalRules - 1) {
    return null;
  }

  return (
    <div className="flex justify-center my-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdateLogicOperator(index, "AND")}
          className="h-8 px-3"
        >
          AND
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onUpdateLogicOperator(index, "OR")}
          className="h-8 px-3"
        >
          OR
        </Button>
      </div>
    </div>
  );
}
