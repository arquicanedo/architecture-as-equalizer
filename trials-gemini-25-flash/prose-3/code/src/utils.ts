import { randomUUID } from 'crypto';
import { ServerResponse, IncomingMessage } from 'http'; // Import IncomingMessage

export function generateId(): string {
  return randomUUID();
}

export function sendJsonResponse(res: ServerResponse, statusCode: number, data: object | string): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

export function sendErrorResponse(res: ServerResponse, statusCode: number, message: string): void {
  sendJsonResponse(res, statusCode, { error: message });
}

export function parseRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({});
        }
      } catch (error: any) { // Explicitly type error as any
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err: Error) => {
      reject(err);
    });
  });
}
