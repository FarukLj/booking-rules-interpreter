
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLibTemplatesByCategory } from '@/hooks/useLibrary';
import { Loader2, ArrowLeft, FileText } from 'lucide-react';

interface LibTemplateGridProps {
  categoryId: string;
  categoryName: string;
  onBack: () => void;
  onTemplateSelect: (templateId: string) => void;
}

export function LibTemplateGrid({ categoryId, categoryName, onBack, onTemplateSelect }: LibTemplateGridProps) {
  const { data: templates, isLoading, error } = useLibTemplatesByCategory(categoryId);

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Button>
          <h2 className="text-2xl font-semibold text-slate-800">{categoryName} Templates</h2>
        </div>
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Button>
          <h2 className="text-2xl font-semibold text-slate-800">{categoryName} Templates</h2>
        </div>
        <div className="text-center py-12 text-red-600">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Failed to load templates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Categories
        </Button>
        <h2 className="text-2xl font-semibold text-slate-800">{categoryName} Templates</h2>
      </div>

      {!templates?.length ? (
        <div className="text-center py-12 text-slate-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No templates available in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.short_desc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full" 
                  onClick={() => onTemplateSelect(template.id)}
                >
                  View Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
