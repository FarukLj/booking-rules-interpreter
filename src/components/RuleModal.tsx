
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RuleResult } from "@/types/RuleResult";
import { BookingConditionsBlock } from "@/components/BookingConditionsBlock";
import { PricingRulesBlock } from "@/components/PricingRulesBlock";
import { QuotaRulesBlock } from "@/components/QuotaRulesBlock";
import { BufferTimeRulesBlock } from "@/components/BufferTimeRulesBlock";
import { BookingWindowRulesBlock } from "@/components/booking-window/BookingWindowRulesBlock";
import { SpaceSharingRulesBlock } from "@/components/SpaceSharingRulesBlock";

interface RuleModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
}

export function RuleModal({ result, isOpen, onClose }: RuleModalProps) {
  // Check if we have new format data
  const hasNewFormat = result.booking_conditions || result.pricing_rules || result.quota_rules || 
                      result.buffer_time_rules || result.booking_window_rules || result.summary;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {hasNewFormat ? "AI-Generated Booking Rules Summary" : "Booking Rule Analysis"}
          </DialogTitle>
          <DialogDescription>
            {hasNewFormat 
              ? "Here's the structured interpretation of your booking rules" 
              : "Here's the structured interpretation of your booking rule"
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 my-4">
          {/* New format summary */}
          {hasNewFormat && result.summary && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Summary</h3>
              <div className="bg-slate-50 p-3 rounded-md">
                <p className="text-slate-800">{result.summary}</p>
              </div>
            </div>
          )}

          {/* Legacy format display - keep for backward compatibility */}
          {!hasNewFormat && (
            <>
              {result.spaceName && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Space Name</h3>
                  <p className="text-lg font-medium">{result.spaceName}</p>
                </div>
              )}
              
              {result.availability && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Availability</h3>
                  <p className="text-lg font-medium">{result.availability}</p>
                </div>
              )}
              
              {result.allowedUsers && (
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
              )}
              
              {result.pricing && (
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
              )}
              
              {result.explanation && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-1">Explanation</h3>
                  <p className="text-slate-800">{result.explanation}</p>
                </div>
              )}
            </>
          )}
          
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
            {(result.booking_conditions || !hasNewFormat) && (
              <div className="mb-8">
                <BookingConditionsBlock 
                  initialConditions={result.booking_conditions} 
                  ruleResult={result}
                />
              </div>
            )}
            
            {/* Pricing Rules Block */}
            {(result.pricing_rules || !hasNewFormat) && (
              <div className="mb-8">
                <PricingRulesBlock initialRules={result.pricing_rules} />
              </div>
            )}

            {/* Quota Rules Block */}
            {result.quota_rules && result.quota_rules.length > 0 && (
              <div className="mb-8">
                <QuotaRulesBlock initialRules={result.quota_rules} />
              </div>
            )}

            {/* Buffer Time Rules Block */}
            {result.buffer_time_rules && result.buffer_time_rules.length > 0 && (
              <div className="mb-8">
                <BufferTimeRulesBlock initialRules={result.buffer_time_rules} />
              </div>
            )}

            {/* Booking Window Rules Block */}
            {result.booking_window_rules && result.booking_window_rules.length > 0 && (
              <div className="mb-4">
                <BookingWindowRulesBlock 
                  initialRules={result.booking_window_rules}
                  ruleResult={result}
                />
              </div>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
