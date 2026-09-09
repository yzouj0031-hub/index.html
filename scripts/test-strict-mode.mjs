// 严格模式（真人在场防作弊）+ 预言家查验标记的回归测试。
// 关键区别：既有「匿名」只用 CSS 盖住私密节点，内容仍留在 DOM 里——把匿名关掉或者
// 打开开发者工具就全看见了。严格模式必须做到根本不把这些节点放进页面。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// vm 里造出来的对象跨 realm，不能用 deepEqual 直接比（原型不同），按字段比
const sameMark = (got, text, cls) => !!got && got.text === text && got.cls === cls;

const root = new URL('../', import.meta.url);

function loadHelpers(html, file) {
  const start = html.indexOf('function humanControlledPlayers()');
  const end = html.indexOf('let _activeNightLogVisibility = null;', start);
  assert.ok(start >= 0 && end > start, `${file}: 严格模式辅助函数未找到`);
  return html.slice(start, end);
}

for (const file of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(new URL(file, root), 'utf8');
  const src = loadHelpers(html, file);

  const mkCtx = (S, checked) => {
    const ctx = {
      S,
      document: { getElementById: id => (id === 'm-strict' ? {checked, closest: () => null} : null) },
      $: () => null,
      perspectiveLogNodes: () => [],
      logVisibleToPerspective: () => true,
    };
    vm.createContext(ctx);
    vm.runInContext(src + '\nthis.strictModeOn = strictModeOn; this.humanSeerMark = humanSeerMark; this.humanControlledPlayers = humanControlledPlayers;', ctx, {filename: file});
    return ctx;
  };

  const seer = {id: 2, name: '安室透', role: {id: 'seer'}};
  const other = {id: 5, name: '白马探', role: {id: 'villager'}};
  const base = () => ({players: [{id:0,name:'A',role:{id:'villager'}}, {id:1,name:'B',role:{id:'werewolf'}}, seer, {id:3,name:'D',role:{id:'villager'}}, {id:4,name:'E',role:{id:'witch'}}, other],
    playerId: 2, pureAI: false, gameOver: false, seerLog: {}});

  // ── 开关语义 ──
  assert.equal(mkCtx(base(), true).strictModeOn(), true, `${file}: 真人在场且开关打开时应生效`);
  assert.equal(mkCtx(base(), false).strictModeOn(), false, `${file}: 开关关闭时不应生效`);
  assert.equal(mkCtx({...base(), pureAI: true}, true).strictModeOn(), false, `${file}: 纯AI观战不应受严格模式影响`);
  assert.equal(mkCtx({...base(), gameOver: true}, true).strictModeOn(), false, `${file}: 终局后应自动解除，身份要能翻牌`);
  assert.equal(mkCtx({...base(), playerId: -1}, true).strictModeOn(), false, `${file}: 没有真人在场时不生效`);
  // 导演模式下按导演控制的席位算
  const dir = mkCtx({...base(), playerId: -1, directorMode: true, directorIds: [1]}, true);
  assert.equal(dir.strictModeOn(), true, `${file}: 导演模式应按其控制的席位生效`);
  assert.equal(dir.humanControlledPlayers().map(p => p.id).join(','), '1', `${file}: 导演视角席位不对`);

  // ── 预言家查验标记：只读真人自己的记录 ──
  const S1 = base();
  S1.seerLog = {1: {target: '白马探', actualTarget: '白马探', reflected: false, result: '🐺狼人显示'}};
  const c1 = mkCtx(S1, true);
  assert.ok(sameMark(c1.humanSeerMark(other), '坏人', 'seer-bad'), `${file}: 查杀应标坏人`);
  assert.equal(c1.humanSeerMark(seer), null, `${file}: 不给自己标查验结果`);

  const S2 = base();
  S2.seerLog = {1: {target: '白马探', actualTarget: '白马探', reflected: false, result: '✅好人显示'}};
  assert.ok(sameMark(mkCtx(S2, true).humanSeerMark(other), '好人', 'seer-good'), `${file}: 金水应标好人`);

  // 被反弹那次原目标没被验到，不能出结论
  const S3 = base();
  S3.seerLog = {1: {target: '白马探', actualTarget: '白马探', reflected: true, result: '被反弹，原目标未验证'}};
  assert.equal(mkCtx(S3, true).humanSeerMark(other), null, `${file}: 被反弹的查验不应给出结论`);

  // 真人不是预言家时，一个标记都不该出现（别人报的查验只是声称）
  const S4 = base();
  S4.playerId = 0;
  S4.seerLog = {1: {target: '白马探', actualTarget: '白马探', reflected: false, result: '🐺狼人显示'}};
  assert.equal(mkCtx(S4, true).humanSeerMark(other), null, `${file}: 真人不是预言家时不应看到查验标记`);

  // 标记与严格模式无关，关掉开关照样是自己的合法信息
  assert.ok(sameMark(mkCtx(S1, false).humanSeerMark(other), '坏人', 'seer-bad'), `${file}: 查验标记不应依赖严格模式开关`);

  // ── 接线标记 ──
  for (const marker of [
    'id="m-strict"',
    'syncStrictModeControl();',
    'applyStrictLogGate();',
    "el.disabled = running;",                                  // 开局后锁死开关
    "node.querySelectorAll('.log-thought').forEach(t => {",     // 剥掉别人的内心思考
    'folded._hidden = folded._hidden.filter(n => !dropped.has(n));', // 折叠区也要清
    '<div class="seer-tag" id="stg-${i}"></div>',
    "strict ? (p.isPlayer || canSee(p) || sd)",                 // 命牌不再吃「匿名」这个可关的开关
    "strict:$('m-strict')?$('m-strict').checked:false,",
  ]) {
    assert.ok(html.includes(marker), `${file}: 缺少接线 ${marker}`);
  }
  // 默认关闭：不能悄悄改变现有玩家的体验
  assert.ok(!/id="m-strict"\s+checked/.test(html), `${file}: 严格模式不应默认开启`);
}

const i18n = fs.readFileSync(new URL('i18n.js', root), 'utf8');
assert.ok(i18n.includes("'严格模式':'Strict mode',"), 'i18n 缺少严格模式的英文');

console.log('strict mode: gating semantics, seer check tags, toggle lock and wiring passed');
