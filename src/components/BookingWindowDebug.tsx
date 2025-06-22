import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RuleEvaluationEngine } from '@/lib/ruleEvaluationEngine';
import { RuleResult } from '@/types/RuleResult';

interface BookingWindowDebugProps {
  rules: RuleResult;
}

export function BookingWindowDebug({ rules }: BookingWindowDebugProps) {
  const [testResults, setTestResults] = useState<any[]>([]);

  const runTests = () => {
    const engine = new RuleEvaluationEngine(rules);
    const results = [];

    // Test cases
    const testCases = [
      { userTags: ["Sales Team"], space: "Sales Desk 1", daysAhead: 5, expected: true, description: "Sales Team 5 days ahead" },
      { userTags: ["Sales Team"], space: "Sales Desk 1", daysAhead: 50, expected: false, description: "Sales Team 50 days ahead" },
      { userTags: [], space: "Sales Desk 1", daysAhead: 2, expected: true, description: "Anonymous 2 days ahead" },
      { userTags: [], space: "Sales Desk 1", daysAhead: 6, expected: false, description: "Anonymous 6 days ahead" },
    ];

    testCases.forEach(testCase => {
      const date = new Date();
      date.setDate(date.getDate() + testCase.daysAhead);
      
      const input = {
        userTags: testCase.userTags,
        space: testCase.space,
        date,
        startTime: "09:00",
        endTime: "10:00"
      };

      const result = engine.evaluate(input);
      const passed = result.allowed === testCase.expected;
      
      results.push({
        ...testCase,
        actual: result.allowed,
        passed,
        errorReason: result.errorReason
      });
    });

    setTestResults(results);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Window Debug Tests</CardTitle>
        <Button onClick={runTests}>Run Tests</Button>
      </CardHeader>
      <CardContent>
        {testResults.length > 0 && (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className={`p-2 rounded ${result.passed ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="font-medium">{result.description}</div>
                <div>Expected: {result.expected ? 'ALLOWED' : 'REJECTED'}</div>
                <div>Actual: {result.actual ? 'ALLOWED' : 'REJECTED'}</div>
                <div>Result: {result.passed ? '✅ PASS' : '❌ FAIL'}</div>
                <div className="text-sm text-gray-600">{result.errorReason}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 