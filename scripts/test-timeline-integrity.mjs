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

// ── 9. API 路径：记忆窗口的左边界必须可见，且绝不以 assistant 开头 ────────────
// 系统提示给的是完整时间轴，对话历史却从半局中间开始。模型没有信号说"更早的回合被
// 移出去了"，于是把最老的一条当成入局第一步。另外 slice 可能把一对 user/assistant
// 拦腰切断，让整段对话以 assistant 开头——Anthropic Messages API 会直接拒绝该请求。
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes('const _memDropped = filteredMemory.length - memSlice.length;'), `${file}: 记忆窗口没有统计被丢弃的条数`);
  assert.ok(
    src.includes("while (memSlice.length && memSlice[0].role === 'assistant') memSlice = memSlice.slice(1);"),
    `${file}: 记忆窗口仍可能以孤儿 assistant 开头`,
  );
  assert.match(src, /【记忆窗口说明】你更早的 \$\{_memDropped\} 条个人记录/, `${file}: 没有告诉模型记忆被截断过`);
  assert.match(src, /不要因为"想不起来"就断言自己当时没做过、没说过或不在场/, `${file}: 缺少"以时间轴为准"的兜底`);
  assert.ok(!src.includes('const memSlice = memLimit > 0 ? filteredMemory.slice(-memLimit) : filteredMemory;'), `${file}: 旧的裸切片仍在`);

  // 存进记忆的"我上一轮说了什么"不再包含 <thinking>
  const a = src.indexOf('function memoryEcho(content) {');
  const b = src.indexOf('\nasync function callAI(', a);
  assert.ok(a >= 0 && b > a, `${file}: memoryEcho 未找到`);
  const memoryEcho = vm.runInNewContext(`${src.slice(a, b)}; memoryEcho`, {});
  assert.equal(
    memoryEcho('<thinking>我怀疑P5</thinking>\n<game>大家好</game><action>None</action>'),
    '<game>大家好</game><action>None</action>',
    `${file}: memoryEcho 没有剥掉 <thinking>`,
  );
  assert.equal(memoryEcho('<game>只有发言</game>'), '<game>只有发言</game>', `${file}: memoryEcho 改动了不含思考的回复`);
  assert.equal(memoryEcho('<thinking>全是思考</thinking>'), '<thinking>全是思考</thinking>', `${file}: 剥空时必须回退原文`);
  assert.equal(memoryEcho(null), '', `${file}: memoryEcho 对 null 不安全`);
  for (const m of [
    "{role:'assistant',content:memoryEcho(content),thinking:memoryThinking(content, parsed),round:S.round,phase:S.phase}",
    "{role:'assistant',content:memoryEcho(finalContent || parsed.game),thinking:memoryThinking(finalContent, parsed),round:S.round,phase:S.phase}",
  ]) assert.ok(src.includes(m), `${file}: 记忆写入点没有按新格式存思考/轮次 → ${m}`);
  assert.ok(src.includes("{role:'user',content:prompt,isTaskPrompt:true,round:S.round,phase:S.phase}"), `${file}: 任务提示词记录没有打轮次标记`);
}

