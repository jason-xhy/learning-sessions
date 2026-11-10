// s7_record.mjs —— S7 录制器：CDP Page.startScreencast 逐工段帧序列（教学演示视频源）
// 用法：node pipeline/tools/s7_record.mjs [--stages all|0,1,5] [--fps 24] [--width 1440] [--height 810]
//        [--speed 1] [--tail 1.5] [--minhold 0=8,11=8] [--quality 90] [--outdir pipeline/tools/remotion-wrap/frames]
//        [--page …] [--dsl …] [--drive 不用] [--fresh 强制重录已存在段]
// 产出：<outdir>/F<i>/NNNNNN.jpg（0 基 6 位，fps 槽桶化）+ <outdir>/manifest.json
// 形态：与 anatomy drive.mjs 同款 headless Chrome（--headless=new --remote-debugging-port=0 --enable-unsafe-swiftshader）；
//   screencast 在 goto 前启动（视频起点=工段动画起点，确定性对齐）；k=__x43.setSpeed(--speed)；
//   goto(i) 积累态语义（前序工段 applyEnd）；结束=!playing() 且 elapsed ≥ max(tend+FLY, minHold)+tail。
// 被消费分区：__x43（goto/playing/setSpeed/stageSteps）；DSL timeline.stages（工段表）。
// 下游复用：Remotion 组态（frames/ 为 publicDir）；同型课件视频化换 --page 即可。
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parseArgs, resolvePaths, loadDSL } from "./lib.mjs";

const opts = parseArgs(process.argv, {
  stages: "all", fps: "24", width: "1440", height: "810", speed: "1", tail: "1.5",
  minhold: "0=8,11=8", quality: "90", outdir: "", fresh: false,
});
const { page, dslPath } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);
const FPS = Number(opts.fps);
const SLOT_MS = 1000 / FPS;
const TAIL = Number(opts.tail);
const QUALITY = Number(opts.quality);
const SPEED = Number(opts.speed);
const MINHOLD = new Map(String(opts.minhold).split(",").filter(Boolean).map((s) => {
  const [k, v] = s.split("="); return [Number(k), Number(v)];
}));
const OUT = opts.outdir ? resolve(opts.outdir) : resolve(import.meta.dirname, "remotion-wrap", "frames");
mkdirSync(OUT, { recursive: true });

const IDX = String(opts.stages) === "all"
  ? DSL.timeline.stages.map((_, i) => i)
  : String(opts.stages).split(",").map((s) => Number(s.trim()));
const tendOf = JSON.parse(readFileSync(resolve(import.meta.dirname, "remotion-wrap", "stages.json"), "utf8"));

// ---------- Chrome 启动（drive.mjs 同款候选发现） ----------
function findChrome() {
  const cands = [];
  if (process.env.CHROME_PATH) cands.push(process.env.CHROME_PATH);
  const plat = process.platform;
  if (plat === "darwin") cands.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary");
  else if (plat === "linux") cands.push("/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser");
  else if (plat === "win32") cands.push("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
  const bin = cands.find((c) => c && existsSync(c));
  if (!bin) { console.error("No Chrome found. Set CHROME_PATH."); process.exit(2); }
  return bin;
}

const profile = mkdtempSync(join(tmpdir(), "x43rec-"));
const chrome = spawn(findChrome(), [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
  "--no-first-run", "--no-default-browser-check", "--hide-scrollbars",
  "--allow-file-access-from-files", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
  `--window-size=${W},${H}`, "about:blank",
], { stdio: ["ignore", "ignore", "pipe"] });
const port = await new Promise((done, fail) => {
  let text = "";
  const timer = setTimeout(() => fail(new Error("Chrome did not start")), 20000);
  chrome.stderr.on("data", (d) => {
    text += d.toString();
    const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (m) { clearTimeout(timer); done(Number(m[1])); }
  });
  chrome.on("exit", (c) => fail(new Error("Chrome exited: " + c)));
});
const cleanup = () => { try { chrome.kill("SIGKILL"); } catch {} rmSync(profile, { recursive: true, force: true }); };
process.on("exit", cleanup);
process.on("SIGINT", () => { cleanup(); process.exit(130); });

// ---------- 迷你 CDP 客户端（页面级连接，无 session） ----------
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { ok, err } = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (err) ok.reject(new Error("CDP " + (err.message || err))); else ok.resolve(msg.result);
      } else if (msg.method && this.handlers.has(msg.method.split(".")[0] + ".*|" + msg.method)) {
        this.handlers.get(msg.method.split(".")[0] + ".*|" + msg.method)(msg.params);
      } else if (msg.method && this.handlers.has(msg.method)) {
        this.handlers.get(msg.method)(msg.params);
      }
    });
  }
  on(method, fn) { this.handlers.set(method, fn); }
  send(method, params = {}) {
    return new Promise((resolveP, rejectP) => {
      const id = ++this.id;
      this.pending.set(id, { ok: { resolve: resolveP, reject: rejectP } });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rejectP(new Error("CDP timeout " + method)); }
      }, 60000);
    });
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
await new Promise((r) => { ws.addEventListener("open", r); });
const browser = new CDP(ws);
const { targetId } = await browser.send("Target.createTarget", { url: "about:blank" });
const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const pageWs = list.find((t) => t.id === targetId).webSocketDebuggerUrl;
const pws = new WebSocket(pageWs);
await new Promise((r) => { pws.addEventListener("open", r); });
const page9 = new CDP(pws);
await page9.send("Page.enable");
await page9.send("Runtime.enable");
await page9.send("Log.enable");
const consoleBad = [];
page9.on("Runtime.exceptionThrown", (p) => consoleBad.push("exception: " + (p.exceptionDetails && p.exceptionDetails.text)));
page9.on("Log.entryAdded", (p) => {
  const e = p.entry;
  if (e.level === "error" || e.level === "warning") consoleBad.push(`console.${e.level}: ${e.text}`);
});
await page9.send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await page9.send("Page.navigate", { url: "file://" + resolve(page) });
// 就绪：__x43 API 在场 + 装载卡退场余量
let ready = false;
for (let i = 0; i < 40 && !ready; i++) {
  await sleep(500);
  const r = await page9.send("Runtime.evaluate", { expression: "window.__x43 && window.__x43.dslVersion ? 'ok' : ''" });
  ready = r.result && r.result.value === "ok";
}
if (!ready) { console.error("REC __x43 never ready"); process.exit(1); }
await sleep(2600); // loadingSeq 退场（4×340ms + 700ms fade）
await page9.send("Runtime.evaluate", { expression: `window.__x43.setSpeed(${SPEED}); 'k=${SPEED}'` });

