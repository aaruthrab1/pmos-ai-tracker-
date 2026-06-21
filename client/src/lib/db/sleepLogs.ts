import {
  getCurrentUserId, updateRecord, deleteRecord, generateClientId, type ListOptions,
} from './crud';
import { persistWithOffline } from './persistWithOffline';
import type { SleepLog, SleepLogInsert } from '@/types/supabase';
import {
  buildSleepWritePayload,
  getTrackerSchema,
  listTrackerRows,
  normalizeSleepRow,
  upsertLegacySleepByDate,
} from './trackerSchema';
import { supabase } from '@/lib/supabase';
import { handleDbError } from './crud';

const TABLE = 'sleep_logs';

export async function listSleepLogs(options?: ListOptions): Promise<SleepLog[]> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  return listTrackerRows(
    TABLE,
    userId,
    options ?? {},
    schema.sleepDateColumn,
    normalizeSleepRow,
  );
}

export async function upsertSleepLog(input: Omit<SleepLogInsert, 'user_id' | 'client_id'>): Promise<SleepLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const payload = buildSleepWritePayload(input, schema);
  const clientId = generateClientId();

  const write = async () => {
    if (schema.sleepUsesLegacyColumns) {
      return upsertLegacySleepByDate(userId, payload, schema, input.logged_date);
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
    return normalizeSleepRow(data as Record<string, unknown>);
  };

  return persistWithOffline(TABLE, 'insert', write, { ...payload, user_id: userId, client_id: clientId });
}

export async function updateSleepLog(id: string, updates: Partial<SleepLogInsert>): Promise<SleepLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const payload = buildSleepWritePayload(
    {
      logged_date: updates.logged_date ?? new Date().toISOString().split('T')[0],
      sleep_hours: updates.sleep_hours ?? null,
      sleep_quality: updates.sleep_quality ?? null,
      bedtime: updates.bedtime ?? null,
      wake_time: updates.wake_time ?? null,
      notes: updates.notes ?? null,
    },
    schema,
  );
  return updateRecord<SleepLog>(TABLE, id, userId, payload);
}

export async function removeSleepLog(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  return deleteRecord(TABLE, id, userId);
}
