import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pins the workspace root to this monorepo, not an unrelated lockfile
  // that happens to sit in a parent directory outside the project.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@mova/domain",
    "@mova/routing-engine",
    "@mova/policy-engine",
    "@mova/ledger",
    "@mova/payment-rails-bank",
    "@mova/payment-rails-p2p",
    "@mova/payment-rails-stablecoin",
    "@mova/settlement-pollar",
    "@mova/agent-payments-x402",
    "@mova/ui",
  ],
  webpack(config) {
    // The @mova/* packages use NodeNext-style ".js"-suffixed relative
    // imports pointing at ".ts" source files (see docs/architecture.md).
    // tsc and tsx resolve this natively; webpack needs to be told
    // explicitly, since transpilePackages alone doesn't cover it.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
