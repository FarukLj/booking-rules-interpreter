
import { useState } from "react";
import { BookingRuleInput } from "@/components/BookingRuleInput";
import { RuleModal } from "@/components/RuleModal";
import { SetupGuideModal } from "@/components/SetupGuideModal";
import { LibCategoryGrid } from "@/components/LibCategoryGrid";
import { Navbar } from "@/components/Navbar";
import { RuleResult } from "@/types/RuleResult";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

// this is a comment

const Index = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [ruleResult, setRuleResult] = useState<RuleResult | null>(null);

  const handleRuleSubmit = async (ruleText: string) => {
    setIsLoading(true);
    try {
      // Add input validation
      if (!ruleText.trim()) {
        throw new Error("Please enter a booking rule");
      }
      
      if (ruleText.length > 2000) {
        throw new Error("Rule text is too long. Please keep it under 2000 characters.");
      }

      // Call the parseRule edge function
      const { data, error } = await supabase.functions.invoke('parseRule', {
        body: { rule: ruleText }
      });

      if (error) {
        throw error;
      }

      // Check if the response contains an error message
      if (data && data.error) {
        throw new Error(data.details || data.error);
      }

      setRuleResult(data);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to analyze rule:", error);
      toast.error(`Failed to analyze booking rule: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which modal to show based on the result format
  const hasSetupGuide = ruleResult?.setup_guide && ruleResult.setup_guide.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Header Section */}
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-slate-800">AI Booking Rule Assistant</h1>
          <p className="text-slate-500 mt-2">
            Enter your venue booking rules in natural language and get a structured interpretation
          </p>
        </div>
      </header>

      {/* Hero Section with Mesh Gradient */}
      <section className="relative py-12 sm:py-8">
        <div className="absolute inset-0 bg-interpreter-mesh">
          <div 
            className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" 
            aria-hidden="true" 
          />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4">
          <BookingRuleInput onSubmit={handleRuleSubmit} isLoading={isLoading} />
        </div>
      </section>

      {/* Template Library Section - White Background */}
      <section className="bg-white py-14 sm:py-10">
        <div className="max-w-6xl mx-auto px-4">
          <LibCategoryGrid />
        </div>
      </section>
      
      {/* How it Works Section */}
      <section className="bg-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <h3 className="font-medium mb-2">Enter your rule</h3>
                <p className="text-slate-500 text-sm">Type your booking rule in natural language or browse templates</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <h3 className="font-medium mb-2">AI Analysis</h3>
                <p className="text-slate-500 text-sm">Our AI interprets your rule into structured data</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <h3 className="font-medium mb-2">Setup Guide</h3>
                <p className="text-slate-500 text-sm">Follow step-by-step instructions to implement the rules</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Example Rules Section */}
      <section className="bg-slate-50 pb-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Example Rules</h2>
            <ul className="space-y-3 text-slate-700">
              <li className="p-3 bg-slate-50 rounded-md">"Only The Team can book Space 1 from 9am to 10pm at $25/hour or $150 full day"</li>
              <li className="p-3 bg-slate-50 rounded-md">"Premium Members can book Conference Room A on weekdays from 8am-6pm at $50/hour"</li>
              <li className="p-3 bg-slate-50 rounded-md">"Studio 3 is available for Staff on weekends, $200 flat rate"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          © {new Date().getFullYear()} AI Booking Rule Assistant. All rights reserved.
        </div>
      </footer>
      
      {/* AI-generated rule modal - only "ai" mode now */}
      {showModal && ruleResult && hasSetupGuide && (
        <SetupGuideModal 
          result={ruleResult} 
          isOpen={showModal} 
          onClose={() => setShowModal(false)}
          mode="ai"
        />
      )}
      
      {showModal && ruleResult && !hasSetupGuide && (
        <RuleModal 
          result={ruleResult} 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
};

export default Index;
