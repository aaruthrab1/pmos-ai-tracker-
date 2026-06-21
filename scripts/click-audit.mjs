/**
 * Click audit — dashboard, nav, profile, care (mobile viewport)
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const results = [];

function record(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} | ${id} | ${detail}`);
}

async function pageOk(page) {
  const empty = await page.locator('#root').evaluate((el) => !el.textContent?.trim()).catch(() => true);
  const crash = await page.locator('text=Something went wrong').count();
  return !empty && crash === 0;
}

async function completeOnboarding(page) {
  if (!page.url().includes('onboarding')) return;
  await page.fill('input[autocomplete="name"]', 'Audit User');
  await page.click('button:has-text("25–34")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Track cycles")');
  await page.locator('button:has-text("Continue"), button:has-text("Skip symptoms")').first().click();
  await page.waitForTimeout(500);
  await page.click('button:has-text("Continue to Cyra")');
  await page.waitForTimeout(3000);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const bottom = 'nav[aria-label="Bottom navigation"]';

  const email = `audit-${Date.now()}@cyra-demo.test`;
  await page.goto(`${BASE}/signup`, { waitUntil: 'domcontentloaded' });
  await page.fill('input[autocomplete="name"]', 'Audit User');
  await page.fill('input[autocomplete="email"]', email);
  await page.fill('input[autocomplete="new-password"]', 'DemoPass123!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  await completeOnboarding(page);

  for (const [id, goto, sel, expect] of [
    ['quick-log-period', '/dashboard', 'a.home-quick-tile[href="/tracker"]', '/tracker'],
    ['quick-sakhi', '/dashboard', 'a.home-quick-tile[href="/chat"]', '/chat'],
    ['quick-report', '/dashboard', 'a.home-quick-tile[href="/reports"]', '/reports'],
    ['quick-log', '/dashboard', 'a.home-section-link[href="/tracker"]', '/tracker'],
    ['nav-home', '/chat', `${bottom} a[href="/dashboard"]`, '/dashboard'],
    ['nav-sakhi', '/dashboard', `${bottom} a[href="/chat"]`, '/chat'],
    ['nav-journey', '/dashboard', `${bottom} a[href="/care"]`, '/care'],
    ['nav-track', '/dashboard', `${bottom} a[href="/tracker"]`, '/tracker'],
  ]) {
    await page.goto(`${BASE}${goto}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.locator(sel).first().click();
    await page.waitForTimeout(2000);
    record(id, page.url().includes(expect) && (await pageOk(page)), page.url());
  }

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.locator('header').filter({ has: page.locator('h1') }).locator('a[href="/settings"]').click();
  await page.waitForTimeout(2000);
  record('avatar-settings', page.url().includes('/settings') && (await pageOk(page)), page.url());

  for (const [id, href] of [
    ['more-reports', '/reports'],
    ['more-androgen', '/androgen'],
    ['more-settings', '/settings'],
  ]) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("More")').click();
    await page.waitForTimeout(400);
    await page.locator(`[role="dialog"] a[href="${href}"]`).click();
    await page.waitForTimeout(2000);
    record(id, page.url().includes(href) && (await pageOk(page)), page.url());
  }

  await page.goto(`${BASE}/care/articles`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  record('care-articles', (await pageOk(page)) && (await page.locator('text=coming soon').count()) === 0, page.url());

  await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded' });
  await page.locator('button:has-text("Sign out")').click();
  await page.waitForTimeout(2500);
  record('logout', page.url().includes('/login') && (await pageOk(page)), page.url());

  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
