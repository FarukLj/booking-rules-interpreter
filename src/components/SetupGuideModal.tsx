
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RuleResult } from "@/types/RuleResult";
import { BookingConditionsBlock } from "./BookingConditionsBlock";
import { PricingRulesBlock } from "./PricingRulesBlock";
import { QuotaRulesBlock } from "./QuotaRulesBlock";
import { BufferTimeRulesBlock } from "./BufferTimeRulesBlock";
import { BookingWindowRulesBlock } from "./BookingWindowRulesBlock";
import { SpaceSharingRulesBlock } from "./SpaceSharingRulesBlock";

interface SetupGuideModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
  mode?: "ai" | "library";
  templateTitle?: string;
}

export const SetupGuideModal = ({ 
  result, 
  isOpen, 
  onClose, 
  mode = "ai",
  templateTitle 
}: SetupGuideModalProps) => {
  
  // Build setup guide based on mode
  const buildSetupGuide = (data: RuleResult, currentMode: string) => {
    const steps = [];

    // Only include basic setup steps for AI mode
    if (currentMode === "ai") {
      // Extract unique spaces from all rule types
      const allSpaces = new Set<string>();
      
      data.booking_conditions?.forEach(rule => rule.space?.forEach(space => allSpaces.add(space)));
      data.pricing_rules?.forEach(rule => rule.space?.forEach(space => allSpaces.add(space)));
      data.quota_rules?.forEach(rule => rule.affected_spaces?.forEach(space => allSpaces.add(space)));
      data.buffer_time_rules?.forEach(rule => rule.spaces?.forEach(space => allSpaces.add(space)));
      data.booking_window_rules?.forEach(rule => rule.spaces?.forEach(space => allSpaces.add(space)));
      data.space_sharing?.forEach(rule => {
        allSpaces.add(rule.from);
        allSpaces.add(rule.to);
      });

      if (allSpaces.size > 0) {
        steps.push({
          step_key: "create_spaces",
          title: "Step 1: Create the required spaces",
          instruction: `Go to Settings > Spaces and click 'Add Space'. Create these spaces: ${Array.from(allSpaces).join(', ')}`,
          spaces: Array.from(allSpaces)
        });
      }

      steps.push({
        step_key: "hours_of_availability",
        title: "Step 2: Add hours of availability",
        instruction: "Go to Settings › Hours of availability and set each space to at least 07:00 AM – 09:00 PM for Monday–Friday. Adjust weekend hours as needed.",
        spaces: Array.from(allSpaces),
        times: "07:00 AM – 09:00 PM"
      });

      // Extract unique tags
      const allTags = new Set<string>();
      data.booking_conditions?.forEach(rule => {
        if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
          rule.value.forEach(tag => allTags.add(tag));
        }
      });
      data.pricing_rules?.forEach(rule => {
        if (rule.condition_type === "user_tags" && Array.isArray(rule.value)) {
          rule.value.forEach(tag => allTags.add(tag));
        }
      });
      data.quota_rules?.forEach(rule => {
        rule.tags?.forEach(tag => allTags.add(tag));
      });
      data.booking_window_rules?.forEach(rule => {
        rule.tags?.forEach(tag => allTags.add(tag));
      });

      if (allTags.size > 0) {
        steps.push({
          step_key: "create_user_tags",
          title: "Step 3: Add user tags",
          instruction: `Go to Users > Manage Tags and add: ${Array.from(allTags).join(', ')}. Note: For booking conditions with exclusive access (Only X can book), use 'contains none of' with the allowed tag. For pricing rules, use 'contains any of' with tags that should receive the price.`
        });
      }
    }

    // Add rule-specific steps for both modes
    const ruleStepMap = [
      { key: 'booking_conditions', title: 'Create booking conditions', instruction: 'Go to Settings > Conditions and create the following restriction rules:' },
      { key: 'pricing_rules', title: 'Create pricing rules', instruction: 'Go to Settings > Pricing and create the following pricing rules:' },
      { key: 'quota_rules', title: 'Create quota rules', instruction: 'Go to Settings > Quotas and create the following quota rules:' },
      { key: 'buffer_time_rules', title: 'Create buffer time rules', instruction: 'Go to Settings > Buffer Times and create the following buffer rules:' },
      { key: 'booking_window_rules', title: 'Create booking window rules', instruction: 'Go to Settings > Booking Windows and create the following advance booking rules:' },
      { key: 'space_sharing', title: 'Set space-sharing rules', instruction: 'Go to Settings › Space Sharing and add the following connections:' }
    ];

    ruleStepMap.forEach((ruleStep, index) => {
      const ruleData = data[ruleStep.key as keyof RuleResult] as any[];
      if (ruleData && ruleData.length > 0) {
        const stepNumber = currentMode === "ai" ? steps.length + 1 : index + 1;
        steps.push({
          step_key: ruleStep.key,
          title: `Step ${stepNumber}: ${ruleStep.title}`,
          instruction: ruleStep.instruction,
          rule_blocks: ruleData,
          ...(ruleStep.key === 'space_sharing' && { connections: ruleData })
        });
      }
    });

    return steps;
  };

  const setupGuide = result.setup_guide?.length > 0 ? result.setup_guide : buildSetupGuide(result, mode);

  // Dev mode guard rail
  if (process.env.NODE_ENV === 'development') {
    const ruleStepKeys = ['pricing_rules', 'booking_conditions', 'quota_rules', 'buffer_time_rules', 'booking_window_rules', 'space_sharing'];
    const emptySteps = setupGuide.filter(step => 
      ruleStepKeys.includes(step.step_key) && 
      (!step.rule_blocks || step.rule_blocks.length === 0)
    );
    
    if (emptySteps.length > 0) {
      console.error('[SetupGuideModal] Empty rule_blocks detected:', emptySteps.map(s => s.step_key));
      throw new Error(`[ModalGuard] Empty rule_blocks for steps: ${emptySteps.map(s => s.step_key).join(', ')}`);
    }

    // Dev echo for debugging
    const ruleCount = {
      PR: result.pricing_rules?.length || 0,
      BC: result.booking_conditions?.length || 0,
      QT: result.quota_rules?.length || 0,
      BT: result.buffer_time_rules?.length || 0,
      BW: result.booking_window_rules?.length || 0,
      SS: result.space_sharing?.length || 0
    };
    console.debug('[SetupGuideModal] Rule counts:', ruleCount);
  }

  const renderRuleBlock = (step: any) => {
    if (!step.rule_blocks?.length) return null;

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
      case 'space_sharing':
        return <SpaceSharingRulesBlock initialRules={step.rule_blocks} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>
              {mode === "library" && templateTitle ? `Template: ${templateTitle}` : "Setup Guide"}
            </span>
            {process.env.NODE_ENV === 'development' && (
              <code className="text-xs text-gray-400 font-mono">
                PR:{result.pricing_rules?.length || 0} BC:{result.booking_conditions?.length || 0} QT:{result.quota_rules?.length || 0} BT:{result.buffer_time_rules?.length || 0} BW:{result.booking_window_rules?.length || 0} SS:{result.space_sharing?.length || 0}
              </code>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-6 pr-4">
            {result.summary && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What this template accomplishes:</h3>
                <p className="text-blue-800">{result.summary}</p>
              </div>
            )}

            {setupGuide.map((step, index) => (
              <div key={step.step_key} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant="outline" className="text-sm font-medium">
                    {step.title}
                  </Badge>
                </div>
                
                <p className="text-slate-700 mb-4">{step.instruction}</p>
                
                {step.spaces && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Required spaces:</p>
                    <div className="flex flex-wrap gap-2">
                      {step.spaces.map((space: string) => (
                        <Badge key={space} variant="secondary">{space}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {step.times && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-600 mb-2">Suggested hours:</p>
                    <Badge variant="secondary">{step.times}</Badge>
                  </div>
                )}

                {renderRuleBlock(step)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
