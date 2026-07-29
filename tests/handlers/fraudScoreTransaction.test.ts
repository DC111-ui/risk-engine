import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

// ── Hoist mock refs so they're available inside vi.mock factories ──────────
const { mockSave, mockBuildStoredItem } = vi.hoisted(() => ({
  mockSave:           vi.fn().mockResolvedValue(undefined),
  mockBuildStoredItem: vi.fn().mockReturnValue({ transactionId: 'txn_mock' }),
}));

vi.mock('../../src/services/transactionStore', () => ({
  TransactionStore: vi.fn().mockImplementation(() => ({ save: mockSave })),
}));

vi.mock('../../src/services/scoreService', () => ({
  runScoring: vi.fn().mockReturnValue({
    transactionId: 'txn_test_001',
    userId: 'user_test_001',
    riskScore: 0,
    decision: 'APPROVE',
    severity: 'LOW',
    triggeredSignals: [],
    reasons: [],
    metadata: {
      evaluatedAt: '2024-06-15T14:00:00.000Z',
      signalCount: 0,
      topSignalCode: null,
      topSignalWeight: 0,
      scoreBreakdown: [],
    },
  }),
  buildStoredItem: mockBuildStoredItem,
}));

import { handler } from '../../src/handlers/fraudScoreTransaction';

// ── Helpers ───────────────────────────────────────────────────────────────

function buildEvent(body?: unknown): APIGatewayProxyEventV2 {
  return {
    body: body !== undefined ? JSON.stringify(body) : undefined,
    pathParameters: {},
    queryStringParameters: {},
    headers: { 'content-type': 'application/json' },
    requestContext: { http: { method: 'POST' } },
  } as unknown as APIGatewayProxyEventV2;
}

const validTransaction = {
  transactionId: 'txn_test_001',
  userId: 'user_test_001',
  amount: 50,
  currency: 'USD',
  merchant: 'Test Merchant',
  merchantCategory: 'RETAIL',
  country: 'US',
  ipCountry: 'US',
  deviceId: 'device_001',
  timestamp: '2024-06-15T14:00:00.000Z',
};

const validContext = {
  userId: 'user_test_001',
  userHomeCountry: 'US',
  recentCountries: ['US'],
  recentDistinctCountries1h: ['US'],
  lastSeenDeviceIds: ['device_001'],
  isKnownDevice: true,
  avgHistoricalAmount: 60,
  stdDevAmount: 20,
  userTypicalMerchantCategories: ['RETAIL'],
  recentMerchants: [],
  recentTransactionCount1m: 0,
  recentTransactionCount5m: 0,
  recentTransactionCount1h: 1,
  recentDeclines: 0,
  recentAttempts: 1,
  accountAgeDays: 365,
  priorChargebacks: 0,
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /fraud/score handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    mockBuildStoredItem.mockReturnValue({ transactionId: 'txn_mock' });
  });

  describe('successful scoring', () => {
    it('returns 200 with RiskDecision and persisted=true on valid input', async () => {
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(true);
      expect(body.result).toBeDefined();
      expect(body.result.transactionId).toBe('txn_test_001');
      expect(body.result.decision).toBe('APPROVE');
      expect(body.persisted).toBe(true);
    });

    it('calls store.save when persist is true (default)', async () => {
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      await handler(event);
      expect(mockSave).toHaveBeenCalledOnce();
    });

    it('does NOT call store.save when persist=false', async () => {
      const event = buildEvent({
        transaction: validTransaction,
        context: validContext,
        persist: false,
      });
      const response = await handler(event);
      expect(mockSave).not.toHaveBeenCalled();
      const body = JSON.parse(response.body as string);
      expect(body.persisted).toBe(false);
    });

    it('returns persisted=false but still 200 when DynamoDB throws', async () => {
      mockSave.mockRejectedValueOnce(new Error('DynamoDB connection timeout'));
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      const response = await handler(event);

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(true);
      expect(body.persisted).toBe(false);
    });

    it('returns correct CORS header', async () => {
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      const response = await handler(event);
      const headers = response.headers as Record<string, string>;
      expect(headers['Access-Control-Allow-Origin']).toBeDefined();
    });
  });

  describe('validation errors', () => {
    it('returns 400 when body is absent', async () => {
      const response = await handler(buildEvent());
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(false);
      expect(body.code).toBe('MISSING_BODY');
    });

    it('returns 400 when body is not valid JSON', async () => {
      const event = { ...buildEvent(), body: 'not-json' } as unknown as APIGatewayProxyEventV2;
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when transaction is missing', async () => {
      const event = buildEvent({ context: validContext });
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.code).toBe('MISSING_TRANSACTION');
    });

    it('returns 400 when context is missing', async () => {
      const event = buildEvent({ transaction: validTransaction });
      const response = await handler(event);
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.code).toBe('MISSING_CONTEXT');
    });
  });

  describe('response shape', () => {
    it('response body contains ok, result, and persisted fields', async () => {
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      const response = await handler(event);
      const body = JSON.parse(response.body as string);
      expect(body).toHaveProperty('ok');
      expect(body).toHaveProperty('result');
      expect(body).toHaveProperty('persisted');
    });

    it('Content-Type header is application/json', async () => {
      const event = buildEvent({ transaction: validTransaction, context: validContext });
      const response = await handler(event);
      const headers = response.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
