import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Play, Pause, Trash2, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceMessageProps {
  onRecorded: (audioUrl: string, transcript: string) => void;
  maxDuration?: number;
  className?: string;
}

export function VoiceMessage({ onRecorded, maxDuration = 60, className }: VoiceMessageProps) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("preview");
        // Simulate auto-transcript
        setTranscript("(Đang nhận dạng giọng nói...)");
        setTimeout(() => {
          setTranscript("Nhà thầu Hòa Bình ký hợp đồng tháng 5, tăng khoảng 44 mét vuông mỗi tuần");
        }, 1500);
      };
      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setState("recording");
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      maxTimerRef.current = setTimeout(() => stopRecording(), maxDuration * 1000);
    } catch {
      toast.error("Cần quyền microphone", {
        description: "Vào Settings → cho phép microphone.",
      });
    }
  }, [maxDuration]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discard = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscript("");
    setDuration(0);
    setState("idle");
    setIsPlaying(false);
  }, [audioUrl]);

  const send = useCallback(() => {
    if (audioUrl) {
      onRecorded(audioUrl, transcript);
      setAudioUrl(null);
      setTranscript("");
      setDuration(0);
      setState("idle");
      setIsPlaying(false);
    }
  }, [audioUrl, transcript, onRecorded]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioUrl, isPlaying]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <audio ref={audioRef} className="hidden" />

      {state === "idle" && (
        <button
          type="button"
          onClick={startRecording}
          aria-label="Ghi âm tin nhắn"
          className="h-9 w-9 rounded-full border border-surface-3 bg-surface-0 text-text-3 hover:text-text-1 hover:bg-surface-1 flex items-center justify-center transition-colors shrink-0"
        >
          <Mic className="h-4 w-4" />
        </button>
      )}

      {state === "recording" && (
        <div className="flex items-center gap-2 rounded-full bg-danger/10 border border-danger/30 pl-3 pr-1.5 py-1">
          <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
          {/* Waveform bars */}
          <div className="flex items-center gap-[2px] h-5">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-danger/60"
                style={{
                  height: `${8 + Math.sin(Date.now() / 200 + i * 0.8) * 8}px`,
                  animation: `pulse ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-caption text-danger font-mono tabular-nums min-w-[32px]">
            {formatTime(duration)}
          </span>
          <button
            onClick={stopRecording}
            className="h-7 w-7 rounded-full bg-danger text-primary-foreground flex items-center justify-center hover:opacity-90"
          >
            <Square className="h-3 w-3" />
          </button>
        </div>
      )}

      {state === "preview" && audioUrl && (
        <div className="flex items-center gap-2 rounded-xl bg-surface-1 border border-surface-3 px-3 py-1.5">
          <button onClick={togglePlay} className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
          </button>
          {/* Waveform static */}
          <div className="flex items-center gap-[2px] h-5 w-20">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-[2px] rounded-full bg-primary/40"
                style={{ height: `${4 + Math.sin(i * 0.7) * 10 + Math.random() * 4}px` }}
              />
            ))}
          </div>
          <span className="text-caption text-text-3 font-mono tabular-nums">{formatTime(duration)}</span>
          <button onClick={discard} className="h-5 w-5 text-text-3 hover:text-danger" title="Xóa ghi lại">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={send} className="rounded-full bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-medium">
            Gửi
          </button>
        </div>
      )}
    </div>
  );
}

/* Inline audio player for thread messages */
interface AudioPlayerInlineProps {
  audioUrl: string;
  duration: string;
  transcript: string;
  onEditTranscript?: (text: string) => void;
}

export function AudioPlayerInline({ audioUrl, duration, transcript, onEditTranscript }: AudioPlayerInlineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editText, setEditText] = useState(transcript);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  return (
    <div className="mt-2 space-y-1.5">
      <audio ref={audioRef} className="hidden" />
      <div className="flex items-center gap-2 rounded-lg bg-surface-0 border border-surface-3 px-2.5 py-1.5">
        <button onClick={togglePlay} className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
          {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
        </button>
        <div className="flex items-center gap-[2px] h-4 flex-1 max-w-[140px]">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={cn("w-[2px] rounded-full", isPlaying ? "bg-primary animate-pulse" : "bg-primary/40")}
              style={{ height: `${3 + Math.sin(i * 0.6) * 7 + Math.random() * 3}px` }}
            />
          ))}
        </div>
        <span className="text-[10px] text-text-3 font-mono">{duration}</span>
      </div>
      {transcript && (
        <div
          className="text-[11px] text-text-3 italic leading-relaxed cursor-pointer hover:text-text-2"
          onClick={() => { if (onEditTranscript) setIsEditingTranscript(true); }}
          title="Click để sửa transcript"
        >
          {isEditingTranscript ? (
            <input
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => { setIsEditingTranscript(false); onEditTranscript?.(editText); }}
              onKeyDown={(e) => { if (e.key === "Enter") { setIsEditingTranscript(false); onEditTranscript?.(editText); } }}
              className="w-full bg-surface-0 border border-surface-3 rounded px-2 py-0.5 text-[11px] text-text-1"
            />
          ) : (
            <>"{transcript}"</>
          )}
        </div>
      )}
    </div>
  );
}
