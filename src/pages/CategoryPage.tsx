
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { LibTemplateGrid } from '@/components/LibTemplateGrid';
import { LibTemplateModal } from '@/components/LibTemplateModal';
import { useLibCategories } from '@/hooks/useLibrary';

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const { data: categories } = useLibCategories();
  const category = categories?.find(cat => cat.id === categoryId);

  const handleBack = () => {
    navigate('/');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleModalClose = () => {
    setSelectedTemplateId(null);
  };

  if (!categoryId || !category) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="outline" onClick={handleBack} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Button>
          <div className="text-center py-12 text-slate-500">
            <p>Category not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{category.name} Templates</h1>
            <p className="text-slate-600 mt-1">Browse booking rule templates for {category.name.toLowerCase()}</p>
          </div>
        </div>

        <LibTemplateGrid
          categoryId={categoryId}
          categoryName={category.name}
          onBack={handleBack}
          onTemplateSelect={handleTemplateSelect}
        />

        <LibTemplateModal
          templateId={selectedTemplateId}
          isOpen={!!selectedTemplateId}
          onClose={handleModalClose}
        />
      </div>
    </div>
  );
}
