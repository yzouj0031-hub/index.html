// 网页端接力战报的时间线结构回归测试：
//   ① 「第N夜」必须是独立顶层块，且排在「第N天」之前（不能再套在“第 N 天”标题里）
//   ② 没有可见夜间记录的玩家也要看到夜晚占位（“这一夜已经发生、结果未公布”）
//   ③ 夜间死亡要放在第N天块的「天亮公布」段（竞选之后），而不是夜晚块
//   ④ 警长报名记录必须带“未参选”名单，让外部 AI 不会把“没上警=没发言”当狼点
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

function loadBattleReport(html, file) {
  const start = html.indexOf('  function _buildBattleReport() {');
  const end = html.indexOf('  const battleReport = _buildBattleReport();', start);
  assert.ok(start >= 0 && end > start, `${file}: _buildBattleReport 边界未找到`);
  const src = html.slice(start, end);
  const params = ['p','S','gameRecord','isDelta','relayMark','hdeathOn','isPackWolfRole',
    '_formatPlayerVisibleDeathCause','_formatPublicRevealEvent','_formatPublicShootEvent','_formatPublicBiteEvent',
    '_formatPublicDuelEvent','_formatPublicWhitewolfExplodeEvent','_formatPublicSheriffTransfer','_formatPublicVoteEvent',
    '_formatPublicTrialEvent','_publiclyRevealedRoleName','_publiclyVerifiedAlignment','_formatCustomNightAction'];
  const fn = vm.runInNewContext(`(function(${params.join(',')}){${src}\nreturn _buildBattleReport();})`, {}, {filename:file});
  return (p, S, gameRecord, opts = {}) => fn(p, S, gameRecord, !!opts.isDelta, opts.relayMark || {recIdx:0, histIdx:0}, !!opts.hd,
    r => ['werewolf','wolfking','wolfbeauty','whitewolf'].includes(r.id),
    r => r.cause === 'vote' ? '被投票放逐' : '昨晚死亡',
    r => String(r.type), r => 'shoot', r => 'bite', r => 'duel', r => 'explode', r => 'transfer',
    r => `🗳️ ${r.subtype}投票：${JSON.stringify(r.votes || {})}`, r => 'trial', () => '', () => '', () => '');
}

const mk = (id, roleId, team) => ({id, name:'P'+(id+1)+'号', alive:true, role:{id:roleId, name:roleId, team}});
function scenario(phase, round) {
  const players = [mk(0,'villager','good'), mk(1,'seer','good'), mk(2,'werewolf','werewolf'), mk(3,'witch','good'), mk(4,'villager','good'), mk(5,'werewolf','werewolf')];
  const S = {players, history:[], round, phase};
  const rec = [
    {type:'speech', wolfChat:true, name:players[2].name, round:1, phase:'night', game:'今晚刀P2号'},
    {type:'night_action', role:'wolf', round:1, target:players[1].name},
    {type:'sheriff_roster', stage:'signup', round:1, candidates:[players[0].name, players[3].name], nonCandidates:[players[4].name],
      text:`警长报名：${players[0].name}、${players[3].name}；未参选：${players[4].name}（未参选者在竞选环节本来就不发言，这是正常弃权，不能当作怀疑理由）`},
    {type:'speech', name:players[0].name, label:'竞选', round:1, phase:'sheriff', game:'我上警是为了带好节奏'},
  ];
  if (phase !== 'sheriff') {
    rec.push({type:'vote', subtype:'sheriff', round:1, votes:{}});
    players[1].alive = false; players[1].deathRound = 1; players[1].deathPhase = 'night';
    rec.push({type:'death', name:players[1].name, role:'seer', team:'good', cause:'kill', round:1, phase:'night'});
    rec.push({type:'speech', name:players[0].name, label:'发言', round:1, phase:'day', game:'昨晚死的是P2号'});
  }
  if (round >= 2) {
    rec.push({type:'speech', name:players[0].name, label:'发言', round:2, phase:'day', game:'第二天发言'});
  }
  return {players, S, rec};
}

