import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
for (const file of ['index.html', 'en/index.html']) {
  const html = fs.readFileSync(new URL(file, root), 'utf8');
  for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1], {filename:file});
  const mk = (id, role, name = 'Player' + id) => ({id, name, alive:true, role:{id:role, name:role, team:['werewolf','wolfbeauty','mechwolf','gargoyle'].includes(role)?'bad':'good'}, memory:[]});
  const players = ['villager','seer','witch','fox','fox','werewolf','gargoyle','gargoyle','whitecat','mechwolf'].map((role,id)=>mk(id,role));
  const S = {players, history:[], witchPotions:{save:true,poison:true}};
  const records = [
    {type:'night_action',role:'seer',casterId:1,round:1,target:'SEER_SECRET',result:'wolf'},
    {type:'night_action',role:'witch',casterId:2,round:1,saved:'WITCH_SECRET'},
    {type:'night_action',role:'fox',casterId:3,round:1,target:'FOX_A_SECRET',targetId:6,result:'mute'},
    {type:'night_action',role:'fox',casterId:4,round:1,target:'FOX_B_SECRET',targetId:7,result:'blockKill'},
    {type:'night_action',role:'fox',round:2,target:'AMBIGUOUS_LEGACY_SECRET',result:'mute'},
    {type:'night_action',role:'wolf',round:1,target:'PACK_SECRET',voters:{hidden:'secret'}},
    {type:'night_action',role:'gargoyle',casterId:6,round:1,target:'GARGOYLE_A_SECRET',roleName:'hunter'},
    {type:'night_action',role:'gargoyle',casterId:7,round:1,target:'GARGOYLE_B_SECRET',roleName:'witch'},
    {type:'speech',wolfChat:true,name:players[5].name,game:'PACK_CHAT_SECRET'},
    {type:'system',godOnly:true,text:'GOD_ONLY_SECRET'},
    {type:'speech',name:players[0].name,game:'PUBLIC_SPEECH'},
  ];
  const ctx = vm.createContext({S, gameRecord:records,
    isPackWolfRole:r=>['werewolf','wolfking','wolfbeauty','whitewolf'].includes(r.id),
    foxCharmActualTargetId:r=>r.actualTargetId ?? r.targetId,
    isFoxCharmMuteSource:s=>s==='fox'||s==='mechwolf_fox',
    _publiclyRevealedRoleName:()=>'', _publiclyVerifiedAlignment:()=>''});
  const start=html.indexOf('// BEGIN PRIVATE INFORMATION BOUNDARY');
  vm.runInContext(fs.readFileSync(new URL('reasoning-context.js', root), 'utf8'), ctx);
  const end=html.indexOf('// END PRIVATE INFORMATION BOUNDARY', start);
  vm.runInContext(html.slice(start,end),ctx);
  const privateStart=html.indexOf('function _buildPrivateInfoLines(p)');
  const privateEnd=html.indexOf('\nfunction _publicRecordPlayer',privateStart);
  vm.runInContext(html.slice(privateStart,privateEnd),ctx);
  const view=p=>JSON.stringify(ctx.viewerEventRecords(p));
  for(const id of [0,8]) {
    assert.doesNotMatch(view(players[id]), /SECRET/);
    assert.match(view(players[id]), /PUBLIC_SPEECH/);
    assert.equal(ctx._buildPrivateInfoLines(players[id]).length,0);
  }
  assert.match(view(players[1]), /SEER_SECRET/);
  assert.doesNotMatch(view(players[1]), /PACK_SECRET|WITCH_SECRET|FOX_A_SECRET/);
  assert.match(view(players[5]), /PACK_SECRET|PACK_CHAT_SECRET/);
  assert.doesNotMatch(view(players[9]), /PACK_SECRET|PACK_CHAT_SECRET/);
  assert.match(view(players[3]), /FOX_A_SECRET/);
  assert.doesNotMatch(view(players[3]), /FOX_B_SECRET|AMBIGUOUS_LEGACY_SECRET/);
  assert.match(ctx._buildPrivateInfoLines(players[3]).join('\n'), /FOX_A_SECRET/);
  assert.doesNotMatch(ctx._buildPrivateInfoLines(players[3]).join('\n'), /FOX_B_SECRET|AMBIGUOUS_LEGACY_SECRET/);
  assert.match(ctx._buildPrivateInfoLines(players[6]).join('\n'), /GARGOYLE_A_SECRET/);
  assert.doesNotMatch(ctx._buildPrivateInfoLines(players[6]).join('\n'), /GARGOYLE_B_SECRET/);
  // Received charm feedback contains neither caster identity nor other targets.
  records.push({type:'night_action',role:'fox',casterId:3,name:players[3].name,round:3,targetId:0,target:players[0].name,result:'mute'});
  const feedback=ctx.viewerEventRecords(players[0]).find(r=>r.receiverOnly);
  assert.equal(feedback.actualTargetId,0);
  assert.equal(feedback.casterId,undefined);
  assert.equal(feedback.name,undefined);
  assert.equal(ctx.privateActionBelongsTo(feedback,players[0]),false);
  // Explicit ownership always beats same role / name fallback.
  assert.equal(ctx.privateActionBelongsTo({...records[2],casterId:4,name:players[3].name},players[3]),false);
  assert.equal(ctx.privateActionBelongsTo({...records[2],casterId:3,playerId:4},players[3]),false);
  assert.equal(ctx.privateActionBelongsTo({type:'night_action',role:'seer'},players[1]),true);
  records.push({type:'night_action',role:'witch',casterId:2,round:2}, {type:'night_action',role:'wolf',round:2,target:'AFTER_ANTIDOTE_SECRET'});
  assert.doesNotMatch(ctx._buildPrivateInfoLines(players[2]).join('\n'),/AFTER_ANTIDOTE_SECRET/);
  // 女巫只能看到【她当晚亲眼看到的最终落点】。狼队 night_action 存的是魔术师换位前的
  // 名义刀口，一旦出现在她的账本里，就等于把魔术师换了哪两个人直接告诉她（她无权知道），
  // 而且会让账本自相矛盾（狼刀=A 却救=B）。这里的 fixture 正是这种形状：狼记 PACK_SECRET，
  // 她实际救的是 WITCH_SECRET。
  assert.doesNotMatch(ctx._buildPrivateInfoLines(players[2]).join('\n'),/PACK_SECRET/);
  assert.match(ctx._buildPrivateInfoLines(players[2]).join('\n'),/狼刀=WITCH_SECRET/);
  // seenKill 落库后应当直接用它，且仍然不带出同夜狼队的名义刀口
  records.push({type:'night_action',role:'witch',casterId:2,round:3,seenKill:'SEEN_BY_WITCH',saved:null},
               {type:'night_action',role:'wolf',round:3,target:'NOMINAL_ONLY_SECRET'});
  const witchLines3 = ctx._buildPrivateInfoLines(players[2]).join('\n');
  assert.doesNotMatch(witchLines3,/NOMINAL_ONLY_SECRET/);
  // Fail closed before any identity list, API prompt or personal export.
  const savedId=players[5].id; players[5].id=0;
  assert.throws(()=>ctx.viewerEventRecords(players[0]), /编号/);
  players[5].id=savedId;
  const savedName=players[5].name;players[5].name=players[0].name;
  assert.throws(()=>ctx.viewerEventRecords(players[0]), /姓名/);
  players[5].name=savedName;
  assert.throws(()=>ctx.viewerEventRecords({...players[0]}), /不属于/);
  const savedRole=players[8].role;players[8].role=players[1].role;
  assert.throws(()=>ctx.viewerEventRecords(players[1]), /共享状态/);
  players[8].role=savedRole;
  // Missing exact role results must not be rebuilt from the hidden role table.
  records.push({type:'night_action',role:'gargoyle',casterId:6,round:4,target:players[2].name,result:'exact'});
  assert.match(ctx._buildPrivateInfoLines(players[6]).join('\n'), /记录缺失，不能补查身份/);
  for(const signature of ['function buildSystemPrompt(p, taskContext) {','function buildWebPrompt(p','function _buildChatSummary(viewerP']) {
    const at=html.indexOf(signature);assert.match(html.slice(at,at+200),/assertPrivateViewer/);
  }
  assert.match(html,/assertRosterIdentity\(snap.S.players\)/);
  assert.doesNotMatch(html,/if \(p.role.team === 'bad' && S.seerLog\)/);
  assert.ok(html.includes("const _wolfPackViewer = isPackWolfRole(p.role)"));
  if(file==='index.html') {
    const a=html.indexOf('const CLAIM_ROLE_WORDS ='),b=html.indexOf('function buildDecoySacrificeBlock',a);
    vm.runInContext(html.slice(a,b),ctx);
    const extract=rows=>{S.history=rows.map(([name,text])=>({name,text,round:1}));return ctx.extractPublicClaims(players,new Set(players.map(p=>p.name)));};
    const speaker=players[0].name,target=players[5].name,other=players[8].name;
    for(const text of [target+'是好人',target+'不是我的金水','如果'+target+'是金水',other+'说'+target+'是金水','“'+target+'查杀”是他的原话',target+'金水，但这是骗你的']) {
      assert.equal(extract([[speaker,'我是预言家。'+text]]).peekClaims.length,0,text);
    }
    for(const text of ['我昨晚验的 '+target+' 是金水','我验了'+target+'，金水',target+' 查杀']) {
      assert.equal(extract([[speaker,'我是预言家。'+text]]).peekClaims.length,1,text);
    }
    assert.equal(extract([[speaker,target+'金水'],[speaker,'我是预言家']]).peekClaims.length,0);
    assert.equal(extract([[speaker,'如果我是预言家，我验'+target+'金水']]).peekClaims.length,0);
    players[0].alive=false;
    assert.equal(extract([[speaker,'我是预言家。'+target+'金水']]).peekClaims.length,1);
    players[0].alive=true;
    extract([[speaker,'我是预言家。'+target+'金水'],[other,'我是预言家。'+target+'金水']]);
    const block=ctx.buildPublicClaimsBlock(players[1]);
    assert.doesNotMatch(block,/默认立场是【他是自己人】|本局硬事实|只要这些人里有一个/);
    assert.match(block,/不是系统认证/);
    assert.match(block,/不等于存活狼数/);
  }
  console.log(file+': privacy ownership, invalid IDs, claim provenance and script syntax passed');
}
