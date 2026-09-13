import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

test('the published browser entry registers with DSH and delegates its effect to Cordis', async () => {
  let registration;
  const source = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: value => { registration = value; } } } });
  assert.equal(registration.id, 'dsh-settings-scroll');
  const plugin = registration.factory();
  let effect;
  plugin.apply({ effect: callback => { effect = callback; } });
  assert.equal(typeof effect, 'function');
  assert.equal(plugin.name, 'settings-scroll');
});
