// 缩放+全屏行为断言门（2026-11-02 可读性二轮）
// 用法：node verify_zoomfs.mjs            # 四机 dark+light 全跑
//       node verify_zoomfs.mjs --only fig3-event-ring
// 逐页经 anatomy drive.mjs 驱动，eval 取数值断言：
//   ① 缩放条 4 档 + 全屏按钮在场；② 1× SVG 填满容器宽；
//   ③ "=" 步进到 1.6×（宽变大、容器可横滚）；④ "0" 复位；
//   ⑤ 点全屏后 isFs()=真、SVG 宽 ≥ 页内 1×（全屏永不变小）、图例隐藏；
//   ⑥ 再点退出后复位。外加 drive 自带的 console error/warning 门。
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;

const evalE1 = `(()=>{const s=document.querySelector('.iso-stage'),v=s.querySelector('svg');return {btns:document.querySelectorAll('.iso-zoombar button[data-zoom]').length,fsBtn:!!document.querySelector('[data-fs]'),stageW:Math.round(s.clientWidth),sw:Math.round(v.getBoundingClientRect().width)}})()`;
const evalEW = `(()=>{const s=document.querySelector('.iso-stage'),v=s.querySelector('svg');return {sw:Math.round(v.getBoundingClientRect().width),scrollable:s.scrollWidth>s.clientWidth}})()`;
const evalE4 = `(()=>{const s=document.querySelector('.iso-stage'),v=s.querySelector('svg'),f=document.querySelector('.iso-figure');return {fsOn:!!(window.__zfs&&window.__zfs.isFs()),fsEl:!!document.fullscreenElement,wfs:Math.round(v.getBoundingClientRect().width),legendHidden:getComputedStyle(document.querySelector('.iso-legend')).display==='none'}})()`;
const evalE5 = `(()=>{const v=document.querySelector('.iso-stage svg');return {fsOff:!(window.__zfs&&window.__zfs.isFs()),wback:Math.round(v.getBoundingClientRect().width)}})()`;

const actions = [
  ["wait", 1500],
  ["eval", evalE1],
  ["key", "="], ["wait", 350],
  ["eval", evalEW],
  ["key", "0"], ["wait", 350],
  ["eval", evalEW],
  ["eval", `(()=>{document.querySelector('[data-fs]').click();return 1;})()`],
  ["wait", 900],
  ["eval", evalE4],
  ["eval", `(()=>{document.querySelector('[data-fs]').click();return 1;})()`],
  ["wait", 700],
  ["eval", evalE5],
];

const PAGES = [];
for (const fig of ["fig1-assembly", "fig2-transfer-ring", "fig3-event-ring", "fig4-command-ring"]) {
  PAGES.push({ fig, page: "index.html", tag: "dark" });
  PAGES.push({ fig, page: "index-light.html", tag: "light" });
}

let failed = 0;
for (const p of PAGES) {
  if (only && p.fig !== only) continue;
  const actionsFile = join(tmpdir(), `verify-zoomfs-${p.fig}-${p.tag}.json`);
  writeFileSync(actionsFile, JSON.stringify(actions));
  const r = spawnSync(process.execPath, [DRIVE, join(ROOT, p.fig, p.page), "--actions", actionsFile,
    "--width", "1440", "--height", "900", "--scale", "1"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "inherit"], encoding: "utf8" });
  const out = r.stdout || "";
  const evals = [...out.matchAll(/^eval: (.*)$/gm)].map((m) => { try { return JSON.parse(m[1]); } catch { return m[1]; } });
  const problems = [];
  const [e1, e2, e3, , e4, , e5] = evals;
  if (!e1 || e1.btns !== 4 || !e1.fsBtn) problems.push(`A1 缩放条缺失 ${JSON.stringify(e1)}`);
  if (e1 && Math.abs(e1.sw - e1.stageW) > 3) problems.push(`A2 1× 未填满 sw=${e1.sw} stageW=${e1.stageW}`);
  if (!e2 || !(e2.sw > e1.sw * 1.35)) problems.push(`A3 放大步进异常 ${e1 && e1.sw}→${e2 && e2.sw}`);
  if (!e2 || !e2.scrollable) problems.push(`A3b 放大后不可横滚`);
  if (!e3 || Math.abs(e3.sw - e1.sw) > 3) problems.push(`A4 复位异常 ${e3 && e3.sw} vs ${e1 && e1.sw}`);
  if (!e4 || e4.fsOn !== true) problems.push(`A5 全屏未生效 ${JSON.stringify(e4)}`);
  if (e4 && e4.wfs < e1.sw - 2) problems.push(`A5b 全屏反而变小 wfs=${e4.wfs} < 页内1×=${e1.sw}`);
  if (!e4 || e4.legendHidden !== true) problems.push(`A5c 全屏图例未隐藏`);
  if (!e5 || e5.fsOff !== true) problems.push(`A6 退出全屏失败 ${JSON.stringify(e5)}`);
  if (e5 && Math.abs(e5.wback - e1.sw) > 3) problems.push(`A6b 退出后宽度未复位 ${e5.wback} vs ${e1.sw}`);
  if (/console\.(error|warning)|exception/i.test(out)) problems.push("A7 console 有错误输出（见上）");
  if (r.status !== 0) problems.push(`drive exit ${r.status}`);
  const verdict = problems.length ? "FAIL" : "PASS";
  console.log(`${verdict} ${p.fig} ${p.tag}: ${problems.length ? problems.join(" | ") : `1×=${e1.sw} 1.6×=${e2.sw} 全屏=${e4.wfs} 模式=${e4.fsEl ? "api" : "pseudo"}`}`);
  if (problems.length) failed++;
}
console.log(failed ? `VERIFY-ZOOMFS-FAIL (${failed} pages)` : "VERIFY-ZOOMFS-PASS (all pages)");
process.exit(failed ? 1 : 0);
