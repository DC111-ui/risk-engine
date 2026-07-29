import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ScoreRequest } from '../types/api';
import { runScoring, buildStoredItem } from '../services/scoreService';
import { TransactionStore } from '../services/transactionStore';
import { ok, badRequest, serverError, parseBody } from '../utils/lambdaResponse';

// Singleton — reused across warm Lambda invocations
const store = new TransactionStore();

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = parseBody<ScoreRequest>(event.body);
    if (!body) return badRequest('Request body is required and must be valid JSON', 'MISSING_BODY');

    const { transaction, context, persist = true } = body;

    if (!transaction) return badRequest('transaction object is required', 'MISSING_TRANSACTION');
    if (!context)     return badRequest('context object is required',     'MISSING_CONTEXT');

    let result;
    try {
      result = runScoring(transaction, context);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Scoring failed';
      // Validation errors from the engine are client errors
      if (msg.startsWith('RiskEngine:')) return badRequest(msg, 'VALIDATION_ERROR');
      throw err;
    }

    let persisted = false;
    if (persist) {
      try {
        const item = buildStoredItem(result, transaction, {
          scenarioType: 'manual',
          isSynthetic: false,
        });
        await store.save(item);
        persisted = true;
      } catch (dbErr) {
        // DynamoDB failure is non-fatal: the score is still returned to the caller
        console.error('[fraud-score] DynamoDB persist failed:', dbErr);
      }
    }

    return ok({ ok: true, result, persisted });
  } catch (err) {
    console.error('[fraud-score] unhandled error:', err);
    return serverError('Internal scoring error', 'SCORE_FAILED');
  }
};
