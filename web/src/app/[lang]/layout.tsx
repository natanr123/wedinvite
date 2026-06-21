import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Playfair_Display,
  Heebo,
  Frank_Ruhl_Libre,
} from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import DebugConsole from "@/components/DebugConsole";
import LanguageToggle from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/dictionary";
import { I18nProvider } from "@/lib/i18n";
import { translate } from "@/lib/i18n-core";
import { dirOf, isLocale } from "@/lib/locale";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

// Hebrew-capable fonts (Geist/Playfair have no Hebrew glyphs). Heebo mirrors
// Geist's clean neutral sans; Frank Ruhl Libre is the Hebrew serif for headings.
const heebo = Heebo({
  variable: "--font-hebrew-sans",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-hebrew-serif",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  // Invalid locale 404s in RootLayout — keep metadata consistent (no copy).
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  return {
    title: translate(dict, "meta.title"),
    description: translate(dict, "meta.description"),
  };
}

/**
 * Early-error trap (plain ES5, inline, runs before any bundle): buffers
 * window errors + unhandled rejections so the on-device devtools
 * (DebugConsole, ?debug=1) can replay errors that happened during load —
 * including crashes that white-screen old browsers before React mounts.
 * Locale-agnostic on purpose (must not introduce a server/client divergence).
 */
const earlyErrorTrap = `
// Storage shim: some browsers (privacy modes, Mi Browser strict settings)
// deny ALL storage access — window.localStorage throws SecurityError on read.
// Install an in-memory stand-in so the app and the debug tools keep working
// (event ids just won't persist across visits on such browsers).
(function () {
  function blocked(name) {
    try { window[name].getItem('__probe__'); return false; } catch (e) { return true; }
  }
  function memoryStorage() {
    var mem = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem: function (k, v) { mem[k] = String(v); },
      removeItem: function (k) { delete mem[k]; },
      clear: function () { mem = {}; },
      key: function (i) { return Object.keys(mem)[i] || null; },
      get length() { return Object.keys(mem).length; }
    };
  }
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    if (blocked(name)) {
      try { Object.defineProperty(window, name, { value: memoryStorage(), configurable: true }); } catch (e) {}
    }
  });
})();
window.__earlyErrors = [];
window.addEventListener('error', function (e) {
  window.__earlyErrors.push({
    type: 'error',
    message: String((e.error && e.error.stack) || e.message || e),
    source: (e.filename || '') + ':' + (e.lineno || '')
  });
});
window.addEventListener('unhandledrejection', function (e) {
  window.__earlyErrors.push({
    type: 'unhandledrejection',
    message: String((e.reason && e.reason.stack) || e.reason || e)
  });
});
`;

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const dict = getDictionary(lang);

  return (
    <html
      lang={lang}
      dir={dirOf(lang)}
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${heebo.variable} ${frankRuhl.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyErrorTrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={lang} dict={dict}>
          <LanguageToggle />
          {children}
        </I18nProvider>
        <DebugConsole />
      </body>
    </html>
  );
}
