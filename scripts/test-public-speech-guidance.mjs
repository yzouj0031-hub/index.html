import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import './test-private-plan-boundary.mjs';

for (const file of ['index.html', 'en/index.html']) {
  const source = fs.readFileSync(file, 'utf8');

  assert.doesNotMatch(source, /普通轮次可以简洁/, `${file}: ordinary public speech is still allowed to collapse into a short reply`);
  assert.doesNotMatch(source, /允许：简短发言、跟票/, `${file}: general style guide still rewards short follow-votes`);
  assert.doesNotMatch(source, /可以很短，可以不完整/, `${file}: structured output template still permits incomplete public speech`);
  assert.match(source, /公开发言完整度·最高优先级/, `${file}: free-output completeness rule missing`);
  assert.match(source, /说清本轮目的/, `${file}: public speech no longer asks for a purposeful contribution`);
  assert.match(source, /不必硬造狼点/, `${file}: public speech still forces an accusation when evidence is absent`);
  assert.doesNotMatch(source, /即使没有新信息，也要评价当前最大争议/, `${file}: old forced-controversy checklist remains active`);
  assert.match(source, /公开讨论的表达底线/, `${file}: structured-output completeness rule missing`);
  assert.match(source, /隐死亡的自然表达·不要复读规则/, `${file}: hidden-role disclaimer repetition guard missing`);
  assert.match(source, /暂认、偏信、待验、目前不信/, `${file}: actionable identity confidence vocabulary missing`);
  assert.match(source, /身份声明同标尺·硬约束/, `${file}: symmetric role-claim evidence rule missing`);
  assert.match(source, /多人平民板不存在“无人对跳即坐实平民”/, `${file}: villager claims can still receive automatic certification`);
  assert.match(source, /只禁止默认接平民却单独惩罚暂认神职/, `${file}: villager/god claim double-standard correction missing`);
  assert.match(source, /否则不要主动说“死者身份不公开”或“跳了不等于真神”/, `${file}: public speech can still recite hidden-role disclaimers`);
  assert.doesNotMatch(source, /\$\{hdeath\?'死者身份不公开。'/, `${file}: blunt hidden-death reminder is still injected beside every prompt`);
  assert.doesNotMatch(source, /\? `💀 \$\{r\.name\} 出局 — \$\{deathDesc\}\$\{voteSuffix\}（死者身份不公开）`/, `${file}: exported battle report repeats hidden identity on every death`);
  assert.match(source, /const minSpeechChars = Math\.max\(30, Number\(opts\.minSpeechChars\) \|\| 80\)/, `${file}: public speech minimum missing`);
  assert.match(source, /流程已暂停，不会自动跳过/, `${file}: unrecoverable public speech does not pause the game`);
  assert.match(source, /切换模型 \/ API 后重试/, `${file}: speech failure dialog cannot switch player model`);
  assert.match(source, /使用当前模型重试/, `${file}: speech failure dialog cannot retry the current model`);
  assert.match(source, /确认跳过本次发言/, `${file}: technical skip is not an explicit user decision`);
  assert.match(source, /r = results\[j\] = await recoverTechnicalSpeech\(p, r\)/, `${file}: technical failures still bypass the recovery dialog`);
  assert.match(source, /系统重写·公开发言过短/, `${file}: short public speech is not automatically expanded`);
  assert.match(source, /重新写成120至300字的正式发言/, `${file}: expansion request lacks a useful target`);
  assert.match(source, /不得少于80字。投票前最后发言要把核心论据说透/, `${file}: second-round speech still has a weaker floor`);
  assert.match(source, /const isFreeOutput = baseFreeOutput && !opts\.wolfOnly && !opts\.skillConfirm/, `${file}: action confirmations may be polluted by public speech mode`);
  assert.match(source, /\[计划\]目标；下一步；计划成立的前提；退出或改线条件\[\/计划\]/, `${file}: free output cannot leave a private cross-turn plan`);

  const parseStart = source.indexOf('function parseAI(c, opts)');
  const parseEnd = source.indexOf('// ★ 从 thinking 抢救发言', parseStart);
  assert.ok(parseStart >= 0 && parseEnd > parseStart, `${file}: parseAI source could not be isolated`);
  const sandbox = {console};
  vm.runInNewContext(source.slice(parseStart, parseEnd) + '\nthis.parseAI = parseAI;', sandbox, {filename:file});
  const parsed = sandbox.parseAI('[草稿]比较推P3和追问P5两条路线。[/草稿]\nP5，请解释你为什么突然改票；解释不通我会投你。\n[计划]目标是验证P5改票；下一步核对其理由；前提是他仍存活；若有系统铁证则改线。[/计划]');
  assert.equal(parsed.game, 'P5，请解释你为什么突然改票；解释不通我会投你。', `${file}: private plan or draft leaked into public speech`);
  assert.match(parsed.plan, /目标是验证P5改票/, `${file}: bracketed free-output plan was not persisted`);
}

console.log('Public speech completeness regression checks passed');
