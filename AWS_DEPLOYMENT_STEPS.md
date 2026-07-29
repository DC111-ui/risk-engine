# AWS Deployment Guide
### AI Fraud Detection & Transaction Risk Engine — Phase 2

This document tells you exactly what to do, step by step, to deploy the fraud risk engine backend to AWS. Follow it in order. Do not skip steps.

---

## What Gets Deployed

| Resource | Type | Purpose |
|---|---|---|
| `fraud-risk-engine-transactions-prod` | DynamoDB table | Stores scored transactions + feed |
| `fraud-risk-engine-score-prod` | Lambda function | POST /fraud/score |
| `fraud-risk-engine-simulate-prod` | Lambda function | POST /fraud/simulate/{scenario} |
| `fraud-risk-engine-get-feed-prod` | Lambda function | GET /fraud/feed |
| `fraud-risk-engine-health-prod` | Lambda function | GET /fraud/health |
| HTTP API (auto-named) | API Gateway v2 | Public API entry point |
| `fraud-risk-engine-lambda-exec-prod` | IAM Role | Lambda execution permissions |
| `/aws/lambda/fraud-risk-engine-*` | CloudWatch Log Groups | Lambda logs (30-day retention) |

Everything is defined in `template.yaml` (AWS SAM format, which compiles to standard CloudFormation).

---

## Prerequisites

Before you start, you need these installed and configured on your machine.

### 1. AWS Account

You need an active AWS account. If you don't have one: https://aws.amazon.com/free

### 2. AWS CLI v2

Check if installed:
```bash
aws --version
# Should show: aws-cli/2.x.x
```

If not installed, download from: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

Configure your credentials:
```bash
aws configure
```

You will be prompted for:
- **AWS Access Key ID** — from your IAM user or SSO
- **AWS Secret Access Key** — from your IAM user or SSO
- **Default region** — choose one (recommended: `us-east-1` or your nearest region)
- **Default output format** — enter `json`

Verify configuration works:
```bash
aws sts get-caller-identity
# Should print your account ID, user ARN, and user ID
```

### 3. AWS SAM CLI

Check if installed:
```bash
sam --version
# Should show: SAM CLI, version 1.x.x
```

If not installed: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

### 4. Node.js 20+

```bash
node --version
# Should show: v20.x.x or higher
```

If not installed: https://nodejs.org

### 5. IAM Permissions

The AWS identity you're using (`aws sts get-caller-identity`) must have permission to:
- Create/update Lambda functions
- Create/update DynamoDB tables
- Create/update API Gateway APIs
- Create/update IAM roles and policies
- Create/update CloudFormation stacks
- Create/update CloudWatch Log Groups
- Read/write to an S3 bucket (SAM uses this to stage deployment artifacts)

If you're deploying from your personal account root or admin user, you already have these. If you're using a scoped IAM user, attach `AdministratorAccess` or a custom policy covering the above.

---

## Step 1 — Clone and Install

Navigate to the project directory and install dependencies:

```bash
cd risk-engine
npm install
```

Verify all tests pass before deploying:
```bash
npm test
# Expected: 111 tests passed
```

---

## Step 2 — Configure Your Region

Open `samconfig.toml` in a text editor.

Find this line:
```toml
region = "us-east-1"
```

Change `us-east-1` to your preferred AWS region. Examples:
- `us-east-1` — US East (N. Virginia) — recommended, cheapest
- `eu-west-1` — Europe (Ireland)
- `ap-southeast-2` — Asia Pacific (Sydney)

**Tip:** Use the region closest to where your portfolio site visitors are, or just use `us-east-1` since it has the most AWS services available.

---

## Step 3 — Build the SAM Application

SAM uses esbuild to compile your TypeScript handlers into deployable Lambda artifacts.

```bash
sam build
```

What this does:
- Reads `template.yaml`
- Compiles each handler (`src/handlers/*.ts`) with esbuild
- Bundles each Lambda function with its dependencies
- Outputs to `.aws-sam/build/`

Expected output:
```
Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml
```

If you see TypeScript errors, fix them before proceeding.

---

## Step 4 — First Deployment (Guided)

