import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { ok } from '../utils/lambdaResponse';

const VERSION = '2.0.0';

export const handler = async (
  _event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  return ok({
    ok: true,
    service: 'fraud-risk-engine',
    version: VERSION,
    timestamp: new Date().toISOString(),
    region: process.env.AWS_REGION ?? 'unknown',
    stage: process.env.STAGE ?? 'unknown',
  });
};
