import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { TransactionStore } from '../services/transactionStore';
import { ok, badRequest, serverError } from '../utils/lambdaResponse';

const store = new TransactionStore();

const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const rawLimit = event.queryStringParameters?.limit;
    let limit = DEFAULT_LIMIT;

    if (rawLimit !== undefined) {
      const parsed = parseInt(rawLimit, 10);
      if (isNaN(parsed) || parsed < 1) {
        return badRequest('limit must be a positive integer', 'INVALID_LIMIT');
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const items = await store.getLatestFeed(limit);

    return ok({ ok: true, count: items.length, items });
  } catch (err) {
    console.error('[fraud-feed] unhandled error:', err);
    return serverError('Failed to retrieve transaction feed', 'FEED_FAILED');
  }
};
