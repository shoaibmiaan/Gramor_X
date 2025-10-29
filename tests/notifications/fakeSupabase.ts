import type { NotificationChannel } from '@/types/supabase';

type TableName =
  | 'notifications_opt_in'
  | 'notification_templates'
  | 'notification_events'
  | 'notification_deliveries'
  | 'notification_schedules'
  | 'profiles';

type Filter =
  | { type: 'eq'; field: string; value: unknown }
  | { type: 'is'; field: string; value: unknown }
  | { type: 'in'; field: string; values: unknown[] }
  | { type: 'gte'; field: string; value: string };

type SelectOptions = { head?: boolean; count?: 'exact' | null } | undefined;

type InsertResult<T> = {
  data: T[] | null;
  error: { code: string; message: string } | null;
  select: (columns?: string) => {
    single: <R = T>() => Promise<{ data: R | null; error: { code: string; message: string } | null }>;
    maybeSingle: <R = T>() => Promise<{ data: R | null; error: { code: string; message: string } | null }>;
  };
  single: <R = T>() => Promise<{ data: R | null; error: { code: string; message: string } | null }>;
  maybeSingle: <R = T>() => Promise<{ data: R | null; error: { code: string; message: string } | null }>;
};

type QueryMode = 'select' | 'update';

type QueryExecuteResult<T> = {
  data: T[] | null;
  error: { code: string; message: string } | null;
  count?: number;
};

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function pickColumns<T extends Record<string, unknown>>(row: T, columns: string): Partial<T> {
  if (columns === '*' || !columns) {
    return clone(row);
  }
  const fields = columns
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);
  const next: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in row) {
      next[field] = clone(row[field]);
    }
  }
  return next as Partial<T>;
}

class QueryBuilder<T extends Record<string, any>> {
  private filters: Filter[] = [];
  private selectColumns = '*';
  private selectOptions: SelectOptions;
  private mode: QueryMode = 'select';
  private updatePayload: Partial<T> | null = null;
  private orderField: string | null = null;
  private orderAscending = true;
  private limitCount: number | null = null;

  constructor(private readonly db: FakeSupabase, private readonly table: TableName) {}

  private copy(): QueryBuilder<T> {
    const next = new QueryBuilder<T>(this.db, this.table);
    next.filters = [...this.filters];
    next.selectColumns = this.selectColumns;
    next.selectOptions = this.selectOptions ? { ...this.selectOptions } : undefined;
    next.mode = this.mode;
    next.updatePayload = this.updatePayload ? clone(this.updatePayload) : null;
    next.orderField = this.orderField;
    next.orderAscending = this.orderAscending;
    next.limitCount = this.limitCount;
    return next;
  }

  select(columns = '*', options?: SelectOptions): QueryBuilder<T> {
    const next = this.copy();
    next.selectColumns = columns;
    next.selectOptions = options;
    return next;
  }

  eq(field: string, value: unknown): QueryBuilder<T> {
    const next = this.copy();
    next.filters.push({ type: 'eq', field, value });
    return next;
  }

  is(field: string, value: unknown): QueryBuilder<T> {
    const next = this.copy();
    next.filters.push({ type: 'is', field, value });
    return next;
  }

  in(field: string, values: unknown[]): QueryBuilder<T> {
    const next = this.copy();
    next.filters.push({ type: 'in', field, values });
    return next;
  }

  gte(field: string, value: string): QueryBuilder<T> {
    const next = this.copy();
    next.filters.push({ type: 'gte', field, value });
    return next;
  }

  order(field: string, opts?: { ascending?: boolean }): QueryBuilder<T> {
    const next = this.copy();
    next.orderField = field;
    next.orderAscending = opts?.ascending !== false;
    return next;
  }

  limit(count: number): QueryBuilder<T> {
    const next = this.copy();
    next.limitCount = count;
    return next;
  }

  update(values: Partial<T>): QueryBuilder<T> {
    const next = this.copy();
    next.mode = 'update';
    next.updatePayload = clone(values);
    return next;
  }

  private matches(row: Record<string, unknown>): boolean {
    return this.filters.every((filter) => {
      const value = row[filter.field];
      if (filter.type === 'eq') {
        return value === filter.value;
      }
      if (filter.type === 'is') {
        return value === filter.value;
      }
      if (filter.type === 'gte') {
        if (typeof value !== 'string') return false;
        return value >= filter.value;
      }
      if (filter.type === 'in') {
        return filter.values.includes(value as never);
      }
      return true;
    });
  }

