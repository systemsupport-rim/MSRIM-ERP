const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const resp = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'systemsupport@msrim.org', password: 'support@2026' })
  });
  const data = await resp.json();
  await ctx.addInitScript(({ token, user }) => {
    localStorage.setItem('msrim_token', token);
    localStorage.setItem('msrim_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });
  const page = await ctx.newPage();
  const msgs = [];
  page.on('console', m => msgs.push(m.type() + ': ' + m.text().slice(0, 200)));
  page.on('pageerror', e => msgs.push('PAGE_ERR: ' + e.message.slice(0, 200)));
  await page.goto('http://localhost:5173/classroom-schedule');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Body text:', bodyText);
  console.log('Log:', msgs.filter(m => m.startsWith('error') || m.startsWith('PAGE_ERR')).slice(0, 5));
  await b.close();
})().catch(e => console.error(e.message));
