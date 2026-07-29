/**
 * demo.ts — Risk Engine Scenario Runner
 *
 * Runs all seeded scenarios and attack pattern bursts through the risk engine
 * and prints formatted results to stdout.
 *
 * Run with:  npm run demo
 */

import { scoreTransaction } from './src/scoring/engine';
import {
  ALL_SCENARIOS,
} from './src/scenarios/seeds';
import {
  generateCardTestingBurst,
  generateAccountTakeoverBurst,
  generateImpossibleTravelBurst,
  generatePetrolSkimmingBurst,
  generateSimSwapBurst,
} from './src/scenarios/attackPatterns';
import {
  formatDecisionReport,
  formatAttackBurstReport,
} from './src/utils/helpers';

const BOLD  = '\x1b[1m';
const RESET = '\x1b[0m';
const CYAN  = '\x1b[36m';

function header(title: string): void {
  const bar = '═'.repeat(62);
  console.log(`\n${CYAN}${BOLD}${bar}`);
  console.log(`  ${title}`);
  console.log(`${bar}${RESET}`);
}

// ---------------------------------------------------------------------------
// 1. Seeded Scenarios
// ---------------------------------------------------------------------------
header('SEEDED SCENARIO RESULTS');

for (const scenario of ALL_SCENARIOS) {
  const result = scoreTransaction(scenario.transaction, scenario.context);
  console.log(formatDecisionReport(result, scenario.name));
}

// ---------------------------------------------------------------------------
// 2. Card Testing Burst
// ---------------------------------------------------------------------------
header('ATTACK PATTERN — Card Testing Burst');

const cardTestBurst = generateCardTestingBurst(
  'user_attack_carding',
  'device_bot_hijacked',
  '2024-06-15T03:00:00.000Z',
);

const cardTestResults = cardTestBurst.map(({ label, transaction, context }) => ({
  label,
  result: scoreTransaction(transaction, context),
}));

console.log(formatAttackBurstReport(cardTestResults, 'Card Testing Burst (10 micro-transactions)'));

// ---------------------------------------------------------------------------
// 3. Account Takeover Burst
// ---------------------------------------------------------------------------
header('ATTACK PATTERN — Account Takeover');

const atoBurst = generateAccountTakeoverBurst(
  'user_victim_alice',
  'US',
  'device_attacker_vps',
  '2024-06-15T08:00:00.000Z',
);

const atoResults = atoBurst.map(({ label, transaction, context }) => ({
  label,
  result: scoreTransaction(transaction, context),
}));

console.log(formatAttackBurstReport(atoResults, 'Account Takeover Escalation (6 steps)'));

// ---------------------------------------------------------------------------
// 4. Impossible Travel Burst
// ---------------------------------------------------------------------------
header('ATTACK PATTERN — Impossible Travel');

const travelBurst = generateImpossibleTravelBurst(
  'user_victim_bob',
  'device_victim_card',
  '2024-06-15T11:00:00.000Z',
);

const travelResults = travelBurst.map(({ label, transaction, context }) => ({
  label,
  result: scoreTransaction(transaction, context),
}));

console.log(formatAttackBurstReport(travelResults, 'Impossible Travel (3 continents in 90 min)'));

// ---------------------------------------------------------------------------
// 5. Merchant Fraud Spike
// ---------------------------------------------------------------------------
header('ATTACK PATTERN — Petrol Station Skimming');

const spikeBurst = generatePetrolSkimmingBurst(
  'demo-victim-bongani',
  '2024-10-12T14:00:00.000Z',
);

const spikeResults = spikeBurst.map(({ label, transaction, context }) => ({
  label,
  result: scoreTransaction(transaction, context),
}));

console.log(formatAttackBurstReport(spikeResults, 'Petrol Station Skimming — MAGSTRIPE clone pattern'));

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
header('SUMMARY');

const allResults = [
  ...ALL_SCENARIOS.map((s) => scoreTransaction(s.transaction, s.context)),
];

const counts = { APPROVE: 0, REVIEW: 0, BLOCK: 0 };
for (const r of allResults) counts[r.decision]++;

console.log(`
  Seeded scenarios evaluated: ${ALL_SCENARIOS.length}

  APPROVE  ${counts.APPROVE.toString().padStart(3)}
  REVIEW   ${counts.REVIEW.toString().padStart(3)}
  BLOCK    ${counts.BLOCK.toString().padStart(3)}

  Attack patterns generated:
    ▸ Card Testing Burst        ${cardTestBurst.length} events
    ▸ Account Takeover          ${atoBurst.length} events
    ▸ Impossible Travel         ${travelBurst.length} events
    ▸ Merchant Fraud Spike      ${spikeBurst.length} events

  Engine status: ${BOLD}OPERATIONAL${RESET}
`);
