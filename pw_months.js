const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage();
  page.setDefaultTimeout(15000);

  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'systemsupport@msrim.org');
  await page.fill('input[type="password"]', 'support@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });

  await page.goto('http://localhost:5173/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Go back to Jan 2026 first — click back enough times
  // Current month is Oct 2026, so go back 9 months to Jan 2026
  for (let i = 0; i < 9; i++) {
    await page.click('button:has(svg)'); // prev arrow
    await page.waitForTimeout(400);
  }

  const results = [];

  // Capture Jan 2026 through Dec 2026 + Jan-Apr 2027
  const months = [
    'Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026',
    'Jul 2026','Aug 2026','Sep 2026','Oct 2026','Nov 2026','Dec 2026',
    'Jan 2027','Feb 2027','Mar 2027','Apr 2027'
  ];

  for (let m = 0; m < months.length; m++) {
    await page.waitForTimeout(600);
    const heading = await page.$eval('h2.text-2xl, .text-2xl.font-bold, h2[class*="font"], .font-bold.text-white', el => el.innerText.trim()).catch(() => '?');
    const eventTexts = await page.$$eval('button[class*="text-"], a[class*="text-xs"], [class*="event"], [class*="text-green"], [class*="text-red"]', els =>
      els.filter(e => e.innerText.trim().length > 3 && e.innerText.trim().length < 60)
         .map(e => e.innerText.trim())
         .filter((v, i, a) => a.indexOf(v) === i)
         .slice(0, 8)
    ).catch(() => []);

    await page.screenshot({ path: `ss_month_${m+1}.png`, fullPage: false });
    results.push({ month: months[m], heading, events: eventTexts });

    if (m < months.length - 1) {
      // click next
      const btns = await page.$$('button');
      for (const btn of btns) {
        const txt = await btn.evaluate(el => el.innerHTML);
        if (txt.includes('ChevronRight') || txt.includes('chevron-right') || txt.includes('>')) {
          await btn.click();
          break;
        }
      }
      // Try clicking the > button (last nav button)
      await page.keyboard.press('ArrowRight').catch(()=>{});
    }
  }

  await b.close();
  results.forEach(r => {
    const evStr = r.events.length ? r.events.join(', ') : 'NO EVENTS';
    console.log(`${r.month.padEnd(10)} | ${evStr.substring(0,80)}`);
  });
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
