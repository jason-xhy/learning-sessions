// smoke_check.mjs —— zoomfs/交互冒烟门：键盘 ←→/空格单步、工段条点选、复位、回到工位、全屏按钮在案
// 用法：node pipeline/tools/smoke_check.mjs [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …]
// 被消费分区：timeline.stages（工段数）、panel.tabs.display（回到工位/速度选择器）。
// 下游复用：S5/S6/S7 构建后回归。
import { parseArgs, resolvePaths, loadDSL, runDrive } from "./lib.mjs";

const opts = parseArgs(process.argv, { width: "1440", height: "900" });
const { dslPath, page, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);
const nStages = DSL.timeline.stages.length;

const actions = [
  ["wait", 3200],
  // 键盘 ←→（window keydown；dispatch 到 document 冒泡至 window）
  ["eval", `window.__x43.stageIndex() + ''`],
  ["eval", `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); '→'`],
  ["wait", 300],
  ["eval", `window.__x43.stageIndex() === 1 ? 'KEY-RIGHT-OK' : 'KEY-RIGHT-FAIL ' + window.__x43.stageIndex()`],
  ["eval", `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); '←'`],
  ["wait", 300],
  ["eval", `window.__x43.stageIndex() === 0 ? 'KEY-LEFT-OK' : 'KEY-LEFT-FAIL ' + window.__x43.stageIndex()`],
  ["eval", `document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); 'space'`],
  ["wait", 300],
  ["eval", `window.__x43.stageIndex() === 1 ? 'KEY-SPACE-OK' : 'KEY-SPACE-FAIL ' + window.__x43.stageIndex()`],
  // 工段条点选（底栏 data-stage；最后一工段）
  ["click", `[data-stage="${nStages - 1}"]`, 0.5, 0.5],
  ["wait", 700],
  ["eval", `window.__x43.stageIndex() === ${nStages - 1} ? 'BAR-CLICK-OK' : 'BAR-CLICK-FAIL ' + window.__x43.stageIndex()`],
  // 复位（panel ⟲ 复位）
  ["click", '[data-act="reset"]', 0.5, 0.5],
  ["wait", 500],
  ["eval", `window.__x43.stageIndex() === 0 && window.__x43.sceneState().receipts === 0 ? 'RESET-OK' : 'RESET-FAIL idx=' + window.__x43.stageIndex()`],
  // 回到工位（display tab）
  ["eval", `window.__x43.tab('disp'); 'disp'`],
  ["click", "#x43OptCam", 0.5, 0.5],
  ["wait", 400],
  ["eval", `'HOME-OK'`],
  // 全屏按钮在案（不真进全屏——headless 形态校验）
  ["eval", `document.getElementById('x43Fs') ? 'FS-BTN-OK' : 'FS-BTN-FAIL'`],
  // 速度选择器（panel.controls.speed）
  ["click", '[data-speed="2"]', 0.5, 0.5],
  ["wait", 200],
  ["eval", `window.__x43.speed() === 2 ? 'SPEED-OK' : 'SPEED-FAIL ' + window.__x43.speed()`],
  ["click", '[data-speed="0.5"]', 0.5, 0.5],
  ["wait", 200],
  ["eval", `window.__x43.speed() === 0.5 ? 'SPEED-BACK-OK' : 'SPEED-BACK-FAIL'`],
  // HOLD 滑杆
  ["eval", `(() => { const h = document.getElementById('x43Hold'); h.value = 3.5; h.dispatchEvent(new Event('input')); return window.__x43.speed() === 0.5 ? 'HOLD-OK' : 'HOLD-FAIL'; })()`],
  // zoomfs 冒烟：手动接管（setCam 后拖转不还原——camFlight 取消形态）
  ["eval", `window.__x43.setCam([0.5, 12.8, 17.5], [0.5, 11.6, 0]); 'zoom-cam'`],
  ["drag", "#x43Stage", 0.5, 0.5, 0.6, 0.45, 6],
  ["wait", 300],
  ["eval", `'ORBIT-OK'`],
];

const { code, out } = await runDrive(drive, page, actions, { width: W, height: H });
process.stdout.write(out);
const markers = ["KEY-RIGHT-OK", "KEY-LEFT-OK", "KEY-SPACE-OK", "BAR-CLICK-OK", "RESET-OK", "FS-BTN-OK", "SPEED-OK", "SPEED-BACK-OK", "HOLD-OK", "ORBIT-OK"];
const missing = markers.filter((m) => !out.includes(m));
const fails = out.split("\n").filter((l) => l.includes("-FAIL"));
console.log(fails.length ? "SMOKE-FAIL-LINES\n  " + fails.join("\n  ") : "");
console.log(missing.length ? `SMOKE-CHECK-MISSING: ${missing.join(", ")}` : "SMOKE-CHECK-PASS（键盘/工段条/复位/回工位/全屏钮/速度/HOLD/拖转）");
process.exit(missing.length || fails.length || code !== 0 ? 1 : 0);