for (const file of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(new URL(file, root), 'utf8');
  const build = loadBattleReport(html, file);

  // ── 第一天白天：村民视角 ──
  {
    const {players, S, rec} = scenario('day', 1);
    const out = build(players[0], S, rec);
    const iNight = out.indexOf('╔══════ 🌙 第1夜');
    const iDay = out.indexOf('╔══════ ☀️ 第 1 天');
    const iSheriff = out.indexOf('👑 警长竞选环节');
    const iAnnounce = out.indexOf('🌅 天亮，公布第1夜结果');
    const iDeath = out.indexOf('💀 ' + players[1].name);
    const iDaySpeech = out.indexOf('白天讨论');
    assert.ok(iNight >= 0, `${file}: 缺少独立的第1夜顶层块`);
    assert.ok(iDay > iNight, `${file}: 第1夜块必须排在第1天块之前`);
    assert.doesNotMatch(out, /╔══════ 第 1 天/, `${file}: 旧的“夜晚套在第N天里”格式仍在`);
    assert.match(out.slice(iNight, iDay), /没有可见的夜间记录/, `${file}: 村民首夜缺少夜晚占位说明`);
    assert.doesNotMatch(out.slice(iNight, iDay), /💀/, `${file}: 夜间死亡不应出现在夜晚块里（它是天亮后才公布的）`);
    assert.ok(iSheriff > iDay && iAnnounce > iSheriff && iDeath > iAnnounce && iDaySpeech > iDeath,
      `${file}: 第1天块内顺序应为 竞选 → 天亮公布 → 死讯 → 白天讨论`);
    assert.match(out.slice(iSheriff, iAnnounce), /未参选：P5号/, `${file}: 竞选段缺少未参选名单`);
    assert.match(out.slice(iSheriff, iAnnounce), /昨夜死讯公布【之前】/, `${file}: 竞选段缺少“死讯尚未公布”说明`);
    assert.doesNotMatch(out.slice(iNight, iDay), /今晚刀P2号/, `${file}: 村民不应看到狼队密谈`);
  }

  // ── 第一天白天：狼视角，密谈在夜晚块里 ──
  {
    const {players, S, rec} = scenario('day', 1);
    const out = build(players[2], S, rec);
    const iNight = out.indexOf('╔══════ 🌙 第1夜');
    const iDay = out.indexOf('╔══════ ☀️ 第 1 天');
    assert.match(out.slice(iNight, iDay), /🐺密谈 .*今晚刀P2号/, `${file}: 狼的密谈应在第1夜块里`);
    assert.doesNotMatch(out.slice(iNight, iDay), /没有可见的夜间记录/, `${file}: 有夜间记录时不应再输出占位`);
    assert.match(out.slice(iNight, iDay), /其他角色的夜间行动同样已在此时完成/, `${file}: 有记录的玩家缺少“其他角色行动也已完成”尾注`);
    assert.match(out.slice(iNight, iDay), /首夜没有任何白天信息/, `${file}: 首夜块缺少“无白天信息”说明`);
  }

  // ── 竞选进行中：死讯未公布，不能出现死亡、也不能暗示平安夜 ──
  {
    const {players, S, rec} = scenario('sheriff', 1);
    const out = build(players[0], S, rec);
    assert.match(out, /第1夜结果：尚未公布/, `${file}: 竞选阶段应明确“结果尚未公布”`);
    assert.doesNotMatch(out, /平安夜，无人死亡/, `${file}: 竞选阶段不能宣称平安夜`);
    assert.doesNotMatch(out, /💀/, `${file}: 竞选阶段不应出现死亡记录`);
    assert.ok(out.indexOf('╔══════ 🌙 第1夜') < out.indexOf('╔══════ ☀️ 第 1 天'), `${file}: 竞选阶段夜晚块仍应在天块之前`);
  }

  // ── 第二天：第二夜无人死亡 → 明确写平安夜 ──
  {
    const {players, S, rec} = scenario('day', 2);
    const out = build(players[0], S, rec);
    const i2n = out.indexOf('╔══════ 🌙 第2夜');
    const i2d = out.indexOf('╔══════ ☀️ 第 2 天');
    assert.ok(i2n > 0 && i2d > i2n, `${file}: 第2夜块应存在且在第2天块之前`);
    assert.match(out.slice(i2d), /第2夜平安夜，无人死亡/, `${file}: 第2天应公布第2夜平安`);
    assert.ok(out.indexOf('╔══════ ☀️ 第 1 天') < i2n, `${file}: 第1天块应在第2夜块之前`);
    assert.match(out.slice(i2n, i2d), /第1天白天结束前已存在的信息；第2天白天的发言此时还没有发生/, `${file}: 第2夜块缺少“依据只能来自第1天”说明`);
  }

  // ── 发言顺序·系统事实：内置提示与导出共用的 buildSpeakOrderFact ──
  {
    const start = html.indexOf('function buildSpeakOrderFact(p) {');
    const end = html.indexOf('\nfunction buildHostContext() {', start);
    assert.ok(start >= 0 && end > start, `${file}: buildSpeakOrderFact 未找到`);
    const order = [mk(0,'villager','good'), mk(1,'seer','good'), mk(2,'werewolf','werewolf')];
    const fact = vm.runInNewContext(`${html.slice(start, end)}; buildSpeakOrderFact`, {S:{_daySpeakOrder:order}})(order[1]);
    assert.match(fact, /你排在第2位/, `${file}: 发言顺序事实缺少本人位置`);
    assert.match(fact, /排在你之后的 P3号 尚未发言/, `${file}: 发言顺序事实缺少“之后的人尚未发言”`);
    assert.match(fact, /我的位置决定了我的发言顺序/, `${file}: 发言顺序事实缺少后跳神职的正确说法`);
    assert.match(fact, /不要拿发言先后给对方安动机/, `${file}: 发言顺序事实缺少“不给对方安动机”`);
    assert.equal(vm.runInNewContext(`${html.slice(start, end)}; buildSpeakOrderFact`, {S:{_daySpeakOrder:[]}})(order[0]), '', `${file}: 无顺序时应返回空串`);
    for (const marker of [
      '_r1Lead+buildNowFacts(p)+buildSpeakOrderFact(p)+duelPendingNote+',
      '${r1Echo}${buildNowFacts(p)}${buildSpeakOrderFact(p)}',
      '${deathAnnounce}${round2hint}${buildNowFacts(p)}${buildSpeakOrderFact(p)}',
    ]) assert.ok(html.includes(marker), `${file}: 发言提示缺少接入 ${marker}`);
  }

  // ── 源码标记：报名记录写入未参选名单；局势/竞选提示带“第N夜已结束”硬事实 ──
  for (const marker of [
    "candidates:candNames, nonCandidates:nonCandNames",
    "'；未参选：' + nonCandNames.join('、')",
    '时间顺序铁律：🌙第1夜 → ☀️第1天',
    '第${S.round}天（第${S.round}夜已结束）',
    '【硬事实】第${S.round}夜已经结束',
    // 内置 API 路径的「权威事件时间轴」也要按公布时刻打标签，不能出现 第N天·警长竞选 → 第N夜 的倒序
    "const phase = _deathPh === 'night' ? `第${_deathRd}天·天亮公布` : _timelinePhase(r);",
    '死于第${_deathRd}夜，天亮后才公布；公布之前没有人知道',
    '第1夜开始：狼刀、查验、用药、守护等所有夜间行动在此完成并已成定局',
    '但昨夜死讯【尚未公布】：此刻没有人知道昨晚谁死了',
  ]) {
    assert.ok(html.includes(marker), `${file}: 缺少标记 ${marker}`);
  }
}

console.log('web relay timeline test passed');
