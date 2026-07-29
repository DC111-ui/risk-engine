/**
 * risk-engine — Public API surface
 *
 * Re-exports the types and functions that downstream consumers
 * (Lambda handlers, Express routes, test suites) need to import.
 */

export { scoreTransaction }                        from './scoring/engine';
export type { RiskDecision, Decision, Severity }   from './scoring/engine';
export type { Transaction, MerchantCategory, PaymentMethod, Channel } from './models/transaction';
export type { UserContext }                        from './models/context';
export type { TriggeredSignal, SignalCode, SignalSeverity } from './scoring/signals';
export { SIGNAL_CATALOGUE }                        from './scoring/signals';
export { ALL_SCENARIOS }                           from './scenarios/seeds';
export {
  generateCardTestingBurst,
  generateAccountTakeoverBurst,
  generateImpossibleTravelBurst,
  generatePetrolSkimmingBurst,
  generateSimSwapBurst,
} from './scenarios/attackPatterns';
