import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import context from '../reasoning-context.js';

const {nightRules,wolfChoice,disputeReview} = context;
assert.doesNotMatch(nightRules(['villager','werewolf']), /女巫|守卫|魔术师/);
assert.doesNotMatch(wolfChoice(['villager','werewolf']), /女巫|守卫|魔术师/);
const rules = nightRules(['werewolf','witch','guard','magician']);
assert.match(rules, /不会撤销她同夜已经使用的毒/);
assert.match(rules, /守卫可以自守/);
assert.match(rules, /“人死了”本身不能证明“没救过”/);
assert.match(rules, /不提供魔术师是否存活/);
assert.match(nightRules(['witch'],true), /does not cancel poison/);
assert.match(wolfChoice(['magician']), /反刀D会转到V/);
assert.match(wolfChoice(['guard']), /反向守外围/);
assert.match(disputeReview(), /已经给出理由但你不接受/);
assert.match(disputeReview(), /不等于其余项都撤回/);
assert.match(disputeReview(), /不意味着必须排除所有好人可能/);
const originalMessages = [
  {role:'system',content:'INSTRUCTIONS'},
  {role:'system',content:'OWN_PRIVATE_EVENT'},
  {role:'assistant',content:'MY_PREVIOUS_RESPONSE'},
  {role:'user',content:'CURRENT_TASK'}
];
assert.deepEqual(context.providerHistory(originalMessages),[
  {role:'user',content:'【本人收到的历史系统记录】\nOWN_PRIVATE_EVENT'},
  {role:'assistant',content:'MY_PREVIOUS_RESPONSE'},
  {role:'user',content:'CURRENT_TASK'}
]);
assert.equal(originalMessages[1].role,'system','serializer must not rewrite stored memories');

for (const file of ['index.html','en/index.html']) {
  const html=fs.readFileSync(file,'utf8');
  for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1],{filename:file});
  assert.match(html, /reasoning-context.js/);
  assert.match(html, /WolfReasoningContext\.wolfChoice\(S.players.map/);
  assert.match(html, /WolfReasoningContext\.nightRules\(ids\)/);
  assert.doesNotMatch(html, /你刀过去大概率扑空白费一晚|看起来没保护、刀了能稳定见血/);
  assert.doesNotMatch(html, /给不出一个能排除"他是好人"的具体理由，今天就别动他/);
  assert.doesNotMatch(html, /记住这些策略，白天配合行动，不要自相矛盾/);
  assert.doesNotMatch(html, /S.wolfStrategyLog.push\([^\n]*slice\(0, 120\)/);
  assert.doesNotMatch(html, /【唯一的例外——什么时候才切割】/);
}
for (const f of ['sw.js','scripts/build-www.mjs']) assert.match(fs.readFileSync(f,'utf8'), /reasoning-context.js/);
console.log('Reasoning context: board-only rules, contingent tactics, argument fidelity and packaging passed');
