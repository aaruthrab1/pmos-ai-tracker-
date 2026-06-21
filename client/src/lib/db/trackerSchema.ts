/**
 * Bridges legacy Supabase tracker tables (hours/quality/logged_at)
 * with the canonical schema expected by the frontend (sleep_hours/sleep_quality/logged_date/bedtime).
 */
import { supabase } from '@/lib/supabase';
import type {
  MoodLog,
  MoodLogInsert,
  PeriodLog,
  PeriodLogInsert,
  SleepLog,
  SleepLogInsert,
  SyncStatus,
  WeightLog,
  WeightLogInsert,
} from '@/types/supabase';
import type { ListOptions } from './crud';

export type TrackerSchemaVersion = 'canonical' | 'legacy';

export interface TrackerSchemaInfo {
  version: TrackerSchemaVersion;
  moodTable: 'mood_logs' | 'symptom_logs';
  hasMetabolicTable: boolean;
  sleepUsesLegacyColumns: boolean;
  sleepDateColumn: 'logged_date' | 'logged_at' | 'created_at';
  moodDateColumn: 'logged_date' | 'logged_at' | 'created_at';
  supportsSoftDelete: boolean;
}

let schemaCache: TrackerSchemaInfo | null = null;

function isMissingColumn(message: string | undefined): boolean {
  return Boolean(
    message &&
      (message.includes('Could not find the') ||
        message.includes('does not exist') ||
        message.includes('schema cache')),
  );
}

export async function getTrackerSchema(): Promise<TrackerSchemaInfo> {
  if (schemaCache) return schemaCache;

  const [{ error: bedtimeErr }, { error: moodTableErr }, { error: metabolicErr }, { error: deletedErr }] =
    await Promise.all([
      supabase.from('sleep_logs').select('bedtime').limit(0),
      supabase.from('mood_logs').select('id').limit(0),
      supabase.from('metabolic_logs').select('id').limit(0),
      supabase.from('sleep_logs').select('deleted_at').limit(0),
    ]);

  const sleepUsesLegacyColumns = isMissingColumn(bedtimeErr?.message);
  const moodTable = moodTableErr?.code === 'PGRST205' ? 'symptom_logs' : 'mood_logs';
  const hasMetabolicTable = metabolicErr?.code !== 'PGRST205';
  const supportsSoftDelete = !isMissingColumn(deletedErr?.message);

  let sleepDateColumn: TrackerSchemaInfo['sleepDateColumn'] = 'logged_date';
  if (sleepUsesLegacyColumns) {
    const { error: loggedAtErr } = await supabase.from('sleep_logs').select('logged_at').limit(0);
    sleepDateColumn = isMissingColumn(loggedAtErr?.message) ? 'created_at' : 'logged_at';
  }

  let moodDateColumn: TrackerSchemaInfo['moodDateColumn'] = 'logged_date';
  if (moodTable === 'symptom_logs') {
    const { error: moodDateErr } = await supabase.from('symptom_logs').select('logged_at').limit(0);
    moodDateColumn = isMissingColumn(moodDateErr?.message) ? 'created_at' : 'logged_at';
  }

  schemaCache = {
    version: sleepUsesLegacyColumns ? 'legacy' : 'canonical',
    moodTable,
    hasMetabolicTable,
    sleepUsesLegacyColumns,
    sleepDateColumn,
    moodDateColumn,
    supportsSoftDelete,
  };

  return schemaCache;
}

export function resetTrackerSchemaCache(): void {
  schemaCache = null;
}

function clampQualityForLegacy(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value <= 5) return Math.min(5, Math.max(1, Math.round(value)));
  return Math.min(5, Math.max(1, Math.ceil(value / 2)));
}

function expandQualityFromLegacy(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (value <= 5) return Math.min(10, Math.max(1, value * 2));
  return value;
}

function dateFromRow(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (typeof val === 'string' && val.length >= 10) return val.slice(0, 10);
  }
  return new Date().toISOString().split('T')[0];
}

