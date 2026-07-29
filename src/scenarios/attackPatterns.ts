import { Transaction } from '../models/transaction';
import { UserContext } from '../models/context';

export interface TransactionEvent {
  transaction: Transaction;
  context: UserContext;
  label: string;
}

// ---------------------------------------------------------------------------
// PATTERN 1: Card Testing Burst (ZAR)
// Attacker runs 10 micro-ZAR transactions in under 2 minutes to validate a
// stolen card number — common against SA online merchants.
// ---------------------------------------------------------------------------
export function generateCardTestingBurst(
  userId: string,
  deviceId: string,
  baseTimestamp: string,
): TransactionEvent[] {
  const base = new Date(baseTimestamp).getTime();
  const amounts = [0.10, 0.50, 1.00, 1.00, 2.00, 2.00, 3.00, 5.00, 9.99, 9.99];

  return amounts.map((amount, i) => {
    const timestamp = new Date(base + i * 12_000).toISOString();

    const transaction: Transaction = {
      transactionId: `txn_ct_burst_${userId}_${i + 1}`,
      userId,
      amount,
      currency: 'ZAR',
      merchant: 'Clicks',
      merchantCategory: 'PHARMACY',
      country: 'ZA',
      ipCountry: 'ZA',
      deviceId,
      timestamp,
      cardNetwork: 'VISA',
      cardLast4: '0000',
      cardType: 'DEBIT',
      issuingBank: 'Capitec Bank',
      entryMode: 'CNP',
      threeDsStatus: 'NOT_ATTEMPTED',
      mcc: '5912',
      paymentMethod: 'CARD',
      channel: 'API',
      accountAgeDays: 1,
    };

    const context: UserContext = {
      userId,
      userHomeCountry: 'ZA',
      recentCountries: ['ZA'],
      recentDistinctCountries1h: ['ZA'],
      lastSeenDeviceIds: [],
      isKnownDevice: false,
      avgHistoricalAmount: 0,
      stdDevAmount: 0,
      userTypicalMerchantCategories: [],
      recentMerchants: [],
      recentTransactionCount1m: Math.min(i, 4),
      recentTransactionCount5m: Math.min(i, 9),
      recentTransactionCount1h: i,
      recentDeclines: Math.floor(i * 0.4),
      recentAttempts: i,
      accountAgeDays: 1,
      priorChargebacks: 0,
    };

    return { transaction, context, label: `Card Test #${i + 1} — R${amount.toFixed(2)}` };
  });
}

