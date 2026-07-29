import { scoreTransaction } from '../scoring/engine';
import { RiskDecision } from '../scoring/engine';
import {
  generateCardTestingBurst,
  generateAccountTakeoverBurst,
  generateImpossibleTravelBurst,
  generatePetrolSkimmingBurst,
  generateSimSwapBurst,
  TransactionEvent,
} from '../scenarios/attackPatterns';
import { SupportedScenario, SUPPORTED_SCENARIOS } from '../types/api';
import { buildStoredItem } from './scoreService';
import { StoredTransactionItem } from './transactionStore';

export interface BatchResult {
  scenario: SupportedScenario;
  items: StoredTransactionItem[];
  decisions: RiskDecision[];
  decisionBreakdown: { APPROVE: number; REVIEW: number; BLOCK: number };
  generatedCount: number;
}

export function isSupportedScenario(name: string): name is SupportedScenario {
  return (SUPPORTED_SCENARIOS as readonly string[]).includes(name);
}

export function runBatchScenario(scenario: SupportedScenario): BatchResult {
  const baseTimestamp = new Date().toISOString();
  const events = dispatchScenarioGenerator(scenario, baseTimestamp);

  const items: StoredTransactionItem[] = [];
  const decisions: RiskDecision[] = [];
  const breakdown = { APPROVE: 0, REVIEW: 0, BLOCK: 0 };

  for (const event of events) {
    const decision = scoreTransaction(event.transaction, event.context);
    breakdown[decision.decision] = (breakdown[decision.decision] ?? 0) + 1;
    decisions.push(decision);
    items.push(
      buildStoredItem(decision, event.transaction, {
        scenarioType: scenario,
        isSynthetic: true,
      }),
    );
  }

  return { scenario, items, decisions, decisionBreakdown: breakdown, generatedCount: items.length };
}

function dispatchScenarioGenerator(
  scenario: SupportedScenario,
  baseTimestamp: string,
): TransactionEvent[] {
  const seed = Date.now();

  switch (scenario) {
    case 'card-testing':
      return generateCardTestingBurst(
        `sim-carding-${seed}`,
        `sim-bot-device-${seed}`,
        baseTimestamp,
      );

    case 'account-takeover':
      return generateAccountTakeoverBurst(
        `sim-ato-victim-${seed}`,
        'ZA',
        `sim-ng-attacker-${seed}`,
        baseTimestamp,
      );

    case 'impossible-travel':
      return generateImpossibleTravelBurst(
        `sim-travel-${seed}`,
        `sim-cloned-card-${seed}`,
        baseTimestamp,
      );

    case 'sim-swap':
      return generateSimSwapBurst(
        `sim-swap-victim-${seed}`,
        baseTimestamp,
      );

    case 'petrol-skimming':
      return generatePetrolSkimmingBurst(
        `sim-skim-victim-${seed}`,
        baseTimestamp,
      );

    case 'merchant-spike':
      // Merchant spike reused as a general burst of new-account suspicious transactions
      return generateCardTestingBurst(
        `sim-spike-${seed}`,
        `sim-spike-device-${seed}`,
        baseTimestamp,
      );
  }
}