export function normalizeSleepRow(row: Record<string, unknown>): SleepLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    logged_date: dateFromRow(row, 'logged_date', 'logged_at', 'log_date', 'created_at'),
    sleep_hours: (row.sleep_hours ?? row.hours ?? null) as number | null,
    sleep_quality: expandQualityFromLegacy((row.sleep_quality ?? row.quality ?? null) as number | null),
    bedtime: (row.bedtime ?? null) as string | null,
    wake_time: (row.wake_time ?? null) as string | null,
    interruptions: Number(row.interruptions ?? 0),
    notes: (row.notes ?? null) as string | null,
    client_id: (row.client_id ?? null) as string | null,
    sync_status: (row.sync_status ?? 'synced') as SyncStatus,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at ?? null) as string | null,
  };
}

export function buildSleepWritePayload(
  input: Omit<SleepLogInsert, 'user_id' | 'client_id'>,
  schema: TrackerSchemaInfo,
): Record<string, unknown> {
  if (!schema.sleepUsesLegacyColumns) {
    const payload: Record<string, unknown> = { ...input };
    if (payload.bedtime === null) delete payload.bedtime;
    if (payload.wake_time === null) delete payload.wake_time;
    if (payload.notes === null) delete payload.notes;
    return payload;
  }

  return {
    [schema.sleepDateColumn]: input.logged_date,
    hours: input.sleep_hours,
    quality: clampQualityForLegacy(input.sleep_quality),
  };
}

export function normalizePeriodRow(row: Record<string, unknown>): PeriodLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    period_start: String(row.period_start),
    period_end: (row.period_end ?? null) as string | null,
    flow_intensity: (row.flow_intensity ?? row.flow ?? 'medium') as PeriodLog['flow_intensity'],
    pain_level: (row.pain_level ?? row.pain ?? null) as number | null,
    cycle_length: (row.cycle_length ?? null) as number | null,
    symptoms: Array.isArray(row.symptoms) ? (row.symptoms as string[]) : [],
    notes: (row.notes ?? null) as string | null,
    client_id: (row.client_id ?? null) as string | null,
    sync_status: (row.sync_status ?? 'synced') as SyncStatus,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at ?? null) as string | null,
  };
}

export function buildPeriodWritePayload(
  input: Partial<Omit<PeriodLogInsert, 'user_id' | 'client_id'>>,
  schema: TrackerSchemaInfo,
): Record<string, unknown> {
  if (schema.version === 'canonical') return { ...input };

  const payload: Record<string, unknown> = {};
  if (input.period_start != null) payload.period_start = input.period_start;
  if (input.period_end !== undefined) payload.period_end = input.period_end;
  if (input.cycle_length !== undefined) payload.cycle_length = input.cycle_length;
  if (input.symptoms !== undefined) payload.symptoms = input.symptoms;
  if (input.notes !== undefined && input.notes != null) payload.notes = input.notes;
  return payload;
}

export function normalizeMoodRow(row: Record<string, unknown>, _schema: TrackerSchemaInfo): MoodLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    logged_date: dateFromRow(row, 'logged_date', 'logged_at', 'log_date', 'created_at'),
    mood: (row.mood ?? 'neutral') as MoodLog['mood'],
    energy_level: (row.energy_level ?? row.energy ?? null) as number | null,
    anxiety_level: (row.anxiety_level ?? null) as number | null,
    triggers: Array.isArray(row.triggers) ? (row.triggers as string[]) : [],
    notes: (row.notes ?? null) as string | null,
    client_id: (row.client_id ?? null) as string | null,
    sync_status: (row.sync_status ?? 'synced') as SyncStatus,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at ?? null) as string | null,
  };
}

export function buildMoodWritePayload(
  input: Omit<MoodLogInsert, 'user_id' | 'client_id'>,
  schema: TrackerSchemaInfo,
): Record<string, unknown> {
  if (schema.moodTable === 'mood_logs' && schema.version === 'canonical') {
    const payload: Record<string, unknown> = { ...input };
    if (payload.notes === null) delete payload.notes;
    if (payload.anxiety_level === null) delete payload.anxiety_level;
    return payload;
  }

  const payload: Record<string, unknown> = { mood: input.mood };
  if (schema.moodDateColumn !== 'created_at') {
    payload[schema.moodDateColumn] = input.logged_date;
  }
  if (input.notes) payload.notes = input.notes;
  if (input.energy_level != null) payload.energy_level = input.energy_level;
  return payload;
}

