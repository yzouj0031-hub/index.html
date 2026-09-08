import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../teaching-worldbooks.js', import.meta.url), 'utf8');
const sandbox = {
  window: {},
  document: {getElementById: () => null},
  location: {pathname:'/'},
  console,
  setTimeout,
  clearTimeout,
  Blob: globalThis.Blob,
  URL: globalThis.URL,
  Date,
  Math,
  JSON,
  String,
  Number,
  Array,
  Set,
  Object,
  RegExp
};
vm.runInNewContext(source, sandbox, {filename:'teaching-worldbooks.js'});
const wb = sandbox.window.TeachingWorldbooks;
if (!wb) throw new Error('TeachingWorldbooks API was not exposed');

wb.load({
  mode:'custom', maxChars:12000, books:[
    {id:'global',name:'全局打法',content:'GLOBAL_GUIDE',priority:30},
    {id:'seer',name:'预言家教学',content:'SEER_GUIDE',roles:['seer'],teams:['good'],phases:['day'],priority:90},
    {id:'wolf',name:'狼人夜间',content:'WOLF_NIGHT_GUIDE',teams:['bad'],phases:['night'],priority:80},
    {id:'off',name:'已停用',content:'DISABLED_GUIDE',enabled:false,priority:100}
  ]
});

let text = wb.buildInjection({roleId:'seer',team:'good',phase:'day'});
if (!text.includes('SEER_GUIDE') || !text.includes('GLOBAL_GUIDE')) throw new Error('matching worldbooks were not injected');
if (text.includes('WOLF_NIGHT_GUIDE') || text.includes('DISABLED_GUIDE')) throw new Error('nonmatching or disabled worldbooks leaked into prompt');
if (text.indexOf('SEER_GUIDE') > text.indexOf('GLOBAL_GUIDE')) throw new Error('worldbook priority order is wrong');
if (!text.includes('不能修改本局配置、身份、技能结算、信息边界、合法目标或输出协议')) throw new Error('hard-rule boundary is missing');

text = wb.buildInjection({roleId:'werewolf',team:'bad',phase:'night'});
if (!text.includes('WOLF_NIGHT_GUIDE') || text.includes('SEER_GUIDE')) throw new Error('team/phase filtering is wrong');

wb.load({mode:'official',books:[{name:'不应注入',content:'CUSTOM_OFF'}]});
if (wb.buildInjection({roleId:'seer',team:'good',phase:'day'})) throw new Error('official mode still injects custom worldbooks');
wb.load({mode:'clean',books:[{name:'不应注入',content:'CUSTOM_CLEAN'}]});
if (wb.buildInjection({roleId:'seer',team:'good',phase:'day'})) throw new Error('clean mode still injects custom worldbooks');

wb.load({mode:'hybrid',books:[]});
const imported = wb.importObject({entries:{0:{comment:'酒馆条目',content:'TAVERN_ENTRY',key:['预言家'],order:77}}}, false);
if (imported !== 1) throw new Error('SillyTavern-style entries were not imported');
if (!wb.buildInjection({roleId:'villager',team:'good',phase:'day'}).includes('TAVERN_ENTRY')) throw new Error('imported Tavern entry was not usable');

