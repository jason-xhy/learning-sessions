// §4.19 根集线器 —— 状态机大图＋表格节（2026-11-04，骨架版）
// 形态：table_page.mjs 表格节布局 + 状态机概览卡（照抄 4.5-device-slot-management 先例：
//   状态图 SVG 手写 + zoomfs 三件套 body 尾注入，_gen/ 未改）。
// 状态图口径：两栏同构六态骨架（Disconnected / Powered-off / Disabled / U0 / U3 + Enabled 子态域框），
//   只画主线迁移 + 大泡虚线（任一态→Powered-off）；全图细节归 §4.19.1 原图
//   Figure 4-25（USB2 顶层 p273）/ Figure 4-26（USB2 Enabled 子态 p275）/ Figure 4-27（USB3 顶层 p278）/
//   Figure 4-28（Polling 子态 p280）/ Figure 4-29（DbC p282）/ Figure 4-30（USB3 Enabled 子态 p285）/
//   Figure 4-31/4-32/4-33（U1'/U2'/U3' p286/287/289）/ Figure 4-34（PSCEG 例 p293）/ Figure 4-35（路由例 p301）。
// 判据：xHCI 1.2b §4.19 p272–303（九小节逐节对页；引文逐字取自提取文本、断行按空格并回）。
// 分级裁定注记：本节 anatomy 机器形态留后续会话——本页为状态机骨架版。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- 状态机概览 SVG（两栏同构；坐标核算表见 EVIDENCE.md） ----------
const BW = 170, BH = 74;           // 状态盒尺寸
const P2 = 10, P3 = 750;           // 两栏原点（USB2 左 / USB3 右）
const DOM = { x: 288, y: 294, w: 194, h: 246 }; // Enabled 子态域框（围 U0+U3）

