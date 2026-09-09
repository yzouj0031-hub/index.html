// 一局完整上帝视角复盘暴露出来的三个信息缺口的回归测试。
//
// ① 狼队开场对【每一只】狼都说"你是第一个发言"——4 狼局里 3 只被告知了假话，于是各写各的、
//    谁也接不上谁；写出来的开场"看起来一致"，这个假一致又让 uniqueTargets.size > 1 判为 false，
//    把回声轮整个跳掉，狼队一夜没有真正交流过一次。
// ② 狼盟密约的投票不是盲投：候选列表印着提案人、提示词写着"可以投自己的"、人类选项挂着
//    "（你的）"、解析失败的兜底还是投自己。实测 4 票里 3 票自投，最弱的方案赢了。
// ③ 一条被原始发言人原话推翻的指控，仍然被当成共识用完了一整天，教学层里没有任何一条管这个。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FILES = ['index.html', 'en/index.html'];
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

function slice(src, file, from, to, label) {
  const a = src.indexOf(from);
  assert.ok(a >= 0, `${file}: 找不到 ${label} 的起点`);
  const b = src.indexOf(to, a);
  assert.ok(b > a, `${file}: 找不到 ${label} 的终点`);
  return src.slice(a, b);
}

// ── ① 狼队开场：位置感知 ─────────────────────────────────────────────────────
function openingBuilder(src, file) {
  const body = slice(
    src, file,
    '      const _myIdx = speakOrder.indexOf(p);',
    '      const prompt = killBlocked ?',
    '开场位置感知代码块',
  );
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(
    `this.build = function (speakOrder, p, openingRecords) {\n${body}\n  return {priorBlock, taskBlock, idx: _myIdx};\n};`,
    ctx, { filename: `${file}:opening` },
  );
  return ctx.build;
}

for (const file of FILES) {
  const src = read(file);

  // 拼装点：两个片段都必须真的进到提示词里，否则算出来了也白算
  assert.ok(src.includes('${priorBlock}${taskBlock}'), `${file}: 开场提示词没有用上位置感知的任务描述`);
  assert.ok(
    src.includes('\n${priorBlock}请只讨论明天白天的配合：'),
    `${file}: 禁刀夜的狼队讨论仍然看不到队友原话`,
  );

  const build = openingBuilder(src, file);
  const wolves = [
    { id: 1, name: '甲', role: { name: '狼人' } },
    { id: 2, name: '乙', role: { name: '狼美人' } },
    { id: 3, name: '丙', role: { name: '狼人' } },
  ];
  const records = {
    1: { game: '我提议刀 Near，他前置位话最密。', action: 'Near' },
    2: { game: '我不同意，先刀守卫。', action: 'Gin' },
  };

  // 第一个发言的人：确实看不到任何人，保留原来的独立表述
  const first = build(wolves, wolves[0], records);
  assert.equal(first.idx, 0, `${file}: 首位序号算错`);
  assert.equal(first.priorBlock, '', `${file}: 第一个发言的人不该看到任何队友原话`);
  assert.match(first.taskBlock, /你是第一个发言/, `${file}: 首位应当保留"独立给出"的表述`);

  // 第二个发言的人：必须看到第一个人的原话，并且被明确告知自己的真实位置
  const second = build(wolves, wolves[1], records);
  assert.ok(second.priorBlock.includes('甲(狼人)'), `${file}: 后发言者看不到队友身份`);
  assert.ok(second.priorBlock.includes('我提议刀 Near'), `${file}: 后发言者看不到队友原话`);
  assert.ok(second.priorBlock.includes('Near'), `${file}: 后发言者看不到队友的提议目标`);
  assert.ok(!second.priorBlock.includes('乙'), `${file}: 队友块里混进了自己`);
  assert.match(second.taskBlock, /你是第 2 个发言/, `${file}: 第二位仍然被告知"你是第一个发言"`);
  assert.ok(!/你是第一个发言/.test(second.taskBlock), `${file}: 第二位的任务描述里仍有"第一个发言"的假话`);
  assert.match(second.taskBlock, /不同意就直接说出来/, `${file}: 没有要求后发言者明确表态`);
  assert.match(second.taskBlock, /装作一致会让这一轮被直接跳过/, `${file}: 没有说清"假装一致会跳过二轮讨论"的代价`);

  // 第三个发言的人：两条都在，且顺序就是实际发言顺序
  const third = build(wolves, wolves[2], records);
  assert.ok(third.priorBlock.indexOf('甲(狼人)') < third.priorBlock.indexOf('乙(狼美人)'), `${file}: 队友原话没有按发言顺序排`);
  assert.match(third.taskBlock, /你是第 3 个发言/, `${file}: 第三位序号算错`);

  // 空刀要显示成空刀，不能显示成"未明确"
  const emptyRec = { 1: { game: '今晚做平安夜。', action: 'None', emptyKill: true } };
  assert.match(build(wolves, wolves[1], emptyRec).priorBlock, /空刀\(今晚不刀\)/, `${file}: 空刀提议没有正确显示`);

  // 队友调用失败（没有记录）时不能崩，也不能凭空捏造一条
  assert.equal(build(wolves, wolves[1], {}).priorBlock, '', `${file}: 队友开场缺失时不该编造内容`);
  assert.match(build(wolves, wolves[1], {}).taskBlock, /你是第一个发言/, `${file}: 前面没人成功发言时应退回独立表述`);
}

