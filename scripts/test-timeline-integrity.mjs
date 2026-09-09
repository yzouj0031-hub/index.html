// 权威事件时间轴的完整性回归测试。
//
// 这些断言全部对应真实出现过的跨模型时序错误：AI 把警长竞选当成夜晚之前、
// 拿白天的对跳解释昨夜的刀、继续等待一个已经出局的人"今晚的查验"。
// 每一条错误的根因都不是模型不够聪明，而是它读到的那份记录本身就是错的或缺的。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FILES = ['index.html', 'en/index.html'];

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

// ── 1. 源码标记：时间轴按【公布时刻】而不是【发生时刻】打标签 ──────────────
for (const file of FILES) {
  const src = read(file);

  for (const marker of [
    // 夜间事件统一走公布时刻
    'const _announcePhase = (rd, ph) =>',
    "_pushTimeline(_announcePhase(r.round, r.phase) || _timelinePhase(r), '已发生·系统事实', _formatPublicShootEvent(r))",
    "_pushTimeline(_announcePhase(r.round, r.phase) || _timelinePhase(r), '已发生·系统事实', _formatPublicBiteEvent(r))",
    '_pushTimeline(_announcePhase(_tRd, _tPh) || _timelinePhase({...r, round:_tRd, phase:_tPh})',
    // 骑士决斗不再写死「第N天·白天」
    "if (r.type === 'duel') { _pushTimeline(_timelinePhase(r), '已发生·系统事实', _formatPublicDuelEvent(r)); continue; }",
    // 「开局」不再借用当前轮次
    "if (String(r.text).trim() === '开局') {",
    '开局·发牌',
    // 平安夜是一条真事件，不靠"没有死亡记录"反推
    'dawnAnnounce:true',
    "if (r.dawnAnnounce) {",
    // 平票 PK 再投票不再落进「白天」
    "String(r.subtype || '').startsWith('day')",
    // 发言标签（遗言/竞选演讲/PK/最终陈词）不再被抹平
    "r.label ? `公开发言·${r.label}·只是提议/声称`",
    // 夜死者的遗言归到天亮公布段，不留在竞选段
    "if (r.label === '遗言') {",
  ]) {
    assert.ok(src.includes(marker), `${file}: 时间轴标签修复缺失 → ${marker}`);
  }

  // 放逐死者的 phase 是 'vote'，旧判据 === 'day' 从不成立，"计划作废"硬事实从没出现过
  assert.ok(
    src.includes("if (_deathPh && _deathPh !== 'night' && Number.isFinite(_deathRd)) {"),
    `${file}: 「系统自动取消」仍然只认 phase==='day'，放逐死者不会触发`,
  );
  assert.ok(
    !src.includes("if ((r.phase || r.deathPhase) === 'day' && Number.isFinite(r.round)) {"),
    `${file}: 旧的 === 'day' 判据仍在`,
  );

  // 协议和它指向的证据必须同生共死
  assert.ok(src.includes('const _timelineActive = _timelineLines.length > 1;'), `${file}: 时间轴启用门槛未改`);
  assert.ok(
    src.includes("const temporalExecutionBlock = !_timelineActive ? '' :"),
    `${file}: 时间轴不存在时仍然注入「必须以时间轴为准」的协议`,
  );
  assert.ok(!src.includes('if (_timelineSpeechCount > 0) {'), `${file}: 旧的"至少一条发言"门槛仍在`);
}

// ── 2. 源码标记：引擎写记录时就带上阶段，不让下游猜 ────────────────────────
for (const file of FILES) {
  const src = read(file);
  for (const marker of [
    "gameRecord.push({type:'shoot', round:S.round, phase:(p.deathPhase === 'night' ? 'night' : S.phase)",
    "gameRecord.push({type:'bite', round:S.round, phase:(p.deathPhase === 'night' ? 'night' : S.phase)",
    "gameRecord.push({type:'whitewolf_explode', round:S.round, phase:S.phase",
    "gameRecord.push({type:'duel', round:S.round, phase:S.phase",
  ]) {
    assert.ok(src.includes(marker), `${file}: 公开事件记录缺少阶段字段 → ${marker}`);
  }
  // 魅惑连带必须继承触发者的死亡阶段：首日夜晚结算是在警长竞选之后跑的，
  // 不传 nightResolve 会让夜间连带死者的 deathPhase 变成 'sheriff'。
  assert.ok(
    src.includes("await killPlayer(charmed, 'charm', {suffix:' [魅惑连带]', skipWords:true, nightResolve:_charmNight});"),
    `${file}: 魅惑连带仍未继承夜间死亡阶段`,
  );
  assert.ok(
    src.includes('if (_charmNight && S._lastNightDeaths && !S._lastNightDeaths.includes(charmedId))'),
    `${file}: 白天触发的魅惑连带仍会被算进"昨晚死亡"`,
  );
}

