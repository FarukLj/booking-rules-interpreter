
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BookingRuleInputProps {
  onSubmit: (rule: string) => void;
  isLoading: boolean;
}

export function BookingRuleInput({ onSubmit, isLoading }: BookingRuleInputProps) {
  const [ruleText, setRuleText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ruleText.trim()) {
      onSubmit(ruleText);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Enter a Booking Rule</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="E.g., Only The Team can book Space 1 from 9am to 10pm at $25/hour or $150 full day"
          value={ruleText}
          onChange={(e) => setRuleText(e.target.value)}
          className="flex-grow"
          disabled={isLoading}
        />
        <Button 
          type="submit" 
          disabled={isLoading || !ruleText.trim()} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">
                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
              Analyzing...
            </>
          ) : (
            "Analyze Rule"
          )}
        </Button>
      </form>
      <p className="text-xs text-slate-500 mt-3">
        Describe your booking rule in natural language and our AI will interpret it.
      </p>
    </div>
  );
}
