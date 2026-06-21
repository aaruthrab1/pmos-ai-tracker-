/**
 * Demo route smoke test — Dashboard, Track, Sakhi, Journey, Reports, More
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const BLOCKERS = [
  'Internal server error',
  'Article not found',
  'Something went wrong',
  'Topic not found',
];

const results = [];

function record(route, pass, detail) {
  results.push({ route, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${route} | ${detail}`);
}

async function pageHealthy(page) {
  const text = await page.locator('#root').innerText().catch(() => '');
  if (!text.trim()) return { ok: false, reason: 'blank screen' };
  for (const bad of BLOCKERS) {
    if (text.includes(bad)) return { ok: false, reason: `shows "${bad}"` };
  }
  const skeletonOnly = await page.locator('.skeleton').count();
  const hasContent = text.length > 80;
  if (skeletonOnly > 3 && !hasContent) return { ok: false, reason: 'infinite skeleton loading' };
  return { ok: true, reason: 'ok' };
}

async function completeOnboarding(page) {
  if (!page.url().includes('onboarding')) return;
  await page.fill('input[autocomplete="name"]', 'Route Test User');
  await page.click('button:has-text("25–34")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Track cycles")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Continue to Cyra")');
  await page.waitForTimeout(3000);
}

async function testRoute(page, name, path, extraWait = 4000) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(extraWait);
  const health = await pageHealthy(page);
  record(name, health.ok, health.ok ? `${path} — ${health.reason}` : `${path} — ${health.reason}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const email = `routes-${Date.now()}@cyra-demo.test`;
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[autocomplete="name"]', 'Route Test User');
  await page.fill('input[autocomplete="email"]', email);
  await page.fill('input[autocomplete="new-password"]', 'DemoPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  await completeOnboarding(page);

  await testRoute(page, 'Dashboard', '/dashboard');
  await testRoute(page, 'Track', '/tracker', 5000);
  await testRoute(page, 'Sakhi', '/chat');
  await testRoute(page, 'Journey', '/care');

  await page.goto(`${BASE}/care/articles/understanding-pmos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const journeyArticle = await pageHealthy(page);
  record('Journey (article)', journeyArticle.ok, journeyArticle.ok ? 'understanding-pmos loads' : journeyArticle.reason);

  await testRoute(page, 'Reports', '/reports', 5000);

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('button:has-text("More")').click();
  await page.waitForTimeout(400);
  const moreVisible = await page.locator('[role="dialog"]').isVisible();
  record('More', moreVisible, moreVisible ? 'sheet opens' : 'sheet missing');

  await browser.close();

  console.log('\n=== ROUTE TEST SUMMARY ===');
  for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} | ${r.route} | ${r.detail}`);
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
