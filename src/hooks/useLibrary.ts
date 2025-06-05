
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useLibCategories() {
  return useQuery({
    queryKey: ['lib-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lib_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}

export function useLibTemplatesByCategory(categoryId: string) {
  return useQuery({
    queryKey: ['lib-templates', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lib_templates')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId
  });
}

export function useLibTemplate(templateId: string) {
  return useQuery({
    queryKey: ['lib-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lib_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!templateId
  });
}
