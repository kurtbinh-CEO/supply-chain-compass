import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  language?: string;
  maxDuration?: number;
  className?: string;
  size?: "sm" | "md";
}

const SpeechRecognitionAPI =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function VoiceInput({
  onTranscript,
  language = "vi-VN",
  maxDuration = 30,
  className,
  size = "sm",
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const silenceRef = useRef<NodeJS.Timeout | null>(null);

  // Don't render if not supported
  if (!SpeechRecognitionAPI) return null;

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (silenceRef.current) clearTimeout(silenceRef.current);
    setIsListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        // Reset silence timer on any result
        if (silenceRef.current) clearTimeout(silenceRef.current);
        silenceRef.current = setTimeout(() => stop(), 2000);

        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
          setInterim("");
        } else {
          setInterim(interimTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed") {
          toast.error("Cần quyền microphone", {
            description: "Vào Settings → cho phép microphone.",
          });
        }
        stop();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterim("");
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);

      // Max duration
      timeoutRef.current = setTimeout(() => stop(), maxDuration * 1000);
      // Silence auto-stop
      silenceRef.current = setTimeout(() => stop(), 2000);
    } catch {
      toast.error("Không thể khởi tạo nhận dạng giọng nói.");
    }
  }, [language, maxDuration, onTranscript, stop]);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const sizeClasses = size === "sm"
    ? "h-7 w-7 sm:h-7 sm:w-7"
    : "h-9 w-9 sm:h-9 sm:w-9";

  return (
    <div className={cn("relative inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Nhập bằng giọng nói"
        className={cn(
          "rounded-full flex items-center justify-center transition-all shrink-0",
          sizeClasses,
          isListening
            ? "bg-danger text-primary-foreground animate-pulse shadow-lg shadow-danger/30"
            : "border border-surface-3 bg-surface-0 text-text-3 hover:text-text-1 hover:bg-surface-1"
        )}
      >
        {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      </button>
      {isListening && (
        <span className="text-[10px] text-danger font-medium animate-pulse whitespace-nowrap">
          Đang nghe...
        </span>
      )}
      {interim && (
        <span className="text-[10px] text-text-3 italic truncate max-w-[120px]">{interim}</span>
      )}
    </div>
  );
}
