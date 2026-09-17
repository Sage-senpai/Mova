/**
 * Branded ID types so an IntentId can't be passed where a RouteId is
 * expected, even though both are plain strings at runtime.
 */
type Brand<T, B extends string> = T & { readonly __brand: B };

export type IntentId = Brand<string, "IntentId">;
export type QuoteId = Brand<string, "QuoteId">;
export type RouteId = Brand<string, "RouteId">;
export type PaymentId = Brand<string, "PaymentId">;
export type SettlementId = Brand<string, "SettlementId">;
export type PolicyId = Brand<string, "PolicyId">;
export type AgentId = Brand<string, "AgentId">;
export type UserId = Brand<string, "UserId">;
export type RecipientId = Brand<string, "RecipientId">;
export type AuditEventId = Brand<string, "AuditEventId">;

function prefixedId<B extends string>(prefix: string): Brand<string, B> {
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return `${prefix}_${random}` as Brand<string, B>;
}

export const newIntentId = () => prefixedId<"IntentId">("int");
export const newQuoteId = () => prefixedId<"QuoteId">("qt");
export const newRouteId = () => prefixedId<"RouteId">("rt");
export const newPaymentId = () => prefixedId<"PaymentId">("pay");
export const newSettlementId = () => prefixedId<"SettlementId">("st");
export const newPolicyId = () => prefixedId<"PolicyId">("pol");
export const newAgentId = () => prefixedId<"AgentId">("agt");
export const newUserId = () => prefixedId<"UserId">("usr");
export const newRecipientId = () => prefixedId<"RecipientId">("rcp");
export const newAuditEventId = () => prefixedId<"AuditEventId">("evt");