For your first deployment, use the guided mode. This creates the S3 bucket for deployment artifacts and prompts you to confirm settings.

```bash
sam deploy --guided
```

You will be prompted with the following. Accept defaults where shown, or change as noted:

```
Stack Name [fraud-risk-engine]:
  → Press Enter (uses the name from samconfig.toml)

AWS Region [us-east-1]:
  → Press Enter or type your chosen region

Parameter Stage [prod]:
  → Press Enter

Parameter ProjectName [fraud-risk-engine]:
  → Press Enter

Parameter CorsAllowOrigin [*]:
  → Press Enter (use * for now; change to your domain later)

Confirm changes before deploy [y/N]:
  → Type N and Enter

Allow SAM CLI IAM role creation [Y/n]:
  → Press Enter (required — SAM creates the Lambda IAM role)

Disable rollback [y/N]:
  → Type N and Enter

FraudScoreFunction may not have authorization defined. Is this OK? [y/N]:
  → Type y and Enter (your API is public — intentional for portfolio demo)
  
  (You will see this for each function — type y for all of them)

Save arguments to configuration file [Y/n]:
  → Press Enter (saves settings to samconfig.toml for future deploys)

SAM configuration file [samconfig.toml]:
  → Press Enter

SAM configuration environment [default]:
  → Press Enter
```

SAM will then:
1. Create an S3 bucket for deployment artifacts
2. Upload the compiled Lambda zips to S3
3. Create a CloudFormation changeset
4. Deploy the stack

Deployment takes approximately 2–4 minutes.

---

## Step 5 — Confirm Deployment Succeeded

At the end of `sam deploy`, you will see an **Outputs** section printed to the terminal. Copy and save these values — you will need them.

Example output (your URLs will have a different API ID):
```
Key         ApiBaseUrl
Value       https://abc123def4.execute-api.us-east-1.amazonaws.com/prod
Description API Gateway base URL — set this as FRAUD_API_URL in your frontend

Key         ScoreEndpoint
Value       https://abc123def4.execute-api.us-east-1.amazonaws.com/prod/fraud/score

Key         FeedEndpoint
Value       https://abc123def4.execute-api.us-east-1.amazonaws.com/prod/fraud/feed

Key         DynamoTableName
Value       fraud-risk-engine-transactions-prod
```

If the deployment fails and rolls back, see the **Troubleshooting** section at the bottom of this file.

---

## Step 6 — Verify in the AWS Console

Log into the AWS Console and confirm these resources exist.

### DynamoDB
1. Go to **DynamoDB → Tables**
2. Find: `fraud-risk-engine-transactions-prod`
3. Click on it → **Indexes** tab
4. Confirm `FeedIndex` exists with `feedPartition` (HASH) and `feedTimestamp` (RANGE)

### Lambda
1. Go to **Lambda → Functions**
2. Confirm these four functions exist:
   - `fraud-risk-engine-score-prod`
   - `fraud-risk-engine-simulate-prod`
   - `fraud-risk-engine-get-feed-prod`
   - `fraud-risk-engine-health-prod`
3. Click any function → **Configuration** → **Environment variables**
4. Confirm `DYNAMODB_TABLE_NAME` is set to `fraud-risk-engine-transactions-prod`

### API Gateway
1. Go to **API Gateway → APIs**
2. Find the HTTP API named or with description "Fraud Risk Engine API — prod"
3. Click it → **Routes**
4. Confirm these routes exist:
   - `POST /fraud/score`
   - `POST /fraud/simulate/{scenario}`
   - `GET /fraud/feed`
   - `GET /fraud/health`

---

## Step 7 — Smoke Test the API

Use these `curl` commands to verify the deployed API is working. Replace `YOUR_API_URL` with the `ApiBaseUrl` from Step 5 output.

### Health check
```bash
curl https://YOUR_API_URL/fraud/health
```
Expected response:
```json
{
  "ok": true,
  "service": "fraud-risk-engine",
  "version": "2.0.0",
  "timestamp": "2024-...",
  "region": "us-east-1",
  "stage": "prod"
}
```

