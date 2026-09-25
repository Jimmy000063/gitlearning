import type { NextConfig } from "next";

// Fully static site: no server, no database. `next build` writes plain files to /out.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
