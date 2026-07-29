import { Transaction, MerchantCategory } from '../models/transaction';
import { UserContext } from '../models/context';
import { SIGNAL_CATALOGUE, SignalCode, TriggeredSignal } from './signals';

type RuleResult = TriggeredSignal | null;

// Fraud-risk countries from a South African acquiring/issuing perspective.
// NG and KE are primary SIM-swap and card fraud origins for SA banks.
const HIGH_RISK_COUNTRIES = new Set([
  'NG', 'KE', 'GH', 'ET', 'CM',   // West/East Africa — primary SA fraud origins
  'RU', 'BY', 'UA',                 // Eastern Europe
  'KP', 'IR', 'SY', 'YE',          // FATF high-risk
  'PK', 'AF',                       // South Asia
]);

// Neighbouring countries — cross-border but NOT high-risk (legitimate ZA travellers to BW, ZW, MZ, NA, LS, SZ)
const SA_NEIGHBOUR_COUNTRIES = new Set(['BW', 'ZW', 'MZ', 'NA', 'LS', 'SZ', 'ZM']);

// Major SA issuing banks — used for SIM swap pattern detection
const SA_ISSUING_BANKS = new Set([
  'Capitec Bank', 'FNB', 'Standard Bank', 'ABSA', 'Nedbank',
  'TymeBank', 'Discovery Bank', 'African Bank',
]);

// IP countries associated with SIM swap attacks targeting SA banks
const SIM_SWAP_ORIGIN_COUNTRIES = new Set(['NG', 'KE', 'GH', 'ET', 'CM']);

const RISKY_CATEGORIES = new Set<MerchantCategory>([
  'GAMBLING', 'CRYPTO_EXCHANGE', 'MONEY_TRANSFER', 'FINANCIAL_SERVICES',
]);

const VERY_HIGH_RISK_CATEGORIES = new Set<MerchantCategory>([
  'GAMBLING', 'CRYPTO_EXCHANGE',
]);

const IMPOSSIBLE_TRAVEL_WINDOW_HOURS = 2;

function buildSignal(code: SignalCode, detail?: Record<string, unknown>): TriggeredSignal {
  return { ...SIGNAL_CATALOGUE[code], detail };
}

// ---------------------------------------------------------------------------
// Rule functions
// ---------------------------------------------------------------------------

export function ruleNewDevice(tx: Transaction, ctx: UserContext): RuleResult {
  if (!ctx.isKnownDevice) {
    return buildSignal('NEW_DEVICE', { deviceId: tx.deviceId });
  }
  return null;
}

export function ruleCrossBorderMismatch(tx: Transaction, ctx: UserContext): RuleResult {
  if (tx.country !== ctx.userHomeCountry) {
    return buildSignal('CROSS_BORDER_MISMATCH', {
      txCountry: tx.country,
      homeCountry: ctx.userHomeCountry,
    });
  }
  return null;
}

export function ruleIpCountryMismatch(tx: Transaction): RuleResult {
  if (tx.ipCountry !== tx.country) {
    return buildSignal('IP_COUNTRY_MISMATCH', {
      declaredCountry: tx.country,
      ipCountry: tx.ipCountry,
    });
  }
  return null;
}

export function ruleCardBinMismatch(tx: Transaction): RuleResult {
  if (tx.cardBinCountry && tx.cardBinCountry !== tx.country) {
    return buildSignal('CARD_BIN_COUNTRY_MISMATCH', {
      binCountry: tx.cardBinCountry,
      txCountry: tx.country,
    });
  }
  return null;
}