export function normalizeWeightRow(row: Record<string, unknown>): WeightLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    logged_date: dateFromRow(row, 'logged_date', 'logged_at', 'log_date', 'created_at'),
    weight: Number(row.weight),
    unit: (row.unit ?? 'kg') as WeightLog['unit'],
    body_fat_percent: (row.body_fat_percent ?? null) as number | null,
    notes: (row.notes ?? null) as string | null,
    client_id: (row.client_id ?? null) as string | null,
    sync_status: (row.sync_status ?? 'synced') as SyncStatus,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at ?? null) as string | null,
  };
}

export function buildWeightWritePayload(
  input: Omit<WeightLogInsert, 'user_id' | 'client_id'>,
  schema: TrackerSchemaInfo,
): Record<string, unknown> {
  if (schema.version === 'canonical') return { ...input };
  return { weight: input.weight };
}

export async function listTrackerRows<T>(
  table: string,
  userId: string,
  options: ListOptions,
  dateColumn: string,
  normalize: (row: Record<string, unknown>) => T,
): Promise<T[]> {
  const schema = await getTrackerSchema();

  let query = supabase.from(table as 'period_logs').select('*').eq('user_id', userId);

  if (schema.supportsSoftDelete) {
    query = query.is('deleted_at', null);
  }

  const orderCol = options.orderBy || dateColumn;
  query = query.order(orderCol, { ascending: options.ascending ?? false });

  if (options.startDate) query = query.gte(dateColumn, options.startDate);
  if (options.endDate) query = query.lte(dateColumn, options.endDate);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalize(row as Record<string, unknown>));
}

export async function upsertLegacySleepByDate(
  userId: string,
  payload: Record<string, unknown>,
  schema: TrackerSchemaInfo,
  loggedDate: string,
): Promise<SleepLog> {
  const dateCol = schema.sleepDateColumn;
  const { data: existing } = await supabase
    .from('sleep_logs')
    .select('*')
    .eq('user_id', userId)
    .eq(dateCol, loggedDate)
    .maybeSingle();

  if (existing && typeof existing === 'object' && 'id' in existing) {
    const row = existing as { id: string };
    const { data, error } = await supabase
      .from('sleep_logs')
      .update(payload as never)
      .eq('id', row.id)
      .select()
      .single();
    if (error) throw error;
    return normalizeSleepRow(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from('sleep_logs')
    .insert({ ...payload, user_id: userId } as never)
    .select()
    .single();
  if (error) throw error;
  return normalizeSleepRow(data as Record<string, unknown>);
}

export async function upsertLegacyMoodByDate(
  userId: string,
  table: 'symptom_logs' | 'mood_logs',
  payload: Record<string, unknown>,
  schema: TrackerSchemaInfo,
  loggedDate: string,
): Promise<MoodLog> {
  if (schema.moodDateColumn === 'created_at') {
    const { data, error } = await supabase
      .from(table as 'mood_logs')
      .insert({ ...payload, user_id: userId } as never)
      .select()
      .single();
    if (error) throw error;
    return normalizeMoodRow(data as Record<string, unknown>, schema);
  }

  const dateCol = schema.moodDateColumn;
  const { data: existing } = await supabase
    .from(table as 'mood_logs')
    .select('*')
    .eq('user_id', userId)
    .eq(dateCol, loggedDate)
    .maybeSingle();

  if (existing && typeof existing === 'object' && 'id' in existing) {
    const row = existing as { id: string };
    const { data, error } = await supabase
      .from(table as 'mood_logs')
      .update(payload as never)
      .eq('id', row.id)
      .select()
      .single();
    if (error) throw error;
    return normalizeMoodRow(data as Record<string, unknown>, schema);
  }

  const { data, error } = await supabase
    .from(table as 'mood_logs')
    .insert({ ...payload, user_id: userId } as never)
    .select()
    .single();
  if (error) throw error;
  return normalizeMoodRow(data as Record<string, unknown>, schema);
}