// 状态盒：name / zh(PLS 值) / sig(信号态 PP,CCS,PED,PR)，值取 Figure 4-25 p273 / Figure 4-27 p278 原文
const USB2_BOXES = [
  { id: "dis",   name: "Disconnected", zh: "PLS=RxDetect",          sig: "PP,CCS,PED,PR=1,0,0,0", x: 40,  y: 36 },
  { id: "po",    name: "Powered-off",  zh: "PLS=Disabled",          sig: "PP,CCS,PED,PR=0,0,0,0", x: 500, y: 36 },
  { id: "dis2",  name: "Disabled",     zh: "PLS=Polling",           sig: "PP,CCS,PED,PR=1,1,0,0", x: 40,  y: 186 },
  { id: "u0",    name: "U0（活动）",   zh: "PLS=U0 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 306 },
  { id: "u3",    name: "U3（挂起）",   zh: "PLS=U3 · Enabled 子态", sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 446 },
];
const USB3_BOXES = [
  { id: "dis",   name: "Disconnected", zh: "PLS=RxDetect",               sig: "PP,CCS,PED,PR=1,0,0,0", x: 40,  y: 36 },
  { id: "po",    name: "Powered-off",  zh: "PLS=Disabled/RxDetect",      sig: "PP,CCS,PED,PR=0,0,0,0", x: 500, y: 36 },
  { id: "dis2",  name: "Disabled",     zh: "PLS=Disabled",               sig: "PP,CCS,PED,PR=1,0,0,0", x: 40,  y: 186 },
  { id: "u0",    name: "U0（活动）",   zh: "PLS=U0 · Enabled 子态",      sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 306 },
  { id: "u3",    name: "U3（挂起）",   zh: "PLS=U3 · Enabled 子态",      sig: "PP,CCS,PED,PR=1,1,1,0", x: 300, y: 446 },
];

// 迁移边（局部坐标，两栏同位）：USB2 7 条 + USB3 7 条；dash=true=大泡虚线
//   条件标注逐条对页：4.19.1.1.1–4.19.1.1.6（USB2 p274–275）/ 4.19.1.2.1–4.19.1.2.10（USB3 p279–286）
const USB2_EDGES = [
  { d: "M125,110 L125,186", dash: false, labels: [
    ["连接检测 CCS='1' · CSC='1'", 133, 132, "st-cond", "start"], ["p274", 133, 148, "st-pg", "start"]] },
  { d: "M210,223 L385,223 L385,306", dash: false, labels: [
    ["复位主线 · 经 Reset 态", 214, 188, "st-cond", "start"],
    ["Wr(PR='1') → Reset", 214, 204, "st-cond", "start"],
    ["复位完成自动迁入 · PED/PRC='1'", 214, 218, "st-cond", "start"]] },
  { d: "M320,306 L320,260 L210,260", dash: false, labels: [
    ["Wr(PED='1') / Port_Error", 312, 276, "st-cond", "end"], ["USB2 置 PEC='1' · p275", 312, 292, "st-cond", "end"]] },
  { d: "M470,343 L530,343 L530,483 L470,483", dash: false, labels: [
    ["挂起 Wr(PLS=U3+LWS='1')", 538, 400, "st-cond", "start"], ["p275–276", 538, 416, "st-pg", "start"]] },
  { d: "M300,483 L240,483 L240,343 L300,343", dash: false, labels: [
    ["主机 Wr(PLS=Resume+LWS)", 232, 396, "st-cond", "end"],
    ["→Resume（软件计时）", 232, 412, "st-cond", "end"],
    ["Wr(PLS=U0+LWS)→RExit→U0", 232, 428, "st-cond", "end"],
    ["设备唤醒→Resume · PLC='1'", 232, 444, "st-cond", "end"],
    ["p277–278", 232, 460, "st-pg", "end"]] },
  { d: "M455,306 L455,160 L585,160 L585,110", dash: true, labels: [
    ["任一态（大泡）", 520, 138, "st-cond", "middle"], ["PP='0' / OCA='1'", 520, 154, "st-cond", "middle"]] },
  { d: "M500,73 L210,73", dash: false, labels: [
    ["Wr(PP='1')", 355, 64, "st-cond", "middle"]] },
];
const USB3_EDGES = [
  { d: "M200,110 L200,150 L385,150 L385,306", dash: false, labels: [
    ["连接检测→Polling→训练+配置成功→U0", 208, 126, "st-cond", "start"],
    ["训练成功迁入 · CSC='1' · p279", 208, 142, "st-cond", "start"]] },
  { d: "M65,186 L65,110", dash: false, labels: [
    ["Wr(PLS=RxDetect+LWS='1')", 73, 166, "st-cond", "start"], ["或 HCRST · p279", 73, 182, "st-cond", "start"]] },
  { d: "M320,306 L320,260 L210,260", dash: false, labels: [
    ["Wr(PED='1')", 312, 276, "st-cond", "end"], ["任一态除 Powered-off · p279", 312, 292, "st-cond", "end"]] },
  { d: "M470,343 L530,343 L530,483 L470,483", dash: false, labels: [
    ["挂起 Wr(PLS=U3+LWS='1')", 538, 400, "st-cond", "start"], ["p286", 538, 416, "st-pg", "start"]] },
  { d: "M300,483 L240,483 L240,343 L300,343", dash: false, labels: [
    ["主机 Wr(PLS=U0+LWS)→U3Exit", 232, 396, "st-cond", "end"],
    ["（LFPS 握手成功）→U0", 232, 412, "st-cond", "end"],
    ["设备唤醒→Resume→RExit", 232, 428, "st-cond", "end"],
    ["PLC='1' · p289–290", 232, 444, "st-cond", "end"]] },
  { d: "M455,306 L455,160 L585,160 L585,110", dash: true, labels: [
    ["任一态（大泡）", 520, 138, "st-cond", "middle"], ["PP='0' / OCA='1'", 520, 154, "st-cond", "middle"]] },
  { d: "M500,73 L210,73", dash: false, labels: [
    ["Wr(PP='1') 或 HCRST", 355, 64, "st-cond", "middle"]] },
];

function panelBoxes(boxes, ox) {
  return boxes.map((b) => `
  <g class="st-box st-${b.id}${b.id === "u0" ? " st-u0" : ""}">
    <rect x="${b.x + ox}" y="${b.y}" width="${BW}" height="${BH}" rx="10"/>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 26}" class="st-name">${esc(b.name)}</text>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 47}" class="st-zh">${esc(b.zh)}</text>
    <text x="${b.x + ox + BW / 2}" y="${b.y + 65}" class="st-sig">${esc(b.sig)}</text>
  </g>`).join("");
}
function shiftPath(d, ox) {
  return d.replace(/([ML])(\d+),(\d+)/g, (_, c, x, y) => `${c}${+x + ox},${+y}`);
}
function panelEdges(edges, ox) {
  return edges.map((e) =>
    `<path d="${shiftPath(e.d, ox)}" class="st-edge"${e.dash ? ' stroke-dasharray="7 5"' : ""} marker-end="url(#st-mk)"/>` +
    e.labels.map(([t, x, y, cls, anch]) =>
      `<text x="${x + ox}" y="${y}" class="${cls}" text-anchor="${anch}">${esc(t)}</text>`).join("")
  ).join("");
}
function panelFrame(ox, title) {
  return `<rect x="${DOM.x + ox}" y="${DOM.y}" width="${DOM.w}" height="${DOM.h}" rx="10" class="st-domain"/>
  <text x="${DOM.x + ox + DOM.w - 4}" y="536" class="st-zh" text-anchor="end">Enabled 子态域</text>
  <circle cx="${26 + ox}" cy="73" r="4" class="st-dot"/>
  <path d="M${30 + ox},73 L${40 + ox},73" class="st-entry" marker-end="url(#st-mk)"/>
  <text x="${355 + ox}" y="24" class="st-title" text-anchor="middle">${esc(title)}</text>`;
}

function stateSvg() {
  const defs = `<defs><marker id="st-mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="st-mk-fill"/></marker></defs>`;
  const body = defs +
    `<path d="M745,15 L745,525" class="st-div"/>` +
    panelFrame(P2, "USB2 端口状态机 · Figure 4-25（p273）") +
    panelBoxes(USB2_BOXES, P2) + panelEdges(USB2_EDGES, P2) +
    panelFrame(P3, "USB3 端口状态机 · Figure 4-27（p278）") +
    panelBoxes(USB3_BOXES, P3) + panelEdges(USB3_EDGES, P3) +
    `<text x="750" y="556" class="st-legend" text-anchor="middle">实线=主线迁移 · 虚线=任一态大泡迁移（→Powered-off） · ●=初始态（Disconnected）</text>
  <text x="750" y="574" class="st-legend" text-anchor="middle">盒内=PLS + 信号态 PP,CCS,PED,PR · Wr(f=v)=软件写 PORTSC · f=v=字段自动迁移（记法 p272）</text>`;
  return k.figureSvg({
    width: 1500, height: 596,
    label: "根集线器端口状态机概览：USB2 / USB3 两栏同构六态骨架与主线迁移（全图细节归 §4.19.1 原图 Figure 4-25 p273 · Figure 4-27 p278）",
    body,
  });
}

const stateCardHtml = `
${k.plateHtml({
  fig: "Fig 4.19",
  title: "根集线器端口状态机概览：USB2 vs USB3",
  hint: "骨架版状态图 · 可放大可全屏 · 全图归原图 Figure 4-25/4-27",
  readout: "",
  keys: [],
  caption: "两栏同一六态骨架，语义在 Disabled 含义、Enabled 到达方式与恢复路径三处岔开；大泡=任一态可按条件迁入 Powered-off（p272 原注）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="根集线器端口状态机概览：USB2 与 USB3 两栏对比">${stateSvg()}</div>` +
    zoomBarHtml("放大看框内文字 / 全屏后滚轮上下看 · 键盘 + − 0 F 缩放全屏"),
})}
<p>读图注记（判据逐条对页）：</p>
<ul>
<li><b>简版口径</b>：只画主线迁移与大泡；USB2 的 Test Mode 态、USB3 的 Compliance / Error / Loopback / Polling 态、两族的 Enabled 子态机（Figure 4-26 p275 · Figure 4-30 p285）、Polling 的 Training/CfgExcg/DbC 子态（Figure 4-28 p280 · Figure 4-29 p282）与 U1'/U2'/U3' 子态机（Figure 4-31/4-32/4-33 p286/287/289）不在本图——全图进出条件逐态归 §4.19.1 原文（p272–291）。</li>
<li><b>大泡</b>：虚线代表「任一态」——"Transitions associated with the large bubble may occur from any state defined within the bubble as long as the Conditions match."（p272）；USB2/USB3 到 Powered-off 的条件同为 Wr(PP='0') 或过流 OCA='1'（p274/p279），重上电回 Disconnected（p274/p279）。</li>
<li><b>Disabled 同名两义（不混写）</b>：USB2 Disabled = 连接检出后的待复位态（PLS=Polling · 1,1,0,0，Figure 4-25 p273）；USB3 Disabled = 软件写 PED='1' 的链路禁用态（PLS=Disabled · 1,0,0,0，Figure 4-27 p278）。USB3 出 Disabled 走 Wr(PLS=RxDetect+LWS) 或 HCRST 回 Disconnected（p279）；USB2 Disabled 出口只有端口复位（p274）。</li>
<li><b>Enabled 到达两族不同路（不画成同一自动路径）</b>：USB2 仅经端口复位——"When the Reset operation completes (PR = ‘0’), the port shall automatically advance to the Enabled state, setting PED and PRC to ‘1’."（p274）；USB3 attach 后链路训练+配置成功自动迁入 Enabled·U0 且置 CSC='1'（p279 · p281 · p295）。</li>
<li><b>挂起域</b>：U0/U3 是 Enabled 的子态——进入 U3 两族同写 Wr(PLS=U3+LWS='1')；恢复路径不同：USB2 主机先写 PLS=Resume（Resume 态时长由软件计时）再写 PLS=U0 经 RExit 回 U0（p277–278），USB3 主机直接写 PLS=U0 经 U3Exit 的 LFPS 握手回 U0（p289）；设备唤醒两族都置 PLC='1'（p277/p289）。</li>
<li><b>记法</b>：Wr(f=v)=软件写 PORTSC；不带 Wr 的 f=v=字段自动迁移；进入态时信号态（PP,CCS,PED,PR）被强制成该态定义值（p272 Note）。</li>
</ul>`;

const cfg = {
  theme: THEME,
  pageTitle: "§4.19 根集线器 · xHCI 规范对照学习",
  navTitle: "§4.19 根集线器",
  specRef: "xHCI 1.2b §4.19 Root Hub · p272–303 · 状态机对照 Figure 4-25 p273（USB2）/ Figure 4-27 p278（USB3）· 事件生成 §4.19.2 p291–293",
  prevHref: "../4.18-transfer-attributes/index.html", prevLabel: "§4.18 传输属性",
  nextHref: "../4.20-scratchpad-buffers/index.html", nextLabel: "§4.20 Scratchpad Buffers",
  prose: [
    "根集线器（Root Hub）不是一颗真的 hub 芯片：xHC 在内部为「每个物理连接器 × 每种协议」各给一套端口寄存器来模拟 hub 行为——USB2（LS/FS/HS）与 USB3（Enhanced SuperSpeed）两种连接类型的 PORTSC 数量可以不等，由 xHCI Supported Protocol Extended Capability（§7.2）声明归属（§4.19.7 p300）。端口状态机的记法是三行一组：<b>状态名 + Port Link State（PLS）+ 信号态</b>，信号态四元组 = PP, CCS, PED, PR（如 1,1,1,0 表示 PP/CCS/PED=1、PR=0，p272）；进入某态时信号态被强制成该态定义值，所以图上不画改这些位的动作（p272 Note）。规范明确两件事：图只示意进出条件，<b>各态的文字定义才是权威</b>（p273 Note）；状态机只引用 PLC 这一个 change bit，其余六个的置位规则归 §4.19.2（p273）。两台状态机的初始态都是 Disconnected（p273/p278）。以下软件侧按规范原文称 system software（系统软件）。",
    "同一副骨架，两族语义在三处岔开。<b>Disabled 含义不同</b>：USB2 的 Disabled 是连接已检出、等待复位的态（PLS=Polling · 1,1,0,0），USB3 的 Disabled 是软件写 PED='1' 得到的链路禁用态（PLS=Disabled · 1,0,0,0）——同名两义，读到 PORTSC 值时先看协议族。<b>Enabled 到达方式不同</b>：USB2 只有端口复位一条路（Disabled→Reset→完成自动迁入，PED/PRC='1'，p274）且复位永不失败（p299 Note）；USB3 在 attach 后由链路训练+配置成功<b>自动</b>迁入 Enabled·U0（p279/p281），其复位（PR/WPR/HCRST）反而可能失败退回 Disconnected（p283）。<b>挂起/恢复路径不同</b>：两族都把 U0（活动）与 U3（挂起）作为 Enabled 子态，挂起同写 Wr(PLS=U3+LWS='1')；恢复时 USB2 主机要写两段（先 PLS=Resume、Resume 时长由软件计时，再 PLS=U0），USB3 主机一段写 PLS=U0 走 LFPS 握手，且设备不许拒绝主机的恢复（p290）。电源域是公共底座：Wr(PP='0') 或过流把任一态打进 Powered-off（大泡，p272 原注）。",
    "事件面是本节的另一半（§4.19.2）：PORTSC 有七个状态变化位——CSC / PEC / WRC / OCC / PRC / PLC / CEC（p291），每口的变化位 OR 在一起、经 HCHalted 门控，形成内部信号 PSCEG；<b>PSCEG 的 0→1 跳变才产生 Port Status Change Event</b>——不是「某位=1 就发事件」（p293），且一口的事件在它的全部变化位清零之前被阻塞（PSCEG 回 0 才再开闸，p293 Note）。软件读 PORTSC 与事件环之间没有一致性保证：读到变化位置位，不代表对应事件已写进事件环（p292 Note）。置位/清零纪律：变化位由硬件或软件条件置位，系统软件写 '1' 清除（写 '0' 无效果），Chip Hardware Reset 或 HCRST 亦可清（p291）。",
    "形态注记（分级裁定）：§4.19 的 anatomy 机器形态留后续会话——本页为状态机骨架版：状态机概览卡＋九小节导览＋两族差异对照三件事；全图逐态细节（USB2 的 U2Entry/U2/U2Exit/U3Entry/Resume/RExit、USB3 的 U1'/U2'/U3'/Recovery 等）归 §4.19.1 原文与原图 Figure 4-25 至 4-33。",
  ],
  quotes: [
    { en: "Signal State values are: Port Power (PP), Current Connect Status (CCS), Port Enabled/Disabled (PED), and Port Reset (PR)",
      zh: "信号态四元组 = PP, CCS, PED, PR——状态盒第三行四个数的出处。",
      src: "xHCI 1.2b §4.19.1 p272" },
    { en: "When the Reset operation completes (PR = ‘0’), the port shall automatically advance to the Enabled state, setting PED and PRC to ‘1’.",
      zh: "USB2 复位完成自动迁入 Enabled 并置 PED/PRC——USB2 到 Enabled 只此一条路。",
      src: "xHCI 1.2b §4.19.1.1.4 p274" },
    { en: "A write to the PORTSC register with the PED field set to ‘1’ shall transition the port, from any state except Powered-off, to the Disabled state.",
      zh: "USB3 的 Disabled=软件写 PED='1' 可从（除 Powered-off 外）任一态进入——与 USB2 的 Disabled 完全两义。",
      src: "xHCI 1.2b §4.19.1.2.1 p279" },
    { en: "A port shall generate a Port Status Change Event when there is ‘0’ to ‘1’ transition of the PSCEG signal.",
      zh: "PSCEG 0→1 跳变才发端口状态变化事件——变化位置位本身不等于发事件。",
      src: "xHCI 1.2b §4.19.2 p293" },
    { en: "For a USB2 Protocol port, “device presence” is indicated by the PORTSC PLS field transitioning from the RxDetect to the Polling state.",
      zh: "USB2 口「设备在场」= PLS 从 RxDetect 迁到 Polling；软件随后复位端口把它送进 U0。",
      src: "xHCI 1.2b §4.19.3 p294" },
    { en: "For a USB3 Protocol port, “device presence” is indicated by the PORTSC PLS field transitioning from the Polling to the U0 state.",
      zh: "USB3 口「设备在场」= PLS 从 Polling 迁到 U0——训练成功才算在场，与 USB2 判据不同。",
      src: "xHCI 1.2b §4.19.3 p294" },
  ],
  cards: [
    { h2: "§4.19.1 状态机概览（状态图）",
      html: stateCardHtml },
    { h2: "§4.19 九小节导览（p272–303）",
      html: `<table class="xsp-tb">
