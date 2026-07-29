import { describe, it, expect } from 'vitest';
import {
  isSupportedScenario,
  runBatchScenario,
} from '../../src/services/scenarioService';
import { SUPPORTED_SCENARIOS } from '../../src/types/api';

// No DynamoDB mocking needed — scenarioService is purely CPU-bound.
// It generates events and scores them; all I/O is handled in the handler layer.

describe('scenarioService', () => {
  // ── isSupportedScenario ────────────────────────────────────────────────
  describe('isSupportedScenario()', () => {
    it('returns true for all officially supported scenarios', () => {
      for (const s of SUPPORTED_SCENARIOS) {
        expect(isSupportedScenario(s)).toBe(true);
      }
    });

    it('returns false for unknown strings', () => {
      expect(isSupportedScenario('random-attack')).toBe(false);
      expect(isSupportedScenario('')).toBe(false);
      expect(isSupportedScenario('CARD-TESTING')).toBe(false); // case-sensitive
    });
  });

  // ── runBatchScenario — card-testing ────────────────────────────────────
  describe('runBatchScenario("card-testing")', () => {
    it('generates 10 items', () => {
      const result = runBatchScenario('card-testing');
      expect(result.generatedCount).toBe(10);
      expect(result.items).toHaveLength(10);
    });

    it('triggers CARD_TESTING_PATTERN in most events', () => {
      const result = runBatchScenario('card-testing');
      const hasCardTesting = result.decisions.some((d) =>
        d.triggeredSignals.some((s) => s.code === 'CARD_TESTING_PATTERN'),
      );
      expect(hasCardTesting).toBe(true);
    });

    it('produces BLOCK decisions for high-velocity events', () => {
      const result = runBatchScenario('card-testing');
      expect(result.decisionBreakdown.BLOCK).toBeGreaterThan(0);
    });

    it('marks all items as isSynthetic=true with scenarioType="card-testing"', () => {
      const result = runBatchScenario('card-testing');
      for (const item of result.items) {
        expect(item.isSynthetic).toBe(true);
        expect(item.scenarioType).toBe('card-testing');
      }
    });
  });

  // ── runBatchScenario — impossible-travel ──────────────────────────────
  describe('runBatchScenario("impossible-travel")', () => {
    it('generates 3 travel legs', () => {
      const result = runBatchScenario('impossible-travel');
      expect(result.generatedCount).toBe(3);
    });

    it('triggers IMPOSSIBLE_TRAVEL signal in at least one event', () => {
      const result = runBatchScenario('impossible-travel');
      const hasTravel = result.decisions.some((d) =>
        d.triggeredSignals.some((s) => s.code === 'IMPOSSIBLE_TRAVEL'),
      );
      expect(hasTravel).toBe(true);
    });

    it('first leg (home country) scores lower than subsequent legs', () => {
      const result = runBatchScenario('impossible-travel');
      const [leg1, leg2] = result.decisions;
      expect(leg2.riskScore).toBeGreaterThan(leg1.riskScore);
    });
  });

  // ── runBatchScenario — account-takeover ────────────────────────────────
  describe('runBatchScenario("account-takeover")', () => {
    it('generates 6 escalation steps', () => {
      const result = runBatchScenario('account-takeover');
      expect(result.generatedCount).toBe(6);
    });

    it('produces at least one BLOCK decision', () => {
      const result = runBatchScenario('account-takeover');
      expect(result.decisionBreakdown.BLOCK).toBeGreaterThan(0);
    });
  });

  // ── runBatchScenario — merchant-spike ──────────────────────────────────
  describe('runBatchScenario("merchant-spike")', () => {
    it('generates 8 events (one per spiked user)', () => {
      const result = runBatchScenario('merchant-spike');
      expect(result.generatedCount).toBe(8);
    });

    it('all events share the same merchant (spike pattern)', () => {
      const result = runBatchScenario('merchant-spike');
      const merchants = new Set(result.items.map((i) => i.merchant));
      expect(merchants.size).toBe(1);
    });
  });

  // ── output shape ───────────────────────────────────────────────────────
  describe('stored item shape', () => {
    it('every item has required DynamoDB key fields', () => {
      const result = runBatchScenario('card-testing');
      for (const item of result.items) {
        expect(item.transactionId).toBeDefined();
        expect(item.feedPartition).toBe('LIVE');
        expect(item.feedTimestamp).toBeDefined();
        expect(item.timestamp).toBeDefined();
      }
    });

    it('feedTimestamp is a composite of timestamp and transactionId', () => {
      const result = runBatchScenario('impossible-travel');
      for (const item of result.items) {
        expect(item.feedTimestamp).toContain('#');
        const [ts, txnId] = item.feedTimestamp.split('#');
        expect(ts).toBe(item.timestamp);
        expect(txnId).toBe(item.transactionId);
      }
    });

    it('triggeredSignals is stored as a JSON string (not an array)', () => {
      const result = runBatchScenario('card-testing');
      for (const item of result.items) {
        expect(typeof item.triggeredSignals).toBe('string');
        expect(() => JSON.parse(item.triggeredSignals)).not.toThrow();
      }
    });

    it('decisionBreakdown counts sum to generatedCount', () => {
      const result = runBatchScenario('account-takeover');
      const total =
        result.decisionBreakdown.APPROVE +
        result.decisionBreakdown.REVIEW +
        result.decisionBreakdown.BLOCK;
      expect(total).toBe(result.generatedCount);
    });
  });
});
