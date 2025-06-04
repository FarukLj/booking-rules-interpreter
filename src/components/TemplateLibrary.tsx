
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export function TemplateLibrary() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('template_categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getIconForCategory = (iconName: string | null) => {
    // For now, return a simple emoji since we don't have lucide icons set up
    const iconMap: Record<string, string> = {
      'target': '🎯',
      'dumbbell': '🏋️',
      'music': '🎵',
      'briefcase': '💼',
      'feather': '🎨'
    };
    return iconMap[iconName || ''] || '📋';
  };

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Template Library</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-slate-200 h-48 w-full rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Template Library</h2>
        <p className="text-slate-600 text-sm">Browse pre-built rule sets by venue type</p>
      </div>
      
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-600">No template categories available yet.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="group cursor-pointer bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              onClick={() => navigate(`/templates/${category.id}`)}
            >
              <div className="p-6 flex flex-col items-center text-center h-48 justify-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
                  {getIconForCategory(category.icon)}
                </div>
                <h3 className="font-semibold text-lg text-slate-800 mb-2">
                  {category.name}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors"
                >
                  Browse templates
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
