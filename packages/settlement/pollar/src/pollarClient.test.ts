import test from "node:test";
import assert from "node:assert/strict";
import { createPollarClient, RealPollarClient, SimulatedPollarClient } from "./pollarClient.js";

function withEnv(name: string, value: string | undefined, fn: () => void) {
  const previous = process.env[name];
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
  try {
    fn();
  } finally {
    if (previous === undefined) delete process.env[name];
    else process.env[name] = previous;
  }
}

test("createPollarClient returns a simulated client when POLLAR_SECRET_KEY is unset", () => {
  withEnv("POLLAR_SECRET_KEY", undefined, () => {
    const client = createPollarClient();
    assert.equal(client.mode, "SIMULATED");
  });
});

test("createPollarClient returns a real client when POLLAR_SECRET_KEY is set", () => {
  withEnv("POLLAR_SECRET_KEY", "sec_testnet_not_a_real_key", () => {
    const client = createPollarClient();
    assert.equal(client.mode, "REAL");
  });
});

test("SimulatedPollarClient marks every result real: false", async () => {
  const client = new SimulatedPollarClient();
  const wallet = await client.createWallet("user-1");
  assert.equal(wallet.real, false);

  const quote = await client.getUsdcQuote({
    sourceCurrency: "NGN",
    sourceAmount: "1000",
    destinationCurrency: "USDC",
  });
  assert.equal(quote.real, false);

  const sent = await client.sendUsdc({
    quoteRef: quote.quoteRef,
    destinationAddress: wallet.address,
  });
  assert.equal(sent.real, false);
});

test("SimulatedPollarClient send + status progress submitted -> pending -> completed", async () => {
  const client = new SimulatedPollarClient();
  const quote = await client.getUsdcQuote({
    sourceCurrency: "NGN",
    sourceAmount: "1000",
    destinationCurrency: "USDC",
  });
  const sent = await client.sendUsdc({
    quoteRef: quote.quoteRef,
    destinationAddress: "GSIMULATEDDESTINATIONADDRESS",
  });
  assert.equal(sent.status, "submitted");

  const first = await client.getTransferStatus(sent.transferRef);
  assert.equal(first.status, "pending");

  const second = await client.getTransferStatus(sent.transferRef);
  assert.equal(second.status, "completed");

  const third = await client.getTransferStatus(sent.transferRef);
  assert.equal(third.status, "completed");
});

test("SimulatedPollarClient.getTransferStatus rejects unknown transfer refs", async () => {
  const client = new SimulatedPollarClient();
  await assert.rejects(() => client.getTransferStatus("does-not-exist"));
});

test("RealPollarClient.createWallet falls back to a simulated wallet (real: false) when the secret key is invalid", async () => {
  // A syntactically-plausible but definitely-invalid key: this must hit
  // Pollar's live API, get rejected, and fall back — never throw and
  // never fabricate a "real: true" result. This test makes a real network
  // call; skip if offline by treating a network error the same as an
  // API rejection (both should still fall back cleanly).
  const client = new RealPollarClient("sec_testnet_definitely_invalid_0000000000");
  const wallet = await client.createWallet("test-fallback-user");
  assert.equal(wallet.real, false);
  assert.ok(wallet.address.startsWith("G"));
});
