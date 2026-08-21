import http from 'http';
import { URL } from 'url';
import { dispatch } from './router.js';
import type { ParsedRequest } from './types.js';

// ─── Body Parser ─────────────────────────────────────────────────────────────

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseBody(raw: string): unknown {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined; // signals a parse error
  }
}

// ─── URL Parser ──────────────────────────────────────────────────────────────

function parseQuery(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

// ─── Server Factory ──────────────────────────────────────────────────────────

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    const method = req.method ?? 'GET';
    const rawUrl = req.url ?? '/';

    // Parse the URL — use a dummy base since we only care about path + query
    const parsed = new URL(rawUrl, 'http://localhost');
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'; // strip trailing slash
    // Build segments, drop leading empty string from split
    const segments = pathname.split('/').filter(s => s.length > 0);
    const query = parseQuery(parsed.search);

    // Read & parse request body
    const rawBody = await readBody(req).catch(() => '');
    const body = parseBody(rawBody);

    // If body is undefined it means JSON was malformed
    if (body === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
      return;
    }

    const parsedReq: ParsedRequest = { method, pathname, segments, query, body };

    let response;
    try {
      response = await dispatch(parsedReq);
    } catch (err) {
      console.error('[Server Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }

    const { status, body: responseBody } = response;

    if (status === 204) {
      res.writeHead(204);
      res.end();
      return;
    }

    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseBody, null, 2));
  });
}
