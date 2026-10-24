const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(15000);
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'systemsupport@msrim.org');
  await page.fill('input[type="password"]', 'support@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.goto('http://localhost:5173/timetable');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'ss_tt_new.png', fullPage: false });
  console.log('Timetable captured');
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
