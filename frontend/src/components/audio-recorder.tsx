'use client';

import { useMemo, useRef, useState } from 'react';

export function AudioRecorder() {
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
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
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
          disabled={isRecording}
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
          <p className="mt-2 text-xs text-slate-500">
            Local playback is ready. Upload endpoint wiring can be added to send this blob to backend storage.
          </p>
        </div>
      ) : null}
    </div>
  );
}