// ── 9b. 私密思考按新鲜度分档：只带回最近一轮，更早的退化成只剩公开发言 ──────────
// 全存会让模型自己几天前的推理堵在决策点旁边（最近性压过时间轴）；全删又让"我下一个
// 验谁"这类未宣告的打算跨不过回合。折中是滑动窗口 + 总量预算。
for (const file of FILES) {
  const src = read(file);
  const a = src.indexOf('const THINK_CARRY_ROUNDS');
  const b = src.indexOf('\nasync function callAI(', a);
  assert.ok(a >= 0 && b > a, `${file}: 思考携带窗口未找到`);
  assert.ok(src.includes('memSlice = attachRecentThinking(memSlice);'), `${file}: 思考没有被贴回提示词`);

  const ctx = { S: { round: 4 } };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b), ctx);

  const mk = (r, ph, th) => ({ role: 'assistant', round: r, phase: ph, thinking: th, content: '<game>说了点什么</game>' });
  const carried = (m) => m.content.startsWith('<thinking>');

  const out = ctx.attachRecentThinking([
    { role: 'user', content: 'x', round: 2, phase: 'day' }, mk(2, 'day', '第2天的想法'),
    { role: 'user', content: 'x', round: 3, phase: 'night' }, mk(3, 'night', '第3夜的想法'),
    { role: 'user', content: 'x', round: 4, phase: 'night' }, mk(4, 'night', '第4夜的想法'),
  ]);
  const asst = out.filter((m) => m.role === 'assistant');
  assert.equal(carried(asst[0]), false, `${file}: 第2轮（超出窗口）的思考不该被带回`);
  assert.equal(carried(asst[1]), true, `${file}: 上一轮的思考应该被带回`);
  assert.equal(carried(asst[2]), true, `${file}: 本轮的思考应该被带回`);
  assert.match(asst[1].content, /【第3夜·你自己当时的私密思考，仅供参考，不是当前结论】/, `${file}: 带回的思考没有标注时点与"不是当前结论"`);
  assert.match(asst[0].content, /^<game>/, `${file}: 超窗口的回合应只剩公开发言`);

  // 总量预算：从新到旧填，填不下的直接不带
  const big = ctx.attachRecentThinking([mk(4, 'night', 'X'.repeat(3000)), mk(4, 'day', 'Y'.repeat(3000))]);
  assert.equal(carried(big[1]), true, `${file}: 最新一条思考应优先带回`);
  assert.equal(carried(big[0]), false, `${file}: 超出总量预算的更早思考不该被带回`);

  // 旧存档没有轮次标记，一律按"太旧"处理，不能凭空带回
  const legacy = ctx.attachRecentThinking([{ role: 'assistant', thinking: '旧存档', content: '<game>x</game>' }]);
  assert.equal(carried(legacy[0]), false, `${file}: 无轮次标记的旧记录不该被带回`);

  // 单条上限 + 原生 reasoning 兜底
  assert.ok(ctx.memoryThinking('<thinking>' + 'Z'.repeat(3000) + '</thinking>').length <= 1220, `${file}: 单条思考没有截断`);
  assert.equal(ctx.memoryThinking('<game>只有发言</game>', { thinking: '原生思考' }), '原生思考', `${file}: 原生 reasoning 字段没有兜底`);
  assert.equal(ctx.memoryThinking('<game>只有发言</game>'), '', `${file}: 没有思考时不该凭空造一条`);
}

// ── 10. 私密夜间记录：被封锁不是空过，未知角色不能漏出英文 id ──────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes("if (r.role === 'skill-muted') {"), `${file}: skill-muted 仍会被渲染成"主动空过"`);
  assert.ok(src.includes("const title = roleNames[r.role] || (r.role ? `夜间技能(${r.role})` : '夜间技能');"), `${file}: 未知角色仍会漏出裸 id`);
  for (const rn of ["fox:'子狐媚惑'", "'granted-seer':'赐予·查验'", "'custom-inspect':'自创·查验'", "gargoyle:'石像鬼窥视'"]) {
    assert.ok(src.includes(rn), `${file}: 角色名字典缺少 ${rn}`);
  }
  assert.match(src, /const _res = r\.result === 'wolf' \? ' → 狼人显示'/, `${file}: 通用分支仍然吞掉查验结果`);
}

// ── 11. 同一请求里不能出现两份口径相反的同一份情报 ──────────────────────────
for (const file of FILES) {
  const src = read(file);
  // 狼队主方案：记忆里那份此前无日期、且写成"你的默认行动指引"
  assert.ok(src.includes("'【狼队主方案·第' + S.round + '夜夜谈定】"), `${file}: 狼队主方案记忆副本仍无日期`);
  assert.match(src, /【不是后续任何一天的当前命令】/, `${file}: 狼队主方案仍被写成常驻命令`);
  assert.ok(!src.includes("作为你的默认行动指引。但——"), `${file}: 旧的"默认行动指引"措辞仍在`);
  // 守卫连守限制：空守/技术失败时两个块必须口径一致
  assert.ok(
    src.includes("const _gLast = (last.target && last.target !== '空守' && !/^技术解析失败/.test(String(last.target))) ? last.target : null;"),
    `${file}: 私密信息块仍会输出"今晚不能再守空守"`,
  );
  assert.match(src, /今晚【没有】连守限制/, `${file}: 空守之后没有明确说明无限制`);
}

