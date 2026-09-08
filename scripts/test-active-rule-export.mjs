import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import WolfReasoningContext from '../reasoning-context.js';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

function sliceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `missing source slice: ${start}`);
  return source.slice(from, to);
}

const exportSource = [
  sliceBetween(html, 'const WIN_OBJECTIVE_RULE', '// 公开顺序与 PhaseHandlers.night'),
  sliceBetween(html, 'const PACK_WOLF_KILL_ROLE_IDS', 'function buildActiveRoleExportDesc'),
  sliceBetween(html, 'const PUBLIC_NIGHT_ACTION_ORDER', '/* ★ 按需组装世界书'),
  sliceBetween(html, 'function buildActiveRoleExportDesc', 'function buildRulesExport()'),
  sliceBetween(html, 'function buildRulesExport()', '// 网页端 AI 接力专用'),
  sliceBetween(html, 'function buildWebRulesExport(viewerP, options)', 'function buildNames(n)')
].join('\n');

const roleDefs = {
  werewolf:['狼人','bad'], wolfking:['狼王','bad'], wolfbeauty:['狼美人','bad'],
  seer:['预言家','good'], witch:['女巫','good'], hunter:['猎人','good'], guard:['守卫','good'],
  knight:['骑士','good'], magician:['魔术师','good'], merchant:['奇迹商人','good'], fool:['愚者','good'], youshang:['游商','good'], whitewolf:['白狼王','bad'],
  mechwolf:['机械狼','bad'], fox:['子狐','good'], jester:['小丑','third'],
  serialkiller:['连环杀手','third'], alchemist:['炼金魔女','good'],
  wolfconcubine:['蚀时狼妃','bad'], soulwarden:['净魂师','good'], imitator:['摹术师','good'],
  whitecat:['白猫','good'], villager:['村民','good']
};
const ALL_ROLES = Object.fromEntries(Object.entries(roleDefs).map(([id,[name,team]]) => [id, {
  id, name, team, emoji:'', desc:`${name}默认说明。`
}]));
ALL_ROLES.custom_god = {id:'custom_god',name:'星术师',team:'good',goodRoleClass:'god',emoji:'',desc:'自创神职说明。'};
ALL_ROLES.custom_civilian = {id:'custom_civilian',name:'记录员',team:'good',goodRoleClass:'villager',emoji:'',desc:'自创民牌说明。'};

const sandbox = {
  WolfReasoningContext,
  ALL_ROLES,
  window:{WolfI18n:null},
  uiEnglish:() => false,
  $:() => ({checked:false}),
  S:null
};
vm.createContext(sandbox);
vm.runInContext(exportSource + '\nthis.buildRulesExport=buildRulesExport;this.buildWebRulesExport=buildWebRulesExport;', sandbox);

function setGame(ids) {
  sandbox.S = {
    players:ids.map((id, i) => ({id:i, name:`P${i + 1}`, role:ALL_ROLES[id]})),
    killEdgeMode:true, singleRound:true, round:1, extraSpeechEnabled:false,
    sheriffDailyOrderMode:false, knightChainMode:false
  };
}
function setGameRoles(roles) {
  sandbox.S = {
    players:roles.map((role, i) => ({id:i, name:`P${i + 1}`, role})),
    killEdgeMode:true, singleRound:true, round:1, extraSpeechEnabled:false,
    sheriffDailyOrderMode:false, knightChainMode:false
  };
}
function exportBoth(ids) {
  setGame(ids);
  return [sandbox.buildRulesExport(), sandbox.buildWebRulesExport(sandbox.S.players[0])];
}
function exportWebHardRules(ids) {
  setGame(ids);
  return sandbox.buildWebRulesExport(sandbox.S.players[0], {hardRulesOnly:true});
}
function assertAbsent(ids, words) {
  exportBoth(ids).forEach(text => words.forEach(word => {
    assert.ok(!text.includes(word), `${ids.join('+')} export leaked absent role ${word}`);
  }));
}
function assertPresent(ids, word) {
  exportBoth(ids).forEach(text => assert.ok(text.includes(word), `${ids.join('+')} export omitted active interaction ${word}`));
}

