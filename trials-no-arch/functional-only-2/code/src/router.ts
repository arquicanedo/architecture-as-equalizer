import { IncomingMessage, ServerResponse } from "http";
import { URL } from "url";
import { Route, ParsedRequest, ResponseHelper, RouteHandler } from "./types";

const routes: Route[] = [];

/**
 * Register a route.
 * Pattern segments starting with ":" are treated as named wildcards.
 * e.g. register("GET", ["users", ":id"], handler)
 */
export function register(
  method: string,
  pattern: string[],
  handler: RouteHandler
): void {
  routes.push({ method: method.toUpperCase(), pattern, handler });
}

/**
 * Attempt to match URL segments against a route pattern.
 * Returns true if they match (segments length must equal pattern length).
 */
function matchPattern(
  segments: string[],
  pattern: string[]
): boolean {
  if (segments.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++) {
    if (!pattern[i].startsWith(":") && pattern[i] !== segments[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Read and parse the request body as JSON. Returns null on empty body.
 */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8").trim();
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Build a ResponseHelper that writes JSON to the ServerResponse.
 */
function makeResponseHelper(res: ServerResponse): ResponseHelper {
  return {
    json(statusCode: number, data: unknown): void {
      const body = JSON.stringify(data, null, 2);
      res.writeHead(statusCode, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
    },
    error(statusCode: number, message: string): void {
      this.json(statusCode, { error: message });
    },
  };
}

/**
 * Main request dispatcher. Call this from the http.createServer callback.
 */
export async function dispatch(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const helper = makeResponseHelper(res);

  let body: unknown = null;
  try {
    body = await readBody(req);
  } catch {
    helper.error(400, "Invalid JSON body");
    return;
  }

  const baseUrl = `http://localhost${req.url ?? "/"}`;
  const parsed = new URL(baseUrl);

  // Strip trailing slash and split into segments (ignore empty strings)
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  const segments = pathname === "/"
    ? []
    : pathname.split("/").filter((s) => s.length > 0);

  const query: Record<string, string> = {};
  parsed.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const method = (req.method ?? "GET").toUpperCase();

  const parsedRequest: ParsedRequest = {
    method,
    pathname,
    segments,
    query,
    body,
  };

  // Find matching route
  for (const route of routes) {
    if (route.method !== method) continue;
    if (!matchPattern(segments, route.pattern)) continue;

    try {
      await route.handler(parsedRequest, helper);
    } catch (err) {
      console.error("Unhandled handler error:", err);
      helper.error(500, "Internal server error");
    }
    return;
  }

  helper.error(404, `Cannot ${method} /${segments.join("/")}`);
}
