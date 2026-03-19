'use client';

import { useMemo, useRef, useState, useEffect } from 'react';

const MAX_RECORDING_SECONDS = 60;

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  onSendToReview?: () => void;
  disabled?: boolean;
  isAnalyzing?: boolean;
}

export function AudioRecorder({ onRecordingComplete, onSendToReview, disabled, isAnalyzing }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  // Clean up timers when component unmounts or recording stops
  const clearTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const startRecording = async () => {
    setError(null);
    setElapsed(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearTimers();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        onRecordingComplete?.(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Tick every second
      timerRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);

      // Auto-stop at 1 minute
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_RECORDING_SECONDS * 1000);
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      // onstop handler will call clearTimers + setIsRecording(false)
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setElapsed(0);
    chunksRef.current = [];
  };

  const remaining = MAX_RECORDING_SECONDS - elapsed;
  const progressPct = (elapsed / MAX_RECORDING_SECONDS) * 100;
  const isNearLimit = remaining <= 10;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-float">
      <h3 className="text-lg font-semibold">Audio Recording</h3>
      <p className="mt-2 text-sm text-slate-600">
        Record your speaking response and replay it before submitting to the audio workflow.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={isRecording || disabled}
          className="rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Start Recording
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!isRecording}
          className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      {isRecording && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Recording
            </span>
            <span className={isNearLimit ? 'font-bold text-red-500' : 'text-slate-500'}>
              {formatTime(elapsed)} / {formatTime(MAX_RECORDING_SECONDS)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isNearLimit ? 'bg-red-500' : 'bg-teal-600'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {isNearLimit && (
            <p className="mt-1 text-xs text-red-500">
              {remaining}s remaining — recording will stop automatically.
            </p>
          )}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {audioUrl ? (
        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <audio controls src={audioUrl} className="w-full" />
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onSendToReview}
          disabled={!audioBlob || disabled || isAnalyzing}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {isAnalyzing ? 'Analyzing…' : 'Send to review'}
        </button>
        <button
          type="button"
          onClick={deleteRecording}
          disabled={!audioBlob}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-40"
        >
          Delete Recording
        </button>
      </div>
    </div>
  );
}
