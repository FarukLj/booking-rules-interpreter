import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { TestTube } from "lucide-react";
import { RuleResult } from "@/types/RuleResult";
import { BookingConditionsBlock } from "@/components/BookingConditionsBlock";
import { PricingRulesBlock } from "@/components/PricingRulesBlock";
import { QuotaRulesBlock } from "@/components/QuotaRulesBlock";
import { BufferTimeRulesBlock } from "@/components/BufferTimeRulesBlock";
import { BookingWindowRulesBlock } from "@/components/booking-window/BookingWindowRulesBlock";
import { SpaceSharingRulesBlock } from "@/components/SpaceSharingRulesBlock";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users, DollarSign, Calendar, Shield, ArrowRight } from "lucide-react";
import { spaceToName } from "@/utils/spaceHelpers";

interface SetupGuideModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
  mode?: "ai";
}

export const SetupGuideModal = ({ 
  result, 
  isOpen, 
  onClose, 
  mode = "ai"
}: SetupGuideModalProps) => {
  const navigate = useNavigate();
  
  // Helper function to extract space name from space object or string
  const getSpaceName = (space: string | { id: string; name: string }): string => {
    return typeof space === 'string' ? space : space.name;
  };

  // Check if we have new format data for testing
  const hasNewFormat = result.booking_conditions || result.pricing_rules || result.quota_rules || 
                      result.buffer_time_rules || result.booking_window_rules || result.space_sharing || result.summary;

  const handleTestConditions = () => {
    // Navigate to simulation page with rule data
    navigate("/simulation", { state: { rules: result } });
    onClose(); // Close the modal
  };

  // Build setup guide for AI mode only
  const buildSetupGuide = (data: RuleResult) => {
    const steps = [];

    // Extract unique spaces from all rule types
    const allSpaces = new Set<string>();
    
    data.booking_conditions?.forEach(rule => rule.space?.forEach(space => allSpaces.add(space)));
    data.pricing_rules?.forEach(rule => rule.space?.forEach(space => allSpaces.add(space)));
    data.quota_rules?.forEach(rule => rule.affected_spaces?.forEach(space => allSpaces.add(space)));
    data.buffer_time_rules?.forEach(rule => rule.spaces?.forEach(space => allSpaces.add(spaceToName(space))));
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

    // Add rule-specific steps - only if rules exist
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
        const stepNumber = steps.length + 1;
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

  const setupGuide = result.setup_guide?.length > 0 ? result.setup_guide : buildSetupGuide(result);

  // Enhanced dev mode guard rail - only check if we have rule blocks that should contain data
  if (process.env.NODE_ENV === 'development') {
    const ruleStepKeys = ['pricing_rules', 'booking_conditions', 'quota_rules', 'buffer_time_rules', 'booking_window_rules', 'space_sharing'];
    const stepsWithEmptyRuleBlocks = setupGuide.filter(step => 
      ruleStepKeys.includes(step.step_key) && 
      step.rule_blocks !== undefined && // Only check if rule_blocks property exists
      (!step.rule_blocks || step.rule_blocks.length === 0)
    );
    
    if (stepsWithEmptyRuleBlocks.length > 0) {
      console.error('[SetupGuideModal] Empty rule_blocks detected:', stepsWithEmptyRuleBlocks.map(s => s.step_key));
      throw new Error(`[ModalGuard] Empty rule_blocks for steps: ${stepsWithEmptyRuleBlocks.map(s => s.step_key).join(', ')}`);
    }

    // Enhanced dev echo for debugging
    const ruleCount = {
      PR: result.pricing_rules?.length || 0,
      BC: result.booking_conditions?.length || 0,
      QT: result.quota_rules?.length || 0,
      BT: result.buffer_time_rules?.length || 0,
      BW: result.booking_window_rules?.length || 0,
      SS: result.space_sharing?.length || 0
    };
    console.debug('[SetupGuideModal] Rule counts:', ruleCount);
    console.debug('[SetupGuideModal] booking_conditions data:', result.booking_conditions);
  }

  const renderRuleBlocks = (ruleBlocks: any[], blockType: string) => {
    console.log(`[SetupGuideModal] Rendering ${blockType} with data:`, ruleBlocks);
    
    switch (blockType) {
      case 'booking_conditions':
        return <BookingConditionsBlock initialConditions={ruleBlocks} ruleResult={result} />;
      case 'pricing_rules':
        return <PricingRulesBlock initialRules={ruleBlocks} ruleResult={result} />;
      case 'quota_rules':
        return <QuotaRulesBlock initialRules={ruleBlocks} ruleResult={result} />;
      case 'buffer_time_rules':
        return <BufferTimeRulesBlock initialRules={ruleBlocks} ruleResult={result} />;
      case 'booking_window_rules':
        return <BookingWindowRulesBlock initialRules={ruleBlocks} ruleResult={result} />;
      case 'space_sharing':
        return <SpaceSharingRulesBlock initialRules={ruleBlocks} />;
      default:
        return <div>Unknown rule type: {blockType}</div>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Setup Guide</span>
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
                <h3 className="font-medium text-blue-900 mb-2">What this setup accomplishes:</h3>
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

                {step.rule_blocks && renderRuleBlocks(step.rule_blocks, step.step_key)}
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <DialogFooter className="gap-2">
          {/* Test Conditions Preview Button - only show if we have rules to test */}
          {hasNewFormat && (
            <Button
              onClick={handleTestConditions}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test conditions preview
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
