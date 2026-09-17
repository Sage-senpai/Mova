/**
 * PollarClient — a local mirror of the shape documented for `@pollar/core`
 * (see docs/pollar-integration.md for the verified capability table this
 * is based on). This package does NOT import `@pollar/core` — no real
 * Pollar testnet credentials exist in this build, and the package is not
 * installed in this workspace. Every caller here talks to this interface
 * instead, so the day a real `@pollar/core` dependency and a
 * `POLLAR_API_KEY` are wired in, `createPollarClient()` below is the only
 * place that needs to change; nothing in `pollarSettlementAdapter.ts`
 * would need to move.
 *
 * Method shapes are based on Pollar's verified primitives: embedded
 * wallet creation (classic Stellar account / Soroban smart wallet, with
 * an activation mode for KYC gating), USDC trustline + send/receive/
 * quote, and polled transfer status (Pollar's webhook support could not
 * be confirmed from public docs, so MOVA polls rather than assumes a
 * push mechanism exists — see docs/pollar-integration.md "Webhooks").
 */

export type PollarWalletActivationMode = "IMMEDIATE" | "DEFERRED" | "MANUAL";

export interface PollarWalletHandle {
  address: string;
  network: "stellar-testnet" | "stellar-mainnet";
  activationMode: PollarWalletActivationMode;
}

export interface PollarUsdcQuoteRequest {
  sourceCurrency: string;
  sourceAmount: string;
  destinationCurrency: string;
}

export interface PollarUsdcQuoteResult {
  quoteRef: string;
  rate: string;
  destinationAmount: string;
  fee: string;
  expiresAt: string;
}

export interface PollarSendUsdcRequest {
  quoteRef: string;
  destinationAddress: string;
}

export type PollarTransferStatus = "submitted" | "pending" | "completed" | "failed";

export interface PollarSendUsdcResult {
  transferRef: string;
  status: PollarTransferStatus;
}

export interface PollarTransferStatusResult {
  transferRef: string;
  status: PollarTransferStatus;
  providerRef: string;
}

export interface PollarClient {
  /**
   * "REAL" only once this file actually wraps a genuine `@pollar/core`
   * client wired to live testnet credentials. Nothing in this codebase
   * sets it to "REAL" today — see `createPollarClient()`.
   */
  readonly mode: "SIMULATED" | "REAL";

  createWallet(userId: string): Promise<PollarWalletHandle>;
  getUsdcQuote(request: PollarUsdcQuoteRequest): Promise<PollarUsdcQuoteResult>;
  sendUsdc(request: PollarSendUsdcRequest): Promise<PollarSendUsdcResult>;
  getTransferStatus(transferRef: string): Promise<PollarTransferStatusResult>;
}

function randomId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

/**
 * SimulatedPollarClient — an honest simulator, not a fake-but-presented-
 * as-real integration. No network calls, no real Stellar testnet
 * interaction, no `setTimeout`-based fake latency: state lives in memory
 * and every call resolves as soon as it's invoked. It exists so the rest
 * of MOVA (routing-engine, apps/web) can be built and demoed against a
 * structurally correct `PollarClient` before real credentials exist.
 */
export class SimulatedPollarClient implements PollarClient {
  readonly mode = "SIMULATED" as const;

  #wallets = new Map<string, PollarWalletHandle>();
  #transfers = new Map<string, { status: PollarTransferStatus; providerRef: string }>();

  async createWallet(userId: string): Promise<PollarWalletHandle> {
    const existing = this.#wallets.get(userId);
    if (existing) {
      return existing;
    }
    const handle: PollarWalletHandle = {
      // Stellar-account-shaped (starts with "G", 56 chars) but not a real key.
      address: `G${randomId()}${randomId()}${randomId()}`.slice(0, 56).toUpperCase(),
      network: "stellar-testnet",
      activationMode: "IMMEDIATE",
    };
    this.#wallets.set(userId, handle);
    return handle;
  }

  async getUsdcQuote(request: PollarUsdcQuoteRequest): Promise<PollarUsdcQuoteResult> {
    const sourceAmount = Number.parseFloat(request.sourceAmount);
    // Illustrative flat rate/fee only — this simulator is not a pricing
    // engine and must never be mistaken for one. Real rates come from a
    // real Pollar quote call once credentials exist.
    const fee = Number.isFinite(sourceAmount) ? sourceAmount * 0.005 : 0;
    const destinationAmount = Number.isFinite(sourceAmount) ? sourceAmount - fee : 0;
    return {
      quoteRef: `simq_${randomId()}`,
      rate: "1.00",
      destinationAmount: destinationAmount.toFixed(2),
      fee: fee.toFixed(2),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    };
  }

  async sendUsdc(request: PollarSendUsdcRequest): Promise<PollarSendUsdcResult> {
    void request.quoteRef;
    void request.destinationAddress;
    const transferRef = `simtx_${randomId()}`;
    const providerRef = `stellar-testnet-sim:${transferRef}`;
    this.#transfers.set(transferRef, { status: "submitted", providerRef });
    return { transferRef, status: "submitted" };
  }

  async getTransferStatus(transferRef: string): Promise<PollarTransferStatusResult> {
    const record = this.#transfers.get(transferRef);
    if (!record) {
      throw new Error(`SimulatedPollarClient: unknown transferRef "${transferRef}"`);
    }
    // Deterministic one-step-per-poll progression toward completion,
    // standing in for testnet confirmation latency without a real timer
    // or network call.
    record.status = nextStatus(record.status);
    return { transferRef, status: record.status, providerRef: record.providerRef };
  }
}

function nextStatus(current: PollarTransferStatus): PollarTransferStatus {
  switch (current) {
    case "submitted":
      return "pending";
    case "pending":
      return "completed";
    case "completed":
    case "failed":
      return current;
  }
}

/**
 * The only place that decides which `PollarClient` the rest of this
 * package talks to. There is no real `@pollar/core`-backed
 * implementation in this codebase yet, so this always returns
 * `SimulatedPollarClient` — if `POLLAR_API_KEY` is present we warn
 * loudly rather than silently pretending a real integration exists,
 * per the hard rule in docs/pollar-integration.md: never fabricate a
 * Pollar feature or its operating state.
 */
export function createPollarClient(): PollarClient {
  const apiKey = process.env.POLLAR_API_KEY;
  if (apiKey) {
    console.warn(
      "[@mova/settlement-pollar] POLLAR_API_KEY is set, but this build has " +
        "no real @pollar/core wiring yet (see docs/pollar-integration.md). " +
        "Falling back to SimulatedPollarClient instead of half-implementing " +
        "a broken real path."
    );
  }
  return new SimulatedPollarClient();
}
