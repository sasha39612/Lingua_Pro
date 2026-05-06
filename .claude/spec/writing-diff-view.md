# Spec: Inline Writing Diff View

## Problem

The writing feedback result screen shows two separate plain-text blocks — "Corrected version" (toggle-hidden) and "Your original text" — forcing the user to mentally diff them. For C2-level texts (400+ words) this is unacceptable UX.

## Goal

Replace both blocks with a single text block showing the user's original text with inline corrections: deletions as red strikethrough, additions as amber underline, toggled on/off. The `correctedText` string is already in the `analysis_complete` SSE payload — this is a pure frontend change, no backend modifications required.

---

## Scope

**In scope:**
- Inline word-level diff rendering (one text, not two)
- Toggle: "Show corrections" / "Hide corrections" (defaults ON when results arrive)
- Color legend (removed / added swatches)
- Accessible markup (aria-label on diff spans)
- All 5 locale translations (en, de, uk, pl, sq)

**Out of scope (future phases):**
- Structured mistake categories (grammar, vocabulary, tense, etc.)
- Tooltips with explanations per correction
- Grammar topic links
- Monthly test generation based on weak points

---

## Implementation

### Step 1 — Install `diff` package

```bash
cd frontend && pnpm add diff && pnpm add -D @types/diff
```

### Step 2 — Modify `frontend/src/components/writing-page.tsx`

#### 2a — Add import (after line 7)
```ts
import { diffWords } from 'diff';
```

#### 2b — Add `DiffToken` type + `buildWordDiff()` helper (after `scoreLabel`, ~line 45)

```ts
type DiffToken =
  | { type: 'unchanged'; value: string }
  | { type: 'removed'; value: string }
  | { type: 'added'; value: string }
  | { type: 'replace'; from: string; to: string };

function buildWordDiff(original: string, corrected: string): DiffToken[] {
  const raw = diffWords(original, corrected);
  const tokens: DiffToken[] = [];
  for (let i = 0; i < raw.length; i++) {
    const curr = raw[i];
    const next = raw[i + 1];
    if (curr.removed && next?.added) {
      tokens.push({ type: 'replace', from: curr.value, to: next.value });
      i++;
    } else if (curr.removed) {
      tokens.push({ type: 'removed', value: curr.value });
    } else if (curr.added) {
      tokens.push({ type: 'added', value: curr.value });
    } else {
      tokens.push({ type: 'unchanged', value: curr.value });
    }
  }
  return tokens;
}
```

Consecutive `removed`+`added` pairs are merged into a `replace` token so they render as visually adjacent spans (no orphaned whitespace between the old and new word).

#### 2c — Add `DiffView` sub-component (after `CriterionCardSkeleton`, ~line 82)

```tsx
function DiffView({ original, corrected }: { original: string; corrected: string }) {
  const t = useTranslations('writing');
  const lineTokens = useMemo(() => {
    const origLines = original.split('\n');
    const corrLines = corrected.split('\n');
    const count = Math.max(origLines.length, corrLines.length);
    return Array.from({ length: count }, (_, i) =>
      buildWordDiff(origLines[i] ?? '', corrLines[i] ?? '')
    );
  }, [original, corrected]);

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800"
      aria-label={t('diffViewAriaLabel')}
    >
      {lineTokens.map((tokens, li) => (
        <span key={li}>
          {tokens.map((token, ti) => {
            if (token.type === 'unchanged') return <span key={ti}>{token.value}</span>;
            if (token.type === 'removed') return (
              <span key={ti} className="line-through opacity-60 text-red-600 bg-red-50 rounded px-0.5">
                {token.value}
              </span>
            );
            if (token.type === 'added') return (
              <span key={ti} className="underline decoration-amber-400 decoration-2 text-amber-700 bg-amber-50 rounded px-0.5">
                {token.value}
              </span>
            );
            return (
              <span key={ti}>
                <span className="line-through opacity-60 text-red-600 bg-red-50 rounded-l px-0.5">{token.from}</span>
                <span className="underline decoration-amber-400 decoration-2 text-amber-700 bg-amber-50 rounded-r px-0.5">{token.to}</span>
              </span>
            );
          })}
          {li < lineTokens.length - 1 && <br />}
        </span>
      ))}
    </div>
  );
}
```

Notes:
- `useMemo([original, corrected])` — both values are stable strings; diff runs once
- Newlines handled explicitly via `split('\n')` + `<br/>` (not `whitespace-pre-wrap`, which would double-space)
- `replace` uses `rounded-l` / `rounded-r` so the two adjacent spans visually merge into one token
- `text-amber-700` on `bg-amber-50` passes WCAG AA contrast (amber-600 does not)

#### 2d — Auto-enable toggle on `analysis_complete`