### Score a transaction
```bash
curl -X POST https://YOUR_API_URL/fraud/score \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "transactionId": "txn_manual_test_001",
      "userId": "user_test_001",
      "amount": 85.50,
      "currency": "USD",
      "merchant": "Whole Foods Market",
      "merchantCategory": "GROCERY",
      "country": "US",
      "ipCountry": "US",
      "deviceId": "device_test_001",
      "timestamp": "2024-06-15T14:32:00.000Z"
    },
    "context": {
      "userId": "user_test_001",
      "userHomeCountry": "US",
      "recentCountries": ["US"],
      "recentDistinctCountries1h": ["US"],
      "lastSeenDeviceIds": ["device_test_001"],
      "isKnownDevice": true,
      "avgHistoricalAmount": 90.00,
      "stdDevAmount": 25.00,
      "userTypicalMerchantCategories": ["GROCERY", "RETAIL"],
      "recentMerchants": ["Whole Foods Market"],
      "recentTransactionCount1m": 0,
      "recentTransactionCount5m": 0,
      "recentTransactionCount1h": 1,
      "recentDeclines": 0,
      "recentAttempts": 1,
      "accountAgeDays": 730,
      "priorChargebacks": 0
    },
    "persist": true
  }'
```
Expected: `"decision": "APPROVE"`, `"persisted": true`

### Run a simulation
```bash
curl -X POST https://YOUR_API_URL/fraud/simulate/card-testing
```
Expected: `"generatedCount": 10`, `"writtenToDynamo": true`

### Read the feed
```bash
curl "https://YOUR_API_URL/fraud/feed?limit=5"
```
Expected: array of items including the simulated transactions you just injected.

---

## Step 8 — Subsequent Deployments

After the first guided deployment, any code changes can be deployed with:

```bash
sam build && sam deploy
```

Or using Make:
```bash
make deploy
```

SAM will compute a diff, create a changeset, and apply only the changes. This usually takes 30–60 seconds for Lambda-only changes.

---

## Step 9 — Update CORS for Your Portfolio Domain

Once your portfolio site is live at `darlingtonchanakira.com`, restrict CORS to your domain.

In `samconfig.toml`, change:
```toml
parameter_overrides = "Stage=prod ProjectName=fraud-risk-engine CorsAllowOrigin=*"
```
To:
```toml
parameter_overrides = "Stage=prod ProjectName=fraud-risk-engine CorsAllowOrigin=https://darlingtonchanakira.com"
```

Then redeploy:
```bash
sam build && sam deploy
```

---

## Viewing Logs

### Stream logs in real time
```bash
# Score function logs
sam logs --name FraudScoreFunction --stack-name fraud-risk-engine --tail

# Simulate function logs
sam logs --name FraudSimulateFunction --stack-name fraud-risk-engine --tail

# Feed function logs
sam logs --name FraudGetFeedFunction --stack-name fraud-risk-engine --tail
```

Or in the AWS Console: **CloudWatch → Log Groups → /aws/lambda/fraud-risk-engine-{name}-prod**

---

## Common Failure Points and Fixes

### `Error: CAPABILITY_NAMED_IAM is required`
**Cause:** SAM needs permission to create named IAM roles.
**Fix:** Ensure `capabilities = "CAPABILITY_IAM CAPABILITY_NAMED_IAM"` is in `samconfig.toml`. It should be there by default.

### `Error: Role already exists`
**Cause:** A previous partial deployment left an IAM role behind.
**Fix:** Go to **IAM → Roles** in the console, find `fraud-risk-engine-lambda-exec-prod`, delete it manually, then retry.

### `Error: S3 bucket does not exist` or `resolve_s3 error`
**Cause:** SAM couldn't create or find the artifact bucket.
**Fix:** Run `sam deploy --guided` again and let SAM create the bucket interactively.

### Lambda function timeout (5xx from API)
**Cause:** Cold start on first invocation can be slow; DynamoDB unavailable.
**Fix:** Invoke the health endpoint first to warm the function. Check CloudWatch logs for the specific error.

