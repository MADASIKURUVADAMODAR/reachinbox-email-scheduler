declare module 'pg' {
  export interface PoolConfig {
    connectionString?: string;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    statement_timeout?: number;
    query_timeout?: number;
    ssl?: boolean | { rejectUnauthorized?: boolean };
  }

  export interface QueryResultRow {
    [key: string]: unknown;
  }

  export interface QueryResult<T = QueryResultRow> {
    rows: T[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<T = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    query<T = QueryResultRow>(text: string): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: PoolConfig);
    on(event: 'connect' | 'error', listener: (...args: any[]) => void): this;
    query<T = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
  }
}

declare module 'ioredis' {
  export interface RedisOptions {
    host?: string;
    port?: number;
    password?: string;
    lazyConnect?: boolean;
    maxRetriesPerRequest?: number | null;
    enableOfflineQueue?: boolean;
    retryStrategy?: (times: number) => number;
  }

  export default class Redis {
    constructor(options?: RedisOptions);
    on(event: 'connect' | 'ready' | 'error', listener: (...args: any[]) => void): this;
    ping(): Promise<string>;
  }
}
