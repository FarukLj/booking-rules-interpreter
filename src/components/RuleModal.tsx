
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RuleResult } from "@/types/RuleResult";
import { Badge } from "@/components/ui/badge";
import { BookingConditionsBlock } from "./BookingConditionsBlock";
import { PricingRulesBlock } from "./PricingRulesBlock";

interface RuleModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
}

export function RuleModal({ result, isOpen, onClose }: RuleModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Booking Rule Analysis</DialogTitle>
          <DialogDescription>
            Here's the structured interpretation of your booking rule
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 my-4">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Space Name</h3>
            <p className="text-lg font-medium">{result.spaceName}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Availability</h3>
            <p className="text-lg font-medium">{result.availability}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Allowed Users</h3>
            <div className="flex flex-wrap gap-2">
              {typeof result.allowedUsers === 'string' ? (
                <Badge variant="secondary" className="px-3 py-1 text-sm">
                  {result.allowedUsers}
                </Badge>
              ) : (
                Array.isArray(result.allowedUsers) && result.allowedUsers.map((user, i) => (
                  <Badge key={i} variant="secondary" className="px-3 py-1 text-sm">
                    {user}
                  </Badge>
                ))
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Pricing</h3>
            <div className="bg-slate-50 p-3 rounded-md">
              {result.pricing.hourlyRate && (
                <div className="flex justify-between text-slate-800">
                  <span>Hourly Rate:</span>
                  <span className="font-medium">{result.pricing.hourlyRate}</span>
                </div>
              )}
              {result.pricing.dailyRate && (
                <div className="flex justify-between text-slate-800">
                  <span>Daily Rate:</span>
                  <span className="font-medium">{result.pricing.dailyRate}</span>
                </div>
              )}
              {result.pricing.weekendRules && (
                <div className="flex justify-between text-slate-800">
                  <span>Weekend Rules:</span>
                  <span className="font-medium">{result.pricing.weekendRules}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Explanation</h3>
            <p className="text-slate-800">{result.explanation}</p>
          </div>
          
          {result.aiReasoning && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">AI Reasoning</h3>
              <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 max-h-40 overflow-y-auto">
                <p className="whitespace-pre-wrap">{result.aiReasoning}</p>
              </div>
            </div>
          )}
          
          {/* Separator between AI summary and interactive blocks */}
          <div className="border-t border-slate-200 pt-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-6">Interactive Rule Configuration</h2>
            
            {/* Booking Conditions Block */}
            <div className="mb-8">
              <BookingConditionsBlock />
            </div>
            
            {/* Pricing Rules Block */}
            <div className="mb-4">
              <PricingRulesBlock />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
