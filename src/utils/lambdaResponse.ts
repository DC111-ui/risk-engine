import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const buildHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
});

export function ok(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: buildHeaders(),
    body: JSON.stringify(body),
  };
}

export function badRequest(message: string, code = 'INVALID_REQUEST'): APIGatewayProxyResultV2 {
  return apiError(message, code, 400);
}

export function notFound(message: string, code = 'NOT_FOUND'): APIGatewayProxyResultV2 {
  return apiError(message, code, 404);
}

export function serverError(message: string, code = 'INTERNAL_ERROR'): APIGatewayProxyResultV2 {
  return apiError(message, code, 500);
}

function apiError(message: string, code: string, statusCode: number): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: buildHeaders(),
    body: JSON.stringify({ ok: false, error: message, code }),
  };
}

export function parseBody<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
