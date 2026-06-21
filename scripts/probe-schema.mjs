import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const sb = createClient(url, key);
const email = `schema-probe-${Date.now()}@cyra-demo.test`;
await sb.auth.signUp({ email, password: 'DemoPass123!' });
const { data: signIn } = await sb.auth.signInWithPassword({ email, password: 'DemoPass123!' });
const authed = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
});
const uid = signIn.user.id;

async function colOk(table, col) {
  const { error } = await authed.from(table).select(col).limit(0);
  return !error;
}

async function listCols(table, candidates) {
  const present = [];
  for (const c of candidates) {
    if (await colOk(table, c)) present.push(c);
  }
  return present;
}

const common = [
  'id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'client_id', 'sync_status', 'notes', 'note',
  'logged_date', 'log_date', 'date', 'entry_date', 'record_date',
  'hours', 'sleep_hours', 'quality', 'sleep_quality', 'restedness',
  'bedtime', 'wake_time', 'interruptions',
  'mood', 'energy_level', 'anxiety_level', 'triggers',
  'period_start', 'period_end', 'start_date', 'end_date', 'cycle_length', 'symptoms',
  'flow_intensity', 'flow', 'pain_level', 'pain',
  'weight', 'unit', 'body_fat_percent',
  'symptom_name', 'severity', 'category', 'duration_hours', 'duration',
  'energy', 'hunger_level', 'sugar_cravings', 'brain_fog',
];

for (const table of ['sleep_logs', 'period_logs', 'weight_logs', 'symptom_logs', 'mood_logs', 'metabolic_logs', 'cycle_logs']) {
  const { error } = await authed.from(table).select('id').limit(0);
  if (error?.code === 'PGRST205') {
    console.log(`${table}: TABLE MISSING`);
    continue;
  }
  const cols = await listCols(table, common);
  console.log(`${table}: ${cols.join(', ') || '(no known cols)'}`);
}

console.log('\n--- quality constraint ---');
for (const q of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
  const { data, error } = await authed.from('sleep_logs').insert({ user_id: uid, hours: 7, quality: q }).select().single();
  console.log(`quality=${q}:`, error?.message || `OK ${JSON.stringify(data)}`);
  if (!error) break;
}

console.log('\n--- period insert probe ---');
const periodAttempts = [
  { user_id: uid, period_start: '2026-01-01', period_end: '2026-01-05', cycle_length: 28, symptoms: [] },
  { user_id: uid, period_start: '2026-02-01', flow_intensity: 'medium' },
  { user_id: uid, period_start: '2026-03-01', pain_level: 3 },
];
for (const p of periodAttempts) {
  const { error } = await authed.from('period_logs').insert(p).select().single();
  console.log(Object.keys(p).join(','), '->', error?.message || 'OK');
}

console.log('\n--- logged_at writable ---');
for (const p of [
  { user_id: uid, hours: 6, quality: 3, logged_at: '2026-06-15' },
  { user_id: uid, hours: 6, quality: 3 },
]) {
  const { data, error } = await authed.from('sleep_logs').insert(p).select().single();
  console.log(JSON.stringify(p), '->', error?.message || JSON.stringify(data));
}

console.log('\n--- list queries ---');
for (const p of [
  { user_id: uid, weight: 62.5 },
  { user_id: uid, weight: 62.5, logged_date: today, unit: 'kg' },
]) {
  const { error } = await authed.from('weight_logs').insert(p).select().single();
  console.log(Object.keys(p).join(','), '->', error?.message || 'OK');
}
for (const [label, fn] of [
  ['sleep+deleted_at', () => authed.from('sleep_logs').select('*').is('deleted_at', null)],
  ['sleep plain', () => authed.from('sleep_logs').select('*')],
  ['period+deleted_at', () => authed.from('period_logs').select('*').is('deleted_at', null)],
  ['symptom_logs', () => authed.from('symptom_logs').select('*')],
]) {
  const { error } = await fn();
  console.log(label, '->', error?.message || 'OK');
}

console.log('\n--- symptom_logs insert ---');
for (const p of [
  { user_id: uid, mood: 'neutral', notes: 'test' },
  { user_id: uid, mood: 'calm', logged_date: '2026-06-21', notes: 'test' },
]) {
  const { error } = await authed.from('symptom_logs').insert(p).select().single();
  console.log(Object.keys(p).join(','), '->', error?.message || 'OK');
}
