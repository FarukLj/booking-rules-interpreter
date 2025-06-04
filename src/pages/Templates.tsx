
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { RuleResult } from "@/types/RuleResult";
import { SetupGuideModal } from "@/components/SetupGuideModal";
import { RuleModal } from "@/components/RuleModal";

interface Template {
  id: string;
  title: string;
  description: string | null;
  tags: string[] | null;
  rules_json: any;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

const Templates = () => {
  const { categoryId } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId) return;

      try {
        // Fetch category info
        const { data: categoryData, error: categoryError } = await supabase
          .from('template_categories')
          .select('*')
          .eq('id', categoryId)
          .single();

        if (categoryError) throw categoryError;
        setCategory(categoryData);

        // Fetch templates for this category
        const { data: templatesData, error: templatesError } = await supabase
          .from('templates')
          .select('*')
          .eq('category_id', categoryId)
          .order('created_at', { ascending: false });

        if (templatesError) throw templatesError;
        setTemplates(templatesData || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId]);

  const openTemplate = (template: Template) => {
    const ruleResult: RuleResult = {
      ...template.rules_json,
      // Ensure we have the expected structure
      setup_guide: template.rules_json.setup_guide || [],
    };
    setSelectedTemplate(ruleResult);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Category not found</p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const hasSetupGuide = selectedTemplate?.setup_guide && selectedTemplate.setup_guide.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800">{category.name}</h1>
              <p className="text-slate-500 mt-1">
                Browse pre-built rule templates for {category.name.toLowerCase()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {templates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 text-lg">No templates available yet.</p>
            <p className="text-slate-500 text-sm mt-2">Check back later for new templates!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-lg border bg-white p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-800 mb-2">
                    {template.title}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {template.description}
                  </p>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => openTemplate(template)}
                  className="w-full"
                >
                  Open template
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal for template */}
      {showModal && selectedTemplate && hasSetupGuide && (
        <SetupGuideModal 
          result={selectedTemplate} 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
      
      {showModal && selectedTemplate && !hasSetupGuide && (
        <RuleModal 
          result={selectedTemplate} 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
};

export default Templates;
