import { Transaction } from '../models/transaction';
import { UserContext } from '../models/context';
import { TriggeredSignal } from './signals';
import { ALL_RULES } from './rules';

export type Decision = 'APPROVE' | 'REVIEW' | 'BLOCK';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskDecision {
  transactionId: string;
  userId: string;
  riskScore: number;
  decision: Decision;
  severity: Severity;
  triggeredSignals: TriggeredSignal[];
  reasons: string[];           // Human-readable summary lines (UI-ready)
  metadata: {
    evaluatedAt: string;
    signalCount: number;
    topSignalCode: string | null;
    topSignalWeight: number;
    scoreBreakdown: Array<{ code: string; weight: number }>;
  };
}

// Decision bands — adjustable without touching rule logic
const BAND_REVIEW = 40;
const BAND_BLOCK = 70;
const MAX_SCORE = 100;

function resolveDecision(score: number): Decision {
  if (score >= BAND_BLOCK) return 'BLOCK';
  if (score >= BAND_REVIEW) return 'REVIEW';
  return 'APPROVE';
}

function resolveSeverity(score: number): Severity {
  if (score >= 85) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

/**
 * scoreTransaction — the primary entry point of the risk engine.
 *
 * It is intentionally stateless: it receives a Transaction and pre-built
 * UserContext, evaluates all rules, accumulates a clamped risk score, and
 * returns a fully structured RiskDecision ready for API serialisation or
 * frontend consumption.
 */
export function scoreTransaction(tx: Transaction, ctx: UserContext): RiskDecision {
  validateInputs(tx, ctx);

  const triggeredSignals: TriggeredSignal[] = [];

  for (const rule of ALL_RULES) {
    const signal = rule(tx, ctx);
    if (signal !== null) {
      triggeredSignals.push(signal);
    }
  }

  const rawScore = triggeredSignals.reduce((acc, s) => acc + s.weight, 0);
  const riskScore = Math.min(rawScore, MAX_SCORE);

  const decision = resolveDecision(riskScore);
  const severity = resolveSeverity(riskScore);

  const topSignal = triggeredSignals.length > 0
    ? triggeredSignals.reduce((a, b) => (a.weight >= b.weight ? a : b))
    : null;

  return {
    transactionId: tx.transactionId,
    userId: tx.userId,
    riskScore,
    decision,
    severity,
    triggeredSignals,
    reasons: triggeredSignals.map((s) => `[${s.code}] ${s.message}`),
    metadata: {
      evaluatedAt: new Date().toISOString(),
      signalCount: triggeredSignals.length,
      topSignalCode: topSignal?.code ?? null,
      topSignalWeight: topSignal?.weight ?? 0,
      scoreBreakdown: triggeredSignals.map((s) => ({ code: s.code, weight: s.weight })),
    },
  };
}

function validateInputs(tx: Transaction, ctx: UserContext): void {
  if (!tx || typeof tx !== 'object') {
    throw new Error('RiskEngine: transaction must be a non-null object');
  }
  if (!tx.transactionId || typeof tx.transactionId !== 'string') {
    throw new Error('RiskEngine: transaction.transactionId is required');
  }
  if (!tx.userId || typeof tx.userId !== 'string') {
    throw new Error('RiskEngine: transaction.userId is required');
  }
  if (typeof tx.amount !== 'number' || tx.amount < 0) {
    throw new Error('RiskEngine: transaction.amount must be a non-negative number');
  }
  if (!tx.country || !tx.ipCountry) {
    throw new Error('RiskEngine: transaction.country and ipCountry are required');
  }
  if (!tx.timestamp) {
    throw new Error('RiskEngine: transaction.timestamp is required');
  }
  if (isNaN(Date.parse(tx.timestamp))) {
    throw new Error('RiskEngine: transaction.timestamp must be a valid ISO 8601 string');
  }
  if (!ctx || typeof ctx !== 'object') {
    throw new Error('RiskEngine: context must be a non-null object');
  }
  if (!ctx.userId || typeof ctx.userId !== 'string') {
    throw new Error('RiskEngine: context.userId is required');
  }
}
