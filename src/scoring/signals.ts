export type SignalCode =
  | 'NEW_DEVICE'
  | 'CROSS_BORDER_MISMATCH'
  | 'IP_COUNTRY_MISMATCH'
  | 'CARD_BIN_COUNTRY_MISMATCH'
  | 'IMPOSSIBLE_TRAVEL'
  | 'MULTI_COUNTRY_RAPID_SWITCH'
  | 'UNUSUAL_HOUR'
  | 'AMOUNT_FAR_ABOVE_BASELINE'
  | 'AMOUNT_MODERATELY_ABOVE_BASELINE'
  | 'HIGH_VELOCITY_1M'
  | 'HIGH_VELOCITY_5M'
  | 'HIGH_VELOCITY_1H'
  | 'RECENT_DECLINES'
  | 'EXCESSIVE_DECLINES'
  | 'CARD_TESTING_PATTERN'
  | 'RISKY_MERCHANT_CATEGORY'
  | 'VERY_HIGH_RISK_MERCHANT'
  | 'HIGH_RISK_COUNTRY'
  | 'PRIOR_CHARGEBACKS'
  | 'EXCESSIVE_CHARGEBACKS'
  | 'NEW_ACCOUNT'
  | 'ATYPICAL_MERCHANT_CATEGORY'
  | 'MAGSTRIPE_ENTRY'
  | 'SIM_SWAP_PATTERN'
  | 'THREE_DS_FAILED';

export type SignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TriggeredSignal {
  code: SignalCode;
  weight: number;
  severity: SignalSeverity;
  message: string;
  detail?: Record<string, unknown>;
}

