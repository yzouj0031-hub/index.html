(function () {
  'use strict';

  const FORMAT = 'wolf-teaching-worldbooks';
  const VERSION = 1;
  const MAX_BOOKS = 200;
  const MAX_CONTENT = 100000;
  const MAX_TOTAL_CONTENT = 800000;
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const VALID_MODES = new Set(['official', 'custom', 'hybrid', 'clean']);
  const VALID_TEAMS = new Set(['good', 'bad', 'third']);
  const VALID_PHASES = new Set(['night', 'day', 'sheriff', 'vote', 'ending']);

  const DEFAULT_PRESET_BOOKS = [
    {
      id: 'wb_advanced_evidence_endgame',
      name: '高阶实战：对跳证据与残局算术',
      description: '公共判断框架：不把经验当铁律，先核验信息来源，再计算残局胜负。',
      enabled: true,
      priority: 92,
      roles: [],
      teams: [],
      phases: ['day', 'sheriff', 'vote'],
      content: `【这些是决策工具，不是身份判定公式】
以下内容用于帮助你权衡，不会自动证明任何人的身份。若与本局配置、私密记录或系统结算冲突，以后者为准。

【对跳先核验信息源】
1. 对跳只说明同一身份声明中至少有一个不真实；声明不真实的人也可能是替神挡刀的好人，不能由“他对跳了”直接推出狼人。
2. 先找只有该身份才应知道、且以后可能验证的信息：预言家的目标与结果、女巫亲眼看到的刀口和药物记录、守卫逐夜守护账本、技能实际发动结果。身份声明和推理意见分开计分。
3. 先跳、后跳、当时是否处于票压，都只是动机线索。后跳可能是狼搅局，也可能是真神听完假信息后被迫回应；安全位起跳可能是挡刀，也可能是狼提前做身份。必须和记录、票型、收益共同判断。
4. 双方都没有可验证内容时，不要为了“今天必须分出真假”耗尽整个白天。可以保留两种可能，让后续行动、死讯和票型继续提供信息；但若假身份已经掌握决定性归票权，也不能机械沉默。

【先拆发言，再做代入；行为模型不能单独定罪】
代入式推理是有用的概率工具：站进对方声称的身份与当时时点，模拟其信息、目标、代价和可选行动。但必须代入对方的合法视角，不能把“换成我不会这样做”偷换成“真身份不可能这样做”。
判断身份前，先拆实际发言：事实主张、信息来源、采用的前提、推导过程、最终结论或行动。反驳时必须指出哪一环断了，并对应到原话与已知事实；“真神通常不会这样”等行为预期，只能在完成内容核验后作为C级软先验，与独立证据共同微调概率，不能单独定罪。
本教学层里的推理框架（比较悍跳/挡刀分支、算轮次、拆发言、时点账本）是给你自己用的工具，不是别人必须遵守的标准。别人没有这样盘——例如真预言家没考虑对跳者可能是挡刀好人——只说明他盘得粗或没想到，不是身份证据；真神的推理同样可以粗糙、可以出错。可以指出他漏了哪个分支，不能因此说他“不像真神”。
发言完整、自洽、罕见、说服力强、难以反驳或“像故事”本身不构成狼面；无法提出具体反驳时，应承认该论证尚未被推翻。只有可定位的事实矛盾、当时时点无权知道的私密信息、为了适配结果而改变既有前提，或持续给狼人带来明确收益，才构成实质断点。后置位攻击已经结束发言、无法回应的前置位时也必须给出这种依据；流程造成的沉默不是默认认罪。

【时点知识账本·防止事后信息倒灌】
评价过去行为前，先锁定发生时点T并建立K(玩家,T)：只放入T前已经公开给全场的信息，以及系统在T前单独告知该玩家的私密信息。自己的秘密不能转借给别人，T后才公开的死讯、身份、票型或技能结果也不能塞回T的视角；不知道其私密记录时要保留身份条件分支，不能事后替他补写。后来结果可以更新今天的身份概率，但“结果证明他当时判断错了”不等于“他当时在撒谎或故意帮狼”。只有一句话在T时明确依赖K(玩家,T)中不存在的信息，且没有公开或合法技能来源，才构成真正的视角漏洞。公开计划在系统执行前也不属于已发生结果。

【身份、行动事实与推理分开】
真神可能基于有限视角得到错误结论，狼人也可能讲出真实刀口、正确规则或正确推理。不能用“这段推理错了”直接推出“身份也是假的”，也不能用“他说对了”直接认证身份。每名玩家只需依据当时合法拥有的信息行动，不要求替其他人补全未知视角；公开发言时只要分清“我亲自收到的记录”和“我根据记录做的判断”。若本局存在石像鬼等能获知具体身份的角色，还要考虑对方可能提前知道真神身份并预埋弃票、站边或后手对跳，这些行为链仍不是身份铁证。

【形成工作判断，不复读免责声明】
“自报身份不是系统翻牌”和“隐死亡下死者身份未知”是内心证据边界，不是每轮发言必须重复的口号。结合无人对跳、连续记录、技能兑现、票型与收益，明确给出“暂认、偏信、待验、目前不信”的工作判断，并据此站边、保护或投票；不能因为没有100%验证就拒绝形成判断。只有当别人明确把身份声明说成系统已验证事实时，才简短纠正一次，随后立即回到具体记录与票型。可以坚定表达当前判断，但要让听者分得清这是你的高概率判断还是系统事实。

【身份声明同标尺】
自报平民和自报神职都只是待核验声明。多人平民板没有“无人对跳即坐实平民”：平民牌无法靠对跳获得排他验证，自称平民只能暂留观察，不能自动获得好人身份。某人依据记录、对跳、兑现和票型暂认神职，也不因认得快或表达坚定自动成为视角漏洞。攻击这种站边前，先检查自己是否也在无验证地接平民牌、此前是否已经按同一神职路线投票；双方都按信息来源、硬矛盾、兑现和阵营收益评分。此规则不要求机械怀疑或放逐所有跳平民者，只禁止对两类声明使用双重标准。

【残局先算，再谈感觉】
每次放逐或发动致命技能前，分别演算“目标是好人”和“目标是狼人”两条分支：行动后各阵营存活人数、当夜可造成的死亡、是否立即触发胜负。语气、性格与遗言心理不能盖过确定的人数账。
所谓“无风险测试”也必须算轮次。尤其白猫被投后可能只是缓死、当天没有真正减少狼人；若因此让狼人获得足以终结游戏的一夜，这个测试就不是安全路线。`
    },
    {
      id: 'wb_advanced_wolf_claiming',
      name: '狼队进阶：悍跳神职的完整生命周期',
      description: '从选择身份、建立账本到维护、转向和止损的完整悍跳方法。',
      enabled: true,
      priority: 95,
      roles: [],
      // 机械狼与石像鬼和狼队互不相认，这套以"狼队共享刀口与配合"为前提的内容不适用
      excludeRoles: ['mechwolf', 'gargoyle'],
      teams: ['bad'],
      phases: ['day', 'sheriff', 'vote'],
      content: `【悍跳不是报一句身份，而是一份需要持续履行的合同】
起跳前先回答五问：这一跳要抢什么（警徽、归票权、抗推、找出真神、保护队友）？真神还可能活着吗？我能拿什么持续兑现？下一轮必须补交什么记录？身份暴露后怎样止损？答不出来时，普通好人视角往往比临时乱跳更安全。

【按身份计算兑现成本】
· 预言家：准备完整的历史查验、当夜查验与未来查验计划。假金水和假查杀都必须服务明确的票型目标，不能每天随局势随意改账。
· 女巫：狼队知道名义刀口，但不知道守护、换位、反弹等全部结算；可以围绕已知刀口构造救人说法，却不能把未公开死因当成确定事实。必须提前决定解药、毒药各自何时声称使用，以及药用尽后靠什么继续取得信任。
· 守卫：先写逐夜守护账本，遵守不能连续守同一人的限制。不要把每个平安夜都抢成自己的功劳；守护、解药、禁刀和其他技能都可能造成无人死亡。
· 猎人：威慑容易建立、死亡时才最终验证，适合短期抗推；但真猎人对跳或系统未出现枪声会形成巨大成本。
· 骑士：通常不要悍跳。真骑士能立即决斗兑现，你无法发动同一技能，谎言的验证期限太短。

【建立—维护—转向—止损】
1. 建立：第一轮就给出最少但完整的核心账本，不依赖之后听到的新公开信息倒填历史。
2. 维护：每轮先复述自己的既有记录，检查目标、结果、药物和时间线能否连续；宁可保留不确定，也不要为了圆一个小破绽再编三个新事实。
3. 配合：队友不必全员替悍跳者站台。有人支持、有人保留、必要时有人切割，通常比整齐抱团更自然；但切割队友只是一种信用交易，不保证之后自动成为好人。
4. 转向：原计划前提崩溃时及时换目标或降低身份强度，不要为了维护一句旧话把全队拖进明显矛盾。
5. 止损：身份已被系统结果击穿时，停止继续制造无收益的假信息，转而争取一轮票、交换关键神职或给仍隐藏的队友留下更干净的关系。

【遗言也能博弈，但没有固定反读】
死狼可以用大量真话包装最后一条假线索，也可以故意点出队友、保护队友或给好人“反向金水”。因此不要假设“狼遗言一定撒谎”或“绝不会卖最后队友”；目标是让好人难以判断，而不是背诵一种套路。`
    },
    {
      id: 'wb_advanced_good_counterclaim',
      name: '好人进阶：识别悍跳与保护真神',
      description: '教好人核验身份、选择是否对跳，并防止被高质量假神带队。',
      enabled: true,
      priority: 95,
      roles: [],
      teams: ['good'],
      phases: ['day', 'sheriff', 'vote'],
      content: `【先验证信息，不先审判演技】
面对高质量神职声明，把内容拆成四层：身份声明、可核验的私密记录、基于记录得到的推理、要求大家执行的票型。可以暂信记录却不同意归票，也可以怀疑身份却承认某条推理成立。

【寻找“排他性来源”】
问清楚这条信息是否只能由真身份获得。平安夜不是任何单一女巫或守卫的独占功劳；公开死讯也人人都能复述。相反，完整且没有倒填痕迹的逐夜记录、与系统公开结果交叉吻合的信息、真实技能兑现，权重更高。发现矛盾时先排除本局存在的守护、换位、反弹、封锁和连带机制。

真实行动记录和公开证明不是一回事：真神报告自己的私密记录没有错，也没有义务替每个闭眼玩家解释全部分支；但其他玩家只能把它当作待核验声明。反过来，真神某段推理出错、表达不完整或没有说服全场，也不会抹掉其真实行动。

【女巫：跳藏按诉求，避免无计划半跳】
· 女巫用解药后，跳与不跳都是标准打法。想竞选警长、掌握归票权、给好人一张银水、或替真预言家分担狼刀时，跳出来报完整用药记录是正当选择；想保住刀口通道和暗处毒药时，继续隐藏同样正当。按当前局势算收益，不预设默认答案。
· 完整真报或完全隐藏是两条低污染标准路线。部分披露或虚报药账并非规则禁止，但属于高污染博弈：必须有明确短期目标、能说明如何获利，并准备被压测后的澄清或退出条件。没有这些计划时，只说“我知道昨晚的事但不方便说”通常最差——狼能锁定你，好人却拿不到账本。
· 被救者是银水不是查验金水，仍可能是自刀狼；平安夜也可能来自守护、禁刀等其他机制，报记录时把"我做了什么"和"这证明了什么"分开。

【其他真神是否对跳，也要算公开价值】
· 预言家等持续产出查验的角色若沉默会让假神长期控制归票，可以带真实记录回应；这条不能机械套到守卫、魔术师等依赖隐藏行动的角色；女巫按上一条自行决定。
· 守卫、魔术师、子狐等依赖隐藏行动的角色，不必因为一句冒充立刻自曝；可以先用问题压测对方，让其提交完整账本。
· 但“隐藏型角色永远不对跳”同样错误。假神即将造成关键误投、骗取技能或形成不可逆公信力时，公开真实记录可能比继续潜伏更值。
· 对跳不是比谁更激动。要求双方给出具体记录、未来兑现点和解释不了的风险，再结合票型判断。

【假身份不等于狼人】
当你知道对方不是唯一真身份时，只能确定其身份声明为假，不能直接确定其阵营。必须比较三种解释：狼人悍跳、好人挡刀、其他好人救场或误判。记录不一致只证明双方不能都是真身份；记录一致也可能来自公开信息或照抄，不能自证。
先看假身份是否编造污染性硬信息、是否夺取关键归票或攻击真神、在真实记录压测后是否愿意降级退水，以及其票型最终让哪一方获利。好人挡刀通常追求吸刀且减少误导，真神出现后愿意退出；狼人通常需要维持外壳并把真神推走，但这些仍需结合具体行为验证。除非存在排他矛盾或明确狼队收益，公开表达应是“假身份，狼与好人挡刀都要盘”，而不是“铁狼”。

【防止被优秀悍跳者绑定】
悍跳者可能主动卖狼、跟票狼队友、说大量真话甚至做出正确推理来换信用。这些行为可以增加可信度，但不能兑换“此后永久免验”。每天重新检查：他的最新行为是否仍让狼人获利？最初建立信任的那条证据是否仍成立？不要因为他曾经带对一次就把后续判断全部外包给他。`
    },
    {
      id: 'wb_whitecat_decoy',
      name: '白猫专精：诈守卫吸刀与安全退水',
      description: '让白猫真正发挥缓死价值，同时减少假信息对好人的伤害。',
      enabled: true,
      priority: 98,
      roles: ['whitecat'],
      teams: ['good'],
      phases: ['day', 'sheriff', 'vote'],
      content: `【你的价值是骗狼刀，不是骗好人票】
不要主动报“我是白猫”。缓死触发时系统自然会公开身份；提前自曝只会告诉狼人绕开你。也不要主动要求大家投你“验身份”，放逐可能浪费好人最关键的一轮。

【优先选择低污染的诱饵身份】
通常优先诈守卫，其次可考虑猎人：它们能制造狼刀顾忌，却不要求你每天编造查验结果或虚构毒杀名单。诈预言家、女巫会向好人投放大量假硬信息，除非你有明确的短期救场目标、知道怎样快速退水，并确认误导成本低于吸刀收益，否则不要选。

【诈守卫的实操】
· 起跳目标要明确：让狼以为你能持续挡刀，从而优先处理你，或替正在工作的真神挡一夜。
· 可以声明守卫并暂不公开完整路线，但不要认领一个自己无法确认的平安夜，也不要编造违反“不能连续守同一人”的记录。
· 被追问时维持一份简单、合法、前后一致的守护账；少说比为了显真而越编越多更安全。
· 真守卫若带着明确记录出来纠正，或你的假身份开始造成好人误投，应及时退水，说明自己是好人挡刀但暂不公开真实底牌。不要为了面子和真神互打到底。

【每轮检查退出条件】
若狼已经不可能再相信、真神因你被迫暴露、好人准备在两个“守卫”中强行出人，或你的说法即将污染关键技能账本，立刻降级或退水。若你真的吃刀触发缓死，利用公开白猫身份解释之前的诱饵逻辑，并把最后一轮用于整理票型和保护仍隐藏的神职。`
    },
    {
      id: 'wb_advanced_night_records',
      name: '神职进阶：公开计划、暗线行动与账本',
      description: '面向子狐与守卫的夜间信息管理，避免公开计划被反制或把结果说成铁证。',
      enabled: true,
      priority: 93,
      roles: ['fox', 'guard'],
      teams: ['good'],
      phases: ['night', 'day'],
      content: `【公开计划不是已经执行的行动】
白天宣布“今晚查、魅惑或守护某人”只是公开计划，不是已执行的系统事实。若本局存在能反弹、封锁或预判技能的角色，夜间可根据最新合法信息改变目标；对外也不必自动交出实际记录。

【真实账本与公开口径分离】
你在内部必须保存真实的逐夜行动、系统反馈和资源状态，并按真账本推理与执行合法行动；不得因为对外说过另一套，就改写实际历史或把假口径当成系统反馈。
对外发言可根据阵营收益选择完整公开、暂缓公开、仅报部分记录，或给出合法但不真实的行动口径。公开声称不会改变真实行动，也不会自动获得系统验证。
守卫报出上一夜目标会直接暴露不能连守的保护空档；魔术师、子狐等角色公开行动偏好也可能被针对，因此隐藏或虚报有时具备战术价值。预言家假验人、女巫假药账等会直接污染好人归票的说法，只能在有明确短期目标和退出条件时使用。出口前评估友军技能冲突、误导好人、后续自证与澄清成本，不要机械交账，也不要为了显得高端而机械撒谎。

【子狐】
若公开目标很可能被蚀时狼妃针对，可以改查未广播的高价值位置，降低被反制概率；也可以反向利用公开计划诱导对手。是否改目标取决于公开目标价值、对手反制概率和替代目标收益，不是“每次都必须绕开”。收到系统明确的反弹、落空或作用于自身反馈时，要按真实反馈更新判断，不能继续把原目标当成已经验证的好人。

【守卫】
保存包括空守在内的真实逐夜账本，但是否对外交出、交多少、是否用一份合法假路线隐藏今晚的保护空档，由当前局势决定。例如真实记录是“上一夜守A”时，直接公开会让狼知道今晚不能再守A；暂不报或虚报另一合法目标都可能是正当选择。但假路线也会误导好人和女巫，必须与已公开记录前后相容，并在关键对跳、致命票型或友军技能需要真记录时评估是否澄清。
你空守而出现平安夜，只能证明平安夜不是由你的守护造成；它可以提高女巫救人、狼刀被封锁等解释的概率，却不能单独证明某个女巫声明必真或必假。只有对方声称了与你私密真记录不可能同时成立的具体事实，才形成身份声明上的硬矛盾。即使选择公开真账本，也要区分“我确定自己做了什么”和“因此我猜测发生了什么”。`
    },
    {
      id: 'wb_advanced_wolf_skills',
      name: '技能狼进阶：反制、连带与收益计算',
      description: '让狼妃、狼美人等技能狼按期望收益行动，而不是照搬单局答案。',
      enabled: true,
      priority: 93,
      roles: ['wolfconcubine', 'wolfbeauty', 'werewolf', 'wolfking', 'whitewolf'],
      teams: ['bad'],
      phases: ['night', 'day', 'vote'],
      content: `【技能不是固定连招，先比较每条分支的阵营收益】
蚀时狼妃选择锁定目标时，同时计算：保护队友免受某项技能、把技能反弹给施法者、封住关键好人，以及反馈可能暴露反制存在的风险。锁队友并非天然错误，锁好人也并非天然正确；要看子狐或神职最可能作用谁，以及反弹后实际受益者是谁。

狼美人的魅惑目标不只为“立即达到狼数不少于好人数”服务。即使不能当夜终局，连带带走关键神职、警长或决定性好人，也可能换来后续轮次优势；反过来，为了带走低价值目标而主动暴露关系通常不值。每晚比较目标价值、自己出局概率、连带后的白天票型和即时胜负。

卖队友、倒钩和技能换人头都属于交易，不是身份洗白券。只有当牺牲带来的警徽、轮次、关键神职死亡或隐藏狼生存概率，明显超过失去一名狼的成本时才值得执行。`
    }
  ];

  const UI_EN = /\/en(?:\/|$)/.test(location.pathname);
  const UI = UI_EN ? {
    modes:{official:'Official teaching',custom:'Custom worldbooks',hybrid:'Hybrid',clean:'Clean mode'},
    empty:'No custom teaching worldbooks yet. Choose “Write a worldbook” and type the teaching prompt directly.', priority:'Priority', global:'Global',
    edit:'Edit', export:'Export', remove:'Delete', enable:'Enable this worldbook', confirmDelete:name=>`Delete “${name}”?`,
    needName:'Enter a worldbook name', needContent:'Enter teaching prompt content', tooLarge:'Worldbook file cannot exceed 2MB',
    imported:n=>`Imported ${n} teaching worldbook(s)`, importFailed:e=>'Import failed: '+e
  } : {
    modes:{official:'官方教学',custom:'自定义世界书',hybrid:'混合模式',clean:'纯净模式'},
    empty:'还没有自定义教学世界书。点击“手写新世界书”，直接写下希望 AI 遵循的教学提示词。', priority:'优先级', global:'全局生效',
    edit:'编辑', export:'导出', remove:'删除', enable:'启用这本世界书', confirmDelete:name=>`删除世界书“${name}”？`,
    needName:'请填写世界书名称', needContent:'请填写教学提示词内容', tooLarge:'世界书文件不能超过 2MB',
    imported:n=>`已导入 ${n} 本教学世界书`, importFailed:e=>'导入失败：'+e
  };

  let state = { mode: 'official', maxChars: 12000, books: [] };
  let onChange = function () {};
  let getContext = function () { return {}; };
  let generateDraft = null;

  const el = id => document.getElementById(id);
  const uid = () => 'wb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const listify = value => {
    const arr = Array.isArray(value) ? value : String(value || '').split(/[,，\n]/);
    return [...new Set(arr.map(x => String(x || '').trim()).filter(Boolean))];
  };
  const clamp = (n, min, max, fallback) => {
    n = Number(n);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
  };
  const normalizedPhase = phase => {
    phase = String(phase || '').toLowerCase();
    if (phase === 'night') return 'night';
    if (phase.includes('sheriff')) return 'sheriff';
    if (phase.includes('vote') || phase.includes('trial') || phase.includes('duel')) return 'vote';
    if (phase.includes('end') || phase.includes('over') || phase.includes('mvp')) return 'ending';
    return 'day';
  };

  function normalizeBook(raw, index) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const teams = listify(raw.teams || raw.team).filter(x => VALID_TEAMS.has(x));
    const phases = listify(raw.phases || raw.phase).map(x => normalizedPhase(x)).filter(x => VALID_PHASES.has(x));
    return {
      id: String(raw.id || uid()),
      name: String(raw.name || raw.title || raw.comment || ('世界书 ' + (index + 1))).trim().slice(0, 80) || ('世界书 ' + (index + 1)),
      description: String(raw.description || raw.desc || '').trim().slice(0, 500),
      content: String(raw.content || raw.prompt || '').trim().slice(0, MAX_CONTENT),
      enabled: raw.enabled !== false && raw.disable !== true,
      roles: listify(raw.roles || raw.role),
      excludeRoles: listify(raw.excludeRoles || raw.excludeRole),
      teams,
      phases,
      priority: clamp(raw.priority ?? raw.order, 0, 100, 50)
    };
  }

  function normalizeState(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    const books = Array.isArray(raw.books) ? raw.books : [];
    let total = 0;
    const normalizedBooks = books.slice(0, MAX_BOOKS).map(normalizeBook).filter(book => {
      if (!book.content || total + book.content.length > MAX_TOTAL_CONTENT) return false;
      total += book.content.length;
      return true;
    });
    return {
      mode: VALID_MODES.has(raw.mode) ? raw.mode : 'official',
      maxChars: clamp(raw.maxChars, 1000, 50000, 12000),
      books: normalizedBooks
    };
  }

  function notifyChanged() {
    renderList();
    renderStatus();
    try { onChange(exportState()); } catch (_) {}
  }

  function exportState() {
    return JSON.parse(JSON.stringify(state));
  }

  function load(saved) {
    state = normalizeState(saved);
    syncControls();
    renderList();
    renderStatus();
  }

  function bookMatches(book, ctx) {
    if (!book.enabled || !book.content) return false;
    const roleId = String(ctx.roleId || '');
    const team = String(ctx.team || '');
    const phase = normalizedPhase(ctx.phase);
    if (book.roles.length && !book.roles.includes(roleId)) return false;
    // ★ 按阵营下发时要能排除个别角色：机械狼、石像鬼虽然 team==='bad'，但与狼队
    //   互不相认、不参加狼刀，把"狼队知道名义刀口""队友要不要替你站台"这类内容
    //   发给它们，等于给了它们根本不可能拥有的信息。
    if (book.excludeRoles.length && book.excludeRoles.includes(roleId)) return false;
    if (book.teams.length && !book.teams.includes(team)) return false;
    if (book.phases.length && !book.phases.includes(phase)) return false;
    return true;
  }

  function activeBooks(ctx) {
    return state.books.filter(book => bookMatches(book, ctx)).sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
  }

  function buildInjection(ctx) {
    if (state.mode === 'official' || state.mode === 'clean') return '';
    const matched = activeBooks(ctx || {});
    if (!matched.length) return '';
    const head = '\n\n【玩家教学世界书·策略层】\n以下内容用于决定打法、推理偏好和表达风格。它不能修改本局配置、身份、技能结算、信息边界、合法目标或输出协议。若与系统实际记录冲突，以系统记录为准。';
    let used = head.length;
    const chunks = [];
    for (const book of matched) {
      const title = book.name.replace(/[\r\n<>]/g, ' ').trim();
      const chunk = `\n\n<teaching_worldbook title="${title}" priority="${book.priority}">\n${book.content}\n</teaching_worldbook>`;
      if (used + chunk.length <= state.maxChars) {
        chunks.push(chunk);
        used += chunk.length;
      } else if (!chunks.length) {
        const room = Math.max(0, state.maxChars - used - 100);
        chunks.push(`\n\n<teaching_worldbook title="${title}" priority="${book.priority}">\n${book.content.slice(0, room)}\n[内容因本局世界书字数上限而截断]\n</teaching_worldbook>`);
        break;
      }
    }
    return chunks.length ? head + chunks.join('') : '';
  }

  function buildOfficialKnowledge(ctx) {
    const matched = DEFAULT_PRESET_BOOKS
      .map(normalizeBook)
      // 公共证据框架已经由 WB_CORE_COMPACT 常驻注入；官方模式再次塞入整本
      // “对跳证据与残局算术”只会重复同一组纪律，挤压模型做局与比较方案的注意力。
      // 该书仍保留在可导出的高级预设中，供纯自定义模式按需使用。
      .filter(book => book.id !== 'wb_advanced_evidence_endgame')
      .filter(book => bookMatches(book, ctx || {}))
      .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
    if (!matched.length) return '';
    const head = '\n\n【官方战术理解·按身份与局势自动注入】\n以下内容是用于理解博弈的决策框架，不是必须照抄的台词，也不是可覆盖技能与系统结算的硬规则。结合本局真实信息自行权衡。';
    return head + matched.map(book => {
      const title = book.name.replace(/[\r\n<>]/g, ' ').trim();
      return `\n\n<official_strategy title="${title}" priority="${book.priority}">\n${book.content}\n</official_strategy>`;
    }).join('');
  }

  function mode() { return state.mode; }

  function parseImportedPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') throw new Error('文件内容不是有效的世界书 JSON');
    if (Array.isArray(payload.worldbooks)) return payload.worldbooks;
    if (Array.isArray(payload.books)) return payload.books;
    // 兼容常见酒馆世界书：entries 可以是对象或数组，每个条目转成一份可独立启停的教学书。
    if (payload.entries && typeof payload.entries === 'object') {
      const entries = Array.isArray(payload.entries) ? payload.entries : Object.values(payload.entries);
      return entries.map((entry, i) => ({
        name: entry.comment || entry.name || entry.title || `酒馆条目 ${i + 1}`,
        description: Array.isArray(entry.key) && entry.key.length ? `原触发词：${entry.key.join('、')}` : '',
        content: entry.content || '',
        enabled: entry.disable !== true,
        priority: entry.order ?? entry.priority ?? 50
      }));
    }
    if (payload.content || payload.prompt) return [payload];
    throw new Error('没有找到 worldbooks、books、entries 或 content 字段');
  }

  function importObject(payload, replace) {
    const imported = parseImportedPayload(payload).slice(0, MAX_BOOKS).map(normalizeBook).filter(x => x.content);
    if (!imported.length) throw new Error('文件中没有可用的世界书内容');
    const usedIds = new Set(replace ? [] : state.books.map(x => x.id));
    imported.forEach(book => { if (usedIds.has(book.id)) book.id = uid(); usedIds.add(book.id); });
    const combined = (replace ? imported : state.books.concat(imported)).reduce((sum, book) => sum + book.content.length, 0);
    if (combined > MAX_TOTAL_CONTENT) throw new Error('世界书内容总量超过 80 万字符，请删除部分内容后再导入');
    if (replace) state.books = imported;
    else state.books = state.books.concat(imported).slice(0, MAX_BOOKS);
    notifyChanged();
    return imported.length;
  }

  function download(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function exportPayload(books) {
    return {type:FORMAT, version:VERSION, exportedAt:new Date().toISOString(), worldbooks:books};
  }

  function renderStatus() {
    const node = el('twb-status');
    if (!node) return;
    const ctx = getContext() || {};
    const active = activeBooks(ctx).length;
    const base = UI_EN
      ? `${UI.modes[state.mode]} · ${state.books.length} saved · ${active} match current conditions`
      : `${UI.modes[state.mode]} · 已保存 ${state.books.length} 本 · 当前条件匹配 ${active} 本`;
    const roleIds = Array.isArray(ctx.rolesInGame) ? [...new Set(ctx.rolesInGame.filter(Boolean))] : [];
    node.textContent = base + (roleIds.length ? (UI_EN ? ` · Role IDs in this game: ${roleIds.join(', ')}` : ` · 本局身份ID：${roleIds.join('、')}`) : '');
  }

  function renderList() {
    const root = el('twb-list');
    if (!root) return;
    root.innerHTML = '';
    if (!state.books.length) {
      const empty = document.createElement('div');
      empty.className = 'twb-empty';
      empty.textContent = UI.empty;
      root.appendChild(empty);
      return;
    }
    state.books.slice().sort((a,b) => b.priority-a.priority).forEach(book => {
      const row = document.createElement('div');
      row.className = 'twb-row';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox'; toggle.checked = book.enabled;
      toggle.title = UI.enable;
      toggle.addEventListener('change', () => { book.enabled = toggle.checked; notifyChanged(); });
      const info = document.createElement('div'); info.className = 'twb-info';
      const name = document.createElement('strong'); name.textContent = book.name;
      const meta = document.createElement('span');
      const scope = [book.roles.length ? (UI_EN?'Roles:':'身份:')+book.roles.join('/') : '', book.teams.length ? (UI_EN?'Teams:':'阵营:')+book.teams.join('/') : '', book.phases.length ? (UI_EN?'Phases:':'阶段:')+book.phases.join('/') : ''].filter(Boolean).join(' · ');
      meta.textContent = `${UI.priority} ${book.priority}${scope ? ' · '+scope : ' · '+UI.global}`;
      const preview = document.createElement('small'); preview.textContent = book.description || book.content.slice(0, 90);
      info.append(name, meta, preview);
      const actions = document.createElement('div'); actions.className = 'twb-actions';
      const edit = document.createElement('button'); edit.type='button'; edit.textContent=UI.edit; edit.onclick=()=>openEditor(book.id);
      const out = document.createElement('button'); out.type='button'; out.textContent=UI.export; out.onclick=()=>download(`${safeFilename(book.name)}.json`, exportPayload([book]));
      const del = document.createElement('button'); del.type='button'; del.textContent=UI.remove; del.className='danger'; del.onclick=()=>{ if(confirm(UI.confirmDelete(book.name))){ state.books=state.books.filter(x=>x.id!==book.id); notifyChanged(); } };
      actions.append(edit,out,del);
      row.append(toggle,info,actions);
      root.appendChild(row);
    });
  }

  function safeFilename(name) {
    return String(name || '狼人杀教学世界书').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
  }

  function openEditor(id) {
    const book = state.books.find(x => x.id === id) || null;
    setDraftStatus(UI_EN ? 'Write a rough idea first. This reuses the global API and never saves or enables the result automatically.' : '先随便写一句想法即可。复用全局 API，生成结果不会自动保存或启用。');
    el('twb-edit-id').value = book ? book.id : '';
    el('twb-edit-name').value = book ? book.name : '';
    el('twb-edit-desc').value = book ? book.description : '';
    el('twb-edit-content').value = book ? book.content : '';
    el('twb-edit-roles').value = book ? book.roles.join(', ') : '';
    el('twb-edit-teams').value = book ? book.teams.join(', ') : '';
    el('twb-edit-phases').value = book ? book.phases.join(', ') : '';
    el('twb-edit-priority').value = book ? book.priority : 50;
    el('twb-main-view').style.display = 'none';
    el('twb-edit-view').style.display = 'flex';
  }

  function closeEditor() {
    setDraftStatus('');
    el('twb-edit-view').style.display = 'none';
    el('twb-main-view').style.display = 'block';
  }

  function setDraftStatus(message, kind) {
    const node = el('twb-ai-status');
    if (!node) return;
    node.textContent = message || '';
    node.dataset.kind = kind || '';
  }

  async function polishDraft() {
    const input = el('twb-edit-content');
    const button = el('twb-ai-polish');
    const idea = input.value.trim();
    if (!idea) return alert(UI_EN ? 'Write your rough idea first' : '请先写下一句或几句大致想法');
    if (typeof generateDraft !== 'function') return setDraftStatus(UI_EN ? 'AI drafting is unavailable on this page' : '当前页面暂不支持 AI 整理', 'error');
    button.disabled = true;
    setDraftStatus(UI_EN ? 'AI is organizing your draft…' : 'AI 正在整理草稿…', 'loading');
    try {
      const result = await generateDraft(idea, {
        name: el('twb-edit-name').value.trim(),
        description: el('twb-edit-desc').value.trim()
      });
      const content = String(result || '').trim();
      if (!content) throw new Error(UI_EN ? 'The model returned empty content' : '模型返回了空内容');
      input.value = content.slice(0, MAX_CONTENT);
      input.focus();
      setDraftStatus(UI_EN ? 'Draft organized. Review and edit it before saving.' : '草稿已整理，请检查、修改后再保存。', 'success');
    } catch (err) {
      setDraftStatus((UI_EN ? 'Generation failed: ' : '生成失败：') + (err && err.message ? err.message : err), 'error');
    } finally {
      button.disabled = false;
    }
  }

  function saveEditor() {
    const name = el('twb-edit-name').value.trim();
    const content = el('twb-edit-content').value.trim();
    if (!name) return alert(UI.needName);
    if (!content) return alert(UI.needContent);
    const raw = {
      id: el('twb-edit-id').value || uid(), name,
      description: el('twb-edit-desc').value,
      content,
      roles: listify(el('twb-edit-roles').value),
      teams: listify(el('twb-edit-teams').value),
      phases: listify(el('twb-edit-phases').value),
      priority: el('twb-edit-priority').value,
      enabled: true
    };
    const book = normalizeBook(raw, state.books.length);
    const index = state.books.findIndex(x => x.id === book.id);
    const total = state.books.reduce((sum, item, i) => sum + (i === index ? 0 : item.content.length), 0) + book.content.length;
    if (total > MAX_TOTAL_CONTENT) return alert(UI_EN ? 'Total worldbook content cannot exceed 800,000 characters' : '世界书内容总量不能超过 80 万字符');
    if (index >= 0) book.enabled = state.books[index].enabled;
    if (index >= 0) state.books[index] = book; else state.books.push(book);
    closeEditor();
    notifyChanged();
  }

  function syncControls() {
    if (el('twb-mode')) el('twb-mode').value = state.mode;
    if (el('twb-max-chars')) el('twb-max-chars').value = state.maxChars;
  }

  function injectStyles() {
    if (el('twb-style')) return;
    const style = document.createElement('style');
    style.id = 'twb-style';
    style.textContent = `
      .twb-toolbar{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:9px 0}.twb-toolbar select,.twb-toolbar input{min-width:120px}
      .twb-note{padding:9px 11px;border:1px solid rgba(184,154,91,.28);background:rgba(184,154,91,.06);border-radius:8px;color:#a9a0ba;font-size:.72em;line-height:1.6}
      .twb-list{display:flex;flex-direction:column;gap:7px;max-height:42vh;overflow:auto;margin-top:10px}.twb-empty{padding:28px;text-align:center;color:#777087;border:1px dashed rgba(184,154,91,.22);border-radius:9px}
      .twb-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px;border:1px solid rgba(184,154,91,.2);background:rgba(20,17,28,.72);border-radius:9px}.twb-row>input{min-width:auto;width:auto}
      .twb-info{min-width:0;display:flex;flex-direction:column;gap:2px}.twb-info strong{color:#e2c98d}.twb-info span{font-size:.67em;color:#9087a0}.twb-info small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#aaa1ba}
      .twb-actions{display:flex;gap:5px}.twb-actions button{padding:5px 8px;font-size:.7em}.twb-actions .danger{color:#d98a98;border-color:rgba(217,92,112,.35)}
      .twb-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.twb-edit-grid .wide{grid-column:1/-1}.twb-edit-grid label{display:flex;flex-direction:column;gap:4px;font-size:.72em;color:#9f96ae}.twb-edit-grid input,.twb-edit-grid textarea{max-width:none;width:100%}
      .twb-ai-help{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:8px 10px;border:1px solid rgba(139,112,190,.22);background:rgba(104,76,148,.06);border-radius:8px}.twb-ai-help button{padding:6px 12px}.twb-ai-help small{color:#8f879d;line-height:1.45}.twb-ai-help [data-kind="loading"]{color:#c6a7e8}.twb-ai-help [data-kind="success"]{color:#8bc9b3}.twb-ai-help [data-kind="error"]{color:#df8e9e}
      .twb-advanced{margin-top:2px;padding:8px 10px;border:1px solid rgba(184,154,91,.18);border-radius:8px;background:rgba(255,255,255,.025)}.twb-advanced summary{cursor:pointer;color:#a99db8;font-size:.74em;margin-bottom:7px}.twb-advanced>.twb-edit-grid{padding-top:4px}
      @media(max-width:700px){.twb-row{grid-template-columns:auto minmax(0,1fr)}.twb-actions{grid-column:1/-1;justify-content:flex-end}.twb-edit-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (el('teaching-wb-modal')) return;
    const en = UI_EN;
    const modal = document.createElement('div');
    modal.className = 'epop';
    modal.id = 'teaching-wb-modal';
    modal.innerHTML = en ? `
      <div class="ebox" style="max-width:820px;width:94%">
        <h3>Teaching Worldbooks</h3>
        <div id="twb-main-view">
          <div class="twb-note">Worldbooks control AI strategy, reasoning preferences, and speaking style only. Game identity, skill resolution, information boundaries, legal targets, and output protocol remain protected hard rules.</div>
          <div class="twb-toolbar">
            <label>Injection mode <select id="twb-mode"><option value="official">Official teaching</option><option value="custom">Custom only</option><option value="hybrid">Official + custom</option><option value="clean">Clean (no teaching)</option></select></label>
            <label>Maximum characters <input id="twb-max-chars" type="number" min="1000" max="50000" step="500" value="12000"></label>
            <button type="button" id="twb-add">Write a worldbook</button>
            <label class="be" style="cursor:pointer">Import file (optional)<input type="file" id="twb-import-file" accept=".json,.txt,application/json,text/plain" style="display:none"></label>
            <button type="button" id="twb-export-all">Export all</button>
          </div>
          <div id="twb-status" style="font-size:.7em;color:#9b91aa"></div><div id="twb-list" class="twb-list"></div>
          <div class="btns"><button type="button" id="twb-close">Close</button></div>
        </div>
        <div id="twb-edit-view" style="display:none;flex-direction:column;gap:10px">
          <input type="hidden" id="twb-edit-id"><div class="twb-edit-grid">
            <label class="wide">Worldbook name<input id="twb-edit-name" maxlength="80" placeholder="e.g. Competitive logic"></label>
            <label class="wide">Write the teaching prompt<textarea id="twb-edit-content" maxlength="100000" placeholder="Tell the AI how to reason, claim roles, vote, cooperate, and speak. Plain language is enough; no JSON format is needed." style="height:360px;resize:vertical"></textarea></label>
            <label class="wide">Description (optional)<input id="twb-edit-desc" maxlength="500" placeholder="A short note for yourself"></label>
            <details class="wide twb-advanced"><summary>Advanced activation settings (optional)</summary><div class="twb-edit-grid">
              <label>Priority (0-100)<input id="twb-edit-priority" type="number" min="0" max="100" value="50"></label>
              <label>Player role IDs<input id="twb-edit-roles" placeholder="seer, witch; blank = all"></label>
              <label>Teams<input id="twb-edit-teams" placeholder="good, bad, third; blank = all"></label>
              <label>Phases<input id="twb-edit-phases" placeholder="night, day, sheriff, vote, ending; blank = all"></label>
            </div></details>
          </div><div class="twb-ai-help"><button type="button" id="twb-ai-polish">Polish with AI</button><small id="twb-ai-status">Write a rough idea first. This reuses the global API and never saves or enables the result automatically.</small></div><div class="btns"><button type="button" id="twb-edit-save">Save worldbook</button><button type="button" id="twb-edit-cancel">Cancel</button></div>
        </div>
      </div>` : `
      <div class="ebox" style="max-width:820px;width:94%">
        <h3>教学世界书</h3>
        <div id="twb-main-view">
          <div class="twb-note">世界书只控制 AI 的打法、推理偏好和表达风格。身份、技能结算、信息边界、合法目标和输出格式仍由游戏硬规则保护，世界书不能覆盖。</div>
          <div class="twb-toolbar">
            <label>注入模式 <select id="twb-mode"><option value="official">官方教学</option><option value="custom">仅自定义世界书</option><option value="hybrid">官方教学＋自定义</option><option value="clean">纯净模式（无教学）</option></select></label>
            <label>每次最多注入字符 <input id="twb-max-chars" type="number" min="1000" max="50000" step="500" value="12000"></label>
            <button type="button" id="twb-add">手写新世界书</button>
            <label class="be" style="cursor:pointer">从文件导入（可选）<input type="file" id="twb-import-file" accept=".json,.txt,application/json,text/plain" style="display:none"></label>
            <button type="button" id="twb-export-all">导出全部</button>
          </div>
          <div id="twb-status" style="font-size:.7em;color:#9b91aa"></div><div id="twb-list" class="twb-list"></div>
          <div class="btns"><button type="button" id="twb-close">关闭</button></div>
        </div>
        <div id="twb-edit-view" style="display:none;flex-direction:column;gap:10px">
          <input type="hidden" id="twb-edit-id"><div class="twb-edit-grid">
            <label class="wide">世界书名称<input id="twb-edit-name" maxlength="80" placeholder="例：高阶竞技逻辑流"></label>
            <label class="wide">直接手写教学提示词<textarea id="twb-edit-content" maxlength="100000" placeholder="直接告诉 AI 应该怎样推理、跳身份、投票、配合和发言。写普通文字即可，不需要 JSON 格式。" style="height:360px;resize:vertical"></textarea></label>
            <label class="wide">简介（可不填）<input id="twb-edit-desc" maxlength="500" placeholder="给自己看的简短说明"></label>
            <details class="wide twb-advanced"><summary>高级生效范围（可不设置）</summary><div class="twb-edit-grid">
              <label>优先级（0-100）<input id="twb-edit-priority" type="number" min="0" max="100" value="50"></label>
              <label>限定玩家身份 ID<input id="twb-edit-roles" placeholder="例：seer, witch；留空=全部"></label>
              <label>限定阵营<input id="twb-edit-teams" placeholder="good, bad, third；留空=全部"></label>
              <label>限定阶段<input id="twb-edit-phases" placeholder="night, day, sheriff, vote, ending；留空=全部"></label>
            </div></details>
          </div><div class="twb-ai-help"><button type="button" id="twb-ai-polish">让 AI 帮我整理</button><small id="twb-ai-status">先随便写一句想法即可。复用全局 API，生成结果不会自动保存或启用。</small></div><div class="btns"><button type="button" id="twb-edit-save">保存世界书</button><button type="button" id="twb-edit-cancel">取消</button></div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function initUI(options) {
    options = options || {};
    onChange = typeof options.onChange === 'function' ? options.onChange : onChange;
    getContext = typeof options.getContext === 'function' ? options.getContext : getContext;
    generateDraft = typeof options.generateDraft === 'function' ? options.generateDraft : generateDraft;
    injectStyles();
    ensureModal();
    const open = el('btn-teaching-wb');
    if (!open || open.dataset.bound === '1') return;
    open.dataset.bound = '1';
    open.addEventListener('click', () => { syncControls(); renderList(); renderStatus(); el('teaching-wb-modal').classList.add('show'); });
    el('twb-close').addEventListener('click', () => el('teaching-wb-modal').classList.remove('show'));
    el('twb-add').addEventListener('click', () => openEditor(''));

    el('twb-edit-cancel').addEventListener('click', closeEditor);
    el('twb-edit-save').addEventListener('click', saveEditor);
    el('twb-ai-polish').addEventListener('click', polishDraft);
    el('twb-mode').addEventListener('change', e => { state.mode = VALID_MODES.has(e.target.value) ? e.target.value : 'official'; notifyChanged(); });
    el('twb-max-chars').addEventListener('change', e => { state.maxChars = clamp(e.target.value,1000,50000,12000); e.target.value=state.maxChars; notifyChanged(); });
    el('twb-export-all').addEventListener('click', () => download('狼人杀教学世界书.json', exportPayload(state.books)));
    el('twb-import-file').addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > MAX_IMPORT_BYTES) return alert(UI.tooLarge);
      try {
        const rawText = await file.text();
        let payload;
        try { payload = JSON.parse(rawText); }
        catch (jsonError) {
          if (!/\.txt$/i.test(file.name)) throw jsonError;
          payload = {name:file.name.replace(/\.txt$/i,''), description:'Imported from plain text', content:rawText};
        }
        const count = importObject(payload, false);
        alert(UI.imported(count));
      } catch (err) { alert(UI.importFailed(err.message || err)); }
    });
    syncControls(); renderList(); renderStatus();
  }

  window.TeachingWorldbooks = {load, exportState, buildInjection, buildOfficialKnowledge, activeBooks, mode, initUI, importObject, format:FORMAT, version:VERSION};
})();
