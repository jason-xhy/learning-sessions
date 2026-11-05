// §4.1 命令操作 —— 三方时序：总览（流程图）+ 步进（动画）单卡双模式 + 代码走读卡
// 判据：xHCI 1.2b §4.1 p68（引文三条逐字，PDF 伪影已剔除）；p69 脚注 7（中断可选）
// 工艺：anatomy kit pageHtml/plateHtml + shared/zoomfs.mjs（构建期内联，页面自包含）
// 走读卡（CODE-STEPPER 步 4，2026-11-04）：render_block 渲染 + codestepper/course.css
//   走读段内联——渲染单一事实源=scripts/stepper_builder.py，行号零誊抄（锚点断言门）。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { kitScript } from "/Users/jason/.zcode/skills/anatomy/scripts/inline-kit.mjs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = "/Users/jason/ZCodeProject/usb-xhci-study";
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- 代码走读卡（rings3 四区：命令环/EP0/事件环/设备端） ----------
const stepperHtml = execFileSync("python3", [
  join(WS, "scripts/stepper_builder.py"), "render_block",
  join(WS, "lessons-data/stepper_41x.json"),
], { encoding: "utf8" });
const courseCss = readFileSync(join(WS, "assets/course.css"), "utf8");
const cssSeg = (a, b) => {
  const i = courseCss.indexOf(a);
  const j = courseCss.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`course.css 段标记缺失: ${a.slice(0, 30)}`);
  return courseCss.slice(i, j);
};
const stepperCss = cssSeg("/* ===== 代码步进放映机", "/* ===== 右缘批注")
  .replace(/\/\*[\s\S]*?\*\//g, "");  // 剥段内注释：资产注释不进交付件（载体三分），兼减字节
const stepperJs = readFileSync(join(WS, "assets/codestepper.js"), "utf8");

// ---------- 时序数据（SVG 与步进动画同源） ----------
// 演示样例：Enable Slot（示例值——Slot ID 回执见 §4.3.2 p75；命令 TRB 字段细节归 §4.6，本页不刻数值）
const LANES = { sw: 250, hc: 730, dev: 1120 };
const HDR_Y = 40, HDR_H = 54, LIFE_END = 836;

const STEPS = [
  { kind: "box", at: "sw", y: 150, lines: ["组命令 TRB", "示例：Enable Slot"], pg: "p68",
    narr: "驱动把一条命令 TRB 组好——本例是 Enable Slot。命令的参数都写在 TRB 字段里（字段细节见 §4.6）。" },
  { kind: "arrow", from: "sw", to: "hc", y: 232, lines: ["命令 TRB 写入命令环 · 写门铃寄存器 0", "DB Target = 0（Host Controller Command）"], pg: "p68",
    narr: "命令 TRB 写入命令环之后必须写门铃寄存器 0、DB Target=0，xHC 才知道命令环上有了新命令。" },
  { kind: "box", at: "hc", y: 310, lines: ["按 CRCR 指针取命令 TRB", "执行命令"], pg: "p68",
    narr: "xHC 沿 CRCR 指针取走命令并执行——命令环这一侧由 xHC 管理，软件只写入。" },
  { kind: "arrow", from: "hc", to: "sw", y: 396, ev: true, lines: ["Command Completion Event TRB", "写入事件环"], pg: "p68",
    narr: "每条命令必有一条完成回执：Command Completion Event TRB 写进事件环（事件环机制见 §4.9.4）。" },
  { kind: "arrow", from: "hc", to: "sw", y: 478, ev: true, thin: true, lines: ["MSI-X 中断唤起驱动", "（可选——软件也可轮询事件环）"], pg: "p68·脚注7 p69",
    narr: "通知方式二选一：MSI-X 中断唤起驱动，或软件轮询事件环——规范脚注 7 明说中断是可选项。" },
  { kind: "box", at: "sw", y: 556, lines: ["读事件环 · 收回执", "（如 Enable Slot 回执里的 Slot ID）"], pg: "p68",
    narr: "驱动读事件环收回执——Enable Slot 的回执里带着 xHC 选定的 Slot ID（§4.3.2 p75）。" },
  { kind: "note", lanes: ["sw", "hc"], y: 646, lines: ["全规范只有一条命令环", "xHC 专用命令与设备槽相关命令共用"], pg: "p68",
    narr: "一条命令环承载所有命令：xHC 自身的命令与设备槽相关命令共用同一条环，不按设备分环。" },
  { kind: "note", lanes: ["dev"], y: 742, dev: true, lines: ["设备：本流程不参与", "命令对设备不可见；", "个别命令（如 Address Device）由 xHC", "在总线上代发 USB 请求——设备收到的", "是 USB 请求，不是命令（见 §4.3）"], pg: "p68",
    narr: "设备泳道全程空白是有意的：命令是驱动与 xHC 的管理通道，设备看不到命令。" },
];

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- SVG 渲染 ----------
function boxSvg(st, i) {
  const x = LANES[st.at], w = 340, h = 62;
  return `<g data-step="${i}" data-tx="${x}" data-ty="${st.y}" class="xsp-item xsp-bx xsp-${st.at}">
    <rect x="${x - w / 2}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="8" class="xsp-box"/>
    ${st.lines.map((ln, j) => `<text x="${x}" y="${st.y - 6 + j * 22}" class="xsp-t1">${esc(ln)}</text>`).join("")}
    <text x="${x + w / 2 - 10}" y="${st.y - h / 2 + 16}" class="xsp-pg" text-anchor="end">${esc(st.pg)}</text>
  </g>`;
}
function arrowSvg(st, i) {
  const xA = LANES[st.from], xB = LANES[st.to], mid = (xA + xB) / 2;
  const cls = st.from === "sw" ? "xsp-sw" : "xsp-hc";
  const mk = st.ev ? `xsp-mk-ev` : `xsp-mk`;
  // 激活标记（时序图惯例）：箭头两端落在生命线上的窄条边缘
  const dir = xB > xA ? 1 : -1;
  const x1 = xA + 8 * dir, x2 = xB - 8 * dir;
  const tx = x1 + (x2 - x1) * 0.72;
  const tick = (x) => `<rect x="${x - 8}" y="${st.y - 15}" width="16" height="30" rx="4" class="xsp-act xsp-act-${cls === "xsp-sw" ? "sw" : "hc"}"/>`;
  return `<g data-step="${i}" data-tx="${tx}" data-ty="${st.y}" class="xsp-item xsp-ar">
    ${st.lines.map((ln, j) => `<text x="${mid}" y="${st.y - 26 + j * 20 - (st.lines.length - 1) * 4}" class="xsp-t2" text-anchor="middle">${esc(ln)}</text>`).join("")}
    ${tick(xA)}${tick(xB)}
    <line x1="${x1}" y1="${st.y}" x2="${x2}" y2="${st.y}" class="xsp-ln ${cls} ${st.ev ? "xsp-ev" : ""} ${st.thin ? "xsp-thin" : ""}" marker-end="url(#${mk}-${cls})"/>
    <text x="${mid}" y="${st.y + 26}" class="xsp-pg" text-anchor="middle">${esc(st.pg)}</text>
  </g>`;
}
function noteSvg(st, i) {
  const xs = st.lanes.map((l) => LANES[l]);
  let x0 = Math.min(...xs) - 190, x1 = Math.max(...xs) + 190;
  x0 = Math.max(24, x0); x1 = Math.min(W - 24, x1); // 不越 viewBox
  const w = x1 - x0, h = 30 + st.lines.length * 22;
  const cls = st.dev ? "xsp-dev" : "xsp-note2";
  return `<g data-step="${i}" data-tx="${(x0 + x1) / 2}" data-ty="${st.y}" class="xsp-item xsp-note ${cls}">
    <rect x="${x0}" y="${st.y - h / 2}" width="${w}" height="${h}" rx="8" class="xsp-notebox"/>
    ${st.lines.map((ln, j) => `<text x="${(x0 + x1) / 2}" y="${st.y - h / 2 + 26 + j * 22}" class="xsp-t3">${esc(ln)}</text>`).join("")}
    <text x="${x1 - 10}" y="${st.y - h / 2 + 18}" class="xsp-pg" text-anchor="end">${esc(st.pg)}</text>
  </g>`;
}

const W = 1240, H = 872;
const svgBody = `
<defs>
  <marker id="xsp-mk-xsp-sw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-sw"/></marker>
  <marker id="xsp-mk-xsp-hc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-hc"/></marker>
  <marker id="xsp-mk-ev-xsp-sw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-hc"/></marker>
  <marker id="xsp-mk-ev-xsp-hc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="xsp-fill-sw"/></marker>
</defs>
${Object.entries(LANES).map(([id, x]) => `
  <g class="xsp-lanehdr xsp-${id}">
    <rect x="${x - 150}" y="${HDR_Y}" width="300" height="${HDR_H}" rx="8" class="xsp-hdr"/>
    <text x="${x}" y="${HDR_Y + 24}" class="xsp-hdr-t" text-anchor="middle">${id === "sw" ? "xHCI 驱动" : id === "hc" ? "xHC 控制器" : "设备"}</text>
    <text x="${x}" y="${HDR_Y + 44}" class="xsp-hdr-s" text-anchor="middle">${id === "sw" ? "system software" : id === "hc" ? "the xHC" : "USB device"}</text>
  </g>
  <line x1="${x}" y1="${HDR_Y + HDR_H}" x2="${x}" y2="${LIFE_END}" class="xsp-life"/>`).join("")}
${STEPS.map((st, i) => (st.kind === "box" ? boxSvg(st, i) : st.kind === "arrow" ? arrowSvg(st, i) : noteSvg(st, i))).join("")}
<g id="xsp-token" class="xsp-token" opacity="0"><rect x="566" y="59" width="68" height="22" rx="6"/><text x="600" y="74" text-anchor="middle">令牌</text></g>`;

const svg = k.figureSvg({ width: W, height: H, label: "命令操作三方时序：驱动与 xHC 之间的一条管理通道，设备全程不在场", body: svgBody });

// ---------- 页面 ----------
const pageCss = `<style>
${zoomFsCss()}
:root { --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.iso, .iso[data-theme="dark"] {
  --xsp-sw: #7c9ff0; --xsp-hc: #d9a860; --xsp-dev: #86bd7a; --xsp-lane-ink: #10151d;
  --xsp-note-bg: color-mix(in srgb, var(--anatomy-paper, #171f2a) 94%, #ffffff 6%);
}
.iso[data-theme="light"] {
  --xsp-sw: #2d5fb3; --xsp-hc: #8a5f14; --xsp-dev: #2f7a3d; --xsp-lane-ink: #f4efe3;
  --xsp-note-bg: color-mix(in srgb, var(--anatomy-paper, #fbf7ec) 92%, #000000 8%);
}
.xsp-nav { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 4px 0 2px; font-family: var(--font-ui); font-size: 14px; color: var(--anatomy-muted); }
.xsp-nav .ttl { font-size: 20px; font-weight: 700; color: var(--anatomy-text); }
.xsp-nav a { color: var(--anatomy-link, #9cc3e0); text-decoration: none; } .xsp-nav a:hover { text-decoration: underline; }
.xsp-specref { font-family: var(--font-mono); font-size: 12.5px; color: var(--anatomy-muted); margin: 0 0 14px; }
.xsp-card { background: var(--anatomy-paper, #171f2a); border: 1px solid var(--anatomy-line-mid, #2a3444); border-radius: 8px; padding: 16px 22px; margin: 14px 0; }
.xsp-card h2 { font-family: var(--font-ui); font-size: 18px; margin: 2px 0 8px; color: var(--anatomy-text); }
.xsp-card p { margin: 8px 0; line-height: 1.95; color: var(--anatomy-text); font-size: 16.5px; }
.xsp-q { margin: 12px 0; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-hi, #556); }
.xsp-q .en { font-family: var(--font-ui); font-style: italic; color: var(--anatomy-muted); font-size: 14.5px; line-height: 1.8; }
.xsp-q .zh { color: var(--anatomy-text); font-size: 15.5px; margin-top: 4px; }
.xsp-q .src { font-family: var(--font-mono); font-size: 12px; color: var(--anatomy-muted); }
/* 时序图 */
.xsp-hdr { fill: var(--lane, var(--anatomy-shade-2)); stroke: none; }
.xsp-lanehdr.xsp-sw .xsp-hdr { fill: var(--xsp-sw); } .xsp-lanehdr.xsp-hc .xsp-hdr { fill: var(--xsp-hc); } .xsp-lanehdr.xsp-dev .xsp-hdr { fill: var(--xsp-dev); }
.xsp-hdr-t { font: 700 18px var(--font-ui); fill: var(--xsp-lane-ink); }
.xsp-hdr-s { font: 400 12.5px var(--font-mono); fill: var(--xsp-lane-ink); opacity: .82; }
.xsp-life { stroke: var(--anatomy-line-mid, #455); stroke-width: 1.4; stroke-dasharray: 3 6; }
.xsp-box { fill: var(--anatomy-shade-2, #20242c); stroke: var(--lane, #888); stroke-width: 1.8; }
.xsp-bx.xsp-sw .xsp-box { stroke: var(--xsp-sw); } .xsp-bx.xsp-hc .xsp-box { stroke: var(--xsp-hc); }
.xsp-t1 { font: 500 16.5px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.xsp-t1:first-of-type { font-weight: 700; }
.xsp-t2 { font: 500 15.5px var(--font-ui); fill: var(--anatomy-text); }
.xsp-t3 { font: 500 15.5px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.xsp-note2 .xsp-t3:first-of-type { font-weight: 700; } .xsp-dev .xsp-t3:first-of-type { font-weight: 700; }
.xsp-pg { font: 400 12.5px var(--font-mono); fill: var(--anatomy-muted); }
.iso[data-theme="light"] .xsp-pg { fill: #6b6350; }
.xsp-notebox { fill: var(--xsp-note-bg); stroke: var(--anatomy-line-mid, #455); stroke-dasharray: 5 4; stroke-width: 1.4; }
.xsp-act { fill: var(--anatomy-shade-2, #20242c); stroke-width: 1.6; }
.xsp-act-sw { stroke: var(--xsp-sw); } .xsp-act-hc { stroke: var(--xsp-hc); }
.xsp-note.xsp-dev .xsp-notebox { stroke: var(--xsp-dev); }
.xsp-ln { stroke-width: 2; } .xsp-ln.xsp-sw { stroke: var(--xsp-sw); } .xsp-ln.xsp-hc { stroke: var(--xsp-hc); }
.xsp-ln.xsp-ev { stroke-dasharray: 7 5; } .xsp-ln.xsp-thin { stroke-width: 1.6; }
.xsp-fill-sw { fill: var(--xsp-sw); } .xsp-fill-hc { fill: var(--xsp-hc); }
.xsp-item { transition: opacity .35s ease; }
.xsp-item.xsp-dim { opacity: .16; }
.xsp-item.xsp-on .xsp-box { stroke-width: 3.2; filter: drop-shadow(0 0 6px var(--anatomy-line-hi, #fff3)); }
.xsp-token rect { fill: var(--anatomy-shade-2, #20242c); stroke: var(--anatomy-line-hi, #ccc); stroke-width: 1.5; }
.xsp-token text { font: 700 14px var(--font-ui); fill: var(--anatomy-text); }
.xsp-token { transition: transform .5s cubic-bezier(.3,.7,.3,1), opacity .3s; }
.xsp-token.xsp-pulse { animation: xsppl 1.1s ease infinite; }
@keyframes xsppl { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
/* 控件与解说 */
.xsp-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; font-family: var(--font-ui); }
.xsp-ctl button { font: 500 13px var(--font-ui); color: var(--anatomy-muted); background: transparent; border: 1px solid var(--anatomy-line-mid, #456); border-radius: 4px; padding: 4px 12px; cursor: pointer; }
.xsp-ctl button[aria-pressed="true"] { color: var(--anatomy-text); border-color: var(--anatomy-text); }
.xsp-ctl button:hover { border-color: var(--anatomy-text); }
.xsp-narr { font-family: var(--font-ui); font-size: 15px; color: var(--anatomy-text); background: var(--anatomy-shade-2, #20242c); border: 1px solid var(--anatomy-line-mid, #456); border-radius: 6px; padding: 10px 14px; margin: 10px 0 0; min-height: 44px; }
.xsp-narr b { color: var(--anatomy-text); }
.xsp-legend { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-ui); font-size: 13.5px; color: var(--anatomy-muted); margin-top: 10px; }
.xsp-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.xsp-foot { font-family: var(--font-ui); font-size: 13px; color: var(--anatomy-muted); margin-top: 18px; }
@media print { .xsp-ctl { display: none; } }
/* 代码走读卡（rings3）：course.css 走读段整体内联 + 纸面卡变量垫片——走读卡固定
   浅色纸面（读代码的场景材质），双主题同形；变量映射到板内中性色。 */
${stepperCss}
.stepper { --line: #c9c4b2; --ink: #1f1c14; --muted: #6b675a; --accent: #8a5f14; --good: #2f7a3d;
  font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif);
  color: #1f1c14; }
.xsp-walknote { font-family: var(--font-ui); font-size: 14.5px; color: var(--anatomy-muted); margin: 10px 2px 0; }
</style>`;

const navHtml = `
<div class="xsp-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="ttl">§4.1 命令操作</span>
  <a href="../4.2-host-controller-init/index.html">下一节 §4.2 主机控制器初始化 →</a>
</div>
<p class="xsp-specref">xHCI 1.2b §4.1 Command Operation · p68</p>`;

const proseHtml = `
<div class="xsp-card"><h2>规范要义</h2>
<p>xHCI 的管理命令走一条独立通道：软件把命令 TRB 放上命令环，写门铃寄存器 0（DB Target=0）通知 xHC；xHC 执行后，把 Command Completion Event TRB 写进事件环，再用中断（或软件轮询）交还结果。</p>
<p>全规范只有一条命令环——xHC 自身的管理命令与设备槽相关命令（Enable Slot、Address Device……）共用同一条环和同一个门铃入口。命令的参数与回执内容都由 TRB 字段承载，逐条命令的字段在 §4.6 展开（待建）。</p>
<p>三方视角里，命令通道只涉及两方：xHCI 驱动与 xHC 控制器。设备看不到命令——个别命令（如 Address Device）会让 xHC 在总线上代发 USB 请求，那是命令的执行效果，见 §4.3。</p></div>`;

const quotesHtml = `
<div class="xsp-card"><h2>原文对照</h2>
<div class="xsp-q"><div class="en">“There is only one Command Ring that is used for issuing xHC specific commands or commands related to Device Slots.”</div>
<div class="zh">全规范只有一条命令环：xHCI 专用命令与设备槽相关命令共用它。</div><div class="src">xHCI 1.2b §4.1 p68</div></div>
<div class="xsp-q"><div class="en">“All xHC commands are issued by placing the desired Command TRB(s) on the Command Ring, then ringing the xHC command Doorbell register, that is, writing the Host Controller Command code to the DB Target field of Doorbell register 0”</div>
<div class="zh">命令的完整投递动作 = 命令 TRB 写入命令环 + 写门铃 0（DB Target=0，Host Controller Command）。</div><div class="src">xHCI 1.2b §4.1 p68</div></div>
<div class="xsp-q"><div class="en">“All commands result in the generation of a Command Completion Event TRB on the Event Ring.”</div>
<div class="zh">每条命令必有一条完成事件回执，回执走事件环。</div><div class="src">xHCI 1.2b §4.1 p68</div></div></div>`;

const ctlHtml = `
<div class="xsp-ctl">
  <button type="button" data-mode="tour" aria-pressed="true">总览（流程图）</button>
  <button type="button" data-mode="step" aria-pressed="false">步进（动画）</button>
  <span style="width:1em"></span>
  <button type="button" data-act="prev">◀ 上一步</button>
  <button type="button" data-act="next">下一步 ▶</button>
  <button type="button" data-act="auto" aria-pressed="false">自动播放</button>
  <button type="button" data-act="reset">⟲ 复位</button>
  <span style="color:var(--anatomy-muted);font-size:12px">键盘：空格/→ 下一步 · ← 上一步 · A 自动 · V 切模式 · + − 0 F 缩放/全屏</span>
</div>
<p class="xsp-narr" data-status aria-live="polite">总览模式：完整流程图。每框角标规范页码；虚线=事件回执流。</p>`;

const legendHtml = `
<div class="xsp-legend">
  <span><i style="background:var(--xsp-sw)"></i>xHCI 驱动</span>
  <span><i style="background:var(--xsp-hc)"></i>xHC 控制器</span>
  <span><i style="background:var(--xsp-dev)"></i>设备（本流程不参与）</span>
  <span>实线=命令流 · 虚线=事件回执流</span>
</div>`;

const linksHtml = `
<div class="xsp-card"><h2>互链</h2>
<p><a href="../../../xhc-machines/fig4-command-ring/index.html">四机课 Fig4 订单柜台</a>——命令环与命令回执的机器动画（§4.6.1 命令环操作）；<a href="../../../xhc-machines/fig3-event-ring/index.html">Fig3 回执登记机</a>——事件环的生产与消费（§4.9.4）。</p>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——命令的执行效果三方全程（Enable Slot / Address Device / Configure Endpoint 各自让设备看见了什么）。</p></div>`;

const body = pageCss + navHtml + proseHtml + quotesHtml +
  k.plateHtml({
    fig: "Fig 4.1",
    title: "一条命令的完整路径：命令操作三方时序",
    hint: "总览=流程图 · 步进=动画（空格/A 驱动）· 可放大可全屏",
    readout: "模式 总览 · 步 -/8",
    keys: [],
    caption: "驱动与 xHC 之间的一条管理通道：命令 TRB 写入命令环、写门铃 0、完成事件回事件环；设备全程不在场。",
    body: `<div class="iso-stage" tabindex="0" role="group" aria-label="命令操作三方时序图，总览为完整流程图，步进模式逐帧播放八步">${svg}</div>` + ctlHtml + legendHtml + zoomBarHtml("放大看框内文字 / 全屏后滚轮上下看 · 键盘 + − 0 F 缩放全屏 · 空格步进"),
  }) + `
<p class="xsp-walknote">同一个命令模型在真实内核代码里的样子——按函数调用逐语句走读（规范 TD 与内核 xhci_td 的计数口径不同：规范按传输阶段记 TD，内核 struct xhci_td 按 URB 记；本链是命令，不涉传输环）：</p>
` + stepperHtml + `
<p class="xsp-foot">判据：xHCI 1.2b（625472 Rev 1.2b）§4.1 p68、p69 脚注 7 · 引文逐字核对，证据见 <a href="EVIDENCE.md">EVIDENCE.md</a> · 生成于 2026-11-03</p>`;

const LIVE = `
(() => {
  const stage = document.querySelector(".iso-stage");
  const svgRoot = stage.querySelector("svg");
  const items = [...svgRoot.querySelectorAll("[data-step]")];
  const token = svgRoot.querySelector("#xsp-token");
  const narr = document.querySelector("[data-status]");
  const NARR = ${JSON.stringify(STEPS.map((s) => s.narr))};
  const readout = document.querySelector("[data-readout]");
  let mode = "tour", ix = 0, auto = null, idleT = null;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function paint() {
    items.forEach((el, i) => {
      el.classList.toggle("xsp-dim", mode === "step" && i !== ix);
      el.classList.toggle("xsp-on", mode === "step" && i === ix);
    });
    if (mode === "step") {
      const el = items[ix];
      token.setAttribute("opacity", "1");
      // 令牌位置三候选自选（顶上方/左侧外/右侧外），取首个与全部文字零交点——
      // 固定 -116 偏移对 arrow 文字带必压 9px，顶位空间不足时也要能退到侧位
      const bb = el.getBBox(), tw = 68, th = 22, VW = 1240;
      const cand = [];
      if (!el.classList.contains("xsp-note")) cand.push([bb.x + bb.width / 2 - tw / 2, bb.y - th - 12]);
      cand.push([bb.x - tw - 12, bb.y + bb.height / 2 - th / 2]);
      cand.push([bb.x + bb.width + 12, bb.y + bb.height / 2 - th / 2]);
      const tb = [...svgRoot.querySelectorAll("text")].filter((t) => !t.closest("#xsp-token")).map((t) => t.getBBox());
      let pos = cand[0] || [8, 8];
      for (const c of cand) {
        const cx = Math.max(8, Math.min(VW - tw - 8, c[0])), cy = Math.max(8, c[1]);
        const hit = tb.some((b2) => cx < b2.x + b2.width && cx + tw > b2.x && cy < b2.y + b2.height && cy + th > b2.y);
        if (!hit) { pos = [cx, cy]; break; }
      }
      token.style.transform = "translate(" + (pos[0] - 566) + "px," + (pos[1] - 59) + "px)";
      token.classList.toggle("xsp-pulse", el.classList.contains("xsp-bx") || el.classList.contains("xsp-note"));
      narr.textContent = (ix + 1) + "/8 · " + NARR[ix];
    } else {
      token.setAttribute("opacity", "0"); token.classList.remove("xsp-pulse");
      narr.textContent = "总览模式：完整流程图。每框角标规范页码；虚线=事件回执流。";
    }
    if (readout) readout.textContent = "模式 " + (mode === "tour" ? "总览" : "步进") + " · 步 " + (mode === "tour" ? "-" : ix + 1) + "/8";
    document.querySelectorAll(".xsp-ctl button[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
  }
  function go(n) {
    if (mode === "tour") { mode = "step"; ix = Math.max(0, Math.min(n - 1, items.length - 1)); } // 从总览进来先亮目标步本身
    else ix = ((n % items.length) + items.length) % items.length;
    paint(); arm();
  }
  function setMode(m) { mode = m; if (m === "step") paint(); else paint(); arm(); }
  function stopAuto() { if (auto) { clearInterval(auto); auto = null; const b = document.querySelector('[data-act="auto"]'); if (b) b.setAttribute("aria-pressed", "false"); } }
  function arm() {
    if (still) return;
    clearTimeout(idleT); stopAuto();
    idleT = setTimeout(() => { if (mode === "step") startAuto(true); }, 8000);
  }
  function startAuto(silent) {
    if (still) return; stopAuto();
    if (mode !== "step") mode = "step";
    auto = setInterval(() => { ix = (ix + 1) % items.length; paint(); }, 3200);
    const b = document.querySelector('[data-act="auto"]'); if (b) b.setAttribute("aria-pressed", "true");
    paint();
  }
  document.querySelector(".xsp-ctl").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.mode) { stopAuto(); setMode(b.dataset.mode); }
    else if (b.dataset.act === "next") { stopAuto(); go(ix + 1); }
    else if (b.dataset.act === "prev") { stopAuto(); go(ix - 1); }
    else if (b.dataset.act === "auto") { auto ? stopAuto() : startAuto(); arm(); }
    else if (b.dataset.act === "reset") { stopAuto(); ix = 0; mode = "tour"; paint(); arm(); }
  });
  stage.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "ArrowRight") { e.preventDefault(); stopAuto(); go(ix + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); stopAuto(); go(ix - 1); }
    else if (e.key === "r" || e.key === "R") { stopAuto(); ix = 0; mode = "tour"; paint(); arm(); }
    else if (e.key === "a" || e.key === "A") { auto ? stopAuto() : startAuto(); arm(); }
    else if (e.key === "v" || e.key === "V") { stopAuto(); setMode(mode === "tour" ? "step" : "tour"); }
  });
  paint();
})();`;

const script = kitScript() + stepperJs + LIVE + zoomFsScript({ focus: ['[data-step].xsp-on'] });
const page = k.pageHtml({ title: "§4.1 命令操作 · xHCI 规范对照学习", theme: THEME, body, script, width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
