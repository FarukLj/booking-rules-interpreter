
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, Settings, Users, Clock, DollarSign, Timer, Calendar, Building } from "lucide-react";
import { RuleResult, SetupGuideStep } from "@/types/RuleResult";
import { BookingConditionsBlock } from "./BookingConditionsBlock";
import { PricingRulesBlock } from "./PricingRulesBlock";
import { QuotaRulesBlock } from "./QuotaRulesBlock";
import { BufferTimeRulesBlock } from "./BufferTimeRulesBlock";
import { BookingWindowRulesBlock } from "./BookingWindowRulesBlock";
import { useState } from "react";

interface SetupGuideModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ result, isOpen, onClose }: SetupGuideModalProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  
  // Check if we have the new setup guide format
  const hasSetupGuide = result.setup_guide && result.setup_guide.length > 0;
  
  if (!hasSetupGuide) {
    return null; // Fallback to regular modal if no setup guide
  }

  const toggleStepCompletion = (stepKey: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepKey)) {
      newCompleted.delete(stepKey);
    } else {
      newCompleted.add(stepKey);
    }
    setCompletedSteps(newCompleted);
  };

  const getStepIcon = (stepKey: string) => {
    switch (stepKey) {
      case 'create_spaces':
        return <Settings className="h-5 w-5" />;
      case 'hours_of_availability':
        return <Building className="h-5 w-5" />;
      case 'create_user_tags':
        return <Users className="h-5 w-5" />;
      case 'booking_conditions':
        return <Circle className="h-5 w-5" />;
      case 'pricing_rules':
        return <DollarSign className="h-5 w-5" />;
      case 'quota_rules':
        return <Clock className="h-5 w-5" />;
      case 'buffer_time_rules':
        return <Timer className="h-5 w-5" />;
      case 'booking_window_rules':
        return <Calendar className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const renderRuleBlocks = (step: SetupGuideStep) => {
    if (!step.rule_blocks || step.rule_blocks.length === 0) return null;

    switch (step.step_key) {
      case 'booking_conditions':
        return <BookingConditionsBlock initialConditions={step.rule_blocks} />;
      case 'pricing_rules':
        return <PricingRulesBlock initialRules={step.rule_blocks} />;
      case 'quota_rules':
        return <QuotaRulesBlock initialRules={step.rule_blocks} />;
      case 'buffer_time_rules':
        return <BufferTimeRulesBlock initialRules={step.rule_blocks} />;
      case 'booking_window_rules':
        return <BookingWindowRulesBlock initialRules={step.rule_blocks} />;
      default:
        return null;
    }
  };

  const getUniqueSpaces = () => {
    const spaces = new Set<string>();
    if (result.parsed_rule_blocks?.booking_conditions) {
      result.parsed_rule_blocks.booking_conditions.forEach(rule => 
        rule.space.forEach(space => spaces.add(space))
      );
    }
    if (result.parsed_rule_blocks?.pricing_rules) {
      result.parsed_rule_blocks.pricing_rules.forEach(rule => 
        rule.space.forEach(space => spaces.add(space))
      );
    }
    // Add other rule types...
    return Array.from(spaces);
  };

  const getUniqueTags = () => {
    const tags = new Set<string>();
    if (result.parsed_rule_blocks?.booking_conditions) {
      result.parsed_rule_blocks.booking_conditions.forEach(rule => {
        if (Array.isArray(rule.value)) {
          rule.value.forEach(tag => tags.add(tag));
        }
      });
    }
    if (result.parsed_rule_blocks?.pricing_rules) {
      result.parsed_rule_blocks.pricing_rules.forEach(rule => {
        if (Array.isArray(rule.value)) {
          rule.value.forEach(tag => tags.add(tag));
        }
      });
    }
    // Add other rule types...
    return Array.from(tags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Booking Rules Setup Assistant
          </DialogTitle>
          <DialogDescription>
            Follow these steps to configure your booking system according to your requirements
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 my-4">
          {/* Summary at the top */}
          {result.summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What This Setup Accomplishes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{result.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Step-by-step guide */}
          {result.setup_guide?.map((step, index) => (
            <Card key={step.step_key} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="flex items-center gap-2">
                      {getStepIcon(step.step_key)}
                      {step.title}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStepCompletion(step.step_key)}
                      className="ml-auto"
                    >
                      {completedSteps.has(step.step_key) ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400" />
                      )}
                    </Button>
                  </CardTitle>
                </div>
                <CardDescription className="text-slate-600">
                  {step.instruction}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Special content for spaces step */}
                {step.step_key === 'create_spaces' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Required spaces:</p>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueSpaces().map(space => (
                        <Badge key={space} variant="secondary">{space}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Special content for hours of availability step */}
                {step.step_key === 'hours_of_availability' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Recommended availability hours:</p>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueSpaces().map(space => (
                        <Badge key={space} variant="outline">{space}: 07:00 AM – 09:00 PM</Badge>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> These hours define when spaces are available for booking. 
                        You can adjust them based on your venue's operating schedule.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Special content for tags step */}
                {step.step_key === 'create_user_tags' && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Required user tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueTags().map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <p className="text-sm text-amber-800">
                        <strong>Important:</strong> When creating booking conditions, remember that they define who <em>cannot</em> book. 
                        Use "users with none of the tags" to enforce "Only X can book" logic.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Render interactive rule blocks for configuration steps */}
                {renderRuleBlocks(step)}
              </CardContent>
            </Card>
          ))}
        </div>
        
        <DialogFooter className="flex justify-between">
          <div className="text-sm text-slate-500">
            {completedSteps.size} of {result.setup_guide?.length || 0} steps completed
          </div>
          <Button onClick={onClose}>Close Guide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
