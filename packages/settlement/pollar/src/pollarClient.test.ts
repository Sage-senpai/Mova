import test from "node:test";
import assert from "node:assert/strict";
import { createPollarClient, SimulatedPollarClient } from "./pollarClient.js";

test("createPollarClient returns a simulated client when POLLAR_API_KEY is unset", () => {
  const previous = process.env.POLLAR_API_KEY;
  delete process.env.POLLAR_API_KEY;
  try {
    const client = createPollarClient();
    assert.equal(client.mode, "SIMULATED");
  } finally {
    if (previous !== undefined) process.env.POLLAR_API_KEY = previous;
  }
});

test("createPollarClient falls back to simulated even when POLLAR_API_KEY is set", () => {
  // No real @pollar/core wiring exists in this codebase yet, so a
  // present API key must never produce anything other than the
  // simulator (see the warning logged in createPollarClient()).
  const previous = process.env.POLLAR_API_KEY;
  process.env.POLLAR_API_KEY = "test-key-not-real";
  try {
    const client = createPollarClient();
    assert.equal(client.mode, "SIMULATED");
  } finally {
    if (previous === undefined) delete process.env.POLLAR_API_KEY;
    else process.env.POLLAR_API_KEY = previous;
  }
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
