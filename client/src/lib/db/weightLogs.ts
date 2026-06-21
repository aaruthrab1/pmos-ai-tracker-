import {
  getCurrentUserId, updateRecord, deleteRecord, generateClientId, type ListOptions,
} from './crud';
import { persistWithOffline } from './persistWithOffline';
import type { WeightLog, WeightLogInsert } from '@/types/supabase';
import {
  buildWeightWritePayload,
  getTrackerSchema,
  listTrackerRows,
  normalizeWeightRow,
} from './trackerSchema';
import { supabase } from '@/lib/supabase';
import { handleDbError } from './crud';

const TABLE = 'weight_logs';

export async function listWeightLogs(options?: ListOptions): Promise<WeightLog[]> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const dateCol = schema.version === 'canonical' ? 'logged_date' : 'created_at';
  return listTrackerRows(TABLE, userId, options ?? {}, dateCol, normalizeWeightRow);
}

export async function upsertWeightLog(input: Omit<WeightLogInsert, 'user_id' | 'client_id'>): Promise<WeightLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const clientId = generateClientId();
  const payload = buildWeightWritePayload(input, schema);

  const write = async () => {
    if (schema.version === 'legacy') {
      const { data, error } = await supabase
        .from(TABLE)
        .insert({ ...payload, user_id: userId } as never)
        .select()
        .single();
      if (error) handleDbError(error, `insert ${TABLE}`);
      return normalizeWeightRow(data as Record<string, unknown>);
    }

    const fullPayload = {
      ...payload,
      user_id: userId,
      client_id: clientId,
      sync_status: 'synced' as const,
    };
    const { data, error } = await supabase
      .from(TABLE)
      .upsert(fullPayload as never, { onConflict: 'user_id,logged_date' })
      .select()
      .single();
    if (error) handleDbError(error, `upsert ${TABLE}`);
    return normalizeWeightRow(data as Record<string, unknown>);
  };

  return persistWithOffline(TABLE, 'insert', write, { ...payload, user_id: userId, client_id: clientId });
}

export async function createWeightLog(input: Omit<WeightLogInsert, 'user_id' | 'client_id'>): Promise<WeightLog> {
  return upsertWeightLog(input);
}

export async function updateWeightLog(id: string, updates: Partial<WeightLogInsert>): Promise<WeightLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const payload = buildWeightWritePayload(
    {
      logged_date: updates.logged_date ?? new Date().toISOString().split('T')[0],
      weight: updates.weight ?? 0,
      unit: updates.unit ?? 'kg',
      body_fat_percent: updates.body_fat_percent ?? null,
      notes: updates.notes ?? null,
    },
    schema,
  );
  const result = await updateRecord<WeightLog>(TABLE, id, userId, payload);
  return normalizeWeightRow(result as unknown as Record<string, unknown>);
}

export async function removeWeightLog(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  return deleteRecord(TABLE, id, userId);
}