// ---------------------------------------------------------------------------
// PATTERN 2: Account Takeover Burst (SA — FNB victim, NG attacker)
// Attacker gains FNB credentials, changes device, escalates from Takealot
// to Incredible Connection to Luno to WorldRemit before victim notices.
// ---------------------------------------------------------------------------
export function generateAccountTakeoverBurst(
  userId: string,
  homeCountry: string,
  attackerDeviceId: string,
  baseTimestamp: string,
): TransactionEvent[] {
  const base = new Date(baseTimestamp).getTime();

  const events: Array<{
    amount: number;
    merchant: string;
    category: 'RETAIL' | 'ELECTRONICS' | 'CRYPTO_EXCHANGE' | 'MONEY_TRANSFER';
    minOffset: number;
  }> = [
    { amount: 299.00,   merchant: 'Takealot',             category: 'RETAIL',          minOffset: 0  },
    { amount: 1899.00,  merchant: 'Mr Price',              category: 'RETAIL',          minOffset: 3  },
    { amount: 5499.00,  merchant: 'Incredible Connection', category: 'ELECTRONICS',     minOffset: 7  },
    { amount: 12500.00, merchant: 'Luno',                  category: 'CRYPTO_EXCHANGE', minOffset: 12 },
    { amount: 35000.00, merchant: 'VALR',                  category: 'CRYPTO_EXCHANGE', minOffset: 15 },
    { amount: 49999.00, merchant: 'WorldRemit',            category: 'MONEY_TRANSFER',  minOffset: 18 },
  ];

  return events.map(({ amount, merchant, category, minOffset }, i) => {
    const timestamp = new Date(base + minOffset * 60_000).toISOString();

    const transaction: Transaction = {
      transactionId: `txn_ato_${userId}_${i + 1}`,
      userId,
      amount,
      currency: 'ZAR',
      merchant,
      merchantCategory: category,
      country: 'NG',
      ipCountry: 'NG',
      deviceId: attackerDeviceId,
      timestamp,
      cardNetwork: 'VISA',
      cardLast4: '6612',
      cardType: 'CREDIT',
      issuingBank: 'FNB',
      entryMode: 'CNP',
      threeDsStatus: 'FAILED',
      mcc: category === 'CRYPTO_EXCHANGE' ? '6051' : category === 'MONEY_TRANSFER' ? '6099' : '5734',
      paymentMethod: 'CARD',
      channel: 'WEB',
      accountAgeDays: 400,
      priorChargebacks: 0,
    };

    const context: UserContext = {
      userId,
      userHomeCountry: homeCountry,
      recentCountries: [homeCountry, 'NG'],
      recentDistinctCountries1h: ['NG'],
      lastSeenDeviceIds: ['device_original_fnb_trusted'],
      isKnownDevice: false,
      avgHistoricalAmount: 900.00,
      stdDevAmount: 400.00,
      userTypicalMerchantCategories: ['RETAIL', 'GROCERY', 'SUBSCRIPTION'],
      recentMerchants: ['Pick n Pay', 'Woolworths', 'Netflix SA'],
      recentTransactionCount1m: 0,
      recentTransactionCount5m: Math.min(i, 4),
      recentTransactionCount1h: i + 1,
      recentDeclines: Math.max(0, i - 2),
      recentAttempts: i + 1,
      accountAgeDays: 400,
      priorChargebacks: 0,
      lastTransactionCountry: i > 0 ? 'NG' : homeCountry,
    };

    return { transaction, context, label: `ATO Step ${i + 1} — R${amount.toFixed(2)} @ ${merchant}` };
  });
}

// ---------------------------------------------------------------------------
// PATTERN 3: Impossible Travel — Johannesburg to London
// Legitimate ZA card used at OR Tambo shops, then cloned card at Heathrow.
// ---------------------------------------------------------------------------
export function generateImpossibleTravelBurst(
  userId: string,
  deviceId: string,
  baseTimestamp: string,
): TransactionEvent[] {
  const base = new Date(baseTimestamp).getTime();

  const legs: Array<{
    country: string;
    ipCountry: string;
    city: string;
    merchant: string;
    currency: 'ZAR' | 'GBP' | 'EUR';
    amount: number;
    minOffset: number;
  }> = [
    { country: 'ZA', ipCountry: 'ZA', city: 'Johannesburg', merchant: 'Woolworths',        currency: 'ZAR', amount: 620.00,  minOffset: 0  },
    { country: 'GB', ipCountry: 'GB', city: 'London',       merchant: 'Harrods',           currency: 'GBP', amount: 1850.00, minOffset: 45 },
    { country: 'AE', ipCountry: 'AE', city: 'Dubai',        merchant: 'Dubai Mall Jewels', currency: 'EUR', amount: 4200.00, minOffset: 90 },
  ];

  let lastCountry = '';
  let lastTimestamp = '';

  return legs.map(({ country, ipCountry, city, merchant, currency, amount, minOffset }, i) => {
    const timestamp = new Date(base + minOffset * 60_000).toISOString();

    const transaction: Transaction = {
      transactionId: `txn_travel_${userId}_${i + 1}`,
      userId,
      amount,
      currency,
      merchant,
      merchantCategory: i === 0 ? 'RETAIL' : 'LUXURY',
      country,
      ipCountry,
      deviceId,
      timestamp,
      cardNetwork: 'VISA',
      cardLast4: '5544',
      cardType: 'CREDIT',
      issuingBank: 'Nedbank',
      entryMode: i === 0 ? 'CHIP' : 'CONTACTLESS',
      mcc: i === 0 ? '5651' : '5999',
      paymentMethod: 'CARD',
      channel: 'POS',
      accountAgeDays: 960,
      priorChargebacks: 0,
    };

    const context: UserContext = {
      userId,
      userHomeCountry: 'ZA',
      recentCountries: ['ZA', country],
      recentDistinctCountries1h: i > 0 ? ['ZA', country] : ['ZA'],
      lastSeenDeviceIds: [deviceId],
      isKnownDevice: true,
      avgHistoricalAmount: 1500.00,
      stdDevAmount: 700.00,
      userTypicalMerchantCategories: ['RETAIL', 'GROCERY', 'TRAVEL'],
      recentMerchants: ['Woolworths', 'Pick n Pay'],
      recentTransactionCount1m: 0,
      recentTransactionCount5m: 0,
      recentTransactionCount1h: i + 1,
      recentDeclines: 0,
      recentAttempts: i + 1,
      accountAgeDays: 960,
      priorChargebacks: 0,
      lastTransactionCountry: lastCountry || undefined,
      lastTransactionTimestamp: lastTimestamp || undefined,
    };

    lastCountry = country;
    lastTimestamp = timestamp;

    return { transaction, context, label: `Travel Leg ${i + 1} — ${city} (${currency} ${amount.toFixed(2)})` };
  });
}

