import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist mock refs ────────────────────────────────────────────────────────
const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn().mockReturnValue({ send: mockSend }),
  },
  PutCommand:        vi.fn().mockImplementation((input) => ({ _type: 'Put',        input })),
  QueryCommand:      vi.fn().mockImplementation((input) => ({ _type: 'Query',      input })),
  BatchWriteCommand: vi.fn().mockImplementation((input) => ({ _type: 'BatchWrite', input })),
}));

import { TransactionStore, StoredTransactionItem } from '../../src/services/transactionStore';

function makeItem(overrides: Partial<StoredTransactionItem> = {}): StoredTransactionItem {
  return {
    transactionId:   'txn_store_test',
    feedPartition:   'LIVE',
    feedTimestamp:   '2024-06-15T14:00:00.000Z#txn_store_test',
    timestamp:       '2024-06-15T14:00:00.000Z',
    userId:          'user_001',
    merchant:        'Test Merchant',
    merchantCategory: 'RETAIL',
    amount:          50,
    currency:        'USD',
    country:         'US',
    ipCountry:       'US',
    deviceId:        'device_001',
    riskScore:       0,
    decision:        'APPROVE',
    severity:        'LOW',
    triggeredSignals: '[]',
    reasons:         [],
    signalCount:     0,
    topSignalCode:   null,
    scoreBreakdown:  '[]',
    scenarioType:    'manual',
    isSynthetic:     false,
    evaluatedAt:     '2024-06-15T14:00:00.000Z',
    scoreVersion:    '1.0',
    ...overrides,
  };
}

describe('TransactionStore', () => {
  let store: TransactionStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({});
    store = new TransactionStore({ tableName: 'test-table' });
  });

  // ── save ──────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('calls docClient.send with a PutCommand', async () => {
      await store.save(makeItem());
      expect(mockSend).toHaveBeenCalledOnce();
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd._type).toBe('Put');
    });

    it('passes the item to the PutCommand', async () => {
      const item = makeItem({ transactionId: 'txn_123' });
      await store.save(item);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Item.transactionId).toBe('txn_123');
      expect(cmd.input.TableName).toBe('test-table');
    });

    it('propagates DynamoDB errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('ProvisionedThroughputExceededException'));
      await expect(store.save(makeItem())).rejects.toThrow('ProvisionedThroughputExceededException');
    });
  });

  // ── saveBatch ─────────────────────────────────────────────────────────────

  describe('saveBatch()', () => {
    it('does nothing for an empty array', async () => {
      await store.saveBatch([]);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('sends one BatchWriteCommand for <= 25 items', async () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        makeItem({ transactionId: `txn_${i}`, feedTimestamp: `2024-06-15T14:00:00.000Z#txn_${i}` }),
      );
      await store.saveBatch(items);
      expect(mockSend).toHaveBeenCalledOnce();
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd._type).toBe('BatchWrite');
    });

    it('splits into multiple calls when items exceed 25', async () => {
      const items = Array.from({ length: 30 }, (_, i) =>
        makeItem({ transactionId: `txn_${i}`, feedTimestamp: `2024-06-15T14:00:${String(i).padStart(2,'0')}.000Z#txn_${i}` }),
      );
      await store.saveBatch(items);
      expect(mockSend).toHaveBeenCalledTimes(2); // 25 + 5
    });

    it('first batch contains exactly 25 items', async () => {
      const items = Array.from({ length: 30 }, (_, i) =>
        makeItem({ transactionId: `txn_${i}`, feedTimestamp: `ts_${i}#txn_${i}` }),
      );
      await store.saveBatch(items);
      const firstCall = mockSend.mock.calls[0][0];
      const firstBatch: unknown[] = Object.values(firstCall.input.RequestItems)[0] as unknown[];
      expect(firstBatch).toHaveLength(25);
    });
  });

  // ── getLatestFeed ─────────────────────────────────────────────────────────

  describe('getLatestFeed()', () => {
    it('queries the FeedIndex with feedPartition=LIVE', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await store.getLatestFeed(10);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd._type).toBe('Query');
      expect(cmd.input.IndexName).toBe('FeedIndex');
      expect(cmd.input.ScanIndexForward).toBe(false);
    });

    it('passes the requested limit to DynamoDB', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await store.getLatestFeed(15);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Limit).toBe(15);
    });

    it('caps the limit at 200', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      await store.getLatestFeed(500);
      const [cmd] = mockSend.mock.calls[0];
      expect(cmd.input.Limit).toBe(200);
    });

    it('returns empty array when DynamoDB returns no Items', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });
      const result = await store.getLatestFeed();
      expect(result).toEqual([]);
    });

    it('deserializes stored items into FeedItem shape', async () => {
      const rawItem = {
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
        triggeredSignals: '[]',
        signalCount: 0,
        topSignalCode: null,
        scenarioType: 'manual',
        isSynthetic: false,
        evaluatedAt: '2024-06-15T14:00:00.000Z',
      };
      mockSend.mockResolvedValueOnce({ Items: [rawItem] });
      const result = await store.getLatestFeed();
      expect(result).toHaveLength(1);
      expect(result[0].transactionId).toBe('txn_feed_001');
      expect(result[0].triggeredSignals).toEqual([]);   // parsed from JSON string
    });

    it('handles malformed triggeredSignals JSON without throwing', async () => {
      mockSend.mockResolvedValueOnce({
        Items: [{ ...makeItem(), triggeredSignals: 'not-valid-json' }],
      });
      const result = await store.getLatestFeed();
      expect(result[0].triggeredSignals).toEqual([]);
    });
  });
});
