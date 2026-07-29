import { MerchantCategory } from './transaction';

/**
 * UserContext encapsulates derived behavioural history for a user, assembled by
 * an upstream profile service before the transaction reaches the risk engine.
 *
 * This deliberately lives outside the raw Transaction so the scoring engine can
 * stay stateless and testable — context is injected, not fetched inline.
 */
export interface UserContext {
  userId: string;

  // Geographic baseline
  userHomeCountry: string;           // Primary country of residence/activity
  recentCountries: string[];         // Countries seen in last 30 days
  recentDistinctCountries1h: string[]; // Distinct countries within the last hour

  // Device history
  lastSeenDeviceIds: string[];       // Devices used in last 90 days
  isKnownDevice: boolean;            // Convenience flag: current device in history

  // Amount baseline (used for anomaly detection)
  avgHistoricalAmount: number;       // Rolling mean of past 90-day transactions
  stdDevAmount: number;              // Rolling std-dev of past 90-day amounts

  // Merchant history
  userTypicalMerchantCategories: MerchantCategory[];
  recentMerchants: string[];         // Merchant names seen in last 30 days

  // Velocity counters (pre-computed by streaming aggregation layer)
  recentTransactionCount1m: number;  // Attempts in the last 60 seconds
  recentTransactionCount5m: number;  // Attempts in the last 5 minutes
  recentTransactionCount1h: number;  // Attempts in the last hour

  // Decline history
  recentDeclines: number;            // Declines in the last 24 hours
  recentAttempts: number;            // Total attempts in last 24 hours

  // Travel / impossible-travel detection
  lastTransactionCountry?: string;       // Country of the immediately preceding txn
  lastTransactionTimestamp?: string;     // ISO 8601 timestamp of preceding txn

  // Risk modifiers
  accountAgeDays: number;
  priorChargebacks: number;
  isHighValueCustomer?: boolean;     // VIP flag — may reduce risk weight in some signals
}
