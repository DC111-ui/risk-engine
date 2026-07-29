# AI Fraud Detection & Transaction Risk Engine

A production-style, AWS-hosted fraud scoring backend for financial transactions. Built as the cloud backbone for a live portfolio demo at [darlingtonchanakira.com](https://darlingtonchanakira.com).

This is the combined Phase 1 (deterministic scoring engine) + Phase 2 (AWS API + storage layer) release.

---

## Architecture Overview

```
Client / Portfolio Frontend
         │
         ▼
  API Gateway (HTTP API v2)
         │
    ┌────┴────┬──────────────┬──────────────┐
    ▼         ▼              ▼              ▼
 Lambda    Lambda         Lambda         Lambda
 /score   /simulate      /feed          /health
    │         │              │
    └────┬────┘              │
         ▼                   ▼
    Risk Engine         DynamoDB
  (deterministic         Table
    TypeScript)      FeedIndex (GSI)
```

**AWS services used:** Lambda · API Gateway v2 · DynamoDB · IAM · CloudWatch Logs · X-Ray

**Deployment:** AWS SAM (CloudFormation with `AWS::Serverless` transform)

---

## API Endpoints

Base URL is printed after `sam deploy` as the `ApiBaseUrl` output.

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/fraud/health` | Smoke-test health check |
| `POST` | `/fraud/score` | Score a transaction; optionally persist to DynamoDB |
| `POST` | `/fraud/simulate/{scenario}` | Inject a synthetic fraud burst; stores all results |
| `GET`  | `/fraud/feed` | Latest scored transactions, newest first |

### POST /fraud/score

**Request body:**
```json
{
  "transaction": {
    "transactionId": "txn_001",
    "userId": "user_alice",
    "amount": 85.50,
    "currency": "USD",
    "merchant": "Whole Foods",
    "merchantCategory": "GROCERY",
    "country": "US",
    "ipCountry": "US",
    "deviceId": "device_iphone",
    "timestamp": "2024-06-15T14:32:00.000Z"
  },
  "context": { ... UserContext ... },
  "persist": true
}
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "transactionId": "txn_001",
    "riskScore": 0,
    "decision": "APPROVE",
    "severity": "LOW",
    "triggeredSignals": [],
    "reasons": [],
    "metadata": { ... }
  },
  "persisted": true
}
```

### POST /fraud/simulate/{scenario}

Supported scenarios: `card-testing` · `impossible-travel` · `account-takeover` · `merchant-spike`

**Response:**
```json
{
  "ok": true,
  "scenario": "card-testing",
  "generatedCount": 10,
  "decisionBreakdown": { "APPROVE": 1, "REVIEW": 2, "BLOCK": 7 },
  "writtenToDynamo": true,
  "startedAt": "...",
  "completedAt": "..."
}
```

### GET /fraud/feed?limit=20

**Response:**
```json
{
  "ok": true,
  "count": 20,
  "items": [
    {
      "transactionId": "...",
      "timestamp": "...",
      "merchant": "BitVault Exchange",
      "amount": 4999,
      "currency": "USD",
      "riskScore": 100,
      "decision": "BLOCK",
      "severity": "CRITICAL",
      "triggeredSignals": [ ... ],
      "topSignalCode": "EXCESSIVE_DECLINES",
      "isSynthetic": true,
      "scenarioType": "account-takeover"
    }
  ]
}
```

---

## Scoring Logic

The engine is deterministic and explainable — no AI in the scoring path.

| Score Band | Decision | Severity |
|---|---|---|
| 0–39 | APPROVE | LOW |
| 40–69 | REVIEW | MEDIUM |
| 70–84 | BLOCK | HIGH |
| 85–100 | BLOCK | CRITICAL |

22 risk signals covering: new device, cross-border mismatch, impossible travel, velocity bursts, card testing patterns, IP/BIN country mismatch, amount anomalies, account age, prior chargebacks, high-risk countries, risky merchant categories, and more.

See the full signal table in the [signal catalogue](src/scoring/signals.ts).

---

## DynamoDB Table Design

**Table:** `fraud-risk-engine-transactions-prod`

| Attribute | Key Type | Notes |
|---|---|---|
| `transactionId` | Table PK | Unique per scored event |
| `feedPartition` | GSI PK | Always `"LIVE"` — partitions the live feed |
| `feedTimestamp` | GSI SK | `ISO_TIMESTAMP#transactionId` — unique + chronological |

**GSI:** `FeedIndex` — enables efficient newest-first feed queries without full table scan.