export function ruleImpossibleTravel(tx: Transaction, ctx: UserContext): RuleResult {
  if (
    ctx.lastTransactionCountry &&
    ctx.lastTransactionTimestamp &&
    ctx.lastTransactionCountry !== tx.country
  ) {
    const lastTime = new Date(ctx.lastTransactionTimestamp).getTime();
    const currentTime = new Date(tx.timestamp).getTime();
    const diffHours = (currentTime - lastTime) / (1000 * 60 * 60);

    if (diffHours >= 0 && diffHours < IMPOSSIBLE_TRAVEL_WINDOW_HOURS) {
      return buildSignal('IMPOSSIBLE_TRAVEL', {
        fromCountry: ctx.lastTransactionCountry,
        toCountry: tx.country,
        timeDiffMinutes: Math.round(diffHours * 60),
      });
    }
  }
  return null;
}

export function ruleMultiCountryRapidSwitch(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.recentDistinctCountries1h.length >= 2) {
    return buildSignal('MULTI_COUNTRY_RAPID_SWITCH', {
      countries: ctx.recentDistinctCountries1h,
    });
  }
  return null;
}

export function ruleUnusualHour(tx: Transaction): RuleResult {
  // SAST = UTC+2. Hours 0–4 UTC = 2–6 SAST — middle of night in SA.
  const hour = new Date(tx.timestamp).getUTCHours();
  if (hour >= 0 && hour < 5) {
    return buildSignal('UNUSUAL_HOUR', { utcHour: hour });
  }
  return null;
}

export function ruleAmountAnomaly(tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.avgHistoricalAmount <= 0 || ctx.stdDevAmount <= 0) return null;

  const deviation = (tx.amount - ctx.avgHistoricalAmount) / ctx.stdDevAmount;

  if (deviation >= 3) {
    return buildSignal('AMOUNT_FAR_ABOVE_BASELINE', {
      amount: tx.amount,
      avg: ctx.avgHistoricalAmount,
      stdDev: ctx.stdDevAmount,
      zScore: parseFloat(deviation.toFixed(2)),
    });
  }

  if (deviation >= 2) {
    return buildSignal('AMOUNT_MODERATELY_ABOVE_BASELINE', {
      amount: tx.amount,
      avg: ctx.avgHistoricalAmount,
      stdDev: ctx.stdDevAmount,
      zScore: parseFloat(deviation.toFixed(2)),
    });
  }

  return null;
}

export function ruleVelocity1m(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.recentTransactionCount1m >= 3) {
    return buildSignal('HIGH_VELOCITY_1M', { count: ctx.recentTransactionCount1m });
  }
  return null;
}

export function ruleVelocity5m(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.recentTransactionCount5m >= 5) {
    return buildSignal('HIGH_VELOCITY_5M', { count: ctx.recentTransactionCount5m });
  }
  return null;
}

export function ruleVelocity1h(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.recentTransactionCount1h >= 20) {
    return buildSignal('HIGH_VELOCITY_1H', { count: ctx.recentTransactionCount1h });
  }
  return null;
}

export function ruleRecentDeclines(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.recentDeclines >= 4) {
    return buildSignal('EXCESSIVE_DECLINES', { declines: ctx.recentDeclines });
  }
  if (ctx.recentDeclines >= 2) {
    return buildSignal('RECENT_DECLINES', { declines: ctx.recentDeclines });
  }
  return null;
}

export function ruleCardTesting(tx: Transaction, ctx: UserContext): RuleResult {
  // In ZAR: card testing bots send micro-amounts (R0.10–R9.99) in rapid succession
  const isLowValue = tx.amount < 10;
  const isHighVelocity = ctx.recentTransactionCount5m >= 3;

  if (isLowValue && isHighVelocity) {
    return buildSignal('CARD_TESTING_PATTERN', {
      amount: tx.amount,
      currency: tx.currency,
      recentCount5m: ctx.recentTransactionCount5m,
    });
  }
  return null;
}

export function ruleMerchantCategory(tx: Transaction): RuleResult {
  if (VERY_HIGH_RISK_CATEGORIES.has(tx.merchantCategory)) {
    return buildSignal('VERY_HIGH_RISK_MERCHANT', { category: tx.merchantCategory });
  }
  if (RISKY_CATEGORIES.has(tx.merchantCategory)) {
    return buildSignal('RISKY_MERCHANT_CATEGORY', { category: tx.merchantCategory });
  }
  return null;
}

