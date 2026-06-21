import {
  getCurrentUserId, updateRecord, deleteRecord, generateClientId, type ListOptions,
} from './crud';
import { persistWithOffline } from './persistWithOffline';
import type { MoodLog, MoodLogInsert } from '@/types/supabase';
import {
  buildMoodWritePayload,
  getTrackerSchema,
  listTrackerRows,
  normalizeMoodRow,
  upsertLegacyMoodByDate,
} from './trackerSchema';
import { supabase } from '@/lib/supabase';
import { handleDbError } from './crud';

export async function listMoodLogs(options?: ListOptions): Promise<MoodLog[]> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const table = schema.moodTable;
  return listTrackerRows(
    table,
    userId,
    options ?? {},
    schema.moodDateColumn,
    (row) => normalizeMoodRow(row, schema),
  );
}

export async function upsertMoodLog(input: Omit<MoodLogInsert, 'user_id' | 'client_id'>): Promise<MoodLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const table = schema.moodTable;
  const payload = buildMoodWritePayload(input, schema);
  const clientId = generateClientId();

  const write = async () => {
    if (schema.version === 'legacy' || table === 'symptom_logs') {
      return upsertLegacyMoodByDate(userId, table, payload, schema, input.logged_date);
    }

    const fullPayload = {
      ...payload,
      user_id: userId,
      client_id: clientId,
      sync_status: 'synced' as const,
    };

    const { data, error } = await supabase
      .from('mood_logs')
      .upsert(fullPayload as never, { onConflict: 'user_id,logged_date' })
      .select()
      .single();
    if (error) handleDbError(error, 'upsert mood_logs');
    return normalizeMoodRow(data as Record<string, unknown>, schema);
  };

  return persistWithOffline('mood_logs', 'insert', write, { ...payload, user_id: userId, client_id: clientId });
}

export async function updateMoodLog(id: string, updates: Partial<MoodLogInsert>): Promise<MoodLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const table = schema.moodTable;
  const payload = buildMoodWritePayload(
    {
      logged_date: updates.logged_date ?? new Date().toISOString().split('T')[0],
      mood: updates.mood ?? 'neutral',
      energy_level: updates.energy_level ?? null,
      anxiety_level: updates.anxiety_level ?? null,
      triggers: updates.triggers ?? [],
      notes: updates.notes ?? null,
    },
    schema,
  );
  return updateRecord<MoodLog>(table, id, userId, payload);
}

export async function removeMoodLog(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  return deleteRecord(schema.moodTable, id, userId);
}
