import fs from 'node:fs';

const clients = ['index.html', 'en/index.html'];
const roles = ['gravekeeper', 'dreamwalker', 'alchemist', 'gargoyle', 'soulwarden'];
const fail = [];

function expect(ok, message) {
  if (!ok) fail.push(message);
}

for (const file of clients) {
  const src = fs.readFileSync(file, 'utf8');
  for (const role of roles) expect(src.includes(`id:'${role}'`), `${file}: missing ${role} registration`);
  expect(src.includes('dreamTarget:null, dreamNightmare:null'), `${file}: missing dream state`);
  expect(src.includes('alchemistMist:null, alchemistMode:null, alchemistSave:null'), `${file}: missing alchemist state`);
  expect(src.indexOf("nightStep('alchemist-plan'") < src.indexOf("nightStep('wolf-kill'"), `${file}: mist must precede wolf attack`);
  expect(src.indexOf("nightStep('magic-swap'") < src.indexOf("nightStep('alchemist-rescue'"), `${file}: serpent must see redirected attack`);
  const witchSteps = [...src.matchAll(/nightStep\('witch'/g)].map(match => match.index);
  const alchemistRescueSteps = [...src.matchAll(/nightStep\('alchemist-rescue'/g)].map(match => match.index);
  expect(witchSteps.length >= 2 && alchemistRescueSteps.length >= 2, `${file}: missing Witch/Alchemist rescue steps`);
  expect(witchSteps.every((position, index) => position < alchemistRescueSteps[index]), `${file}: Witch must receive first rescue priority`);
  expect(src.includes("result:'covered_by_witch'"), `${file}: Alchemist does not record an already rescued target`);
  expect(src.includes('法老之蛇未消耗'), `${file}: Alchemist is not told that duplicate rescue was skipped`);
  expect(src.includes('if (S.nightData.witchSave)'), `${file}: duplicate Alchemist rescue is not blocked`);
  expect(src.includes("target:victim.name,result:'hold'"), `${file}: declined Serpent rescue forgets the observed attack target`);
  expect(src.includes('你看见实际狼刀落在\'+victim.name+\'，选择保留法老之蛇'), `${file}: declined Serpent rescue is not stored in private memory`);
  expect(src.includes('只有选择救人才消耗整局唯一一次救援'), `${file}: Serpent rules do not distinguish preparation from consumption`);
  expect(src.includes('选择不救、狼队空刀或刀口已获救均不消耗'), `${file}: Serpent non-consumption cases are missing from the rules`);
  expect(src.includes('准备蛇与发动雾同夜互斥'), `${file}: Serpent and Mist mutual exclusion is missing from the rules`);
  expect(src.includes("gameRecord.filter(r=>r.role==='alchemist_rescue'&&r.target)"), `${file}: Serpent observations cannot be reconstructed after memory compression`);
  const magicianSteps = [...src.matchAll(/nightStep\('magician'/g)].map(match => match.index);
  const wolfKillSteps = [...src.matchAll(/nightStep\('wolf-kill'/g)].map(match => match.index);
  expect(magicianSteps.length >= 2 && wolfKillSteps.length >= 2, `${file}: missing repeated night order steps`);
  expect(magicianSteps.every((position, index) => position < wolfKillSteps[index]), `${file}: magician must act before wolf attack`);
  expect(src.includes('魔术师在狼刀确定前行动') || src.includes('每晚【在狼刀确定前】行动'), `${file}: magician timing wording not updated`);
  expect(!src.includes('魔术师最先行动') && !src.includes('每晚最先行动') && !src.includes('每晚【最先】行动'), `${file}: stale absolute-first magician wording`);
  expect(src.includes("p.role.id!=='mechwolf' && p.role.id!=='gargoyle'"), `${file}: pack must exclude isolated wolves`);
  expect(src.includes("role.id !== 'mechwolf' && role.id !== 'gargoyle'"), `${file}: shared wolf vision must exclude isolated wolves`);
  const packLabelStart = src.indexOf('const knownPackIds = new Set(ws.map(w => w.id))');
  const packLabelEnd = src.indexOf('\n    };', packLabelStart);
  expect(packLabelStart >= 0 && packLabelEnd > packLabelStart, `${file}: missing perspective-safe wolf target labels`);
  if (packLabelStart >= 0 && packLabelEnd > packLabelStart) {
    const packLabelSource = src.slice(packLabelStart, packLabelEnd + '\n    };'.length);
    const targetLabel = new Function('ws', `${packLabelSource}; return knownPackTargetLabel;`)([{id:1},{id:2}]);
    expect(/自刀/.test(targetLabel({id:1},{id:1,role:{id:'werewolf',team:'bad'}})), `${file}: a wolf cannot identify itself in its own target picker`);
    expect(/狼队友/.test(targetLabel({id:1},{id:2,role:{id:'wolfbeauty',team:'bad'}})), `${file}: mutually known packmates are not labelled as packmates`);
    expect(targetLabel({id:1},{id:3,role:{id:'gargoyle',team:'bad'}}) === '', `${file}: ordinary wolves learn Gargoyle identity from the target label`);
    expect(targetLabel({id:1},{id:4,role:{id:'mechwolf',team:'bad'}}) === '', `${file}: ordinary wolves learn Mechanical Wolf identity from the target label`);
  }
  expect(src.includes('label: x.name + knownPackTargetLabel(p, x)'), `${file}: human wolf proposal picker bypasses perspective-safe labels`);
  expect(src.includes('label:x.name+knownPackTargetLabel(pW,x)'), `${file}: human wolf final vote picker bypasses perspective-safe labels`);
  expect(!src.includes("label: x.name + (x.role.team === 'bad' ? '（战术自刀）' : '')"), `${file}: proposal picker still reads hidden target alignment`);
  expect(!src.includes("label:x.name+(x.role.team==='bad'?' ⚠️自刀':''),value:String(x.id)"), `${file}: final wolf picker still reads hidden target alignment`);
  expect(src.includes("cause:'dreamkill'"), `${file}: missing lethal second-dream settlement`);
  expect(src.includes("cause:'dreamlink'"), `${file}: missing dreamer death link`);
  expect(src.includes("cause === 'dreamkill' || cause === 'dreamlink'"), `${file}: dream deaths must join private night-death formatting`);
  expect(src.includes("if (cause === 'dreamkill')"), `${file}: missing dreamkill cause formatter`);
  expect(src.includes("if (cause === 'dreamlink')"), `${file}: missing dreamlink cause formatter`);
  expect(src.includes('function _formatPlayerVisibleDeathCause(subject, opts)'), `${file}: missing player-safe death-cause formatter`);
  expect((src.match(/_formatPlayerVisibleDeathCause\(/g) || []).length >= 7, `${file}: some player prompt/export paths still bypass the player-safe death-cause formatter`);
  expect(!src.includes('_formatPublicDeathCause(x, {compact:true, hiddenNight:hdeath, canSeePrivateNight:false})'), `${file}: API player prompt still reveals private night cause when roles are public`);
  expect(!src.includes('_formatPublicDeathCause(x, {compact:true, hiddenNight:hdeathOn, canSeePrivateNight:false})'), `${file}: web relay still reveals private night cause when roles are public`);
  expect(src.includes("hiddenNight: true") && src.includes("canSeePrivateNight: false"), `${file}: player-safe formatter does not force private night causes closed`);
  expect(src.includes('const deferredNightAftermath = []'), `${file}: night deaths do not have a deferred aftermath queue`);
  expect(src.includes('deferNightAftermath: deferredNightAftermath'), `${file}: primary night deaths still trigger skills immediately`);
  expect(src.indexOf("Render.log('death', '昨夜死亡：' + batchNames)") < src.indexOf('for (const item of deferredNightAftermath)'), `${file}: triggered death skills run before the batched night-death announcement`);
  expect(src.includes('以上属于同一批夜间主结算，不代表名单中的先后死亡顺序'), `${file}: players are not told that primary night deaths are simultaneous`);
  expect(src.includes('alchemistBlocked = S.nightData.alchemistSave'), `${file}: missing serpent rescue settlement`);
  expect(src.includes('const mistLocked = Array.isArray(S.nightData.alchemistMist)'), `${file}: wolf flow does not detect the Nameless Mist lock`);
  expect(src.includes('const mistDecisionHint = mistLocked'), `${file}: wolf flow lacks a Mist-specific counterplay decision layer`);
  expect(src.includes('先反推她为什么圈这些人') && src.includes('把名单中每个人与“空刀”逐项比较团队净收益'), `${file}: wolves are not told to infer the Alchemist's trap and compare PASS`);
  expect(src.includes('若候选全是你明确知道的狼队友，默认优先空刀'), `${file}: all-wolf Mist pools do not default to preserving wolf count`);
  expect(src.includes('若候选中有普通好人，刀掉其中最高价值者仍可能正确'), `${file}: Mist guidance overcorrects into automatic passing`);
  expect(src.includes('wolfRun.mistNoticeShown = true'), `${file}: wolves are not shown the locked target notice`);
  expect(src.includes("ws.forEach(w => w.memory.push({role:'system',content:notice}))"), `${file}: AI wolves do not receive the locked target notice`);
  expect(src.includes('const allTargets = validWolfTargets.slice()'), `${file}: final wolf voting escapes the mist target pool`);
  expect(src.includes('只能在这份名单中提议和投票') || src.includes('Other targets cannot be submitted'), `${file}: human wolf input lacks the mist constraint`);
  expect(src.includes('minTargetCount:2,maxTargetCount:Math.min(3,alive.length)'), `${file}: AI Alchemist cannot choose a 2-or-3 target mist`);
  expect(src.includes('mistTargets.length >= 2 && mistTargets.length <= 3'), `${file}: two-target mist is rejected at settlement`);
  expect(src.includes('未明之雾（圈定2～3人）'), `${file}: human Alchemist lacks the flexible mist choice`);
  expect(src.includes('sanctuaryTarget:null, sanctuaryUsed:false, sanctuaryBlocked:null'), `${file}: missing sanctuary state`);
  expect(src.indexOf("nightStep('wolfconcubine'") < src.indexOf("nightStep('soulwarden'"), `${file}: Soul Warden must act after Eclipse Consort`);
  expect(src.indexOf("nightStep('soulwarden'") < src.indexOf("nightStep('fox'"), `${file}: Soul Warden cleansing must resolve before later good actions`);
  expect(src.includes("consumeSanctuaryMark(attemptedCharm, 'wolfbeauty')"), `${file}: Wolf Beauty charm must use sanctuary interception`);
  expect(src.includes("consumeSanctuaryMark(t.id, 'wolfconcubine')"), `${file}: Eclipse Consort mark must be cleansable`);
  expect(src.includes("new Set(['inspect','protect','poison','charm','dream'])"), `${file}: Eclipse Consort lacks the unified reflectable-effect registry`);
  expect(src.includes("reflectTargetedNightSkill(dw, t.id, 'dream')"), `${file}: Dreamwalker is not connected to Eclipse Consort reflection`);
  expect(src.includes('const actualScry = reflectInspectSubject(gg, t)'), `${file}: Gargoyle scry is not connected to Eclipse Consort reflection`);
  expect(src.includes("reflectTargetedNightSkill(gu, submittedGuard, 'protect')"), `${file}: Guard reflection is not resolved in night-action order`);
  expect(src.includes('【自守一致性】自守不是“保存神职”或“求稳”的默认按钮'), `${file}: Guard prompt still permits low-probability reflexive self-protection`);
  expect(src.includes("recordTechnicalActionFailure(gu, '守卫守护'"), `${file}: Guard parse failures are not reported as technical failures`);
  expect(src.includes('technical:guardActionTechnicalFailure'), `${file}: Guard technical failures are not preserved in the action record`);
  expect(!src.includes('[守卫兜底] 无法识别目标，强制守自己'), `${file}: Guard parse failure still silently forces self-protection`);
  expect(!src.includes('[守卫兜底] 随机守'), `${file}: Guard parse failure still invents a random target`);
  expect(src.includes("reflectTargetedNightSkill(wi, submittedWitchPoison, 'poison')"), `${file}: Witch poison reflection is not resolved in night-action order`);
  expect(src.includes('群体领域、自动信息、净化、救援、白天技与死亡技不受影响'), `${file}: Eclipse Consort exclusions are not documented`);
  expect(src.includes("case 'sanctuary-block'"), `${file}: missing god-view sanctuary record formatter`);
  expect(src.includes('function logPrivateNightResult(actor, zh, en)'), `${file}: missing private night-result visibility guard`);
  expect(src.includes('logPrivateNightResult(dw,dreamReflected?'), `${file}: Dreamwalker action is absent from the live observer feed`);
  expect(src.includes("logPrivateNightResult(al,'炼金魔女发动未明之雾"), `${file}: Alchemist mist is absent from the live observer feed`);
  expect(src.includes("logPrivateNightResult(al,'法老之蛇救下了实际刀口"), `${file}: Alchemist rescue is absent from the live observer feed`);
  expect(src.includes('logPrivateNightResult(gg,scryReflected?'), `${file}: Gargoyle scry is absent from the live observer feed`);
  expect(src.includes("gameRecord.filter(r=>r.type==='night_action'&&r.role==='gargoyle').map"), `${file}: web relay cannot reconstruct the Gargoyle's private scry history`);
  expect(src.includes('石像鬼窥视记录（绝密，仅你可见）'), `${file}: Gargoyle web relay omits exact private identities`);
  expect(src.includes('未被验证，之后仍可重新选择'), `${file}: reflected Gargoyle scries are exported as successful target checks`);
  expect(src.includes("if (!(actor.isPlayer || !isAnon() || observerView)) return"), `${file}: private action feed can leak into anonymous public view`);
  expect(src.includes("S.nightData.killActorRole='gargoyle'"), `${file}: Gargoyle attack source is not persisted for settlement`);
  expect(src.includes("S.nightData.killActorRole = 'mechwolf'"), `${file}: Mech Wolf attack source is not persisted for settlement`);
  expect(src.includes("selfKill:t.id===gg.id"), `${file}: Gargoyle self-attack is not recorded`);
  expect(src.includes("selfKill:t.id===mw.id"), `${file}: Mech Wolf self-attack is not recorded`);
  expect(src.includes("x.id===gg.id?'（自刀）'"), `${file}: human Gargoyle cannot explicitly select self-attack`);
  expect(src.includes("x.id===mw.id?'（自刀）'"), `${file}: human Mech Wolf cannot explicitly select self-attack`);
  expect(!src.includes('不能主动自刀') && !src.includes('可空刀但不能主动自刀'), `${file}: stale rule still forbids independent self-attack`);
  expect(src.includes("const independentRole = S.nightData.killActorRole"), `${file}: independent attack results are not resolved separately`);
  expect(src.includes("rec.result = killSuccess ? 'success' : 'failed'"), `${file}: independent attack result is not written back permanently`);
  expect(src.includes('【石像鬼永久刀口记录·私密】'), `${file}: Gargoyle permanent attack history is not reinjected`);
  expect(src.includes('你的永久刀口记录（私有）'), `${file}: Mech Wolf permanent attack history is not reinjected`);
}

const map = fs.readFileSync('action-cg.js', 'utf8');
for (const key of ['gravekeeper','dreamwalker','dreamwalkerNightmare','alchemist','alchemistRescue','gargoyle','gargoyleAwaken','soulwarden']) {
  expect(new RegExp('\\b'+key+'\\s*:').test(map), `action-cg.js: missing ${key}`);
}
for (const file of [
  'gravekeeper-revelation-v1.webp','dreamwalker-protection-v1.webp','dreamwalker-nightmare-v1.webp',
  'alchemist-mist-v1.webp','alchemist-serpent-v1.webp','gargoyle-scry-v1.webp','gargoyle-awakening-v1.webp',
  'soulwarden-sanctuary-v1.webp'
]) expect(fs.existsSync('assets/action-cg/'+file), `missing action CG ${file}`);
for (const role of roles) expect(fs.existsSync('icons/roles/'+role+'.jpg'), `missing portrait ${role}.jpg`);

if (fail.length) {
  console.error(fail.map(x=>'✗ '+x).join('\n'));
  process.exit(1);
}
console.log('strategy roles: registrations, isolation, settlement order and artwork passed');
