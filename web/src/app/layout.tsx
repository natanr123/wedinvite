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
