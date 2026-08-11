import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node server on EC2 (see terraform/environments/staging/README.md). `standalone`
  // emits a self-contained .next/standalone/server.js with a pruned node_modules,
  // which the systemd unit runs directly (no `next start`, no full install on the
  // box). This restores SSR, middleware, dynamic route params, and per-URL
  // metadata that `output: 'export'` gave up.
  output: "standalone",
};

export default nextConfig;