// ── 3. 记忆里的公告必须带日期：第4天时四条"昨晚死亡"彼此无法区分 ────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes('const deathInfo = `【公告·第${_annDay}天】'), `${file}: 死亡公告没有日期`);
  assert.ok(src.includes('`【公告·第${S.round}天】第${S.round}夜是平安夜，没有人死亡。`'), `${file}: 平安夜公告没有日期`);
  assert.ok(src.includes('【狼队私密·第${S.round}夜】'), `${file}: 狼队刀口回执没有夜数`);
  assert.ok(src.includes('const notice = `【遗言·第${S.round}天】'), `${file}: 遗言广播没有日期`);
  // 夜里被刀的人也走这条广播，写死「被放逐出局前」等于凭空造出一场放逐
  assert.ok(!src.includes('${roleHint}被放逐出局前留下遗言'), `${file}: 遗言广播仍写死"被放逐出局前"`);
  assert.ok(src.includes('在第${_lwDay}天被投票放逐出局前'), `${file}: 遗言广播没有按死因区分`);
  // 白天任务提示词此前完全没有天数，夜间的一直有
  assert.ok(src.includes('`【第${S.round}天·白天发言·第一轮】'), `${file}: 白天第一轮提示词没有天数`);
  assert.ok(src.includes('`【第${S.round}天·白天发言·第二轮】'), `${file}: 白天第二轮提示词没有天数`);
}

// ── 4. buildNowFacts：硬事实必须贴着决策点复述 ─────────────────────────────
for (const file of FILES) {
  const src = read(file);
  const start = src.indexOf('function buildNowFacts(p) {');
  const end = src.indexOf('\nfunction buildSpeakOrderFact(p) {', start);
  assert.ok(start >= 0 && end > start, `${file}: buildNowFacts 未找到`);
  const code = src.slice(start, end);

  const mk = (id, name, alive, deathRound, deathPhase) => ({ id, name, alive, deathRound, deathPhase });
  const run = (S) => vm.runInNewContext(`${code}; buildNowFacts`, { S })({ id: 0 });

  // 竞选阶段：夜间行动已结算但死讯未公布，且夜死者此刻仍被当作在场
  const sheriff = run({
    round: 1, phase: 'sheriff',
    players: [mk(0, 'P1', true), mk(1, 'P2', true)],
  });
  assert.match(sheriff, /第1夜的所有夜间行动【已经全部结算完毕、无法更改】/, `${file}: 竞选硬事实缺少"夜间已结算"`);
  assert.match(sheriff, /死讯【尚未公布】/, `${file}: 竞选硬事实缺少"死讯未公布"`);
  assert.match(sheriff, /会照常报名、发言和投票/, `${file}: 竞选硬事实没说明夜死者此刻仍在场`);

  // 白天：昨夜结果 + 死者计划作废
  const day = run({
    round: 3, phase: 'day', _lastNightDeaths: [1],
    players: [mk(0, 'P1', true), mk(1, 'P2', false, 3, 'night'), mk(2, 'P3', false, 2, 'vote')],
  });
  assert.match(day, /第3夜的结果：P2出局。/, `${file}: 白天硬事实没有给出昨夜结果`);
  assert.match(day, /P2\[第3夜\]/, `${file}: 出局名单没有标注死亡时点`);
  assert.match(day, /P3\[第2天白天\]/, `${file}: 白天出局者没有标注为白天`);
  assert.match(day, /全部作废/, `${file}: 出局者的后续夜间计划没有被宣告作废`);

  // 平安夜必须说出来，不能只是"没有死亡"
  const peace = run({ round: 2, phase: 'day', _lastNightDeaths: [], players: [mk(0, 'P1', true)] });
  assert.match(peace, /第2夜的结果：平安夜，无人死亡。/, `${file}: 平安夜没有被明确说出`);

  // 夜晚：不能拿"天亮后会怎样"当依据
  const night = run({ round: 2, phase: 'night', players: [mk(0, 'P1', true)] });
  assert.match(night, /第2天白天已经结束/, `${file}: 夜间硬事实缺少边界`);

  // 三个白天提示词都必须接上
  for (const marker of [
    '_r1Lead+buildNowFacts(p)+buildSpeakOrderFact(p)+duelPendingNote+',
    '${r1Echo}${buildNowFacts(p)}${buildSpeakOrderFact(p)}',
    '${deathAnnounce}${round2hint}${buildNowFacts(p)}${buildSpeakOrderFact(p)}',
  ]) {
    assert.ok(src.includes(marker), `${file}: 硬事实没有接进发言提示 → ${marker}`);
  }
}

