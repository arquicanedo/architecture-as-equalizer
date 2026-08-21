import type { RouteResponse } from './types.js';

// ─── Standard Response Builders ───────────────────────────────────────────────

export function ok(body: unknown): RouteResponse {
  return { status: 200, body };
}

export function created(body: unknown): RouteResponse {
  return { status: 201, body };
}

export function noContent(): RouteResponse {
  return { status: 204, body: null };
}

export function badRequest(message: string): RouteResponse {
  return { status: 400, body: { error: message } };
}

export function notFound(message = 'Not found'): RouteResponse {
  return { status: 404, body: { error: message } };
}

export function conflict(message: string): RouteResponse {
  return { status: 409, body: { error: message } };
}

export function unprocessable(message: string): RouteResponse {
  return { status: 422, body: { error: message } };
}

export function methodNotAllowed(): RouteResponse {
  return { status: 405, body: { error: 'Method not allowed' } };
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