// ── 12. 时点必须写进记录，不能靠重建时猜 ────────────────────────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(
    src.includes("S.history.push({round:S.round, phase:S.phase, name:'【系统技术说明】', text:techText});"),
    `${file}: 【系统技术说明】仍不带 round，会被按当前轮次重新标注`,
  );
  // 死者名单说时间轴的话：第2回日 → 第2天白天
  assert.ok(src.includes("[第${x.deathRound}${x.deathPhase==='night'?'夜':'天白天'}·${causeText}]"), `${file}: 死者名单仍用"第N回日"`);
  assert.ok(!src.includes("[第${x.deathRound}回${x.deathPhase==='night'?'夜':'日'}"), `${file}: 旧的"第N回日"词汇仍在`);
}

// ── 13. 竞选：最有说服力的一轮此前没有时序校验 ───────────────────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(src.includes("'最终陈词', {enforceNightChronology:true});"), `${file}: 最终陈词仍没有时序校验`);
  assert.match(src, /第' \+ S\.round \+ '天·警长最终陈词/, `${file}: 最终陈词没有天数`);
  assert.ok(src.includes("'竞选', {enforceNightChronology:true});"), `${file}: 竞选PK追加发言仍没有时序校验`);
  // 无人参选时被随机抓上台的人，不能被记录成主动上警
  assert.ok(src.includes('let _forcedCandidate = null;'), `${file}: 没有标记随机指定的候选人`);
  assert.ok(src.includes('forcedCandidate:_forcedCandidate,'), `${file}: 记录里没有带上随机指定标记`);
  assert.match(src, /并没有主动上警，绝对不能据此推断他的身份或动机/, `${file}: 没有说明随机指定不代表动机`);
}

// ── 14. 一次性夜间效果必须带夜数，否则会累积成好几条同样"今晚"的锁 ─────────────
for (const file of FILES) {
  const src = read(file);
  assert.match(src, /仅第'\+S\.round\+'夜有效、仅一发，天亮后已经重置/, `${file}: 蚀时狼妃的锁仍写成无日期的"今晚"`);
  assert.match(src, /【圣域·私密】第\$\{S\.round\}夜/, `${file}: 净魂师圣域仍无日期`);
  assert.match(src, /【神秘馈赠·第'\+S\.round\+'夜】/, `${file}: 神秘馈赠仍无日期`);
  assert.match(src, /【封技能·私密】第'\+S\.round\+'夜/, `${file}: 自创封技仍无日期`);
  assert.ok(!src.includes("'【反弹·私密】你今晚锁定了'"), `${file}: 旧的无日期反弹锁仍在`);
}

// ── 15. 硬事实速查表：时间轴的严格子集，只保留系统结算 ──────────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(
    src.includes("const _hardFactLines = _timelineLines.filter(l => !l.includes('·只是提议/声称]'));"),
    `${file}: 没有生成只含系统结算的硬事实子集`,
  );
  assert.ok(src.includes('${hist||\'暂无\'}${hardFactDigest}${langOutBlock}'), `${file}: 硬事实速查表没有接进提示词`);
  assert.match(src, /本表是上方时间轴的严格子集，不是新信息/, `${file}: 速查表没有声明自己不是新信息`);

  // 过滤规则必须真的能把发言行剔掉、把系统行留下
  const keep = [
    '[E001][开局·发牌][已发生·系统事实] 本局开始',
    '[E004][第1天·天亮公布][已发生·系统事实] P3出局',
    '[E009][第2天·白天][系统自动取消] P3已在第2天白天死亡',
    '[E010][第2天·白天][当前边界] 时间轴到此为止',
  ];
  const drop = [
    '[E002][第1天·警长竞选][公开发言·只是提议/声称] P1：我是预言家',
    '[E003][第1夜][狼队私密发言·只是提议/声称] P7：刀P2',
    '[E005][第1天·白天][公开发言·遗言·只是提议/声称] P3：我点P7',
  ];
  const filt = (l) => !l.includes('·只是提议/声称]');
  for (const l of keep) assert.ok(filt(l), `${file}: 硬事实过滤误删了系统行 → ${l}`);
  for (const l of drop) assert.ok(!filt(l), `${file}: 硬事实过滤漏掉了发言行 → ${l}`);
}

