import {
  getCurrentUserId, listRecords, updateRecord, deleteRecord, generateClientId, type ListOptions,
} from './crud';
import { persistWithOffline } from './persistWithOffline';
import type { PeriodLog, PeriodLogInsert } from '@/types/supabase';
import {
  buildPeriodWritePayload,
  getTrackerSchema,
  listTrackerRows,
  normalizePeriodRow,
} from './trackerSchema';
import { supabase } from '@/lib/supabase';
import { handleDbError } from './crud';

const TABLE = 'period_logs';

export async function listPeriodLogs(options?: ListOptions): Promise<PeriodLog[]> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  if (schema.supportsSoftDelete) {
    return listTrackerRows(TABLE, userId, options ?? {}, 'period_start', normalizePeriodRow);
  }
  const rows = await listRecords<PeriodLog>(TABLE, userId, { ...options, orderBy: 'period_start' }, 'period_start');
  return rows.map((row) => normalizePeriodRow(row as unknown as Record<string, unknown>));
}

export async function createPeriodLog(
  input: Partial<Omit<PeriodLogInsert, 'user_id' | 'client_id'>> & { period_start: string },
): Promise<PeriodLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const clientId = generateClientId();
  const payload: Record<string, unknown> = {
    ...buildPeriodWritePayload(input, schema),
    user_id: userId,
  };
  if (schema.version === 'canonical') {
    payload.client_id = clientId;
    payload.sync_status = 'synced';
  }

  return persistWithOffline(
    TABLE,
    'insert',
    async () => {
      const { data, error } = await supabase.from(TABLE).insert(payload as never).select().single();
      if (error) handleDbError(error, `insert ${TABLE}`);
      return normalizePeriodRow(data as Record<string, unknown>);
    },
    payload,
  );
}

export async function updatePeriodLog(id: string, updates: Partial<PeriodLogInsert>): Promise<PeriodLog> {
  const userId = await getCurrentUserId();
  const schema = await getTrackerSchema();
  const payload = buildPeriodWritePayload(updates, schema);
  const result = await updateRecord<PeriodLog>(TABLE, id, userId, payload);
  return normalizePeriodRow(result as unknown as Record<string, unknown>);
}

export async function removePeriodLog(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  return deleteRecord(TABLE, id, userId);
}
