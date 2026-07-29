export type Currency = 'ZAR' | 'USD' | 'EUR' | 'GBP' | 'BWP' | 'ZWL' | 'MZN' | 'NAD' | string;

export type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX';
export type CardType = 'DEBIT' | 'CREDIT' | 'CHEQUE';
export type EntryMode = 'CHIP' | 'CONTACTLESS' | 'MAGSTRIPE' | 'CNP' | 'MANUAL';
export type ThreeDsStatus = 'AUTHENTICATED' | 'NOT_ATTEMPTED' | 'FAILED';
export type PaymentMethod = 'CARD' | 'BANK_TRANSFER' | 'CRYPTO' | 'WALLET' | 'BNPL';
export type Channel = 'WEB' | 'MOBILE' | 'API' | 'POS' | 'ATM';

export type MerchantCategory =
  | 'RETAIL'
  | 'GROCERY'
  | 'TRAVEL'
  | 'ENTERTAINMENT'
  | 'GAMBLING'
  | 'CRYPTO_EXCHANGE'
  | 'MONEY_TRANSFER'
  | 'LUXURY'
  | 'FUEL'
  | 'PHARMACY'
  | 'ELECTRONICS'
  | 'SUBSCRIPTION'
  | 'FOOD_DELIVERY'
  | 'FINANCIAL_SERVICES'
  | 'TELECOM'
  | 'UNKNOWN';

export type MerchantRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface Transaction {
  transactionId: string;
  userId: string;
  amount: number;
  currency: Currency;
  merchant: string;
  merchantCategory: MerchantCategory;
  country: string;
  ipCountry: string;
  deviceId: string;
  timestamp: string;

  // Card enrichment
  cardNetwork?: CardNetwork;
  cardLast4?: string;
  cardType?: CardType;
  issuingBank?: string;
  entryMode?: EntryMode;

  // Online auth
  threeDsStatus?: ThreeDsStatus;
  mcc?: string;
  isRecurring?: boolean;

  // Location
  postalCode?: string;

  // Legacy / gateway enrichment
  cardBinCountry?: string;
  paymentMethod?: PaymentMethod;
  channel?: Channel;
  merchantRiskLevel?: MerchantRiskLevel;
  accountAgeDays?: number;
  priorChargebacks?: number;
}
