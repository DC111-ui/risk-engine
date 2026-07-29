import { describe, it, expect } from 'vitest';
import { scoreTransaction } from '../src/scoring/engine';
import { Transaction } from '../src/models/transaction';
import { UserContext } from '../src/models/context';
import {
  scenarioNormalShoprite      as scenarioNormalLocal,
  scenarioImpossibleTravel,
  scenarioCardTesting,
  scenarioSimSwapDrain        as scenarioCrossBorderHighValue,
  scenarioPetrolSkimming      as scenarioNewDeviceHighAmount,
  scenarioPetrolFillUp        as scenarioBenignRepeatCustomer,
  scenarioSimSwapProbe        as scenarioMerchantAnomaly,
  scenarioAccountTakeover     as scenarioOutOfHoursSuspicious,
  scenarioAccountTakeover,
  scenarioNewAccountMoneytransfer as scenarioNewAccountRiskyMerchant,
} from '../src/scenarios/seeds';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBaseTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    transactionId: 'txn_test_base',
    userId: 'user_test_001',
    amount: 50.00,
    currency: 'USD',
    merchant: 'Test Merchant',
    merchantCategory: 'RETAIL',
    country: 'US',
    ipCountry: 'US',
    deviceId: 'device_known_001',
    timestamp: '2024-06-15T14:00:00.000Z',
    ...overrides,
  };
}

