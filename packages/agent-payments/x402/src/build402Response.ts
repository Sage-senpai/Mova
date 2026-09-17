import type { X402PaymentRequirements } from "./types.js";

/**
 * x402 header names.
 *
 * docs/decisions.md ADR-007 flagged these as disputed across secondary
 * sources (`X-PAYMENT`/`X-PAYMENT-RESPONSE` is the commonly-blogged
 * convention). Per ADR-007 this was checked against the live
 * `github.com/coinbase/x402` repo before writing this file (via the GitHub
 * contents API on 2026-09-17, reading `specs/x402-specification-v2.md` and
 * `specs/transports-v2/http.md`, protocol version 2).
 *
 * The verified, current protocol header names are:
 *   - `PAYMENT-REQUIRED`  — server -> client, base64-encoded PaymentRequired JSON, sent with HTTP 402
 *   - `PAYMENT-SIGNATURE` — client -> server, base64-encoded PaymentPayload JSON
 *   - `PAYMENT-RESPONSE`  — server -> client, base64-encoded SettlementResponse JSON
 * (No `X-` prefix; that older/blogged convention does not appear in the
 * current spec.) This is a live-verified read of one specific repo/version
 * at a point in time, not a guarantee the protocol won't move again —
 * re-check against the live spec before this becomes a real integration
 * point with an actual facilitator.
 */
export const X402_HEADERS = {
  PAYMENT_REQUIRED: "PAYMENT-REQUIRED",
  PAYMENT_SIGNATURE: "PAYMENT-SIGNATURE",
  PAYMENT_RESPONSE: "PAYMENT-RESPONSE",
} as const;

function toBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf-8").toString("base64");
}

/**
 * Builds the HTTP 402 challenge a resource server returns when payment is
 * required, per the x402 `PaymentRequired` schema (specs §5.1). The
 * protocol communicates this via the `PAYMENT-REQUIRED` header (base64 JSON);
 * `body` mirrors the same JSON in plain form for logging/debugging
 * convenience — per the spec, response bodies beyond the header are a
 * server implementation concern, not part of the wire protocol itself.
 */
export function build402Response(requirements: X402PaymentRequirements): {
  status: 402;
  headers: Record<string, string>;
  body: unknown;
} {
  const body = {
    x402Version: 2,
    error: `${X402_HEADERS.PAYMENT_SIGNATURE} header is required`,
    resource: {
      url: requirements.resource,
      description: requirements.description,
    },
    accepts: [
      {
        scheme: requirements.scheme,
        network: requirements.network,
        amount: requirements.amount,
        asset: requirements.asset,
        payTo: requirements.payTo,
        maxTimeoutSeconds: requirements.maxTimeoutSeconds,
        extra: requirements.extra,
      },
    ],
  };

  return {
    status: 402,
    headers: {
      [X402_HEADERS.PAYMENT_REQUIRED]: toBase64Json(body),
    },
    body,
  };
}