assertAbsent(['wolfking'], ['骑士']);
assertPresent(['wolfking','knight'], '骑士');
assertAbsent(['whitewolf'], ['普通狼人']);
assertAbsent(['fox'], ['蚀时狼妃']);
assertPresent(['fox','wolfconcubine'], '蚀时狼妃');
assertPresent(['fox','mechwolf'], '机械媚惑固定先于真子狐');
assertAbsent(['jester'], ['预言家']);
assertAbsent(['serialkiller'], ['守卫','女巫','预言家']);
assertAbsent(['alchemist'], ['魔术师']);
assertAbsent(['mechwolf'], ['预言家','魔术师','平民']);
assertAbsent(['wolfconcubine'], ['净魂师']);
assertAbsent(['soulwarden'], ['蚀时狼妃','狼美人']);
assertPresent(['soulwarden','wolfbeauty'], '狼美人');
exportBoth(['whitecat','villager']).forEach(text => {
  assert.ok(text.includes('白猫（好人阵营·神职（计入屠神））'), 'White Cat is not explicitly classified as a god role in Chinese exports');
  assert.ok(text.includes('村民（好人阵营·平民）'), 'Villager is not explicitly distinguished from god roles in Chinese exports');
});
exportBoth(['fool','merchant','youshang','villager']).forEach(text => {
  for (const name of ['愚者','奇迹商人','游商']) {
    assert.ok(text.includes(`${name}（好人阵营·神职（计入屠神））`), `${name} is not classified as a god role in Chinese exports`);
  }
  assert.ok(text.includes('村民（好人阵营·平民）'), 'Villager lost its civilian classification');
});
exportBoth(['custom_god','custom_civilian']).forEach(text => {
  assert.ok(text.includes('星术师（好人阵营·神职（计入屠神））'), 'custom good power role lost its god-wipe classification');
  assert.ok(text.includes('记录员（好人阵营·民牌（计入屠民））'), 'custom good civilian lost its civilian-wipe classification');
});
const customTemplateCivilian = {...ALL_ROLES.seer, id:'seer', customId:'custom_oracle', name:'占星记录员', goodRoleClass:'villager', desc:'自创模板民牌说明。'};
setGameRoles([customTemplateCivilian]);
for (const text of [sandbox.buildRulesExport(), sandbox.buildWebRulesExport(sandbox.S.players[0])]) {
  assert.ok(text.includes('占星记录员（好人阵营·民牌（计入屠民））'), 'template-cloned custom civilian lost its custom name or civilian class');
  assert.ok(text.includes('自创模板民牌说明。'), 'template-cloned custom role export replaced its custom description with the built-in template description');
}

const normalWebRules = exportBoth(['fox','mechwolf'])[1];
const hardWebRules = exportWebHardRules(['fox','mechwolf']);
assert.ok(normalWebRules.includes('【推理证据等级】'), 'default web rules should retain teaching evidence tiers');
assert.ok(hardWebRules.includes('胜负：') && hardWebRules.includes('流程：'), 'hard-only web rules omitted victory and flow');
assert.ok(hardWebRules.includes('【本局角色公开行动与结算顺序·所有玩家必须遵守】'), 'hard-only web rules omitted action order');
assert.ok(hardWebRules.includes('成为狼刀、守护、解药或摄梦目标，不会自动收到') && hardWebRules.includes('不能自证自己是昨晚刀口'), 'hard-only web rules omitted the attack-target knowledge boundary');
for (const teachingMarker of ['【推理证据等级】','S：','视角漏洞','独立判断','编造“灭口”']) {
  assert.ok(!hardWebRules.includes(teachingMarker), `hard-only web rules leaked teaching marker: ${teachingMarker}`);
}

