import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { EventBridgeClient, DisableRuleCommand } from '@aws-sdk/client-eventbridge';
import { TransactionStore } from '../services/transactionStore';
import { ok, serverError } from '../utils/lambdaResponse';

const store = new TransactionStore();
const events = new EventBridgeClient({});
const RULE_NAME = process.env.STREAM_RULE_NAME!;

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    await events.send(new DisableRuleCommand({ Name: RULE_NAME }));
    await store.clearStreamState();

    return ok({ ok: true, stoppedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[fraud-stream-stop] error:', err);
    return serverError('Failed to stop transaction stream', 'STREAM_STOP_FAILED');
  }
};
