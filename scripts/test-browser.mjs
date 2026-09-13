import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

let url = process.env.DSH_TEST_URL;
if (!url && process.env.DSH_TEST_LOG) {
  url = (await readFile(process.env.DSH_TEST_LOG, 'utf8')).match(/dsh web: (http:\/\/\S+)/)?.[1];
}
if (!url) throw new Error('Set DSH_TEST_URL or DSH_TEST_LOG for an isolated DSH test profile.');
const artifacts = new URL('../artifacts/', import.meta.url);
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DSH_TEST_BROWSER ? { channel: process.env.DSH_TEST_BROWSER } : {}) });
const errors = [];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 480 } });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor();
  // A fresh empty profile may show two first-run dialogs.
  for (const name of ['Continue', 'Configure later']) {
    const button = page.getByRole('button', { name, exact: true });
    const shown = await button.waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false);
    if (shown) await button.click();
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const list = page.locator('[data-dsh-settings-scroll-list]');
  await list.waitFor();
  const buttons = list.getByRole('button');
  assert.ok(await buttons.count() >= 20, 'Install test/fixture into the isolated profile to exercise overflow.');
  const metrics = () => list.evaluate(el => ({ height: el.clientHeight, total: el.scrollHeight, top: el.scrollTop, overflow: getComputedStyle(el).overflowY }));
  let size = await metrics();
  assert.equal(size.overflow, 'auto');
  assert.ok(size.total > size.height);
  const titleBefore = await page.locator('[data-dsh-settings-scroll-nav] > :first-child').boundingBox();
  const content = page.locator('[role="dialog"] [class$="_options"]');
  await content.evaluate(el => { el.scrollTop = 100; });
  const contentTop = await content.evaluate(el => el.scrollTop);
  await list.hover();
  await page.mouse.wheel(0, 1600);
  await page.waitForFunction(() => document.querySelector('[data-dsh-settings-scroll-list]').scrollTop > 100);
  assert.equal((await page.locator('[data-dsh-settings-scroll-nav] > :first-child').boundingBox()).y, titleBefore.y);
  assert.equal(await content.evaluate(el => el.scrollTop), contentTop);
  results.push('Wheel scrolling moves only the navigation; the title and right content stay in place.');

  await buttons.first().focus();
  await page.keyboard.press('End');
  assert.equal(await buttons.last().evaluate(el => el === document.activeElement), true);
  const lastVisible = await buttons.last().evaluate(el => {
    const b = el.getBoundingClientRect(); const l = el.parentElement.getBoundingClientRect();
    return b.top >= l.top - 1 && b.bottom <= l.bottom + 1;
  });
  assert.ok(lastVisible);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-dsh-settings-scroll-list] > button:last-child')?.getAttribute('aria-current') === 'true');
  await page.screenshot({ path: new URL('desktop.png', artifacts).pathname });
  await page.keyboard.press('Home');
  assert.equal(await buttons.first().evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await buttons.nth(1).evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('ArrowUp');
  assert.equal(await buttons.first().evaluate(el => el === document.activeElement), true);
  results.push('Home/End and Arrow Up/Down reach navigation items; Enter activates the final section.');

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  assert.equal(await list.count(), 0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await list.waitFor();
  assert.equal(await page.locator('#dsh-settings-scroll-style').count(), 1);
  results.push('Closing and reopening the real dialog mounts one scroll region without duplicate styles.');

  await page.setViewportSize({ width: 390, height: 640 });
  await page.waitForTimeout(600); // Let the host sidebar's responsive transition settle.
  await buttons.first().focus();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  size = await metrics();
  assert.ok(size.top > 0);
  const box = await list.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390);
  assert.ok(box.y >= 0 && box.y + box.height <= 640);
  await page.screenshot({ path: new URL('narrow.png', artifacts).pathname });
  results.push('At 390×640 the last section remains reachable and the navigation stays inside the viewport.');

  // Exercise the exact source effect in a separate document for disposal/isolation.
  const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
  const lifecycle = await browser.newPage();
  await lifecycle.setContent('<div role="dialog" aria-modal="true" aria-labelledby="title"><nav><div id="title">Settings</div><div class="test_navList"><button aria-current="true">One</button></div></nav></div><nav id="unrelated"><button>Other</button></nav>');
  const cleanup = await lifecycle.evaluate(code => {
    const { install } = new Function(`${code.replace(/^export /gm, '')}; return { install };`)();
    const dispose = install(document);
    const mounted = document.querySelectorAll('[data-dsh-settings-scroll-list]').length;
    const unrelated = document.querySelector('#unrelated').attributes.length;
    dispose();
    return { mounted, unrelated, remaining: document.querySelectorAll('[data-dsh-settings-scroll-list], [data-dsh-settings-scroll-nav], #dsh-settings-scroll-style').length };
  }, source);
  assert.deepEqual(cleanup, { mounted: 1, unrelated: 1, remaining: 0 });
  results.push('Disposal removes all owned DOM markers/styles and leaves unrelated navigation untouched (isolated lifecycle fixture).');
  assert.deepEqual(errors, []);
  results.push('No browser page errors during the real DSH settings checks.');
  await writeFile(new URL('results.json', artifacts), JSON.stringify({ results }, null, 2) + '\n');
  console.log(results.map(result => `PASS ${result}`).join('\n'));
} finally {
  await browser.close();
}
