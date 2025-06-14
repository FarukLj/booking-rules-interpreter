
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RuleResult } from '@/types/RuleResult';
import { spaceToName } from '@/utils/spaceHelpers';

interface Space {
  id: string;
  name: string;
}

export function useSpaceOptions(ruleResult?: RuleResult) {
  // Fetch spaces from database
  const { data: dbSpaces = [], isLoading } = useQuery({
    queryKey: ['spaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching spaces:', error);
        return [];
      }
      
      return data as Space[];
    }
  });

  // Extract unique space names from all rule types in the result
  const extractedSpaceNames = new Set<string>();
  
  if (ruleResult) {
    // Buffer time rules - handle both 'space' and 'spaces' field names
    ruleResult.buffer_time_rules?.forEach(rule => {
      const spaces = rule.spaces || (rule as any).space || [];
      if (Array.isArray(spaces)) {
        spaces.forEach(space => {
          const spaceName = spaceToName(space);
          if (spaceName) extractedSpaceNames.add(spaceName);
        });
      } else if (spaces) {
        const spaceName = spaceToName(spaces);
        if (spaceName) extractedSpaceNames.add(spaceName);
      }
    });

    // Other rule types
    ruleResult.booking_conditions?.forEach(rule => {
      rule.space?.forEach(space => extractedSpaceNames.add(space));
    });
    
    ruleResult.pricing_rules?.forEach(rule => {
      rule.space?.forEach(space => extractedSpaceNames.add(space));
    });
    
    ruleResult.quota_rules?.forEach(rule => {
      rule.affected_spaces?.forEach(space => extractedSpaceNames.add(space));
    });
    
    ruleResult.booking_window_rules?.forEach(rule => {
      rule.spaces?.forEach(space => extractedSpaceNames.add(space));
    });
  }

  // Create comprehensive space options list - UI only needs the label, keep simple
  const spaceOptions = Array.from(new Set([
    ...dbSpaces.map(space => space.name),
    ...Array.from(extractedSpaceNames)
  ])).sort();

  return {
    spaceOptions,
    dbSpaces,
    isLoading,
    extractedSpaceNames: Array.from(extractedSpaceNames)
  };
}
