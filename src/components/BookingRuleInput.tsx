
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Enter a Booking Rule</h2>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            className="w-full resize-none focus:outline-none bg-white border border-gray-300 rounded-lg text-base leading-relaxed px-4 py-3 pr-16
                       h-[200px] md:h-[280px]
                       overflow-y-auto
                       focus:border-blue-600 focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20
                       scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
            placeholder="E.g., Only The Team can book Space 1 from 9am to 10pm at $25/hour or $150 full day"
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-labelledby="rule-input-heading"
          />
          
          {/* Gradient overlay */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12
                          rounded-b-lg
                          bg-gradient-to-t from-[#F7F8FA] to-transparent"></div>
          
          {/* Analyze button */}
          <button
            type="submit"
            disabled={isLoading || !ruleText.trim()}
            className="absolute bottom-2 right-3 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600
                       transition-colors duration-200"
            aria-label="Analyze Rule"
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
          </button>
        </div>
      </form>
      <p className="text-xs text-slate-500 mt-3">
        Describe your booking rule in natural language and our AI will interpret it. Press Cmd/Ctrl+Enter to submit.
      </p>
    </div>
  );
}
