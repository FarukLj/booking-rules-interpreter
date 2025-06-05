
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
import { SpaceSharingRulesBlock } from "./SpaceSharingRulesBlock";
import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";

interface SetupGuideModalProps {
  result: RuleResult;
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ result, isOpen, onClose }: SetupGuideModalProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const location = useLocation();
  
  // Detect if opened from template library
  const isLibrary = location.pathname.startsWith('/templates/');
  
  console.debug('[SetupGuideModal] Received result:', {
    pricing_rules_count: result.pricing_rules?.length || 0,
    booking_conditions_count: result.booking_conditions?.length || 0,
    setup_guide_count: result.setup_guide?.length || 0,
    setup_guide_keys: result.setup_guide?.map((s: any) => s.step_key) || [],
    isLibrary
  });
  
  // Helper functions defined before useMemo to avoid reference errors
  const getUniqueSpaces = () => {
    const spaces = new Set<string>();
    if (result.booking_conditions) {
      result.booking_conditions.forEach(rule => 
        rule.space.forEach(space => spaces.add(space))
      );
    }
    if (result.pricing_rules) {
      result.pricing_rules.forEach(rule => 
        rule.space.forEach(space => spaces.add(space))
      );
    }
    if (result.space_sharing) {
      result.space_sharing.forEach(rule => {
        spaces.add(rule.from);
        spaces.add(rule.to);
      });
    }
    // Add other rule types...
    return Array.from(spaces);
  };

  const getUniqueTags = () => {
    const tags = new Set<string>();
    if (result.booking_conditions) {
      result.booking_conditions.forEach(rule => {
        if (Array.isArray(rule.value)) {
          rule.value.forEach(tag => tags.add(tag));
        }
      });
    }
    if (result.pricing_rules) {
      result.pricing_rules.forEach(rule => {
        if (Array.isArray(rule.value)) {
          rule.value.forEach(tag => tags.add(tag));
        }
      });
    }
    // Add other rule types...
    return Array.from(tags);
  };
  
  // Build dynamic setup guide based on mode and available data
  const dynamicSetupGuide = useMemo(() => {
    const steps: SetupGuideStep[] = [];
    
    console.debug('[SetupGuideModal] Building dynamic setup guide, isLibrary:', isLibrary);
    
    // Only add initial setup steps if NOT in library mode
    if (!isLibrary) {
      // Step 1: Create spaces
      steps.push({
        step_key: 'create_spaces',
        title: 'Step 1: Create the required spaces',
        instruction: 'Go to Settings > Spaces and click \'Add Space\'. Create these spaces.',
        spaces: getUniqueSpaces()
      });
      
      // Step 2: Hours of availability
      steps.push({
        step_key: 'hours_of_availability',
        title: 'Step 2: Add hours of availability',
        instruction: 'Go to Settings › Hours of availability and set each space to recommended hours.',
        spaces: getUniqueSpaces(),
        times: '09:00 AM – 09:00 PM'
      });
      
      // Step 3: Create user tags
      steps.push({
        step_key: 'create_user_tags',
        title: 'Step 3: Add user tags',
        instruction: 'Go to Users > Manage Tags and add the required user tags.'
      });
    }
    
    // Add rule configuration steps based on available data
    console.debug('[SetupGuideModal] Checking rule conditions:', {
      hasBookingConditions: result.booking_conditions && result.booking_conditions.length > 0,
      hasPricingRules: result.pricing_rules && result.pricing_rules.length > 0,
      hasQuotaRules: result.quota_rules && result.quota_rules.length > 0,
      hasBufferTimeRules: result.buffer_time_rules && result.buffer_time_rules.length > 0,
      hasBookingWindowRules: result.booking_window_rules && result.booking_window_rules.length > 0,
      hasSpaceSharing: result.space_sharing && result.space_sharing.length > 0
    });
    
    if (result.booking_conditions && result.booking_conditions.length > 0) {
      console.debug('[SetupGuideModal] Adding booking_conditions step');
      steps.push({
        step_key: 'booking_conditions',
        title: `Step ${steps.length + 1}: Create booking conditions`,
        instruction: 'Go to Settings > Conditions and create the following restriction rules:',
        rule_blocks: result.booking_conditions
      });
    }
    
    if (result.pricing_rules && result.pricing_rules.length > 0) {
      console.debug('[SetupGuideModal] Adding pricing_rules step');
      steps.push({
        step_key: 'pricing_rules',
        title: `Step ${steps.length + 1}: Create pricing rules`,
        instruction: 'Go to Settings > Pricing and create the following pricing rules:',
        rule_blocks: result.pricing_rules
      });
    }
    
    if (result.quota_rules && result.quota_rules.length > 0) {
      console.debug('[SetupGuideModal] Adding quota_rules step');
      steps.push({
        step_key: 'quota_rules',
        title: `Step ${steps.length + 1}: Create quota rules`,
        instruction: 'Go to Settings > Quotas and create the following quota rules:',
        rule_blocks: result.quota_rules
      });
    }
    
    if (result.buffer_time_rules && result.buffer_time_rules.length > 0) {
      console.debug('[SetupGuideModal] Adding buffer_time_rules step');
      steps.push({
        step_key: 'buffer_time_rules',
        title: `Step ${steps.length + 1}: Add buffer times`,
        instruction: 'Go to Settings > Buffer Times and add the following buffer rules:',
        rule_blocks: result.buffer_time_rules
      });
    }
    
    if (result.booking_window_rules && result.booking_window_rules.length > 0) {
      console.debug('[SetupGuideModal] Adding booking_window_rules step');
      steps.push({
        step_key: 'booking_window_rules',
        title: `Step ${steps.length + 1}: Create booking window rules`,
        instruction: 'Go to Settings > Booking Windows and create the following rules:',
        rule_blocks: result.booking_window_rules
      });
    }
    
    if (result.space_sharing && result.space_sharing.length > 0) {
      console.debug('[SetupGuideModal] Adding space_sharing step');
      steps.push({
        step_key: 'space_sharing',
        title: `Step ${steps.length + 1}: Set space-sharing rules`,
        instruction: 'Go to Settings › Space Sharing and add the following connections:',
        connections: result.space_sharing
      });
    }
    
    console.debug('[SetupGuideModal] Final dynamic steps:', steps.map(s => s.step_key));
    return steps;
  }, [result, isLibrary]);
  
  // Use dynamic guide or fallback to original setup_guide
  const setupGuide = dynamicSetupGuide.length > 0 ? dynamicSetupGuide : result.setup_guide;
  
  console.debug('[SetupGuideModal] Final setup guide:', {
    dynamicCount: dynamicSetupGuide.length,
    originalCount: result.setup_guide?.length || 0,
    finalCount: setupGuide?.length || 0,
    finalKeys: setupGuide?.map((s: any) => s.step_key) || []
  });
  
  // Check if we have any setup guide data
  const hasSetupGuide = setupGuide && setupGuide.length > 0;
  
  if (!hasSetupGuide) {
    console.debug('[SetupGuideModal] No setup guide available, not rendering modal');
    return null;
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
      case 'space_sharing':
        return <Building className="h-5 w-5" />;
      default:
        return <Circle className="h-5 w-5" />;
    }
  };

  const renderRuleBlocks = (step: SetupGuideStep) => {
    if (!step.rule_blocks || step.rule_blocks.length === 0) {
      // Handle space-sharing connections
      if (step.step_key === 'space_sharing' && step.connections) {
        return <SpaceSharingRulesBlock initialRules={step.connections} />;
      }
      return null;
    }

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {isLibrary ? "Template Configuration Guide" : "Booking Rules Setup Assistant"}
          </DialogTitle>
          <DialogDescription>
            {isLibrary 
              ? "Configure your booking system using this pre-built template"
              : "Follow these steps to configure your booking system according to your requirements"
            }
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
          {setupGuide?.map((step, index) => (
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
                {step.step_key === 'create_spaces' && step.spaces && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Required spaces:</p>
                    <div className="flex flex-wrap gap-2">
                      {step.spaces.map(space => (
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
                        <Badge key={space} variant="outline">{space}: {step.times || "07:00 AM – 09:00 PM"}</Badge>
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
            {completedSteps.size} of {setupGuide?.length || 0} steps completed
          </div>
          <Button onClick={onClose}>Close Guide</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
