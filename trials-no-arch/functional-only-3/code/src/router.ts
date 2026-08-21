import type { RouteHandler, ParsedRequest, RouteResponse } from "./types.js";
import type { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";

// ─── Route entry ──────────────────────────────────────────────────────────────

interface Route {
  method: string;
  /** Pattern segments: plain strings or ":param" wildcards */
  pattern: string[];
  handler: RouteHandler;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export class Router {
  private routes: Route[] = [];

  register(method: string, path: string, handler: RouteHandler): void {
    const pattern = path.split("/").filter(Boolean);
    this.routes.push({ method: method.toUpperCase(), pattern, handler });
  }

  get(path: string, handler: RouteHandler): void {
    this.register("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.register("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.register("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.register("DELETE", path, handler);
  }

  // ─── Dispatch ──────────────────────────────────────────────────────────────

  async dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const baseUrl = `http://${req.headers.host ?? "localhost"}`;
    const parsedUrl = new URL(req.url ?? "/", baseUrl);
    const pathname = parsedUrl.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const method = (req.method ?? "GET").toUpperCase();

    // Build query params
    const query: Record<string, string> = {};
    parsedUrl.searchParams.forEach((value: string, key: string) => {
      query[key] = value;
    });

    // Read body for all methods that may carry a payload (not GET)
    let body: unknown = null;
    if (method !== "GET") {
      body = await readBody(req);
    }

    const parsed: ParsedRequest = { method, pathname, segments, query, body };

    // Find matching route
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchPattern(route.pattern, segments);
      if (params === null) continue;

      // Merge path params into query for easy access in handlers
      Object.assign(parsed.query, params);

      try {
        const result: RouteResponse = await route.handler(parsed);
        sendJSON(res, result.status, result.body);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Internal server error";
        sendJSON(res, 500, { error: message });
      }
      return;
    }

    sendJSON(res, 404, { error: "Route not found" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a map of param → value if the URL segments match the pattern,
 * or null if they don't match.
 */
function matchPattern(
  pattern: string[],
  segments: string[]
): Record<string, string> | null {
  if (pattern.length !== segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    const s = segments[i];
    if (p.startsWith(":")) {
      params[p.slice(1)] = s;
    } else if (p !== s) {
      return null;
    }
  }
  return params;
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8").trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(null);
      }
    });
    req.on("error", reject);
  });
}

function sendJSON(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}