  private sort(rows: T[]): T[] {
    if (!this.orderField) return rows;
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const left = a[this.orderField as keyof T];
      const right = b[this.orderField as keyof T];
      if (left === right) return 0;
      if (left === undefined || left === null) return this.orderAscending ? -1 : 1;
      if (right === undefined || right === null) return this.orderAscending ? 1 : -1;
      if (typeof left === 'string' && typeof right === 'string') {
        return this.orderAscending ? left.localeCompare(right) : right.localeCompare(left);
      }
      if (typeof left === 'number' && typeof right === 'number') {
        return this.orderAscending ? left - right : right - left;
      }
      return 0;
    });
    return sorted;
  }

  private execute(): QueryExecuteResult<T> {
    const rows = this.db.getTable<T>(this.table).filter((row) => this.matches(row));
    const sorted = this.sort(rows);
    const limited = typeof this.limitCount === 'number' ? sorted.slice(0, this.limitCount) : sorted;

    if (this.mode === 'update') {
      const updated: T[] = [];
      for (const row of rows) {
        Object.assign(row, clone(this.updatePayload ?? {}));
        if ('updated_at' in row) {
          (row as Record<string, unknown>).updated_at = new Date().toISOString();
        }
        updated.push(clone(row));
      }
      return { data: updated, error: null };
    }

    if (this.selectOptions?.head && this.selectOptions.count === 'exact') {
      return { data: null, error: null, count: rows.length };
    }

    const data = limited.map((row) => pickColumns(row, this.selectColumns));
    return { data: data as T[], error: null };
  }

  async maybeSingle<R = T>(): Promise<{ data: R | null; error: { code: string; message: string } | null }> {
    const { data, error } = this.execute();
    if (error) {
      return { data: null, error };
    }
    const row = data && data.length > 0 ? (clone(data[0]) as R) : null;
    return { data: row, error: null };
  }

  async single<R = T>(): Promise<{ data: R | null; error: { code: string; message: string } | null }> {
    const { data, error } = this.execute();
    if (error) {
      return { data: null, error };
    }
    if (!data || data.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
    }
    return { data: clone(data[0]) as R, error: null };
  }

  then<TResult1 = QueryExecuteResult<T>, TResult2 = never>(
    resolve?: ((value: QueryExecuteResult<T>) => TResult1 | PromiseLike<TResult1>) | undefined,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined,
  ): Promise<TResult1 | TResult2> {
    const result = this.execute();
    const payload = { data: result.data, error: result.error, count: result.count };
    return Promise.resolve(payload).then(resolve, reject);
  }
}

export class FakeSupabase {
  private tables: Record<TableName, Record<string, any>[]> = {
    notifications_opt_in: [],
    notification_templates: [],
    notification_events: [],
    notification_deliveries: [],
    notification_schedules: [],
    profiles: [],
  };

  private sequences: Record<TableName, number> = {
    notifications_opt_in: 0,
    notification_templates: 0,
    notification_events: 0,
    notification_deliveries: 0,
    notification_schedules: 0,
    profiles: 0,
  };

  private authUser: { id: string } | null = { id: 'user-1' };

  reset() {
    for (const key of Object.keys(this.tables) as TableName[]) {
      this.tables[key] = [];
      this.sequences[key] = 0;
    }
    this.authUser = { id: 'user-1' };
  }

  setAuthUser(user: { id: string } | null) {
    this.authUser = user ? { ...user } : null;
  }

  setTable<T extends Record<string, any>>(table: TableName, rows: T[]) {
    this.tables[table] = rows.map((row) => clone(row));
    this.sequences[table] = rows.length;
  }

  appendRow<T extends Record<string, any>>(table: TableName, row: T) {
    this.tables[table].push(clone(row));
  }

  getTable<T extends Record<string, any>>(table: TableName): T[] {
    return this.tables[table] as T[];
  }

  private nextId(table: TableName): string {
    this.sequences[table] += 1;
    return `${table}-${this.sequences[table]}`;
  }

  private uniqueViolation(table: TableName, payload: Record<string, any>): boolean {
    if (table === 'notification_events' && payload.idempotency_key) {
      return this.tables.notification_events.some(
        (row) => row.idempotency_key && row.idempotency_key === payload.idempotency_key,
      );
    }
    if (table === 'notification_deliveries') {
      return this.tables.notification_deliveries.some(
        (row) => row.event_id === payload.event_id && row.channel === payload.channel,
      );
    }
    if (table === 'notifications_opt_in') {
      return this.tables.notifications_opt_in.some((row) => row.user_id === payload.user_id);
    }
    return false;
  }

