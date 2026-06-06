'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report';

const FLAG = 'wedinvite.debug';
let loaded = false;
let reporting = false;

interface EarlyError {
  type: string;
  message: string;
  source?: string;
}

/**
 * On-device devtools for debugging on phones (no desktop devtools needed).
 *
 * Currently ON BY DEFAULT (temporary, while hunting a device-specific issue).
 *
 *   open <site>?debug=0  → turn it off (persists)
 *   open <site>?debug=1  → turn it back on
 *
 * The flag persists in localStorage so it survives navigation/reloads.
 * Loaded dynamically. Errors that happened before this component mounted are
 * collected by the inline trap in layout.tsx and replayed into the console.
 */
export default function DebugConsole() {
  // Error REPORTING is always on (independent of the devtools overlay):
  // ship load-time + live window errors to the same-origin /api/log sink.
  useEffect(() => {
    if (reporting) return;
    reporting = true;
    const early = (window as { __earlyErrors?: EarlyError[] }).__earlyErrors;
    for (const err of early ?? []) {
      reportClientError({ kind: `early-${err.type}`, message: err.message, source: err.source });
    }
    window.addEventListener('error', (e) =>
      reportClientError({
        kind: 'window-error',
        message: String(e.error?.stack ?? e.message),
        source: `${e.filename ?? ''}:${e.lineno ?? ''}`,
      }),
    );
    window.addEventListener('unhandledrejection', (e) =>
      reportClientError({
        kind: 'unhandledrejection',
        message: String((e.reason as Error | undefined)?.stack ?? e.reason),
      }),
    );
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('debug');
    let disabled = flag === '0';
    try {
      if (flag === '1') localStorage.setItem(FLAG, '1');
      if (flag === '0') localStorage.setItem(FLAG, '0');
      // Default ON for now — only an explicit '0' disables.
      disabled = localStorage.getItem(FLAG) === '0';
    } catch {
      // storage blocked (private mode) — keep the default-ON behavior
    }
    if (disabled || loaded) return;
    loaded = true;
    void import('eruda')
      .then(({ default: eruda }) => {
        eruda.init();
        // Replay errors captured before the bundle finished loading.
        const early = (window as { __earlyErrors?: EarlyError[] }).__earlyErrors;
        if (early?.length) {
          console.error(`[debug] ${early.length} error(s) captured before devtools loaded:`);
          for (const err of early) {
            console.error(`[early ${err.type}]`, err.message, err.source ?? '');
          }
        }
      })
      .catch((err: unknown) => {
        loaded = false;
        reportClientError({
          kind: 'eruda-load-failed',
          message: err instanceof Error ? err.message : String(err),
        });
      });
  }, []);
  return null;
}
