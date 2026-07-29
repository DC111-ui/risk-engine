import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';

const { mockSaveBatch, mockRunBatch } = vi.hoisted(() => ({
  mockSaveBatch: vi.fn().mockResolvedValue(undefined),
  mockRunBatch:  vi.fn(),
}));

vi.mock('../../src/services/transactionStore', () => ({
  TransactionStore: vi.fn().mockImplementation(() => ({ saveBatch: mockSaveBatch })),
}));

vi.mock('../../src/services/scenarioService', () => ({
  isSupportedScenario: (name: string) =>
    ['card-testing', 'impossible-travel', 'account-takeover', 'merchant-spike'].includes(name),
  runBatchScenario: mockRunBatch,
}));

import { handler } from '../../src/handlers/fraudSimulateScenario';

const MOCK_BATCH_RESULT = {
  scenario: 'card-testing',
  items: Array.from({ length: 10 }, (_, i) => ({ transactionId: `txn_sim_${i}` })),
  decisions: [],
  decisionBreakdown: { APPROVE: 1, REVIEW: 2, BLOCK: 7 },
  generatedCount: 10,
};

function buildEvent(scenario?: string): APIGatewayProxyEventV2 {
  return {
    pathParameters: scenario ? { scenario } : {},
    body: null,
    queryStringParameters: {},
    headers: {},
    requestContext: { http: { method: 'POST' } },
  } as unknown as APIGatewayProxyEventV2;
}

describe('POST /fraud/simulate/{scenario} handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunBatch.mockReturnValue(MOCK_BATCH_RESULT);
    mockSaveBatch.mockResolvedValue(undefined);
  });

  describe('successful simulation', () => {
    it('returns 200 with full simulation summary on valid scenario', async () => {
      const response = await handler(buildEvent('card-testing'));
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.ok).toBe(true);
      expect(body.scenario).toBe('card-testing');
      expect(body.generatedCount).toBe(10);
      expect(body.decisionBreakdown).toEqual({ APPROVE: 1, REVIEW: 2, BLOCK: 7 });
      expect(body.writtenToDynamo).toBe(true);
    });

    it('calls saveBatch with the generated items', async () => {
      await handler(buildEvent('card-testing'));
      expect(mockSaveBatch).toHaveBeenCalledOnce();
      expect(mockSaveBatch).toHaveBeenCalledWith(MOCK_BATCH_RESULT.items);
    });

    it('returns writtenToDynamo=false (but still 200) when batch write fails', async () => {
      mockSaveBatch.mockRejectedValueOnce(new Error('capacity exceeded'));
      const response = await handler(buildEvent('card-testing'));
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body as string);
      expect(body.writtenToDynamo).toBe(false);
    });

    it('includes startedAt and completedAt timestamps', async () => {
      const response = await handler(buildEvent('card-testing'));
      const body = JSON.parse(response.body as string);
      expect(body.startedAt).toBeDefined();
      expect(body.completedAt).toBeDefined();
      expect(Date.parse(body.startedAt)).not.toBeNaN();
      expect(Date.parse(body.completedAt)).not.toBeNaN();
    });

    it('accepts all supported scenario names', async () => {
      const scenarios = ['card-testing', 'impossible-travel', 'account-takeover', 'merchant-spike'];
      for (const s of scenarios) {
        mockRunBatch.mockReturnValueOnce({ ...MOCK_BATCH_RESULT, scenario: s });
        const response = await handler(buildEvent(s));
        expect(response.statusCode).toBe(200);
      }
    });
  });

  describe('validation errors', () => {
    it('returns 400 when scenario path param is missing', async () => {
      const response = await handler(buildEvent());
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body as string);
      expect(body.code).toBe('MISSING_SCENARIO');
    });

    it('returns 404 for unsupported scenario names', async () => {
      const response = await handler(buildEvent('sql-injection-attack'));
      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body as string);
      expect(body.code).toBe('UNKNOWN_SCENARIO');
      expect(body.ok).toBe(false);
    });

    it('is case-insensitive for scenario names', async () => {
      const response = await handler(buildEvent('CARD-TESTING'));
      expect(response.statusCode).toBe(200);
    });
  });
});
