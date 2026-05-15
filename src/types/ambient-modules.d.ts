declare module "bcryptjs" {
  export function hash(data: string, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;

  const bcrypt: {
    hash: typeof hash;
    compare: typeof compare;
  };

  export default bcrypt;
}

declare module "cors" {
  import { RequestHandler } from "express";

  export type StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>;

  export interface CorsOptions {
    origin?: StaticOrigin | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean | StaticOrigin) => void) => void);
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  export default function cors(options?: CorsOptions): RequestHandler;
}

declare module "jsonwebtoken" {
  export interface SignOptions {
    expiresIn?: string | number;
  }

  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string): string | object;

  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
  };

  export default jwt;
}

declare module "morgan" {
  import { RequestHandler } from "express";
  export default function morgan(format: string): RequestHandler;
}

declare module "pg" {
  export type QueryResult<T = any> = {
    rows: T[];
  };

  export type PoolClient = {
    query: <T = any>(text: string, values?: any[]) => Promise<QueryResult<T>>;
    release: () => void;
  };

  export class Pool {
    constructor(config?: { connectionString?: string });
    connect(): Promise<PoolClient>;
    query: <T = any>(text: string, values?: any[]) => Promise<QueryResult<T>>;
    end(): Promise<void>;
  }
}
