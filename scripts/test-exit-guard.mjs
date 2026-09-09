import fs from 'node:fs';
import vm from 'node:vm';

const guard = fs.readFileSync('exit-guard.js','utf8');
const css = fs.readFileSync('exit-guard.css','utf8');
const root = fs.readFileSync('index.html','utf8');
const english = fs.readFileSync('en/index.html','utf8');
const mystery = fs.readFileSync('mystery.js','utf8');
const multiplayer = fs.readFileSync('multiplayer.js','utf8');
const build = fs.readFileSync('scripts/build-www.mjs','utf8');

function has(source,needle,label) {
  if (!source.includes(needle)) throw new Error(`missing ${label}: ${needle}`);
}

new vm.Script(guard,{filename:'exit-guard.js'});
for (const feature of ['beforeunload','popstate','visibilitychange','backButton','pushState','Save and exit','保存并退出']) {
  has(guard,feature,`guard feature ${feature}`);
}
for (const source of [root,english]) {
  has(source,'exit-guard.js','guard script include');
  has(source,'exit-guard.css','guard style include');
  has(source,"register('werewolf-game'",'live match registration');
  has(source,"register('group-chat'",'group chat registration');
  has(source,"register('match-replay'",'replay registration');
}
has(mystery,"register('murder-mystery'",'murder mystery registration');
has(multiplayer,"register('online-room'",'online room registration');
has(css,'.wg-exit-guard.show','custom confirmation visibility');
has(css,'touch-action:none','gesture blocking while confirmation is open');
for (const asset of ["'exit-guard.js'","'exit-guard.css'"]) has(build,asset,`packaged asset ${asset}`);

// Reload safety is stricter than ordinary exit: save failure/throw cannot be swallowed.
const sandbox = {
  document:{documentElement:{lang:'en'},readyState:'loading',addEventListener(){}},
  location:{pathname:'/'},setInterval(){},
  Capacitor:{isNativePlatform:()=>true},addEventListener(){}
};
sandbox.window=sandbox;
vm.createContext(sandbox);vm.runInContext(guard,sandbox);
const api=sandbox.WolfExitGuard;
let active=true, saves=0;
const unregister=api.register('test',{isActive:()=>active,beforeUpdate:()=>{saves++;return true;}});
if(api.prepareUpdate()!==false || saves!==0)throw new Error('Active sessions cannot reload');
active=false;
if(api.prepareUpdate()!==true || saves!==1)throw new Error('Idle reload must save before activation');
unregister();
const remove=api.register('save-fails',{isActive:()=>false,beforeUpdate:()=>false});
if(api.prepareUpdate()!==false)throw new Error('Failed save must block update');
remove();
api.register('broken',{isActive:()=>{throw new Error('broken provider');}});
if(api.isActive()!==true)throw new Error('Broken provider must fail closed');
let threw=false;try{api.prepareUpdate();}catch(e){threw=true;}
if(!threw)throw new Error('Preparation must expose safety failures');
console.log('exit guard: modes protected; updates block active sessions and failed saves');
