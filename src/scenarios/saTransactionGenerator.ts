import { randomUUID } from 'crypto';
import type { Transaction, MerchantCategory } from '../models/transaction';
import type { UserContext } from '../models/context';

export type GeneratedSAEvent = { transaction: Transaction; context: UserContext };

// ---------------------------------------------------------------------------
// SA merchant catalogue with realistic ZAR amount ranges
// ---------------------------------------------------------------------------

type MerchantEntry = { name: string; mcc: string; min: number; max: number };

const SA_MERCHANTS: Record<string, MerchantEntry[]> = {
  GROCERY: [
    { name: 'Shoprite',          mcc: '5411', min: 80,   max: 900  },
    { name: 'Pick n Pay',        mcc: '5411', min: 100,  max: 1200 },
    { name: 'Checkers',          mcc: '5411', min: 90,   max: 900  },
    { name: 'Woolworths Food',   mcc: '5411', min: 200,  max: 2000 },
    { name: 'SPAR',              mcc: '5411', min: 80,   max: 600  },
    { name: 'Food Lover\'s Market', mcc: '5411', min: 150, max: 1000 },
  ],
  FUEL: [
    { name: 'Engen',   mcc: '5541', min: 300, max: 1200 },
    { name: 'Shell',   mcc: '5541', min: 300, max: 1200 },
    { name: 'BP',      mcc: '5541', min: 300, max: 1200 },
    { name: 'Sasol',   mcc: '5541', min: 300, max: 1200 },
    { name: 'Caltex',  mcc: '5541', min: 300, max: 1200 },
    { name: 'Total',   mcc: '5541', min: 300, max: 1200 },
  ],
  RETAIL: [
    { name: 'Mr Price',   mcc: '5651', min: 150, max: 800  },
    { name: 'Woolworths', mcc: '5651', min: 250, max: 2000 },
    { name: 'Edgars',     mcc: '5651', min: 300, max: 1500 },
    { name: 'Truworths',  mcc: '5651', min: 200, max: 1200 },
    { name: 'Foschini',   mcc: '5651', min: 200, max: 1500 },
    { name: 'Cotton On',  mcc: '5651', min: 150, max: 800  },
    { name: 'H&M',        mcc: '5651', min: 200, max: 1000 },
  ],
  ELECTRONICS: [
    { name: 'Takealot',                  mcc: '5734', min: 200,  max: 15000 },
    { name: 'Incredible Connection',     mcc: '5734', min: 500,  max: 20000 },
    { name: 'iStore',                    mcc: '5734', min: 500,  max: 30000 },
    { name: 'Game',                      mcc: '5734', min: 200,  max: 10000 },
    { name: 'Samsung Experience Store',  mcc: '5734', min: 500,  max: 25000 },
  ],
  FOOD_DELIVERY: [
    { name: 'Uber Eats',       mcc: '5812', min: 80,  max: 500 },
    { name: 'Mr D Food',       mcc: '5812', min: 80,  max: 400 },
    { name: 'Checkers Sixty60',mcc: '5411', min: 100, max: 600 },
  ],
  SUBSCRIPTION: [
    { name: 'DStv',         mcc: '7841', min: 599, max: 849 },
    { name: 'Netflix SA',   mcc: '7841', min: 99,  max: 289 },
    { name: 'Spotify SA',   mcc: '7841', min: 59,  max: 60  },
    { name: 'Amazon Prime', mcc: '7841', min: 99,  max: 99  },
  ],
  TELECOM: [
    { name: 'Vodacom', mcc: '4812', min: 50,  max: 500 },
    { name: 'MTN',     mcc: '4812', min: 50,  max: 500 },
    { name: 'Cell C',  mcc: '4812', min: 50,  max: 300 },
    { name: 'Telkom',  mcc: '4812', min: 100, max: 600 },
  ],
  PHARMACY: [
    { name: 'Clicks',   mcc: '5912', min: 80,  max: 600 },
    { name: 'Dischem',  mcc: '5912', min: 80,  max: 800 },
  ],
  FINANCIAL_SERVICES: [
    { name: 'Old Mutual',       mcc: '6411', min: 500,  max: 3000 },
    { name: 'Discovery Health', mcc: '6411', min: 1000, max: 5000 },
    { name: 'Momentum',         mcc: '6411', min: 800,  max: 3000 },
  ],
  ENTERTAINMENT: [
    { name: 'Ster-Kinekor',    mcc: '7832', min: 80,  max: 300  },
    { name: 'Nu Metro',        mcc: '7832', min: 80,  max: 300  },
    { name: 'Ticketmaster SA', mcc: '7929', min: 200, max: 2000 },
  ],
};

// Weighted category distribution reflecting SA spending patterns
const CATEGORY_DIST: [string, number][] = [
  ['GROCERY',           30],
  ['FUEL',              15],
  ['RETAIL',            14],
  ['FOOD_DELIVERY',     10],
  ['SUBSCRIPTION',       8],
  ['TELECOM',            7],
  ['PHARMACY',           5],
  ['ELECTRONICS',        5],
  ['ENTERTAINMENT',      3],
  ['FINANCIAL_SERVICES', 3],
];

