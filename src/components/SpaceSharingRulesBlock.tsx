
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SpaceSharingRule } from "@/types/RuleResult";

interface SpaceSharingRulesBlockProps {
  initialRules?: SpaceSharingRule[];
}

export function SpaceSharingRulesBlock({ initialRules = [] }: SpaceSharingRulesBlockProps) {
  const [connections] = useState<SpaceSharingRule[]>(initialRules);

  // Resolve chained dependencies for "WHAT IT ALL MEANS"
  const resolveChainedDependencies = (connections: SpaceSharingRule[]): SpaceSharingRule[] => {
    const resolved = new Set<string>();
    const result: SpaceSharingRule[] = [];
    
    // Add direct connections
    for (const conn of connections) {
      const key = `${conn.from}->${conn.to}`;
      if (!resolved.has(key)) {
        resolved.add(key);
        result.push(conn);
      }
    }

    // Add implied connections (A->B, B->C implies A->C)
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 30) { // Prevent infinite loops
      changed = false;
      iterations++;
      
      for (const conn1 of result) {
        for (const conn2 of result) {
          if (conn1.to === conn2.from && conn1.from !== conn2.to) {
            const impliedKey = `${conn1.from}->${conn2.to}`;
            if (!resolved.has(impliedKey)) {
              resolved.add(impliedKey);
              result.push({from: conn1.from, to: conn2.to});
              changed = true;
            }
          }
        }
      }
    }

    return result;
  };

  const resolvedPairs = resolveChainedDependencies(connections);

  if (connections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 max-w-[650px]">
      <h3 className="text-lg font-semibold text-slate-800">Space-Sharing Rules</h3>
      <p className="text-sm text-slate-600 mb-3">
        Go to <strong>Settings › Space Sharing</strong> and add these connections:
      </p>
      
      {/* Connection list */}
      <div className="space-y-3">
        {connections.map((connection, index) => (
          <div className="flex items-center gap-3" key={`${connection.from}-${connection.to}-${index}`}>
            <Badge variant="secondary" className="bg-gray-200 text-gray-900 px-3 py-1">
              {connection.from}
            </Badge>
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
            <Badge variant="secondary" className="bg-gray-200 text-gray-900 px-3 py-1">
              {connection.to}
            </Badge>
          </div>
        ))}
      </div>

      {/* Explanation table */}
      {resolvedPairs.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-slate-800 mb-3">WHAT IT ALL MEANS</h4>
          
          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table className="border border-slate-200">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-800 border-r border-slate-200">
                    WHEN BOOKED
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800">
                    WILL NOT BE BOOKABLE
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resolvedPairs.map((pair, index) => (
                  <TableRow key={`${pair.from}-${pair.to}-${index}`} className="border-b border-slate-200">
                    <TableCell className="border-r border-slate-200 font-medium">
                      {pair.from}
                    </TableCell>
                    <TableCell>
                      {pair.to}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked list */}
          <div className="sm:hidden space-y-3">
            {resolvedPairs.map((pair, index) => (
              <div key={`${pair.from}-${pair.to}-${index}`} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="text-sm font-semibold text-slate-800">WHEN BOOKED:</div>
                <div className="text-sm text-slate-700 mb-2">{pair.from}</div>
                <div className="text-sm font-semibold text-slate-800">WILL NOT BE BOOKABLE:</div>
                <div className="text-sm text-slate-700">{pair.to}</div>
              </div>
            ))}
          </div>

          {resolvedPairs.length > 30 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                <strong>Warning:</strong> Large mesh detected; consider simplifying sharing rules.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
