import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
