/**
 * PollarClient — a local mirror of the shape documented for `@pollar/core`
 * plus a real implementation of the one operation Pollar's own documented
 * Security Model allows a secret key to perform headlessly: creating and
 * funding a custodial Stellar wallet (`POST /v1/users/with-wallet` and
 * `POST /v1/wallets/fund` on `server.api.pollar.xyz`, verified 2026-09-18
 * against https://docs.pollar.xyz/llms-full.txt).
 *
 * What is genuinely real vs. simulated, and why, per operation:
 *
 * - `createWallet`: REAL when `POLLAR_SECRET_KEY` is set — calls Pollar's
 *   live Server API and returns an actual Stellar testnet G-address on
 *   success. Falls back to a simulated address (and sets `real: false`)
 *   if the call fails, so a Pollar-side outage never crashes MOVA's demo.
 * - `getUsdcQuote`, `sendUsdc`, `getTransferStatus`: ALWAYS simulated,
 *   even with a real secret key. Per Pollar's own Security Model doc,
 *   the Server API cannot move a user's funds or read transaction
 *   history — "moving a user's own funds independently: No"; that
 *   requires a signature from the user's own key via an authenticated
 *   client-side SDK session, which this headless adapter does not hold.
 *   This is not a shortcut MOVA chose — it's the boundary Pollar's
 *   architecture itself draws (see docs/pollar-integration.md).
 */

export type PollarWalletActivationMode = "IMMEDIATE" | "DEFERRED" | "MANUAL";

export interface PollarWalletHandle {
  address: string;
  network: "stellar-testnet" | "stellar-mainnet";
  activationMode: PollarWalletActivationMode;
  /** True only for a wallet actually created via a live Pollar Server API
   * call that returned success. False means this is a simulated fallback. */
  real: boolean;
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
  /** Always false — see the class doc-comment on why quoting can't be real yet. */
  real: boolean;
}

export interface PollarSendUsdcRequest {
  quoteRef: string;
  destinationAddress: string;
}

export type PollarTransferStatus = "submitted" | "pending" | "completed" | "failed";

export interface PollarSendUsdcResult {
  transferRef: string;
  status: PollarTransferStatus;
  /** Always false — sending requires a user-signed session; see above. */
  real: boolean;
}

export interface PollarTransferStatusResult {
  transferRef: string;
  status: PollarTransferStatus;
  providerRef: string;
}

