// Full objections survive; first/last speaker is not automatically consensus.
// No model calls: the fixture only exercises the real prompt builders.
import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

await withOfflinePage(async(page,origin)=>{
  for (const file of ['index.html','en/index.html']) {
    await page.goto(origin+'/'+file);
    const out=await page.evaluate(()=>{
      S.players=['werewolf','werewolf','villager','seer','witch','guard'].map((key,id)=>({
        id,name:'Player'+id,alive:true,role:ALL_ROLES[key],memory:[]
      }));
      S.round=3;S.phase='night';S.history=[];S.sheriff=-1;gameRecord.length=0;
      S.wolfStrategy='旧计划：推Player3';S.wolfStrategyName='旧计划';S.wolfStrategyRound=1;
      S.wolfStrategyLog=[
        {round:1,name:'Player0',text:'LEGACY_OPENING'},
        {round:1,name:'Player1',text:'LEGACY_OBJECTION：不同意那个提议'}
      ];
      S.wolfChatHistory=[];
      const legacy=buildSystemPrompt(S.players[0]);
      S.wolfChatHistory=[
        {round:2,name:'Player0',text:'UNACCEPTED_PROPOSAL '+ '讨论文字。'.repeat(60)+' TAIL_CORRECTION'},
        {round:2,name:'Player1',text:'LATER_OBJECTION：这个理由不成立，应该换目标。'}
      ];
      const full=buildSystemPrompt(S.players[0]);
      return {legacy,full,town:buildSystemPrompt(S.players[2]),
        priv:_buildPrivateInfoLines(S.players[0]).join('\n'),web:buildWebPrompt(S.players[0])};
    });
    assert.match(out.legacy,/LEGACY_OPENING/);
    assert.match(out.legacy,/LEGACY_OBJECTION/);
    assert.match(out.full,/UNACCEPTED_PROPOSAL/);
    assert.match(out.full,/TAIL_CORRECTION/);
    assert.match(out.full,/LATER_OBJECTION/);
    assert.doesNotMatch(out.full,/LEGACY_OPENING/);
    assert.match(out.full,/个人提议，不是全队定案/);
    assert.match(out.full,/不是承诺|预案，不是死命令/);
    assert.doesNotMatch(out.full,/不要自相矛盾|一个都不许跳过/);
    assert.doesNotMatch(out.town,/LEGACY_|UNACCEPTED_PROPOSAL|TAIL_CORRECTION|LATER_OBJECTION/);
    assert.match(out.priv,/不是本局的行动纲领|预案/);
    assert.match(out.web,/不是本局的行动纲领|预案/);
    console.log(file+': full objections, legacy fallback, provisional plans and pack-only access passed');
  }
});
