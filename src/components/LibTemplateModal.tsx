
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLibTemplate } from '@/hooks/useLibrary';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface LibTemplateModalProps {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LibTemplateModal({ templateId, isOpen, onClose }: LibTemplateModalProps) {
  const { data: template, isLoading, error } = useLibTemplate(templateId || '');

  if (!templateId) return null;

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('template-screenshots').getPublicUrl(path);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Template...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !template) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12 text-red-600">
            <p>Failed to load template</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{template.title}</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="space-y-4 pr-4">
            <p className="text-sm mb-4 whitespace-pre-line text-slate-700">
              {template.long_desc}
            </p>
            
            {template.image_paths && template.image_paths.length > 0 ? (
              template.image_paths.map((path, index) => (
                <img 
                  key={index} 
                  src={getPublicUrl(path)} 
                  alt={`${template.title} screenshot ${index + 1}`}
                  className="w-full rounded mb-4 border border-slate-200"
                />
              ))
            ) : (
              <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
                <p>Screenshots coming soon</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
