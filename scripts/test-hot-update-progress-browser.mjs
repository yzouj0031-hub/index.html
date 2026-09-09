import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {withOfflinePage} from './lib/offline-browser.mjs';
const src=readFileSync('hot-update.js','utf8');
await withOfflinePage(async(page,origin)=>{
  async function boot(lang,build=700,keepStorage=false) {
    await page.goto(origin+'/'+lang+'hot-update.js');
    await page.setContent('<html><body style="background:#151326;color:white"><div id="cloud-card">Menu</div></body></html>');
    await page.evaluate(({build,keepStorage})=>{
      if(!keepStorage)localStorage.clear();
      window.sessionActive=true;window.nativeSets=[];window.inventory=[];
      window.WolfExitGuard={isActive:()=>window.sessionActive,prepareUpdate:()=>true};
      window.fetch=async()=>({ok:true,json:async()=>({build:750,version:'b750',minNative:1})});
      window.Capacitor={isNativePlatform:()=>true,Plugins:{CapacitorUpdater:{
        async current(){return {bundle:{id:'pkg-'+build,version:String(build),status:'success'}};},
        async list(){return {bundles:window.inventory};},
        async addListener(name,cb){window.progressEvent=cb;return {remove:async()=>{}};},
        download:()=>new Promise(resolve=>{window.finishDownload=()=>{
          const b={id:'pkg-750',version:'750',status:'pending'};window.inventory=[b];resolve(b);
        };}),
        set:options=>{window.nativeSets.push(options);return new Promise(()=>{});},
        next:()=>{throw new Error('Must not schedule on background');},
        notifyAppReady:async()=>{}
      }}};
    },{build,keepStorage});
    await page.addScriptTag({content:src.replace('const APP_BUILD = 0;', 'const APP_BUILD = '+build+';')
      .replace("const APP_VERSION = 'dev';", "const APP_VERSION = 'b"+build+"';")});
    await page.evaluate(async()=>{await WolfHotUpdate.markBootOk();window.dispatchEvent(new Event('load'));});
  }
  for(const lang of ['', 'en/']) {
    await page.setViewportSize({width:390,height:844});
    await boot(lang);
    // Automatic discovery opens a prompt; no automatic download before consent.
    await page.waitForSelector('#wolf-update-dialog',{state:'visible'});
    assert.equal(await page.evaluate(()=>!!window.finishDownload),false);
    assert.match(await page.locator('#wolf-update-version').innerText(),/b700.*b750/);
    await page.click('#wolf-update-primary');
    await page.waitForFunction(()=>!!window.finishDownload);
    assert.equal(await page.locator('#wolf-update-primary').isDisabled(),true);
    assert.equal(await page.locator('#wolf-update-bar').getAttribute('value'),null);
    await page.evaluate(()=>progressEvent({percent:42,bundle:{version:'750'}}));
    assert.equal(await page.locator('#wolf-update-bar').getAttribute('value'),'42');
    assert.match(await page.locator('#wolf-update-message').innerText(),/42%/);
    if(!lang) {
      const file=path.join(process.env.TEMP || '.', 'wolf-update-progress-preview.png');
      await page.screenshot({path:file});console.log('Preview: '+file);
    }
    await page.evaluate(()=>finishDownload());
    await page.waitForFunction(()=>WolfHotUpdate.getState().phase==='deferred');
    assert.equal(await page.evaluate(()=>nativeSets.length),0);
    // Closing the pending dialog cancels automatic activation.
    await page.click('#wolf-update-later');
    await page.evaluate(()=>{sessionActive=false;});
    await page.waitForTimeout(1700);
    assert.equal(await page.evaluate(()=>nativeSets.length),0);
    await page.click('#wolf-hot-check');
    await page.waitForSelector('#wolf-update-dialog',{state:'visible'});
    await page.click('#wolf-update-primary');
    await page.waitForFunction(()=>nativeSets.length===1);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wolfHotAttempt')).build),750);
    assert.equal(await page.evaluate(()=>WolfHotUpdate.getState().phase),'applying');
    await boot(lang,750,true);
    await page.waitForSelector('#wolf-update-dialog',{state:'visible'});
    assert.equal(await page.evaluate(()=>WolfHotUpdate.getState().phase),'success');
    assert.match(await page.locator('#wolf-update-message').innerText(),/b750/);
    assert.equal(await page.locator('#wolf-update-bar').getAttribute('value'),'100');
    assert.equal(await page.locator('#wolf-update-primary').isVisible(),false);
    assert.equal(await page.evaluate(()=>localStorage.getItem('wolfHotAttempt')),null);
    await page.click('#wolf-update-later');
    assert.equal(await page.locator('#wolf-update-dialog').isVisible(),false);
  }
  // Automatic deferral resumes only after the session is no longer active.
  await boot('');
  await page.waitForSelector('#wolf-update-dialog',{state:'visible'});
  await page.click('#wolf-update-primary');
  await page.waitForFunction(()=>!!window.finishDownload);
  await page.evaluate(()=>finishDownload());
  await page.waitForFunction(()=>WolfHotUpdate.getState().phase==='deferred');
  await page.evaluate(()=>{sessionActive=false;});
  await page.waitForFunction(()=>nativeSets.length===1);
});
console.log('Update lifecycle: bilingual mobile UI, consent, progress, defer/cancel, activation and confirmed boot passed offline.');
