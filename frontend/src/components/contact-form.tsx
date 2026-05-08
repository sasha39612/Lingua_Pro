'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

const schema = z.object({
  message: z.string().min(10).max(2000),
  mathAnswer: z.string().min(1),
  website: z.string().max(0),
});

type FormValues = z.infer<typeof schema>;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

// Secondary check: extension fallback for browsers (Safari/iOS) that send
// application/octet-stream or empty type — matches server behaviour
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx',
]);

function isAllowedFileClient(file: File): boolean {
  if (ALLOWED_MIME_TYPES.has(file.type)) return true;
  if (file.type === '' || file.type === 'application/octet-stream') {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    return ALLOWED_EXTENSIONS.has(ext);
  }
  return false;
}

function fileKey(f: File): string {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

export function ContactForm() {
  const t = useTranslations('contact');
  const [isPending, setIsPending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const { a, b } = useMemo(() => {
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    return { a, b };
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: '', mathAnswer: '', website: '' },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const selected = Array.from(e.target.files ?? []);
    const existingKeys = new Set(files.map(fileKey));
    const deduplicated = selected.filter(f => !existingKeys.has(fileKey(f)));
    const combined = [...files, ...deduplicated];

    if (combined.length > 3) { setFileError(t('fileTooMany')); e.target.value = ''; return; }
    const invalid = deduplicated.find(f => !isAllowedFileClient(f));
    if (invalid) { setFileError(t('fileTypeError', { name: invalid.name })); e.target.value = ''; return; }
    const oversized = deduplicated.find(f => f.size > 5 * 1024 * 1024);
    if (oversized) { setFileError(t('fileSizeError', { name: oversized.name })); e.target.value = ''; return; }
    if (combined.reduce((s, f) => s + f.size, 0) > 10 * 1024 * 1024) {
      setFileError(t('fileTotalSizeError')); e.target.value = ''; return;
    }
    setFiles(combined);
    e.target.value = ''; // reset so the same picker interaction can be reused
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  const onSubmit = async (values: FormValues) => {
    if (values.mathAnswer.trim() !== String(a + b)) {
      form.setError('mathAnswer', { message: t('mathError') });
      return;
    }

    setIsPending(true);
    try {
      const fd = new FormData();
      fd.append('message', values.message);
      fd.append('honeypot', values.website);
      for (const file of files) fd.append('files', file, file.name);

      // No Content-Type header — browser sets multipart/form-data + boundary automatically
      const res = await fetch('/api/contact', { method: 'POST', body: fd });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      setStatus('success');
      form.reset();
      setFiles([]);
    } catch {
      setStatus('error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section
      aria-labelledby="contact-form-heading"
      className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-float"
    >
      <h1 id="contact-form-heading" className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('subtitle')}</p>

      {/* Persistent live region — must be in DOM before content is injected */}
      <div role="status" aria-live="polite" aria-atomic="true" className="mt-4 min-h-0">
        {status === 'success' && (
          <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
            {t('successMessage')}
          </p>
        )}
        {status === 'error' && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {t('errorMessage')}
          </p>
        )}
      </div>

      <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {/* Honeypot — hidden from humans, filled by bots */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute opacity-0 -z-10 h-0 w-0 pointer-events-none"
          {...form.register('website')}
        />

        <div>
          <label htmlFor="contact-message" className="block text-sm font-medium text-slate-700">
            {t('messageLabel')}
          </label>
          <textarea
            id="contact-message"
            placeholder={t('messagePlaceholder')}
            rows={6}
            aria-invalid={!!form.formState.errors.message}
            aria-describedby={form.formState.errors.message ? 'contact-message-error' : undefined}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            {...form.register('message')}
          />
          {form.formState.errors.message && (
            <p id="contact-message-error" className="mt-1 text-xs text-red-600">
              {form.formState.errors.message.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-files" className="block text-sm font-medium text-slate-700">
            {t('fileLabel')}
          </label>
          <p id="contact-files-hint" className="mt-0.5 text-xs text-slate-500">
            {t('fileHint')}
          </p>
          <input
            id="contact-files"
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            aria-describedby={fileError ? 'contact-files-error' : 'contact-files-hint'}
            aria-invalid={!!fileError}
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
          />
          {/* aria-live so screen readers announce validation changes without focus movement */}
          <div aria-live="polite" aria-atomic="true">
            {fileError && (
              <p id="contact-files-error" role="alert" className="mt-1 text-xs text-red-600">
                {fileError}
              </p>
            )}
          </div>
          {files.length > 0 && (
            <ul aria-label={t('selectedFilesLabel')} className="mt-2 space-y-1">
              {files.map((file, i) => (
                <li key={`${fileKey(file)}-${i}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    aria-label={t('removeFileAriaLabel', { name: file.name })}
                    onClick={() => removeFile(i)}
                    className="ml-2 text-slate-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="contact-math" className="block text-sm font-medium text-slate-700">
            {t('mathLabel', { a, b })}
          </label>
          <input
            id="contact-math"
            type="text"
            inputMode="numeric"
            placeholder={t('mathPlaceholder')}
            aria-invalid={!!form.formState.errors.mathAnswer}
            aria-describedby={form.formState.errors.mathAnswer ? 'contact-math-error' : undefined}
            className="mt-1 w-32 rounded-xl border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            {...form.register('mathAnswer')}
          />
          {form.formState.errors.mathAnswer && (
            <p id="contact-math-error" className="mt-1 text-xs text-red-600">
              {form.formState.errors.mathAnswer.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-teal-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {isPending ? t('submittingButton') : t('submitButton')}
        </button>
      </form>
    </section>
  );
}
