import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

await withOfflinePage(async (page, origin) => {
  for (const lang of ['', 'en/']) {
    await page.goto(origin + '/' + lang + 'hot-update.js');
    await page.setContent('<div id="cloud-card">Menu</div>');
    await page.evaluate(() => {
      localStorage.clear();
      window.fetch = async () => ({ok:true, json:async () => ({
        build:750, version:'b750', minNative:1
      })});
      window.Capacitor = {isNativePlatform:() => true, Plugins:{CapacitorUpdater:{
        async addListener(name, callback) { window.progressEvent = callback; return {remove:async () => {}}; },
        download:() => new Promise(resolve => {window.finishDownload = resolve;}),
        next:async () => {},
        notifyAppReady:async () => {}
      }}};
    });
    await page.addScriptTag({content:readFileSync('hot-update.js','utf8')
      .replace('const APP_BUILD = 0;', 'const APP_BUILD = 700;')});
    await page.evaluate(() => window.dispatchEvent(new Event('load')));
    assert.match(await page.locator('#wolf-hot-row').innerText(), /b700/);
    await page.click('#wolf-hot-check');
    await page.waitForFunction(() => !!window.finishDownload);
    assert.equal(await page.locator('#wolf-hot-check').isDisabled(), true);
    assert.equal(await page.locator('#wolf-hot-progress').getAttribute('value'), null);
    await page.evaluate(() => progressEvent({percent:42, bundle:{version:'750'}}));
    assert.equal(await page.locator('#wolf-hot-progress').getAttribute('value'), '42');
    assert.match(await page.locator('#wolf-hot-status').innerText(), /42%/);
    await page.evaluate(() => finishDownload({id:'bundle-750'}));
    await page.waitForFunction(() => !document.getElementById('wolf-hot-check').disabled);
    assert.equal(await page.locator('#wolf-hot-progress').getAttribute('value'), '100');
    assert.match(await page.locator('#wolf-hot-row').innerText(), /b700/);
    await page.click('#wolf-hot-check');
    assert.equal(await page.locator('#wolf-hot-progress').isVisible(), false);
    assert.match(await page.locator('#wolf-hot-status').innerText(), /750/);
  }
});
console.log('Hot update progress: both language DOM checks passed (offline).');
