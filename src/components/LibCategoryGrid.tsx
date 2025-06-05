
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLibCategories } from '@/hooks/useLibrary';
import { Loader2, Database } from 'lucide-react';

interface LibCategoryGridProps {
  onCategorySelect: (categoryId: string, categoryName: string) => void;
}

export function LibCategoryGrid({ onCategorySelect }: LibCategoryGridProps) {
  const { data: categories, isLoading, error } = useLibCategories();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-600">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Failed to load categories</p>
      </div>
    );
  }

  if (!categories?.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No categories available</p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold text-slate-800 mb-6">Template Library</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-300"
            onClick={() => onCategorySelect(category.id, category.name)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {category.name.charAt(0)}
                  </span>
                </div>
                <span className="text-lg">{category.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Browse booking rule templates for {category.name.toLowerCase()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