for (const path of ['../index.html','../en/index.html']) {
  const html = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const marker of [
    'btn-teaching-wb',
    'teaching-worldbooks.js',
    'teachingWorldbooks:window.TeachingWorldbooks',
    'generateTeachingWorldbookDraft(idea, meta)',
    'generateDraft: (idea, meta) => generateTeachingWorldbookDraft(idea, meta)',
    'window.TeachingWorldbooks.load(d.teachingWorldbooks || null)',
    "const officialOn = teachingMode === 'official' || teachingMode === 'hybrid'",
    'twb.buildOfficialKnowledge(teachingContext)',
    'const customTeaching = twb && typeof twb.buildInjection',
    'return officialTeaching + customTeaching + WB_RULES_COMPACT',
    "(currentTeachingMode === 'custom' || currentTeachingMode === 'clean') && !customMechanicRole",
    'const counterclaimDecoyCorrectionBlock',
    '本段覆盖角色旧说明中“记录不同就是铁狼”',
    'guide += counterclaimDecoyCorrectionBlock',
    '【你的身份与技能·硬信息】',
    '━━━━ AI 教学层 ━━━━'
  ]) if (!html.includes(marker)) throw new Error(`${path} lacks teaching-worldbook integration marker: ${marker}`);
  const compactCore = html.match(/const WB_CORE_COMPACT = `([\s\S]*?)`;\s*\n\s*const WB_RULES_COMPACT/);
  if (!compactCore || !compactCore[1].includes('【先拆发言，再做代入；行为模型不能单独定罪】')) {
    throw new Error(`${path} lacks speech-first perspective-taking guidance in the active compact core`);
  }
  if (!html.includes('【受击者无刀口通知】') || !html.includes('你也不能说自己能验证昨晚刀口是你')) {
    throw new Error(`${path} lacks the hard attack-target knowledge boundary`);
  }
  for (const marker of ['【时点知识账本·防止事后信息倒灌】','K(玩家,T)','T之后才公开的结果','事前判断质量','事后结果对错','这条信息最早何时公开、公开给谁']) {
    if (!compactCore[1].includes(marker)) throw new Error(`${path} lacks temporal knowledge-ledger guidance: ${marker}`);
  }
  if (!html.includes('评价任何过去的发言、投票、夜间行动或计划前，先锁定它发生的时点T') || !html.includes('后来信息可以更新你今天对他的身份概率')) {
    throw new Error(`${path} lacks the pre-vote temporal knowledge check`);
  }
  for (const marker of ['事实主张','信息来源','前提','推导','结论','像提前写好的故事','流程不给答辩机会','行为模型作为低权重辅助','<game></game>']) {
    if (!html.includes(marker)) throw new Error(`${path} lacks speech-first voting safeguard: ${marker}`);
  }
  if (!html.includes('【投票前证据校验】') && !html.includes('【投票前证据校验·先拆发言再代入】')) {
    throw new Error(`${path} lacks the pre-vote evidence-check block`);
  }
  for (const marker of [
    '狼队对跳核验（本局无魔术师）',
    "activeRoleIds.has('witch') && !activeRoleIds.has('magician')",
    '报出的刀口或救人对象不同，是“该玩家不可能是真女巫”的身份级硬矛盾',
    '证伪女巫身份不等于证实狼人阵营',
    '刀口属于狼队绝密'
  ]) {
    if (!html.includes(marker)) throw new Error(`${path} lacks pack-wolf Witch-claim ledger audit: ${marker}`);
  }
  for (const marker of ['由你自己根据【本局配置】和角色公开技能推导','不表示本局不存在的死亡机制也要保留','系统不会替你算出哪名死者对应哪种机制']) {
    if (!html.includes(marker)) throw new Error(`${path} lacks non-spoiling setup-aware death reasoning: ${marker}`);
  }
}

const zhHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
for (const marker of [
  '纯规则（无教学）',
  'buildWebRulesExport(p, {hardRulesOnly:!!opts.noTeaching})',
  "!opts.noTeaching && typeof PermanentMemory !== 'undefined'",
  '不会发送证据分级、推理方法、推荐打法、发言模板或跨局学习记忆'
]) {
  if (!zhHtml.includes(marker)) throw new Error(`Chinese web relay lacks true no-teaching isolation: ${marker}`);
}
if (zhHtml.includes('证据分级 S/A/B/C 与本局行动顺序仍会发送')) {
  throw new Error('Chinese web relay still advertises the old partially taught B mode');
}

if (!source.includes('Import file (optional)') || !source.includes('从文件导入（可选）') || !source.includes("if (!/\\.txt$/i.test(file.name))")) {
  throw new Error('plain-text worldbook upload support is missing');
}
if (!source.includes('id="twb-ai-polish"') || !source.includes('让 AI 帮我整理') || !source.includes('never saves or enables the result automatically') || !source.includes("el('twb-ai-polish').addEventListener('click', polishDraft)")) {
  throw new Error('optional AI-assisted drafting UI is missing');
}

