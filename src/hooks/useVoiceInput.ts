
import { useState, useEffect, useRef, useCallback } from 'react';

// Define the speech recognition interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

interface UseVoiceInputReturn {
  isSupported: boolean;
  state: VoiceState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscription: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const resetTranscription = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setState('idle');
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setState('error');
      return;
    }

    resetTranscription();
    setState('listening');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setState('listening');
      setError(null);
      
      // Auto-stop after 10 seconds if no speech detected
      timeoutRef.current = setTimeout(() => {
        recognition.stop();
        setError("Didn't catch that — try again.");
        setState('error');
      }, 10000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimText = '';

      for (let i = event.results.length - 1; i >= 0; i--) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript = result[0].transcript;
        } else {
          interimText = result[0].transcript;
        }
      }

      setInterimTranscript(interimText);
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
        setInterimTranscript('');
        setState('processing');
        
        // Clear timeout since we got results
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Brief processing state before going idle
        setTimeout(() => {
          setState('idle');
        }, 500);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = 'Speech recognition failed. Please try again.';
      
      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'no-speech':
          errorMessage = "Didn't catch that — try again.";
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your audio settings.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your connection.';
          break;
      }
      
      setError(errorMessage);
      setState('error');
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      if (state === 'listening') {
        setState('idle');
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, resetTranscription, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSupported,
    state,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscription
  };
}
