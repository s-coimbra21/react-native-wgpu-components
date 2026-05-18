'use client';

import { useState, type ReactNode } from 'react';

interface Props {
  /** The live component to render in the Preview tab. */
  preview: ReactNode;
  /** The exact source shown in the Code tab. Keep it copy-paste-ready. */
  code: string;
  /** Stack the preview against a darker backdrop instead of the page bg. */
  dark?: boolean;
  /** Optional minimum height for the preview pane. Default 220px. */
  minHeight?: number;
}

export function ComponentPreview({ preview, code, dark, minHeight = 220 }: Props) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API blocked — ignore. The code is visible in the Code tab,
      // so the user can still select+copy manually.
    }
  };

  return (
    <div className="not-prose my-6 overflow-hidden rounded-xl border border-fd-border bg-fd-card">
      <div className="flex items-center justify-between border-b border-fd-border px-3 py-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={
              'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
              (tab === 'preview'
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'text-fd-muted-foreground hover:text-fd-foreground')
            }
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab('code')}
            className={
              'rounded-md px-3 py-1 text-xs font-medium transition-colors ' +
              (tab === 'code'
                ? 'bg-fd-accent text-fd-accent-foreground'
                : 'text-fd-muted-foreground hover:text-fd-foreground')
            }
          >
            Code
          </button>
        </div>
        {tab === 'code' && (
          <button
            type="button"
            onClick={copy}
            className="rounded-md border border-fd-border bg-transparent px-2.5 py-1 text-xs text-fd-muted-foreground hover:text-fd-foreground"
            aria-label="Copy code"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {tab === 'preview' ? (
        <div
          className={
            'flex items-center justify-center p-8 ' +
            (dark ? 'bg-[#0b0b0f]' : 'bg-fd-secondary/30')
          }
          style={{ minHeight }}
        >
          {preview}
        </div>
      ) : (
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}
