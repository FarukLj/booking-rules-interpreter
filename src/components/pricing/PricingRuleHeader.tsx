
import { Info } from "lucide-react";

export function PricingRuleHeader() {
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-lg font-semibold text-slate-800">Pricing Rules</h3>
      <div className="flex items-center gap-1 text-xs text-slate-500 bg-green-50 px-2 py-1 rounded">
        <Info className="w-3 h-3" />
        <span>Define rates and conditions for charging</span>
      </div>
    </div>
  );
}
