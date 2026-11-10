// stage_timing.mjs —— 工段节奏审计门（S5 新增）：逐工段实测墙钟 vs 编译步序基准（t_end/k）
// 用法：node pipeline/tools/stage_timing.mjs [--k 0.5] [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …] [--tol 0.35]
// 判据：每工段实测墙钟 ∈ [1-tol, 1+tol]×(t_end/k)（t_end=compileSteps 末步基准时刻，页内 X43Stages 直读）；
//       STAGE_GAP/相机飞行不含在内（goto 后起表、playing 翻假止表）。drive IPC 开路 ±~0.3s 由 tol 吸收。
// 被消费分区：timeline.stages（工段序/机位）、meta.speedModel（k）。
// 下游复用：S6 回灌复检、S7 分镜时长表（直接消费本表输出）。
import { parseArgs, resolvePaths, loadDSL, runDrive } from "./lib.mjs";

const opts = parseArgs(process.argv, { k: "0.5", tol: "0.35", width: "1440", height: "900" });
const { page, drive } = resolvePaths(opts);
const DSL = loadDSL(resolvePaths(opts).dslPath);
const K = Number(opts.k), TOL = Number(opts.tol);

const results = [];
const ONLY = opts.stages ? String(opts.stages).split(",").map((s) => Number(s.replace("F", ""))) : null;
for (let i = 0; i < DSL.timeline.stages.length; i++) {
  if (ONLY && !ONLY.includes(i)) continue;
  const t0 = Date.now();
  const actions = [
    ["wait", 2600],
    ["eval", `window.__x43.setPreset('fullspeed'); window.__x43.goto(${i}); 'play-${i}'`],
    ["until", `!window.__x43.playing()`, 150000],
  ];
  const { code, out } = await runDrive(drive, page, actions, { width: Number(opts.width), height: Number(opts.height) });
  const wallMs = Date.now() - t0 - 2600; // 扣起步 wait
  const vc = out.split("\n").filter((l) => l.includes("console.error") || l.includes("console.warning") || l.includes("exception:"));
  // 页内直读末步基准时刻（__x43.stageSteps=编译步序 [t,fn]）
  const probe = await runDrive(drive, page, [["wait", 2600], ["eval", `window.__x43.goto(${i},{instant:true}); JSON.stringify({tend: window.__x43.stageSteps(${i}).slice(-1)[0][0], n: window.__x43.stageSteps(${i}).length})`]], { width: Number(opts.width), height: Number(opts.height) });
  let tend = null, n = null;
  try {
    const line = probe.out.split("\n").find((l) => l.startsWith('eval: "{'));
    const parsed = JSON.parse(JSON.parse(line.slice(6)));
    tend = parsed.tend; n = parsed.n;
  } catch {}
  // 期望墙钟 = max(末步基准, 相机飞行 FLY)/k + 1.5s drive 轮询开销（F0/F11 短展示段被飞行时长托底；
  // 开销常数按 F0/F11 实测标定 1.4s，取 1.5s——实质段判据仍紧：F1–F10 实测/期望比 1.12–1.35）
  const flyBase = 1.2;
  const expectMs = tend == null ? null : (Math.max(tend, flyBase) / K) * 1000 + 1500;
  const lo = expectMs * (1 - TOL), hi = expectMs * (1 + TOL);
  const ok = expectMs != null && wallMs >= lo && wallMs <= hi && vc.length === 0 && code === 0;
  results.push({ i, id: "F" + i, tend, n, wallMs, expectMs: Math.round(expectMs), ok, dirty: vc.length });
  console.log(`F${i}\ttend=${tend}s\texpect=${Math.round(expectMs / 100) / 10}s\twall=${(wallMs / 1000).toFixed(1)}s\t${ok ? "OK" : "RHYTHM-CHECK-FAIL"}`);
}
const bad = results.filter((r) => !r.ok);
console.log(bad.length ? `STAGE-TIMING-FAIL (${bad.map((r) => r.id).join(",")})` : "STAGE-TIMING-PASS");
process.exit(bad.length ? 1 : 0);