In the `onEvent` callback (~line 161), add one line:
```ts
} else if (ev.event === 'analysis_complete') {
  setStreamedComplete(ev.data);
  setShowCorrected(true);   // ← ADD
  ...
}
```

#### 2e — Replace result sections (remove lines 455–505, insert one combined section)

Remove both the "Corrected version" section (lines 455–474) and the "Your original text" section (lines 477–505). Replace with:

```tsx
{/* ── Your text (inline diff) ──────────────────────────────────── */}
<section className="rounded-2xl bg-white p-5 shadow-float">
  <div className="flex items-center justify-between">
    <h2 className="text-base font-semibold text-slate-800">{t('yourText')}</h2>
    {streamedComplete && (
      <button
        type="button"
        onClick={() => setShowCorrected((v) => !v)}
        className="text-sm text-slate-400 hover:text-slate-600"
      >
        {showCorrected ? t('hideCorrections') : t('showCorrections')}
      </button>
    )}
  </div>

  <div className="mt-3">
    {streamedComplete && showCorrected ? (
      <DiffView original={text} corrected={streamedComplete.correctedText} />
    ) : (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {text}
      </div>
    )}
  </div>

  {streamedComplete && showCorrected && (
    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-red-50 border border-red-200" />
        <span className="line-through text-red-600">{t('legendRemoved')}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-amber-50 border border-amber-200" />
        <span className="underline decoration-amber-400 decoration-2 text-amber-700">{t('legendAdded')}</span>
      </span>
    </div>
  )}

  <div className="mt-3 flex gap-3">
    <button
      type="button"
      onClick={() => {
        writingStream.cancel();
        setPhase('editor');
        setStreamedCriteria({});
        setStreamedComplete(null);
        setShowCorrected(false);
        setError(null);
      }}
      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
    >
      {t('editResubmit')}
    </button>
    <button
      type="button"
      onClick={fetchTask}
      disabled={loadingTask}
      className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
    >
      {t('tryAnotherTask')}
    </button>
  </div>
</section>
```

---

### Step 3 — Update i18n messages

**Files:** `frontend/messages/en.json`, `de.json`, `uk.json`, `pl.json`, `sq.json`

**Remove from `"writing"` object:**
- `correctedVersion`
- `showCorrected`
- `hideCorrected`
- `yourOriginalText`

**Add to `"writing"` object:**

| Key | en | de | uk | pl | sq |
|-----|----|----|----|----|-----|
| `yourText` | "Your text" | "Ihr Text" | "Ваш текст" | "Twój tekst" | "Teksti juaj" |
| `showCorrections` | "Show corrections ▾" | "Korrekturen anzeigen ▾" | "Показати виправлення ▾" | "Pokaż korekty ▾" | "Trego korrigjimet ▾" |
| `hideCorrections` | "Hide corrections ▴" | "Korrekturen ausblenden ▴" | "Приховати виправлення ▴" | "Ukryj korekty ▴" | "Fshih korrigjimet ▴" |
| `legendRemoved` | "removed" | "entfernt" | "видалено" | "usunięto" | "hequr" |
| `legendAdded` | "added" | "hinzugefügt" | "додано" | "dodano" | "shtuar" |
| `diffViewAriaLabel` | "Your text with inline corrections highlighted" | "Ihr Text mit hervorgehobenen Korrekturen" | "Ваш текст із виділеними виправленнями" | "Twój tekst z podświetlonymi korektami" | "Teksti juaj me korrigjimet e theksuara" |
| `diffRemovedAriaLabel` | "Removed: {text}" | "Entfernt: {text}" | "Видалено: {text}" | "Usunięto: {text}" | "Hequr: {text}" |
| `diffAddedAriaLabel` | "Added: {text}" | "Hinzugefügt: {text}" | "Додано: {text}" | "Dodano: {text}" | "Shtuar: {text}" |

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Add `diff` + `@types/diff` |
| `frontend/src/components/writing-page.tsx` | Add import, types, helper, DiffView component, replace two sections with one |
| `frontend/messages/en.json` | Remove 4 keys, add 8 keys |
| `frontend/messages/de.json` | Same |
| `frontend/messages/uk.json` | Same |
| `frontend/messages/pl.json` | Same |
| `frontend/messages/sq.json` | Same |

---

## Verification

1. `cd frontend && pnpm typecheck` — no new errors
2. `pnpm dev` → Writing page → generate task → submit text
3. After SSE completes: single "Your text" section, diff ON by default
4. Toggle OFF → plain original text, no highlights
5. Color legend visible only when diff is ON
6. "Edit & Resubmit" → editor → re-submit → fresh diff shown
7. Switch locale in Settings → no missing translation key warnings in console
