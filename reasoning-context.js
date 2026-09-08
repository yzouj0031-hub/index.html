// Pure context helpers. Role hints accept only public configuration IDs, never
// hidden live state. Provider history accepts already viewer-filtered messages.
(function(root) {
  'use strict';
  function nightRules(roleIds, english = false) {
    const ids = new Set(roleIds || []);
    const lines = [english
      ? '[Night resolution: rules, not information about tonight] Night actions resolve before the final win check. A proposed kill is not an already eliminated player.'
      : '【夜间结算·规则不是今夜情报】夜间行动结算后才统一检查胜负；提议刀某人不等于该人已经离场。'];
    if (ids.has('witch')) lines.push(english
      ? 'A Witch attacked tonight can still use an available potion tonight unless a separate effect blocks her action. Killing her does not cancel poison already used that night; it only removes future actions if she dies. Nobody else learns her current potion choice from this rule.'
      : '女巫当夜中刀，只要没有其他效果封锁行动，仍可使用当夜可用药物。刀死女巫不会撤销她同夜已经使用的毒，只会在她出局后阻止未来行动；本规则不告知她今晚是否用药。');
    if (ids.has('guard')) lines.push(english
      ? 'The Guard may protect themself but may not protect the same target on consecutive nights. Another player\'s claimed guard history is not the actual history; an unknown target is not an illegal target.'
      : '守卫可以自守，但不能连续两夜守同一人。他公开声称的守护记录不等于真实记录；不知道他上夜守谁，不能写成他今晚不能守谁。');
    if (ids.has('guard') && ids.has('witch')) lines.push(english
      ? 'Guard plus antidote on the same final wolf-attack target causes that target to die. Death therefore does not by itself prove no antidote was used. A player reporting this private feedback is still making a claim to other players.'
      : '守护与解药同落最终狼刀目标会奶穿死亡。因此“人死了”本身不能证明“没救过”；玩家转述自己的奶穿反馈，对其他玩家仍是声明，不会自动成为全场系统认证。');
    if (ids.has('magician')) lines.push(english
      ? 'The Magician redirects only the wolf attack between the exchanged pair. The action names the original attack target, not the desired final victim. The rule does not reveal whether a Magician is alive or whom they exchange tonight.'
      : '魔术师只在交换的两人之间重定向狼刀；action填写名义刀口，不是希望死掉的最终目标。这条规则不提供魔术师是否存活或今夜交换谁的情报。');
    return '\n\n' + lines.join('\n');
  }
  function wolfChoice(roleIds) {
    const ids = new Set(roleIds || []);
    const lines = ['【选刀比较】先按本局胜负条件算整夜结算后的存活与终局，再比较有实际依据的两个刀口和合法空刀；必要时比较自刀。只有游戏仍会继续，才安排明天的配合。',
      '区分规则允许、你们亲知的记录、公开声称和猜测。明牌不等于必有保护，边缘位不等于无人保护；没有证据就保留不确定性，不要把随口报出的百分比当成计算结果。'];
    if (ids.has('guard')) lines.push('防守者也会预判你的刀法。比较守卫自守、守公开焦点与反向守外围的合理分支，不预设某个位置一定安全或一定不被守。');
    if (ids.has('magician')) lines.push('若交换会改变选刀结果，比较“不换”与“V和D交换”：直刀V会转到D，反刀D会转到V。D可以是自己或已知队友，但不换时真的会损失该狼；同时比较第三目标或空刀，不机械直刀，也不强制自刀。');
    if (ids.has('witch')) lines.push('把女巫今夜用毒与保留毒分开计算。即使同夜刀中她，也不能把用毒分支删掉；只有活到以后且药仍在，才有未来用药机会。');
    lines.push('队友纠正了一个前提后，重算依赖它的收益和最终行动；不能只口头认错，后面又借用已否定的前提。讨论中的最后一条发言仍是个人提议，不自动等于全队同意。');
    return lines.join('\n');
  }
  function disputeReview() {
    return '【核对争议，而不是惩罚表达】说对方“没回答、改了计划、前后矛盾”前，核对原话的完整理由、条件和先后顺序。已经给出理由但你不接受，应反驳那条理由，不能说成没回答；未来计划只改一项，不等于其余项都撤回。更新判断可以使用后来结果，但不能要求过去的人预知结果。先比较候选与本轮胜负风险，再选择；合理好人解释会降低嫌疑，不意味着必须排除所有好人可能才允许投票。无需公开复述这段检查。';
  }
  function providerHistory(messages) {
    // The first message is the instruction block. Later system-role messages
    // are this viewer's event/skill memories: native APIs must not discard them.
    return (messages || []).slice(1).map(m => ({
      role: m.role === 'system' ? 'user' : m.role,
      content: m.role === 'system' ? '【本人收到的历史系统记录】\n' + m.content : m.content
    }));
  }
  const api = {nightRules, wolfChoice, disputeReview, providerHistory};
  root.WolfReasoningContext = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