// ---------------------------------------------------------------------------
// PATTERN 4: Petrol Station Skimming Burst
// Legitimate CHIP fill-up at Engen, then cloned card used via MAGSTRIPE at
// multiple Shell/BP stations — classic SA skimming pattern.
// ---------------------------------------------------------------------------
export function generatePetrolSkimmingBurst(
  userId: string,
  baseTimestamp: string,
): TransactionEvent[] {
  const base = new Date(baseTimestamp).getTime();

  const events: Array<{
    merchant: string;
    amount: number;
    entryMode: 'CHIP' | 'MAGSTRIPE';
    deviceId: string;
    isKnownDevice: boolean;
    minOffset: number;
    label: string;
  }> = [
    { merchant: 'Engen',  amount: 820.00,  entryMode: 'CHIP',      deviceId: `device_${userId}_pos_home`,  isKnownDevice: true,  minOffset: 0,  label: 'Legitimate CHIP fill-up at Engen' },
    { merchant: 'Shell',  amount: 950.00,  entryMode: 'MAGSTRIPE', deviceId: `device_skimmed_terminal_001`, isKnownDevice: false, minOffset: 35, label: 'Cloned card MAGSTRIPE at Shell' },
    { merchant: 'BP',     amount: 1100.00, entryMode: 'MAGSTRIPE', deviceId: `device_skimmed_terminal_002`, isKnownDevice: false, minOffset: 55, label: 'Cloned card MAGSTRIPE at BP' },
    { merchant: 'Caltex', amount: 1200.00, entryMode: 'MAGSTRIPE', deviceId: `device_skimmed_atm_001`,      isKnownDevice: false, minOffset: 75, label: 'Cloned card MAGSTRIPE ATM withdrawal' },
  ];

  return events.map(({ merchant, amount, entryMode, deviceId, isKnownDevice, minOffset, label }, i) => {
    const timestamp = new Date(base + minOffset * 60_000).toISOString();

    const transaction: Transaction = {
      transactionId: `txn_skim_${userId}_${i + 1}`,
      userId,
      amount,
      currency: 'ZAR',
      merchant,
      merchantCategory: 'FUEL',
      country: 'ZA',
      ipCountry: 'ZA',
      deviceId,
      timestamp,
      cardNetwork: 'VISA',
      cardLast4: '2277',
      cardType: 'CHEQUE',
      issuingBank: 'ABSA',
      entryMode,
      mcc: '5541',
      paymentMethod: 'CARD',
      channel: 'POS',
      merchantRiskLevel: 'LOW',
      accountAgeDays: 1500,
      priorChargebacks: 0,
    };

    const context: UserContext = {
      userId,
      userHomeCountry: 'ZA',
      recentCountries: ['ZA'],
      recentDistinctCountries1h: ['ZA'],
      lastSeenDeviceIds: [`device_${userId}_pos_home`],
      isKnownDevice,
      avgHistoricalAmount: 900.00,
      stdDevAmount: 300.00,
      userTypicalMerchantCategories: ['FUEL', 'GROCERY', 'RETAIL'],
      recentMerchants: ['Engen', 'Shoprite'],
      recentTransactionCount1m: 0,
      recentTransactionCount5m: i > 0 ? i : 0,
      recentTransactionCount1h: i,
      recentDeclines: 0,
      recentAttempts: i + 1,
      accountAgeDays: 1500,
      priorChargebacks: 0,
    };

    return { transaction, context, label };
  });
}

