import fs from 'node:fs';
import WolfReasoningContext from '../reasoning-context.js';

for (const path of ['../index.html', '../en/index.html']) {
  const html = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const required = [
    '【子狐媚惑结果·完整永久记录】',
    '【你遭到子狐媚惑的完整永久记录】',
    "r.role === 'fox'",
    'targetId:t.id',
    '原选择目标没有任何阵营结论',
    'function recordNightSkillMuted(p, ability)',
    "role:'skill-muted'",
    '【你的技能封锁结果·完整永久记录】',
    '你只知道能力来源，不知道哪名玩家是子狐',
    "const isWolf = t.role.team==='bad'",
    "S.nightData.skillMuteSources[t.id] = 'fox'",
    "S.nightData.skillMuteSources[t.id] = 'mechwolf_fox'",
    'function isFoxCharmMuteSource(source)',
    '机械媚惑固定早于真子狐行动',
    'function buildActivePublicInteractionRules()',
    'const PUBLIC_NIGHT_ACTION_ORDER',
    '【本局角色公开行动与结算顺序·所有玩家必须遵守】',
    '机械狼学平民后的伪装只影响真正的预言家查验，不会欺骗你的媚惑判定',
    '被子狐媚惑时会触发当晚全体狼人禁刀',
    '任何实际受到媚惑的目标都会私下知道本夜遭到子狐类媚惑',
    "case 'fox': return 'fox'",
    'async _mechFox(mw, alive)',
    'if (!mw || !mw.alive',
    "result:'rebounded'",
    'actualTargetId:fo.id',
    'actualTargetId:mw.id',
    'verifiedTargetId:fo.id',
    'verifiedTargetId:mw.id',
    'originalTargetUnverified:true',
    'reflectionKnown:true',
    '完全没有被验证，不能据此认定其为好人或狼人',
    "await nightStep('wolfconcubine'",
    "await nightStep('mechwolf-fox'",
    "recordNightSkillMuted(se, '查验')",
    "recordNightSkillMuted(sk, '独立袭击')",
    "recordNightSkillMuted(mg, '号码交换')",
    "recordNightSkillMuted(gu, '守护')",
    "recordNightSkillMuted(wi, '用药')",
    "recordNightSkillMuted(p, '获赐礼物选择')",
    "recordNightSkillMuted(p, '获赐的主动技能')",
    '你的技能封锁记录：',
    "case 'skill-muted'",
    'const killBlocked = !!S.nightData.foxBlockKill',
    '【狼队密谈·禁刀夜】',
    '狼队完成战术讨论，但不产生刀口',
    "role:'wolf', round:S.round, target:null, blocked:true, reason:'foxBlockKill'",
    "role:'mechwolf_kill', round:S.round, target:null, blocked:true, reason:'foxBlockKill'"
  ];
  for (const marker of required) {
    if (!html.includes(marker)) throw new Error(`${path} lacks Fox/private-result marker: ${marker}`);
  }

  const mechFoxSteps = [...html.matchAll(/await nightStep\('mechwolf-fox'/g)].map(m => m.index);
  const foxSteps = [...html.matchAll(/await nightStep\('fox'/g)].map(m => m.index);
  if (mechFoxSteps.length !== foxSteps.length || mechFoxSteps.some((pos, i) => pos >= foxSteps[i])) {
    throw new Error(`${path} does not resolve Mechanical Charm before the real Fox`);
  }

  const publicRuleStart = html.indexOf('const PUBLIC_NIGHT_ACTION_ORDER');
  const publicRuleEnd = html.indexOf('/* ★ 按需组装世界书', publicRuleStart);
  const publicRuleSource = html.slice(publicRuleStart, publicRuleEnd);
  const roleCatalog = Object.fromEntries(['fox','mechwolf','wolfconcubine','villager'].map(id => [id,{id,name:id}]));
  const timingApi = new Function('S','ALL_ROLES','WolfReasoningContext', `${publicRuleSource}; return {buildActivePublicInteractionRules, PUBLIC_NIGHT_ACTION_ORDER};`);
  const publicRulesFor = ids => timingApi({players:ids.map(id => ({role:{id,name:id}}))}, roleCatalog, WolfReasoningContext).buildActivePublicInteractionRules();
  const foxOnlyPublic = publicRulesFor(['fox','villager']);
  if (!/子狐媚惑/.test(foxOnlyPublic) || /机械狼与子狐硬时序|机械媚惑固定先于真子狐/.test(foxOnlyPublic)) {
    throw new Error(`${path} omits the active Fox order or injects Mechanical Wolf order when Mechanical Wolf is absent`);
  }
  const mechFoxPublic = publicRulesFor(['fox','mechwolf','villager']);
  if (!/所有玩家必须遵守/.test(mechFoxPublic) || !/机械媚惑固定先于真子狐/.test(mechFoxPublic) || /蚀时狼妃/.test(mechFoxPublic)) {
    throw new Error(`${path} does not give every player the active Mechanical Wolf/Fox order without leaking absent roles`);
  }
  const reflectedPublic = publicRulesFor(['fox','mechwolf','wolfconcubine','villager']);
  if (!/反弹锁硬时序：同夜只触发一次/.test(reflectedPublic) || !/两种结果互斥/.test(reflectedPublic)) {
    throw new Error(`${path} omits the public one-shot reflection ordering when all three roles are active`);
  }

  const canonicalKeys = timingApi({players:[]}, roleCatalog).PUBLIC_NIGHT_ACTION_ORDER.map(step => step.key);
  const canonicalSet = new Set(canonicalKeys);
  const phaseStart = html.indexOf('const PhaseHandlers = {');
  const firstStart = html.indexOf('if (S.round === 1)', phaseStart);
  const laterStart = html.indexOf("await nightStep('atmo-open'", html.indexOf('return;', firstStart));
  const nightEnd = html.indexOf('async sheriff()', laterStart);
  const stepKeys = source => [...source.matchAll(/await nightStep\('([^']+)'/g)].map(m => m[1]).filter(key => canonicalSet.has(key));
  const firstKeys = stepKeys(html.slice(firstStart, laterStart));
  const laterKeys = stepKeys(html.slice(laterStart, nightEnd));
  if (JSON.stringify(firstKeys) !== JSON.stringify(canonicalKeys)) {
    throw new Error(`${path} public first-night order diverges from PhaseHandlers.night\npublic=${canonicalKeys.join(' > ')}\nengine=${firstKeys.join(' > ')}`);
  }
  const expectedLater = canonicalKeys.filter(key => key !== 'cupid');
  if (JSON.stringify(laterKeys) !== JSON.stringify(expectedLater)) {
    throw new Error(`${path} public later-night order diverges from PhaseHandlers.night\npublic=${expectedLater.join(' > ')}\nengine=${laterKeys.join(' > ')}`);
  }

  const helperStart = html.indexOf('function isFoxCharmMuteSource(source)');
  const helperEnd = html.indexOf('function reflectInspectSubject', helperStart);
  const helper = html.slice(helperStart, helperEnd);

  const state = {round: 3, nightData:{skillMuteSources:{6:'fox'}}};
  const records = [];
  const {recordNightSkillMuted} = new Function('S', 'gameRecord', `${helper}; return {recordNightSkillMuted};`)(state, records);
  const target = {id: 6, name: 'Test Fox', role:{id:'fox'}, memory: []};
  recordNightSkillMuted(target, '守护');
  recordNightSkillMuted(target, '守护');
  if (records.length !== 1 || target.memory.length !== 1) {
    throw new Error(`${path} does not deduplicate the same player's mute result for one night`);
  }
  if (!/遭到【子狐类媚惑】/.test(target.memory[0].content) || !/不知道施法玩家是谁/.test(target.memory[0].content)) {
    throw new Error(`${path} gives the muted player the wrong private information`);
  }
  if (records[0].source !== 'fox') throw new Error(`${path} does not persist the mute source`);

  state.round = 4;
  state.nightData.skillMuteSources[6] = 'mechwolf_fox';
  recordNightSkillMuted(target, '媚惑');
  if (records[1].source !== 'mechwolf_fox' || !/回合开始前已经结算/.test(target.memory[1].content) || !/根本没有执行自己的媚惑/.test(target.memory[1].content) || !/绝不能.*自己的媚惑.*反弹/.test(target.memory[1].content)) {
    throw new Error(`${path} does not distinguish pre-turn Mechanical Charm from Fox reflection`);
  }

  state.round = 5;
  state.nightData.skillMuteSources[6] = 'custom';
  recordNightSkillMuted(target, '守护');
  if (/子狐/.test(target.memory[2].content) || !/神秘力量/.test(target.memory[2].content)) {
    throw new Error(`${path} mislabels a custom mute as Fox charm`);
  }
}

console.log('Fox results persist; targets learn Fox charm without learning the Fox player');
