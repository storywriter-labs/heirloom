import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export served from S3 + CloudFront (see terraform/heirloom-staging/README.md).
  // No server runtime: rules out SSR, middleware, Server Actions, dynamic route
  // params, and default next/image optimization.
  output: "export",
};

export default nextConfig;