Composite sort key (`feedTimestamp`) ensures uniqueness within a timestamp — critical for batch simulation where many events share the same second.

---

## Project Structure

```
risk-engine/
├── src/
│   ├── handlers/                   # Lambda entry points
│   │   ├── fraudScoreTransaction.ts
│   │   ├── fraudSimulateScenario.ts
│   │   ├── fraudGetFeed.ts
│   │   └── fraudHealth.ts
│   ├── services/                   # Business logic / persistence
│   │   ├── scoreService.ts
│   │   ├── transactionStore.ts     # DynamoDB layer
│   │   └── scenarioService.ts
│   ├── models/                     # Domain types
│   │   ├── transaction.ts
│   │   └── context.ts
│   ├── scoring/                    # Core risk engine
│   │   ├── engine.ts
│   │   ├── rules.ts
│   │   └── signals.ts
│   ├── scenarios/                  # Demo data generators
│   │   ├── seeds.ts
│   │   └── attackPatterns.ts
│   ├── types/
│   │   └── api.ts                  # Request/response contracts
│   └── utils/
│       ├── lambdaResponse.ts       # HTTP response helpers
│       └── helpers.ts              # CLI output helpers
├── tests/
│   ├── engine.test.ts              # Core engine (51 tests)
│   ├── handlers/                   # Handler unit tests
│   │   ├── fraudScoreTransaction.test.ts
│   │   ├── fraudSimulateScenario.test.ts
│   │   └── fraudGetFeed.test.ts
│   └── services/                   # Service unit tests
│       ├── transactionStore.test.ts
│       └── scenarioService.test.ts
├── template.yaml                   # SAM / CloudFormation template
├── samconfig.toml                  # SAM deployment config
├── Makefile                        # Dev shortcuts
├── AWS_DEPLOYMENT_STEPS.md         # Step-by-step deploy guide
├── demo.ts                         # Local CLI scenario runner
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Run Locally (no AWS required)

```bash
npm install
npm test        # 111 tests
npm run demo    # Scenario runner with formatted output
```

### Deploy to AWS

You need AWS CLI + SAM CLI installed. Then:

```bash
npm install
npm test
sam build
sam deploy --guided   # first time
```

**For the complete deployment walkthrough, see [AWS_DEPLOYMENT_STEPS.md](AWS_DEPLOYMENT_STEPS.md).**

It covers prerequisites, configuration, step-by-step commands, verification curl commands, troubleshooting, and cleanup.

---

## Test Coverage

**111 tests across 6 test files:**

| Test File | Tests | What it covers |
|---|---|---|
| `tests/engine.test.ts` | 51 | Risk engine: all signals, decision bands, edge cases |
| `tests/handlers/fraudScoreTransaction.test.ts` | 11 | Score handler: request validation, persistence, errors |
| `tests/handlers/fraudSimulateScenario.test.ts` | 8 | Simulate handler: scenarios, DynamoDB failures |
| `tests/handlers/fraudGetFeed.test.ts` | 11 | Feed handler: pagination, limit validation, errors |
| `tests/services/transactionStore.test.ts` | 13 | DynamoDB: save, batch write chunking, feed query |
| `tests/services/scenarioService.test.ts` | 17 | Batch generation: all 4 scenarios, item shape |

---

## CloudFormation / SAM Template

`template.yaml` provisions all AWS resources. Key highlights:

- **DynamoDB** with `DeletionPolicy: Retain` — table survives stack deletion
- **IAM role** with least-privilege DynamoDB + X-Ray write access
- **HTTP API** (API Gateway v2) with configurable CORS
- **4 Lambda functions** built from TypeScript via SAM esbuild
- **CloudWatch Log Groups** with 30-day retention
- **X-Ray tracing** enabled on all Lambdas
- **Stack Outputs** print all endpoint URLs after deploy

---

## Planned Phases

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Deterministic scoring engine, signals, scenarios, tests | ✅ Complete |
| Phase 2 | AWS Lambda + API Gateway + DynamoDB | ✅ Complete |
| Phase 3 | Real-time streaming — WebSocket/SSE transaction feed | Planned |
| Phase 4 | Frontend fraud console — live table, alert cards, drilldown | Planned |
| Phase 5 | AI explanation layer — Claude API for fraud summaries | Planned |
| Phase 6 | CloudWatch dashboards, alerts, operational hardening | Planned |

---

## Author

**Darlington Chanakira** — Cloud & DevOps Engineer  
[darlingtonchanakira.com](https://darlingtonchanakira.com)
