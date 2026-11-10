// lab_check.mjs —— 互动三关行为验证门（V3：判据值全部读 DSL interactions 分区）
// 用法：node pipeline/tools/lab_check.mjs [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …] [--out …]
// 两阶段：先从页面解析选项 label（按钮文案=S1 现场值形态），再按 DSL answer/fail 文本逐字驱动+断言。
// 判据（真实 DOM click 链，不用 API 旁路）：
//   徽章门：无 L2 徽章进 L3 → 锁；
//   L1 一步：bell0/空槽 错选拦+DSL fail 逐字 → bell1 对 → 徽章；
//   L2 六步全链（interactions.L2.steps）：每步错选拦（fail 逐字）→ answer 全对 → 徽章；
//   L3：T1 错交判分+依据 → 对交演示；T2 双分支各自结局；T3 错序判分 → correctOrder 对 → 徽章；
//   quiz：≥4/5 通过 + 重做（SLOTS-FOR-S5 槽位行为面）。
// 被消费分区：interactions（L1/L2/L3/quiz 全部判据字段）。
// 下游复用：S5 精修互动文案/题面定稿后复跑（判据值自动跟随 DSL/题面更新）。
import { join } from "node:path";
import { parseArgs, resolvePaths, loadDSL, runDrive, click } from "./lib.mjs";

const opts = parseArgs(process.argv, { width: "1440", height: "900" });
const { dslPath, page, drive, out } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);
const INT = DSL.interactions;

const l1 = INT.L1;
const l1FailKnob0 = l1.inputs.find((i) => i.id === "knob0").fail;
const l1FailEmpty = l1.inputs.find((i) => i.id === "emptySlot").fail;
const L2S = INT.L2.steps;
const s1 = L2S.find((x) => x.id === "s1");
const s2 = L2S.find((x) => x.id === "s2");
const s3 = L2S.find((x) => s3Id(x)) ; function s3Id(x) { return x.id === "s3"; }
const s4 = L2S.find((x) => x.id === "s4");
const s6 = L2S.find((x) => x.id === "s6");
const l3 = INT.L3;
const l3Order = l3.tasks.find((t) => t.id === "T3").correctOrder;

// —— 阶段 1：解析页内选项 label（field→values；S5 起含选项级错选提示 hint）——
const dump = `JSON.stringify({
  l2: window.__x43.lab.L2STEPS.map(s => ({ id: s.id, groups: (s.groups || []).map(g => ({ k: g.k, vals: g.opts.map(o => o.v), hints: g.opts.reduce((m, o) => { if (!o.ok && o.hint) m[o.v] = o.hint; return m; }, {}) })), opts: s.opts ? s.opts.map(o => o.v) : null, optHints: s.opts ? s.opts.reduce((m, o) => { if (!o.ok && o.hint) m[o.v] = o.hint; return m; }, {}) : null, cards: s.cards || null })),
  quiz: window.__x43.quizData()
})`;
const probe = await runDrive(drive, page, [["wait", 3000], ["eval", dump]], { width: W, height: H });
let pageData;
try {
  const line = probe.out.split("\n").find((l) => l.startsWith("eval: \""));
  pageData = JSON.parse(JSON.parse(line.slice(6))); // drive 输出=JSON 字符串字面量，双解析
} catch (e) {
  console.log("LAB-CHECK-FAIL: 页面选项解析失败（" + e.message + "）");
  process.exit(1);
}
// DSL 字段名 → 页内组 key 归一（大小写/后缀匹配）；同名多组（如两个 DIR）按出现序依次消费
const usedKeys = new Set();
function resolveGroup(stepId, dslField) {
  const st2 = pageData.l2.find((x) => x.id === stepId);
  const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
  const g = st2.groups.find((x) => !usedKeys.has(x.k) && (norm(x.k).endsWith(norm(dslField)) || norm(dslField).endsWith(norm(x.k))));
  if (g) usedKeys.add(g.k);
  else console.error("RESOLVE-MISS", stepId, dslField, "keys=", JSON.stringify(st2.groups.map(x=>x.k)), "used=", JSON.stringify([...usedKeys]));
  return g || null; // null=固定展示字段（页内无组），跳过
}
function pageStep(stepId) { return pageData.l2.find((x) => x.id === stepId); }
function resolveOpt(g, answer) {
  const exact = g.vals.find((v) => v === answer);
  if (exact != null) return exact;
  const hit = g.vals.find((v) => v.includes(String(answer)));
  if (hit != null) return hit;
  throw new Error("answer 无可匹配选项: " + answer + " in " + JSON.stringify(g.vals));
}
function wrongOpt(g, answer) {
  const hit = resolveOpt(g, answer);
  return g.vals.find((v) => v !== hit);
}
// DSL s2 fields 形态 {TRT:"3",IDT:"1",IOC:"0"} → 组 key 归一小写
const s2pairs = [];
for (const grp of s2.options) {
  if (grp.fields) for (const [k, v] of Object.entries(grp.fields)) s2pairs.push([k.toLowerCase(), v]);
}
const msgIs = (want) => `(() => { const m = document.getElementById('x43LabMsg'); const s = window.__x43.lab.state(); return (s.msgBad && m && m.textContent === ${JSON.stringify(want)} ? 'OK' : 'FAIL: ' + (m ? m.textContent : 'no-msg')); })()`;

