declare module 'http' {
  export type IncomingMessage = any;
  export type ServerResponse = any;
  export function createServer(handler: (req: any, res: any) => void): any;
}

declare module 'url' {
  export const URL: any;
}

declare module 'crypto' {
  export function randomUUID(): string;
}

declare module 'timers/promises' {
  export function setTimeout(ms: number): Promise<void>;
}

// allow fetch in demos
declare var fetch: any;

// globals
declare const process: any;
declare const Buffer: any;
