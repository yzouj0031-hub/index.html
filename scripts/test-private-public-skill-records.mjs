import fs from 'node:fs';

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

for (const file of ['index.html', 'en/index.html']) {
  const src = fs.readFileSync(file, 'utf8');

  expect(src.includes('【内部真账本 ≠ 对外公开口径】'), `${file}: universal private/public record boundary is missing`);
  expect(src.includes('不得因为公开撒过谎而改写'), `${file}: public lies can overwrite the internal record`);
  expect(src.includes('如实报告、暂不报、只报一部分，或虚报一份符合规则的行动记录'), `${file}: public strategic concealment is not allowed`);
  expect(src.includes('神职公开声称的行动记录'), `${file}: claimed records are still treated as automatic facts`);
  expect(src.includes('不能因为“真神就该如实报”而自动采信'), `${file}: public god claims are automatically trusted`);
  expect(src.includes('【公开守护记录：真账本与公开口径分离】'), `${file}: guard guide lacks the scoped deception rule`);
  expect(src.includes('公开说法不只会骗狼，也会被女巫和其他好人听到'), `${file}: guard deception ignores friendly-information cost`);
  expect(src.includes('不要编造系统反馈，也不要把推测说成守中事实'), `${file}: guard may fabricate system feedback`);
  expect(src.includes('【跳与藏·按收益决定，避免无计划半跳】'), `${file}: runtime witch guide retains an unconditional disclosure rule`);
  expect(src.includes('决定公开身份时，完整真报是低污染标准路线'), `${file}: day-phase prompt still forces complete truthful disclosure`);
  expect(src.includes('【查验结果·内部真实完整记录（不可被公开口径改写）】'), `${file}: seer record block still conflates private truth with public claims`);
  expect(!src.includes('每次跳身份都必须完整报出'), `${file}: seer record block still forces full disclosure`);
  expect(!src.includes('跳身份时必须如实报告'), `${file}: seer result memory still forces truthful disclosure`);
  expect(!src.includes('如果你这轮决定公开身份，就把记录报完整'), `${file}: day-phase prompt still forces full disclosure`);

  const rawGuardMatch = src.match(/reg\(\{id:'guard',[^\n]*guide:'((?:\\.|[^'])*)'\+N1\}\);/);
  expect(Boolean(rawGuardMatch), `${file}: raw guard guide could not be inspected`);
  if (rawGuardMatch) {
    const rawGuardGuide = Function(`return '${rawGuardMatch[1]}'`)();
    const legacySection = /\n\n【⚠️ 高阶话术·跳身份时可以给守护记录撒个小谎骗刀——残局赚平安夜的杀手锏】[\s\S]*?(?=\n\n【高阶意识】)/;
    expect(legacySection.test(rawGuardGuide), `${file}: guard-guide normalization no longer matches its target section`);
  }

  const rawWitchMatch = src.match(/reg\(\{id:'witch',[^\n]*guide:'((?:\\.|[^'])*)'\+N1\}\);/);
  expect(Boolean(rawWitchMatch), `${file}: raw witch guide could not be inspected`);
  if (rawWitchMatch) {
    const rawWitchGuide = Function(`return '${rawWitchMatch[1]}'`)();
    const legacyWitchSection = /(?:\n\n|\\n\\n)【跳与藏·按你的诉求决定，禁止中间状态】[\s\S]*?(?=(?:\n\n|\\n\\n)【行动事实不等于公开自证】)/;
    expect(legacyWitchSection.test(rawWitchGuide), `${file}: witch-guide normalization no longer matches its target section`);
  }
}

const source = fs.readFileSync('teaching-worldbooks.js', 'utf8');
expect(source.includes('【真实账本与公开口径分离】'), 'official worldbook lacks private/public record separation');
expect(source.includes('不得因为对外说过另一套，就改写实际历史或把假口径当成系统反馈'), 'official worldbook can rewrite internal history');
expect(source.includes('合法但不真实的行动口径'), 'official worldbook still forces complete truthful disclosure');
expect(source.includes('守卫报出上一夜目标会直接暴露不能连守的保护空档'), 'official worldbook does not explain the guard-specific value');
expect(source.includes('预言家假验人、女巫假药账等会直接污染好人归票'), 'official worldbook lacks role-specific deception costs');
expect(!source.includes('第二天必须如实报告自己真正收到的系统记录'), 'old unconditional next-day disclosure rule remains');

const preset = JSON.parse(fs.readFileSync('worldbook_ryuzaki_masterclass.json', 'utf8'));
const records = preset.worldbooks.find(book => book.id === 'wb_advanced_night_records')?.content || '';
expect(records.includes('【真实账本与公开口径分离】'), 'exportable preset lacks private/public record separation');
expect(records.includes('合法但不真实的行动口径'), 'exportable preset still forces truthful public logs');
expect(records.includes('公开说法不只会骗狼') || records.includes('队友也会听到这套口径'), 'exportable preset ignores friendly-information cost');
expect(!records.includes('第二天如实报告实际系统记录'), 'exportable preset retains unconditional truthful disclosure');

if (failures.length) {
  console.error(failures.map(message => `FAIL ${message}`).join('\n'));
  process.exit(1);
}

console.log('private/public skill records: true internal ledger, strategic public claims and friendly costs passed');
