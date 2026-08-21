declare module 'http' {
  export type IncomingMessage = any;
  export type ServerResponse = any;
  export function createServer(handler: (req: any, res: any) => any): any;
  export function request(options: any, cb?: (res: any) => void): any;
}

declare module 'url' {
  export function parse(urlStr: string, parseQueryString?: any, slashesDenoteHost?: any): any;
}

declare module 'crypto' {
  export function randomUUID(): string;
}

declare var Buffer: any;
