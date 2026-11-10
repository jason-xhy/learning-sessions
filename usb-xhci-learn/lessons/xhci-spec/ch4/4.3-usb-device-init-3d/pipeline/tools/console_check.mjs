// console_check.mjs —— console 双域 clean 门（Runtime.consoleAPICalled + Log.entryAdded 由 drive 双监听汇总到输出）
// 用法：node pipeline/tools/console_check.mjs [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …]
// 覆盖面：加载 + 12 工段 instant 巡检（timeline.stages 驱动）+ F6/F7 动画工段 + 分支预设切换
//        （timeline.branches.chips 驱动）+ 互动全程（lab 三关快链）+ 试错（F5）。
// 被消费分区：timeline（stages/branches）、interactions（快链入口）。
// 下游复用：S5/S6/S7 每轮构建后回归。
import { parseArgs, resolvePaths, loadDSL, runDrive, consoleVerdict, click } from "./lib.mjs";

const opts = parseArgs(process.argv, { width: "1440", height: "900" });
const { dslPath, page, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);

const nStages = DSL.timeline.stages.length;
const chips = DSL.timeline.branches.chips.map((c) => c.id);
const actions = [
  ["wait", 3200],
  ["eval", `for (let i = 0; i < ${nStages}; i++) window.__x43.goto(i, { instant: true }); 'instant-sweep-ok'`],
  ["eval", `window.__x43.goto(6); 'play-f6'`],
  ["wait", 21000], // 覆盖 F6 全步序含 irqFlash（8.5s base ≈17s wall @0.5×）
  ["eval", `window.__x43.goto(7); 'play-f7'`],
  ["wait", 24000], // 覆盖 F7 全步序含 irqFlash+回执链
];
for (const id of chips) {
  actions.push(["eval", `window.__x43.setPreset('${id}'); 'preset-${id}'`]);
  actions.push(["wait", 500]);
}
actions.push(
  ["eval", `window.__x43.setPreset('${chips[0]}'); window.__x43.goto(5,{instant:true}); 'f5'`],
  ["eval", `window.__x43.tab('lab'); 'lab'`],
  ...click('[data-labstart="L1"]'),
  ...click('[data-l1pick="1"]'),
  ["wait", 800],
  ...click('[data-labstart="L2"]'),
  ["eval", `window.__x43.lab.L1.pick(1); 'lab-invalid-entry-ignored'`], // 无效入口（跨关调用应被状态机忽略，不产生输出）
  ["wait", 300],
  ["eval", `window.__x43.goto(5); window.__x43.triggerError(); 'tryerror'`],
  ["wait", 8000],
  ["eval", `window.__x43.onControl ? window.__x43.playing() + '' : 'x'`],
);

const { code, out } = await runDrive(drive, page, actions, { width: W, height: H });
process.stdout.write(out);
const v = consoleVerdict(out);
console.log(v.clean ? "CONSOLE-CHECK-PASS（双域 clean：加载+instant 巡检+动画工段+预设切换+互动+试错）" : "CONSOLE-CHECK-FAIL:\n  " + v.bad.join("\n  "));
process.exit(v.clean && code === 0 ? 0 : 1);
