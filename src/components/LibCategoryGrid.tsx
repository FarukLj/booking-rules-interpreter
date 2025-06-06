
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLibCategories } from '@/hooks/useLibrary';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Database } from 'lucide-react';

export function LibCategoryGrid() {
  const { data: categories, isLoading, error } = useLibCategories();
  const navigate = useNavigate();

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from('template-screenshots').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleCategoryClick = (categoryId: string) => {
    navigate(`/templates/category/${categoryId}`);
  };

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
        {categories.map((category) => {
          const imageUrl = category.image_path ? getPublicUrl(category.image_path) : null;
          
          return (
            <Card 
              key={category.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:border-blue-300 overflow-hidden"
              onClick={() => handleCategoryClick(category.id)}
            >
              {imageUrl ? (
                <div className="w-full h-48 overflow-hidden">
                  <img 
                    src={imageUrl}
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to gradient background if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                            <div class="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                              <span class="text-white font-bold text-xl">
                                ${category.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">
                      {category.name.charAt(0)}
                    </span>
                  </div>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{category.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Browse booking rule templates for {category.name.toLowerCase()}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
