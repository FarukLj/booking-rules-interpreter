
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface LogicOperatorButtonsProps {
  index: number;
  totalRules: number;
  onUpdateLogicOperator: (index: number, operator: string) => void;
}

export function LogicOperatorButtons({ index, totalRules, onUpdateLogicOperator }: LogicOperatorButtonsProps) {
  if (index >= totalRules - 1) return null;

  return (
    <div className="flex gap-2 mt-4">
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-slate-400 text-white px-3 py-1.5 text-sm hover:bg-slate-500"
        onClick={() => onUpdateLogicOperator(index, 'AND')}
      >
        <Plus className="h-3 w-3 mr-1" /> and
      </Button>

      <Button
        type="button"
        size="sm"
        className="rounded-full bg-slate-400 text-white px-3 py-1.5 text-sm hover:bg-slate-500"
        onClick={() => onUpdateLogicOperator(index, 'OR')}
      >
        <Plus className="h-3 w-3 mr-1" /> or
      </Button>
    </div>
  );
}