// ── 5. 被封锁/被反弹的夜间技能不能渲染成"已执行"或"主动空过" ────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes('if (r.blocked) return `[未执行·被封锁]'), `${file}: 被封锁的技能仍会渲染成主动空过`);
  assert.ok(
    src.includes("if (r.reflected || r.result === 'rebounded') return `[已执行·被反弹]"),
    `${file}: 被反弹的技能仍会渲染成命中原目标`,
  );
}

// ── 6. 网页接力战报也要有时序铁律（内置路径一直有，网页端一直没有）──────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes('━━━━ ⏱️ 读这份战报的时序铁律 ━━━━'), `${file}: 网页战报缺少时序铁律`);
  assert.ok(src.includes('return timeRule + deathTimeline + body;'), `${file}: 时序铁律没有接进战报输出`);
  assert.match(src, /他生前宣告过的第N\+1夜及以后的查验、守护、用药、交换、袭击计划【全部作废】/, `${file}: 网页战报没说明死者计划作废`);
}
// 增量同步也必须给出"平安夜"这条硬结论
{
  const src = read('index.html');
  assert.ok(
    src.includes('} else if (resultsAnnounced(r) && nightDeadOf(r).length === 0) {'),
    'index.html: 增量导出仍然吞掉平安夜结论',
  );
  assert.ok(!src.includes('} else if (!isDelta && resultsAnnounced(r) && nightDeadOf(r).length === 0) {'),
    'index.html: 平安夜结论仍被 !isDelta 挡住');
}

// ── 7. 教学：死者名单、零成本行为、女巫终局毒药 ────────────────────────────
for (const file of FILES) {
  const src = read(file);

  // 死者的遗言名单既不能照抄，也不能因为"他死了"就整份丢掉
  assert.ok(src.includes('【死者的名单：不是圣旨，也不是垃圾】'), `${file}: 缺少死者情报教学`);
  assert.match(src, /只有"撞过、撞不上"才有资格丢/, `${file}: 死者名单仍可以不经检验就丢弃`);
  assert.match(src, /说不出更硬的新锚，就不许删旧锚/, `${file}: 缺少"换锚强制"，好人可以弃锚后裸奔`);
  assert.match(src, /是拿对手的战果当自己的论据/, `${file}: 没有点破"他是我们投出去的"不是反证`);

  // 按时交账是零成本行为，不能当成内容为真的担保
  assert.ok(src.includes('【零成本行为不分阵营·按时交账不等于账是真的】'), `${file}: 缺少"按时交账≠账是真的"教学`);
  assert.match(src, /证据等级为零/, `${file}: 没有把零成本行为定级为零证据`);
  assert.match(src, /交得晚、说得乱也不构成狼点/, `${file}: 缺少反向校准，会变成"配合就是狼"`);
  assert.match(src, /验错了他要付什么代价/, `${file}: 没有给出替代的评估标准`);

  // 女巫残局：留毒的期望值会转负
  assert.ok(src.includes('【终局毒药必须算账，不要带毒进棺材】'), `${file}: 缺少女巫终局毒药计数`);
  assert.match(src, /没出手的毒药在结算时价值恒为零/, `${file}: 没有说清留毒的期望值`);
  assert.match(src, /这条只在残局生效，不推翻上面的自检/, `${file}: 缺少校准，会退化成"永远出毒"`);
}

// ── 8. 角色 guide 的换行必须是真换行 ──────────────────────────────────────
// 女巫和狼美人的 guide 曾经整段用 \\n 双重转义，运行时得到的是字面量 "\n" 文本，
// 于是这两份 guide 到达模型时是一堵没有任何分段的墙——恰好是全场最需要分步执行的两个角色。
for (const file of FILES) {
  const src = read(file);
  // 注意：狼美人的 guide 是【混合】转义（一部分两重、一部分四重，还夹着 \\" 转义引号），
  // 不能用同一条规则批量还原，改错会把整段文本切坏。它单独留待处理，故不在此列。
  for (const rid of ['witch', 'seer', 'guard', 'hunter', 'magician']) {
    const i = src.indexOf(`reg({id:'${rid}'`);
    assert.ok(i >= 0, `${file}: 找不到角色 ${rid}`);
    const gs = src.indexOf("guide:'", i) + 7;
    const tail = src.indexOf("'+N1});", gs);
    const ge = tail >= 0 ? tail : src.indexOf("'});", gs);
    const body = src.slice(gs, ge);
    assert.equal(body.includes('\\\\n'), false, `${file}: 角色 ${rid} 的 guide 仍存在双重转义换行`);
  }
}

console.log('timeline integrity: announcement-time labels, dated notices, hard facts at the decision point, teaching and guide escaping passed');