const i18nSource = fs.readFileSync(new URL('i18n.js', root), 'utf8');
const i18nSandbox = {
  window:{WolfReasoningContext,alert(){},confirm(){},prompt(){}},
  document:{addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},body:{}},
  localStorage:{getItem(){return 'en'},setItem(){}},
  navigator:{language:'en'},
  MutationObserver:class { observe(){} },
  Node:{TEXT_NODE:3,ELEMENT_NODE:1}
};
vm.createContext(i18nSandbox);
vm.runInContext(i18nSource, i18nSandbox, {filename:'i18n.js'});
const englishRules = (ids, options = {}) => i18nSandbox.window.WolfI18n.buildEnglishRules({
  players:ids.map(id => ({role:{id, name:id}})), edge:true, singleRound:true, hiddenDeath:false, ...options
});

assert.ok(!englishRules(['wolfking']).includes('Knight'), 'English Wolf King export leaked absent Knight');
assert.ok(englishRules(['wolfking','knight']).includes('Knight duel'), 'English active Knight interaction missing');
assert.ok(!englishRules(['werewolf']).includes('Known packmates'), 'single known-pack wolf should not receive packmate sacrifice rule');
assert.ok(englishRules(['werewolf','werewolf']).includes('Known packmates'), 'multi-wolf setup should include packmate sacrifice rule');
assert.ok(englishRules(['imitator']).includes('Imitator (Good-team power role (counts toward god wipe)):'), 'English export omitted active Imitator or its god-role class');
assert.ok(englishRules(['whitecat']).includes('counts as a god role for edge-victory god wipe'), 'English export does not classify White Cat as a god role');
assert.ok(englishRules(['fool']).includes('Fool (Good-team power role (counts toward god wipe)):'), 'English export does not classify Fool as a god role');
assert.ok(englishRules(['villager']).includes('Villager (Good-team civilian (counts toward civilian wipe)):'), 'English export does not classify Villager as a civilian role');
assert.ok(!englishRules(['wolfking']).includes('Villager'), 'English edge rule leaked absent Villager role name');
assert.ok(englishRules(['fox','mechwolf']).includes('Mechanical Charm always precedes the real Fox'), 'English export omitted Mechanical Wolf/Fox action order');
const hardEnglishRules = englishRules(['werewolf','werewolf'], {hardRulesOnly:true});
assert.ok(hardEnglishRules.includes('— Public action and resolution order —'), 'English hard-only rules omitted action order');
assert.ok(hardEnglishRules.includes('being targeted by the wolf attack') && hardEnglishRules.includes('cannot verify that you were the attack target'), 'English hard-only rules omitted the attack-target knowledge boundary');
assert.ok(!hardEnglishRules.includes('— Evidence discipline —'), 'English hard-only rules leaked evidence teaching');
assert.ok(!hardEnglishRules.includes('Known packmates are legal wolf-attack targets'), 'English hard-only rules leaked wolf strategy');
const customEnglishRules = i18nSandbox.window.WolfI18n.buildEnglishRules({
  players:[
    {role:{id:'custom_god',name:'Astromancer',team:'good',goodRoleClass:'god',desc:'Custom power role.'}},
    {role:{id:'custom_civilian',name:'Archivist',team:'good',goodRoleClass:'villager',desc:'Custom civilian role.'}}
  ], edge:true, singleRound:true, hiddenDeath:false
});
assert.ok(customEnglishRules.includes('Astromancer (Good-team power role (counts toward god wipe)):'), 'English export omitted custom god-role classification');
assert.ok(customEnglishRules.includes('Archivist (Good-team civilian (counts toward civilian wipe)):'), 'English export omitted custom civilian classification');
const customTemplateEnglishRules = i18nSandbox.window.WolfI18n.buildEnglishRules({
  players:[{role:{id:'seer',customId:'custom_oracle',name:'Oracle Archivist',team:'good',goodRoleClass:'villager',desc:'Custom template civilian.'}}],
  edge:true, singleRound:true, hiddenDeath:false
});
assert.ok(customTemplateEnglishRules.includes('Oracle Archivist (Good-team civilian (counts toward civilian wipe)):'), 'English export replaced a template-cloned custom role with its built-in role name/class');
assert.ok(customTemplateEnglishRules.includes('Custom template civilian.'), 'English export replaced a template-cloned custom description with the built-in template description');

console.log('active role export tests passed');
