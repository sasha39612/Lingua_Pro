'use client';

import { useEffect, useMemo, useState } from 'react';

interface StreamedFeedbackProps {
  text: string;
  language: string;
}

export function StreamedFeedback({ text, language }: StreamedFeedbackProps) {
  const [visible, setVisible] = useState('');

  const chunks = useMemo(() => text.match(/.{1,6}/g) ?? [], [text]);

  useEffect(() => {
    if (!text) {
      setVisible('');
      return;
    }

    setVisible('');

    const controller = new AbortController();

    async function run() {
      try {
        const resp = await fetch(
          `/api/ai-feedback?text=${encodeURIComponent(text)}&language=${encodeURIComponent(language)}`,
          { signal: controller.signal },
        );

        if (!resp.ok || !resp.body) {
          let idx = 0;
          const timer = window.setInterval(() => {
            idx += 1;
            setVisible(chunks.slice(0, idx).join(''));
            if (idx >= chunks.length) {
              window.clearInterval(timer);
            }
          }, 45);
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const item = await reader.read();
          done = item.done;
          if (item.value) {
            setVisible((prev) => prev + decoder.decode(item.value, { stream: !done }));
          }
        }
      } catch {
        setVisible(text);
      }
    }

    void run();

    return () => controller.abort();
  }, [chunks, language, text]);

  return (
    <p className="rounded-xl border border-teal-200 bg-teal-50/80 p-3 text-sm leading-relaxed text-teal-900">
      {visible}
      {visible.length < text.length ? <span className="animate-pulse">|</span> : null}
    </p>
  );
}
