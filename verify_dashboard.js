const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const outDir = path.join('C:\\Users\\ADMIN\\AppData\\Local\\Temp\\dashboard_verify');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  page.setDefaultTimeout(20000);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  // 1. Login page
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(outDir, '01_login.png'), fullPage: true });
  console.log('Step 1: Login page loaded');

  // 2. Admin login
  await page.fill('input[type="text"]', 'systemsupport@msrim.org');
  await page.fill('input[type="password"]', 'support@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 12000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '02_admin_dashboard.png'), fullPage: true });
  const dashText = await page.evaluate(() => document.body.innerText);
  console.log('Step 2: Admin dashboard loaded');

  // 3. Students page
  await page.goto('http://localhost:5173/students');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '03_students.png'), fullPage: true });
  const stuText = await page.evaluate(() => document.body.innerText);
  console.log('Step 3: Students page loaded');

  // 4. Courses page
  await page.goto('http://localhost:5173/courses');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '04_courses.png'), fullPage: true });
  const courseText = await page.evaluate(() => document.body.innerText);
  console.log('Step 4: Courses page loaded');

  // 5. Admin Console
  await page.goto('http://localhost:5173/admin-console');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, '05_admin_console.png'), fullPage: true });
  console.log('Step 5: Admin console loaded');

  // 6. Student login
  await page.goto('http://localhost:5173/login');
  await page.evaluate(() => localStorage.clear());
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]', 'asonikamonnappa251001');
  await page.fill('input[type="password"]', 'Msrim@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 12000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, '06_student_dashboard.png'), fullPage: true });
  console.log('Step 6: Student dashboard loaded');

  await browser.close();

  const result = {
    dashHas441: dashText.includes('441'),
    dashHas40:  dashText.includes('40'),
    dashHas31:  dashText.includes('31'),
    stuHas441:  stuText.includes('441'),
    courseHas26PGDC: courseText.includes('26PGDC') || courseText.includes('Financial Reporting'),
    jsErrors: errors.length,
    errSample: errors.slice(0, 3)
  };
  console.log('RESULT:', JSON.stringify(result, null, 2));
})().catch(e => { console.error('PLAYWRIGHT FAIL:', e.message); process.exit(1); });
