
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface VoiceInputButtonProps {
  state: 'idle' | 'listening' | 'processing' | 'error';
  isSupported: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  className?: string;
}

export function VoiceInputButton({ 
  state, 
  isSupported, 
  onStartListening, 
  onStopListening,
  className 
}: VoiceInputButtonProps) {
  if (!isSupported) {
    return null;
  }

  const handleClick = () => {
    if (state === 'listening') {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case 'listening':
        return (
          <>
            <Mic className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="sr-only">Stop listening</span>
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="sr-only">Processing speech</span>
          </>
        );
      case 'error':
        return (
          <>
            <MicOff className="w-4 h-4 text-red-500" />
            <span className="sr-only">Retry voice input</span>
          </>
        );
      default:
        return (
          <>
            <Mic className="w-4 h-4" />
            <span className="sr-only">Start voice input</span>
          </>
        );
    }
  };

  const getTooltipText = () => {
    switch (state) {
      case 'listening':
        return 'Listening... Click to stop';
      case 'processing':
        return 'Transcribing...';
      case 'error':
        return 'Click to retry voice input';
      default:
        return 'Click to speak your rule';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={state === 'processing'}
            className={`h-9 w-9 hover:bg-blue-50 ${className}`}
            aria-label={getTooltipText()}
          >
            {getButtonContent()}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
