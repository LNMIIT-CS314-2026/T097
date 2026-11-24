import { chromium, firefox, webkit } from 'playwright';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 't097-browser-'));
process.env.STRATEGY_DB = path.join(directory, 'browser.sqlite');
const { app } = await import('../server/index.mjs');
const { db } = await import('../server/db.mjs');
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = 'http://127.0.0.1:' + server.address().port;
const accounts = JSON.parse(fs.readFileSync(process.env.STRATEGY_DB + '.accounts.json', 'utf8'));
let browser;
try {
  const engine = process.env.STRATEGY_BROWSER || 'chromium';
  const channel = process.env.STRATEGY_CHANNEL;
  browser = await { chromium, firefox, webkit }[engine].launch({
    headless: true,
    ...(channel ? { channel } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const nav = (name) => page.getByRole('navigation').getByRole('button', { name, exact: true }).click();
  const dialog = () => page.getByRole('dialog');
  const heading = (name) => page.getByRole('heading', { name, exact: true }).first().waitFor();
  async function login(name) {
    await page.getByLabel('Username').fill(name);
    await page
      .getByLabel('Password', { exact: true })
      .fill(accounts.find((a) => a.username === name).password);
    await button('Sign in').click();
    await page.getByRole('navigation').waitFor();
  }
  async function logout() {
    await button('Sign out').click();
    await button('Sign in').waitFor();
  }
  async function fill(label, value) {
    await dialog().getByLabel(label, { exact: true }).fill(value);
  }
  async function saveDialog() {
    await dialog().getByRole('button', { name: 'Save', exact: true }).click();
    await dialog().waitFor({ state: 'hidden' });
  }
  await page.goto(base);
  await login('planner');
  await nav('Strategic goals');
  await button('New goal').click();
  await fill('Title', 'Browser research goal');
  await fill('Start date', '2026-01-01');
  await fill('End date', '2027-12-31');
  await saveDialog();
  await button('Browser research goal').waitFor();
  await nav('Initiatives');
  await button('New initiative').click();
  await fill('Initiative title', 'Browser research initiative');
  await dialog().getByLabel('Strategic goal').selectOption({ label: 'Browser research goal' });
  await dialog().getByLabel('Initiative owner').selectOption({ label: 'Neha Sharma' });
  await fill('Start date', '2026-01-01');
  await fill('Target date', '2027-12-31');
  await saveDialog();
  await button('Browser research initiative').click();
  await dialog().getByRole('button', { name: 'Submit for review' }).click();
  await dialog().getByText('Review · Under Review').waitFor();
  await dialog().getByRole('button', { name: 'Close dialog' }).click();
  await nav('Milestones');
  await button('New milestone').click();
  await dialog()
    .getByLabel('Initiative', { exact: true })
    .selectOption({ label: 'Browser research initiative' });
  await fill('Title', 'Deliver evidence');
  await fill('Due date', '2027-11-30');
  await saveDialog();
  await nav('Departments');
  await button('New department').click();
  await fill('Department name', 'Browser department');
  await saveDialog();
  await logout();
  await login('management');
  await nav('Review queue');
  await button('Approve').click();
  await page.getByText('No goals or initiatives awaiting review.').waitFor();
  await logout();
  await login('owner');
  await nav('My progress');
  await page.getByLabel('Assigned initiative').selectOption({ label: 'Browser research initiative' });
  await page.getByLabel('Progress (%)', { exact: true }).fill('100');
  await page.getByLabel('Initiative status').selectOption('Completed');
  await button('Save progress update').click();
  await page
    .getByRole('alert')
    .getByText(/Complete all required milestones/)
    .waitFor();
  await page
    .getByLabel('Update a milestone with this submission')
    .selectOption({ label: 'Deliver evidence' });
  await page.getByLabel('Milestone completion (%)').fill('100');
  await page.getByLabel('Milestone status').selectOption('Completed');
  await button('Save progress update').click();
  await page.getByRole('status').getByText('Changes saved.').waitFor();
  await nav('Risks');
  await heading('Risks');
  await nav('Notifications');
  await heading('Notifications');
  await logout();
  await login('kpi');
  await button('New KPI').click();
  await dialog()
    .getByLabel('Initiative', { exact: true })
    .selectOption({ label: 'Browser research initiative' });
  await fill('KPI name', 'Review papers');
  await fill('Target value', '10');
  await fill('Current value', '6');
  await fill('Unit', 'papers');
  await saveDialog();
  await page.getByText('Review papers', { exact: true }).waitFor();
  await logout();
  await login('management');
  await page.getByLabel('Goal filter').selectOption({ label: 'Browser research goal' });
  await page.getByLabel('Status filter').selectOption('Completed');
  await button('Browser research goal').click();
  await dialog().getByRole('button', { name: 'Browser research initiative' }).click();
  await dialog().getByText('Review papers', { exact: true }).waitFor();
  await dialog().getByRole('button', { name: 'Close dialog' }).click();
  await dialog().getByRole('button', { name: 'Close dialog' }).click();
  await nav('Reports');
  await button('Generate report').click();
  await heading('Strategic plan report');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Excel' }).click();
  assert.match((await download).suggestedFilename(), /\.xlsx$/);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.getByRole('navigation').isVisible(), false);
  assert.equal(await page.getByRole('heading', { name: 'Strategic plan report' }).isVisible(), true);
  if (engine === 'chromium') {
    const pdf = await page.pdf({ preferCSSPageSize: true });
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdf.length > 2000);
  }
  await page.emulateMedia({ media: 'screen' });
  await page.reload();
  await nav('Reports');
  await button('View report').first().click();
  await heading('Strategic plan report');
  await logout();
  await login('head');
  await page.setViewportSize({ width: 390, height: 844 });
  await nav('Initiatives');
  await heading('Initiative register');
  assert.equal(await page.getByRole('button', { name: 'Industry Partnership Portal' }).count(), 0);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'Mobile page fits the viewport',
  );
  await logout();
  await page.setViewportSize({ width: 1366, height: 900 });
  await login('admin');
  await heading('User accounts');
  await button('New account').click();
  await fill('Full name', 'Browser reviewer');
  await fill('Username', 'browser.reviewer');
  await fill('Password', 'local-browser-fixture');
  await dialog().getByLabel('Role', { exact: true }).selectOption('head');
  await dialog().getByLabel('Department', { exact: true }).selectOption('Browser department');
  await saveDialog();
  await nav('Notification rules');
  await page.getByLabel('Days before deadline to notify owners and department heads').fill('5');
  await button('Save reminder window').click();
  await nav('Activity log');
  await page
    .getByText(/Changed reminder window/)
    .first()
    .waitFor();
  await logout();
  assert.deepEqual(errors, []);
  console.log(
    (channel || engine) +
      ' ' +
      browser.version() +
      ': all six roles, planning → review → owner completion, KPI entry, linked detail, Excel and print view, account administration, scoped mobile navigation and logout passed.',
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  db.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
