'use client';

import { useMemo, useRef, useState } from 'react';

interface AudioRecorderProps {
  onRecordingComplete?: (blob: Blob) => void;
  onSendToReview?: () => void;
  disabled?: boolean;
}

export function AudioRecorder({ onRecordingComplete, onSendToReview, disabled }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioUrl = useMemo(() => {
    if (!audioBlob) return null;
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  const startRecording = async () => {
    setError(null);
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
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        onRecordingComplete?.(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    chunksRef.current = [];
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
          disabled={!audioBlob || disabled}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send to review
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