<tr><th>小节</th><th>一句话要点</th><th>页</th></tr>
<tr><td><b>4.19.1 Root Hub Port State Machines</b></td><td>USB2 / USB3 两台端口状态机全图与逐态进出条件；记法=状态名+PLS+信号态（PP,CCS,PED,PR）；图只示意、文字定义为权威；只引用 PLC，其余 change bit 归 4.19.2</td><td class="mono">p272–291</td></tr>
<tr><td><b>4.19.2 Port Status Change Generation</b></td><td>七个变化位（CSC/PEC/WRC/OCC/PRC/PLC/CEC）OR 后经 HCHalted 门控成 PSCEG；0→1 跳变才发 Port Status Change Event；全部位清零前该口事件被阻塞；读 PORTSC 与事件环无一致性保证</td><td class="mono">p291–293</td></tr>
<tr><td><b>4.19.3 Connect Status Change Reporting</b></td><td>attach 上报三步：CCS='1' → CSC='1' → PSCEG 0→1 时发事件 TRB（Port ID 定位端口）；USB2 在场=PLS RxDetect→Polling（软件随后复位），USB3 在场=PLS Polling→U0</td><td class="mono">p294</td></tr>
<tr><td><b>4.19.4 Port Power</b></td><td>PPC 声明是否支持电源开关；无论支持与否 Chip Hardware Reset / HCRST 后 VBus 自动上电，初始态=Disconnected；PP='0' 强制 Powered-off；xHC 未运行（HCH='0' 前）端口即可上报连接；4.19.4.1 = U1/U2 Timeout 四组合的 Enabled U0 伪态</td><td class="mono">p294–298</td></tr>
<tr><td><b>4.19.5 Port Reset</b></td><td>Wr(PR='1')：置 PR 清 PED→发复位信令；成功收场 PLS=U0·PED='1'·PRC='1'·Port Speed=设备速度，失败收场 PLS=RxDetect·Speed=Undefined('0')·CCS='0'（仅 USB3 会失败）；PR 1→0 后设备在 Default 态；4.19.5.1 Warm Reset（WPR/WRC 仅 USB3，USB2 口 RsvdZ）</td><td class="mono">p298–299</td></tr>
<tr><td><b>4.19.6 Port Test Modes</b></td><td>仅 USB2 口支持五种测试模式（Test_J_State/Test_K_State/Test_Packet/Test_Force_Enable/Test_SE0_NAK），USB3 口无；同一时刻至多一口在测（否则未定义）；测试序列：禁用全部 Device Slot→全口 Disabled(PP='0')→R/S='0' 等 HCH='1'→写 PORTPMSC 的 Port Test Control</td><td class="mono">p299–300</td></tr>
<tr><td><b>4.19.7 Port Routing and Control</b></td><td>每种连接类型一套 PORTSC（USB2 口=PORTSC+USB2 PORTPMSC，USB3 口=PORTSC+USB3 PORTPMSC+PORTLI）；Supported Protocol Capability 定端口归属；端口编号 1..MaxPorts（HCSPARAMS1）；Figure 4-35 路由例（Offset/Count）；同物理连接器的 PP 引脚 OR 在一起</td><td class="mono">p300–302</td></tr>
<tr><td><b>4.19.8 Cold Attach Status</b></td><td>USB3 口 CCS 要训练到 U0 才置位——D3 低功耗态时钟停摆时报不了；CAS 代位：远端终端电阻检出+D3 低功耗+LTSSM 非 Error/U3/Disabled 三条件齐才置 '1'，不是通用在场指示；CAS 跳变拉起 CSC；唤醒后对 CAS='1' 的口发 WPR，WPR 清 CAS；USB2 口恒 '0'</td><td class="mono">p302–303</td></tr>
<tr><td><b>4.19.9 Port Speed</b></td><td>SSP capable hub 对 GetStatus(PORT_SPEED) 恒回 '0'（=5Gb/s）保 legacy 驱动不乱；真实速度走 GetStatus(EXT_PORT_SPEED)；SSP 设备在 SET_ADDRESS 后必须发 Sublink Speed Device Notification TP，让 xHC 知道真实速度</td><td class="mono">p303</td></tr>
</table>
<p>（小节页码=各节标题在提取文本中的起始页；4.19.1 内部含 USB2 顶层/子态图与 USB3 顶层/子态图共九张 Figure。）</p>` },
    { h2: "USB2 vs USB3 端口差异对照（避雷三条入表）",
      html: `<table class="xsp-tb">
