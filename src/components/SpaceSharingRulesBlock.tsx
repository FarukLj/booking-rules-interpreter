
import { useState } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { SpaceSharingRule } from "@/types/RuleResult";

interface SpaceSharingRulesBlockProps {
  initialRules?: SpaceSharingRule[];
}

interface TableRow {
  whenBooked: string;
  blocked: string[];
}

export function SpaceSharingRulesBlock({ initialRules = [] }: SpaceSharingRulesBlockProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter out redundant reverse connections - show only parent-to-child relationships
  const getFilteredConnections = (connections: SpaceSharingRule[]): SpaceSharingRule[] => {
    const filtered: SpaceSharingRule[] = [];
    const seen = new Set<string>();

    connections.forEach(({ from, to }) => {
      const forward = `${from}->${to}`;
      const reverse = `${to}->${from}`;
      
      // If we haven't seen either direction, add the forward direction
      if (!seen.has(forward) && !seen.has(reverse)) {
        filtered.push({ from, to });
        seen.add(forward);
        seen.add(reverse); // Mark both directions as seen
      }
    });

    return filtered;
  };

  const connections = getFilteredConnections(initialRules);

  // Build complete adjacency map for bidirectional impacts (for explanation table)
  const buildAdjacencyMap = (connections: SpaceSharingRule[]): Record<string, string[]> => {
    const map: Record<string, string[]> = {};
    
    connections.forEach(({ from, to }) => {
      // Add forward connection
      if (!map[from]) map[from] = [];
      if (!map[from].includes(to)) {
        map[from].push(to);
      }
      
      // Add reverse connection for bidirectional impact
      if (!map[to]) map[to] = [];
      if (!map[to].includes(from)) {
        map[to].push(from);
      }
    });

    return map;
  };

  // Convert adjacency map to table rows
  const buildTableRows = (map: Record<string, string[]>): TableRow[] => {
    return Object.entries(map)
      .map(([whenBooked, blocked]) => ({
        whenBooked,
        blocked: blocked.sort() // Sort for consistent display
      }))
      .sort((a, b) => a.whenBooked.localeCompare(b.whenBooked)); // Sort rows by space name
  };

  const toggleRowExpansion = (spaceName: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(spaceName)) {
      newExpanded.delete(spaceName);
    } else {
      newExpanded.add(spaceName);
    }
    setExpandedRows(newExpanded);
  };

  const renderBlockedSpaces = (blocked: string[], whenBooked: string) => {
    const maxVisible = 4;
    const isExpanded = expandedRows.has(whenBooked);
    const visibleSpaces = isExpanded ? blocked : blocked.slice(0, maxVisible);
    const remainingCount = blocked.length - maxVisible;

    return (
      <div className="flex flex-wrap gap-1">
        {visibleSpaces.map(space => (
          <Badge key={space} variant="destructive" className="bg-red-500 text-white text-xs">
            {space}
          </Badge>
        ))}
        {!isExpanded && remainingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRowExpansion(whenBooked)}
            className="h-5 px-2 text-xs bg-red-100 text-red-700 hover:bg-red-200"
          >
            <Plus className="w-3 h-3 mr-1" />
            {remainingCount} more
          </Button>
        )}
        {isExpanded && blocked.length > maxVisible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleRowExpansion(whenBooked)}
            className="h-5 px-2 text-xs bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Show less
          </Button>
        )}
      </div>
    );
  };

  if (connections.length === 0) {
    return null;
  }

  const adjacencyMap = buildAdjacencyMap(connections);
  const tableRows = buildTableRows(adjacencyMap);

  return (
    <div className="space-y-4 max-w-[650px]">
      <h3 className="text-lg font-semibold text-slate-800">Space-Sharing Rules</h3>
      <p className="text-sm text-slate-600 mb-3">
        Go to <strong>Settings › Space Sharing</strong> and add these connections:
      </p>
      
      {/* Connection list - now shows only filtered (parent-to-child) connections */}
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

      {/* Enhanced explanation table */}
      {tableRows.length > 0 && (
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
                {tableRows.map((row) => (
                  <TableRow key={row.whenBooked} className="border-b border-slate-200">
                    <TableCell className="border-r border-slate-200">
                      <Badge variant="secondary" className="bg-gray-500 text-white">
                        {row.whenBooked}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {renderBlockedSpaces(row.blocked, row.whenBooked)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile stacked list */}
          <div className="sm:hidden space-y-3">
            {tableRows.map((row) => (
              <div key={row.whenBooked} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <div className="text-sm font-semibold text-slate-800 mb-2">WHEN BOOKED:</div>
                <div className="mb-3">
                  <Badge variant="secondary" className="bg-gray-500 text-white">
                    {row.whenBooked}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-slate-800 mb-2">WILL NOT BE BOOKABLE:</div>
                <div>
                  {renderBlockedSpaces(row.blocked, row.whenBooked)}
                </div>
              </div>
            ))}
          </div>

          {tableRows.length > 30 && (
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
