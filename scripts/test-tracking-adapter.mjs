/**
 * Direct adapter test — sleep/mood/period logging via client DB layer.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

// Minimal supabase shim for dynamic import path
process.env.VITE_SUPABASE_URL = url;
process.env.VITE_SUPABASE_ANON_KEY = key;

const sb = createClient(url, key);
const email = `adapter-${Date.now()}@cyra-demo.test`;
await sb.auth.signUp({ email, password: 'DemoPass123!' });
const { data: signIn } = await sb.auth.signInWithPassword({ email, password: 'DemoPass123!' });

// Patch global supabase module by setting session in localStorage emulation — use direct API test instead
const authed = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
});

const uid = signIn.user.id;
const today = new Date().toISOString().split('T')[0];
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${id} | ${detail}`);
}

// Sleep via legacy columns (adapter path simulation)
const { data: sleepRow, error: sleepErr } = await authed
  .from('sleep_logs')
  .upsert({ user_id: uid, hours: 8, quality: 4, logged_at: today }, { onConflict: 'user_id,logged_at' })
  .select()
  .single()
  .catch?.(() => ({ data: null, error: { message: 'upsert unsupported' } }));

if (sleepErr) {
  const { error: insErr } = await authed.from('sleep_logs').insert({ user_id: uid, hours: 8, quality: 4, logged_at: today }).select().single();
  record('sleep-save', !insErr, insErr?.message || 'insert OK');
} else {
  record('sleep-save', true, JSON.stringify(sleepRow));
}

const { error: periodErr } = await authed.from('period_logs').insert({
  user_id: uid,
  period_start: '2026-04-01',
  period_end: '2026-04-04',
  cycle_length: 29,
  symptoms: ['cramps'],
}).select().single();
record('period-save', !periodErr, periodErr?.message || 'OK');

const { error: moodErr } = await authed.from('symptom_logs').insert({ user_id: uid, mood: 'happy', notes: 'good day' }).select().single();
record('mood-save', !moodErr, moodErr?.message || 'OK');

const { data: sleepList, error: listErr } = await authed.from('sleep_logs').select('id,hours,quality,logged_at').eq('user_id', uid);
record('sleep-list', !listErr && (sleepList?.length ?? 0) > 0, listErr?.message || `count=${sleepList?.length}`);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
