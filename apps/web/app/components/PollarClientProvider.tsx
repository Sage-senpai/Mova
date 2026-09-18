"use client";

import { PollarProvider } from "@pollar/react";

/**
 * Client-side Pollar wiring — the publishable key only, safe to expose in
 * the browser bundle. This is what lets a visitor connect a real Pollar
 * wallet and sign a real testnet transaction themselves; the server-side
 * adapter in packages/settlement/pollar can create/fund a wallet with the
 * secret key, but per Pollar's own Security Model it can never move a
 * user's funds — only a live, user-authenticated session can. See
 * docs/pollar-integration.md.
 */
export function PollarClientProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

  if (!apiKey) {
    // No publishable key configured — render children without the provider
    // rather than crashing the whole app. Wallet-connect UI checks
    // usePollar() availability the same way (see WalletConnect.tsx).
    return <>{children}</>;
  }

  return (
    <PollarProvider client={{ apiKey, stellarNetwork: "testnet" }}>{children}</PollarProvider>
  );
}