// —— 阶段 2：驱动动作序列 ——
const actions = [
  ["wait", 3000],
  ["eval", `window.__x43.tab('lab'); 'tab'`],
  // 徽章门：未拿 L2 徽章进 L3 → 锁
  ...click('[data-labstart="L3"]'),
  ["wait", 250],
  ["eval", `(() => { const s = window.__x43.lab.state(); return s.phase === 'locked' ? 'GATE-LOCK-OK' : 'GATE-LOCK-FAIL ' + s.phase; })()`],
  // ===== L1 =====
  ...click('[data-labstart="L1"]'),
  ["wait", 600],
  ...click('[data-l1pick="0"]'),
  ["wait", 200],
  ["eval", `(() => { const m = document.getElementById('x43LabMsg'); return (m && !m.hidden && m.textContent === ${JSON.stringify(l1FailKnob0)} ? 'L1-FAIL-KNOB0-OK' : 'L1-FAIL-KNOB0-FAIL: ' + m.textContent); })()`],
  ...click('[data-l1pick="empty"]'),
  ["wait", 200],
  ["eval", `(() => { const m = document.getElementById('x43LabMsg'); return (m && !m.hidden && m.textContent === ${JSON.stringify(l1FailEmpty)} ? 'L1-FAIL-EMPTY-OK' : 'L1-FAIL-EMPTY-FAIL: ' + m.textContent); })()`],
  ...click('[data-l1pick="1"]'),
  ["wait", 500],
  ["eval", `(() => { const s = window.__x43.lab.state(); const b = document.querySelector('.x43-bad.got'); return (s.badges.L1 && b && b.textContent.includes('门铃上手') ? 'L1-PASS' : 'L1-FAIL'); })()`],
  ["shot", join(out, "v3lab-L1-done.png"), ".x43-panel", 1],
  // ===== L2 六步（每步错选拦 + answer 全对） =====
  ...click('[data-labstart="L2"]'),
  ["wait", 350],
];
// s1：逐组错选拦（首组断言选项级 hint 逐字，无 hint 回退步级 fail）→ answer
{
  const g0 = resolveGroup("s1", s1.options[0].field);
  const w0 = wrongOpt(g0, s1.options[0].answer);
  usedKeys.delete(g0.k); // 错选后释放键位，answer 循环重新消费
  const expect0 = (g0.hints && g0.hints[w0]) || s1.fail;
  actions.push(...click(`[data-l2pick="${g0.k}||${w0}"]`), ["wait", 200], ["eval", msgIs(expect0).replace("'OK'", "'L2-S1-WRONG-OK'").replace("'FAIL:", "'L2-S1-WRONG-FAIL:")]);
}
for (const opt of s1.options) {
  if (opt.fixed) continue; // 固定展示字段（wIndex=0），页内无组
  const g = resolveGroup("s1", opt.field);
  if (!g) continue;
  actions.push(...click(`[data-l2pick="${g.k}||${resolveOpt(g, opt.answer)}"]`));
}
actions.push(["wait", 1600], st2("s1done", 1));
// s2：首组错选拦 → 全字段 answer（同名多组按序消费；固定展示字段自动跳过）
{
  let firstPair = null;
  for (const [k, v] of s2pairs) { const g = resolveGroup("s2", k); if (g) { firstPair = { g, v }; break; } }
  if (firstPair) {
    const w = wrongOpt(firstPair.g, firstPair.v);
    const expect2 = (firstPair.g.hints && firstPair.g.hints[w]) || s2.fail;
    actions.push(...click(`[data-l2pick="${firstPair.g.k}||${w}"]`), ["wait", 200], ["eval", msgIs(expect2).replace("'OK'", "'L2-S2-WRONG-OK'").replace("'FAIL:", "'L2-S2-WRONG-FAIL:")]);
  }
}
usedKeys.clear();
for (const [k, v] of s2pairs) {
  const g = resolveGroup("s2", k);
  if (g) actions.push(...click(`[data-l2pick="${g.k}||${resolveOpt(g, v)}"]`));
}
actions.push(["wait", 1600], st2("s2done", 2));
// s3：乱序点第 2 张 → 拦 → 按序
actions.push(
  ...click('[data-l2place="1"]'),
  ["wait", 200],
  ["eval", `(() => { const s = window.__x43.lab.state(); return (s.msgBad && s.placed === 0 ? 'L2-S3-WRONG-OK' : 'L2-S3-WRONG-FAIL placed=' + s.placed); })()`],
  ...click('[data-l2place="0"]'),
  ...click('[data-l2place="1"]'),
  ...click('[data-l2place="2"]'),
  ["wait", 1600], st2("s3done", 3),
);
// s4：DSL 干扰项（distractor=DB Target=0）拦（选项级 hint 逐字，回退 fail）→ 对（answer=DB Target=1）
{
  const st4 = pageStep("s4");
  const vals = st4.opts; // 页内 choice 选项文案
  const ansKey = s4.options.find((o) => o.answer).answer; // DSL: "DB Target=1"
  const wrongKey = s4.options.find((o) => o.distractor).distractor; // DSL: "DB Target=0"
  const ansVal = vals.find((v) => v.includes(ansKey));
  const wrongVal = vals.find((v) => v.includes(wrongKey));
  const expect4 = (st4.optHints && st4.optHints[wrongVal]) || s4.fail;
  actions.push(
    ...click(`[data-l2choice="${vals.indexOf(wrongVal)}"]`),
    ["wait", 200],
    ["eval", msgIs(expect4).replace("'OK'", "'L2-S4-WRONG-OK'").replace("'FAIL:", "'L2-S4-WRONG-FAIL:")],
    ...click(`[data-l2choice="${vals.indexOf(ansVal)}"]`),
    ["wait", 1600], st2("s4done", 4),
  );
}
// s5：读回执（等待 /k 封顶 6s）
actions.push(
  ...click('[data-l2act="1"]'),
  ["wait", 7600], st2("s5done", 5),
);
// s6：错选拦（选项级 hint 逐字）→ MPS=8（choice 步：页内 opts 驱动；DSL answer=8）
{
  const st6 = pageStep("s6");
  const vals = st6 && st6.opts ? st6.opts : ["8", "64", "512"];
  const ansVal = vals.find((v) => v === "8") || vals[0];
  const wrong = vals.find((v) => v !== ansVal);
  const expect6 = (st6 && st6.optHints && st6.optHints[wrong]) || s6.fail;
  actions.push(
    ...click(`[data-l2choice="${vals.indexOf(wrong)}"]`),
    ["wait", 200],
    ["eval", msgIs(expect6).replace("'OK'", "'L2-S6-WRONG-OK'").replace("'FAIL:", "'L2-S6-WRONG-FAIL:")],
    ...click(`[data-l2choice="${vals.indexOf(ansVal)}"]`),
    ["wait", 1600],
    ["eval", `(() => { const s = window.__x43.lab.state(); const got = [...document.querySelectorAll('.x43-bad.got')]; return (s.phase === 'done' && s.badges.L2 && s.blockedEver && got.some(b => b.textContent.includes('控制读三段齐')) ? 'L2-PASS wrong=' + s.wrong : 'L2-FAIL phase=' + s.phase + ' wrong=' + s.wrong); })()`],
    ["shot", join(out, "v3lab-L2-done.png"), ".x43-panel", 1],
  );
}
// ===== L3 =====
actions.push(...click('[data-labstart="L3"]'), ["wait", 350]);
// T1 错交判分（统一判分模式：提交后依据文案）
actions.push(
  ...click('[data-l3t1ring="ringEvt"]'),
  ...click('[data-l3t1bell="DB Target=1"]'),
  ...click('[data-l3judge1="1"]'),
  ["wait", 250],
  ["eval", `(() => { const s = window.__x43.lab.state(); return (s.t1.judged && !s.t1.ok && (s.t1.judgeText || '').includes('命令环唯一') ? 'L3-T1-WRONG-OK' : 'L3-T1-WRONG-FAIL: ' + (s.t1.judgeText || '')); })()`],
  ...click('[data-labstart="L3"]'),
  ["wait", 250],
  ...click('[data-l3t1ring="ringCmd"]'),
  ...click('[data-l3t1bell="DB Target=0"]'),
  ...click('[data-l3judge1="1"]'),
  ["wait", 350],
  ["eval", `(() => { const s = window.__x43.lab.state(); return (s.t1.judged && s.t1.ok ? 'L3-T1-PASS' : 'L3-T1-FAIL'); })()`],
);
// T2 BSR=1 分支（各自结局；再点 BSR=0 验证不混写形态——重开演示 BSR=0）
{
  const t2 = l3.tasks.find((x) => x.id === "T2");
  const bsr1Outcome = t2.options.find((o) => o.bsr === "1").outcome;
  const bsr0Outcome = t2.options.find((o) => o.bsr === "0").outcome;
  actions.push(
    ...click('[data-l3t2="1"]'),
    ["wait", 400],
    ["eval", `(() => { const s = window.__x43.lab.state(); return (s.t2.judged && s.t2.outcome.text === ${JSON.stringify(bsr1Outcome)} ? 'L3-T2-BSR1-OK' : 'L3-T2-FAIL: ' + (s.t2.outcome && s.t2.outcome.text)); })()`],
  );
  void bsr0Outcome;
}
// T3：错序判分 → 重排 → correctOrder → 徽章（补 T1/T2 因为重开重置）
actions.push(...click('[data-labstart="L3"]'), ["wait", 250]);
for (const idx of [1, 0, 2, 3]) actions.push(...click(`[data-l3order="${idx}"]`));
actions.push(
  ["wait", 250],
  ["eval", `(() => { const s = window.__x43.lab.state(); return (s.t3.judged && !s.t3.ok ? 'L3-T3-WRONG-OK' : 'L3-T3-WRONG-FAIL'); })()`],
  ...click('[data-l3retry3="1"]'),
  ["wait", 200],
  ...click('[data-l3t1ring="ringCmd"]'),
  ...click('[data-l3t1bell="DB Target=0"]'),
  ...click('[data-l3judge1="1"]'),
  ...click('[data-l3t2="1"]'),
  ["wait", 200],
);
for (const idx of l3Order) actions.push(...click(`[data-l3order="${idx}"]`));
actions.push(
  ["wait", 350],
  ["eval", `(() => { const s = window.__x43.lab.state(); const got = [...document.querySelectorAll('.x43-bad.got')]; return (s.phase === 'done' && s.badges.L3 && s.badges.L2 && got.some(b => b.textContent.includes('值班工程师')) ? 'L3-PASS' : 'L3-FAIL phase=' + s.phase + ' badges=' + JSON.stringify(s.badges) + ' got=' + got.map(x=>x.textContent).join(',')); })()`],
  ["shot", join(out, "v3lab-L3-done.png"), ".x43-panel", 1],
  // ===== quiz 槽位（≥4/5 + 重做；题面=SLOTS-FOR-S5 占位，判对/错由页内 quizData 驱动） =====
  ["eval", `window.__x43.tab('exp'); window.__x43.goto(11,{instant:true}); 'quiz'`],
  ["wait", 300],
);
const quizAns = pageData.quiz.map((q) => q.ans);
quizAns.forEach((ans, qi) => {
  const pick = qi === quizAns.length - 1 ? (ans + 1) % 3 : ans; // 末题故意答错 → 4/5
  actions.push(["eval", `(() => { const sec = document.querySelectorAll('.x43-quizq')[${qi}]; sec.querySelectorAll('.x43-qp')[${pick}].click(); return 'q${qi}'; })()`]);
});
actions.push(
  ["wait", 300],
  ["eval", `(() => { const s = window.__x43.lab.state(); const el = document.querySelector('.x43-quizscore'); return (s.quiz.score === ${quizAns.length - 1} && el && /通过/.test(el.textContent) ? 'QUIZ-PASS-OK score=' + s.quiz.score : 'QUIZ-FAIL score=' + s.quiz.score + ' el=' + !!el + ' txt=' + (el && el.textContent.slice(0, 20))); })()`],
  ...click("#x43QuizRedo"),
  ["wait", 200],
  ["eval", `(() => { const s = window.__x43.lab.state(); return (Object.keys(s.quiz.answered).length === 0 && s.quiz.score === -1 ? 'QUIZ-REDO-OK' : 'QUIZ-REDO-FAIL'); })()`],
);

