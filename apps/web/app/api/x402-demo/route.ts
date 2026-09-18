import { NextResponse } from "next/server";
import {
  newAgentId,
  newPolicyId,
  newUserId,
  type Agent,
  type AgentPolicy,
} from "@mova/domain";
import { evaluatePolicy } from "@mova/policy-engine";
import { InMemoryLedger } from "@mova/ledger";
import { build402Response, handleX402Payment, type X402PaymentRequirements } from "@mova/agent-payments-x402";

/**
 * Screen 11 backing route — a real (if hackathon-scale) x402 flow: a
 * request without a payment payload gets the real x402 PAYMENT-REQUIRED
 * challenge (header names live-verified against github.com/coinbase/x402,
 * see docs/decisions.md ADR-007); a request carrying PAYMENT-SIGNATURE is
 * turned into a PaymentIntent and run through the real policy engine
 * (@mova/policy-engine) before any execution is attempted — never after.
 */

const ledger = new InMemoryLedger();

/**
 * In-memory request history backing /agents/monitor — same hackathon-scale
 * simplification as InMemoryLedger (docs/architecture.md §2), just enough
 * so that screen can show what actually happened here instead of static
 * placeholder numbers. Resets on server restart/redeploy, same as ledger.
 */
type RequestRecord = {
  amount: string;
  decision: "PASS" | "BLOCK" | "REQUIRES_APPROVAL";
  reason?: string;
  at: string;
};
const requestHistory: RequestRecord[] = [];

const AGENT: Agent = {
  id: newAgentId(),
  name: "Translation Bot",
  ownerId: newUserId(),
  status: "ACTIVE",
};

const REQUIREMENTS: X402PaymentRequirements = {
  scheme: "exact",
  network: "eip155:84532",
  amount: "0.20",
  asset: "USD",
  payTo: "translation-provider.mova.demo",
  resource: "/v1/translate",
  description: "Machine translation API call",
  maxTimeoutSeconds: 60,
};

const POLICY: AgentPolicy = {
  id: newPolicyId(),
  agentId: AGENT.id,
  maxPerTransaction: "50",
  dailyLimit: "200",
  currency: "USD",
  allowedDestinations: [REQUIREMENTS.payTo],
  allowedAssets: ["USD"],
  humanApprovalAbove: "25",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function POST(request: Request) {
  const paymentSignature = request.headers.get("PAYMENT-SIGNATURE");

  if (!paymentSignature) {
    const challenge = build402Response(REQUIREMENTS);
    return NextResponse.json(challenge.body, { status: 402, headers: challenge.headers });
  }

  const today = new Date().toISOString().slice(0, 10);

  const response = await handleX402Payment({
    requirements: REQUIREMENTS,
    agent: AGENT,
    policy: POLICY,
    destinationCountry: "BO",
    evaluatePolicy: async (intent, policy) => {
      const spentToday = ledger.getSpendToday(AGENT.id, today);
      return evaluatePolicy(intent, policy, spentToday);
    },
    executeIntent: async (intent) => {
      // Illustrative settlement: this demo route doesn't call the real
      // routing-engine/Pollar adapter (that's the human-flow path in
      // /pay) — it records the spend and reports success, matching
      // Screen 11's "mic-drop" framing without claiming a live chain
      // settlement happened. See docs/pollar-integration.md.
      ledger.recordSpend(AGENT.id, intent.source.amount, today);
      return { success: true, ref: `mock-x402-settle-${intent.id}` };
    },
  });

  const body = response.body as { decision: "PASS" | "BLOCK" | "REQUIRES_APPROVAL"; reason?: string };
  requestHistory.unshift({
    amount: `$${REQUIREMENTS.amount}`,
    decision: body.decision,
    reason: body.reason,
    at: new Date().toISOString(),
  });
  if (requestHistory.length > 50) requestHistory.length = 50;

  return NextResponse.json(response.body, { status: response.status, headers: response.headers });
}

/** Backs Screen 10 (Agent Monitor) with what this route actually decided,
 * not decorative numbers — see docs/shared/gap-review.md Round 6. */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({
    agentName: AGENT.name,
    dailyLimit: POLICY.dailyLimit,
    currency: POLICY.currency,
    spentToday: ledger.getSpendToday(AGENT.id, today),
    requests: requestHistory,
    fulfilled: requestHistory.filter((r) => r.decision === "PASS").length,
    blocked: requestHistory.filter((r) => r.decision === "BLOCK").length,
    pending: requestHistory.filter((r) => r.decision === "REQUIRES_APPROVAL").length,
  });
}
