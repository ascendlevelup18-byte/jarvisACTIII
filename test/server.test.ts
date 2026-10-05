import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { OfflineLlm } from "../src/llm.ts";
import { createApp } from "../src/server.ts";
import { makeDeps } from "./helpers.ts";

let server: Server;
let base: string;

before(async () => {
  server = createApp(makeDeps(new OfflineLlm()), { autoRefundEnabled: true });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (body: string) =>
  fetch(`${base}/cases`, { method: "POST", headers: { "content-type": "application/json" }, body });

test("health", async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, llm: "offline-heuristic", autoRefundEnabled: true });
});

test("POST /cases -> resolved case, retrievable with audit trail", async () => {
  const res = await post(JSON.stringify({ customerId: "cus_alice", message: "Charged twice for ORD-1001, $49.99" }));
  assert.equal(res.status, 201);
  const c = (await res.json()) as { id: string; state: string };
  assert.equal(c.state, "resolved");

  const got = await fetch(`${base}/cases/${c.id}`);
  assert.equal(got.status, 200);
  const audit = (await (await fetch(`${base}/cases/${c.id}/audit`)).json()) as { events: unknown[] };
  assert.ok(audit.events.length >= 8);

  const list = (await (await fetch(`${base}/cases`)).json()) as { cases: { id: string }[] };
  assert.ok(list.cases.some((x) => x.id === c.id));
});

test("input validation", async () => {
  assert.equal((await post("{not json")).status, 400);
  assert.equal((await post(JSON.stringify({ customerId: "alice", message: "hi" }))).status, 400);
  assert.equal((await post(JSON.stringify({ customerId: "cus_a", message: "" }))).status, 400);
  assert.equal((await post(JSON.stringify({ customerId: "cus_a", message: "x", extra: 1 }))).status, 400);
  assert.equal((await post(JSON.stringify({ customerId: "cus_a", message: "x".repeat(70_000) }))).status, 413);
});

test("unknown routes and cases", async () => {
  assert.equal((await fetch(`${base}/cases/case_nope`)).status, 404);
  assert.equal((await fetch(`${base}/nope`)).status, 404);
  assert.equal((await fetch(`${base}/cases`, { method: "DELETE" })).status, 405);
});