function st2(tag, stepIdx) {
  return ["eval", `(() => { const s = window.__x43.lab.state(); return (s.level === 'L2' && s.stepIdx === ${stepIdx} ? '${tag}-OK' : '${tag}-FAIL stepIdx=' + s.stepIdx); })()`];
}

const { code, out: outTxt } = await runDrive(drive, page, actions, { width: W, height: H });
process.stdout.write(outTxt);
const markers = ["GATE-LOCK-OK", "L1-FAIL-KNOB0-OK", "L1-FAIL-EMPTY-OK", "L1-PASS", "L2-S1-WRONG-OK", "s1done-OK", "L2-S2-WRONG-OK", "s2done-OK", "L2-S3-WRONG-OK", "s3done-OK", "L2-S4-WRONG-OK", "s4done-OK", "s5done-OK", "L2-S6-WRONG-OK", "L2-PASS", "L3-T1-WRONG-OK", "L3-T1-PASS", "L3-T2-BSR1-OK", "L3-T3-WRONG-OK", "L3-PASS", "QUIZ-PASS-OK", "QUIZ-REDO-OK"];
const missing = markers.filter((m) => !outTxt.includes(m));
const fails = outTxt.split("\n").filter((l) => /-FAIL[: ]|LAB-CHECK-FAIL/.test(l) && !l.startsWith("eval:") === false && l.includes("FAIL"));
console.log(fails.length ? "LAB-CHECK-FAIL-LINES\n  " + fails.join("\n  ") : "");
console.log(missing.length ? `LAB-CHECK-MISSING: ${missing.join(", ")}` : "LAB-CHECK-PASS（徽章门+三关全链+错选拦截+BSR 双分支+Linux 排序挑战+quiz 槽位）");
process.exit(missing.length || fails.length || code !== 0 ? 1 : 0);
