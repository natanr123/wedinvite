import type { NextConfig } from "next";

// Applied to every response. Notably absent: a strict script-src CSP — that
// needs per-request nonces (Next injects inline hydration scripts) via
// middleware; tracked as a follow-up. frame-ancestors here still gives the
// clickjacking protection without the nonce machinery.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Capability URLs carry the event UUID in the path — never leak it via Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // HTML/documents only — never cached. Some mobile browsers (observed
        // on Mi Browser) mishandle conditional revalidation (304) and serve
        // stale bundles or surface the 304 as an error. Hashed assets under
        // /_next/ are immutable and stay cacheable.
        source: "/((?!_next/).*)",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
