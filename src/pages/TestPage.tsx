
import React, { useEffect, useState } from 'react';
import { runTwoBlockTests, testTwoBlockTimeConditions } from '@/lib/bookingConditionTest';
import { BookingConditionsBlock } from '@/components/BookingConditionsBlock';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [mockConditions, setMockConditions] = useState<any[]>([]);

  const runTests = () => {
    console.log('🚀 Running two-block implementation tests...');
    const results = runTwoBlockTests();
    setTestResults(results);
    
    if (results.conditions) {
      setMockConditions(results.conditions);
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
            <h4 className="font-semibold">Block 1 - Time Intervals (1-hour blocks):</h4>
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