export const SIGNAL_CATALOGUE: Record<SignalCode, Omit<TriggeredSignal, 'detail'>> = {
  NEW_DEVICE: {
    code: 'NEW_DEVICE',
    weight: 20,
    severity: 'MEDIUM',
    message: 'Transaction originated from a device not previously seen for this user.',
  },
  CROSS_BORDER_MISMATCH: {
    code: 'CROSS_BORDER_MISMATCH',
    weight: 15,
    severity: 'MEDIUM',
    message: 'Transaction country does not match user home country.',
  },
  IP_COUNTRY_MISMATCH: {
    code: 'IP_COUNTRY_MISMATCH',
    weight: 20,
    severity: 'HIGH',
    message: 'IP-resolved country differs from declared transaction country.',
  },
  CARD_BIN_COUNTRY_MISMATCH: {
    code: 'CARD_BIN_COUNTRY_MISMATCH',
    weight: 15,
    severity: 'MEDIUM',
    message: 'Card BIN issuing country does not match the transaction country.',
  },
  IMPOSSIBLE_TRAVEL: {
    code: 'IMPOSSIBLE_TRAVEL',
    weight: 40,
    severity: 'CRITICAL',
    message: 'User appears to have transacted in geographically incompatible locations within an implausible time window.',
  },
  MULTI_COUNTRY_RAPID_SWITCH: {
    code: 'MULTI_COUNTRY_RAPID_SWITCH',
    weight: 25,
    severity: 'HIGH',
    message: 'Multiple distinct countries observed in the last hour of activity.',
  },
  UNUSUAL_HOUR: {
    code: 'UNUSUAL_HOUR',
    weight: 10,
    severity: 'LOW',
    message: 'Transaction submitted between 00:00–04:59 SAST, outside typical activity window.',
  },
  AMOUNT_FAR_ABOVE_BASELINE: {
    code: 'AMOUNT_FAR_ABOVE_BASELINE',
    weight: 30,
    severity: 'HIGH',
    message: 'Transaction amount is significantly higher than this user\'s historical spending baseline (>3σ).',
  },
  AMOUNT_MODERATELY_ABOVE_BASELINE: {
    code: 'AMOUNT_MODERATELY_ABOVE_BASELINE',
    weight: 15,
    severity: 'MEDIUM',
    message: 'Transaction amount is moderately above this user\'s historical spending baseline (2–3σ).',
  },
  HIGH_VELOCITY_1M: {
    code: 'HIGH_VELOCITY_1M',
    weight: 35,
    severity: 'CRITICAL',
    message: 'Three or more transactions attempted within the last 60 seconds — burst velocity detected.',
  },
  HIGH_VELOCITY_5M: {
    code: 'HIGH_VELOCITY_5M',
    weight: 20,
    severity: 'HIGH',
    message: 'Five or more transactions attempted within the last 5 minutes.',
  },
  HIGH_VELOCITY_1H: {
    code: 'HIGH_VELOCITY_1H',
    weight: 10,
    severity: 'MEDIUM',
    message: 'Above-average transaction count in the last hour.',
  },
  RECENT_DECLINES: {
    code: 'RECENT_DECLINES',
    weight: 20,
    severity: 'MEDIUM',
    message: 'Two or more recent declines recorded in the last 24 hours.',
  },
  EXCESSIVE_DECLINES: {
    code: 'EXCESSIVE_DECLINES',
    weight: 35,
    severity: 'CRITICAL',
    message: 'Four or more declines in the last 24 hours — indicative of credential stuffing or account takeover.',
  },
  CARD_TESTING_PATTERN: {
    code: 'CARD_TESTING_PATTERN',
    weight: 40,
    severity: 'CRITICAL',
    message: 'Multiple low-value rapid-fire transactions detected — consistent with automated card validation.',
  },
  RISKY_MERCHANT_CATEGORY: {
    code: 'RISKY_MERCHANT_CATEGORY',
    weight: 15,
    severity: 'MEDIUM',
    message: 'Merchant category is associated with elevated fraud or money-laundering risk.',
  },
  VERY_HIGH_RISK_MERCHANT: {
    code: 'VERY_HIGH_RISK_MERCHANT',
    weight: 25,
    severity: 'HIGH',
    message: 'Merchant is classified as very high risk (crypto exchange, gambling, unregulated money transfer).',
  },
  HIGH_RISK_COUNTRY: {
    code: 'HIGH_RISK_COUNTRY',
    weight: 20,
    severity: 'HIGH',
    message: 'Transaction or IP originates from a jurisdiction with elevated fraud risk.',
  },
  PRIOR_CHARGEBACKS: {
    code: 'PRIOR_CHARGEBACKS',
    weight: 20,
    severity: 'HIGH',
    message: 'User has one or more prior chargebacks on record.',
  },
  EXCESSIVE_CHARGEBACKS: {
    code: 'EXCESSIVE_CHARGEBACKS',
    weight: 35,
    severity: 'CRITICAL',
    message: 'User has three or more prior chargebacks — indicative of serial dispute abuse.',
  },
  NEW_ACCOUNT: {
    code: 'NEW_ACCOUNT',
    weight: 15,
    severity: 'LOW',
    message: 'Account is less than 7 days old — insufficient history to establish behavioural baseline.',
  },
  ATYPICAL_MERCHANT_CATEGORY: {
    code: 'ATYPICAL_MERCHANT_CATEGORY',
    weight: 10,
    severity: 'LOW',
    message: 'Transaction merchant category has not appeared in this user\'s purchase history.',
  },
  MAGSTRIPE_ENTRY: {
    code: 'MAGSTRIPE_ENTRY',
    weight: 20,
    severity: 'HIGH',
    message: 'Card swiped via magnetic stripe — chip-and-PIN is mandatory at South African POS terminals. Magstripe use indicates potential card cloning.',
  },
  SIM_SWAP_PATTERN: {
    code: 'SIM_SWAP_PATTERN',
    weight: 20,
    severity: 'HIGH',
    message: 'SA-issued card transacting from a high-risk IP origin on an unrecognised device — consistent with SIM swap fraud targeting OTP interception.',
  },
  THREE_DS_FAILED: {
    code: 'THREE_DS_FAILED',
    weight: 15,
    severity: 'MEDIUM',
    message: '3D Secure authentication was not completed for this online transaction — elevated card-not-present fraud risk.',
  },
};
