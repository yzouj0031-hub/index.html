// OpenAI 兼容路径上"思考强度"旋钮的覆盖面测试。
//
// 背景：这个旋钮是按【模型名】匹配家族的，匹配不上就一个参数都不发——静默失效，
// 界面上看不出来。此前有三个缺口：
//   ① Claude 完全没有分支（旋钮对 Claude 全程空转）；
//   ② Grok / DeepSeek-V4 / 通用 -thinking 后缀：flag 算出来了，却根本没传进
//      applyCompatibleReasoningControl，只拿到了 max_tokens 保护；
//   ③ 家族判定在主路径和"测试连接"按钮里各写了一份，而且两份不一致。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import RC from '../reasoning-control.js';

const FILES = ['index.html', 'en/index.html'];

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
}

function load(src, file) {
  const a = src.indexOf('// ★ 思考模型家族识别');
  const b = src.indexOf('\nfunction removeCompatibleReasoningControl', a);
  assert.ok(a >= 0 && b > a, `${file}: 家族识别/参数注入代码块未找到`);
  const ctx = { ReasoningControl: RC };
  vm.createContext(ctx);
  vm.runInContext(
    `${src.slice(a, b)};
     this.detect = detectThinkingFlags;
     this.apply = applyCompatibleReasoningControl;
     this.mark = markReasoningRejected;
     this.rejected = reasoningRejectedFor;`,
    ctx, { filename: file },
  );
  return ctx;
}

const URL_A = 'https://relay-a.example.com/v1';
const URL_B = 'https://relay-b.example.com/v1';

for (const file of FILES) {
  const src = read(file);

  // ── 1. 唯一来源：家族判定不能再有第二份 ─────────────────────────────────────
  assert.equal(
    (src.match(/function detectThinkingFlags\(/g) || []).length, 1,
    `${file}: detectThinkingFlags 应当只定义一次`,
  );
  assert.equal(
    (src.match(/const isGemini3Compat = mn\.includes\('gemini-3'\)/g) || []).length, 1,
    `${file}: 家族判定仍然存在重复的内联副本`,
  );
  assert.ok(
    src.includes('applyCompatibleReasoningControl(b, m, testReasoning, detectThinkingFlags(m, u));'),
    `${file}: "测试连接"没有复用同一套家族判定`,
  );
  assert.ok(src.includes('hasGenericSuffix, endpoint: useApi.url'), `${file}: 主路径没有把新家族和端点传进去`);
  assert.ok(
    src.includes('markReasoningRejected(useApi.url, useApi.model);'),
    `${file}: 400 之后没有记住"这个端点不接受思考参数"`,
  );
  assert.ok(
    src.includes('const reasoningCtl = reasoningRejectedFor(useApi.url, useApi.model)'),
    `${file}: 调用点没有先查"这个端点是不是已经拒绝过"`,
  );

  const ctx = load(src, file);
  const paramsFor = (model, mode = 'high', url = URL_A) => {
    const body = {};
    const r = ctx.apply(body, model, { effective: mode, stage: 'normal' }, ctx.detect(model, url));
    // vm 上下文里造出来的对象原型不同，deepStrictEqual 会误判——统一过一次 JSON
    return r.applied ? JSON.parse(JSON.stringify(body)) : null;
  };

  // ── 2. 覆盖面：这些模型都必须真的收到参数 ───────────────────────────────────
  const EXPECT = [
    ['claude-opus-5', { reasoning_effort: 'high' }],
    ['claude-sonnet-5', { reasoning_effort: 'high' }],
    ['anthropic/claude-opus-5', { reasoning_effort: 'high' }],
    ['gpt-5.1', { reasoning_effort: 'high' }],
    ['o3-mini', { reasoning_effort: 'high' }],
    ['gemini-3-pro', { reasoning_effort: 'high' }],
    ['grok-4-fast-reasoning', { reasoning_effort: 'high' }],
    ['deepseek-v4-pro', { reasoning_effort: 'high' }],
    ['some-model-thinking', { reasoning_effort: 'high' }],
    ['glm-4.6', { enable_thinking: true }],
    ['kimi-k2', { chat_template_kwargs: { thinking: true }, thinking_budget: 8192 }],
  ];
  for (const [model, expected] of EXPECT) {
    const got = paramsFor(model);
    assert.ok(got, `${file}: 模型 ${model} 的思考强度旋钮是空转的（一个参数都没发）`);
    assert.deepEqual(got, expected, `${file}: 模型 ${model} 发出的参数不对`);
  }

  // ── 3. 不能误伤：没有思考档位的模型不该被硬塞参数 ────────────────────────────
  for (const model of ['llama-3-70b', 'deepseek-r1', 'deepseek-reasoner', 'gpt-4o', 'qwen3-32b']) {
    assert.equal(paramsFor(model), null, `${file}: 模型 ${model} 不该被塞思考参数`);
  }
  // auto 档位表示"交给模型自己决定"，任何模型都不发
  assert.equal(paramsFor('claude-opus-5', 'auto'), null, `${file}: auto 档位不该发参数`);

  // ── 4. 档位收敛：兼容端点上多数网关只认三档 ─────────────────────────────────
  const effortOf = (mode) => (paramsFor('claude-opus-5', mode) || {}).reasoning_effort;
  assert.equal(effortOf('off'), 'low', `${file}: off 应降到 low（兼容端点没有可靠的完全关思考）`);
  assert.equal(effortOf('low'), 'low', `${file}: low 档位串错`);
  assert.equal(effortOf('medium'), 'medium', `${file}: medium 档位串错`);
  assert.equal(effortOf('high'), 'high', `${file}: high 档位串错`);
  assert.equal(effortOf('xhigh'), 'high', `${file}: xhigh 应降到 high`);

  // ── 5. 端点拒绝记忆：撞过一次 400 就别再撞 ──────────────────────────────────
  assert.equal(ctx.rejected(URL_B, 'claude-opus-5'), false, `${file}: 记忆初始应为空`);
  ctx.mark(URL_B, 'claude-opus-5');
  assert.equal(ctx.rejected(URL_B, 'claude-opus-5'), true, `${file}: 拒绝没有被记住`);
  // 记忆必须按 (端点, 模型) 隔离，不能一竿子打死
  assert.equal(ctx.rejected(URL_A, 'claude-opus-5'), false, `${file}: 记忆误伤了另一个端点`);
  assert.equal(ctx.rejected(URL_B, 'claude-sonnet-5'), false, `${file}: 记忆误伤了同端点的另一个模型`);
  // 大小写不该造成漏记
  assert.equal(ctx.rejected(URL_B.toUpperCase(), 'CLAUDE-OPUS-5'), true, `${file}: 记忆对大小写不稳定`);
}

console.log('reasoning coverage: single-source family detection, Claude/Grok/DeepSeek-V4/generic wired, effort clamping and per-endpoint rejection memo passed');
