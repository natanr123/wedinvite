import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import DebugConsole from "@/components/DebugConsole";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "WedInvite",
  description: "Plan your wedding guest list and the relations between guests",
};

/**
 * Early-error trap (plain ES5, inline, runs before any bundle): buffers
 * window errors + unhandled rejections so the on-device devtools
 * (DebugConsole, ?debug=1) can replay errors that happened during load —
 * including crashes that white-screen old browsers before React mounts.
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: earlyErrorTrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <DebugConsole />
      </body>
    </html>
  );
}
