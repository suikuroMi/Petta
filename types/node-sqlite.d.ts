declare module 'node:sqlite' {
  export interface RunResult {
    lastInsertRowid: number | bigint;
    changes: number | bigint;
  }

  export interface StatementSync {
    get(...params: Array<string | number | bigint | Uint8Array | null>): unknown;
    all(...params: Array<string | number | bigint | Uint8Array | null>): unknown[];
    run(...params: Array<string | number | bigint | Uint8Array | null>): RunResult;
  }

  export class DatabaseSync {
    constructor(location: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