<tr><th>维度</th><th>USB2 协议端口</th><th>USB3 协议端口</th><th>判据页</th></tr>
<tr><td><b>Disabled 态含义</b>（同名两义）</td><td>连接检出后的<b>待复位态</b>：PLS=Polling，信号 1,1,0,0（设备已接、CCS='1'，等软件复位）</td><td><b>链路禁用态</b>：PLS=Disabled，信号 1,0,0,0；软件写 PED='1' 可从除 Powered-off 外任一态进入；出口=Wr(PLS=RxDetect+LWS) 或 HCRST 回 Disconnected</td><td class="mono">p273 · p279</td></tr>
<tr><td><b>Enabled 到达方式</b></td><td><b>仅经端口复位</b>：Disabled→Reset（Wr(PR='1')）→完成（PR='0'）自动迁入，PED/PRC='1'；Port Speed 随复位检出</td><td><b>attach 自动</b>：连接检测→Polling→训练+配置成功（Downstream Config Successful）自动迁入 Enabled·U0，置 CSC='1'；复位完成同样可到达</td><td class="mono">p274 · p279 · p281 · p295</td></tr>
<tr><td><b>复位路径与可失败性</b></td><td>仅 PR='1' 一种；<b>永不失败</b>（规范原文：USB2 protocol ports never fail the bus reset sequence）；WPR/WRC 位为 RsvdZ</td><td>PR（Hot）/ WPR（Warm）/ HCRST 三入口；<b>可失败</b>→退 Disconnected：PLS=RxDetect('5')、PR='0'、PRC='1'、Port Speed=Undefined('0')、CCS='0'；Hot 转 Warm 置 WRC；Warm=Hot 全部功能+链路重训（Rx.Detect 起、更耗时）</td><td class="mono">p283 · p298–299</td></tr>
<tr><td><b>挂起进入（两族同写）</b></td><td>Wr(PLS=U3+LWS='1')→U3Entry（xHC 停总线挂起设备）→U3（Idle）；U3C·U3E='1' 时置 PLC（U3 Entry complete，p275–276）</td><td>Wr(PLS=U3+LWS='1')→U3' 子态机 U3Entry→收到 LAU 进 U3；U3C·U3E='1' 时置 PLC（p286 · p289）</td><td class="mono">p275–276 · p286 · p289</td></tr>
<tr><td><b>主机恢复</b></td><td>两段写：U3→Resume（Wr(PLS=Resume+LWS)）→<b>Resume 时长由软件计时</b>（按 USB2 规范保证恢复序列完成）→Wr(PLS=U0+LWS)→RExit→U0</td><td>一段写：Wr(PLS=U0+LWS)→U3Exit（LTSSM Recovery，LFPS 握手）→U0；<b>设备不许拒绝主机的恢复</b>（p290 Note）</td><td class="mono">p277–278 · p289–290</td></tr>
<tr><td><b>设备唤醒</b></td><td>U3→Resume（xHC 发恢复信令）·PLC='1'（Wakeup signaling from a device）</td><td>U3→Resume→RExit·PLC='1'（Wakeup signaling from a device）</td><td class="mono">p277 · p289</td></tr>
<tr><td><b>连接在场判据</b>（4.19.3）</td><td>PLS 从 RxDetect 迁到 Polling 即「设备在场」；软件随后<b>必须复位端口</b>才到 U0</td><td>PLS 从 Polling 迁到 U0 才「设备在场」（训练成功即在场，无需软件复位）</td><td class="mono">p294</td></tr>
<tr><td><b>端口级独有</b></td><td>Test Mode 态：五种测试模式（4.19.6）；测试前提=R/S='0' 且 HCH='1'</td><td>Compliance / Error / Loopback 态与 Warm Reset（WPR/WRC）；Polling 子态机（Training/CfgExcg/DbC，DbC 需 Debug Capability 支持）</td><td class="mono">p279–284 · p299–300</td></tr>
</table>
<p>（本表逐行对页取自 §4.19.1–4.19.6 原文；「不混写」三行=DESIGN 避雷清单的端口侧落点：Disabled 两义、USB2 复位必经 vs USB3 attach 自动、复位可失败性。）</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——端口的上电与上报起点：PP 自动上电、MaxSlotsEn 延迟 PP 特性使端口可在 xHC 运行前就报 CCS/CSC='1'（p294–295）。</p>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——USB2 复位完成（PED/PRC='1'·Port Speed）即枚举主线由此起步；<a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——disconnect detect（CCS='0'）在状态机里的去向（Disconnected·CSC='1'）。</p>
<p><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——Port Status Change Event 经事件环与中断送达软件侧的投递通道。</p>
<p><a href="../../index.html">§4.15 挂起与恢复（待建）</a>——USB2 LPM（U2Entry/U2Exit）与唤醒操作的完整展开（本页只收端口状态机侧；p275–278 引 §4.15.2 / §4.23.5）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.19 p272–303 · 状态图对照 Figure 4-25 p273 / Figure 4-27 p278 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
// 状态图 SVG 样式 + zoomfs 三件套注入（table_page.mjs 为静态表格节无 zoomfs——本节状态图卡需要，
// _gen/ 未改，样式与脚本以 body 尾注入；--font-ui/--font-mono 由 table_page 的 :root 提供）
const ST_CSS = `
.st-box rect { fill: var(--anatomy-face, #1b1b1b); stroke: var(--anatomy-hi, #556); stroke-width: 1.8; }
.st-name { font: 700 17px var(--font-ui); fill: var(--anatomy-strong); text-anchor: middle; }
.st-zh { font: 500 14px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.st-sig { font: 400 12.5px var(--font-mono); fill: var(--anatomy-muted); text-anchor: middle; }
.st-edge { stroke: var(--anatomy-blue, #6b9bff); stroke-width: 2; fill: none; }
.st-mk-fill { fill: var(--anatomy-blue, #6b9bff); }
.st-domain { fill: none; stroke: var(--anatomy-hi, #556); stroke-width: 1.2; stroke-dasharray: 5 4; }
.st-entry { stroke: var(--anatomy-strong); stroke-width: 2; fill: none; }
.st-dot { fill: var(--anatomy-strong); }
.st-div { stroke: var(--anatomy-line-mid, #2a3444); stroke-width: 1; stroke-dasharray: 4 6; }
.st-title { font: 600 15px var(--font-ui); fill: var(--anatomy-strong); }
.st-cond { font: 500 13.5px var(--font-mono); fill: var(--anatomy-text); }
.st-pg { font: 400 12.5px var(--font-mono); fill: var(--anatomy-muted); }
.st-legend { font: 400 12.5px var(--font-ui); fill: var(--anatomy-muted); }
.iso[data-theme="light"] .st-pg { fill: #6b6350; }
.iso[data-theme="light"] .st-legend { fill: #6b6350; }
.iso[data-theme="light"] .st-sig { fill: #6b6350; }
`;
const inject = `<style>${zoomFsCss()}${ST_CSS}</style><script>${zoomFsScript({ focus: [".st-u0"] })}</script>`;
const out = page.replace("</body>", inject + "</body>");
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), out);
console.log("wrote", name, (out.length / 1024).toFixed(0) + " KB");
