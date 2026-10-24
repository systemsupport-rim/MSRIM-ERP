const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const resp = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'systemsupport@msrim.org', password: 'support@2026' })
  });
  const data = await resp.json();
  await ctx.addInitScript(({ token, user }) => {
    localStorage.setItem('msrim_token', token);
    localStorage.setItem('msrim_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  await page.goto('http://localhost:5173/classroom-schedule');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'ss_cs_grid.png' });
  console.log('Grid done');
  await page.click('button:has-text("Room Board")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'ss_cs_rooms.png' });
  await page.click('button:has-text("Faculty Load")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ss_cs_faculty.png' });
  await page.click('button:has-text("Utilization")');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'ss_cs_util.png' });
  if (errs.length) console.log('Errors:', errs.slice(0, 3));
  await b.close();
  console.log('All done');
})().catch(e => { console.error(e.message); process.exit(1); });