export interface PollarClient {
  /**
   * "REAL" once real `POLLAR_SECRET_KEY` credentials are configured and
   * `createWallet` is genuinely attempting live Pollar Server API calls
   * (regardless of whether any individual call happens to succeed — see
   * each result's own `real` field for that). "SIMULATED" otherwise.
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
 * structurally correct `PollarClient` before/without real credentials.
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
      real: false,
    };
    this.#wallets.set(userId, handle);
    return handle;
  }

  async getUsdcQuote(request: PollarUsdcQuoteRequest): Promise<PollarUsdcQuoteResult> {
    const sourceAmount = Number.parseFloat(request.sourceAmount);
    // Illustrative flat rate/fee only — this simulator is not a pricing
    // engine and must never be mistaken for one. Pollar has no fiat/USDC
    // quote endpoint documented at all (secret-key or otherwise) as of
    // this writing — see docs/pollar-integration.md.
    const fee = Number.isFinite(sourceAmount) ? sourceAmount * 0.005 : 0;
    const destinationAmount = Number.isFinite(sourceAmount) ? sourceAmount - fee : 0;
    return {
      quoteRef: `simq_${randomId()}`,
      rate: "1.00",
      destinationAmount: destinationAmount.toFixed(2),
      fee: fee.toFixed(2),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      real: false,
    };
  }

  async sendUsdc(request: PollarSendUsdcRequest): Promise<PollarSendUsdcResult> {
    void request.quoteRef;
    void request.destinationAddress;
    const transferRef = `simtx_${randomId()}`;
    const providerRef = `stellar-testnet-sim:${transferRef}`;
    this.#transfers.set(transferRef, { status: "submitted", providerRef });
    return { transferRef, status: "submitted", real: false };
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

const POLLAR_SERVER_API_BASE = "https://server.api.pollar.xyz/v1";

type PollarServerEnvelope<T> =
  | { success: true; code: string; content: T }
  | { success: false; code: string };

async function pollarServerRequest<T>(
  secretKey: string,
  path: string,
  body: unknown,
): Promise<{ ok: true; envelope: PollarServerEnvelope<T> & { success: true } } | { ok: false; status: number; code?: string; error: string }> {
  let res: Response;
  try {
    res = await fetch(`${POLLAR_SERVER_API_BASE}${path}`, {
      method: "POST",
      headers: {
        "x-pollar-api-key": secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return { ok: false, status: 0, error: err instanceof Error ? err.message : String(err) };
  }

  let parsed: PollarServerEnvelope<T> | undefined;
  try {
    parsed = (await res.json()) as PollarServerEnvelope<T>;
  } catch {
    // Non-JSON body — fall through with parsed undefined.
  }

  if (res.ok && parsed?.success) {
    return { ok: true, envelope: parsed as PollarServerEnvelope<T> & { success: true } };
  }

  return {
    ok: false,
    status: res.status,
    code: parsed && "code" in parsed ? parsed.code : undefined,
    error: parsed && "code" in parsed ? parsed.code : `HTTP ${res.status}`,
  };
}

/** Tries the handful of plausible key names for the returned wallet's
 * Stellar public key — the with-wallet response shape for the created
 * wallet isn't fully documented, so this is defensive by design. If
 * Pollar's actual shape differs, add it here rather than at call sites. */
function extractPublicKey(content: unknown): string | undefined {
  if (!content || typeof content !== "object") return undefined;
  const c = content as Record<string, unknown>;
  const candidates = [
    c.publicKey,
    c.address,
    (c.wallet as Record<string, unknown> | undefined)?.publicKey,
    (c.wallet as Record<string, unknown> | undefined)?.address,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("G") && candidate.length === 56) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * RealPollarClient — genuinely calls Pollar's live Server API
 * (`server.api.pollar.xyz`) for wallet creation/funding using a real
 * `POLLAR_SECRET_KEY`. Every other operation delegates to
 * `SimulatedPollarClient` because no secret-key REST endpoint exists for
 * them (see the module doc-comment). Never throws out to the caller on a
 * Pollar-side failure — it logs the real error and falls back to a
 * simulated result with `real: false`, so a live demo keeps working even
 * if, say, the app's Stellar funding wallet needs a testnet top-up.
 */
export class RealPollarClient implements PollarClient {
  readonly mode = "REAL" as const;

  #secretKey: string;
  #fallback = new SimulatedPollarClient();

  constructor(secretKey: string) {
    this.#secretKey = secretKey;
  }

  async createWallet(userId: string): Promise<PollarWalletHandle> {
    const created = await pollarServerRequest<unknown>(this.#secretKey, "/users/with-wallet", {
      externalId: userId,
    });

    if (!created.ok) {
      console.warn(
        `[@mova/settlement-pollar] Real wallet creation failed for "${userId}": ${created.error}. ` +
          "Falling back to a simulated wallet for this call. If this is WALLET_CREATION_FAILED, " +
          "the app's Stellar funding wallet on dashboard.pollar.xyz likely needs a testnet XLM " +
          "top-up (Treasury -> Account Funding) — see docs/pollar-integration.md.",
      );
      const fallback = await this.#fallback.createWallet(userId);
      return fallback;
    }

    const publicKey = extractPublicKey(created.envelope.content);
    if (!publicKey) {
      console.warn(
        "[@mova/settlement-pollar] Pollar reported wallet creation success but no recognizable " +
          "publicKey was found in the response shape. Falling back to a simulated wallet for " +
          "this call — update extractPublicKey() in pollarClient.ts once the real shape is known.",
      );
      const fallback = await this.#fallback.createWallet(userId);
      return fallback;
    }

    // Idempotent: fund regardless of whether the app is in Immediate or
    // Deferred mode. A 409 ("already funded") is documented as safe to
    // ignore; any other failure just means the wallet stays unfunded,
    // which we surface but don't treat as fatal for wallet *creation*.
    const funded = await pollarServerRequest<unknown>(this.#secretKey, "/wallets/fund", {
      publicKey,
    });
    if (!funded.ok && funded.code !== "WALLET_ALREADY_FUNDED") {
      console.warn(
        `[@mova/settlement-pollar] Wallet ${publicKey} created but funding failed: ${funded.error}. ` +
          "The wallet exists on Stellar testnet but may not be able to transact yet.",
      );
    }

    return {
      address: publicKey,
      network: "stellar-testnet",
      activationMode: "DEFERRED",
      real: true,
    };
  }

  async getUsdcQuote(request: PollarUsdcQuoteRequest): Promise<PollarUsdcQuoteResult> {
    return this.#fallback.getUsdcQuote(request);
  }

  async sendUsdc(request: PollarSendUsdcRequest): Promise<PollarSendUsdcResult> {
    return this.#fallback.sendUsdc(request);
  }

  async getTransferStatus(transferRef: string): Promise<PollarTransferStatusResult> {
    return this.#fallback.getTransferStatus(transferRef);
  }
}

/**
 * The only place that decides which `PollarClient` the rest of this
 * package talks to. Returns a `RealPollarClient` whenever
 * `POLLAR_SECRET_KEY` is configured (server-side only — never expose a
 * secret key to the browser), `SimulatedPollarClient` otherwise. See the
 * class doc-comments above for exactly which operations that "real"
 * client actually reaches Pollar's live API for.
 */
export function createPollarClient(): PollarClient {
  const secretKey = process.env.POLLAR_SECRET_KEY;
  if (secretKey) {
    return new RealPollarClient(secretKey);
  }
  return new SimulatedPollarClient();
}
