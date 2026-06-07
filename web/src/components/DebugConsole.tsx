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
 * OPT-IN — off by default (so the public site ships no inspector overlay):
 *   open <site>?debug=1  → turn it on (persists in localStorage)
 *   open <site>?debug=0  → turn it back off
 *
 * Error REPORTING (below) is always on and is separate from this overlay.
 * Errors that happened before this component mounted are collected by the
 * inline trap in layout.tsx and replayed into the console when enabled.
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
    let enabled = flag === '1';
    try {
      if (flag === '1') localStorage.setItem(FLAG, '1');
      if (flag === '0') localStorage.removeItem(FLAG);
      // Opt-in — only an explicit '1' (URL or stored) enables the overlay.
      enabled = localStorage.getItem(FLAG) === '1';
    } catch {
      // storage blocked (private mode) — honor only the current URL flag
    }
    if (!enabled || loaded) return;
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
