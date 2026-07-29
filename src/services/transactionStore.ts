import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
  type NativeAttributeValue,
} from '@aws-sdk/lib-dynamodb';
import { FeedItem } from '../types/api';
import { TriggeredSignal } from '../scoring/signals';

const FEED_PARTITION = 'LIVE';
const DEFAULT_FEED_LIMIT = 50;
const DYNAMO_BATCH_WRITE_LIMIT = 25;
const STREAM_STATE_PK = 'STREAM_STATE';

// ---------------------------------------------------------------------------
// Stored item shape — flat DynamoDB record
// ---------------------------------------------------------------------------

export interface StoredTransactionItem {
  transactionId: string;
  feedPartition: string;
  feedTimestamp: string;
  timestamp: string;
  userId: string;
  merchant: string;
  merchantCategory: string;
  amount: number;
  currency: string;
  country: string;
  ipCountry: string;
  deviceId: string;
  riskScore: number;
  decision: string;
  severity: string;
  triggeredSignals: string;
  reasons: string[];
  signalCount: number;
  topSignalCode: string | null;
  scoreBreakdown: string;
  scenarioType: string;
  isSynthetic: boolean;
  evaluatedAt: string;
  scoreVersion: string;
  // Card enrichment
  cardNetwork?: string;
  cardLast4?: string;
  cardType?: string;
  issuingBank?: string;
  entryMode?: string;
  threeDsStatus?: string;
  mcc?: string;
  isRecurring?: boolean;
  postalCode?: string;
}

export interface StreamState {
  streamStartedAt: string;
}

// ---------------------------------------------------------------------------
// TransactionStore
// ---------------------------------------------------------------------------

export class TransactionStore {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(opts?: { dynamoClient?: DynamoDBClient; tableName?: string }) {
    const rawClient = opts?.dynamoClient ?? new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(rawClient, {
      marshallOptions: { removeUndefinedValues: true },
    });
    this.tableName =
      opts?.tableName ??
      process.env.DYNAMODB_TABLE_NAME ??
      'fraud-risk-engine-transactions-prod';
  }

  async save(item: StoredTransactionItem): Promise<void> {
    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: item }),
    );
  }

  async saveBatch(items: StoredTransactionItem[]): Promise<void> {
    if (items.length === 0) return;
    for (const chunk of chunkArray(items, DYNAMO_BATCH_WRITE_LIMIT)) {
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
          },
        }),
      );
    }
  }

  async deleteAll(): Promise<number> {
    const keys: { transactionId: string }[] = [];
    let lastKey: Record<string, NativeAttributeValue> | undefined;

    do {
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'FeedIndex',
          KeyConditionExpression: 'feedPartition = :fp',
          ExpressionAttributeValues: { ':fp': FEED_PARTITION },
          ProjectionExpression: 'transactionId',
          Limit: 1000,
          ExclusiveStartKey: lastKey,
        }),
      );
      for (const item of result.Items ?? []) {
        keys.push({ transactionId: item.transactionId as string });
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    if (keys.length === 0) return 0;

    for (const chunk of chunkArray(keys, DYNAMO_BATCH_WRITE_LIMIT)) {
      await this.docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: chunk.map((key) => ({ DeleteRequest: { Key: key } })),
          },
        }),
      );
    }

    return keys.length;
  }

  async saveStreamState(startedAt: string): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { transactionId: STREAM_STATE_PK, streamStartedAt: startedAt },
      }),
    );
  }

  async getStreamState(): Promise<StreamState | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { transactionId: STREAM_STATE_PK },
      }),
    );
    if (!result.Item) return null;
    return { streamStartedAt: result.Item.streamStartedAt as string };
  }

  async clearStreamState(): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { transactionId: STREAM_STATE_PK },
      }),
    );
  }

  async getLatestFeed(limit = DEFAULT_FEED_LIMIT): Promise<FeedItem[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'FeedIndex',
        KeyConditionExpression: 'feedPartition = :fp',
        ExpressionAttributeValues: { ':fp': FEED_PARTITION },
        ScanIndexForward: false,
        Limit: Math.min(limit, 200),
      }),
    );
    return (result.Items ?? []).map(deserializeItem);
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function deserializeItem(raw: Record<string, unknown>): FeedItem {
  let triggeredSignals: TriggeredSignal[] = [];
  try {
    triggeredSignals = JSON.parse(raw.triggeredSignals as string);
  } catch {
    triggeredSignals = [];
  }

  return {
    transactionId:   raw.transactionId   as string,
    feedTimestamp:   raw.feedTimestamp   as string,
    timestamp:       raw.timestamp       as string,
    userId:          raw.userId          as string,
    merchant:        raw.merchant        as string,
    merchantCategory: raw.merchantCategory as string,
    amount:          raw.amount          as number,
    currency:        raw.currency        as string,
    country:         raw.country         as string,
    riskScore:       raw.riskScore       as number,
    decision:        raw.decision        as string,
    severity:        raw.severity        as string,
    triggeredSignals,
    signalCount:     raw.signalCount     as number,
    topSignalCode:   raw.topSignalCode   as string | null,
    scenarioType:    raw.scenarioType    as string,
    isSynthetic:     raw.isSynthetic     as boolean,
    evaluatedAt:     raw.evaluatedAt     as string,
    cardNetwork:     raw.cardNetwork     as string | undefined,
    cardLast4:       raw.cardLast4       as string | undefined,
    cardType:        raw.cardType        as string | undefined,
    issuingBank:     raw.issuingBank     as string | undefined,
    entryMode:       raw.entryMode       as string | undefined,
    threeDsStatus:   raw.threeDsStatus   as string | undefined,
    mcc:             raw.mcc             as string | undefined,
    isRecurring:     raw.isRecurring     as boolean | undefined,
    postalCode:      raw.postalCode      as string | undefined,
  };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
