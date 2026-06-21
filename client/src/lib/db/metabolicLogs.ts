import {
  getCurrentUserId, updateRecord, deleteRecord, generateClientId, type ListOptions,
} from './crud';
import { persistWithOffline } from './persistWithOffline';
import type { MetabolicLog, MetabolicLogInsert } from '@/types/supabase';
import { getTrackerSchema, listTrackerRows } from './trackerSchema';
import { supabase } from '@/lib/supabase';
import { handleDbError } from './crud';

const TABLE = 'metabolic_logs';

function normalizeMetabolicRow(row: Record<string, unknown>): MetabolicLog {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    logged_date: String(row.logged_date ?? row.created_at).slice(0, 10),
    energy_level: (row.energy_level ?? null) as number | null,
    hunger_level: (row.hunger_level ?? null) as number | null,
    sugar_cravings: Boolean(row.sugar_cravings),
    brain_fog: Boolean(row.brain_fog),
    notes: (row.notes ?? null) as string | null,
    client_id: (row.client_id ?? null) as string | null,
    sync_status: (row.sync_status ?? 'synced') as MetabolicLog['sync_status'],
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at ?? null) as string | null,
  };
}

export async function listMetabolicLogs(options?: ListOptions): Promise<MetabolicLog[]> {
  const schema = await getTrackerSchema();
  if (!schema.hasMetabolicTable) return [];

  const userId = await getCurrentUserId();
  return listTrackerRows(TABLE, userId, options ?? {}, 'logged_date', normalizeMetabolicRow);
}

export async function upsertMetabolicLog(
  input: Omit<MetabolicLogInsert, 'user_id' | 'client_id'>,
): Promise<MetabolicLog> {
  const schema = await getTrackerSchema();
  if (!schema.hasMetabolicTable) {
    return {
      id: `local-${Date.now()}`,
      user_id: 'local',
      logged_date: input.logged_date,
      energy_level: input.energy_level ?? null,
      hunger_level: input.hunger_level ?? null,
      sugar_cravings: input.sugar_cravings ?? false,
      brain_fog: input.brain_fog ?? false,
      notes: input.notes ?? null,
      client_id: null,
      sync_status: 'synced',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
  }

  const userId = await getCurrentUserId();
  const clientId = generateClientId();
  const payload = {
    ...input,
    user_id: userId,
    client_id: clientId,
    sync_status: 'synced' as const,
    sugar_cravings: input.sugar_cravings ?? false,
    brain_fog: input.brain_fog ?? false,
  };

  return persistWithOffline(
    TABLE,
    'insert',
    async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .upsert(payload as never, { onConflict: 'user_id,logged_date' })
        .select()
        .single();
      if (error) handleDbError(error, `upsert ${TABLE}`);
      return normalizeMetabolicRow(data as Record<string, unknown>);
    },
    payload,
  );
}

export async function updateMetabolicLog(id: string, updates: Partial<MetabolicLogInsert>): Promise<MetabolicLog> {
  const userId = await getCurrentUserId();
  const result = await updateRecord<MetabolicLog>(TABLE, id, userId, updates);
  return normalizeMetabolicRow(result as unknown as Record<string, unknown>);
}

export async function removeMetabolicLog(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  return deleteRecord(TABLE, id, userId);
}
