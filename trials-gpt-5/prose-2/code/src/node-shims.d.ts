declare module 'http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    [k: string]: any;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(data?: any): void;
    [k: string]: any;
  }
  const http: {
    createServer: (listener: (req: IncomingMessage, res: ServerResponse) => void) => any;
    request: any;
  };
  export default http;
}

declare module 'url' {
  export function parse(urlStr: string, parseQueryString?: boolean): any;
}

declare module 'child_process' {
  export function spawn(command: string, args?: string[], options?: any): any;
}