const results = [];
// screencast 帧接收（handler 只注册一次；状态在循环内切换）
let buckets = new Map();
let startT = 0;
let onFrame = null;
page9.on("Page.screencastFrame", async (p) => {
  const { data, metadata, sessionId } = p;
  const ts = metadata && metadata.timestamp ? metadata.timestamp * 1000 : Date.now();
  const slot = Math.max(0, Math.floor((ts - startT) / SLOT_MS));
  buckets.set(slot, data);
  try { await page9.send("Page.screencastFrameAck", { sessionId }); } catch {}
  if (onFrame) { const f = onFrame; onFrame = null; f(data); }
});
for (const i of IDX) {
  const meta = tendOf.find((s) => Number(s.id.replace("F", "")) === i) || {};
  const stageDir = join(OUT, "F" + i);
  const manifestPath = join(stageDir, "manifest.json");
  if (!opts.fresh && existsSync(manifestPath)) {
    const prev = JSON.parse(readFileSync(manifestPath, "utf8"));
    console.log(`REC F${i} skip（已存在 frames=${prev.frames}，--fresh 强制重录）`);
    results.push(prev);
    continue;
  }
  rmSync(stageDir, { recursive: true, force: true });
  mkdirSync(stageDir, { recursive: true });
  buckets = new Map();
  const firstFrame = new Promise((r) => { onFrame = r; });
  startT = Date.now();
  await page9.send("Page.startScreencast", { format: "jpeg", quality: QUALITY, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await firstFrame; // 首帧
  await page9.send("Runtime.evaluate", { expression: `window.__x43.goto(${i}); 'play-${i}'` });
  const tend = meta.tend != null ? meta.tend : 6;
  const fly = 1.2 / SPEED;
  const targetMs = (Math.max(tend + fly, MINHOLD.get(i) || 0) + TAIL) * 1000;
  // 轮询 playing + 时长到达
  for (;;) {
    await sleep(400);
    let playing = false;
    try {
      const r = await page9.send("Runtime.evaluate", { expression: `window.__x43.playing() ? 1 : 0`, returnByValue: true });
      playing = r.result && r.result.value === 1;
    } catch {}
    const elapsed = Date.now() - startT;
    if (!playing && elapsed >= targetMs) break;
    if (elapsed > 180000) { console.error(`REC F${i} 超时 180s`); break; }
  }
  await page9.send("Page.stopScreencast");
  const elapsed = Date.now() - startT;
  const nSlots = Math.max(1, Math.round(elapsed / SLOT_MS));
  let last = null;
  let uniq = 0;
  for (let s = 0; s < nSlots; s++) {
    if (buckets.has(s)) { last = buckets.get(s); uniq++; }
    if (last == null) continue; // 首帧前空槽（补写见下）
    writeFileSync(join(stageDir, String(s).padStart(6, "0") + ".jpg"), Buffer.from(last, "base64"));
  }
  const firstKey = buckets.size ? Math.min(...buckets.keys()) : 0;
  if (firstKey > 0) {
    const f0 = buckets.get(firstKey);
    for (let s = 0; s < firstKey; s++) writeFileSync(join(stageDir, String(s).padStart(6, "0") + ".jpg"), Buffer.from(f0, "base64"));
  }
  const m = { stage: "F" + i, tend, targetSeconds: Number((targetMs / 1000).toFixed(2)), wallSeconds: Number((elapsed / 1000).toFixed(2)), frames: nSlots, fps: FPS, width: W, height: H, uniqueFrames: uniq, speed: SPEED };
  writeFileSync(manifestPath, JSON.stringify(m, null, 1) + "\n");
  results.push(m);
  console.log(`REC F${i} wall=${m.wallSeconds}s frames=${m.frames} uniq=${uniq} target=${m.targetSeconds}s tend=${tend}s`);
}

// 实录帧数回写 stages.json（合成时长=帧数/fps；探针 tend 仅作录制预期）
const merged = tendOf.map((s) => {
  const idx = Number(s.id.replace("F", ""));
  const r = results.find((x) => x.stage === "F" + idx);
  return r ? { ...s, seconds: Number((r.frames / FPS).toFixed(3)), frames: r.frames } : s;
});
writeFileSync(resolve(import.meta.dirname, "remotion-wrap", "stages.json"), JSON.stringify(merged, null, 1) + "\n");

await browser.send("Target.closeTarget", { targetId }).catch(() => {});
ws.close(); pws.close();
const bad = consoleBad.slice(0, 8);
console.log(bad.length ? "REC CONSOLE-DIRTY: " + bad.join(" ; ") : "REC CONSOLE-CLEAN");
const all = results.every((r) => r.frames > 0);
console.log(all && !bad.length ? "RECORD-PASS" : "RECORD-FAIL");
process.exit(all && !bad.length ? 0 : 1);
