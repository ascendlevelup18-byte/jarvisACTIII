# JARVIS

JARVIS is an autonomous ecommerce exception resolver. Its first workflow handles **duplicate charges**.

The LLM proposes a decision and deterministic code decides whether that proposal is allowed. Code executes the refund, verifies it, and records every step. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Quickstart

Requires Node ≥ 24. There is no build step, because Node runs the TypeScript directly.

```bash
npm install
npm run check
```

`npm run check` runs the typecheck and the tests.

To run locally with the offline heuristic model and refunds enabled:

```bash
AUTO_REFUND_ENABLED=true npm start
```

Or copy `.env.example` to `.env` and point it at your vLLM server.

```bash
curl -s -X POST localhost:3000/cases -H 'content-type: application/json' \
  -d '{"customerId":"cus_alice","message":"I was charged twice for ORD-1001, $49.99"}'
```

## API

| Method | Path | |
|---|---|---|
| GET | `/health` | Model in use, kill-switch state |
| POST | `/cases` | `{customerId, message}` → final case record |
| GET | `/cases` | Case summaries |
| GET | `/cases/:id` | Full case: extraction, evidence, decision, plan, execution, verification, escalation |
| GET | `/cases/:id/audit` | Ordered audit events, including raw model output |

## Demo scenarios (seeded)

| Customer | Order | Expected |
|---|---|---|
| `cus_alice` | `ORD-1001` | `resolved`: later duplicate refunded |
| `cus_alice` | `ORD-1002` | `closed_no_action`: single charge |
| `cus_bob` | `ORD-2001` | `escalated`: `over_auto_refund_limit` |
| `cus_bob` | `ORD-2002` | `escalated`: `already_refunded` |
| `cus_carol` | `ORD-3001` | `escalated`: `would_underpay_order` (split payment) |
| `cus_bob` | `ORD-1001` | `escalated`: `order_customer_mismatch` |

## Docker

```bash
docker build -t jarvis .
docker run -p 3000:3000 --env-file .env jarvis
```
