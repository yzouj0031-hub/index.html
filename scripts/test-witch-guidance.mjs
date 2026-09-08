import fs from 'node:fs';

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

for (const file of ['index.html', 'en/index.html']) {
  const src = fs.readFileSync(file, 'utf8');

  expect(src.includes('【跳与藏·按你的诉求决定，禁止中间状态】'), `${file}: witch guide lacks the claim-or-hide rule`);
  expect(src.includes('首夜救人后白天跳出来报银水，是完全正当的常规选择'), `${file}: witch guide still treats the day-1 silver-water claim as a mistake`);
  expect(src.includes('禁止"我知道昨晚的事但现在不方便说"'), `${file}: witch guide does not forbid the half-claim`);
  expect(!src.includes('都不足以抵消暴露代价'), `${file}: old anti-disclosure sentence remains`);
  expect(!src.includes('有身份信息就报清记录'), `${file}: day prompt still pushes unconditional disclosure`);
  expect(src.includes('隐藏身份的神职，理由只能来自台面上人人可见的信息'), `${file}: day prompt does not scope hidden-god reasons to public info`);
  expect(src.includes('使用解药不等于必须跳身份'), `${file}: antidote use still implies disclosure`);
  expect(src.includes('行动事实不等于公开自证'), `${file}: private action and public proof are not separated`);
  expect(src.includes('摄梦等其他保护可以和解药同时作用而只是重复保护'), `${file}: dream protection overlap is unclear`);
  expect(src.includes('【刀口权限·以解药库存为准】'), `${file}: witch guide does not explicitly scope knife knowledge to antidote availability`);
  expect(src.includes('只有解药仍在的夜晚才能获知狼刀目标，使用解药的当夜仍可见，从下一夜起不再获得刀口信息'), `${file}: exported witch rules do not define the knife-knowledge boundary`);
  expect(src.includes('你的解药已经用完，因此本夜不会获知刀口'), `${file}: web relay does not hide the knife target after antidote use`);
  expect(src.includes('你仍持有解药，因此主持人会告诉你今晚的刀口'), `${file}: web relay does not condition knife knowledge on antidote availability`);
  expect(!src.includes('女巫私密行动阶段，不是公开发言。主持人会告诉你今晚的刀口'), `${file}: unconditional web-relay knife disclosure remains`);
  expect(!src.includes('【女巫的跳身份资本】'), `${file}: old pro-disclosure witch section remains`);
  expect(!src.includes('能洗清他、同时自证'), `${file}: witch claim still promises automatic self-proof`);

  expect(src.includes('【先后手不是身份公式】'), `${file}: counterclaim timing is still treated as a formula`);
  expect(src.includes('论证错不等于身份假，论证对也不等于身份真'), `${file}: identity and reasoning are not separated`);
  expect(!src.includes('嫌疑权重:后跳 > 先跳'), `${file}: late claimant still receives a fixed suspicion penalty`);

  expect(src.includes('公开发言不设短回复目标：要让别人听懂你现在想推动什么'), `${file}: free-output prompt still permits an underspecified ordinary speech`);
  expect(!src.includes('长度由你自己控制——通常 100-200 字'), `${file}: obsolete 100-200 character anchor remains`);
}

const source = fs.readFileSync('teaching-worldbooks.js', 'utf8');
expect(source.includes('【身份、行动事实与推理分开】'), 'official worldbook lacks perspective separation');
expect(source.includes('石像鬼等能获知具体身份的角色'), 'official worldbook ignores exact-role informed counterclaims');
expect(source.includes('【女巫：跳藏按诉求，不留中间态】'), 'official good-team worldbook lacks the witch claim-or-hide rule');
  expect(!source.includes('【女巫默认隐藏】'), 'official good-team worldbook still forces witch hiding');
expect(!source.includes('预言家、女巫等若继续沉默会让假神长期控制归票和错误信息，通常应带着真实记录回应'), 'old generic reveal instruction remains');

const preset = JSON.parse(fs.readFileSync('worldbook_ryuzaki_masterclass.json', 'utf8'));
const byId = Object.fromEntries(preset.worldbooks.map(book => [book.id, book.content]));
expect(byId.wb_advanced_evidence_endgame?.includes('身份、行动事实与推理分开'), 'exportable preset lacks identity/reasoning separation');
expect(byId.wb_advanced_good_counterclaim?.includes('【女巫：跳藏按诉求，不留中间态】'), 'exportable preset lacks the witch claim-or-hide rule');

if (failures.length) {
  console.error(failures.map(message => `FAIL ${message}`).join('\n'));
  process.exit(1);
}

console.log('witch guidance: claim-or-hide (no half-claim), perspective separation and complete public speech passed');
