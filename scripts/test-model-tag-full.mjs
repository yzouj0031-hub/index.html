// 「完整模型名」标签回归测试：
//   品牌简称说不出档位（Opus 和 Sonnet 都显示 Claude、GPT-5 和 4o 都显示 GPT），
//   开关打开后标签要显示整理过的完整模型名，且不影响任何用于请求的 model 字段。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const CASES = [
  ['claude-opus-4-5-20251101', 'Claude Opus 4.5'],   // 日期戳去掉、连续数字合并
  ['claude-sonnet-5', 'Claude Sonnet 5'],
  ['gpt-5.2', 'GPT 5.2'],
  ['gpt-4o', 'GPT 4o'],
  ['openai/o3-mini', 'O3 Mini'],                      // 提供方路径前缀去掉
  ['gemini-3-pro-preview', 'Gemini 3 Pro Preview'],
  ['deepseek-r1', 'DeepSeek R1'],
  ['us.anthropic.claude-opus-4-20250514-v1:0', 'Claude Opus 4'], // bedrock 区域与版本尾巴
  ['[代理]glm-4.6', 'GLM 4.6'],                        // 自定义渠道前缀
  ['qwen3-max', 'Qwen 3 Max'],                        // 品牌与版本号粘连
  ['meta-llama/llama-3.3-70b-instruct:free', 'Llama 3.3 70b Instruct'],
  ['weird_custom_model', 'Weird Custom Model'],
  ['', ''],
  [null, ''],
  [undefined, ''],
];

for (const file of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(new URL(file, root), 'utf8');
  const start = html.indexOf('const MODEL_WORD_CASE');
  const end = html.indexOf('function getModelTag(modelStr)', start);
  assert.ok(start >= 0 && end > start, `${file}: formatFullModelName 未找到`);
  const format = vm.runInNewContext(`${html.slice(start, end)}; formatFullModelName`, {}, {filename: file});
  for (const [input, expected] of CASES) {
    assert.equal(format(input), expected, `${file}: ${JSON.stringify(input)} 应格式化为 ${JSON.stringify(expected)}`);
  }

  // 开关接线：默认关闭（保持旧的品牌简称行为），打开才换成完整名
  assert.ok(html.includes('id="m-modeltag-full"'), `${file}: 缺少完整模型名开关`);
  // 默认关闭（保持旧的品牌简称行为）。注意 onchange 里含 this.checked，不能用宽松正则判断
  assert.ok(!/id="m-modeltag-full"\s+checked/.test(html) && !/checked\s+id="m-modeltag-full"/.test(html),
    `${file}: 完整模型名开关不应默认开启`);
  assert.ok(/id="m-modeltag"\s+checked/.test(html), `${file}: 对照——模型标签开关本应默认开启，断言方式可能失效`);
  assert.ok(html.includes("const fullEl = document.getElementById('m-modeltag-full');"), `${file}: 标签渲染未读取开关`);
  assert.ok(html.includes("const label = (fullEl && fullEl.checked && formatFullModelName(api.model)) || tag.label;"), `${file}: 未在开关打开时改用完整名`);
  // 长名要能截断，且原始 model id 仍在 title 里；标签正文必须转义
  assert.ok(html.includes('max-width:100%;overflow:hidden;text-overflow:ellipsis;'), `${file}: 标签缺少截断样式`);
  assert.ok(html.includes('title="${escapeHtml(api.model)}"'), `${file}: title 未保留原始 model id 或未转义`);
  assert.ok(html.includes('>${escapeHtml(label)}</span>'), `${file}: 标签正文未转义`);
  assert.ok(html.includes('.modeltag-slot .model-tag { margin-left: 0 !important; font-size: 0.92em !important; padding: 0 4px !important; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'), `${file}: 命牌槽位缺少截断样式`);
  // 触屏没有悬停：完整模型名在命牌上必须能折成两行，而不是单行硬截断后永久看不见
  assert.ok(html.includes('body.show-modeltag.show-modeltag-full .modeltag-slot { height: 2.5em; white-space: normal; text-overflow: clip; }'), `${file}: 完整模型名模式没有给命牌多留一行`);
  assert.ok(html.includes('-webkit-line-clamp: 2;'), `${file}: 标签缺少两行截断`);
  assert.ok(html.includes("document.body.classList.toggle('show-modeltag-full', !!(mtf && mtf.checked));"), `${file}: 未同步 show-modeltag-full 类`);
  assert.ok(html.includes("onchange=\"document.body.classList.toggle('show-modeltag-full', this.checked);"), `${file}: 开关未即时切换 show-modeltag-full 类`);
  assert.ok(html.includes('.lh { display:flex; align-items:center; flex-wrap:wrap;'), `${file}: 发言头部未允许换行，长标签会把按钮挤出屏幕`);

  // 存档往返
  assert.ok(html.includes("modeltagFull:$('m-modeltag-full')?$('m-modeltag-full').checked:false,"), `${file}: 未写入存档`);
  assert.ok(html.includes("if (d.modeltagFull !== undefined && $('m-modeltag-full')) $('m-modeltag-full').checked = !!d.modeltagFull;"), `${file}: 未从存档读取`);
}

const i18n = fs.readFileSync(new URL('i18n.js', root), 'utf8');
assert.ok(i18n.includes("'完整模型名':'Full model name',"), 'i18n 缺少完整模型名的英文');

console.log('model tag full name: formatting, toggle wiring, truncation and persistence passed');
