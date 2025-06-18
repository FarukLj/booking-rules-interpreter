import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BookingSimulationForm } from "@/components/BookingSimulationForm";
import { RuleModal } from "@/components/RuleModal";
import { RuleResult } from "@/types/RuleResult";
import { toast } from "sonner";

const SimulationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [rules, setRules] = useState<RuleResult | null>(null);

  useEffect(() => {
    // Get rules from navigation state
    const ruleData = location.state?.rules;
    if (ruleData) {
      setRules(ruleData);
    } else {
      // If no rules data, redirect back to home
      toast.error("No rule data found. Please generate rules first.");
      navigate("/");
    }
  }, [location.state, navigate]);

  if (!rules) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading simulation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Panel - Simulation Form */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-4 flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rules
            </Button>
            <h1 className="text-2xl font-bold text-slate-800">
              Rule Simulation
            </h1>
            <p className="text-slate-600 mt-1">
              Test how your booking rules apply to different scenarios
            </p>
          </div>

          {/* Simulation Form */}
          <BookingSimulationForm rules={rules} />
        </div>
      </div>

      {/* Right Panel - Rules Drawer */}
      <div className="w-[600px] border-l border-gray-200 bg-white overflow-y-auto">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-800">
              Generated Rules
            </h2>
            <p className="text-sm text-slate-600">
              These are the rules being tested in the simulation
            </p>
          </div>
          
          {/* Rules Content */}
          <div className="space-y-6">
            {/* Summary */}
            {rules.summary && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">Summary</h3>
                <div className="bg-slate-50 p-3 rounded-md">
                  <p className="text-slate-800">{rules.summary}</p>
                </div>
              </div>
            )}

            {/* AI Reasoning */}
            {rules.aiReasoning && (
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">AI Reasoning</h3>
                <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700 max-h-40 overflow-y-auto">
                  <p className="whitespace-pre-wrap">{rules.aiReasoning}</p>
                </div>
              </div>
            )}

            {/* Rule Blocks */}
            <div className="space-y-4">
              {/* Space Sharing Rules */}
              {rules.space_sharing && rules.space_sharing.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Space Sharing</h3>
                  {rules.space_sharing.map((rule, i) => (
                    <div key={i} className="text-sm text-slate-600">
                      {rule.from} → {rule.to}
                    </div>
                  ))}
                </div>
              )}

              {/* Booking Conditions */}
              {rules.booking_conditions && rules.booking_conditions.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Booking Conditions</h3>
                  {rules.booking_conditions.map((condition, i) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      <strong>Spaces:</strong> {condition.space.join(', ')}
                      <br />
                      <strong>Explanation:</strong> {condition.explanation}
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing Rules */}
              {rules.pricing_rules && rules.pricing_rules.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Pricing Rules</h3>
                  {rules.pricing_rules.map((rule, i) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      <strong>Spaces:</strong> {rule.space.join(', ')}
                      <br />
                      <strong>Rate:</strong> ${rule.rate.amount} {rule.rate.unit.replace('_', ' ')}
                      <br />
                      <strong>Explanation:</strong> {rule.explanation}
                    </div>
                  ))}
                </div>
              )}

              {/* Other rule types */}
              {rules.quota_rules && rules.quota_rules.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Quota Rules</h3>
                  {rules.quota_rules.map((rule, i) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      {rule.explanation}
                    </div>
                  ))}
                </div>
              )}

              {rules.booking_window_rules && rules.booking_window_rules.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Booking Window Rules</h3>
                  {rules.booking_window_rules.map((rule, i) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      {rule.explanation}
                    </div>
                  ))}
                </div>
              )}

              {rules.buffer_time_rules && rules.buffer_time_rules.length > 0 && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-medium text-slate-800 mb-2">Buffer Time Rules</h3>
                  {rules.buffer_time_rules.map((rule, i) => (
                    <div key={i} className="text-sm text-slate-600 mb-2">
                      {rule.explanation}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationPage;
