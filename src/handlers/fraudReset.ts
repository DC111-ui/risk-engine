import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { TransactionStore } from '../services/transactionStore';
import { ok, serverError } from '../utils/lambdaResponse';

const store = new TransactionStore();

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const deletedCount = await store.deleteAll();
    return ok({ ok: true, deletedCount, clearedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[fraud-reset] unhandled error:', err);
    return serverError('Failed to reset transaction feed', 'RESET_FAILED');
  }
};
