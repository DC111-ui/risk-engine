import { Transaction } from '../models/transaction';
import { UserContext } from '../models/context';
import { RiskDecision } from '../scoring/engine';
import { TriggeredSignal } from '../scoring/signals';

// ---------------------------------------------------------------------------
// Request types
// ---------------------------------------------------------------------------

export interface ScoreRequest {
  transaction: Transaction;
  context: UserContext;
  persist?: boolean;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ScoreResponse {
  ok: true;
  result: RiskDecision;
  persisted: boolean;
}

export interface SimulateResponse {
  ok: true;
  scenario: SupportedScenario;
  generatedCount: number;
  decisionBreakdown: { APPROVE: number; REVIEW: number; BLOCK: number };
  writtenToDynamo: boolean;
  startedAt: string;
  completedAt: string;
}

export interface StreamStartResponse {
  ok: true;
  streamStartedAt: string;
  streamExpiresAt: string;
  ttlMinutes: number;
}

export interface StreamStopResponse {
  ok: true;
  stoppedAt: string;
}

export interface FeedItem {
  transactionId: string;
  feedTimestamp: string;
  timestamp: string;
  userId: string;
  merchant: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  country: string;
  riskScore: number;
  decision: string;
  severity: string;
  triggeredSignals: TriggeredSignal[];
  signalCount: number;
  topSignalCode: string | null;
  scenarioType: string;
  isSynthetic: boolean;
  evaluatedAt: string;
  // Card enrichment
  cardNetwork?: string;
  cardLast4?: string;
  cardType?: string;
  issuingBank?: string;
  entryMode?: string;
  threeDsStatus?: string;
  mcc?: string;
  isRecurring?: boolean;
  postalCode?: string;
}

export interface FeedResponse {
  ok: true;
  count: number;
  items: FeedItem[];
}

export interface HealthResponse {
  ok: true;
  service: string;
  version: string;
  timestamp: string;
  region: string;
  stage: string;
}

export interface ApiError {
  ok: false;
  error: string;
  code: string;
}

// ---------------------------------------------------------------------------
// Scenario types
// ---------------------------------------------------------------------------

export type SupportedScenario =
  | 'card-testing'
  | 'impossible-travel'
  | 'account-takeover'
  | 'sim-swap'
  | 'petrol-skimming'
  | 'merchant-spike';

export const SUPPORTED_SCENARIOS: readonly SupportedScenario[] = [
  'card-testing',
  'impossible-travel',
  'account-takeover',
  'sim-swap',
  'petrol-skimming',
  'merchant-spike',
] as const;
