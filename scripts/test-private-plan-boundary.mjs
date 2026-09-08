import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Match-report regression: an unfinished [计划] was published as speech,
// then quoted by later players. Exercise the real parsers without API calls.
for (const file of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
  const start = html.indexOf('function parseAI(c, opts)');
  const end = html.indexOf('// ★ 从 thinking 抢救发言', start);
  const ctx = vm.createContext({console});
  vm.runInContext(html.slice(start, end), ctx);
  const speech = '我是女巫，昨晚没有用药。今天我投快斗，请大家核对记录。';
  const secret = 'PRIVATE_PLAN_SENTINEL：保住狼队友Gin；明天我投白马，必要时切割止损。';
  const cases = [
    `${speech}\n[计划]${secret}`,
    `${speech}\n【计划】${secret}`,
    `${speech}\n<plan>${secret}`,
    `${speech}\n[计划]${secret}[/计划]`,
    `${speech}\n【计划】${secret}[/计划]`,
    `<game>${speech}\n[计划]${secret}</game>`,
    `<game>${speech}</game><plan>${secret}<action>快斗</action>`,
    `<thinking>先比较公开票型。</thinking>${speech}\n[计划]${secret}`,
    `[计划]${secret}[/计划]\n${speech}`,
    `<plan>${secret}</plan><game>${speech}</game><action>快斗</action>`,
    `${speech}\n&lt;plan&gt;${secret}`,
  ];
  for (const input of cases) {
    for (const opts of [{}, {_nativeThinking:'思考已经由供应商分离。'}]) {
      const result = ctx.parseAI(input, opts);
      assert.equal(result.game, speech, `${file}: private plan leaked or public speech changed: ${input}`);
      assert.equal(result.plan, secret, `${file}: the actor lost their private plan`);
      assert.equal(result.action, '快斗', `${file}: private plan changed this turn's action`);
    }
  }

  for (const tag of ['[计划]', '<plan>']) {
    const result = ctx.parseAI(tag + secret);
    assert.equal(result.game, '(沉默)', `${file}: a plan alone must not become a speech`);
    assert.equal(result.action, '', `${file}: a future plan must not become a vote`);
    assert.equal(result.plan, secret);
    const choice = ctx.parseAI(tag + secret, {skillConfirm:true, requireGame:false});
    assert.equal(choice.game, '', `${file}: choice-only stage manufactured speech`);
    assert.equal(choice.action, '');
  }
  assert.equal(ctx.parseAI(speech).game, speech, `${file}: legitimate witch bluff was changed`);
  assert.equal(ctx.parseAI('我计划明天跳女巫挡刀，今天我投快斗。').game,
    '我计划明天跳女巫挡刀，今天我投快斗。', `${file}: ordinary use of 计划 was censored`);

  const webStart = html.indexOf('function _splitWebReplyDraft(rawText)');
  const webEnd = html.indexOf('// ── 导演模式状态横幅', webStart);
  vm.runInContext(html.slice(webStart, webEnd), ctx);
  for (const input of cases) {
    const result = ctx.parseAI(ctx.parseWebPaste(input));
    assert.equal(result.game, speech, `${file}: web relay published private plan`);
    assert.equal(result.plan, secret, `${file}: web relay lost private plan`);
  }

  // Check the actual publisher, not just parser return values: neither public
  // history, exported speech records, spectators nor TTS may receive the plan.
  const streamStart = html.indexOf('async function streamSpeak(player, label, result, isWolfChat, noUndo)');
  const streamEnd = html.indexOf('function waitInput(', streamStart);
  const actor = {id:0, name:'赤井', role:{id:'werewolf'}, memory:[]};
  const other = {id:1, name:'快斗', role:{id:'villager'}, memory:[]};
  const outputs = [];
  const element = () => ({appendChild(){}, style:{}});
  Object.assign(ctx, {
    S:{round:1,phase:'day',players:[actor,other],history:[]}, gameRecord:[],
    document:{createElement:element}, $:element,
    blindNamesOn:()=>false, markLogVisibility(){}, getEmoji:()=>'', isMC:()=>false,
    getAvatarHtml:()=>'', getModelTagHtml:()=>'', applyObserverPerspective(){}, scrollGL(){},
    TTS:{claimLive:()=>false,speak:(_p,text)=>outputs.push(text)},
    fakeStream:async(_el,text)=>{outputs.push(text);},
    callSpectator:(_kind,text)=>outputs.push(text),
    isAISilentFailure:value=>!value || value==='(沉默)', isPackWolfRole:()=>false,
  });
  vm.runInContext(html.slice(streamStart, streamEnd), ctx);
  for (const reply of [ctx.parseAI(cases[0]), {game:cases[0],action:cases[0],thinking:''}]) {
    await ctx.streamSpeak(actor, '发言', reply, false, true);
    assert.equal(ctx.S.history.at(-1).text, speech);
    assert.equal(ctx.gameRecord.at(-1).game, speech);
    assert.equal(actor._plan, secret, `${file}: actor lost their plan during publishing`);
    assert.equal(other._plan, undefined);
    assert.doesNotMatch(JSON.stringify([ctx.S.history,ctx.gameRecord,other,outputs]),
      /PRIVATE_PLAN_SENTINEL/, `${file}: published data contains private plan`);
  }

  const choicesStart = html.indexOf('function _parseWebVotePaste(rawText, candidates)');
  // The English page does not yet have the incremental choice-only relay.
  if (choicesStart < 0) continue;
  const choicesEnd = html.indexOf('// ── 网页端 prompt 弹窗', choicesStart);
  vm.runInContext(html.slice(choicesStart, choicesEnd), ctx);
  const candidates = [{id:0,name:'快斗'}, {id:1,name:'白马'}];
  ctx.findPlayer = (name, players) => players.find(p => p.name === name) || null;
  assert.equal(ctx._parseWebVotePaste('[计划]明天最终投票：白马', candidates), '');
  assert.equal(ctx._parseWebVotePaste('<plan>明天用<action>白马</action>推进计划。</plan>', candidates), '');
  assert.equal(ctx._parseWebVotePaste('<action>快斗</action>\n[计划]明天最终投票：白马', candidates), '快斗');
  assert.equal(ctx._parseWebOperationPaste('[计划]明晚最终选择：白马',
    [{value:'白马',label:'查验白马'}]), '');
}
console.log('Private plan boundaries passed: API, web relay, speech, votes and skill choices');
