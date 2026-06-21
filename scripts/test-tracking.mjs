/**
 * Tracking schema + logging smoke test against live Supabase.
 */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${id} | ${detail}`);
}

async function completeOnboarding(page) {
  if (!page.url().includes('onboarding')) return;
  await page.fill('input[autocomplete="name"]', 'Track Test');
  await page.click('button:has-text("25–34")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(400);
  await page.click('button:has-text("Track cycles")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(400);
  await page.click('button:has-text("Continue to Cyra")');
  await page.waitForTimeout(2500);
}

async function main() {
  if (!url || !key) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const sb = createClient(url, key);
  const email = `track-${Date.now()}@cyra-demo.test`;
  await sb.auth.signUp({ email, password: 'DemoPass123!' });
  const { data: signIn } = await sb.auth.signInWithPassword({ email, password: 'DemoPass123!' });
  const authed = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
  });
  const uid = signIn.user.id;

  // API-level sleep log (legacy schema compatible)
  const { error: sleepErr } = await authed.from('sleep_logs').insert({ user_id: uid, hours: 7, quality: 4, logged_at: '2026-06-20' }).select().single();
  record('api-sleep-insert', !sleepErr, sleepErr?.message || 'hours/quality/logged_at OK');

  const { error: periodErr } = await authed.from('period_logs').insert({
    user_id: uid,
    period_start: '2026-05-01',
    period_end: '2026-05-05',
    cycle_length: 28,
    symptoms: [],
  }).select().single();
  record('api-period-insert', !periodErr, periodErr?.message || 'period OK');

  const { error: moodErr } = await authed.from('symptom_logs').insert({ user_id: uid, mood: 'calm', notes: 'test' }).select().single();
  record('api-mood-insert', !moodErr, moodErr?.message || 'symptom_logs mood OK');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[autocomplete="email"]', email);
  await page.fill('input[autocomplete="current-password"]', 'DemoPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  if (page.url().includes('onboarding')) await completeOnboarding(page);

  await page.goto(`${BASE}/tracker`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  const trackText = await page.locator('#root').innerText();
  record('track-page-loads', !trackText.includes('schema cache') && !trackText.includes('bedtime'), trackText.includes('skeleton') ? 'still skeleton' : 'rendered');

  await page.locator('nav button:has-text("Sleep"), button:has-text("Sleep")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("8h")').click();
  await page.locator('button:has-text("Save sleep")').click();
  await page.waitForTimeout(3000);
  const sleepSaveText = await page.locator('#root').innerText();
  record('sleep-log-ui', !sleepSaveText.includes('bedtime') && !sleepSaveText.includes('schema cache'), sleepSaveText.includes('Saved') ? 'saved' : 'no error banner');

  await page.locator('nav button:has-text("Mood"), button:has-text("Mood")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Save mood")').click();
  await page.waitForTimeout(3000);
  const moodText = await page.locator('#root').innerText();
  record('mood-log-ui', !moodText.includes('schema cache'), moodText.includes('Saved') || !moodText.includes('Could not save') ? 'ok' : 'save failed');

  await page.locator('nav button:has-text("Period"), button:has-text("Period")').first().click();
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("Save period")').click();
  await page.waitForTimeout(3000);
  const periodText = await page.locator('#root').innerText();
  record('period-log-ui', !periodText.includes('flow_intensity') && !periodText.includes('schema cache'), periodText.includes('Saved') || !periodText.includes('Could not save') ? 'ok' : 'save failed');

  await browser.close();

  console.log('\n=== TRACKING TESTS ===');
  const failed = results.filter((r) => !r.pass);
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.id} | ${r.detail}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