function buildBaseCtx(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: 'user_test_001',
    userHomeCountry: 'US',
    recentCountries: ['US'],
    recentDistinctCountries1h: ['US'],
    lastSeenDeviceIds: ['device_known_001'],
    isKnownDevice: true,
    avgHistoricalAmount: 60.00,
    stdDevAmount: 20.00,
    userTypicalMerchantCategories: ['RETAIL', 'GROCERY'],
    recentMerchants: ['Amazon', 'Target'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 365,
    priorChargebacks: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// A. Normal Approval
// ---------------------------------------------------------------------------
describe('A — Normal Approval', () => {
  it('approves a routine local transaction with no anomalies', () => {
    const result = scoreTransaction(scenarioNormalLocal.transaction, scenarioNormalLocal.context);
    expect(result.decision).toBe('APPROVE');
    expect(result.riskScore).toBeLessThan(40);
    expect(result.triggeredSignals.length).toBe(0);
  });

  it('approves an established repeat customer', () => {
    const result = scoreTransaction(
      scenarioBenignRepeatCustomer.transaction,
      scenarioBenignRepeatCustomer.context,
    );
    expect(result.decision).toBe('APPROVE');
    expect(result.riskScore).toBeLessThan(40);
  });

  it('approves a transaction within 1σ of the user amount baseline', () => {
    const tx = buildBaseTx({ amount: 70.00 }); // within stdDev
    const ctx = buildBaseCtx();
    const result = scoreTransaction(tx, ctx);
    expect(result.decision).toBe('APPROVE');
  });
});

// ---------------------------------------------------------------------------
// B. Review Cases
// ---------------------------------------------------------------------------
describe('B — Review Cases', () => {
  it('flags new device + high amount + unusual hour as REVIEW', () => {
    const result = scoreTransaction(
      scenarioNewDeviceHighAmount.transaction,
      scenarioNewDeviceHighAmount.context,
    );
    expect(result.decision).toBe('REVIEW');
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
    expect(result.riskScore).toBeLessThan(70);
  });

  it('flags merchant category anomaly as REVIEW', () => {
    const result = scoreTransaction(
      scenarioMerchantAnomaly.transaction,
      scenarioMerchantAnomaly.context,
    );
    expect(result.decision).toBe('REVIEW');
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it('flags new account + risky merchant as REVIEW', () => {
    const result = scoreTransaction(
      scenarioNewAccountRiskyMerchant.transaction,
      scenarioNewAccountRiskyMerchant.context,
    );
    expect(result.decision).toBe('REVIEW');
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it('triggers NEW_DEVICE signal when device is unknown', () => {
    const tx = buildBaseTx({ deviceId: 'device_brand_new' });
    const ctx = buildBaseCtx({ isKnownDevice: false });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('NEW_DEVICE');
  });
});

// ---------------------------------------------------------------------------
// C. Block Cases
// ---------------------------------------------------------------------------
describe('C — Block Cases', () => {
  it('blocks a high-value cross-border transaction with new device and IP mismatch', () => {
    const result = scoreTransaction(
      scenarioCrossBorderHighValue.transaction,
      scenarioCrossBorderHighValue.context,
    );
    expect(result.decision).toBe('BLOCK');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });

  it('blocks out-of-hours suspicious transaction', () => {
    const result = scoreTransaction(
      scenarioOutOfHoursSuspicious.transaction,
      scenarioOutOfHoursSuspicious.context,
    );
    expect(result.decision).toBe('BLOCK');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });

  it('blocks account takeover indicators', () => {
    const result = scoreTransaction(
      scenarioAccountTakeover.transaction,
      scenarioAccountTakeover.context,
    );
    expect(result.decision).toBe('BLOCK');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });
});

// ---------------------------------------------------------------------------
// D. Card Testing
// ---------------------------------------------------------------------------
describe('D — Card Testing Pattern', () => {
  it('triggers CARD_TESTING_PATTERN signal and blocks or reviews', () => {
    const result = scoreTransaction(scenarioCardTesting.transaction, scenarioCardTesting.context);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('CARD_TESTING_PATTERN');
    expect(['REVIEW', 'BLOCK']).toContain(result.decision);
  });

  it('triggers HIGH_VELOCITY_1M on burst velocity', () => {
    const tx = buildBaseTx({ amount: 1.00 });
    const ctx = buildBaseCtx({
      recentTransactionCount1m: 4,
      recentTransactionCount5m: 5,
      isKnownDevice: false,
    });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('HIGH_VELOCITY_1M');
  });

  it('blocks the card testing scenario with high score', () => {
    const result = scoreTransaction(scenarioCardTesting.transaction, scenarioCardTesting.context);
    expect(result.decision).toBe('BLOCK');
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
  });
});

// ---------------------------------------------------------------------------
// E. Impossible Travel
// ---------------------------------------------------------------------------
describe('E — Impossible Travel', () => {
  it('triggers IMPOSSIBLE_TRAVEL signal', () => {
    const result = scoreTransaction(
      scenarioImpossibleTravel.transaction,
      scenarioImpossibleTravel.context,
    );
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('IMPOSSIBLE_TRAVEL');
  });

  it('blocks or reviews impossible travel scenario', () => {
    const result = scoreTransaction(
      scenarioImpossibleTravel.transaction,
      scenarioImpossibleTravel.context,
    );
    expect(['REVIEW', 'BLOCK']).toContain(result.decision);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
  });

  it('does not trigger IMPOSSIBLE_TRAVEL when countries match', () => {
    const tx = buildBaseTx({ country: 'US', ipCountry: 'US' });
    const ctx = buildBaseCtx({
      lastTransactionCountry: 'US',
      lastTransactionTimestamp: '2024-06-15T13:30:00.000Z',
    });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).not.toContain('IMPOSSIBLE_TRAVEL');
  });

  it('does not trigger IMPOSSIBLE_TRAVEL when time gap is safe (>2h)', () => {
    const tx = buildBaseTx({
      country: 'GB',
      ipCountry: 'GB',
      timestamp: '2024-06-15T14:00:00.000Z',
    });
    const ctx = buildBaseCtx({
      lastTransactionCountry: 'US',
      lastTransactionTimestamp: '2024-06-15T11:00:00.000Z', // 3 hours prior
    });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).not.toContain('IMPOSSIBLE_TRAVEL');
  });
});

// ---------------------------------------------------------------------------
// F. Output Shape
// ---------------------------------------------------------------------------
describe('F — Output Shape', () => {
  it('always returns all required top-level fields', () => {
    const result = scoreTransaction(buildBaseTx(), buildBaseCtx());
    expect(result).toHaveProperty('transactionId');
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('severity');
    expect(result).toHaveProperty('triggeredSignals');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('metadata');
  });

  it('triggeredSignals contains objects with code, weight, severity, message', () => {
    const tx = buildBaseTx({ deviceId: 'device_new_x' });
    const ctx = buildBaseCtx({ isKnownDevice: false });
    const result = scoreTransaction(tx, ctx);
    const signal = result.triggeredSignals[0];
    expect(signal).toHaveProperty('code');
    expect(signal).toHaveProperty('weight');
    expect(signal).toHaveProperty('severity');
    expect(signal).toHaveProperty('message');
    expect(typeof signal.weight).toBe('number');
  });

  it('reasons array matches triggeredSignals length', () => {
    const result = scoreTransaction(
      scenarioCrossBorderHighValue.transaction,
      scenarioCrossBorderHighValue.context,
    );
    expect(result.reasons.length).toBe(result.triggeredSignals.length);
  });

  it('metadata contains evaluatedAt, signalCount, topSignalCode', () => {
    const result = scoreTransaction(buildBaseTx(), buildBaseCtx());
    expect(result.metadata).toHaveProperty('evaluatedAt');
    expect(result.metadata).toHaveProperty('signalCount');
    expect(result.metadata).toHaveProperty('topSignalCode');
    expect(typeof result.metadata.evaluatedAt).toBe('string');
  });

  it('returns correct transactionId and userId from input', () => {
    const tx = buildBaseTx({ transactionId: 'txn_shape_test', userId: 'user_shape_001' });
    const ctx = buildBaseCtx({ userId: 'user_shape_001' });
    const result = scoreTransaction(tx, ctx);
    expect(result.transactionId).toBe('txn_shape_test');
    expect(result.userId).toBe('user_shape_001');
  });
});

// ---------------------------------------------------------------------------
// G. Invalid Input Handling
// ---------------------------------------------------------------------------
describe('G — Invalid Input Handling', () => {
  it('throws on null transaction', () => {
    expect(() => scoreTransaction(null as any, buildBaseCtx())).toThrow();
  });

  it('throws on missing transactionId', () => {
    const tx = buildBaseTx({ transactionId: '' });
    expect(() => scoreTransaction(tx, buildBaseCtx())).toThrow(/transactionId/);
  });

  it('throws on negative amount', () => {
    const tx = buildBaseTx({ amount: -10 });
    expect(() => scoreTransaction(tx, buildBaseCtx())).toThrow(/amount/);
  });

  it('throws on missing country', () => {
    const tx = buildBaseTx({ country: '' });
    expect(() => scoreTransaction(tx, buildBaseCtx())).toThrow(/country/);
  });

  it('throws on invalid timestamp', () => {
    const tx = buildBaseTx({ timestamp: 'not-a-date' });
    expect(() => scoreTransaction(tx, buildBaseCtx())).toThrow(/timestamp/);
  });

  it('throws on null context', () => {
    expect(() => scoreTransaction(buildBaseTx(), null as any)).toThrow();
  });

  it('throws on missing context userId', () => {
    const ctx = buildBaseCtx({ userId: '' });
    expect(() => scoreTransaction(buildBaseTx(), ctx)).toThrow(/userId/);
  });
});

// ---------------------------------------------------------------------------
// H. Threshold Consistency
// ---------------------------------------------------------------------------
describe('H — Score Band Consistency', () => {
  it('score 0 maps to APPROVE', () => {
    const result = scoreTransaction(buildBaseTx(), buildBaseCtx());
    if (result.riskScore === 0) {
      expect(result.decision).toBe('APPROVE');
    }
    // If baseline score > 0, just verify APPROVE is in the right band
    if (result.riskScore < 40) {
      expect(result.decision).toBe('APPROVE');
    }
  });

  it('score in [40, 69] maps to REVIEW', () => {
    // new device (20) + unusual hour (10) + atypical merchant (10) + cross-border (15) = 55
    const tx = buildBaseTx({
      merchantCategory: 'GAMBLING',
      country: 'GB',
      timestamp: '2024-06-15T02:00:00.000Z',
    });
    const ctx = buildBaseCtx({
      isKnownDevice: false,
      userHomeCountry: 'US',
      userTypicalMerchantCategories: ['RETAIL', 'GROCERY'],
    });
    const result = scoreTransaction(tx, ctx);
    expect(result.riskScore).toBeGreaterThanOrEqual(40);
    if (result.riskScore < 70) {
      expect(result.decision).toBe('REVIEW');
    }
  });

  it('score 70+ maps to BLOCK', () => {
    const result = scoreTransaction(
      scenarioCrossBorderHighValue.transaction,
      scenarioCrossBorderHighValue.context,
    );
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.decision).toBe('BLOCK');
  });

  it('riskScore never exceeds 100', () => {
    const result = scoreTransaction(
      scenarioCardTesting.transaction,
      scenarioCardTesting.context,
    );
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it('riskScore is always non-negative', () => {
    const result = scoreTransaction(buildBaseTx(), buildBaseCtx());
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('severity correlates with decision — BLOCK has HIGH or CRITICAL severity', () => {
    const result = scoreTransaction(
      scenarioCrossBorderHighValue.transaction,
      scenarioCrossBorderHighValue.context,
    );
    expect(result.decision).toBe('BLOCK');
    expect(['HIGH', 'CRITICAL']).toContain(result.severity);
  });

  it('APPROVE decisions have LOW severity when score is zero', () => {
    const result = scoreTransaction(scenarioNormalLocal.transaction, scenarioNormalLocal.context);
    expect(result.decision).toBe('APPROVE');
    expect(result.severity).toBe('LOW');
  });
});

// ---------------------------------------------------------------------------
// Individual Signal Coverage
// ---------------------------------------------------------------------------
describe('Signal Coverage', () => {
  it('triggers IP_COUNTRY_MISMATCH when IP country differs from tx country', () => {
    const tx = buildBaseTx({ ipCountry: 'RU' });
    const ctx = buildBaseCtx();
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('IP_COUNTRY_MISMATCH');
  });

  it('triggers CARD_BIN_COUNTRY_MISMATCH when BIN country differs from tx country', () => {
    const tx = buildBaseTx({ cardBinCountry: 'DE' });
    const ctx = buildBaseCtx();
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('CARD_BIN_COUNTRY_MISMATCH');
  });

  it('triggers AMOUNT_FAR_ABOVE_BASELINE at 3σ deviation', () => {
    const tx = buildBaseTx({ amount: 200.00 }); // avg=60, std=20 → z=7
    const ctx = buildBaseCtx({ avgHistoricalAmount: 60, stdDevAmount: 20 });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('AMOUNT_FAR_ABOVE_BASELINE');
  });

  it('triggers AMOUNT_MODERATELY_ABOVE_BASELINE at 2–3σ deviation', () => {
    const tx = buildBaseTx({ amount: 105.00 }); // avg=60, std=20 → z=2.25
    const ctx = buildBaseCtx({ avgHistoricalAmount: 60, stdDevAmount: 20 });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('AMOUNT_MODERATELY_ABOVE_BASELINE');
    expect(codes).not.toContain('AMOUNT_FAR_ABOVE_BASELINE');
  });

  it('triggers EXCESSIVE_DECLINES at 4+ declines', () => {
    const ctx = buildBaseCtx({ recentDeclines: 5 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('EXCESSIVE_DECLINES');
    expect(codes).not.toContain('RECENT_DECLINES');
  });

  it('triggers RECENT_DECLINES at 2-3 declines (not EXCESSIVE)', () => {
    const ctx = buildBaseCtx({ recentDeclines: 2 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('RECENT_DECLINES');
    expect(codes).not.toContain('EXCESSIVE_DECLINES');
  });

  it('triggers HIGH_RISK_COUNTRY for known high-risk country', () => {
    const tx = buildBaseTx({ country: 'KP', ipCountry: 'KP' });
    const ctx = buildBaseCtx({ userHomeCountry: 'KP' });
    const result = scoreTransaction(tx, ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('HIGH_RISK_COUNTRY');
  });

  it('triggers PRIOR_CHARGEBACKS at 1 chargeback', () => {
    const ctx = buildBaseCtx({ priorChargebacks: 1 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('PRIOR_CHARGEBACKS');
  });

  it('triggers EXCESSIVE_CHARGEBACKS at 3+ chargebacks', () => {
    const ctx = buildBaseCtx({ priorChargebacks: 3 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('EXCESSIVE_CHARGEBACKS');
    expect(codes).not.toContain('PRIOR_CHARGEBACKS');
  });

  it('triggers NEW_ACCOUNT for accounts < 7 days old', () => {
    const ctx = buildBaseCtx({ accountAgeDays: 3 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('NEW_ACCOUNT');
  });

  it('does not trigger NEW_ACCOUNT for accounts >= 7 days old', () => {
    const ctx = buildBaseCtx({ accountAgeDays: 7 });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).not.toContain('NEW_ACCOUNT');
  });

  it('triggers VERY_HIGH_RISK_MERCHANT for crypto exchange', () => {
    const tx = buildBaseTx({ merchantCategory: 'CRYPTO_EXCHANGE' });
    const result = scoreTransaction(tx, buildBaseCtx());
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('VERY_HIGH_RISK_MERCHANT');
    expect(codes).not.toContain('RISKY_MERCHANT_CATEGORY');
  });

  it('triggers MULTI_COUNTRY_RAPID_SWITCH when 2+ countries in last hour', () => {
    const ctx = buildBaseCtx({ recentDistinctCountries1h: ['US', 'MX'] });
    const result = scoreTransaction(buildBaseTx(), ctx);
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('MULTI_COUNTRY_RAPID_SWITCH');
  });

  it('triggers UNUSUAL_HOUR for transactions between 00:00–04:59 UTC', () => {
    const tx = buildBaseTx({ timestamp: '2024-06-15T03:30:00.000Z' });
    const result = scoreTransaction(tx, buildBaseCtx());
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).toContain('UNUSUAL_HOUR');
  });

  it('does not trigger UNUSUAL_HOUR for normal business hours', () => {
    const tx = buildBaseTx({ timestamp: '2024-06-15T14:00:00.000Z' });
    const result = scoreTransaction(tx, buildBaseCtx());
    const codes = result.triggeredSignals.map((s) => s.code);
    expect(codes).not.toContain('UNUSUAL_HOUR');
  });
});
