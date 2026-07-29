import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SUPPORTED_SCENARIOS } from '../types/api';
import { isSupportedScenario, runBatchScenario } from '../services/scenarioService';
import { TransactionStore } from '../services/transactionStore';
import { ok, badRequest, notFound, serverError } from '../utils/lambdaResponse';

const store = new TransactionStore();

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const scenario = event.pathParameters?.scenario?.toLowerCase() ?? '';

    if (!scenario) {
      return badRequest(
        `scenario path parameter is required. Supported: ${SUPPORTED_SCENARIOS.join(', ')}`,
        'MISSING_SCENARIO',
      );
    }

    if (!isSupportedScenario(scenario)) {
      return notFound(
        `Unknown scenario "${scenario}". Supported: ${SUPPORTED_SCENARIOS.join(', ')}`,
        'UNKNOWN_SCENARIO',
      );
    }

    const startedAt = new Date().toISOString();
    const result = runBatchScenario(scenario);

    let writtenToDynamo = false;
    try {
      await store.saveBatch(result.items);
      writtenToDynamo = true;
    } catch (dbErr) {
      console.error('[fraud-simulate] DynamoDB batch write failed:', dbErr);
    }

    const completedAt = new Date().toISOString();

    return ok({
      ok: true,
      scenario: result.scenario,
      generatedCount: result.generatedCount,
      decisionBreakdown: result.decisionBreakdown,
      writtenToDynamo,
      startedAt,
      completedAt,
    });
  } catch (err) {
    console.error('[fraud-simulate] unhandled error:', err);
    return serverError('Scenario simulation failed', 'SIMULATE_FAILED');
  }
};
