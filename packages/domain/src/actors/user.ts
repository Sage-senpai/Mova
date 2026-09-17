import type { UserId, RecipientId, AgentId } from "../ids.js";

export type Sender = {
  id: UserId;
  displayName: string;
  country: string;
};

export type Recipient = {
  id: RecipientId;
  displayName: string;
  country: string;
  /** Destination account/wallet reference, provider-specific and opaque to the router. */
  destinationRef: string;
};

/**
 * A machine actor that can generate payment intents on its own behalf,
 * always constrained by an AgentPolicy (see policies/agentPolicy.ts).
 * Never given direct wallet access — see docs/security.md.
 */
export type Agent = {
  id: AgentId;
  name: string;
  ownerId: UserId;
  status: "ACTIVE" | "PAUSED" | "DISABLED";
};
