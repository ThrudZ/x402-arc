import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Pin the tracing root to the monorepo so Next doesn't guess it from a
// stray lockfile higher up the tree.
const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const nextConfig: NextConfig = {
  transpilePackages: ["x402-arc"],
  outputFileTracingRoot: monorepoRoot,
};

export default nextConfig;
