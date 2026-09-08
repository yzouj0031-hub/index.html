import assert from 'node:assert/strict';
import {withOfflinePage} from './lib/offline-browser.mjs';

// Execute the production resolver, death recorder and redirector, not a second
// implementation of their rules. Only presentation, model calls and ending
// speeches are replaced. This verifies mechanics, not model playing strength.
await withOfflinePage(async(page,origin)=>{
  for (const file of ['index.html','en/index.html']) {
    await page.goto(origin+'/'+file);
    const out=await page.evaluate(async()=>{
      const logs=[];
      for (const key of ['card','phaseClass','stats','setSpeaking','devLog'])
        Render[key]=()=>{};
      Render.log=(kind,text)=>logs.push({kind,text});
      Audio.playDeath=()=>{};
      wolfKillEffect=()=>{};
      playRoleEffect=()=>{};
      showRoleCinematic=async()=>{};
      callHost=async()=>{};
      callSpectator=()=>{};
      compressAllMemories=async()=>{};
      callAI=async()=>{throw new Error('No model calls permitted in mechanics fixture');};
      let winner=null;
      checkEnd=async()=>{winner=evalWinNow();return !!winner;};
      document.getElementById('m-hdeath').checked=true;
      document.getElementById('m-lastwill').value='never';

      const reset=()=>{
        S.players=['werewolf','witch','guard','magician','villager','villager'].map((key,id)=>({
          id,name:'Seat'+id,role:ALL_ROLES[key],alive:true,revealed:false,memory:[]
        }));
        Object.assign(S,{round:3,phase:'night',history:[],sheriff:-1,gameOver:false,
          killEdgeMode:false,loverCrossTeam:false,loverPair:null,charmedPlayer:null,
          wolfKillLog:{},guardLog:[],witchLog:[],wolfChatHistory:[],wolfStrategyLog:[],
          _lastNightDeaths:[],_winType:null});
        S.nightData={kill:null,killChosenByWolf:null,killActorRole:null,
          witchPoison:null,witchSave:false,guard:null,lastGuard:null,
          magicSwap:null,imitatorSwap:null,customPoison:[],customProtect:[],customSave:[],
          customExpose:[],customShield:{},skillMuteSources:{}};
        gameRecord.length=0;logs.length=0;winner=null;
      };
      const scenarios=[
        {name:'witch-hit-still-poisons',kill:1,poison:0},
        {name:'guard-plus-save',kill:4,guard:4,save:true},
        {name:'guard-only',kill:4,guard:4},
        {name:'save-only',kill:4,save:true},
        {name:'poison-overrides-save-and-guard',kill:4,guard:4,save:true,poison:4},
        {name:'self-attack-with-swap',kill:0,swap:[0,4]},
        {name:'direct-attack-with-swap',kill:4,swap:[0,4]},
        {name:'self-attack-without-swap',kill:0},
        {name:'unrelated-swap',kill:4,swap:[0,5]},
        {name:'pass',kill:null},
        {name:'guard-self-protection',kill:2,guard:2}
      ];
      const rows=[];
      for(const s of scenarios){
        reset();
        Object.assign(S.nightData,{kill:s.kill,killChosenByWolf:s.kill,
          witchPoison:s.poison??null,witchSave:!!s.save,guard:s.guard??null,
          magicSwap:s.swap??null});
        NightActions.applyMagicSwap();
        await resolveNight();
        rows.push({name:s.name,actual:S.nightData.kill,winner,
          deaths:gameRecord.filter(r=>r.type==='death').map(r=>({name:r.name,cause:r.cause})),
          alive:S.players.map(p=>p.alive),wolfLog:S.wolfKillLog[3],
          guardMemory:S.players[2].memory,witchMemory:S.players[1].memory,
          townMemory:S.players[5].memory,
          publicDeaths:logs.filter(r=>r.kind==='death').map(r=>r.text)});
      }
      reset();
      const offers=[];
      nightTwoStep=async(p,context,action,opts)=>{
        const advertised = (context.split('\n').find(line=>line.startsWith('可选目标：')) || '');
        const candidates = [...advertised.matchAll(/P(\d+)=/g)].map(m=>Number(m[1])-1);
        offers.push(candidates);
        if (opts && JSON.stringify(candidates)!==JSON.stringify(opts.decisionCandidates.map(x=>x.id)))
          throw new Error('Guard prompt and action parser disagree on candidates');
        return {action:offers.length===1?'P3':'None',game:'',thinking:''};
      };
      logNightThinking=()=>{};attachNightThinking=()=>{};
      document.getElementById('m-mc').checked=false;
      await NightActions.guard(S.players.filter(p=>p.alive));
      const firstGuard=S.nightData.guard;
      S.round++;
      await NightActions.guard(S.players.filter(p=>p.alive));
      return {rows,offers,firstGuard,afterPass:S.nightData.lastGuard};
    });
    const byName=Object.fromEntries(out.rows.map(x=>[x.name,x]));
    const poison=byName['witch-hit-still-poisons'];
    assert.deepEqual(poison.deaths,[{name:'Seat1',cause:'kill'},{name:'Seat0',cause:'poison'}]);
    assert.equal(poison.winner,'good','last wolf poison survives the same-night knife');
    assert.equal(poison.publicDeaths.length,1,'one batch death announcement');
    const double=byName['guard-plus-save'];
    assert.deepEqual(double.deaths,[{name:'Seat4',cause:'kill'}]);
    assert.match(JSON.stringify(double.guardMemory),/同守同救/);
    assert.match(JSON.stringify(double.witchMemory),/同守同救/);
    assert.doesNotMatch(JSON.stringify(double.townMemory),/同守同救|解药|毒药/);
    for(const name of ['guard-only','save-only','pass','guard-self-protection'])
      assert.deepEqual(byName[name].deaths,[],name);
    assert.deepEqual(byName['poison-overrides-save-and-guard'].deaths,[{name:'Seat4',cause:'poison'}]);
    const swap=byName['self-attack-with-swap'];
    assert.equal(swap.actual,4);
    assert.deepEqual(swap.deaths,[{name:'Seat4',cause:'kill'}]);
    assert.equal(swap.wolfLog.target,'Seat0','pack sees its nominal choice, not secret redirection');
    assert.equal(swap.wolfLog.success,false);
    for(const name of ['direct-attack-with-swap','self-attack-without-swap']){
      assert.equal(byName[name].actual,0);
      assert.deepEqual(byName[name].deaths,[{name:'Seat0',cause:'kill'}]);
      assert.equal(byName[name].winner,'good');
    }
    assert.equal(byName['unrelated-swap'].actual,4);
    assert.equal(out.firstGuard,2,'self is a legal guard action');
    assert.ok(out.offers[0].includes(2));
    assert.ok(!out.offers[1].includes(2),'cannot repeat self guard the next night');
    assert.equal(out.afterPass,null,'passing releases the previous target restriction');
    console.log(file+': 11 real night outcomes, private feedback and guard action legality passed');
  }
});
