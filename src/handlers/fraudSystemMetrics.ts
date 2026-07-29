import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from '@aws-sdk/client-cloudwatch';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';

const cw = new CloudWatchClient({});

const CORS = process.env.CORS_ALLOW_ORIGIN ?? '*';

function headers() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS,
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function safeId(s: string): string {
  return s.replace(/[^a-zA-Z0-9]/g, '_').replace(/^[^a-z]/i, 'm');
}

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const functionNames = (process.env.LAMBDA_FUNCTION_NAMES ?? '').split(',').filter(Boolean);
  const tableName     = process.env.DYNAMODB_TABLE_NAME ?? '';

  const now  = new Date();
  const from = new Date(now.getTime() - 60 * 60 * 1000);

  const queries: MetricDataQuery[] = [];

  for (const fn of functionNames) {
    const id = safeId(fn);
    queries.push(
      {
        Id: `inv_${id}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Lambda',
            MetricName: 'Invocations',
            Dimensions: [{ Name: 'FunctionName', Value: fn }],
          },
          Period: 3600,
          Stat: 'Sum',
        },
        ReturnData: true,
      },
      {
        Id: `err_${id}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Lambda',
            MetricName: 'Errors',
            Dimensions: [{ Name: 'FunctionName', Value: fn }],
          },
          Period: 3600,
          Stat: 'Sum',
        },
        ReturnData: true,
      },
      {
        Id: `dur_${id}`,
        MetricStat: {
          Metric: {
            Namespace: 'AWS/Lambda',
            MetricName: 'Duration',
            Dimensions: [{ Name: 'FunctionName', Value: fn }],
          },
          Period: 3600,
          Stat: 'Average',
        },
        ReturnData: true,
      },
    );
  }

  if (tableName) {
    queries.push(
      {
        Id: 'ddb_read',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/DynamoDB',
            MetricName: 'ConsumedReadCapacityUnits',
            Dimensions: [{ Name: 'TableName', Value: tableName }],
          },
          Period: 3600,
          Stat: 'Sum',
        },
        ReturnData: true,
      },
      {
        Id: 'ddb_write',
        MetricStat: {
          Metric: {
            Namespace: 'AWS/DynamoDB',
            MetricName: 'ConsumedWriteCapacityUnits',
            Dimensions: [{ Name: 'TableName', Value: tableName }],
          },
          Period: 3600,
          Stat: 'Sum',
        },
        ReturnData: true,
      },
    );
  }

  try {
    const result = await cw.send(
      new GetMetricDataCommand({
        MetricDataQueries: queries,
        StartTime: from,
        EndTime: now,
      }),
    );

    const byId: Record<string, number> = {};
    for (const r of result.MetricDataResults ?? []) {
      byId[r.Id!] = (r.Values ?? [])[0] ?? 0;
    }

    let totalInv  = 0;
    let totalErr  = 0;
    let totalDur  = 0;
    let durCount  = 0;

    for (const fn of functionNames) {
      const id = safeId(fn);
      totalInv += byId[`inv_${id}`] ?? 0;
      totalErr += byId[`err_${id}`] ?? 0;
      const d = byId[`dur_${id}`] ?? 0;
      if (d > 0) { totalDur += d; durCount++; }
    }

    return {
      statusCode: 200,
      headers: headers(),
      body: JSON.stringify({
        period: { from: from.toISOString(), to: now.toISOString() },
        lambda: {
          totalInvocations: totalInv,
          totalErrors:      totalErr,
          errorRate:        totalInv > 0 ? (totalErr / totalInv) * 100 : 0,
          avgDurationMs:    durCount > 0 ? totalDur / durCount : 0,
        },
        dynamodb: {
          readUnits:  byId['ddb_read']  ?? 0,
          writeUnits: byId['ddb_write'] ?? 0,
        },
      }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'CloudWatch query failed';
    return {
      statusCode: 503,
      headers: headers(),
      body: JSON.stringify({ error: message }),
    };
  }
};
