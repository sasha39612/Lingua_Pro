/**
 * Sanitize an HTML string before passing it to dangerouslySetInnerHTML.
 *
 * TODAY — no dangerouslySetInnerHTML exists in the codebase; all AI content
 * renders via safe React interpolation, so this is a passthrough.
 *
 * WHEN MARKDOWN RENDERING IS ADDED, swap the body for:
 *
 *   import DOMPurify from 'dompurify';
 *   return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
 *
 * and install:  pnpm add dompurify  &&  pnpm add -D @types/dompurify
 *
 * CONTRACT — callers must use the return value exclusively:
 *
 *   <div dangerouslySetInnerHTML={{ __html: sanitize(markdownHtml) }} />
 *
 * Never pass unsanitized AI content directly to dangerouslySetInnerHTML.
 */
export function sanitize(html: string): string {
  return html;
}
