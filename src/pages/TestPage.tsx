
import React, { useEffect, useState } from 'react';
import { runTwoBlockTests, testTwoBlockTimeConditions } from '@/lib/bookingConditionTest';
import { BookingConditionsBlock } from '@/components/BookingConditionsBlock';
import { PricingRulesBlock } from '@/components/PricingRulesBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [mockConditions, setMockConditions] = useState<any[]>([]);
  const [pricingTestResults, setPricingTestResults] = useState<any>(null);

  const runTests = () => {
    console.log('🚀 Running two-block implementation tests...');
    const results = runTwoBlockTests();
    setTestResults(results);
    
    if (results.conditions) {
      setMockConditions(results.conditions);
    }
  };

  const testPricingPrompt = async () => {
    console.log('🚀 Testing pricing prompt...');
    const testPrompt = "From 6 AM-4 PM the indoor track is $10 per hour; from 4 PM-9 PM it's $18 per hour; members with the 'College Team' tag always pay $8 per hour any time.";
    
    try {
      const { data, error } = await supabase.functions.invoke('parseRule', {
        body: { rule: testPrompt }
      });
      
      if (error) {
        console.error('Error invoking parseRule:', error);
        setPricingTestResults({ error: error.message });
        return;
      }
      
      console.log('Pricing test results:', data);
      setPricingTestResults(data);
    } catch (err) {
      console.error('Failed to test pricing prompt:', err);
      setPricingTestResults({ error: 'Failed to invoke parseRule function' });
    }
  };

  const generateExpectedConditions = () => {
    const conditions = testTwoBlockTimeConditions();
    setMockConditions(conditions);
    console.log('Generated expected conditions:', conditions);
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Two-Block Implementation Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={runTests}>Run Tests</Button>
            <Button onClick={generateExpectedConditions} variant="outline">
              Generate Expected Conditions
            </Button>
          </div>
          
          {testResults && (
            <div className="p-4 bg-slate-50 rounded">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <p className={testResults.uiTestPassed ? "text-green-600" : "text-red-600"}>
                UI Test: {testResults.uiTestPassed ? "✅ PASSED" : "❌ FAILED"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing Rules Test</CardTitle>
          <p className="text-sm text-slate-600">
            Testing the indoor track pricing prompt with expected 3 pricing rule blocks
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={testPricingPrompt}>Test Pricing Prompt</Button>
          
          {pricingTestResults && (
            <div className="space-y-4">
              {pricingTestResults.error ? (
                <div className="p-4 bg-red-50 rounded text-red-600">
                  Error: {pricingTestResults.error}
                </div>
              ) : (
                <>
                  <div className="p-4 bg-green-50 rounded">
                    <h3 className="font-semibold mb-2 text-green-800">Pricing Test Results:</h3>
                    <p className="text-green-700">
                      Generated {pricingTestResults.pricing_rules?.length || 0} pricing rule blocks
                    </p>
                    {pricingTestResults.summary && (
                      <p className="text-sm mt-2 text-slate-600">{pricingTestResults.summary}</p>
                    )}
                  </div>
                  
                  {pricingTestResults.pricing_rules && (
                    <div>
                      <h4 className="font-semibold mb-2">Generated Pricing Rules:</h4>
                      <PricingRulesBlock 
                        initialRules={pricingTestResults.pricing_rules}
                        ruleResult={pricingTestResults}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {mockConditions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expected Two-Block Booking Conditions</CardTitle>
            <p className="text-sm text-slate-600">
              This should show 2 separate blocks: one for time intervals, one for duration constraints
            </p>
          </CardHeader>
          <CardContent>
            <BookingConditionsBlock initialConditions={mockConditions} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Expected Behavior Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <h4 className="font-semibold">Pricing Rules Test Expected Results:</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>✓ 3 pricing rule blocks total</li>
              <li>✓ Block 1: 6 AM-4 PM, Indoor Track, $10/hour, 15min default condition</li>
              <li>✓ Block 2: 4 PM-9 PM, Indoor Track, $18/hour, 15min default condition</li>
              <li>✓ Block 3: All times, Indoor Track, $8/hour, College Team tag condition</li>
              <li>✓ All blocks have all 7 days selected</li>
              <li>✓ Indoor Track space is properly selected</li>
              <li>✓ Time ranges are correctly parsed and displayed</li>
            </ul>

            <h4 className="font-semibold mt-4">Block 1 - Time Intervals (1-hour blocks):</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>✓ Space: Basketball Court 2 selected</li>
              <li>✓ Days: All days (Mon-Sun) selected</li>
              <li>✓ Time range: 00:00–24:00</li>
              <li>✓ Row 1: "the interval from 12:00 AM to its start" "multiple of" "1h"</li>
              <li>✓ Row 2: "the interval from its end to 12:00 AM" "multiple of" "1h"</li>
              <li>✓ Logic operator: AND</li>
            </ul>
            
            <h4 className="font-semibold mt-4">Block 2 - Duration Constraints (2-4 hours):</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>✓ Space: Basketball Court 2 selected</li>
              <li>✓ Days: All days (Mon-Sun) selected</li>
              <li>✓ Time range: 00:00–24:00</li>
              <li>✓ Row 1: "its duration" "is less than" "2h" (blocks &lt; 2h)</li>
              <li>✓ Row 2: "its duration" "is greater than" "4h" (blocks &gt; 4h)</li>
              <li>✓ Logic operator: OR</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
