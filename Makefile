.PHONY: install build test test-coverage demo sam-build deploy deploy-guided local clean validate logs-score logs-simulate logs-feed

# ── Local development ──────────────────────────────────────────────────────

install:
	npm install

build:
	npm run build

test:
	npm test

test-coverage:
	npm run test:coverage

demo:
	npm run demo

# ── AWS SAM ────────────────────────────────────────────────────────────────

sam-build:
	sam build

validate:
	sam validate --lint

# First deployment — prompts for configuration
deploy-guided: sam-build
	sam deploy --guided

# Subsequent deployments — uses samconfig.toml
deploy: sam-build
	sam deploy

# Run API locally (requires Docker)
local: sam-build
	sam local start-api --env-vars env.local.json

# ── Logs ───────────────────────────────────────────────────────────────────

logs-score:
	sam logs --name FraudScoreFunction --stack-name fraud-risk-engine --tail

logs-simulate:
	sam logs --name FraudSimulateFunction --stack-name fraud-risk-engine --tail

logs-feed:
	sam logs --name FraudGetFeedFunction --stack-name fraud-risk-engine --tail

# ── Cleanup ─────────────────────────────────────────────────────────────────

clean:
	rm -rf dist .aws-sam

delete-stack:
	sam delete --stack-name fraud-risk-engine
	@echo "Note: DynamoDB table has DeletionPolicy=Retain and must be deleted manually if desired."
