"use client";

import { useEffect } from "react";
import { usePollar } from "@pollar/react";
import { CapabilityBadge } from "@mova/ui";

/**
 * Lets a visitor connect a real Pollar wallet (social/email/passkey, via
 * Pollar's own prebuilt modal) so the settlement step can send an actual
 * signed testnet transaction instead of the server-side simulated leg. See
 * docs/pollar-integration.md "Client-side send" for what this does and
 * doesn't change about the demo's honesty guarantees.
 */
export function WalletConnectPanel() {
  const { isAuthenticated, wallet, openLoginModal, logout, walletBalance, refreshWalletBalance } =
    usePollar();

  useEffect(() => {
    if (isAuthenticated && walletBalance.step === "idle") {
      refreshWalletBalance().catch(() => {});
    }
  }, [isAuthenticated, walletBalance.step, refreshWalletBalance]);

  if (!isAuthenticated) {
    return (
      <button
        onClick={openLoginModal}
        className="flex items-center gap-2 self-start rounded-sm border border-white/15 px-4 py-2 text-xs text-paper transition-colors hover:border-signal"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-mist" />
        Connect Pollar wallet (testnet)
      </button>
    );
  }

  const nativeBalance =
    walletBalance.step === "loaded"
      ? walletBalance.data.balances.find((b) => b.type === "native")?.available
      : null;

  return (
    <div className="flex items-center gap-3 self-start rounded-sm border border-ok/30 bg-panel px-4 py-2 text-xs">
      <CapabilityBadge capability="SANDBOX" />
      <span className="font-mono text-paper">
        {wallet?.address.slice(0, 6)}…{wallet?.address.slice(-6)}
      </span>
      {nativeBalance ? <span className="text-mist">{nativeBalance} XLM</span> : null}
      <button onClick={logout} className="text-mist underline underline-offset-2 hover:text-paper">
        Disconnect
      </button>
    </div>
  );
}
