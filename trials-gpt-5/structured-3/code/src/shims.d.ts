// Minimal shims to compile without @types/node

declare var Buffer: any;
declare type Buffer = any;
declare var process: any;

declare function setTimeout(handler: (...args: any[]) => void, timeout?: number, ...args: any[]): any;

declare module 'http' {
  const http: any;
  export = http;
  export type IncomingMessage = any;
  export type ServerResponse = any;
}

declare module 'url' {
  export const URL: any;
}

declare module 'crypto' {
  export function randomUUID(): string;
}
