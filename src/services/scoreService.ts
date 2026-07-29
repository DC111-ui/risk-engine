import { scoreTransaction, RiskDecision } from '../scoring/engine';
import { Transaction } from '../models/transaction';
import { UserContext } from '../models/context';
import { StoredTransactionItem } from './transactionStore';

export interface ScoreMeta {
  scenarioType?: string;
  isSynthetic?: boolean;
}

export function runScoring(transaction: Transaction, context: UserContext): RiskDecision {
  return scoreTransaction(transaction, context);
}

export function buildStoredItem(
  decision: RiskDecision,
  transaction: Transaction,
  meta: ScoreMeta = {},
): StoredTransactionItem {
  const feedTimestamp = `${transaction.timestamp}#${decision.transactionId}`;

  return {
    transactionId:   decision.transactionId,
    feedPartition:   'LIVE',
    feedTimestamp,
    timestamp:       transaction.timestamp,
    userId:          decision.userId,
    merchant:        transaction.merchant,
    merchantCategory: transaction.merchantCategory,
    amount:          transaction.amount,
    currency:        transaction.currency,
    country:         transaction.country,
    ipCountry:       transaction.ipCountry,
    deviceId:        transaction.deviceId,
    riskScore:       decision.riskScore,
    decision:        decision.decision,
    severity:        decision.severity,
    triggeredSignals: JSON.stringify(decision.triggeredSignals),
    reasons:         decision.reasons,
    signalCount:     decision.metadata.signalCount,
    topSignalCode:   decision.metadata.topSignalCode,
    scoreBreakdown:  JSON.stringify(decision.metadata.scoreBreakdown),
    scenarioType:    meta.scenarioType ?? 'manual',
    isSynthetic:     meta.isSynthetic ?? false,
    evaluatedAt:     decision.metadata.evaluatedAt,
    scoreVersion:    '2.0',
    // Card enrichment — pass through whatever the transaction carries
    cardNetwork:     transaction.cardNetwork,
    cardLast4:       transaction.cardLast4,
    cardType:        transaction.cardType,
    issuingBank:     transaction.issuingBank,
    entryMode:       transaction.entryMode,
    threeDsStatus:   transaction.threeDsStatus,
    mcc:             transaction.mcc,
    isRecurring:     transaction.isRecurring,
    postalCode:      transaction.postalCode,
  };
}