### `ResourceConflict` on CloudFormation update
**Cause:** A previous deploy is still in progress, or failed mid-way.
**Fix:** Go to **CloudFormation → Stacks → fraud-risk-engine**, wait for it to stabilise, then redeploy.

### DynamoDB table not found in Lambda
**Cause:** `DYNAMODB_TABLE_NAME` env var mismatch.
**Fix:** In Lambda console, verify the `DYNAMODB_TABLE_NAME` environment variable matches the actual table name shown in DynamoDB.

### CORS errors from frontend
**Cause:** `CorsAllowOrigin` not set to your domain.
**Fix:** Update `samconfig.toml` with the correct origin and redeploy.

### `sam build` TypeScript compilation errors
**Fix:** Run `npm test` first to identify the TypeScript issue. Fix the error, then retry `sam build`.

---

## Local Testing with SAM (Optional)

You can run the API locally using Docker before deploying to AWS.

Prerequisites:
- Docker Desktop installed and running

Steps:
1. Start a local DynamoDB instance (optional, needed only if testing persistence):
   ```bash
   docker run -p 8000:8000 amazon/dynamodb-local
   ```

2. Update `env.local.json` to point `DYNAMODB_TABLE_NAME` to your table if using AWS DynamoDB, or to a local table name.

3. Start the local API:
   ```bash
   sam local start-api --env-vars env.local.json
   ```

4. Test locally:
   ```bash
   curl http://localhost:3000/fraud/health
   ```

**Note:** Local SAM uses Docker to emulate Lambda. First invocation downloads the Lambda container image (~1GB) — this is a one-time download.

---

## Cleanup — Deleting the Stack

To tear down all resources:

```bash
sam delete --stack-name fraud-risk-engine
```

**Important:** The DynamoDB table has `DeletionPolicy: Retain`. This means CloudFormation will NOT delete the table when the stack is deleted — your transaction data is preserved. If you want to delete the table too, do it manually:

```bash
aws dynamodb delete-table --table-name fraud-risk-engine-transactions-prod
```

---

## Estimated AWS Costs

For a portfolio/demo workload (low traffic):

| Service | Estimated monthly cost |
|---|---|
| Lambda (pay-per-invocation) | < $0.01 at demo traffic levels |
| API Gateway HTTP API | < $0.01 at demo traffic levels |
| DynamoDB (on-demand) | < $0.01 for small data volumes |
| CloudWatch Logs | < $0.01 for 30-day retention |
| X-Ray (tracing) | Free tier covers demo usage |
| **Total** | **Essentially free at demo scale** |

The main cost to watch is DynamoDB storage if you inject thousands of simulated transactions. At $0.25/GB, you'd need hundreds of thousands of records to incur meaningful cost.

---

## What to Do Next (Phase 3 Preview)

Once this phase is deployed and verified:

1. **Add the API URL to your portfolio site** as `FRAUD_API_URL`
2. **Build the live fraud console frontend** — transaction feed table, risk score cards, signal drilldown panel
3. **Add Bedrock AI summaries** — pipe `triggeredSignals` into Claude for natural-language explanations
4. **Add WebSocket / SSE streaming** — real-time transaction stream for the demo page
5. **Add CloudWatch dashboards** — show latency, invocation counts, error rates in the portfolio

---

## Quick Reference Card

```bash
# Install
npm install

# Test
npm test

# Build
sam build

# First deploy (interactive)
sam deploy --guided

# Update deploy
sam build && sam deploy

# Stream logs
sam logs --name FraudScoreFunction --stack-name fraud-risk-engine --tail

# Local API
sam local start-api --env-vars env.local.json

# Delete stack (keeps DynamoDB table)
sam delete --stack-name fraud-risk-engine
```

API endpoints after deploy:
```
GET  {ApiBaseUrl}/fraud/health
POST {ApiBaseUrl}/fraud/score
POST {ApiBaseUrl}/fraud/simulate/card-testing
POST {ApiBaseUrl}/fraud/simulate/impossible-travel
POST {ApiBaseUrl}/fraud/simulate/account-takeover
POST {ApiBaseUrl}/fraud/simulate/merchant-spike
GET  {ApiBaseUrl}/fraud/feed?limit=20
```
