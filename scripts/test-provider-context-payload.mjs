import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

// Capture the serialized request at fetch. All responses are local fixtures;
// no real API credential, endpoint or model is used.
await withOfflinePage(async(page,origin)=>{
  for(const file of ['index.html','en/index.html']){
    await page.goto(origin+'/'+file);
    const rows=await page.evaluate(async()=>{
      let type='openai',payload=null;
      getAPI=()=>({url:location.origin+'/fixture',key:'offline-placeholder',model:'fixture-model',type});
      getFallbacks=()=>[];
      const text='<game>我会比较具体记录后再选择。</game><action>None</action>';
      window.fetch=async(url,opts)=>{
        if(!String(url).startsWith(location.origin+'/fixture')) throw new Error('Unexpected fixture request');
        payload=JSON.parse(opts.body);
        const result=type==='anthropic'?{content:[{type:'text',text}],stop_reason:'end_turn'}
          :type==='gemini'?{candidates:[{content:{parts:[{text}]},finishReason:'STOP'}]}
          :{choices:[{message:{content:text},finish_reason:'stop'}]};
        return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json'}});
      };
      Render.devLog=()=>{};Render.log=()=>{};
      S.players=['guard','seer','witch','werewolf','werewolf','villager','magician'].map((k,id)=>({
        id,name:'Seat'+id,role:ALL_ROLES[k],alive:true,memory:[
          {role:'system',content:id===0?'【同守同救提醒】OWN_GUARD_FEEDBACK':id===1?'【查验结果】OTHER_SEER_SECRET':'MEMORY_'+id}
        ]}));
      S.round=3;S.phase='day';S.sheriff=-1;S.history=[];gameRecord.length=0;
      document.getElementById('m-hdeath').checked=true;
      document.getElementById('g-mem').value='0';
      S.wolfChatHistory=[{round:2,name:'Seat3',text:'PACK_FULL_CORRECTION'}];
      S.wolfStrategyLog=[];
      S.players[3].memory.push({role:'system',content:'【狼队战略·第2夜密谈摘要】STALE_TRUNCATED_PLAN'});
      playerConfigs={0:{disableFreeOutput:true},3:{disableFreeOutput:true}};
      const out=[];
      for(type of ['openai','anthropic','gemini']){
        for(const id of [0,3]){
          payload=null;
          const result=await callAI(S.players[id],'【发言·单轮】对其他玩家说明本轮判断。',{noMemory:true,maxRetries:1});
          out.push({type,id,payload:JSON.stringify(payload),hasResponse:!!result?.game});
        }
      }
      return out;
    });
    console.log(file,rows.map(r=>({type:r.type,id:r.id,
      ownFeedback:r.payload.includes('OWN_GUARD_FEEDBACK'),
      obsoletePlan:r.payload.includes('STALE_TRUNCATED_PLAN')})));
    for(const row of rows){
      assert.ok(row.hasResponse,file+': fixture response failed');
      assert.doesNotMatch(row.payload,/OTHER_SEER_SECRET/,file+': another player private memory leaked');
      if(row.id===0){
        assert.ok(row.payload.includes('OWN_GUARD_FEEDBACK'),file+': '+row.type+' dropped own feedback');
        assert.doesNotMatch(row.payload,/PACK_FULL_CORRECTION|STALE_TRUNCATED_PLAN/);
      } else {
        assert.match(row.payload,/PACK_FULL_CORRECTION/);
        assert.ok(!/OWN_GUARD_FEEDBACK|STALE_TRUNCATED_PLAN/.test(row.payload),
          file+': '+row.type+' replayed obsolete generated strategy');
      }
    }
    console.log(file+': OpenAI-compatible, Anthropic and Gemini request payload boundaries passed');
  }
});
