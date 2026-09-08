(function () {
  'use strict';

  const STORAGE_KEY = 'wolf-ui-language';
  const ROLE_EN = {
    werewolf:{name:'Werewolf',desc:'Wolf team. Discusses and votes with the pack to attack one player each night.'},
    wolfking:{name:'Wolf King',desc:'Wolf team. Joins the nightly attack; when eliminated by vote or a night attack, may bite one player. Poison and a Knight duel suppress the bite.'},
    wolfbeauty:{name:'Wolf Beauty',desc:'Wolf team. Joins the nightly attack and charms one player each night; when she leaves the game, the current target dies with her unless the game has already ended.'},
    seer:{name:'Seer',desc:'Good team. Checks one player each night and learns whether that player is good or wolf-aligned.'},
    witch:{name:'Witch',desc:'Good team. Has one antidote and one poison. Each potion can be used once.'},
    hunter:{name:'Hunter',desc:'Good team. When eliminated by vote or a night attack, may shoot one player. Poison suppresses the shot.'},
    guard:{name:'Guard',desc:'Good team. Protects one player from night attacks each night and cannot protect the same target on consecutive nights.'},
    knight:{name:'Knight',desc:'Good team. May publicly duel a player: a wolf target dies; against a good target, only the Knight dies.'},
    magician:{name:'Magician',desc:'Good team. Acts first each night and may swap two living seat numbers. The swap redirects only the wolf attack.'},
    whitecat:{name:'White Cat',desc:'Good-team power role; it counts as a god role for edge-victory god wipe. When eliminated by any method, it is revealed and its death is deferred until the next matching phase; it remains alive and may speak and vote during the reprieve.'},
    fox:{name:'Fox Cub',desc:'Good team. Each night may block a target’s skill or block a wolf attack aimed at that target.'},
    fool:{name:'Fool',desc:'Good team. Has one shared survival charge: survive the first daytime exile, or place a nightly shield that returns to the Fool if its target is not attacked.'},
    merchant:{name:'Miracle Merchant',desc:'Good team. Once per game grants a trusted player a shield, recurring investigation, or poison. Granting a wolf backfires and eliminates the Merchant.'},
    youshang:{name:'Traveling Merchant',desc:'Good team. Each night may grant a different trusted player a shield, investigation, or poison for that night only. Granting a wolf backfires.'},
    wolfconcubine:{name:'Eclipse Consort',desc:'Wolf team. Each night marks a player; the first investigation, protection, or poison aimed there reflects to its user. Reflected investigation/protection is not lethal.'},
    villager:{name:'Villager',desc:'Good team. Has no night ability and relies on discussion, voting, and behavioral reads.'},
    whitewolf:{name:'White Wolf King',desc:'Wolf team. Joins the nightly attack and may self-destruct during daytime discussion or voting to take one player along.'},
    mechwolf:{name:'Mechanical Wolf',desc:'Wolf team but unknown to the pack. Once per game learns and copies a role; gains its own attack only after all other wolf roles are gone.'},
    jester:{name:'Jester',desc:'Independent. Wins immediately only when exiled by daytime vote or convicted by trial.'},
    cupid:{name:'Cupid',desc:'Good team. On the first night links two players as lovers; cross-team lovers form a hidden lovers faction.'},
    serialkiller:{name:'Serial Killer',desc:'Independent. Attacks separately each night and must be eliminated before either main faction can win.'},
    gravekeeper:{name:'Gravekeeper',desc:'Good team. Each night learns the faction of the player exiled during the previous day.'},
    dreamwalker:{name:'Dreamwalker',desc:'Good team. Sends one player into a protected dream each night; choosing the same player on consecutive nights turns the dream lethal.'},
    alchemist:{name:'Alchemist Witch',desc:'Good team. Once per game may restrict the wolf attack to three players, and once per game may save the actual wolf-attack victim.'},
    gargoyle:{name:'Gargoyle',desc:'Wolf team but unknown to the pack. Checks an exact role each night and gains its own attack after every other wolf is gone.'},
    soulwarden:{name:'Soul Warden',desc:'Good team. Each night places Sanctuary on one living player, cleansing or blocking the first hostile non-damage mark. Cannot choose the same target on consecutive nights.'},
    imitator:{name:'Imitator',desc:'Good team. Each night may study one living player not studied before, copy one compatible active ability for that night, and use it once. At most three studies can succeed.'}
  };
  const ROLE_ZH = {werewolf:'狼人',wolfking:'狼王',wolfbeauty:'狼美人',seer:'预言家',witch:'女巫',hunter:'猎人',guard:'守卫',knight:'骑士',magician:'魔术师',whitecat:'白猫',fox:'子狐',fool:'愚者',merchant:'奇迹商人',youshang:'游商',wolfconcubine:'蚀时狼妃',villager:'村民',whitewolf:'白狼王',mechwolf:'机械狼',jester:'小丑',cupid:'丘比特（爱神）',serialkiller:'连环杀手',gravekeeper:'守墓人',dreamwalker:'摄梦人',alchemist:'炼金魔女',gargoyle:'石像鬼',soulwarden:'净魂师',imitator:'摹术师'};

  const EXACT = {
    '🐺 AI狼人杀 · 多个大模型在线自动对局·可观战':'🐺 AI Werewolf · multi-model autonomous games · spectator mode',
    '🐺 人狼ゲーム':'🐺 WEREWOLF GAME','── 月夜の嘘と真実 ──':'— Lies and Truths Under the Moon —','── キャラクター図鑑 ──':'— Character Compendium —',
    '死亡笔记':'Death Note','魔术快斗':'Magic Kaito','进击的巨人':'Attack on Titan','咒术回战':'Jujutsu Kaisen','狐妖小红娘':'Fox Spirit Matchmaker','天官赐福':'Heaven Official’s Blessing','魔道祖师':'The Founder of Diabolism','全职高手':'The King’s Avatar',
    'AI狼人杀':'AI Werewolf','AI 狼人杀':'AI Werewolf','🐺 AI 狼人杀 · 多个大模型自动对局·可观战':'🐺 AI Werewolf · multi-model autonomous games · spectator mode',
    '多个大模型互相推理、欺骗、结盟，你只管观战。免安装，点开即玩。':'Multiple AI models deduce, deceive, and form alliances while you spectate. No installation required.',
    '多个大模型（GPT / Gemini / DeepSeek / Claude / Qwen）自动开局的 AI 狼人杀：互相推理、欺骗、结盟，你只管观战。免安装在线玩，支持 Android / iPhone。':'An AI Werewolf game powered by GPT, Gemini, DeepSeek, Claude, and Qwen. Watch them deduce, deceive, and form alliances on Android, iPhone, or the web.',
    '多个大模型自动开局，互相推理、欺骗、结盟。你只管观战，看它们互相做局。免安装，点开即玩。':'Multiple AI models play automatically, deducing, deceiving, and forming alliances while you spectate. No installation required.',
    '未登录 · 当前仅保存到本机':'Not signed in · saved locally only','登录 / 注册':'Sign in / Register','云存档':'Cloud saves',
    '上传':'Upload','恢复':'Restore','上传配置':'Upload config','下载配置':'Download config','退出':'Sign out',
    '先看一局 Demo':'Watch a demo first','无需 API Key · 点击即自动观战':'No API key required · click to spectate automatically',
    '十人局':'10 players','十二人局':'12 players','十四人局':'14 players','经典局':'Classic','经典大局':'Large classic',
    '诡术局':'Trickster game','血案局':'Bloodbath','红线局':'Red Thread','自定':'Custom','自由配置':'Free setup','角色与人数':'Roles & players',
    '天机':'Director','纯AI十人':'10-player AI','上帝视角观战':'Omniscient spectator','斗蛐蛐':'AI arena','自定义配置':'Custom setup',
    '群聊':'Group chat','赛后复盘群':'Post-game review','AI 吐槽甩锅互相盘':'AI players roast and blame each other','剧本杀':'Murder mystery','搜证·圆桌·指认':'Investigate · discuss · accuse',
    '观众席':'Audience','启用':'Enable','话多':'Talkative','适中':'Balanced','话少':'Quiet','编辑观众':'Edit audience',
    '好人阵营':'Good team','消灭所有狼人':'Eliminate every wolf','狼人阵营':'Wolf team','好人存活≤狼人即胜':'Win when wolves reach parity',
    '隐藏身份与心声':'Hide roles and inner thoughts','死亡后揭示身份':'Reveal roles after death','死者身份不公开':'Dead roles stay hidden',
    '增加推理难度':'Harder deduction','随机分配性格':'Assign personalities randomly','影响说话风格':'Changes speaking style',
    '十分怀疑时可发起审判':'Start a trial under strong suspicion','全员投票决定去留':'Everyone votes on the verdict','并发':'Concurrency','多路同时请求':'Run multiple requests at once',
    '书写速度可调':'Adjustable response speed','自创角色':'Custom roles','角色生成器':'Role generator','壁纸':'Wallpaper','名字库':'Name library','人设库':'Persona library',
    '名称':'Name','人设':'Persona','保存':'Save','清空':'Clear','取消':'Cancel','返回':'Back','添加':'Add','当前使用默认背景':'Using default background',
    '透明度':'Opacity','模糊度':'Blur','暗化':'Darken','移除壁纸':'Remove wallpaper','总人数':'Total players','存为模式':'Save as mode',
    'AI运行方式':'AI control mode','API 自动扮演（纯AI）':'Automatic API players','网页端AI（复制提示词／粘贴回复）':'Web AI (copy prompt / paste reply)',
    '你的参与方式':'Your participation','纯观战（全部角色由AI扮演）':'Spectate only (all roles are AI)','开始剧本杀':'Start mystery','重新开局':'Restart',
    '开场':'Opening','在场角色':'Characters','复制私密提示词，再粘贴回复':'Copy the private prompt, then paste the reply','提交回复':'Submit reply',
    '角色名':'Role name','第三方':'Independent','技能模板':'Ability template','积木技能':'Ability blocks','可多选叠加':'Combine multiple abilities',
    '无（只有人设，夜里无技能）':'None (persona only; no night ability)','能力简介':'Ability summary','AI行动指南':'AI action guide','保存角色':'Save role',
    '最多4位，只有你能看到观众评论，AI玩家完全不知情。':'Up to 4. Only you can see audience comments; AI players never know about them.',
    '添加观众':'Add spectator','对局规则':'Match rules','AI 与演出':'AI & performance','主持与调试':'Host & debug','显示与音效':'Display & audio','本局':'This match','存取与分享':'Save & share','工具':'Tools','选择剧本':'Choose a script','事实小测':'Fact quiz','最佳侦探':'Best detective','全场嫌疑度':'Suspicion','轮到你发问':'Your turn to ask','这轮不问':'Skip this turn','发问':'Ask','交卷':'Submit','你的答卷':'Your answers','其余角色搜证':'Let the others investigate','跳过，直接讨论':'Skip to discussion','开始加赛':'Start runoff','AI 自主搜证（每人每幕自己挑一条线索查）':'AI investigates on its own (each picks one clue per act)','成员':'Members','添加成员':'Add member','导入上局角色':'Import last game’s cast','复盘上一局':'Review last game','赛后复盘':'Post-game review','换个议题':'Next topic','重新导入本局':'Reload this game','退出复盘':'Exit review',
    '下午茶闲聊':'Afternoon tea','推理讨论':'Deduction','自由对话':'Free conversation','回到最新':'Jump to latest','开始自聊':'Start auto chat','间隔':'Interval','插话':'Interject',
    'AI 剧本杀':'AI murder mystery','首发剧本 · 6人 · 本格推理':'Launch story · 6 players · classic mystery','米花町别墅事件':'Beika Villa Case',
    '网页端AI接力':'Web AI relay','等待中':'Waiting','展开设置':'Show settings','导演模式':'Director mode','备选API（主API失败时依次尝试）':'Fallback APIs (used in order)',
    '摘要模型（记忆压缩专用）':'Summary model (memory compression)','启用记忆压缩':'Enable memory compression','关掉':'Disable',
    '摘要专用模型：建议填便宜小模型（如 gpt-4o-mini、claude-haiku-4-5）。留空则用玩家自己的模型。':'Summary model: use an inexpensive small model. Leave blank to use the player model.',
    'OpenAI兼容':'OpenAI compatible','自定义…':'Custom…','不限':'Unlimited','AI主持人':'AI host','启用AI主持人':'Enable AI host','主持模式':'Host mode',
    '解说员（只点评，不参与流程）':'Commentator (comments only)','司仪（引导流程+戏剧性宣布）':'Emcee (guides flow and announcements)','简短':'Brief','详细':'Detailed',
    '并发设置':'Concurrency','发言':'Speech','狼议':'Wolf discussion','狼票':'Wolf vote','审判票':'Trial vote','感言':'Closing remarks','AI 思考时间（秒）':'AI thinking time (seconds)',
    '单次请求上限':'Request timeout','密约·提案':'Wolf pact · proposal','密约·投票':'Wolf pact · vote','名讳':'Names','点击命牌可单独设名字和API':'Click a role card to set its name and API',
    '座位排序（拖拽调整）':'Seat order (drag to reorder)','随机打乱':'Shuffle','恢复默认':'Restore default','仅第一夜':'First day only','每次都有':'Always','从不':'Never',
    '盲名Cosplay':'Blind-name cosplay','硬核':'Hardcore','导演刀口主控':'Director controls wolf target','准备就绪':'Ready','提问':'Ask','读档':'Load save','朗读':'Read aloud','提示词库':'Prompt library',
    '设置':'Settings','重置本局':'Reset game','向角色提问':'Ask a character','选择角色':'Choose character','发送':'Send','全员互评 · MVP':'All-player review · MVP','开始评选':'Start voting','知悉':'Understood',
    '身份(随机)':'Role (random)','API地址':'API URL','从库选':'Choose from library','API密钥':'API key','模型':'Model','永久记忆':'Persistent memory','已启用':'Enabled',
    '开启后，该角色将带着上一局的记忆进入新局':'When enabled, this character remembers the previous game','上一局记忆摘要：':'Previous-game memory:','暂无上一局记忆':'No previous memory',
    '清除记忆':'Clear memory','头像':'Avatar','角色BGM':'Character music','搜库':'Search library','AI参数调节（勾选启用，不勾则用默认值）':'AI parameters (check to override defaults)',
    '频率惩罚':'Frequency penalty','存在惩罚':'Presence penalty','上下文记忆条数':'Context memory entries','默认':'Default','确定':'Confirm',
    '3狼(含狼王)+预女猎守+魔术+2民':'3 wolves (incl. Wolf King) + Seer/Witch/Hunter/Guard/Magician + 2 Villagers',
    '3狼(含狼美)+预女猎守骑魔+3民':'3 wolves (incl. Wolf Beauty) + all core gods + 3 Villagers',
    '4狼(含狼王)+预女猎守骑魔+4民':'4 wolves (incl. Wolf King) + all core gods + 4 Villagers','12人·花活':'12 players · special roles',
    '2狼+机械狼+预女守魔+🃏小丑+4民':'2 wolves + Mechanical Wolf + Seer/Witch/Guard/Magician + Jester + 4 Villagers','14人·花活':'14 players · special roles',
    '3狼(含狼美)+全神+🔪连环杀手+4民':'3 wolves (incl. Wolf Beauty) + all gods + Serial Killer + 4 Villagers',
    '4狼(狼王+机械)+全神+💘丘比特+4民':'4 wolves (Wolf King + Mechanical) + all gods + Cupid + 4 Villagers','纯AI／网页端AI':'API AI / Web AI',
    '── ☁️ 云存档账号 ──':'— Cloud save account —','登录':'Sign in','注册':'Register',
    '注册后可能需要在邮箱中点击确认链接。密码只发送给 Supabase，不会写入游戏存档或 GitHub。':'Registration may require email confirmation. Your password is sent only to Supabase and is never stored in game saves or GitHub.',
    '── 🖼️ 自定义壁纸 ──':'— Custom wallpaper —','上传图片（支持 JPG / PNG / WebP）':'Upload image (JPG / PNG / WebP)',
    '── 🎭 人设库 ──':'— Persona library —','开启「🎲 人设随机池」后，开局会从这里随机抽取分配给 AI':'When Random Persona Pool is enabled, personas are drawn from here for AI players.',
    '角色名字库':'Character name library','选择预设角色或自定义名字，用于随机分配玩家名':'Choose preset characters or custom names for random player naming.',
    '当前名字池（随机发牌时从这里取名）':'Current name pool (used when dealing roles)','点击预设角色可快速添加到名字池 ↓':'Click a preset character to add it to the pool ↓',
    '保存名字库':'Save name library','── ✏️ 自创角色 ──':'— Custom role —','创建专属身份，加入自定义局中使用':'Create a role for custom games.',
    '预言家 · 每晚验人':'Seer · inspect nightly','守卫 · 每晚守护一人':'Guard · protect one player nightly','猎人 · 死亡时开枪带走一人':'Hunter · shoot when eliminated',
    '骑士 · 白天可发起决斗':'Knight · initiate a daytime duel','魔术师 · 每晚交换两人':'Magician · swap two players nightly','狼人 · 参与夜间狼刀':'Werewolf · joins the wolf attack','狼王 · 夜刀+死亡咬人':'Wolf King · night attack + death bite',
    '单选模板：整个角色':'Single template: complete role','变成该内置角色':'Become this built-in role','（复用其机制，阵营随模板定）。想':'(reuses its mechanics and team). To',
    '自由拼技能':'combine abilities freely','请用下面的「积木」多选。':'select multiple blocks below.','查验 · 每晚验一人阵营（狼/好人）':'Inspect · check one player’s team nightly',
    '守护 · 每晚守护一人免于狼刀':'Protect · shield one player from wolves nightly','毒 · 一次性毒杀一人（被毒者不能发动死亡技能）':'Poison · one-use kill; suppresses death abilities',
    '解药 · 一次性救活当晚被刀的人':'Antidote · save one wolf-attack victim once','缓死 · 被出局时延迟一轮才真死、翻牌公开':'Delayed death · reveal and die one round later',
    '封技能 · 每晚封锁一人当晚的夜间主动技':'Silence · block one player’s active night ability','反弹 · 每晚锁一人，查/守/毒他的神职反弹到自己':'Reflect · inspections/protection/poison aimed at the mark rebound',
    '禁刀 · 一次性：某晚宣告当晚全狼无法击杀':'Attack ban · once per game, cancel all wolf attacks that night','首放逐免疫 · 首次被投放逐翻牌免疫不死（被动）':'First-exile immunity · reveal and survive the first vote exile',
    '可转移护盾 · 每晚护一人挡一次夜死；目标未受夜袭则当夜转护自己（一次性）':'Transferable shield · protect a target; returns to self if unused (one charge)',
    '赐予 · 每晚赐一人 盾/查验/毒（幸运儿是狼则出局）':'Grant · give shield/inspection/poison nightly; backfires on a wolf',
    '积木可自由叠加':'Ability blocks can be combined','（如「查验+守护」= 会守人的预言家）。':'(Example: Inspect + Protect = a Seer who can guard.)',
    '只要勾了任意积木，就用积木组合、忽略上面的单选模板；阵营用你上面选的那个。':'When any block is selected, the block combination overrides the single template; the selected team still applies.',
    '名字、emoji、人设仍是你自创的。':'Name, emoji, and persona remain custom.','提示：AI会严格按照你写的指南行动。写得越详细，角色扮演越准确。可以参考内置角色的风格来写。':'Tip: AI follows this guide closely. More detail improves roleplay; built-in roles are useful examples.',
    '── 自定义配置 ──':'— Custom setup —','── 🍿 观众席 ──':'— Audience —','最多4位观众，轮流评论每个游戏事件。只有你能看到，AI玩家完全不知情。':'Up to 4 spectators comment in turn. Only you can see them; AI players are unaware.',
    '配置群成员（最多8人），留空则用全局API和模型':'Configure up to 8 members; blank fields use the global API and model.','群设定：让成员拥有共同关系、当前事件和要解决的事':'Group premise: shared relationships, current event, and unresolved issue',
    '好群聊不是“随便聊”：给一个共同事件或未解决的问题，角色才会互相回应、站队或推进故事。':'Good group chat needs a shared event or unresolved problem so characters respond, take sides, and move the story forward.',
    '6秒':'6 seconds','暴风雨封锁山间别墅，主人被发现死于书房。六位各怀秘密的来客，必须在两轮搜证和圆桌交锋后找出真凶。':'A storm seals a mountain villa. Its owner is found dead in the study, and six secretive guests must identify the killer after two rounds of investigation and debate.',
    '我来扮演：江户川柯南（推荐）':'Play as Edogawa Conan (recommended)','网页端AI模式会逐个显示角色的私密提示词，只适合你作为主持人/观战者使用，因此会自动切换为纯观战。':'Web AI mode displays each character’s private prompt and therefore switches you to spectator/host mode.',
    '推荐亲自扮演一名角色：你会获得私密剧本，并在搜证、发言和指认中改变这一局。API 模式复用狼人杀设置里的 API 地址、密钥和模型。':'Playing a character is recommended: you receive a private script and can change the story through investigation, discussion, and accusation. API mode reuses the Werewolf API settings.',
    '公开日志严格按事件编号排列。AI只能看到自己剧本、已公开线索和当时已经发生的公开事件。':'The public log follows event order. AI sees only its own script, revealed clues, and events already made public.',
    '─ 左 席 ─':'— Left table —','退':'Back','第零回':'Opening','存活:10':'10 alive','── 展开命牌 ▼ ──':'— Show role cards ▼ —',
    '导演模式 — 预选你要操控的角色（可留空，开局后点命牌随时接管/交还）':'Director mode — preselect roles to control (optional; click cards to take over or release later)',
    '勾选的角色开局即由你控制；游戏中点命牌右下角 🎬 按钮随时切换':'Selected roles start under your control; use the 🎬 button on a role card to switch anytime.',
    '超过阈值后用摘要模型把旧发言压成摘要以省 token。':'After the threshold, compress older speeches with the summary model to save tokens.',
    '则完整保留所有发言原文——上下文够大时更准（不会因摘要串发言/身份错乱），但长局更耗 token。下面的摘要模型仅在"启用"时生效。':'When disabled, all original speeches are retained. This is more accurate with a large context window but costs more tokens in long games.',
    '16条':'16 entries','30条':'30 entries','40条':'40 entries','司仪模式会在关键时刻（如死亡宣布）加入戏剧停顿，剪辑录屏更有张力。每局约多30-50次API调用。':'Emcee mode adds dramatic pauses to key announcements. It uses roughly 30–50 extra API calls per game.',
    '慢思考模型(Kimi/GLM/Gemini)若常被掐断，调大「单次请求」和「密约·提案」。值越大越能容纳长思考，但卡住时等待也越久。':'If slow-thinking models are cut off, raise Request Timeout and Pact Proposal. Larger values allow longer reasoning but also longer waits when stalled.',
    '硅基流动 Kimi 思考':'SiliconFlow Kimi reasoning','智能分流（推荐）':'Smart routing (recommended)','即时模式（关闭深度思考）':'Instant (disable deep reasoning)','轻量思考（1024）':'Light reasoning (1024)','标准思考（4096）':'Standard reasoning (4096)','深度思考（16384）':'Deep reasoning (16384)','接口默认（不干预）':'Provider default (no override)',
    '智能分流会让查验、守护、投票等明确操作走即时模式，公开发言保留标准思考。仅对 OpenAI 兼容接口中的 Kimi-K2.x 生效；接口不支持时会自动撤销参数重试。':'Smart routing uses Instant mode for checks, guards, votes, and other explicit actions, while keeping Standard reasoning for public speeches. Applies only to Kimi-K2.x over OpenAI-compatible APIs; unsupported endpoints automatically retry without these parameters.',
    "内置 L's Theme":"Built-in L's Theme",'内置 WAKE UP!':'Built-in WAKE UP!','── 准备就绪 ──':'— Ready —','─ 右 席 ─':'— Right table —',
    '角色会以自己的身份和记忆来回答你（上帝视角对话）':'The character answers using its role and memories (omniscient conversation).',
    '点击开始后，全体AI将基于上帝视角战报，为每位玩家的🧠推理力/🎭演技/⭐影响力/📝发言完整度四维打分，综合最高者当选MVP并计入排行榜':'All AI judges score every player on deduction, roleplay, impact, and speech quality using the omniscient report. The highest total becomes MVP.',
    '点击开始后，全体AI将基于上帝视角战报，为每位玩家四维打分（推理/演技/影响/发言），综合最高者当选MVP并计入排行榜':'After voting starts, every AI judge scores each player on deduction, roleplay, impact, and speech quality using the omniscient report. The highest overall score wins MVP and is added to the leaderboard.',
    '尚未开局。请在角色配置完成并开局后导出，系统将只生成本局实际生效的规则。':'The game has not started. Finish the role setup and start the game first; this export will include only the rules active in this match.',
    '⚠️ 游戏尚未开始':'⚠️ The game has not started','⚠️ 本局没有AI玩家':'⚠️ This game has no AI players','⏳ 评选中…':'⏳ Voting…','🏆 重新评选':'🏆 Vote again','🔄 重新评选':'🔄 Vote again',
    '还没有检查点。开局后每次阶段变化会自动记录。':'No checkpoints yet. A checkpoint is created whenever the phase changes after the game starts.','⏪ 回到这里':'⏪ Return here',
    '── 完整角色与规则百科 ──':'— Full role and rules encyclopedia —','🎯 返回本局规则':'🎯 Back to active rules',
    '针对此 AI 关闭自由输出（默认跟随全局）':'Disable natural output for this AI (otherwise follows global setting)','高级：CoT 模板（一般不需要）':'Advanced: CoT template (usually unnecessary)',
    '该字段会追加到 prompt 末尾。':'This field is appended to the prompt.','会被替换成实际的标签说明。':'It is replaced with the actual tag instructions.',
    '死板 0':'Rigid 0','2 疯狂':'2 Wild','窄 0':'Narrow 0','1 宽':'1 Wide','无 0':'None 0','2 强':'2 Strong','（留空用全局）':'(blank = global)',
    '记忆条数上限':'Memory entry limit','（留空用全局，0=无限）':'(blank = global; 0 = unlimited)','全部重置':'Reset all','预设 & 正则（后处理输出）':'Presets & regex (post-process output)',
    '正则规则：对AI的':'Regex rules: apply find/replace to AI','发言做查找替换，支持JS正则。预设：追加到系统prompt末尾。':'speech using JavaScript regex. Presets are appended to the system prompt.',
    '预设（追加到人设末尾）':'Presets (append to persona)','正则替换规则':'Regex replacement rules','导入JSON':'Import JSON','作用于：&nbsp;':'Apply to: ','game发言':'game speech','thinking内心':'thinking',
    '&nbsp;·&nbsp; flags留空=不区分大小写，可填 g/i/m/s 组合':' · blank flags = case-insensitive; supports g/i/m/s','管理API库':'Manage API library',
    '── 轮到你 ──':'— Your turn —','复制喂Claude的内容（系统prompt+当前局势）':'Copy for Claude (system prompt + current state)','思维链（从网页端Claude复制，可选）':'Reasoning (optional, copied from web Claude)',
    '身份：':'Role:','── 抉择 ──':'— Decision —','── 你被审判了 ──':'— You are on trial —','质疑于你':'accuses you','提交辩词':'Submit defense',
    '赛后互动':'Post-game interaction','游戏结束，上帝视角——身份全公开，什么都能说':'Game over · omniscient view · all roles revealed','开启终局盲复盘':'Enable blind final review','对局回放':'Match replay','按真实事件顺序观看本局':'Watch this match in chronological order','只读录像 · 按真实事件顺序播放，不调用 AI，也不会改变对局':'Read-only replay · chronological events · no AI calls or game changes','自动播放':'Auto play','显示本句':'Show line','显示本段全部':'Show scene','播放速度':'Playback speed','等待播放':'Ready','对局阶段':'Game phase','正在播放':'Playing','本阶段暂无可显示事件':'No visible events in this phase',
    '已隐藏全员真实身份。此时导出的“上帝视角摘要”会自动变成公开战报盲推版：保留公开发言、票型和公开技能事件，移除密谈、私密夜间行动与终局感言。':'All true roles are hidden. Omniscient exports become blind public reports containing public speeches, votes, and public skill events only.',
    '我的名字':'My name','发起者':'Initiator','回应者':'Responder','发起者选「👤 我」时由你手打开场白；也可以先让AI说，之后用下方「我来插话」随时加入':'Choose “Me” as initiator to write the opening, or let AI begin and join later.',
    '开始互动':'Start interaction','我来插话':'Let me speak','结束':'End','审核发言':'Review speech','发出去':'Send','重新生成':'Regenerate','跳过':'Skip','主持人确认':'Host confirmation','确认执行':'Confirm action',
    '── 导出记录 ──':'— Export record —','含内心独白':'Include inner thoughts','从文件导入':'Import from file','── 存档管理 ──':'— Save manager —',
    '存档保存在设备数据库中，容量远大于旧版的5MB上限，AI记忆不再被压缩。「导出」可存为文件，在浏览器与APK之间互传。':'Saves are stored in the device database without the old 5 MB limit. Export files can move between browser and APK.',
    '对局回溯（自动时间线）':'Game rewind (automatic timeline)','── 朗读设置 ──':'— Speech settings —',
    '系统语音免费开箱即用。若你有自己的TTS服务（OpenAI格式 /v1/audio/speech，如OpenAI、硅基流动等），可切换成自定义API，声音更自然。接口需支持浏览器跨域（CORS），与配置AI接口同理。':'System voices work for free. You may use an OpenAI-compatible /v1/audio/speech API for more natural voices; the endpoint must support browser CORS.',
    '系统语音（免费）':'System voice (free)','自定义API（OpenAI格式）':'Custom API (OpenAI format)','抢先播报（边生成边念）':'Progressive speech (read while generating)',
    'AI每写完一句就先念出来，不必等整段生成完。仅在「发言并发=1」时生效，并发更高会自动关闭以免多人同时开口。':'Reads each completed sentence immediately. Available only when speech concurrency is 1.',
    '── 对局回溯 ──':'— Game rewind —','每次阶段变化自动记录检查点（最多40个，仅保留本局）。回到过去后AI会重新思考，剧情可能走向不同分支。':'Each phase change creates a checkpoint (up to 40 for this game). Rewinding makes AI reconsider and may create a new branch.',
    '── 选择模型 ──':'— Choose model —','开发者':'Developer','API 存储库':'API library','保存常用API配置，命牌弹窗中一键切换':'Save common API configurations and switch from role cards.',
    '── 添加新配置 ──':'— Add configuration —','地址':'URL','密钥':'Key','保存到库':'Save to library','角色人设生成器':'Character persona generator',
    '输入角色名字和来源作品，AI 自动生成适合狼人杀的角色人设':'Enter a character and source work; AI creates a Werewolf-ready persona.','生成后可复制到命牌的「人设」栏，或一键存入🎭人设库':'Copy the result to a role card or save it to the persona library.',
    '来源作品':'Source work','生成语气':'Generation style','忠实原著风格':'Canon-faithful','暗黑强化版':'Darker','戏剧张力版':'Dramatic','简洁精炼版':'Concise','就绪，输入角色信息后点击生成':'Ready. Enter character information and generate.',
    '生成人设':'Generate persona','生成的人设（可直接编辑）':'Generated persona (editable)','复制到剪贴板':'Copy to clipboard','存入人设库':'Save to persona library',
    '把 API 配置(含所有 key/模型/各玩家设置)上传到你的云端账号':'Upload API configuration, keys, models, and player settings to your cloud account.',
    '从云端下载 API 配置到本机(换设备免重输 key)':'Download cloud API configuration to this device.','无需任何 API key，本地脚本自动播放一局，供路人观战':'Run a scripted spectator demo without an API key.',
    '邮箱地址':'Email address','密码（至少6位）':'Password (at least 6 characters)','输入自定义名字，回车添加…':'Enter a custom name and press Enter…','例：魔术师':'Example: Magician',
    '例：每晚可以交换两人的身份':'Example: swap two players every night','详细描述AI应该如何扮演这个角色：能力机制、使用时机、策略建议…&#10;&#10;例：你是魔术师。每晚你可以选择两名玩家，交换他们的身份牌（好人变狼，狼变好人）……':'Describe the role mechanics, timing, and strategy in detail…',
    '把当前配置存成常驻模式卡片，下次一点即玩':'Save this setup as a reusable mode card.','写下群的共同设定：大家为何在这里、此刻发生了什么、希望解决什么。例：合租屋群；房东说明早突击检查，大家要找出是谁把公共账单花超了。':'Describe why the group is together, what is happening, and what must be resolved.',
    '随时插话… Enter发送，Shift+Enter换行':'Interject anytime… Enter to send; Shift+Enter for a new line','把网页端 AI 的完整回复粘贴到这里……':'Paste the complete web AI reply here…',
    '摘要API地址（留空用全局）':'Summary API URL (blank = global)','摘要密钥（留空用全局）':'Summary API key (blank = global)','摘要模型名称（留空用玩家模型）':'Summary model (blank = player model)','如32768':'e.g. 32768',
    '主持人API地址（留空用全局）':'Host API URL (blank = global)','主持人密钥（留空用全局）':'Host API key (blank = global)','主持人模型（留空用全局）':'Host model (blank = global)','遗言规则':'Last-words rule',
    '关闭后AI发言中提到本局不存在的角色名时不再自动替换':'When disabled, nonexistent role names mentioned by AI are no longer auto-corrected.',
    '开启后，公开界面、API公共战报、网页端AI提示词与摘要都只显示P编号；每个AI只在私密提示中知道自己的Cosplay角色名，避免名气刀、仇刀和角色名联想。':'Show only seat numbers in public UI, reports, web prompts, and summaries; each AI sees only its own cosplay identity.',
    '关掉毛玻璃和常驻动画。若你在浏览器里遇到「玩着玩着某块画面变空白，但游戏照常」，打开它即可解决——那是浏览器合成高负载特效时的老毛病，与游戏逻辑无关。桌面默认关闭（保留华丽特效）。':'Disable blur and persistent animation to avoid browser rendering blanks under heavy visual load.',
    '开启后，每晚狼队刀人时会弹框让你（导演）亲自决定刀口——可以指定杀谁，也可以选「空刀」制造平安夜。无论你是否扮演狼、纯观战也能用，直接覆盖AI狼队的决定。关闭则狼队自己民主投票（默认）':'Let the director choose or skip the wolf attack each night, overriding the AI pack vote.',
    '在命牌和发言旁显示AI模型标签，方便录屏辨识':'Show AI model labels beside role cards and speeches.','开启后模型标签显示完整模型名（如 Claude Opus 4.5、Gemini 3 Pro），关闭则只显示品牌简称（如 Claude、Gemini）。命牌上名字过长会截断，鼠标悬停可看完整模型 ID。':'Show the full model name on the badge (e.g. Claude Opus 4.5, Gemini 3 Pro) instead of just the brand (Claude, Gemini). Long names are truncated on role cards; hover to see the full model ID.','开启后AI会输出思维过程（更耗token但可观察推理）；关闭则直接输出发言和操作（省token，速度更快）':'Allow AI reasoning output; disabling saves tokens and is faster.',
    '开启后AI自然说话，思考可写在[草稿]里自动过滤；关闭则用XML标签格式（可能导致发言过短）。推荐保持开启。可在命牌弹窗里针对单个AI关闭。':'Use natural AI output with optional [draft] filtering. Disabling requires XML tags and may shorten replies.',
    '开启后AI异常（失败/过短/过滤/复读/元指令）时弹出三选一对话框：手写代替 / 备用API / 重试主API。关闭则自动切备用API（原行为）。':'On abnormal AI output, ask whether to write manually, use fallback API, or retry the main API.',
    '开启=屠边局（默认）：狼人只要把神职全杀光、或把平民全杀光，就立刻获胜（即使总人数还没到屠城线）。关闭=屠城局：狼人需把好人杀到≤狼人数才赢。屠边对狼更有利、节奏更快。':'On: edge victory—wolves also win by eliminating all gods or all Villagers. Off: wolves win only at parity.',
    '开启=骑士连斩模式：骑士每天可决斗一次，决斗命中狼→狼死、骑士存活、下一天还能继续决斗；决斗指向好人→骑士当场牺牲。推理越准的骑士能连续清狼。关闭=经典模式（默认）：骑士一局只能决斗一次，不论输赢用完即止。':'On: the Knight may duel once per day and keeps the ability after hitting a wolf. Off: one duel per game.',
    '开启=传统单轮发言（默认）：白天每人只发言一次，发完直接投票（更接近线下标准狼人杀，节奏快）。关闭=双轮发言：每人发言两轮，第二轮可反驳/改票/总结（AI交锋更充分）。':'On: one daytime speech per player. Off: two rounds, allowing rebuttals and revised votes.',
    '开启后，只要警长仍在场，无论昨夜平安夜还是有人死亡，每天都由警长指定起始玩家和顺/逆时针方向；警长最后归票。关闭则仅第一天由警长定序，之后按昨夜死者下家或默认座位顺序。':'While the Sheriff lives, let the Sheriff choose the daily starting seat and direction and speak last.',
    '开启后：每次开局会从「🎭 人设库」里随机抽取人设，分配给没有手动配置人设的 AI。每局阵容自动不同。需要先在主菜单的人设库里建好人设。':'Randomly assign saved personas to AI players without manual personas at the start of each game.',
    '粘贴音频直链 URL…':'Paste a direct audio URL…','把观战链接分享给朋友':'Share the spectator link','导出本局完整规则，可复制给外部AI（如网页端ChatGPT/Claude），让它按你这个板子的规则来玩':'Export active rules for an external AI.',
    '保存当前游戏进度':'Save current progress','读取上次存档':'Load the latest save','用系统语音朗读AI发言（免费，无需API）':'Read AI speech with free system voices','朗读设置：切换系统语音/自定义TTS接口':'Speech settings: system voice or custom TTS',
    '输入你的问题...':'Enter your question…','留空随机':'Blank = random','留空用全局':'Blank = global','从API库选择':'Choose from API library','拉取模型列表':'Fetch model list','测试API是否能正常调用':'Test the API connection',
    '自定义角色人设（留空则无特殊人设）&#10;例：你是L，世界第一侦探，说话慢且平淡…':'Custom persona (blank = none)','默认跟随全局设置（推荐）。勾选此项 = 针对此 AI 强制关闭自由输出，使用 XML 标签格式。仅在某个 AI 不适应自由输出时勾选。':'Follows the global setting by default. Check only to force XML output for this AI.',
    '留空=使用默认。&#10;在 prompt 末尾追加自定义指令，仅给特殊模型微调用。':'Blank = default. Appends custom instructions to the prompt.','图片URL（留空无头像）':'Image URL (blank = no avatar)','发言时播放的BGM URL（留空用内置）':'Speech BGM URL (blank = built-in)','搜索BGM名称...':'Search BGM…',
    '留空=全局设置':'Blank = global','例：说话时在句末加上「——江户川柯南说」&#10;例：所有感叹号替换为句号，语气更冷静':'Example output replacement rule','粘贴Claude的thinking内容...':'Paste Claude reasoning…','为自己辩白...':'Write your defense…','留空则显示「观众」':'Blank displays “Audience”',
    '输入你想说的话，发给所有人或指定角色……':'Enter a message for everyone or a selected character…','接口地址，如 https://api.openai.com/v1/audio/speech':'Endpoint, e.g. https://api.openai.com/v1/audio/speech','API Key（只存在本机，不会上传）':'API key (stored locally only)','模型，默认 tts-1':'Model (default: tts-1)',
    '音色列表（逗号分隔，自动分配给各AI），默认 alloy,echo,fable,onyx,nova,shimmer':'Voice list, comma separated; assigned automatically','语速，默认 1.0':'Speed (default: 1.0)','搜索模型…':'Search models…','例：Claude Sonnet、GPT-4o、云雾DeepSeek…':'e.g. Claude Sonnet, GPT-4o, DeepSeek','API地址（留空=用全局）':'API URL (blank = global)','模型名称（例：claude-sonnet-4-6）':'Model name (e.g. claude-sonnet-4-6)',
    '🔍 搜索模型…':'🔍 Search models…',
    '例：江户川柯南、夜神月、基德…':'e.g. Edogawa Conan, Light Yagami, Kaito Kid…','例：名侦探柯南、死亡笔记、魔术快斗…':'e.g. Detective Conan, Death Note, Magic Kaito…','人设内容将在这里显示…':'Generated persona appears here…',
    '导入失败：文件读取出错':'Import failed: could not read the file.','当前浏览器不支持语音合成。可在🎚️朗读设置里配置自定义TTS接口。':'This browser does not support speech synthesis. Configure a custom TTS endpoint in Speech Settings.',
    '该回溯点数据缺失':'This rewind checkpoint is missing data.','没有找到存档':'No save was found.','存档格式无效':'Invalid save format.','已进入下一阶段，无法撤回这条发言。':'The game has advanced; this speech can no longer be withdrawn.',
    '终局盲复盘只能在对局结束后开启':'Blind final review is available only after the game ends.','当前配置还不合法（需人数匹配、至少1狼、好人多于狼、6~20人），先配好再存为模式。':'Invalid setup: player count must match, with at least one wolf, more good players than wolves, and 6–20 total players.',
    '终局盲复盘已开启：复盘HTML含头像、真实身份和私密事件，已阻止导出以免泄底。请使用“聊天摘要”导出公开战报盲推版；关闭盲复盘后可正常导出完整复盘HTML。':'Blind final review is enabled. Full HTML export is blocked because it contains roles and private events; use the blind Chat Summary export instead.',
    '游戏尚未开始':'The game has not started.','❌ 无效的配置格式':'❌ Invalid configuration format.','已尝试复制，如未成功请手动选中文本复制':'Copy attempted. If it failed, select and copy the text manually.',
    '未找到规则数据':'No rule data was found.','壁纸保存失败，图片可能太大，请换一张更小的图。':'Wallpaper save failed. Try a smaller image.','请上传图片文件':'Please upload an image file.','图片处理失败，请换一张再试':'Image processing failed. Try another image.',
    '请先配置成员':'Configure members first.','最多8名成员':'Maximum 8 members.','没有找到上局游戏数据。\n请先开始并进行一局游戏，结束后再来导入。':'No previous game data was found. Play and finish a game before importing.',
    '名字库不能为空':'The name library cannot be empty.','内容为空，确定要发"(沉默)"出去吗？建议先点"🔄 重新生成"试试。':'The reply is empty. Send “(silence)” anyway? Try Regenerate first.',
    '确定清空所有排行榜数据？':'Clear all leaderboard data?','⚠️ 确定要重置吗？\n\n当前这局游戏的所有进度将被清空，无法恢复。\n\n（如果想保留进度，请先点「💾 存档」再重置）':'Reset the game? All current progress will be erased and cannot be recovered. Save first if you want to keep it.',
    '清空本局所有回溯检查点？':'Clear every rewind checkpoint for this game?','导入上局角色将替换当前成员列表，是否继续？':'Importing the previous cast will replace the current members. Continue?','清空聊天记录？':'Clear chat history?',
    '简体中文':'Simplified Chinese','语言':'Language','设置面板':'Settings','更多功能':'More actions',
    '对局、显示与音效设置':'Game, display & audio','展开':'Expand','收起':'Collapse','开局':'Start game','继续':'Continue','自动':'Auto',
    '暂停':'Pause','导出':'Export','规则':'Rules','存档':'Saves','复盘':'Review','重置':'Reset','分享':'Share','观战Demo':'Watch demo','网页端AI玩法':'Web AI guide','── 网页端 AI 使用指南 ──':'— Web AI Guide —','明白了':'Got it',
    '方法一：让任意 AI 帮你盘局或复盘':'Option 1: Ask any AI to analyze or review','打开「导出 → 聊天摘要」，选择一名玩家的个人视角和需要的轮次，然后复制内容，粘贴给 ChatGPT、Claude、Gemini 或其他 AI。它只会获得该玩家当时有权知道的信息。':'Open Export → Chat Summary, choose a player viewpoint and the rounds you need, then paste the copied text into ChatGPT, Claude, Gemini, or another AI. It receives only information that player was allowed to know.',
    '方法二：让网页端 AI 直接替角色发言':'Option 2: Let a web AI play a character','开启手动模式。轮到该角色时，点击「复制给网页端 AI」，把完整提示粘贴到你想使用的 AI；再把 AI 返回的发言复制回游戏输入框并提交。每一轮重复即可。':'Enable manual mode. On that character’s turn, choose Copy for Web AI and paste the full prompt into your preferred AI. Copy its reply back into the game input and submit. Repeat each turn.',
    '视角选择很重要':'Choose the viewpoint carefully','进行中的游戏应选择对应玩家的个人视角。不要把「上帝视角」发给正在扮演玩家的 AI，否则所有身份、狼队密谈和夜间行动都会泄露。上帝视角只适合游戏结束后的完整复盘。':'During a live game, use that player’s viewpoint. Never give omniscient view to an AI playing a character, or roles, wolf chat, and night actions will leak. Omniscient view is for post-game review only.',
    '小提示':'Tip','角色姓名可能是中文或英文，都不要让 AI 翻译操作目标的名字；复制功能已经包含本局规则、角色身份、私密记录、公开战报和当前任务，一般不需要自己删减。':'Player names may be Chinese or English; the AI must preserve target names exactly. The copied prompt already includes rules, role, private records, public history, and the current task, so you normally should not trim it.',
    '匿名':'Anonymous','审判':'Trial','隐死亡':'Hidden deaths','遗言':'Last words','事实校验':'Fact check','性情':'Personality',
    '精简特效':'Reduced effects','主持人':'Host','音效':'Sound','模型标签':'Model labels','完整模型名':'Full model name','思维链':'Reasoning','自由输出':'Natural output',
    '手动重试':'Manual retry','屠边':'Edge victory','骑士连斩':'Knight streak','单轮发言':'Single speech round','警长每日定序':'Daily sheriff order',
    '人设随机池':'Random persona pool','夜间BGM':'Night music','白天BGM':'Day music','无音乐':'None','自定义上传':'Upload','自定义链接':'URL',
    '玩家专属BGM':'Player-specific BGM',
    '拉取':'Fetch','测试':'Test','全部应用':'Apply all','批量分配':'Batch assign','全选':'Select all','反选':'Invert','应用':'Apply',
    '关闭':'Close','复制':'Copy','下载':'Download','导入':'Import','排行榜':'Leaderboard','聊天摘要':'Chat summary','导出记录':'Export record',
    '导出配置':'Export config','导入配置':'Import config','复盘页面':'Review page','本局规则':'Game rules','完整角色百科':'Full role encyclopedia',
    '── 本局规则（可复制给外部AI）──':'— Active game rules (for external AI) —','── 完整角色与规则百科 ──':'— Complete role & rules encyclopedia —',
    '只包含当前对局实际生效的角色和交互，适合直接复制给网页端 AI。':'Contains only roles and interactions active in this game; suitable for web AI.',
    '包含全部可用角色，供查阅或准备下一场使用；正常网页端 AI 接力不需要复制这一整本。':'Lists every available role for reference and future games. Normal web-AI relay does not need the whole encyclopedia.',
    '返回本局规则':'Back to game rules','复制提示词':'Copy prompt','取消本次接力':'Cancel relay','确认提交':'Submit','重新选择':'Choose again',
    '准备就绪':'Ready','今日发言顺序':'Today’s speaking order','展开命牌':'Show role cards','收起命牌':'Hide role cards',
    '轮到你':'Your turn','落笔此处...':'Type here…','呈上':'Submit','身份':'Role','存活':'Alive','已出局':'Eliminated','警长':'Sheriff',
    '白天':'Day','夜晚':'Night','投票':'Vote','平安夜':'No deaths','候选人':'Candidates','退选':'Withdraw','最终陈词':'Final statement',
    '慢':'Slow','中':'Normal','快':'Fast','疾':'Very fast','书写速度':'Typing speed','回复上限':'Response limit','记忆':'Memory',
    'API 地址':'API URL','API 密钥':'API key','模型名称':'Model name','留空随机 | 逗号分隔':'Leave blank for random · comma separated',
    '退':'Back','未知':'Unknown','观战':'Spectate','喂Claude':'Feed Claude','全部':'All','聊天摘要导出':'Chat Summary Export',
    '选择视角（决定哪些信息可见）':'Select viewpoint (controls what is visible)',
    '上帝视角（全公开，含狼队密谈）':'God view (all revealed, incl. wolf chat)',
    '选择要导出的轮次（不选＝全部）':'Rounds to export (none = all)',
    '可多选，点击高亮表示选中':'Multi-select; tap to highlight',
    '本局开启隐死亡：玩家视角已强制隐藏死者身份':'Hidden deaths on: player view hides dead roles',
    'キャラクター図鑑':'Character Encyclopedia','角色图鉴':'Character Encyclopedia','角色百科':'Role Encyclopedia',
    '导出记录':'Export Log','复盘用':'For review','当前游戏状态':'Current game state','玩家列表':'Players','导出范围':'Export range'
  };

  const PHRASES = [
    // Werewolf terms: keep these before generic words such as 狼人/好人 so compounds are not split.
    [/警徽流/g, 'planned investigation order'], [/金水/g, 'confirmed-town result'], [/查杀/g, 'wolf result'],
    [/银水/g, 'Witch-saved player'], [/悍跳/g, 'fake claim'], [/对跳/g, 'counterclaim'], [/退水/g, 'withdraw'],
    [/倒钩/g, 'bussing'], [/深水狼/g, 'deep wolf'], [/抗推位?/g, 'miselimination target'], [/狼坑/g, 'wolf pool'],
    [/表水/g, 'self-defense'], [/归票/g, 'call the vote'], [/冲票/g, 'coordinated vote push'], [/绑票/g, 'pressure a vote'],
    [/自刀/g, 'self-targeted wolf attack'], [/骗药/g, 'bait the Witch’s antidote'], [/守中/g, 'successful protection'],
    [/刀口/g, 'night-kill target'], [/屠神/g, 'eliminate all power roles'], [/屠民/g, 'eliminate all Villagers'],
    [/铁好人/g, 'confirmed town'], [/狼面/g, 'wolf equity'], [/好人面/g, 'town equity'], [/票型/g, 'voting pattern'],
    [/第(\d+)回(?!合)/g, 'Round $1'], [/存活[:：]\s*(\d+)人/g, '$1 alive'], [/存活[:：]\s*(\d+)/g, 'Alive: $1'],
    [/命牌\s*(\d+)人/g, 'Roles · $1'], [/横滑查看/g, 'swipe to view'], [/收起命牌/g, 'Hide role cards'], [/展开命牌/g, 'Show role cards'], [/未知/g, 'Unknown'],
    [/第(\d+)回合/g, 'Round $1'], [/第(\d+)夜/g, 'Night $1'], [/第(\d+)天/g, 'Day $1'],
    [/存活：(\d+)人/g, '$1 alive'], [/已出局：/g, 'Eliminated: '], [/警长：/g, 'Sheriff: '],
    [/白天/g, 'Day'], [/夜晚/g, 'Night'], [/投票/g, 'Vote'], [/平安夜/g, 'No deaths'],
    [/被投票放逐/g, 'was exiled by vote'], [/被放逐/g, 'was exiled'], [/已死亡/g, 'is dead'], [/死亡/g, 'death'], [/出局/g, 'eliminated'],
    [/守护/g, 'protect'], [/查验/g, 'inspect'], [/毒药/g, 'poison'], [/解药/g, 'antidote'], [/魅惑/g, 'charm'], [/决斗/g, 'duel'],
    [/狼人刀口/g, 'wolf attack target'], [/狼队夜刀/g, 'wolf attack'], [/自爆/g, 'self-destruct'], [/开枪/g, 'shoot'], [/平票/g, 'tie'],
    [/好人/g, 'town'], [/狼人/g, 'wolf'], [/阵营/g, 'team'], [/技能/g, 'ability'], [/目标/g, 'target'], [/结果/g, 'result'],
    [/确定要/g, 'Are you sure you want to '], [/是否继续/g, 'Continue?'], [/不可恢复/g, 'This cannot be undone'], [/覆盖当前/g, 'overwrite the current '],
    [/读档失败：/g, 'Load failed: '], [/导入失败：/g, 'Import failed: '], [/JSON 解析失败：/g, 'JSON parsing failed: '], [/解析失败：/g, 'Parsing failed: '], [/生成规则失败：/g, 'Rule generation failed: '],
    [/观战链接已复制到剪贴板：/g, 'Spectator link copied: '], [/观战链接（长按复制）：/g, 'Spectator link (press and hold to copy): '],
    [/已保存为模式/g, 'Saved as mode '], [/已导入到/g, 'Imported to '], [/云端有一局进行中的对局/g, 'A game in progress exists in the cloud'], [/删除自定义模式/g, 'Delete custom mode '],
    [/覆盖/g, 'overwrite '], [/删除/g, 'delete '], [/清空/g, 'clear '], [/保存/g, 'save '], [/读取/g, 'load '], [/导入/g, 'import '], [/导出/g, 'export '],
    [/失败/g, 'failed'], [/无效/g, 'invalid'], [/格式/g, 'format'], [/文件/g, 'file'], [/数据/g, 'data'], [/配置/g, 'configuration'], [/当前/g, 'current '],
    [/没有找到/g, 'Not found: '], [/尚未开始/g, 'has not started'], [/已复制/g, 'Copied'], [/请先/g, 'Please first '], [/请上传/g, 'Please upload '],
    [/确定/g, 'Confirm'], [/取消/g, 'Cancel'], [/继续/g, 'Continue'], [/返回/g, 'Back'], [/打开/g, 'Open'], [/关闭/g, 'Close'],
    [/昨晚：平安夜/g, 'Last night: no deaths'], [/当前回合：/g, 'Current round: '],
    [/设置面板/g, 'Settings'], [/更多设置与音效/g, 'More settings & audio'],
    [/复制给网页端AI/g, 'Copy for web AI'], [/生成规则失败/g, 'Failed to generate rules']
  ];

  function normalizeLang(value) { return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN'; }
  // Chinese edition: English now lives at ./en/ as an independent product.
  let lang = 'zh-CN';
  const originalText = new WeakMap();
  const originalAttrs = new WeakMap();
  const originalTitle = document.title;
  const originalMeta = new Map();
  document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]').forEach(meta => originalMeta.set(meta, meta.content));
  function isEnglish() { return lang === 'en'; }
  const TERMINOLOGY_GUIDE = `[WEREWOLF TERMINOLOGY]
Use natural English Werewolf/Mafia vocabulary; never transliterate Chinese jargon literally.
• 好人/好人阵营 = town/town team; 狼人/狼队 = wolf/wolf team.
• 金水 = confirmed-town result (an investigation clear; say “my town result” in speech), not “golden water”.
• 查杀 = wolf result (say “I got a wolf result on X”), not “check-kill”.
• 银水 = Witch-saved player; this does not by itself confirm alignment.
• 悍跳/对跳 = fake claim/counterclaim. 警徽流 = planned investigation order.
• 抗推 = miselimination target. 倒钩 = bussing. 深水狼 = deep wolf. 狼坑 = wolf pool.
• 归票 = call/direct the vote. 票型 = voting pattern. 刀口 = night-kill target. 平安夜 = no-death night.
• 屠神/屠民 = eliminate all power roles/all Villagers. 表水 = defend oneself or make a town case.
Prefer the plain-language term when jargon would sound unnatural. Preserve player names exactly.`;
  function terminologyGuide() { return isEnglish() ? TERMINOLOGY_GUIDE : ''; }
  function role(id, fallback) { return isEnglish() && ROLE_EN[id] ? ROLE_EN[id] : fallback; }
  function translateText(input) {
    if (!isEnglish() || !input || !String(input).trim()) return input;
    const raw = String(input);
    const lead = raw.match(/^\s*/)[0], tail = raw.match(/\s*$/)[0], core = raw.trim();
    if (EXACT[core]) return lead + EXACT[core] + tail;
    // \u53bb\u6389\u9996\u5c3e\u7684\u88c5\u9970\u7b26\uff08\u2014\u2014 \u25b2 \u25bc \u2460 \u3010 \u3011 \u00b7 \u7b49\u975e\u5b57\u6bcd/\u6570\u5b57/\u6c49\u5b57\uff09\u518d\u67e5\u8bcd\u5178\uff0c\u547d\u4e2d\u5219\u539f\u6837\u4fdd\u7559\u88c5\u9970
    const dm = core.match(/^([^0-9A-Za-z\u3400-\u9fff\u3040-\u30ff]*)([0-9A-Za-z\u3400-\u9fff\u3040-\u30ff][\s\S]*?[0-9A-Za-z\u3400-\u9fff\u3040-\u30ff]|[0-9A-Za-z\u3400-\u9fff\u3040-\u30ff])([^0-9A-Za-z\u3400-\u9fff\u3040-\u30ff]*)$/);
    if (dm && (dm[1] || dm[3]) && EXACT[dm[2].trim()]) {
      return lead + dm[1] + EXACT[dm[2].trim()] + dm[3] + tail;
    }
    let out = core;
    for (const [id, info] of Object.entries(ROLE_EN).sort((a,b) => ROLE_ZH[b[0]].length - ROLE_ZH[a[0]].length)) {
      const zh = ROLE_ZH[id];
      if (zh) out = out.replace(new RegExp(zh.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), info.name);
    }
    for (const [re, value] of PHRASES) out = out.replace(re, value);
    return lead + out + tail;
  }

  function translateNode(root) {
    if (!isEnglish() || !root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement || /^(SCRIPT|STYLE|TEXTAREA)$/i.test(root.parentElement.tagName)) return;
      if (!originalText.has(root)) originalText.set(root, root.nodeValue);
      const next = translateText(root.nodeValue);
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ['placeholder','title','aria-label']) {
        if (root.hasAttribute(attr)) {
          if (!originalAttrs.has(root)) originalAttrs.set(root, {});
          const saved = originalAttrs.get(root);
          if (!(attr in saved)) saved[attr] = root.getAttribute(attr);
          root.setAttribute(attr, translateText(root.getAttribute(attr)));
        }
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateNode);
    if (root.querySelectorAll) root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(translateNode);
  }

  function makePicker() {
    if (document.getElementById('wolf-language-picker')) return;
    const wrap = document.createElement('label');
    wrap.id = 'wolf-language-picker';
    wrap.innerHTML = '<span>🌐</span><select aria-label="Language"><option value="zh-CN">简体中文</option><option value="en">English</option></select>';
    Object.assign(wrap.style, {position:'fixed',left:'10px',right:'auto',top:'auto',bottom:'max(8px, env(safe-area-inset-bottom))',zIndex:'1200',display:'flex',alignItems:'center',gap:'4px',padding:'4px 7px',border:'1px solid rgba(245,160,184,.22)',borderRadius:'8px',background:'rgba(15,13,27,.9)',color:'#d8d0e8',fontSize:'12px',backdropFilter:'blur(8px)'});
    const select = wrap.querySelector('select');
    Object.assign(select.style, {background:'transparent',border:'0',color:'inherit',font:'inherit',outline:'none'});
    select.value = lang;
    select.addEventListener('change', () => setLang(select.value));
    document.body.appendChild(wrap);
  }

  function apply() {
    document.documentElement.lang = isEnglish() ? 'en' : 'zh-CN';
    makePicker();
    if (isEnglish()) {
      document.title = translateText(document.title);
      document.querySelectorAll('meta[name="description"],meta[property="og:title"],meta[property="og:description"],meta[name="twitter:title"],meta[name="twitter:description"]').forEach(meta => meta.content = translateText(meta.content));
      translateNode(document.body);
    }
  }
  function restoreChinese(root) {
    if (!root) return;
    document.title = originalTitle;
    originalMeta.forEach((content, meta) => { meta.content = content; });
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    const nodes = [root]; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE && originalText.has(node)) node.nodeValue = originalText.get(node);
      if (node.nodeType === Node.ELEMENT_NODE && originalAttrs.has(node)) {
        const attrs = originalAttrs.get(node); Object.keys(attrs).forEach(k => node.setAttribute(k, attrs[k]));
      }
    });
  }
  function setLang(next) {
    if (normalizeLang(next) === 'en') { window.location.href = './en/'; return; }
    lang = 'zh-CN'; localStorage.setItem(STORAGE_KEY, lang);
    restoreChinese(document.body);
    apply();
    const picker = document.querySelector('#wolf-language-picker select'); if (picker) picker.value = lang;
    document.dispatchEvent(new CustomEvent('wolf-language-change', {detail:{lang}}));
  }

  function buildActiveEnglishRoleDesc(id, activeRoleIds) {
    const active = activeRoleIds instanceof Set ? activeRoleIds : new Set(activeRoleIds || []);
    if (id === 'wolfking') {
      return `Wolf team. Joins the nightly attack; when eliminated by vote or a night attack, may bite one player. Poison${active.has('knight') ? ' and a Knight duel' : ''} suppresses the bite.`;
    }
    return ROLE_EN[id] ? ROLE_EN[id].desc : '';
  }

  function englishRoleClass(id, roleInfo) {
    const desc = String(roleInfo && roleInfo.desc || '');
    if (roleInfo && roleInfo.team === 'good') {
      const cls = roleInfo.goodRoleClass === 'villager' || (roleInfo.goodRoleClass !== 'god' && id === 'villager') ? 'villager' : 'god';
      return cls === 'villager' ? 'Good-team civilian (counts toward civilian wipe)' : 'Good-team power role (counts toward god wipe)';
    }
    if (roleInfo && roleInfo.team === 'bad') return 'Wolf team';
    if (roleInfo && roleInfo.team === 'third') return 'Independent';
    if (id === 'villager') return 'Good-team civilian (counts toward civilian wipe)';
    if (desc.startsWith('Good team.') || desc.startsWith('Good-team')) return 'Good-team power role (counts toward god wipe)';
    if (desc.startsWith('Wolf team.')) return 'Wolf team';
    if (desc.startsWith('Independent.')) return 'Independent';
    return 'Role class follows the current setup';
  }

  function buildEnglishActiveRoleTiming(players) {
    const list = (players || []).filter(p => p && p.role), ids = new Set(list.map(p => p.role.id));
    const steps = [], covered = new Set();
    const add = (id, label) => { if (ids.has(id)) { steps.push(label); covered.add(id); } };
    const addAny = (roleIds, label) => {
      const active = roleIds.filter(id => ids.has(id));
      if (active.length) { steps.push(label); active.forEach(id => covered.add(id)); }
    };
    add('cupid','Cupid links the lovers (first night only)');
    add('gravekeeper','Gravekeeper reads the previous exile, if any');
    add('wolfconcubine','Eclipse Consort places the reflection mark');
    add('soulwarden','Soul Warden places Sanctuary');
    if (ids.has('mechwolf') && ids.has('fox')) steps.push('Mechanical Charm, only after Mechanical Wolf has copied Fox');
    add('fox','the real Fox uses charm');
    add('imitator','Imitator studies and uses an immediate copied ability');
    add('merchant','Miracle Merchant grants a gift');
    add('youshang','Traveling Merchant grants a gift');
    if (ids.has('merchant') || ids.has('youshang')) steps.push('the recipient chooses the gift');
    add('fool','Fool places the shield');
    add('alchemist','Alchemist Witch decides whether to open the Mist');
    add('dreamwalker','Dreamwalker selects the dreamer');
    add('gargoyle','Gargoyle inspects a role');
    add('magician','Magician selects the swap');
    add('mechwolf','Mechanical Wolf studies or uses a copied ability other than Mechanical Charm');
    add('guard','Guard selects protection');
    addAny(['werewolf','wolfking','wolfbeauty','whitewolf','wolfconcubine'],'the mutually known wolf pack fixes its attack');
    if (ids.has('mechwolf')) steps.push('Mechanical Wolf attacks, only after gaining attack rights');
    if (ids.has('gargoyle')) steps.push('Gargoyle attacks, only after awakening');
    if (ids.has('magician')) steps.push('the swap is applied and the wolf attack reaches its actual target');
    if (ids.has('imitator')) steps.push('Imitator rescue, only if copied that night');
    add('witch','Witch sees the final wolf-attack target and chooses potions');
    if (ids.has('alchemist')) steps.push('Alchemist Witch may perform the Serpent rescue');
    const customNames = [...new Set(list.filter(p => p.role.customId || (p.role.customAbilities || []).length).map(p => p.role.name))];
    if (customNames.length) { steps.push(`custom night abilities (${customNames.join(', ')})`); list.filter(p => customNames.includes(p.role.name)).forEach(p => covered.add(p.role.id)); }
    add('seer','Seer investigates');
    if (ids.has('merchant') || ids.has('youshang')) steps.push('a gifted investigation, poison, or shield is used');
    add('serialkiller','Serial Killer attacks independently');
    add('wolfbeauty','Wolf Beauty chooses the charm target');
    steps.push('all ordinary night deaths and survival results resolve together');
    const triggers = [];
    if (ids.has('knight')) triggers.push('Knight duel resolves immediately when declared during daytime, then daytime continues.');
    if (ids.has('whitewolf')) triggers.push('White Wolf King self-destruct resolves during formal daytime speech or voting and then sends the game to night.');
    if (ids.has('fool')) triggers.push('Fool exile survival resolves at the daytime exile event.');
    if (ids.has('jester')) triggers.push('Jester victory is checked immediately upon daytime exile or trial conviction.');
    const death = [ids.has('hunter')?'Hunter shot':'',ids.has('wolfking')?'Wolf King bite':'',ids.has('wolfbeauty')?'Wolf Beauty linked death':'',ids.has('cupid')?'lover suicide':'',ids.has('whitecat')?'White Cat reprieve':''].filter(Boolean);
    if (death.length) triggers.push(`${death.join(', ')} trigger at the relevant death or lethal event rather than occupying a normal night-action slot; the system's immediate end-game check still applies.`);
    const noNight = [...ids].filter(id => !covered.has(id) && ROLE_EN[id]).map(id => ROLE_EN[id].name);
    const lines = ['— Public action and resolution order —', `• Fixed night order: ${steps.join(' → ')}`, '• Earlier action means its target or state can affect later actions. Ordinary deaths still resolve together at night end unless a skill explicitly says it resolves immediately.'];
    triggers.forEach(x => lines.push('• ' + x));
    if (noNight.length) lines.push(`• No ordinary active night turn: ${noNight.join(', ')}.`);
    if (ids.has('mechwolf') && ids.has('fox')) lines.push('• Mechanical Charm always precedes the real Fox. If the real Fox is muted before that turn, the Fox did not act and cannot describe the result as their own charm being reflected.');
    if (ids.has('mechwolf') && ids.has('fox') && ids.has('wolfconcubine')) lines.push('• The reflection mark triggers only once per night: if Mechanical Charm consumes it, the later Fox charm cannot be reflected; if Mechanical Charm successfully mutes the Fox, the Fox takes no later action. These outcomes are mutually exclusive.');
    return lines;
  }

  function buildEnglishRules(opts) {
    const players = opts.players || [], ids = [...new Set(players.map(p => p.role && p.role.id).filter(Boolean))];
    const seenRoleKeys = new Set();
    const activeRoles = players.filter(p => p && p.role).map(p => p.role).filter(role => {
      const key = role.customId || role.id;
      if (seenRoleKeys.has(key)) return false;
      seenRoleKeys.add(key);
      return true;
    }).sort((a,b) => String(a.customId || a.id).localeCompare(String(b.customId || b.id)));
    const activeIds = new Set(ids);
    const knownPackRoles = new Set(['werewolf','wolfking','wolfbeauty','whitewolf','wolfconcubine']);
    const knownPackCount = players.filter(p => p.role && knownPackRoles.has(p.role.id)).length;
    const counts = {};
    players.forEach(p => { if (p.role) { const n=p.role.customId ? p.role.name : (ROLE_EN[p.role.id]||p.role).name; counts[n]=(counts[n]||0)+1; } });
    const config = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([n,c]) => c > 1 ? `${c} ${n}` : n).join(' + ');
    const lines = ['[ACTIVE GAME RULES · CONCISE EXPORT]', `Setup: ${players.length} players | ${config}`, '', '— Victory and flow —',
      opts.edge ? '• Edge victory: wolves win by eliminating every god-role or every civilian role present in the setup, or by reaching parity. Good wins by eliminating every wolf.' : '• City victory: wolves win only at parity. Eliminating one role category alone does not end the game. Good wins by eliminating every wolf.',
      `• Flow: night actions → first-day sheriff election → deaths announced → ${opts.singleRound ? 'one' : 'two'} daytime speech round(s) → vote. Extra speeches occur only when the system explicitly opens a tie/PK stage.`,
      '• Speaking permission by phase: Speak only when the system explicitly labels a speech, discussion, campaign statement, PK defense, or wolf-chat stage. During voting/sheriff voting, withdrawal confirmation, night-skill selection, badge transfer, death-skill/duel confirmation, or any other choice-only stage, submit only the choice to the host. Do not add a public speech or ask players questions; no one can answer during that stage.',
      '• Attack-knowledge boundary: being targeted by the wolf attack, protection, an antidote, or dreamwalking does not notify that player that they were attacked, saved, or protected. Only an explicit private system record grants first-hand knowledge of the attack target or rescue result. Without such a record, surviving, seeing a peaceful night, or hearing someone claim “I saved you” cannot verify that you were the attack target.',
      ...(!opts.hardRulesOnly && knownPackCount > 1 ? ['• Known packmates are legal wolf-attack targets, but sacrificing one is justified only by concrete net gain (for example baiting the antidote, building cover, triggering a death skill, or sacrificing a wolf almost certain to be exiled). It must be compared against attacking a good player and must not cause an immediate loss.'] : []),
      opts.hiddenDeath ? '• Hidden deaths: ordinary night deaths reveal neither identity nor private cause. Public skill events remain public.' : '• Public deaths: identities revealed by the system are factual.',
      '• A night choice may only be explained with information available before that night action. A future plan is not an executed action.', '', '— Roles in this game —'];
    activeRoles.forEach(playerRole => {
      const id = playerRole.id;
      const r = playerRole.customId ? playerRole : (ROLE_EN[id] || playerRole);
      const classRole = r ? Object.assign({}, r, playerRole || {}) : null;
      if (r) lines.push(`• ${r.name} (${englishRoleClass(id, classRole)}): ${playerRole.customId ? (playerRole.desc || '') : (ROLE_EN[id] ? buildActiveEnglishRoleDesc(id, activeIds) : (r.desc || ''))}`);
    });
    lines.push('• Only the roles listed above exist in this match. Unlisted roles and their mechanics must not be used as premises for reasoning.');
    lines.push('', ...buildEnglishActiveRoleTiming(players));
    lines.push(window.WolfReasoningContext.nightRules(activeIds, true));
    if (!opts.hardRulesOnly) lines.push('', '— Terminology —','• Use standard English Werewolf/Mafia terms: town, wolf result, town result, counterclaim, bussing, miselimination, voting pattern, and night-kill target. Never translate Chinese jargon literally.','', '— Evidence discipline —','• System verification and your own explicit private action results have highest priority; claims and last words are not automatic proof.','• A single slip, wording issue, rule-summary mismatch, or speaking style is suspicion only—not a standalone conviction.','• Repetition by several players is still one argument. Use voting patterns, sustained behavior, information access, and faction benefit.');
    return lines.join('\n');
  }
  function buildEnglishRulebook(roleIds) {
    const lines=['[WEREWOLF ROLE ENCYCLOPEDIA]','This reference lists every role available in the app. A particular game uses only the roles shown in its setup.',''];
    roleIds.forEach(id => { const r=ROLE_EN[id]; if(r) lines.push(`• ${r.name} (${englishRoleClass(id, r)}): ${r.desc}`); });
    lines.push('', 'Pack rule: known packmates are legal wolf-attack targets only as a deliberate tactical sacrifice with concrete net benefit; accidental or purposeless friendly fire remains bad play.');
    return lines.join('\n');
  }

  window.WolfI18n = {get lang(){return lang;},isEnglish,role,translateText,terminologyGuide,apply,setLang,buildEnglishRules,buildEnglishRulebook,roles:ROLE_EN};
  document.addEventListener('DOMContentLoaded', () => {
    const nativeAlert = window.alert.bind(window), nativeConfirm = window.confirm.bind(window), nativePrompt = window.prompt.bind(window);
    window.alert = message => nativeAlert(translateText(String(message ?? '')));
    window.confirm = message => nativeConfirm(translateText(String(message ?? '')));
    window.prompt = (message, value) => nativePrompt(translateText(String(message ?? '')), value);
    apply();
    const observer = new MutationObserver(list => {
      if (!isEnglish()) return;
      list.forEach(m => {
        m.addedNodes.forEach(translateNode);
        if (m.type === 'characterData') translateNode(m.target);
      });
    });
    observer.observe(document.body, {subtree:true,childList:true,characterData:true});
  });
})();
