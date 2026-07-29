import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const { mockGetLatestFeed } = vi.hoisted(() => ({
  mockGetLatestFeed: vi.fn(),
}));

vi.mock('../../src/services/transactionStore', () => ({
  TransactionStore: vi.fn().mockImplementation(() => ({
    getLatestFeed: mockGetLatestFeed,
  })),
}));

import { handler } from '../../src/handlers/fraudGetFeed';

const MOCK_ITEMS = [
  {
    transactionId: 'txn_feed_001',
    feedTimestamp: '2024-06-15T14:00:00.000Z#txn_feed_001',
    timestamp: '2024-06-15T14:00:00.000Z',
    userId: 'user_001',
    merchant: 'Amazon',
    merchantCategory: 'RETAIL',
    amount: 85,
    currency: 'USD',
    country: 'US',
    riskScore: 0,
    decision: 'APPROVE',
    severity: 'LOW',
    triggeredSignals: [],
    signalCount: 0,
    topSignalCode: null,
    scenarioType: 'manual',
    isSynthetic: false,
    evaluatedAt: '2024-06-15T14:00:00.000Z',
  },
  {
    transactionId: 'txn_feed_002',
    feedTimestamp: '2024-06-15T13:00:00.000Z#txn_feed_002',
    timestamp: '2024-06-15T13:00:00.000Z',
    userId: 'user_002',
    merchant: 'BitVault',
    merchantCategory: 'CRYPTO_EXCHANGE',
    amount: 2500,
    currency: 'USD',
    country: 'MX',
    riskScore: 95,
    decision: 'BLOCK',
    severity: 'CRITICAL',
    triggeredSignals: [{ code: 'EXCESSIVE_DECLINES', weight: 35, severity: 'CRITICAL', message: 'test' }],
    signalCount: 1,
    topSignalCode: 'EXCESSIVE_DECLINES',
    scenarioType: 'account-takeover',
    isSynthetic: true,
    evaluatedAt: '2024-06-15T13:00:00.000Z',
  },
];

function buildEvent(query?: Record<string, string>): APIGatewayProxyEventV2 {
  return {
    queryStringParameters: query ?? {},
    pathParameters: {},
    body: null,
    headers: {},
    requestContext: { http: { method: 'GET' } },
  } as unknown as APIGatewayProxyEventV2;
}

describe('GET /fraud/feed handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLatestFeed.mockResolvedValue(MOCK_ITEMS);
  });

  describe('successful feed retrieval', () => {
    it('returns 200 with items array', async () => {
      const response = await handler(buildEvent());
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.items)).toBe(true);
      expect(body.count).toBe(MOCK_ITEMS.length);
    });

    it('items are returned as-is from the store', async () => {
      const response = await handler(buildEvent());
      const body = JSON.parse(response.body as string);
      expect(body.items[0].transactionId).toBe('txn_feed_001');
      expect(body.items[1].decision).toBe('BLOCK');
    });

    it('calls getLatestFeed with default limit (20) when no query param', async () => {
      await handler(buildEvent());
      expect(mockGetLatestFeed).toHaveBeenCalledWith(20);
    });

    it('respects limit query parameter', async () => {
      await handler(buildEvent({ limit: '5' }));
      expect(mockGetLatestFeed).toHaveBeenCalledWith(5);
    });

    it('caps limit at 100', async () => {
      await handler(buildEvent({ limit: '500' }));
      expect(mockGetLatestFeed).toHaveBeenCalledWith(100);
    });

    it('returns empty items array when store returns nothing', async () => {
      mockGetLatestFeed.mockResolvedValueOnce([]);
      const response = await handler(buildEvent());
      const body = JSON.parse(response.body as string);
      expect(body.items).toEqual([]);
      expect(body.count).toBe(0);
    });

    it('returns full FeedItem shape including triggeredSignals', async () => {
      const response = await handler(buildEvent());
      const body = JSON.parse(response.body as string);
      const blockItem = body.items.find((i: { decision: string }) => i.decision === 'BLOCK');
      expect(blockItem).toBeDefined();
      expect(blockItem.triggeredSignals).toBeDefined();
      expect(blockItem.topSignalCode).toBe('EXCESSIVE_DECLINES');
    });
  });

  describe('validation errors', () => {
    it('returns 400 for non-numeric limit', async () => {
      const response = await handler(buildEvent({ limit: 'abc' }));
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.code).toBe('INVALID_LIMIT');
    });

    it('returns 400 for limit=0', async () => {
      const response = await handler(buildEvent({ limit: '0' }));
      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for negative limit', async () => {
      const response = await handler(buildEvent({ limit: '-5' }));
      expect(response.statusCode).toBe(400);
    });
  });

  describe('error handling', () => {
    it('returns 500 when store throws', async () => {
      mockGetLatestFeed.mockRejectedValueOnce(new Error('DynamoDB unavailable'));
      const response = await handler(buildEvent());
      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(false);
      expect(body.code).toBe('FEED_FAILED');
    });
  });
});
