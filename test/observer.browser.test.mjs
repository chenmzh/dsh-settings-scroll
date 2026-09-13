import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { chromium } from 'playwright';

test('conversation mutations do not scan settings; dynamic navigation and disposal still work', async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.DSH_TEST_BROWSER ? { channel: process.env.DSH_TEST_BROWSER } : {}) });
  try {
    const page = await browser.newPage();
    await page.setContent('<main id="conversation"></main>');
    const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8');
    const result = await page.evaluate(async code => {
      const { install } = new Function(`${code.replace(/^export /gm, '')}; return { install };`)();
      const original = document.querySelectorAll.bind(document);
      let scans = 0;
      document.querySelectorAll = selector => { if (selector.includes('[aria-modal=')) scans++; return original(selector); };
      const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dispose = install(document);
      const initial = scans;
      for (let i = 0; i < 30; i++) {
        document.querySelector('#conversation').append(document.createElement('span'));
        await Promise.resolve();
      }
      await frame();
      const closedScans = scans - initial;
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'title');
      dialog.innerHTML = '<nav><div id="title">Settings</div><div class="test_navList"><button aria-current="true">One</button></div></nav>';
      document.body.append(dialog); await frame();
      const mounted = original('[data-dsh-settings-scroll-list]').length;
      const before = scans;
      for (let i = 0; i < 30; i++) { document.querySelector('#conversation').append(document.createElement('span')); await Promise.resolve(); }
      await frame();
      const openScans = scans - before;
      const list = dialog.querySelector('[data-dsh-settings-scroll-list]');
      const first = list.firstElementChild;
      list.insertAdjacentHTML('beforeend', '<button>Two</button>');
      first.focus(); first.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      const dynamicFocus = document.activeElement.textContent;
      dialog.remove(); await frame();
      const detachedClean = !list.hasAttribute('data-dsh-settings-scroll-list');
      document.body.append(dialog); await frame();
      const reopened = original('[data-dsh-settings-scroll-list]').length;
      // Dispose with an animation frame pending; no late callback can remount.
      list.append(document.createElement('button')); await Promise.resolve();
      dispose(); await frame();
      return { closedScans, openScans, mounted, dynamicFocus, detachedClean, reopened,
        remaining: original('[data-dsh-settings-scroll-list], [data-dsh-settings-scroll-nav], #dsh-settings-scroll-style').length };
    }, source);
    assert.deepEqual(result, { closedScans: 0, openScans: 0, mounted: 1, dynamicFocus: 'Two', detachedClean: true, reopened: 1, remaining: 0 });
  } finally { await browser.close(); }
});