// ---------------------------------------------------------------------------
// PATTERN 5: SIM Swap Burst (Capitec victim, NG attacker)
// Attacker intercepts OTPs after SIM swap, drains via Luno + WorldRemit.
// ---------------------------------------------------------------------------
export function generateSimSwapBurst(
  userId: string,
  baseTimestamp: string,
): TransactionEvent[] {
  const base = new Date(baseTimestamp).getTime();
  const attackerDevice = `sim-swap-device-${userId}`;

  const events: Array<{
    amount: number;
    merchant: string;
    category: 'GROCERY' | 'ELECTRONICS' | 'CRYPTO_EXCHANGE' | 'MONEY_TRANSFER';
    minOffset: number;
    threeDsStatus: 'NOT_ATTEMPTED' | 'FAILED';
    label: string;
  }> = [
    { amount: 50.00,    merchant: 'Pick n Pay',  category: 'GROCERY',         minOffset: 0,  threeDsStatus: 'NOT_ATTEMPTED', label: 'Probe: R50 card validation' },
    { amount: 3500.00,  merchant: 'Takealot',    category: 'ELECTRONICS',     minOffset: 4,  threeDsStatus: 'NOT_ATTEMPTED', label: 'Step 1: R3,500 Takealot purchase' },
    { amount: 9999.00,  merchant: 'iStore',      category: 'ELECTRONICS',     minOffset: 8,  threeDsStatus: 'FAILED',        label: 'Step 2: R9,999 iStore purchase' },
    { amount: 25000.00, merchant: 'Luno',        category: 'CRYPTO_EXCHANGE', minOffset: 12, threeDsStatus: 'FAILED',        label: 'Step 3: R25,000 Luno crypto drain' },
    { amount: 35000.00, merchant: 'WorldRemit',  category: 'MONEY_TRANSFER',  minOffset: 16, threeDsStatus: 'FAILED',        label: 'Step 4: R35,000 WorldRemit transfer' },
  ];

  return events.map(({ amount, merchant, category, minOffset, threeDsStatus, label }, i) => {
    const timestamp = new Date(base + minOffset * 60_000).toISOString();

    const transaction: Transaction = {
      transactionId: `txn_simswap_${userId}_${i + 1}`,
      userId,
      amount,
      currency: 'ZAR',
      merchant,
      merchantCategory: category,
      country: 'ZA',
      ipCountry: 'NG',
      deviceId: attackerDevice,
      timestamp,
      cardNetwork: 'MASTERCARD',
      cardLast4: '8831',
      cardType: 'DEBIT',
      issuingBank: 'Capitec Bank',
      entryMode: 'CNP',
      threeDsStatus,
      mcc: category === 'CRYPTO_EXCHANGE' ? '6051' : category === 'MONEY_TRANSFER' ? '6099' : '5734',
      paymentMethod: 'CARD',
      channel: 'WEB',
      accountAgeDays: 730,
      priorChargebacks: 0,
    };

    const context: UserContext = {
      userId,
      userHomeCountry: 'ZA',
      recentCountries: ['ZA'],
      recentDistinctCountries1h: ['ZA'],
      lastSeenDeviceIds: [`device_${userId}_original_phone`],
      isKnownDevice: false,
      avgHistoricalAmount: 450.00,
      stdDevAmount: 200.00,
      userTypicalMerchantCategories: ['GROCERY', 'TELECOM', 'RETAIL'],
      recentMerchants: ['Shoprite', 'Vodacom', 'Mr Price'],
      recentTransactionCount1m: 0,
      recentTransactionCount5m: i > 0 ? Math.min(i, 4) : 0,
      recentTransactionCount1h: i + 1,
      recentDeclines: Math.max(0, i - 1),
      recentAttempts: i + 1,
      accountAgeDays: 730,
      priorChargebacks: 0,
    };

    return { transaction, context, label };
  });
}
