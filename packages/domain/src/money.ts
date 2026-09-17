/**
 * Amounts are decimal strings, never floats — this is money.
 * Currency codes are ISO 4217 where one exists (NGN, BOB, USD) and a
 * project-defined symbol otherwise (e.g. "USDC").
 */
export type Money = {
  currency: string;
  amount: string;
};

export function money(amount: string, currency: string): Money {
  return { amount, currency };
}
