import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

await withOfflinePage(async (page,origin) => {
  for (const file of ['index.html','en/index.html']) {
    const errors=[];
    const onError=e=>errors.push(e.message);
    page.on('pageerror',onError);
    await page.goto(origin+'/'+file);
    const out=await page.evaluate(() => {
      const keys=['villager','werewolf','seer','guard','magician','witch','wolfking'];
      S.players=keys.map((k,id)=>({id,name:'Seat'+id,role:ALL_ROLES[k],alive:true,memory:[]}));
      S.round=3; S.phase='day'; S.sheriff=-1; S.singleRound=true;
      document.getElementById('m-hdeath').checked=true;
      S.history=[
        {round:1,phase:'sheriff',name:'Seat1',text:'今晚先验Seat5，之后验Seat2。'},
        {round:1,phase:'sheriff',name:'Seat1',text:'第一验Seat5不变，第二验改成Seat6。'},
        {round:2,phase:'day',name:'Seat0',text:'我解释过：相对最好不等于我愿意承担这张警徽票的风险。'}
      ];
      const correction='刀中女巫仍能同夜用毒，不能用这一刀取消毒药。TAIL_CORRECTION';
      S.wolfChatHistory=[
        {round:2,name:'Seat1',text:'先刀女巫。'+ '旧提议。'.repeat(65)+correction},
        {round:2,name:'Seat6',text:'我不同意原计划。'+correction}
      ];
      S.wolfStrategyLog=[{round:2,name:'Seat1',text:'OBSOLETE_CLIPPED_PLAN'}];
      S.seerLog={1:{target:'SECRET_SEER_TARGET',result:'狼人显示'}};
      S.witchPotions={save:true,poison:true};
      gameRecord.length=0;
      gameRecord.push(...S.history.map(h=>({...h,type:'speech',game:h.text})),
        ...S.wolfChatHistory.map(h=>({...h,type:'speech',phase:'night',game:h.text,wolfChat:true})),
        {type:'night_action',role:'seer',casterId:2,round:1,target:'SECRET_SEER_TARGET',result:'wolf'},
        {type:'night_action',role:'witch',casterId:5,round:1,poisoned:'SECRET_POISON_TARGET'});
      const task={prompt:'【发言·单轮】现在是你的唯一发言机会。',opts:{}};
      const town=buildSystemPrompt(S.players[0],task);
      const wolf=buildSystemPrompt(S.players[1],task);
      const seer=buildSystemPrompt(S.players[2],task);
      const guard=buildSystemPrompt(S.players[3],task);
      const fullRules=buildRulesExport();
      const webRules=buildWebRulesExport(S.players[0],{hardRulesOnly:true});
      S.phase='night';
      const webWolf=buildWebPrompt(S.players[1]);
      const webTown=buildWebPrompt(S.players[0]);
      const brief=WolfReasoningContext.nightRules(S.players.map(p=>p.role.id));
      // Same public board, hidden role moved to another seat or silently eliminated:
      // the new rule/strategy hints may not reveal which world is real.
      [S.players[3].role,S.players[4].role]=[S.players[4].role,S.players[3].role];
      S.players[3].alive=false;
      const otherBrief=WolfReasoningContext.nightRules(S.players.map(p=>p.role.id));
      const teachingModes=[];
      for (const mode of ['clean','custom','official','hybrid']) {
        TeachingWorldbooks.load({mode,books:[]});
        teachingModes.push({mode,hint:buildWolfChoiceHint(),prompt:buildSystemPrompt(S.players[0],task)});
      }
      return {town,wolf,seer,guard,fullRules,webRules,webWolf,webTown,brief,otherBrief,teachingModes};
    });
    for(const key of ['town','guard','webTown']) {
      assert.doesNotMatch(out[key], /SECRET_|TAIL_CORRECTION|OBSOLETE_CLIPPED_PLAN/,file+': '+key+' leaked');
    }
    assert.match(out.seer,/SECRET_SEER_TARGET/);
    assert.doesNotMatch(out.seer,/SECRET_POISON_TARGET/);
    assert.match(out.wolf,/TAIL_CORRECTION/);
    assert.doesNotMatch(out.wolf,/OBSOLETE_CLIPPED_PLAN|SECRET_/);
    assert.match(out.wolf,/个人提议，不是全队定案/);
    assert.match(out.town,/第一验Seat5不变，第二验改成Seat6/);
    assert.match(out.town,/相对最好不等于我愿意承担/);
    for (const key of ['town','wolf','fullRules','webRules']) {
      assert.match(out[key],/不会撤销她同夜已经使用的毒|does not cancel poison/,file+': '+key);
    }
    assert.match(out.webWolf,/不能只口头认错/);
    assert.doesNotMatch(out.town,/给不出一个能排除"他是好人"的具体理由，今天就别动他/);
    assert.equal(out.brief,out.otherBrief);
    for (const row of out.teachingModes) {
      assert.match(row.prompt,/不会撤销她同夜已经使用的毒|does not cancel poison/);
      if (row.mode==='clean' || row.mode==='custom') {
        assert.equal(row.hint,'');
        assert.doesNotMatch(row.prompt,/【核对争议，而不是惩罚表达】/);
      } else {
        assert.match(row.hint,/【选刀比较】/);
        assert.match(row.prompt,/【核对争议，而不是惩罚表达】/);
      }
    }
    assert.deepEqual(errors,[],file+': runtime errors');
    console.log(file+': actual API/web/rule prompts retain corrections and enforce viewer-only information');
    page.off('pageerror',onError);
  }
});