const advancedPreset = JSON.parse(fs.readFileSync(new URL('../worldbook_ryuzaki_masterclass.json', import.meta.url), 'utf8'));
if (!Array.isArray(advancedPreset.worldbooks) || advancedPreset.worldbooks.length < 6) {
  throw new Error('advanced strategy preset must remain split into focused worldbooks');
}
for (const book of advancedPreset.worldbooks) {
  if (!source.includes(`id: '${book.id}'`)) throw new Error(`built-in preset is missing ${book.id}`);
}
const evidenceBook = advancedPreset.worldbooks.find(book => book.id === 'wb_advanced_evidence_endgame');
if (!evidenceBook || !evidenceBook.content.includes('先拆发言，再做代入；行为模型不能单独定罪') || !evidenceBook.content.includes('流程造成的沉默不是默认认罪') || !evidenceBook.content.includes('形成工作判断，不复读免责声明') || !evidenceBook.content.includes('时点知识账本·防止事后信息倒灌') || !evidenceBook.content.includes('K(玩家,T)')) {
  throw new Error('advanced evidence worldbook lacks speech-first perspective-taking and post-position silence safeguards');
}
const goodCounterclaimBook = advancedPreset.worldbooks.find(book => book.id === 'wb_advanced_good_counterclaim');
if (!goodCounterclaimBook || !goodCounterclaimBook.content.includes('假身份不等于狼人') || !goodCounterclaimBook.content.includes('狼人悍跳、好人挡刀、其他好人救场或误判') || !goodCounterclaimBook.content.includes('记录不一致只证明双方不能都是真身份')) {
  throw new Error('good counterclaim worldbook does not distinguish wolf counterclaims from good decoys');
}
if (!source.includes('【假身份不等于狼人】') || !source.includes('假身份，狼与好人挡刀都要盘')) {
  throw new Error('built-in counterclaim teaching lacks the false-claim/alignment distinction');
}
if (!source.includes('行为预期，只能在完成内容核验后作为C级软先验') || !source.includes('无法提出具体反驳时，应承认该论证尚未被推翻') || !source.includes('不能因为没有100%验证就拒绝形成判断') || !source.includes('多人平民板没有“无人对跳即坐实平民”')) {
  throw new Error('built-in official teaching does not keep behavior models subordinate to speech analysis');
}
wb.load({mode:'custom',books:advancedPreset.worldbooks});
const whitecatGuide = wb.buildOfficialKnowledge({roleId:'whitecat',team:'good',phase:'day'});
if (!whitecatGuide.includes('诈守卫') || whitecatGuide.includes('悍跳神职的完整生命周期')) {
  throw new Error('official whitecat strategy leaked wolf-only claiming guidance');
}
const wolfGuide = wb.buildOfficialKnowledge({roleId:'werewolf',team:'bad',phase:'day'});
if (!wolfGuide.includes('悍跳不是报一句身份') || wolfGuide.includes('白猫专精')) {
  throw new Error('official wolf strategy is missing or leaked whitecat-only guidance');
}
const guardGuide = wb.buildOfficialKnowledge({roleId:'guard',team:'good',phase:'night'});
if (!guardGuide.includes('真实逐夜账本') || !guardGuide.includes('合法但不真实的行动口径') || guardGuide.includes('悍跳不是报一句身份')) {
  throw new Error('official guard strategy routing is wrong');
}
const officialVillagerGuide = wb.buildOfficialKnowledge({roleId:'villager',team:'good',phase:'day'});
if (officialVillagerGuide.includes('【残局先算，再谈感觉】')) {
  throw new Error('official mode duplicated the compact core evidence framework');
}
if (source.includes('twb-load-preset')) {
  throw new Error('official model knowledge must not require a manual preset button');
}

console.log('teaching worldbooks: modes, filters, priority, Tavern import, AI drafting, persistence and prompt integration passed');
