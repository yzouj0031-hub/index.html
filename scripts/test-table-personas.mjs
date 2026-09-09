// 牌桌人格表的回归测试。
//
// 为什么需要这个测试：上一版用的是 MBTI 表，16 型里有 8 型的 neg 直接是推理能力或独立
// 判断的自我否定（"难以进行深入的逻辑分析""缺乏独立判断"）。12 人局平均有 6 个人被发到
// 这类描述，等于开局就给一半玩家写好了送人头的剧本。换表本身容易，难的是【以后加人格时
// 不再滑回去】——所以把"代价只能是打法代价，不能是能力短板"这条规则钉在测试里。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const FILES = ['index.html', 'en/index.html'];

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

function loadTable(src, file) {
  const a = src.indexOf('const TABLE_PERSONAS = {');
  const b = src.indexOf('\n};', a);
  assert.ok(a >= 0 && b > a, `${file}: TABLE_PERSONAS 未找到`);
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(`${src.slice(a, b + 3)}; this.T = TABLE_PERSONAS;`, ctx, { filename: file });
  return ctx.T;
}

// ── 能力否定词表：只针对"我不擅长思考"这一类，不拦一般的负面描述 ────────────────
// 打法代价（"话说太满""开口晚""得罪人"）是想要的，能力短板（"难以进行深入的逻辑分析"）不是。
const ABILITY_NEGATION = [
  /难以进行?深入/,
  /难以.{0,6}(分析|推理|判断|思考)/,
  /不擅长/,
  /不会.{0,4}(分析|推理|思考)/,
  /缺乏.{0,4}(独立判断|判断力|深思|逻辑)/,
  /不经深思/,
  /容易被煽动/,
  /(逻辑|推理|分析|思维).{0,4}(差|弱|不行|不足)/,
  /(分析|推理|思考|判断).{0,4}能力.{0,6}(差|弱|不足|欠缺)/,
  /智力|笨|蠢|愚钝/,
];

const flagged = (text) => ABILITY_NEGATION.filter((re) => re.test(String(text || '')));

// ── 0. 先自检：这套规则必须真的能抓住旧 MBTI 表里的那些描述 ────────────────────
// 否则规则可能因为写得太松而变成空转，测试通过也说明不了任何事。
{
  const OLD_HARMFUL = [
    '不够严肃发言容易浮夸，难以进行深入的逻辑分析',   // ESFP
    '过于在意社交压力容易随大流，缺乏独立判断',       // ESFJ
    '过于情绪化容易被煽动，在压力下犹豫不决',         // INFP
    '冲动鲁莽不经深思就行动，好胜心强',               // ESTP
  ];
  for (const s of OLD_HARMFUL) {
    assert.ok(flagged(s).length > 0, `能力否定词表失效：旧表描述「${s}」本应被拦下`);
  }
  const OLD_HARMLESS = [
    '话说太满，后面拿到新证据改口时容易被人揪着"你前后不一"。',
    '得罪人，容易被当成攻击性强的狼。',
    '开口晚容易被当成在混，也可能错过带节奏的窗口。',
  ];
  for (const s of OLD_HARMLESS) {
    assert.equal(flagged(s).length, 0, `能力否定词表过严：打法代价「${s}」不该被拦`);
  }
}

// ── 1. 表本身 ────────────────────────────────────────────────────────────────
for (const file of FILES) {
  const src = read(file);
  const T = loadTable(src, file);
  const keys = Object.keys(T);

  assert.ok(keys.length >= 16, `${file}: 人格条数 ${keys.length} 太少，12 人局会出现明显的重复感`);

  for (const k of keys) {
    const e = T[k];
    assert.equal(e.name, k, `${file}: 人格 ${k} 的 name 与键不一致`);
    for (const f of ['emoji', 'desc', 'habit', 'cost']) {
      assert.ok(e[f] && String(e[f]).trim(), `${file}: 人格 ${k} 缺少 ${f}`);
    }
    // 卡片徽章（.mbtitag）直接显示这个键，太长会撑破
    assert.ok(k.length <= 4, `${file}: 人格名「${k}」超过 4 字，卡片徽章放不下`);

    // ★ 核心规则：任何字段都不能写成能力短板
    for (const f of ['desc', 'habit', 'cost']) {
      const hits = flagged(e[f]);
      assert.equal(
        hits.length, 0,
        `${file}: 人格「${k}」的 ${f} 写成了能力短板而不是打法代价 → ${JSON.stringify(e[f])}（命中 ${hits.map((r) => r.source).join(' / ')}）`,
      );
    }
  }

  // 旧表必须彻底移除，不能两套并存
  assert.ok(!src.includes('MBTI_ALL'), `${file}: 旧的 MBTI_ALL 仍有残留`);
  for (const residue of ["INTJ:{", "desc:'建筑师", "neg:'", "pos:'"]) {
    assert.ok(!src.includes(residue), `${file}: 旧 MBTI 表的数据仍有残留 → ${residue}`);
  }
}

// ── 2. 注入块：必须带边界护栏，且"性情"开关要真的生效 ──────────────────────────
for (const file of FILES) {
  const src = read(file);

  // 开关此前只控制卡片显示，不控制注入
  assert.ok(
    src.includes("const personaTagOn = !$('m-mbti') || $('m-mbti').checked;"),
    `${file}: 「性情」开关仍然不控制人格注入`,
  );
  assert.ok(
    src.includes('const mbtiBlock = (!S.pureAI && p.mbti && !cosplayOn && personaTagOn) ?'),
    `${file}: 人格注入没有接上开关`,
  );

  // 三个字段都要用上，不能只用 desc
  for (const f of ['${p.mbti.desc}', '${p.mbti.habit}', '${p.mbti.cost}']) {
    assert.ok(src.includes(f), `${file}: 人格注入没有使用 ${f}`);
  }

  // 边界护栏：风格不得侵蚀推理
  assert.match(src, /风格只决定你【怎么说话】和【什么时候下注】，不决定你【算得多清楚】/, `${file}: 缺少风格/能力的边界声明`);
  assert.match(src, /这是打法上的代价，不是能力上的短板/, `${file}: 代价没有被明确限定为打法代价`);
  assert.match(src, /绝不要因为「我是这个风格」就故意少想一步、故意看漏证据/, `${file}: 缺少"不要故意打差"的硬约束`);
}

// ── 3. 旧存档兼容：MBTI 键在新表里查不到，不能让人格整个消失 ────────────────────
for (const file of FILES) {
  const src = read(file);
  assert.ok(
    src.includes("const mbtiKey = (p.mbtiKey && TABLE_PERSONAS[p.mbtiKey]) ? p.mbtiKey : ks[p.id % ks.length];"),
    `${file}: 旧存档里的 MBTI 键没有兜底，读档后人格会整个丢失`,
  );
  assert.ok(src.includes('role, mbti: TABLE_PERSONAS[mbtiKey] || null, mbtiKey,'), `${file}: 读档没有从新表取人格`);
  assert.ok(
    src.includes('S.players.forEach((p,i) => { const k=ks[i%ks.length]; p.mbti=TABLE_PERSONAS[k]; p.mbtiKey=k; });'),
    `${file}: 开局分配没有改用新表`,
  );

  // 徽章宽度保护：中文名比 4 位英文缩写宽
  assert.match(src, /\.mbtitag \{[^}]*text-overflow: ellipsis/, `${file}: 人格徽章缺少溢出保护`);
}

const total = Object.keys(loadTable(read('index.html'), 'index.html')).length;
console.log(`table personas: ${total} entries, ability-negation guard active, switch wired, legacy saves covered`);