export function ruleHighRiskCountry(tx: Transaction): RuleResult {
  // Neighbouring countries (BW, ZW etc.) are not high-risk despite being cross-border
  if (
    (HIGH_RISK_COUNTRIES.has(tx.country) && !SA_NEIGHBOUR_COUNTRIES.has(tx.country)) ||
    HIGH_RISK_COUNTRIES.has(tx.ipCountry)
  ) {
    return buildSignal('HIGH_RISK_COUNTRY', {
      txCountry: tx.country,
      ipCountry: tx.ipCountry,
    });
  }
  return null;
}

export function ruleChargebacks(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.priorChargebacks >= 3) {
    return buildSignal('EXCESSIVE_CHARGEBACKS', { count: ctx.priorChargebacks });
  }
  if (ctx.priorChargebacks >= 1) {
    return buildSignal('PRIOR_CHARGEBACKS', { count: ctx.priorChargebacks });
  }
  return null;
}

export function ruleNewAccount(_tx: Transaction, ctx: UserContext): RuleResult {
  if (ctx.accountAgeDays < 7) {
    return buildSignal('NEW_ACCOUNT', { accountAgeDays: ctx.accountAgeDays });
  }
  return null;
}

export function ruleAtypicalMerchant(tx: Transaction, ctx: UserContext): RuleResult {
  if (
    ctx.userTypicalMerchantCategories.length > 0 &&
    !ctx.userTypicalMerchantCategories.includes(tx.merchantCategory)
  ) {
    return buildSignal('ATYPICAL_MERCHANT_CATEGORY', {
      category: tx.merchantCategory,
      typicalCategories: ctx.userTypicalMerchantCategories,
    });
  }
  return null;
}

export function ruleMagstripeEntry(tx: Transaction): RuleResult {
  if (tx.entryMode === 'MAGSTRIPE') {
    return buildSignal('MAGSTRIPE_ENTRY', { entryMode: tx.entryMode, merchant: tx.merchant });
  }
  return null;
}

export function ruleSimSwapPattern(tx: Transaction, ctx: UserContext): RuleResult {
  if (
    tx.issuingBank &&
    SA_ISSUING_BANKS.has(tx.issuingBank) &&
    SIM_SWAP_ORIGIN_COUNTRIES.has(tx.ipCountry) &&
    !ctx.isKnownDevice
  ) {
    return buildSignal('SIM_SWAP_PATTERN', {
      issuingBank: tx.issuingBank,
      ipCountry: tx.ipCountry,
    });
  }
  return null;
}

export function ruleThreeDsFailed(tx: Transaction): RuleResult {
  const isOnline = tx.channel === 'WEB' || tx.channel === 'API';
  if (
    isOnline &&
    (tx.threeDsStatus === 'FAILED' || tx.threeDsStatus === 'NOT_ATTEMPTED') &&
    tx.amount > 500
  ) {
    return buildSignal('THREE_DS_FAILED', {
      threeDsStatus: tx.threeDsStatus,
      amount: tx.amount,
    });
  }
  return null;
}

export const ALL_RULES: Array<(tx: Transaction, ctx: UserContext) => RuleResult> = [
  ruleCardTesting,
  ruleImpossibleTravel,
  ruleVelocity1m,
  ruleRecentDeclines,
  ruleSimSwapPattern,
  ruleMagstripeEntry,
  ruleNewDevice,
  ruleIpCountryMismatch,
  ruleAmountAnomaly,
  ruleHighRiskCountry,
  ruleMultiCountryRapidSwitch,
  ruleMerchantCategory,
  ruleThreeDsFailed,
  ruleVelocity5m,
  ruleCrossBorderMismatch,
  ruleCardBinMismatch,
  ruleChargebacks,
  ruleUnusualHour,
  ruleVelocity1h,
  ruleNewAccount,
  ruleAtypicalMerchant,
];