// ── ② 狼盟密约：盲投 ────────────────────────────────────────────────────────
function voteCounter(src, file) {
  const body = slice(src, file, '  // 统计票数\n  const votes = {};', '\n  // 决出胜者', '投票统计代码块');
  const ctx = { Render: { devLog: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(
    `this.count = function (stratList, aliveWolves, voteResults) {\n${body}\n  return votes;\n};`,
    ctx, { filename: `${file}:votes` },
  );
  return ctx.count;
}

for (const file of FILES) {
  const src = read(file);

  // 四个"按提案人投票"的诱导必须全部消失
  for (const residue of [
    "s.proposer + '的「'",
    '（包括你自己的）',
    '（可以投自己的）',
    'you may vote for your own',
    "s.proposerId === w.id ? '（你的）'",
    "s.proposerId === w.id ? '(yours)'",
  ]) {
    assert.ok(!src.includes(residue), `${file}: 投票环节仍然在暗示"投自己的" → ${residue}`);
  }
  // 提案人只在结果弹窗里揭晓，投票前一次都不能露
  assert.ok(src.includes('const blindDisplayFor = () => shuffle(stratList.slice())'), `${file}: 候选列表没有做盲化`);
  assert.ok(src.includes('const _humanBlind = shuffle(stratList.slice());'), `${file}: 人类弹窗的候选顺序没有打乱`);
  assert.equal(
    (src.match(/blindDisplayFor\(\)/g) || []).length, 2,
    `${file}: 两处 AI 投票（并发投票 / "让 AI 替我决定"）应当都走盲化列表`,
  );
  assert.match(src, /只比较方案本身：条件分支是否完整/, `${file}: 缺少"按什么标准比方案"的说明`);

  // 盲化后的列表不能泄露任何提案人名字
  const ctx = {};
  vm.createContext(ctx);
  const decl = slice(src, file, '  const blindDisplayFor = ', '\n  const voteResults = {};', '盲化显示函数');
  vm.runInContext(
    `const shuffle = a => a.slice().reverse();
     const stratList = [
       {name:'冷焰交叉', content:'A 方案内容', proposer:'安室透', proposerId:3},
       {name:'暗夜执笔', content:'B 方案内容', proposer:'Light Yagami', proposerId:10},
     ];
     ${decl}
     this.display = blindDisplayFor();
     this.note = BLIND_NOTE;`,
    ctx, { filename: `${file}:blind` },
  );
  for (const name of ['安室透', 'Light Yagami']) {
    assert.ok(!ctx.display.includes(name), `${file}: 盲化后的候选列表仍然印着提案人 ${name}`);
  }
  for (const plan of ['冷焰交叉', '暗夜执笔', 'A 方案内容', 'B 方案内容']) {
    assert.ok(ctx.display.includes(plan), `${file}: 盲化把方案本身也弄丢了 → ${plan}`);
  }
  assert.match(ctx.note, /不要去猜是哪条/, `${file}: 盲投说明没有劝阻"猜哪条是自己的"`);

  // 兜底不再自动投给自己
  const count = voteCounter(src, file);
  const stratList = [
    { name: '冷焰交叉', content: 'A', proposer: '安室透', proposerId: 3 },
    { name: '暗夜执笔', content: 'B', proposer: 'Light', proposerId: 10 },
  ];
  const wolves = [{ id: 3, name: '安室透' }, { id: 10, name: 'Light' }];

  // 场景一：两只狼都没投出有效票 → 全部弃权，一票都不该凭空出现
  const none = JSON.parse(JSON.stringify(count(stratList, wolves, { 3: null, 10: null })));
  assert.deepEqual(none, { 冷焰交叉: [], 暗夜执笔: [] }, `${file}: 投票失败仍然被兜底成了自投票`);

  // 场景二：一只狼的 action 对不上任何方案名 → 记弃权，而不是落回自己的提案
  const bad = JSON.parse(JSON.stringify(count(stratList, wolves, {
    3: { action: '方案三' }, 10: { action: '冷焰交叉' },
  })));
  assert.deepEqual(bad, { 冷焰交叉: ['Light'], 暗夜执笔: [] }, `${file}: 无法匹配的票没有记成弃权`);

  // 场景三：正常投票照旧生效，包含互投
  const ok = JSON.parse(JSON.stringify(count(stratList, wolves, {
    3: { action: '暗夜执笔' }, 10: { action: '冷焰交叉' },
  })));
  assert.deepEqual(ok, { 冷焰交叉: ['Light'], 暗夜执笔: ['安室透'] }, `${file}: 正常投票被改坏了`);
}

// ── ③ 教学：被原话推翻的指控 ────────────────────────────────────────────────
for (const file of FILES) {
  const src = read(file);
  const core = slice(src, file, 'const WB_CORE_COMPACT = `', '\n\nconst WB_RULES_COMPACT', 'WB_CORE_COMPACT');
  assert.ok(core.includes('【被原话推翻的指控，不能继续当共识用】'), `${file}: 新教学条目不在核心教学层里`);
  for (const key of [
    '转述不是证据，原话才是',
    '这条指控的证据等级是零',
    '第一个把原话说变形的人',
    '这叫结论先行',
    '只是复述次数变多，证据强度仍然是零',
  ]) {
    assert.ok(core.includes(key), `${file}: 教学条目缺少关键约束 → ${key}`);
  }
  // 必须挨着"防止集体误推"那一段，别飘到不相干的地方
  assert.ok(
    core.indexOf('【防止集体误推】') < core.indexOf('【被原话推翻的指控'),
    `${file}: 新条目的位置不对`,
  );
}

console.log('wolf pact blind: position-aware openings, blinded strategy vote (no self-vote fallback) and refuted-claim teaching passed');
