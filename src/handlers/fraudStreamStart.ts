import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { EventBridgeClient, EnableRuleCommand } from '@aws-sdk/client-eventbridge';
import { TransactionStore } from '../services/transactionStore';
import { ok, serverError } from '../utils/lambdaResponse';

const store = new TransactionStore();
const events = new EventBridgeClient({});
const RULE_NAME = process.env.STREAM_RULE_NAME!;
const STREAM_TTL_MINUTES = 10;

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + STREAM_TTL_MINUTES * 60_000);

    await events.send(new EnableRuleCommand({ Name: RULE_NAME }));
    await store.saveStreamState(now.toISOString());

    return ok({
      ok: true,
      streamStartedAt: now.toISOString(),
      streamExpiresAt: expiresAt.toISOString(),
      ttlMinutes: STREAM_TTL_MINUTES,
    });
  } catch (err) {
    console.error('[fraud-stream-start] error:', err);
    return serverError('Failed to start transaction stream', 'STREAM_START_FAILED');
  }
};
