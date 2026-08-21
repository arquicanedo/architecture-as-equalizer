// Minimal shims for Node.js built-ins to avoid depending on @types/node
declare module 'http' {
  import { IncomingMessage as IM, ServerResponse as SR } from 'http';
  export interface IncomingMessage { [key: string]: any }
  export interface ServerResponse { [key: string]: any }
  export function createServer(handler: (req: any, res: any) => void): any;
  export function request(options: any, callback?: (res: any) => void): any;
  const exports: any;
  export default exports;
}

declare module 'url' {
  export function parse(urlStr: string, parseQueryString?: boolean, slashesDenoteHost?: boolean): any;
  export interface UrlWithParsedQuery { pathname?: string | null; query: any }
}

declare var process: any;
declare var require: any;
declare var module: any;
declare function setImmediate(cb: (...args: any[]) => void): any;
