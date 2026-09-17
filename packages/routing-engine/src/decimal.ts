/**
 * Minimal decimal-safe helpers for the amount strings defined in
 * @mova/domain (docs/decisions.md ADR-005: amounts are decimal strings;
 * decimal arithmetic happens at call sites, never native `+`/`*` on
 * parsed floats).
 *
 * This package only ever needs to (a) compare two decimal amounts for
 * the hard-constraint checks in discoverRoutes.ts, and (b) compute a
 * fee/amount RATIO for scoring — a heuristic 0-100 number, not a stored
 * monetary value. Per ADR-005's own note, precision only matters here at
 * the "don't misrank two close routes" / "don't misjudge a constraint"
 * level, not ledger-grade accounting, so this intentionally stays small
 * rather than pulling in a full decimal library.
 */

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

function assertDecimal(value: string): void {
  if (!DECIMAL_RE.test(value)) {
    throw new TypeError(`Not a decimal string: ${JSON.stringify(value)}`);
  }
}

/** Scale two decimal strings to a common number of fraction digits and return integer bigints — exact, no float rounding. */
function toComparableBigInts(a: string, b: string): [bigint, bigint] {
  assertDecimal(a);
  assertDecimal(b);
  const [aInt, aFrac = ""] = a.split(".");
  const [bInt, bFrac = ""] = b.split(".");
  const scale = Math.max(aFrac.length, bFrac.length);
  const aScaled = `${aInt}${aFrac.padEnd(scale, "0")}`;
  const bScaled = `${bInt}${bFrac.padEnd(scale, "0")}`;
  return [BigInt(aScaled), BigInt(bScaled)];
}

/** -1 if a<b, 0 if equal, 1 if a>b — exact decimal-string comparison. */
export function compareDecimalStrings(a: string, b: string): -1 | 0 | 1 {
  const [ai, bi] = toComparableBigInts(a, b);
  if (ai < bi) return -1;
  if (ai > bi) return 1;
  return 0;
}

export function decimalGte(a: string, b: string): boolean {
  return compareDecimalStrings(a, b) >= 0;
}

export function decimalLte(a: string, b: string): boolean {
  return compareDecimalStrings(a, b) <= 0;
}

/**
 * numerator / denominator as a plain ratio (e.g. 0.01 == 1%), for SCORING
 * heuristics only — never for money accounting. Scales both operands to
 * integers first (via BigInt) so the division itself doesn't compound
 * float error from parsing, then converts to a plain Number at the end,
 * which is appropriate for a display-level 0-100 score.
 */
export function decimalRatio(numerator: string, denominator: string): number {
  assertDecimal(numerator);
  assertDecimal(denominator);
  const [numInt, numFrac = ""] = numerator.split(".");
  const [denInt, denFrac = ""] = denominator.split(".");
  const scale = Math.max(numFrac.length, denFrac.length);
  const numScaled = BigInt(`${numInt}${numFrac.padEnd(scale, "0")}`);
  const denScaled = BigInt(`${denInt}${denFrac.padEnd(scale, "0")}`);
  if (denScaled === 0n) return 0;

  const PRECISION = 1_000_000n;
  const scaledRatio = (numScaled * PRECISION) / denScaled;
  return Number(scaledRatio) / Number(PRECISION);
}