const SA_BANKS = ['Capitec Bank', 'FNB', 'Standard Bank', 'ABSA', 'Nedbank', 'TymeBank', 'Discovery Bank', 'African Bank'];
const CARD_NETWORKS: Array<'VISA' | 'MASTERCARD'> = ['VISA', 'VISA', 'VISA', 'MASTERCARD', 'MASTERCARD']; // VISA ~60%
const CARD_TYPES: Array<'DEBIT' | 'CREDIT' | 'CHEQUE'> = ['DEBIT', 'DEBIT', 'CHEQUE', 'CREDIT']; // debit dominant in SA
const SA_POSTAL_CODES = ['2000', '2006', '2092', '2196', '0001', '0002', '4001', '4051', '7700', '7701', '8001', '6001'];
const SA_DEVICE_PREFIXES = ['samsung', 'huawei', 'iphone', 'xiaomi', 'oppo', 'lg', 'nokia'];

// Realistic entry mode distribution at SA POS terminals
const ENTRY_MODES_POS: Array<'CHIP' | 'CONTACTLESS'> = [
  'CONTACTLESS', 'CONTACTLESS', 'CONTACTLESS',
  'CHIP', 'CHIP',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function weightedPick(dist: [string, number][]): string {
  const total = dist.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of dist) {
    r -= w;
    if (r <= 0) return key;
  }
  return dist[0][0];
}

function makeLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function makeUserId(bank: string, suffix: string): string {
  return `za-${bank.replace(/\s+/g, '-').toLowerCase()}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Profile types
// ---------------------------------------------------------------------------

type ProfileType = 'clean' | 'mild' | 'suspicious';

function chooseProfile(): ProfileType {
  const r = Math.random();
  if (r < 0.65) return 'clean';
  if (r < 0.88) return 'mild';
  return 'suspicious';
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

export function generateRealisticSAEvent(timestamp: string): GeneratedSAEvent {
  const profile = chooseProfile();

  const category = weightedPick(CATEGORY_DIST) as MerchantCategory;
  const merchants = SA_MERCHANTS[category] ?? SA_MERCHANTS['GROCERY'];
  const merchantEntry = pick(merchants);
  const issuingBank = pick(SA_BANKS);
  const cardNetwork = pick(CARD_NETWORKS);
  const cardType = pick(CARD_TYPES);
  const isOnline = category === 'SUBSCRIPTION' || category === 'ELECTRONICS' || Math.random() < 0.12;
  const entryMode = isOnline ? 'CNP' : pick(ENTRY_MODES_POS);
  const amount = randFloat(merchantEntry.min, merchantEntry.max);
  const cardLast4 = makeLast4();
  const suffix = randomUUID().slice(0, 8);
  const userId = makeUserId(issuingBank, suffix);
  const deviceId = `device-${pick(SA_DEVICE_PREFIXES)}-${suffix}`;
  const postalCode = pick(SA_POSTAL_CODES);

  const avgHistoricalAmount = randFloat(400, 1200);
  const stdDevAmount = randFloat(150, 500);

  if (profile === 'clean') {
    return buildCleanEvent({
      userId, deviceId, timestamp, category, merchantEntry, issuingBank,
      cardNetwork, cardType, entryMode, amount, cardLast4, postalCode,
      isOnline, avgHistoricalAmount, stdDevAmount,
    });
  }

  if (profile === 'mild') {
    return buildMildEvent({
      userId, deviceId, timestamp, category, merchantEntry, issuingBank,
      cardNetwork, cardType, entryMode, amount, cardLast4, postalCode,
      isOnline, avgHistoricalAmount, stdDevAmount,
    });
  }

  return buildSuspiciousEvent({
    userId, deviceId, timestamp, category, merchantEntry, issuingBank,
    cardNetwork, cardType, entryMode, amount, cardLast4, postalCode,
    isOnline, avgHistoricalAmount, stdDevAmount,
  });
}

// ---------------------------------------------------------------------------
// Profile builders
// ---------------------------------------------------------------------------

type EventParams = {
  userId: string; deviceId: string; timestamp: string;
  category: MerchantCategory; merchantEntry: MerchantEntry;
  issuingBank: string; cardNetwork: 'VISA' | 'MASTERCARD';
  cardType: 'DEBIT' | 'CREDIT' | 'CHEQUE'; entryMode: string;
  amount: number; cardLast4: string; postalCode: string;
  isOnline: boolean; avgHistoricalAmount: number; stdDevAmount: number;
};

function buildCleanEvent(p: EventParams): GeneratedSAEvent {
  const transaction: Transaction = {
    transactionId: `txn-stream-${randomUUID()}`,
    userId: p.userId,
    amount: p.amount,
    currency: 'ZAR',
    merchant: p.merchantEntry.name,
    merchantCategory: p.category,
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: p.deviceId,
    timestamp: p.timestamp,
    cardNetwork: p.cardNetwork,
    cardLast4: p.cardLast4,
    cardType: p.cardType,
    issuingBank: p.issuingBank,
    entryMode: p.entryMode as any,
    threeDsStatus: p.isOnline ? 'AUTHENTICATED' : undefined,
    mcc: p.merchantEntry.mcc,
    postalCode: p.postalCode,
    paymentMethod: 'CARD',
    channel: p.isOnline ? 'WEB' : 'POS',
    merchantRiskLevel: 'LOW',
    accountAgeDays: Math.floor(randFloat(180, 2000)),
    priorChargebacks: 0,
  };

  const context: UserContext = {
    userId: p.userId,
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: [p.deviceId],
    isKnownDevice: true,
    avgHistoricalAmount: p.avgHistoricalAmount,
    stdDevAmount: p.stdDevAmount,
    userTypicalMerchantCategories: [p.category, 'GROCERY', 'FUEL'],
    recentMerchants: [p.merchantEntry.name],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: Math.floor(Math.random() * 3),
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: transaction.accountAgeDays!,
    priorChargebacks: 0,
  };

  return { transaction, context };
}

function buildMildEvent(p: EventParams): GeneratedSAEvent {
  // New device + amount moderately above baseline + odd hour
  const mildAmount = p.avgHistoricalAmount + p.stdDevAmount * randFloat(2.1, 2.8);

  const transaction: Transaction = {
    transactionId: `txn-stream-${randomUUID()}`,
    userId: p.userId,
    amount: parseFloat(mildAmount.toFixed(2)),
    currency: 'ZAR',
    merchant: p.merchantEntry.name,
    merchantCategory: p.category,
    country: 'ZA',
    ipCountry: 'ZA',
    deviceId: `${p.deviceId}-new`,
    timestamp: p.timestamp,
    cardNetwork: p.cardNetwork,
    cardLast4: p.cardLast4,
    cardType: p.cardType,
    issuingBank: p.issuingBank,
    entryMode: p.entryMode as any,
    threeDsStatus: p.isOnline ? 'NOT_ATTEMPTED' : undefined,
    mcc: p.merchantEntry.mcc,
    postalCode: p.postalCode,
    paymentMethod: 'CARD',
    channel: p.isOnline ? 'WEB' : 'POS',
    accountAgeDays: Math.floor(randFloat(30, 300)),
    priorChargebacks: 0,
  };

  const context: UserContext = {
    userId: p.userId,
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: [`${p.deviceId}-old`],
    isKnownDevice: false,
    avgHistoricalAmount: p.avgHistoricalAmount,
    stdDevAmount: p.stdDevAmount,
    userTypicalMerchantCategories: ['GROCERY', 'FUEL'],
    recentMerchants: [],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 0,
    recentTransactionCount1h: 1,
    recentDeclines: 0,
    recentAttempts: 1,
    accountAgeDays: transaction.accountAgeDays!,
    priorChargebacks: 0,
  };

  return { transaction, context };
}

function buildSuspiciousEvent(p: EventParams): GeneratedSAEvent {
  // SIM-swap pattern: SA bank + NG IP + new device + amount far above baseline
  const suspiciousAmount = p.avgHistoricalAmount + p.stdDevAmount * randFloat(3.5, 8);
  const capBanks = ['Capitec Bank', 'FNB', 'Standard Bank', 'ABSA', 'Nedbank'];
  const issuingBank = pick(capBanks);

  const transaction: Transaction = {
    transactionId: `txn-stream-${randomUUID()}`,
    userId: p.userId,
    amount: parseFloat(suspiciousAmount.toFixed(2)),
    currency: 'ZAR',
    merchant: pick(['Luno', 'VALR', 'WorldRemit', 'Takealot']),
    merchantCategory: Math.random() < 0.6 ? 'CRYPTO_EXCHANGE' : 'MONEY_TRANSFER',
    country: 'ZA',
    ipCountry: pick(['NG', 'KE', 'GH']),
    deviceId: `device-attacker-${randomUUID().slice(0, 8)}`,
    timestamp: p.timestamp,
    cardNetwork: p.cardNetwork,
    cardLast4: p.cardLast4,
    cardType: 'DEBIT',
    issuingBank,
    entryMode: 'CNP',
    threeDsStatus: 'FAILED',
    mcc: '6051',
    paymentMethod: 'CARD',
    channel: 'WEB',
    accountAgeDays: Math.floor(randFloat(180, 1500)),
    priorChargebacks: 0,
  };

  const context: UserContext = {
    userId: p.userId,
    userHomeCountry: 'ZA',
    recentCountries: ['ZA'],
    recentDistinctCountries1h: ['ZA'],
    lastSeenDeviceIds: [`device-${p.userId}-original`],
    isKnownDevice: false,
    avgHistoricalAmount: p.avgHistoricalAmount,
    stdDevAmount: p.stdDevAmount,
    userTypicalMerchantCategories: ['GROCERY', 'TELECOM', 'RETAIL'],
    recentMerchants: ['Shoprite', 'Vodacom'],
    recentTransactionCount1m: 0,
    recentTransactionCount5m: 1,
    recentTransactionCount1h: 2,
    recentDeclines: 0,
    recentAttempts: 2,
    accountAgeDays: transaction.accountAgeDays!,
    priorChargebacks: 0,
  };

  return { transaction, context };
}
