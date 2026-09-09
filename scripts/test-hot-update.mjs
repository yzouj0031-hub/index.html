// Offline updater lifecycle tests; native bridge is simulated, never a real API/device.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const SRC=readFileSync('hot-update.js','utf8');
let passed=0;
function eq(a,b,label){assert.deepEqual(a,b,label);passed++;}
function ok(a,label){assert.ok(a,label);passed++;}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const bundle=(version=750,status='pending')=>({id:'pkg-'+version,version:String(version),status});
const meta=(build=750,extra={})=>({build,version:'b'+build,minNative:1,sha256:'a'.repeat(64),zipUrl:'https://example.test/bundle.zip',...extra});
function storage(init={}){const m=new Map(Object.entries(init).map(([k,v])=>[k,String(v)]));return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
function run({build=700,native=true,hasPlugin=true,remote=meta(),ls=storage(),plugin={},active=false,prepare=true,pathname='/',connection}={}){
 const calls={download:[],set:[],next:[],removed:0,notify:0};const timers=new Map();let serial=0,inventory=[];
 const updater={
  async current(){return {bundle:bundle(build,'success')};},async list(){return {bundles:inventory};},
  async download(o){calls.download.push(o);const b=bundle(Number(o.version));inventory.push(b);return b;},
  async set(o){calls.set.push(o);return new Promise(()=>{});},async next(o){calls.next.push(o);},
  async notifyAppReady(){calls.notify++;},
  async addListener(name,cb){updater.emit=cb;return {async remove(){calls.removed++;}};},...plugin};
 const ctx={console,Promise,Number,JSON,URL,localStorage:ls,
  document:{hidden:false,getElementById:()=>null,addEventListener(){}},
  setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id),setInterval:()=>0,
  location:{pathname},navigator:{connection},addEventListener(){},WolfExitGuard:{isActive:()=>active,prepareUpdate:()=>prepare},
  fetch:async()=>({ok:true,json:async()=>remote}),
  Capacitor:native?{isNativePlatform:()=>true,Plugins:{CapacitorUpdater:hasPlugin?updater:null}}:undefined};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(SRC.replace('const APP_BUILD = 0;','const APP_BUILD = '+build+';'),ctx);
 return {api:ctx.WolfHotUpdate,ctx,calls,ls,updater,timers,setInventory:b=>{inventory=b;}};
}
eq(SRC.match(/const APP_BUILD = (\d+);/)[1],'0','release-only stamping');
eq(SRC,readFileSync('en/hot-update.js','utf8'),'bilingual parity');
ok(!run({native:false}).api,'no native updater on web');ok(!run({hasPlugin:false}).api,'missing plugin harmless');
{
 const r=run({remote:meta(700)});eq((await r.api.check({manual:true})).status,'current');eq(r.calls.download.length,0);
}
{
 const r=run();eq((await r.api.check()).status,'available');eq(r.calls.download.length,0,'consent before download');
 eq((await r.api.check()).status,'skipped');eq((await r.api.check({manual:true})).status,'available');
}
{
 const r=run({remote:meta(750,{minNative:99})});eq((await r.api.check({manual:true,download:true})).status,'needs-apk');eq(r.calls.download.length,0);
}
for(const status of ['missing','error','deleted','downloading']){
 const r=run({ls:storage({wolfHotPending:750})});if(status!=='missing')r.setInventory([bundle(750,status)]);
 eq((await r.api.check({manual:true})).status,'available','stale '+status+' marker');eq(r.ls.getItem('wolfHotPending'),null);
}
for(const status of ['pending','success']){
 const r=run({ls:storage({wolfHotPending:750})});r.setInventory([bundle(750,status)]);
 eq((await r.api.check({manual:true})).status,'pending');eq(r.calls.download.length,0);
}
for(const pathname of ['/','/en/']){
 const r=run({pathname});const p=r.api.check({manual:true,download:true});
 eq(r.api.check({manual:true,download:true}),p,'concurrent request shared');eq((await p).status,'staged');
 eq(r.calls.next.length,0,'no activation on background');eq(r.calls.set.length,0);
 eq(r.calls.download[0].checksum,'a'.repeat(64));eq(r.calls.download[0].version,'750');eq(r.calls.removed,1);eq(r.api.build,700);
}
{
 let finish;const r=run({plugin:{download:()=>new Promise(resolve=>{finish=resolve;})}});
 const p=r.api.check({manual:true,download:true});await tick();eq(r.api.getState().percent,null);
 r.updater.emit({percent:42,bundle:bundle()});eq(r.api.getState().percent,42);
 r.updater.emit({percent:90,bundle:bundle(999)});r.updater.emit({percent:20,bundle:bundle()});eq(r.api.getState().percent,42);
 r.updater.emit({percent:100,bundle:bundle()});eq(r.api.getState().phase,'downloading','100 not success');
 r.setInventory([bundle()]);finish(bundle());await p;eq(r.api.getState().phase,'staged');
 r.updater.emit({percent:50,bundle:bundle()});eq(r.api.getState().phase,'staged');
}
{
 const r=run({plugin:{async download(){throw new Error('offline');}}});
 await assert.rejects(r.api.check({manual:true,download:true}));eq(r.api.getState().phase,'failed');eq(r.ls.getItem('wolfHotPending'),null);eq(r.calls.removed,1);
 r.setInventory([bundle()]);eq((await r.api.check({manual:true,download:true})).status,'pending');
}
{
 const r=run({active:true});await r.api.check({manual:true,download:true});await r.api.applyReady();
 eq(r.api.getState().phase,'deferred');eq(r.calls.set.length,0);eq(r.calls.next.length,0);
 r.ctx.WolfExitGuard.isActive=()=>false;r.api.applyReady();await tick();
 eq(r.calls.set.length,1);eq(JSON.parse(r.ls.getItem('wolfHotAttempt')).build,750);eq(r.api.getState().phase,'applying');
 const next=run({build:750,ls:r.ls});await next.api.markBootOk();
 eq(next.calls.notify,1);eq(next.api.getState().phase,'success');eq(next.ls.getItem('wolfHotAttempt'),null);eq(next.ls.getItem('wolfHotPending'),null);
}
{
 const r=run({prepare:false});await r.api.check({manual:true,download:true});await r.api.applyReady();
 eq(r.calls.set.length,0,'failed save blocks reload');eq(r.api.getState().phase,'failed');
}
{
 const r=run();await r.api.check({manual:true,download:true});delete r.ctx.WolfExitGuard;await r.api.applyReady();eq(r.calls.set.length,0,'missing guard fails closed');
}
{
 const r=run();await r.api.check({manual:true,download:true});r.setInventory([]);await r.api.applyReady();
 eq(r.calls.set.length,0);eq(r.api.getState().phase,'failed');
}
{
 const r=run({plugin:{async set(){throw new Error('native failure');}}});await r.api.check({manual:true,download:true});await r.api.applyReady();eq(r.api.getState().phase,'failed');
}
{
 const r=run({plugin:{async set(){}}});await r.api.check({manual:true,download:true});const p=r.api.applyReady();await tick();
 const timer=[...r.timers.values()].find(t=>t.ms===10000);ok(timer,'wait for actual reload');timer.fn();await p;eq(r.api.getState().phase,'failed','resolved set is not success');
}
{
 const r=run({ls:storage({wolfHotAttempt:JSON.stringify({build:750}),wolfHotPending:750})});await r.api.markBootOk();
 eq(r.api.getState().phase,'failed','rollback visible');r.setInventory([bundle()]);eq((await r.api.check({manual:true})).status,'available','no auto reuse after rollback');
}
{
 const r=run({build:750,ls:storage({wolfHotPending:750}),plugin:{async notifyAppReady(){throw new Error('offline');}}});await r.api.markBootOk();
 eq(r.api.getState().phase,'failed');eq(r.ls.getItem('wolfHotPending'),'750','retain evidence if boot not confirmed');
}
for(const f of ['index.html','en/index.html']){
 const h=readFileSync(f,'utf8');ok(h.includes('WolfHotUpdate.markBootOk()'));ok(h.includes('beforeUpdate:() =>'));
}
{
 const r=run({connection:{saveData:true}});
 eq((await r.api.check({download:true})).status,'skipped-metered');
 eq((await r.api.check({manual:true,download:true})).status,'staged','manual consent bypasses data saver');
}
{
 const r=run({plugin:{async list(){throw new Error('bridge offline');}}});
 await assert.rejects(r.api.check({manual:true}));eq(r.api.getState().phase,'failed');
 eq(r.calls.download.length,0,'unknown native inventory is not ready');
}
{
 const r=run({build:750,ls:storage({wolfHotAttempt:JSON.stringify({build:750})}),
  plugin:{async current(){return {bundle:bundle(700,'success')};}}});
 await r.api.markBootOk();eq(r.api.getState().phase,'failed','mixed runtime/native versions not success');
}
{
 const r=run({ls:storage({wolfHotPending:750})});r.setInventory([bundle()]);
 await r.api.check({manual:true});let busy=false;
 r.ctx.WolfExitGuard.isActive=()=>busy;
 r.updater.list=async()=>{busy=true;return {bundles:[bundle()]};};
 await r.api.applyReady();eq(r.calls.set.length,0,'new session during native check blocks reload');
}
{
 const r=run({plugin:{async addListener(){throw new Error('unsupported');}}});
 eq((await r.api.check({manual:true,download:true})).status,'staged','no progress support still downloads');
}
eq(SRC.match(/const APP_VERSION = '([^']*)';/)[1],'dev','version placeholder retained');
for(const f of ['sw.js','en/sw.js'])ok(!/HOT_CACHE|BUNDLED_BUILD|wolf-hot-active/.test(readFileSync(f,'utf8')),'old SW updater remains absent');
ok(readFileSync('scripts/build-www.mjs','utf8').includes("'hot-update.js'"));
ok(readFileSync('.github/workflows/build-apk.yml','utf8').includes('ANDROID_KEYSTORE_BASE64'));
console.log('hot update lifecycle: '+passed+' checks passed');