console.log('API-path integrity: memory window, private night records, single-source intel, sheriff chronology, dated one-shots and hard-fact digest passed');

// ── 16. Anthropic 原生思考：不能丢块，也不能让审议前言混进公开发言 ──────────────
// Claude 开思考后，真正的推理走 thinking 块。此前这条路径只取【第一个】text 块、
// 完全忽略 thinking 块，于是：推理被丢弃（思考栏空白、无法带进下一轮）、后续 text 块
// 里的 <game>/<action> 被截掉、模型不打标签时整段审议直接进了公开发言。
for (const file of FILES) {
  const src = read(file);

  // 引擎侧：取全部 text 块 + 交出 thinking 块
  assert.ok(src.includes("const _anthBlocks = Array.isArray(data.content) ? data.content : [];"), `${file}: Anthropic 响应没有按块解析`);
  assert.match(src, /_anthBlocks\.filter\(b => b && b\.type === 'text'\)/, `${file}: 仍然只取第一个 text 块`);
  assert.ok(!src.includes("data.content?.find(b => b.type==='text')?.text"), `${file}: 旧的"只取第一个 text 块"仍在`);
  assert.match(src, /_anthBlocks\.filter\(b => b && b\.type === 'thinking'\)/, `${file}: Anthropic 的 thinking 块仍被丢弃`);
  assert.ok(
    src.includes("if (_anthThought) opts._nativeThinking = _anthThought; else delete opts._nativeThinking;"),
    `${file}: 原生思考没有交给解析器，或重试之间会残留上一次的思考`,
  );

  // 解析器侧：段落级剥离审议前言
  const a = src.indexOf('function parseAI(c, opts)');
  const b = src.indexOf('// ★ 从 thinking 抢救发言', a);
  assert.ok(a >= 0 && b > a, `${file}: parseAI 无法隔离`);
  const sb = { console };
  vm.runInNewContext(`${src.slice(a, b)}\nthis.parseAI = parseAI;`, sb, { filename: file });

  // 审议前言 + 正式发言 → 只留正式发言
  const leaked = sb.parseAI('好的，我需要分析一下。P5昨天说验了P3是好人，但今天P3自己也跳了预言家。我的发言应该点出这个矛盾。\n\n各位，P5和P3的预言家对跳，我认为P3更像悍跳，理由是他的警徽流前后不一致。');
  assert.equal(
    leaked.game,
    '各位，P5和P3的预言家对跳，我认为P3更像悍跳，理由是他的警徽流前后不一致。',
    `${file}: 审议前言仍然混在公开发言里`,
  );
  assert.equal(leaked._monologueStripped, true, `${file}: 剥离没有被标记`);

  // 整段都是审议 → 判定为未产出发言，交给上层重试，而不是硬凑一句发出去
  const allThink = sb.parseAI('我需要先分析一下当前局势。P3和P5对跳。\n\n那么我的发言应该围绕警徽流展开，先不表态。');
  assert.equal(allThink._isLeak, true, `${file}: 整段审议没有被判定为泄漏`);
  assert.equal(allThink.game, '', `${file}: 整段审议不该产出发言`);

  // 反向保护①：打了 <game> 标签的正常发言，即使含"我需要分析一下"也不能被剪
  const tagged = sb.parseAI('<thinking>我怀疑P3</thinking><game>我需要分析一下大家的票型，P3昨天的警徽流我不认可，我投P3。</game><action>None</action>');
  assert.equal(tagged.game, '我需要分析一下大家的票型，P3昨天的警徽流我不认可，我投P3。', `${file}: 带标签的正常发言被误剪`);

  // 反向保护②：没打标签但整段就是正常发言，多段也不能被剪
  const bare = sb.parseAI('各位，我今天的判断是P3有问题。他昨天的警徽流和今天说的对不上。\n\n所以我这一票投P3，希望P7能解释一下他为什么跟票。');
  assert.match(bare.game, /^各位，我今天的判断是P3有问题/, `${file}: 无标签的正常多段发言被误剪`);
  assert.match(bare.game, /希望P7能解释一下他为什么跟票/, `${file}: 无标签发言的后半段被吃掉`);
}

console.log('Anthropic native thinking: block harvesting and deliberation-prefix stripping passed');
