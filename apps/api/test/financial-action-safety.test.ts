// Financial-action safety: replays, races and dishonest read-backs on the money path.
// Complements review-remediation.test.ts (two cases refunding *different* charges) and
// engine-hardening.test.ts (read-back that throws, retry after an uncertain commit).
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import type { Case, Refund } from "../src/contracts.ts";
import { runCase, type EngineDeps } from "../src/case-engine.ts";
import { SCENARIOS } from "../src/fixtures.ts";
import type { PaymentGateway } from "../src/gateway.ts";
import { makeDeps, refunded, statePath } from "./helpers.ts";

const DUP = "CHARGE-48291-B";
const KEPT = "CHARGE-48291-A";
const refundsOn48291 = (deps: ReturnType<typeof makeDeps>) => deps.store.refundsForTransactions([KEPT, DUP]);

/** Commits after an await, like a real provider, so racing cases all pass revalidation first. */
function slowGateway(inner: PaymentGateway, ms = 15): PaymentGateway {
  return {
    refund: async (a) => {
      await sleep(ms);
      return inner.refund(a);
    },
    findRefund: (k) => inner.findRefund(k),
  };
}

/** Read-back that reports something other than what was committed. */
function lyingReadBack(inner: PaymentGateway, lie: (r: Refund) => Refund | null): PaymentGateway {
  return {
    refund: (a) => inner.refund(a),
    findRefund: async (k) => {
      const r = await inner.findRefund(k);
      return r ? lie(r) : r;
    },
  };
}

function assertNeverReportedAsSuccess(c: Case) {
  assert.notEqual(c.state, "RESOLVED", `case ${c.id} must not resolve`);
  assert.equal(c.verification?.verified ?? false, false);
}

describe("replays and races on the same charge", () => {
  test("two identical cases racing on one duplicate charge move money once", async () => {
    const deps = makeDeps();
    const d: EngineDeps = { ...deps, gateway: slowGateway(deps.gateway) };
    const [a, b] = await Promise.all([runCase(SCENARIOS.validDuplicate, d), runCase(SCENARIOS.validDuplicate, d)]);

    assert.ok(statePath(a).includes("EXECUTING") && statePath(b).includes("EXECUTING"), "the race must actually reach execution");
    assert.equal(refundsOn48291(deps).length, 1);
    assert.equal(refunded(deps, DUP), 8999);
    assert.equal(refunded(deps, KEPT), 0);
    // Both cases share the record-derived idempotency key (jarvis-dup-refund:48291), so each reads back the
    // same single refund. Today both report RESOLVED for it: money is safe, but case counts overstate
    // resolutions. Recorded as finding F-1 in docs/improvement/SECURITY_REVIEW.md; not asserted here.
    for (const c of [a, b]) assert.ok(["RESOLVED", "FAILED"].includes(c.state), c.state);
    assert.equal(new Set([a, b].map((c) => c.verification?.observedRefund?.id).filter(Boolean)).size, 1);
  });

  test("five concurrent identical cases still produce exactly one refund of the record amount", async () => {
    const deps = makeDeps();
    const d: EngineDeps = { ...deps, gateway: slowGateway(deps.gateway, 5) };
    const cases = await Promise.all(Array.from({ length: 5 }, () => runCase(SCENARIOS.validDuplicate, d)));
    assert.equal(refundsOn48291(deps).length, 1);
    assert.equal(refunded(deps, DUP), 8999);
    assert.ok(cases.every((c) => c.state !== "RESOLVED" || c.verification?.verified === true));
  });

  test("replaying a resolved request afterwards refunds nothing more", async () => {
    const deps = makeDeps();
    const first = await runCase(SCENARIOS.validDuplicate, deps);
    assert.equal(first.state, "RESOLVED");
    for (let i = 0; i < 3; i++) {
      const again = await runCase(SCENARIOS.validDuplicate, deps);
      assert.notEqual(again.state, "RESOLVED", `replay ${i + 1} must not resolve a second time`);
      assert.equal(again.action, null, `replay ${i + 1} must not execute`);
    }
    assert.equal(refundsOn48291(deps).length, 1);
    assert.equal(refunded(deps, DUP), 8999);
  });
});

describe("verification integrity: a dishonest or empty read-back is never success", () => {
  const variants: [string, (r: Refund) => Refund | null][] = [
    ["amount differs by one cent", (r) => ({ ...r, amountMinor: r.amountMinor - 1 })],
    ["different transaction", (r) => ({ ...r, transactionId: KEPT })],
    ["different currency", (r) => ({ ...r, currency: "EUR" })],
    ["refund not succeeded", (r) => ({ ...r, status: "PENDING" as Refund["status"] })],
    ["refund missing", () => null],
  ];
  for (const [name, lie] of variants) {
    test(`read-back with ${name}: not RESOLVED, reason recorded, single refund at most`, async () => {
      const deps = makeDeps();
      const c = await runCase(SCENARIOS.validDuplicate, { ...deps, gateway: lyingReadBack(deps.gateway, lie) });
      assert.ok(statePath(c).includes("VERIFYING"), "the case must reach verification");
      assertNeverReportedAsSuccess(c);
      assert.ok(c.reasons.length > 0, "an unverified case must say why");
      assert.ok(refundsOn48291(deps).length <= 1);
    });
  }

  test("a gateway error is never reported as a refund", async () => {
    const deps = makeDeps();
    const failing: PaymentGateway = {
      refund: async () => {
        throw new Error("provider: declined");
      },
      findRefund: async () => null,
    };
    const c = await runCase(SCENARIOS.validDuplicate, { ...deps, gateway: failing });
    assertNeverReportedAsSuccess(c);
    assert.equal(refunded(deps, DUP), 0);
  });
});

describe("unsafe requests never reach the gateway", () => {
  for (const [name, req] of [
    ["adversarial $5,000 demand", SCENARIOS.promptInjection],
    ["contradicted amount", SCENARIOS.conflictingAmount],
    ["already refunded", SCENARIOS.alreadyRefunded],
  ] as const) {
    test(`${name}: zero gateway calls`, async () => {
      const deps = makeDeps();
      let calls = 0;
      const counting: PaymentGateway = {
        refund: async (a) => {
          calls++;
          return deps.gateway.refund(a);
        },
        findRefund: (k) => deps.gateway.findRefund(k),
      };
      const c = await runCase(req, { ...deps, gateway: counting });
      assert.equal(calls, 0);
      assert.equal(c.action, null);
      assert.ok(["ESCALATED", "CLOSED_NO_ACTION"].includes(c.state), c.state);
    });
  }
});
