
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTemplate } from '@/hooks/useTemplates';
import { normalizeTemplate } from '@/utils/templateNormalizer';
import { Loader2 } from 'lucide-react';
import { SetupGuideModal } from './SetupGuideModal';

interface TemplateModalProps {
  templateId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateModal({ templateId, isOpen, onClose }: TemplateModalProps) {
  const { data: template, isLoading, error } = useTemplate(templateId || '');

  if (!templateId) return null;

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

  const normalizedResult = normalizeTemplate(template.rules_json);

  // Use the existing SetupGuideModal with library mode
  return (
    <SetupGuideModal
      result={normalizedResult}
      isOpen={isOpen}
      onClose={onClose}
      mode="library"
      templateTitle={template.title}
    />
  );
}
