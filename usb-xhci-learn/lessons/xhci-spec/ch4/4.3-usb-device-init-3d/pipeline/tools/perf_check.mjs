// perf_check.mjs —— 性能门（V1 用户反馈①）：默认 0.5× 全线联动自动巡游墙钟 ≤8 分钟 + 巡游全程无 >100ms 长任务
// 用法：node pipeline/tools/perf_check.mjs [--k 0.5] [--maxMin 8] [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …]
// 实现：--preload 注入 PerformanceObserver('longtask') 计数/峰值；页内 runAll 触发 F0→F11 全自动巡游；
//      until 轮询 window.__x43TourDone（advanceFrom 末段写入 {wallMs,k}）。
// 被消费分区：meta.speedModel（kDefault/封顶）、timeline（STAGE_GAP 排程）。
// 下游复用：S5/S6/S7 构建后回归。
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseArgs, resolvePaths, loadDSL, runDrive } from "./lib.mjs";

const opts = parseArgs(process.argv, { k: "0.5", maxMin: "8", width: "1440", height: "900" });
const { dslPath, page, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);
const k = Number(opts.k);
const maxWallMs = Number(opts.maxMin) * 60 * 1000;

const preload = join(tmpdir(), "x43_longtask_obs.js");
writeFileSync(preload, `
(function(){
  window.__longtasks = []; // {start,dur}——start 用于剔除加载期（门判据=巡游中无 >100ms）
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longtasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) });
    });
    po.observe({ entryTypes: ['longtask'] });
  } catch (e) { window.__longtasks = [{ start: -1, dur: -1 }]; }
})();
`);

const untilJs = `(() => { const d = window.__x43TourDone; return d ? (d.wallMs > 0 && Math.abs(d.k - ${k}) < 0.01) : false; })()`;
const dumpJs = `(() => {
  const d = window.__x43TourDone;
  const all = window.__longtasks || [];
  const mid = all.filter((x) => x.start >= (window.__tourStartPerf || 0)); // 巡游中（剔除加载期任务）
  const lt = mid.filter((x) => x.dur > 100);
  return JSON.stringify({ wallMs: d ? d.wallMs : -1, k: d ? d.k : 0, longtasksOver100: lt.length, ltMax: lt.length ? Math.max(...lt.map((x) => x.dur)) : 0, ltAt: lt.map((x) => Math.round((x.start - (window.__tourStartPerf || 0)) / 1000)), loadLongtasks: all.length - mid.length, stage: window.__x43.stageIndex(), receipts: window.__x43.sceneState().receipts });
})()`;
const actions = [
  ["wait", 3200],
  ["eval", `window.__x43.setSpeed(${k}); 'k-set'`],
  ["eval", `window.__x43.tab('exp'); window.__x43.playing() === false ? 'ready' : 'busy'`],
  ["eval", `(() => { const btn = document.getElementById('x43BtnRun'); window.__tourStartPerf = performance.now(); btn.click(); return 'run-all-clicked'; })()`],
  ["until", untilJs, Math.ceil(maxWallMs * 1.3)],
  ["eval", dumpJs],
];

const { code, out } = await runDrive(drive, page, actions, { width: W, height: H, preload });
process.stdout.write(out);
const line = out.split("\n").find((l) => l.startsWith('eval: "{') && l.includes('wallMs'));
let pass = false, detail = "no-data";
if (line) {
  try {
    const d = JSON.parse(JSON.parse(line.slice(6)));
    const wallOk = d.wallMs <= maxWallMs;
    const ltOk = d.longtasksOver100 === 0;
    pass = wallOk && ltOk;
    detail = `wall=${(d.wallMs / 1000).toFixed(1)}s (≤${opts.maxMin}min ${wallOk ? "OK" : "OVER"}) · longtask>100ms=${d.longtasksOver100} (ltMax=${d.ltMax}ms ${ltOk ? "OK" : "VIOLATION"}) · stage=${d.stage} receipts=${d.receipts}`;
  } catch (e) { detail = "parse-fail " + e.message; }
}
console.log(`PERF-CHECK ${pass ? "PASS" : "FAIL"} — ${detail}（k=${k}，巡游=timeline.stages 全序列自动推进，STAGE_GAP 排程）`);
try { unlinkSync(preload); } catch {}
process.exit(pass && code === 0 ? 0 : 1);
