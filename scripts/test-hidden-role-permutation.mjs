import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

await withOfflinePage(async(page,origin)=>{
  for(const file of ['index.html','en/index.html']){
    await page.goto(origin+'/'+file);
    const results=await page.evaluate(()=>{
      const keys=['villager','witch','guard','magician','seer','werewolf','werewolf'];
      S.players=keys.map((k,id)=>({id,name:'Seat'+id,role:ALL_ROLES[k],alive:true,memory:[]}));
      S.round=1; S.phase='day'; S.sheriff=-1; S.history=[]; gameRecord.length=0;
      document.getElementById('m-hdeath').checked=true;
      const methods={api:()=>buildSystemPrompt(S.players[0]), web:()=>buildWebPrompt(S.players[0]),
        rules:()=>buildRulesExport(), roleList:()=>getRoleList()};
      const before=Object.fromEntries(Object.entries(methods).map(([k,f])=>[k,f()]));
      const rows=[];
      for(let left=1;left<S.players.length;left++) for(let right=left+1;right<S.players.length;right++){
        [S.players[left].role,S.players[right].role]=[S.players[right].role,S.players[left].role];
        for(const [key,fn] of Object.entries(methods)){
          const a=before[key], b=fn();let i=0;while(i<a.length&&a[i]===b[i])i++;
          rows.push({key,left,right,equal:a===b,...(a===b?{}:{firstDifference:i,
            before:a.slice(Math.max(0,i-35),i+120),after:b.slice(Math.max(0,i-35),i+120)})});
        }
        [S.players[left].role,S.players[right].role]=[S.players[right].role,S.players[left].role];
      }
      return rows;
    });
    console.log(file,results.length+' checks',JSON.stringify(results.filter(x=>!x.equal)));
    assert.ok(results.every(x=>x.equal),'Changing only unseen role assignment must not change public/player-visible prompt');
  }
});
