// 守卫「撞药避让」教学的回归测试。
// 背景：旧文案只说"越明显该救的目标越要避开，去守不显眼的人"，AI 照做之后会把
// 整晚的决策预算花在躲同守同救上，最后守了一个低价值目标，还把两个正相关的量
// （被刀概率、被救概率）当独立事件算，凑出一个并不存在的"低撞药又值钱"甜点位。
import assert from 'node:assert/strict';
import fs from 'node:fs';

const failures = [];
const expect = (ok, message) => { if (!ok) failures.push(message); };

for (const file of ['index.html', 'en/index.html']) {
  const src = fs.readFileSync(file, 'utf8');

  // 前提一：避让逻辑依赖女巫手里还有解药，用掉就作废
  expect(src.includes('前提一:女巫手里还有解药。'), `${file}: 守卫教学没有把"女巫还有解药"列为避让前提`);
  expect(src.includes('撞药概率大幅下降,这条避让逻辑基本作废'), `${file}: 未说明解药用完后避让逻辑失效`);
  expect(src.includes('本局若有摹术师,他仿制出来的解药同样会和你的守护触发同守同救'), `${file}: 未把摹术师的仿制解药算进撞药风险`);
  expect(src.includes('每晚行动前先问一句:她还有药吗?'), `${file}: 缺少每晚自查解药状态的动作`);

  // 前提二：被刀概率与被救概率正相关，"低撞药又值得守"多半是幻觉
  expect(src.includes('【被刀概率和被救概率是正相关的,不是两件独立的事】'), `${file}: 未指出两个概率正相关`);
  expect(src.includes('大多数时候是你自己算出来的幻觉'), `${file}: 未点破"甜点位"是幻觉`);

  // 真正的选择收敛成两条，"找个不起眼的人守"不再是被推荐的第三条路
  expect(src.includes('【所以真正的选择通常只有两个,不是三个】'), `${file}: 没有把选择收敛成守关键位/空守`);
  expect(src.includes('理由必须是"我判断今晚刀他",不能是"守他不会撞车"'), `${file}: 未要求守低调目标时给出刀口判断依据`);

  // 旧的一刀切文案不能残留
  expect(!src.includes('你可以守那些不那么显眼但你判断可能被刀的人。两个人互补,而不是抢同一个目标。'),
    `${file}: 旧的"去守不显眼的人"文案仍在`);
  expect(!/女巫越可能救——你越要避开/.test(src), `${file}: 旧的无条件避让句仍在`);

  // 不要把话说反：解药还在时，避开女巫必救的目标仍然是对的
  expect(src.includes('在她【手里还有解药】的前提下'), `${file}: 避让建议丢掉了"解药还在"这个限定`);
}

if (failures.length) {
  console.error(failures.map(m => `FAIL ${m}`).join('\n'));
  process.exit(1);
}
console.log('guard guidance: antidote precondition, knife/save correlation and two-way choice passed');
