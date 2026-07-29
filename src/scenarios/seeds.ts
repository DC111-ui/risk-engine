import { Transaction } from '../models/transaction';
import { UserContext } from '../models/context';

export interface Scenario {
  name: string;
  description: string;
  transaction: Transaction;
  context: UserContext;
  expectedDecision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  expectedSignals?: string[];
}

// ---------------------------------------------------------------------------
// SCENARIO 1: Normal Shoprite Weekly Shop
// Regular grocery purchase, Capitec VISA debit, known device, ZA.
// Score: 0 → APPROVE
// ---------------------------------------------------------------------------
export const scenarioNormalShoprite: Scenario = {
  name: 'Normal Shoprite Weekly Shop',
  description: 'Regular grocery purchase from a known device in Johannesburg. Contactless VISA debit.',
  expectedDecision: 'APPROVE',
  transaction: {
    transactionId: 'txn_001_shoprite_jhb',
    userId: 'user_thabo_001',
    amount: 456.80,
    currency: 'ZAR',
    merchant: 'Shoprite',
    merchantCategory: 'GROCERY',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_thabo_samsung',
    timestamp: '2024-10-12T09:15:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '4821',
    cardType: 'DEBIT',
    issuingBank: 'Capitec Bank',
    entryMode: 'CONTACTLESS',
    mcc: '5411',
    postalCode: '2092',
    paymentMethod: 'CARD',
    channel: 'POS',
    merchantRiskLevel: 'LOW',
    accountAgeDays: 1200,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_thabo_001',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_thabo_samsung', 'device_thabo_tablet'],
    isKnownDevice: true,
    avgHistoricalAmount: 500.00,
    stdDevAmount: 200.00,
    userTypicalMerchantCategories: ['GROCERY', 'FUEL', 'RETAIL', 'FOOD_DELIVERY'],
    recentMerchants: ['Shoprite', 'Engen', 'Mr Price', 'Uber Eats'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 1200,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 2: Engen Petrol Fill-Up
// Standard CHIP transaction at petrol station, FNB cheque card.
// Score: 0 → APPROVE
// ---------------------------------------------------------------------------
export const scenarioPetrolFillUp: Scenario = {
  name: 'Engen Petrol Fill-Up',
  description: 'Routine fuel purchase with CHIP, Standard Bank Mastercard cheque card.',
  expectedDecision: 'APPROVE',
  transaction: {
    transactionId: 'txn_002_engen_pta',
    userId: 'user_nomsa_002',
    amount: 875.50,
    currency: 'ZAR',
    merchant: 'Engen',
    merchantCategory: 'FUEL',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_nomsa_iphone',
    timestamp: '2024-10-12T07:45:00.000Z',
    cardNetwork: 'MASTERCARD',
    cardLast4: '7302',
    cardType: 'CHEQUE',
    issuingBank: 'Standard Bank',
    entryMode: 'CHIP',
    mcc: '5541',
    postalCode: '0001',
    paymentMethod: 'CARD',
    channel: 'POS',
    merchantRiskLevel: 'LOW',
    accountAgeDays: 840,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_nomsa_002',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_nomsa_iphone', 'device_nomsa_macbook'],
    isKnownDevice: true,
    avgHistoricalAmount: 800.00,
    stdDevAmount: 250.00,
    userTypicalMerchantCategories: ['FUEL', 'GROCERY', 'RETAIL', 'SUBSCRIPTION'],
    recentMerchants: ['Engen', 'Checkers', 'Woolworths', 'Netflix SA'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 840,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 3: Legitimate Takealot Online Purchase
// FNB Gold VISA, 3DS authenticated, known device, normal amount.
// Score: 0 → APPROVE
// ---------------------------------------------------------------------------
export const scenarioTakealotOnline: Scenario = {
  name: 'Legitimate Takealot Online Purchase',
  description: 'Electronics purchase on Takealot, 3DS authenticated, known device.',
  expectedDecision: 'APPROVE',
  transaction: {
    transactionId: 'txn_003_takealot_cpt',
    userId: 'user_sipho_003',
    amount: 1249.00,
    currency: 'ZAR',
    merchant: 'Takealot',
    merchantCategory: 'ELECTRONICS',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_sipho_laptop',
    timestamp: '2024-10-12T14:30:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '3917',
    cardType: 'CREDIT',
    issuingBank: 'FNB',
    entryMode: 'CNP',
    threeDsStatus: 'AUTHENTICATED',
    mcc: '5734',
    paymentMethod: 'CARD',
    channel: 'WEB',
    merchantRiskLevel: 'LOW',
    accountAgeDays: 520,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_sipho_003',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_sipho_laptop', 'device_sipho_phone'],
    isKnownDevice: true,
    avgHistoricalAmount: 1100.00,
    stdDevAmount: 600.00,
    userTypicalMerchantCategories: ['ELECTRONICS', 'RETAIL', 'GROCERY', 'SUBSCRIPTION'],
    recentMerchants: ['Takealot', 'Pick n Pay', 'Netflix SA', 'Spotify SA'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 520,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 4: Card Testing Attack
// Automated micro-ZAR transactions, bot device, high velocity — carding pattern.
// Score: CARD_TESTING(40) + HIGH_VELOCITY_1M(35) + NEW_DEVICE(20) = 95 → BLOCK
// ---------------------------------------------------------------------------
export const scenarioCardTesting: Scenario = {
  name: 'Card Testing Attack',
  description: 'Automated card validation: micro-ZAR burst on unknown device, new account.',
  expectedDecision: 'BLOCK',
  expectedSignals: ['CARD_TESTING_PATTERN', 'HIGH_VELOCITY_1M', 'NEW_DEVICE'],
  transaction: {
    transactionId: 'txn_004_cardtest',
    userId: 'user_bot_004',
    amount: 1.00,
    currency: 'ZAR',
    merchant: 'Clicks',
    merchantCategory: 'PHARMACY',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_bot_za_001',
    timestamp: '2024-10-12T03:00:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '0000',
    cardType: 'DEBIT',
    issuingBank: 'Capitec Bank',
    entryMode: 'CNP',
    threeDsStatus: 'NOT_ATTEMPTED',
    mcc: '5912',
    paymentMethod: 'CARD',
    channel: 'API',
    accountAgeDays: 2,
  },
  context: {
    userId: 'user_bot_004',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: [],
    isKnownDevice: false,
    avgHistoricalAmount: 0,
    stdDevAmount: 0,
    userTypicalMerchantCategories: [],
    recentMerchants: [],
    recentTransactionCount1m: 4,
    recentTransactionCount5m: 8,
    recentTransactionCount1h: 12,
    recentDeclines: 3,
    recentAttempts: 12,
    accountAgeDays: 2,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 5: Impossible Travel — Johannesburg to London
// Legitimate ZA card used at OR Tambo, then cloned card used at Heathrow 45min later.
// Score: IMPOSSIBLE_TRAVEL(40) + CROSS_BORDER(15) + IP_MISMATCH(20) + MULTI_COUNTRY(25) = 100 → BLOCK
// ---------------------------------------------------------------------------
export const scenarioImpossibleTravel: Scenario = {
  name: 'Impossible Travel — Johannesburg to London',
  description: 'ZA card used in JHB, then same card used in London 45 minutes later — physically impossible.',
  expectedDecision: 'BLOCK',
  expectedSignals: ['IMPOSSIBLE_TRAVEL', 'CROSS_BORDER_MISMATCH', 'IP_COUNTRY_MISMATCH', 'MULTI_COUNTRY_RAPID_SWITCH'],
  transaction: {
    transactionId: 'txn_005_impossible_travel',
    userId: 'user_lerato_005',
    amount: 3200.00,
    currency: 'GBP',
    merchant: 'Harrods',
    merchantCategory: 'LUXURY',
    country: 'GB',
    ipCountry: 'GB',
    deviceId: 'device_lerato_phone',
    timestamp: '2024-10-12T11:45:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '5544',
    cardType: 'CREDIT',
    issuingBank: 'Nedbank',
    entryMode: 'CONTACTLESS',
    mcc: '5999',
    paymentMethod: 'CARD',
    channel: 'POS',
    accountAgeDays: 960,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_lerato_005',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA', 'GB'],
    recentDistinctCountries1h: ['ZA', 'GB'],
    lastSeenDeviceIds: ['device_lerato_phone'],
    isKnownDevice: true,
    avgHistoricalAmount: 1500.00,
    stdDevAmount: 700.00,
    userTypicalMerchantCategories: ['RETAIL', 'GROCERY', 'TRAVEL'],
    recentMerchants: ['Woolworths', 'Pick n Pay', 'FlySafair'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 2,
    recentDeclines: 0,
    recentAttempts: 2,
    accountAgeDays: 960,
    priorChargebacks: 0,
    lastTransactionCountry: 'ZA',
    lastTransactionTimestamp: '2024-10-12T11:00:00.000Z', // 45 min ago
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 6: SIM Swap Probe — Low Amount Test
// Attacker has OTP access via SIM swap, tests Capitec card with small ZAR amount.
// Score: NEW_DEVICE(20) + IP_MISMATCH(20) + SIM_SWAP(20) = 60 → REVIEW
// ---------------------------------------------------------------------------
export const scenarioSimSwapProbe: Scenario = {
  name: 'SIM Swap Probe',
  description: 'Capitec card probed from Nigerian IP on unknown device — early-stage SIM swap verification.',
  expectedDecision: 'REVIEW',
  expectedSignals: ['NEW_DEVICE', 'IP_COUNTRY_MISMATCH', 'SIM_SWAP_PATTERN'],
  transaction: {
    transactionId: 'txn_006_simswap_probe',
    userId: 'user_zanele_006',
    amount: 50.00,
    currency: 'ZAR',
    merchant: 'Pick n Pay',
    merchantCategory: 'GROCERY',
    country: 'ZA',
    ipCountry: 'NG',
    deviceId: 'device_ng_attacker_001',
    timestamp: '2024-10-12T15:20:00.000Z',
    cardNetwork: 'MASTERCARD',
    cardLast4: '8831',
    cardType: 'DEBIT',
    issuingBank: 'Capitec Bank',
    entryMode: 'CNP',
    threeDsStatus: 'NOT_ATTEMPTED',
    mcc: '5411',
    paymentMethod: 'CARD',
    channel: 'WEB',
    accountAgeDays: 730,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_zanele_006',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_zanele_huawei'],
    isKnownDevice: false,
    avgHistoricalAmount: 400.00,
    stdDevAmount: 200.00,
    userTypicalMerchantCategories: ['GROCERY', 'TELECOM', 'RETAIL'],
    recentMerchants: ['Shoprite', 'Vodacom', 'Clicks'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 1,
    recentTransactionCount1h: 2,
    recentDeclines: 0,
    recentAttempts: 2,
    accountAgeDays: 730,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 7: Full SIM Swap Drain — Large Luno Transfer
// Attacker drains Capitec account via Luno crypto after OTP interception.
// Score: NEW_DEVICE(20) + IP_MISMATCH(20) + SIM_SWAP(20) + AMOUNT_FAR_ABOVE(30) = 90 → BLOCK
// ---------------------------------------------------------------------------
export const scenarioSimSwapDrain: Scenario = {
  name: 'Full SIM Swap Drain via Luno',
  description: 'SIM-swapped Capitec account drained via Luno crypto exchange from Nigerian IP.',
  expectedDecision: 'BLOCK',
  expectedSignals: ['NEW_DEVICE', 'IP_COUNTRY_MISMATCH', 'SIM_SWAP_PATTERN', 'AMOUNT_FAR_ABOVE_BASELINE'],
  transaction: {
    transactionId: 'txn_007_simswap_drain',
    userId: 'user_zanele_006',
    amount: 28500.00,
    currency: 'ZAR',
    merchant: 'Luno',
    merchantCategory: 'CRYPTO_EXCHANGE',
    country: 'ZA',
    ipCountry: 'NG',
    deviceId: 'device_ng_attacker_001',
    timestamp: '2024-10-12T15:35:00.000Z',
    cardNetwork: 'MASTERCARD',
    cardLast4: '8831',
    cardType: 'DEBIT',
    issuingBank: 'Capitec Bank',
    entryMode: 'CNP',
    threeDsStatus: 'FAILED',
    mcc: '6051',
    paymentMethod: 'CARD',
    channel: 'WEB',
    accountAgeDays: 730,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_zanele_006',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_zanele_huawei'],
    isKnownDevice: false,
    avgHistoricalAmount: 400.00,
    stdDevAmount: 200.00,
    userTypicalMerchantCategories: ['GROCERY', 'TELECOM', 'RETAIL'],
    recentMerchants: ['Shoprite', 'Vodacom', 'Clicks'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 1,
    recentTransactionCount1h: 3,
    recentDeclines: 0,
    recentAttempts: 3,
    accountAgeDays: 730,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 8: Petrol Station Skimming — Magstripe Clone
// Card cloned at Shell petrol station, used with magstripe on unknown device.
// Score: MAGSTRIPE(20) + NEW_DEVICE(20) + AMOUNT_MODERATELY_ABOVE(15) = 55 → REVIEW
// ---------------------------------------------------------------------------
export const scenarioPetrolSkimming: Scenario = {
  name: 'Petrol Station Card Skimming',
  description: 'Cloned card used with magstripe swipe at different Shell station — chip bypass indicates skimming.',
  expectedDecision: 'REVIEW',
  expectedSignals: ['MAGSTRIPE_ENTRY', 'NEW_DEVICE', 'AMOUNT_MODERATELY_ABOVE_BASELINE'],
  transaction: {
    transactionId: 'txn_008_petrol_skim',
    userId: 'user_bongani_008',
    amount: 1650.00,
    currency: 'ZAR',
    merchant: 'Shell',
    merchantCategory: 'FUEL',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_skim_terminal_001',
    timestamp: '2024-10-12T16:10:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '2277',
    cardType: 'CHEQUE',
    issuingBank: 'ABSA',
    entryMode: 'MAGSTRIPE',
    mcc: '5541',
    paymentMethod: 'CARD',
    channel: 'POS',
    merchantRiskLevel: 'LOW',
    accountAgeDays: 1500,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_bongani_008',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: ['device_bongani_terminal_home'],
    isKnownDevice: false,
    avgHistoricalAmount: 900.00,
    stdDevAmount: 300.00,
    userTypicalMerchantCategories: ['FUEL', 'GROCERY', 'RETAIL'],
    recentMerchants: ['Engen', 'Shoprite', 'Mr Price'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 1500,
    priorChargebacks: 0,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 9: Account Takeover — Luno Drain
// Excessive declines, attacker in NG, cross-border, high-risk crypto merchant.
// Score: EXCESSIVE_DECLINES(35) + CROSS_BORDER(15) + VERY_HIGH_RISK_MERCHANT(25) = 75 → BLOCK
// ---------------------------------------------------------------------------
export const scenarioAccountTakeover: Scenario = {
  name: 'Account Takeover — Luno Crypto Drain',
  description: 'Excessive declines followed by crypto drain from NG — classic ATO pattern.',
  expectedDecision: 'BLOCK',
  expectedSignals: ['EXCESSIVE_DECLINES', 'CROSS_BORDER_MISMATCH', 'VERY_HIGH_RISK_MERCHANT'],
  transaction: {
    transactionId: 'txn_009_ato_luno',
    userId: 'user_andile_009',
    amount: 15000.00,
    currency: 'ZAR',
    merchant: 'Luno',
    merchantCategory: 'CRYPTO_EXCHANGE',
    country: 'NG',
    ipCountry: 'NG',
    deviceId: 'device_andile_laptop',
    timestamp: '2024-10-12T08:30:00.000Z',
    cardNetwork: 'VISA',
    cardLast4: '6612',
    cardType: 'CREDIT',
    issuingBank: 'FNB',
    entryMode: 'CNP',
    threeDsStatus: 'FAILED',
    mcc: '6051',
    paymentMethod: 'CARD',
    channel: 'WEB',
    merchantRiskLevel: 'VERY_HIGH',
    accountAgeDays: 400,
    priorChargebacks: 2,
  },
  context: {
    userId: 'user_andile_009',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA', 'NG'],
    recentDistinctCountries1h: ['NG'],
    lastSeenDeviceIds: ['device_andile_laptop', 'device_andile_phone'],
    isKnownDevice: true,
    avgHistoricalAmount: 1200.00,
    stdDevAmount: 500.00,
    userTypicalMerchantCategories: ['RETAIL', 'GROCERY', 'SUBSCRIPTION'],
    recentMerchants: ['Woolworths', 'Pick n Pay', 'Netflix SA'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 1,
    recentTransactionCount1h: 6,
    recentDeclines: 5,
    recentAttempts: 8,
    accountAgeDays: 400,
    priorChargebacks: 2,
  },
};

// ---------------------------------------------------------------------------
// SCENARIO 10: New Account + Money Transfer — Potential Mule
// TymeBank account 3 days old, first device, sending money via WorldRemit.
// Score: NEW_ACCOUNT(15) + NEW_DEVICE(20) + RISKY_MERCHANT(15) = 50 → REVIEW
// ---------------------------------------------------------------------------
export const scenarioNewAccountMoneytransfer: Scenario = {
  name: 'New Account + Money Transfer',
  description: 'TymeBank account opened 3 days ago, first-ever device, immediately sending via WorldRemit.',
  expectedDecision: 'REVIEW',
  transaction: {
    transactionId: 'txn_010_newacct_worldremit',
    userId: 'user_mpho_010',
    amount: 3500.00,
    currency: 'ZAR',
    merchant: 'WorldRemit',
    merchantCategory: 'MONEY_TRANSFER',
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: 'device_mpho_new_phone',
    timestamp: '2024-10-12T13:00:00.000Z',
    cardNetwork: 'MASTERCARD',
    cardLast4: '1199',
    cardType: 'DEBIT',
    issuingBank: 'TymeBank',
    entryMode: 'CNP',
    threeDsStatus: 'AUTHENTICATED',
    mcc: '6099',
    paymentMethod: 'CARD',
    channel: 'WEB',
    accountAgeDays: 3,
    priorChargebacks: 0,
  },
  context: {
    userId: 'user_mpho_010',
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: [],
    isKnownDevice: false,
    avgHistoricalAmount: 0,
    stdDevAmount: 0,
    userTypicalMerchantCategories: [],
    recentMerchants: [],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: 3,
    priorChargebacks: 0,
  },
};

export const ALL_SCENARIOS: Scenario[] = [
  scenarioNormalShoprite,
  scenarioPetrolFillUp,
  scenarioTakealotOnline,
  scenarioCardTesting,
  scenarioImpossibleTravel,
  scenarioSimSwapProbe,
  scenarioSimSwapDrain,
  scenarioPetrolSkimming,
  scenarioAccountTakeover,
  scenarioNewAccountMoneytransfer,
];
