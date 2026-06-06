'use client';

import { useEffect } from 'react';

const FLAG = 'wedinvite.debug';
let loaded = false;

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
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('debug');
    try {
      if (flag === '1') localStorage.setItem(FLAG, '1');
      if (flag === '0') localStorage.setItem(FLAG, '0');
      // Default ON for now — only an explicit '0' disables.
      if (localStorage.getItem(FLAG) === '0' || loaded) return;
    } catch {
      return; // storage blocked — debug mode unavailable
    }
    loaded = true;
    void import('eruda').then(({ default: eruda }) => {
      eruda.init();
      // Replay errors captured before the bundle finished loading.
      const early = (window as { __earlyErrors?: EarlyError[] }).__earlyErrors;
      if (early?.length) {
        console.error(`[debug] ${early.length} error(s) captured before devtools loaded:`);
        for (const err of early) {
          console.error(`[early ${err.type}]`, err.message, err.source ?? '');
        }
      }
    });
  }, []);
  return null;
}
