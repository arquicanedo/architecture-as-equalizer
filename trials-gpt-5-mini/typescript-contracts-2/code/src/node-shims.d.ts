declare module "http" {
  import { IncomingMessage as IM, ServerResponse as SR } from "http";
  const anything: any;
  export = anything;
}

declare module "url" {
  const anything: any;
  export function parse(s: string, q?: boolean): any;
  export = anything;
}

declare var require: any;
declare var module: any;
declare var process: any;
declare var Buffer: any;