  private prepareInsert(table: TableName, payload: Record<string, any>): Record<string, any> {
    const next = clone(payload);
    if (!next.id) {
      next.id = this.nextId(table);
    }
    const iso = new Date().toISOString();
    if (!next.created_at) {
      next.created_at = iso;
    }
    next.updated_at = iso;

    if (table === 'notification_deliveries') {
      next.status = next.status ?? 'pending';
      next.attempt_count = next.attempt_count ?? 0;
      next.next_retry_at = next.next_retry_at ?? null;
      next.last_attempt_at = next.last_attempt_at ?? null;
      next.sent_at = next.sent_at ?? null;
      next.error = next.error ?? null;
      next.metadata = next.metadata ?? {};
    }

    if (table === 'notification_events') {
      next.processed_at = next.processed_at ?? null;
      next.payload = next.payload ?? {};
      next.requested_channels = (next.requested_channels ?? []) as NotificationChannel[];
      next.locale = next.locale ?? 'en';
      next.error = next.error ?? null;
    }

    if (table === 'notifications_opt_in') {
      next.channels = next.channels ?? [];
      next.email_opt_in = Boolean(next.email_opt_in ?? true);
      next.wa_opt_in = Boolean(next.wa_opt_in ?? false);
      next.sms_opt_in = Boolean(next.sms_opt_in ?? false);
    }

    if (table === 'notification_templates') {
      next.metadata = next.metadata ?? {};
    }

    if (table === 'profiles') {
      next.user_id = next.user_id ?? next.id;
    }

    return next;
  }

  insert<T extends Record<string, any>>(table: TableName, payload: T | T[]): InsertResult<T> {
    const rows = Array.isArray(payload) ? payload : [payload];
    if (rows.some((row) => this.uniqueViolation(table, row))) {
      const error = { code: '23505', message: 'duplicate key value violates unique constraint' };
      return {
        data: null,
        error,
        select: () => ({
          single: async () => ({ data: null, error }),
          maybeSingle: async () => ({ data: null, error }),
        }),
        single: async () => ({ data: null, error }),
        maybeSingle: async () => ({ data: null, error }),
      };
    }

    const inserted: T[] = rows.map((row) => {
      const next = this.prepareInsert(table, row);
      this.tables[table].push(next);
      return clone(next);
    });

    const success = {
      data: inserted,
      error: null,
      select: (columns = '*') => ({
        single: async <R>() => ({
          data: inserted.length ? (pickColumns(inserted[0], columns) as R) : null,
          error: null,
        }),
        maybeSingle: async <R>() => ({
          data: inserted.length ? (pickColumns(inserted[0], columns) as R) : null,
          error: null,
        }),
      }),
      single: async <R>() => ({ data: inserted.length ? (clone(inserted[0]) as R) : null, error: null }),
      maybeSingle: async <R>() => ({ data: inserted.length ? (clone(inserted[0]) as R) : null, error: null }),
    } satisfies InsertResult<T>;

    return success;
  }

  upsert<T extends Record<string, any>>(
    table: TableName,
    payload: T,
    options?: { onConflict?: string },
  ): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
    const conflictKey = options?.onConflict;
    if (conflictKey) {
      const existing = this.tables[table].find((row) => row[conflictKey] === payload[conflictKey]);
      if (existing) {
        Object.assign(existing, clone(payload));
        existing.updated_at = new Date().toISOString();
        return Promise.resolve({ data: clone(existing), error: null });
      }
    }

    const inserted = this.insert(table, payload);
    if (inserted.error) {
      return Promise.resolve({ data: null, error: inserted.error });
    }
    return Promise.resolve({ data: inserted.data ? inserted.data[0] : null, error: null });
  }

  createQuery<T extends Record<string, any>>(table: TableName): QueryBuilder<T> {
    return new QueryBuilder<T>(this, table);
  }

  private tableApi<T extends Record<string, any>>(table: TableName) {
    return {
      select: (columns?: string, options?: SelectOptions) =>
        this.createQuery<T>(table).select(columns, options),
      update: (values: Partial<T>) => this.createQuery<T>(table).update(values),
      insert: (payload: T | T[]) => this.insert(table, payload),
      upsert: (payload: T, options?: { onConflict?: string }) => this.upsert(table, payload, options),
      eq: (field: string, value: unknown) => this.createQuery<T>(table).eq(field, value),
    };
  }

  createServerClient() {
    return {
      auth: {
        getUser: async () => ({ data: { user: this.authUser }, error: null }),
      },
      from: <T extends Record<string, any>>(table: TableName) => this.tableApi<T>(table),
    };
  }

  createServiceClient() {
    return {
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: {
              user:
                this.authUser && this.authUser.id === id
                  ? { email: 'admin@example.com' }
                  : null,
            },
            error: null,
          }),
        },
      },
      from: <T extends Record<string, any>>(table: TableName) => this.tableApi<T>(table),
    };
  }
}

export function createFakeSupabase() {
  return new FakeSupabase();
}
