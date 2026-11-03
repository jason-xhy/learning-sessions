// §4.8 端点 —— 状态图＋表格节（表格节呈现，不做动画；DESIGN 分级）
// 判据：xHCI 1.2b §4.8 p143–149（引文五条逐字）；§4.5.1 p83（DCI 公式）；§6.2.3 p413–414（EP State 编码 Table 6-8）
// 工艺：基底=_gen/table_page.mjs（cards 数组同形，CSS/markup 照抄）；状态图卡（iso-stage + zoomfs
//       单 stage，照抄 4.4 plateHtml+zoomBarHtml 接线）在本文件自组，不动 _gen/。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- 状态图布局（单一事实源：盒/箭头常量 → SVG 与触边核算同源） ----------
const W = 1240, H = 580;
const BOXES = {
  running:  { x: 500, y: 54,  w: 240, h: 68, name: "Running",  stroke: "ep8-running",
    sub1: "EP State = 1", sub2: "Busy / Idle（p148 注）" },
  halted:   { x: 130, y: 208, w: 200, h: 68, name: "Halted",   stroke: "ep8-halted",
    sub1: "EP State = 2", sub2: "等 Reset Endpoint" },
  stopped:  { x: 505, y: 208, w: 230, h: 68, name: "Stopped",  stroke: "ep8-stopped",
    sub1: "EP State = 3", sub2: "Stop Endpoint 后 / 恢复自 Halt" },
  error:    { x: 870, y: 208, w: 230, h: 68, name: "Error",    stroke: "ep8-error",
    sub1: "EP State = 4", sub2: "等 Set TR Dequeue Pointer" },
  disabled: { x: 505, y: 468, w: 230, h: 68, name: "Disabled", stroke: "ep8-disabled",
    sub1: "EP State = 0", sub2: "不调度 · 门铃禁写（p143）" },
};
// 迁移箭头（pts 折线；首点=a 盒边，末点=b 盒边；pg=判据页码）
const ARROWS = [
  { id: "t01", name: "Disabled→Running",  a: "disabled", b: "running",  pts: [[505, 510], [60, 510], [60, 88], [500, 88]] },
  { id: "t02", name: "Running→Stopped",   a: "running",  b: "stopped",  pts: [[570, 122], [570, 208]] },
  { id: "t03", name: "Stopped→Running",   a: "stopped",  b: "running",  pts: [[670, 208], [670, 122]] },
  { id: "t04", name: "Running→Halted",    a: "running",  b: "halted",   pts: [[500, 105], [315, 208]] },
  { id: "t05", name: "Halted→Stopped",    a: "halted",   b: "stopped",  pts: [[330, 242], [505, 242]] },
  { id: "t06", name: "Running→Error",     a: "running",  b: "error",    pts: [[740, 105], [900, 208]] },
  { id: "t07", name: "Error→Stopped",     a: "error",    b: "stopped",  pts: [[900, 276], [900, 330], [700, 330], [700, 276]] },
  { id: "t08", name: "Running→Disabled",  a: "running",  b: "disabled", pts: [[740, 72], [1160, 72], [1160, 502], [735, 502]] },
  { id: "t09", name: "Stopped→Disabled",  a: "stopped",  b: "disabled", pts: [[620, 276], [620, 468]] },
  { id: "t10", name: "Error→Disabled",    a: "error",    b: "disabled", pts: [[1020, 276], [1020, 395], [680, 395], [680, 468]] },
  { id: "t11", name: "Halted→Disabled",   a: "halted",   b: "disabled", pts: [[190, 276], [190, 430], [545, 430], [545, 468]] },
];
// 条件标注（ep8-lbl 带底色描边晕圈，可压在自家箭头上）与页码角标（ep8-pg）
const LBL = [
  { x: 75, y: 52,  a: "start",  t: "Address Device（仅 Default Control EP）" },
  { x: 75, y: 76,  a: "start",  t: "Configure Endpoint（A=1·D=0，EP0 除外）" },
  { x: 570, y: 140, a: "middle", t: "Stop Endpoint Command" },
  { x: 685, y: 145, a: "middle", t: "门铃" },
  { x: 675, y: 167, a: "middle", t: "Configure Endpoint（A=1·D=1）" },
  { x: 405, y: 155, a: "middle", t: "Halt 条件（STALL 等）" },
  { x: 417, y: 230, a: "middle", t: "Reset Endpoint Command" },
  { x: 855, y: 150, a: "middle", t: "TRB Error" },
  { x: 800, y: 322, a: "middle", t: "Set TR Dequeue Pointer" },
  { x: 235, y: 360, a: "start",  t: "Configure Endpoint 去配置（DC=1）" },
  { x: 235, y: 382, a: "start",  t: "Reset Device（EP0 除外）" },
  { x: 235, y: 404, a: "start",  t: "Disable Slot（任意态，含 EP0）" },
];
const PGS = [
  { x: 75, y: 104, a: "start",  t: "p146 注1–2" },
  { x: 582, y: 190, a: "start",  t: "p148" },
  { x: 682, y: 190, a: "start",  t: "p147 注6 · p148" },
  { x: 405, y: 177, a: "middle", t: "p147" },
  { x: 417, y: 258, a: "middle", t: "p147" },
  { x: 875, y: 175, a: "middle", t: "p147" },
  { x: 800, y: 345, a: "middle", t: "p147" },
  { x: 1150, y: 480, a: "end",   t: "p148" },
  { x: 632, y: 380, a: "start",  t: "p148" },
  { x: 1032, y: 300, a: "start", t: "p148" },
  { x: 235, y: 424, a: "start",  t: "p146 注3–4 · p148" },
];

// 触边核算：端点到盒边距（构造上=0，每次构建打印核算表 → EVIDENCE）
function edgeDist(p, b) {
  const dx = Math.max(b.x - p[0], 0, p[0] - (b.x + b.w));
  const dy = Math.max(b.y - p[1], 0, p[1] - (b.y + b.h));
  return Math.hypot(dx, dy);
}
let auditMax = 0;
const auditLines = ARROWS.map((ar) => {
  const dA = edgeDist(ar.pts[0], BOXES[ar.a]);
  const dB = edgeDist(ar.pts[ar.pts.length - 1], BOXES[ar.b]);
  auditMax = Math.max(auditMax, dA, dB);
  const p0 = `(${ar.pts[0][0]},${ar.pts[0][1]})`, pN = `(${ar.pts[ar.pts.length - 1][0]},${ar.pts[ar.pts.length - 1][1]})`;
  return `  ${ar.id} ${ar.name.padEnd(18)} A端 ${p0} → ${ar.a.padEnd(8)} Δ=${dA.toFixed(1)}px   B端 ${pN} → ${ar.b.padEnd(8)} Δ=${dB.toFixed(1)}px`;
});

function stateSvg() {
  const arrows = ARROWS.map((ar) =>
    `<g data-arrow="${ar.id}" data-a="${ar.a}" data-b="${ar.b}"><polyline class="ep8-arr" points="${ar.pts.map((p) => p.join(",")).join(" ")}" marker-end="url(#ep8-mk)"/></g>`).join("\n");
  const boxes = Object.entries(BOXES).map(([id, b]) => {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    return `<g data-box="${id}"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="12" class="ep8-box ${b.stroke}"/>
<text class="ep8-name" x="${cx}" y="${cy - 14}">${esc(b.name)}</text>
<text class="ep8-subm" x="${cx}" y="${cy + 8}">${esc(b.sub1)}</text>
<text class="ep8-sub" x="${cx}" y="${cy + 26}">${esc(b.sub2)}</text></g>`;
  }).join("\n");
  const lbl = LBL.map((l) => `<text class="ep8-lbl" x="${l.x}" y="${l.y}" text-anchor="${l.a}">${esc(l.t)}</text>`).join("\n");
  const pgs = PGS.map((l) => `<text class="ep8-pg" x="${l.x}" y="${l.y}" text-anchor="${l.a}">${esc(l.t)}</text>`).join("\n");
  const body = `<defs><marker id="ep8-mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="ep8-mkfill"/></marker></defs>
${arrows}
${boxes}
${lbl}
${pgs}`;
  return k.figureSvg({ width: W, height: H, label: "端点状态机：Disabled/Running/Stopped/Halted/Error 五态与 11 条迁移", body });
}

const legendHtml = `<div class="xsp-legend">
<span><i style="background:var(--anatomy-green)"></i>Running</span>
<span><i style="background:var(--anatomy-blue)"></i>Stopped</span>
<span><i style="background:var(--anatomy-red)"></i>Halted</span>
<span><i style="background:var(--ep8-amber)"></i>Error</span>
<span><i style="background:var(--anatomy-mid)"></i>Disabled</span>
<span>实线箭头=状态迁移 · 角标=判据页码</span>
</div>`;

const figureCard = `<div class="xsp-card"><h2>4.8.3 端点状态机（Figure 4-5 重绘）</h2>
${k.plateHtml({
  fig: "Fig 4-5 重绘",
  title: "端点状态机 · §4.8.3 p146–148",
  hint: "静态图 · 可放大可全屏",
  readout: "5 态 · 11 条迁移",
  keys: [],
  caption: "EP State 五态与迁移，依据 §4.8.3 p146–148 文字重绘。四条指向 Disabled 的箭头同组条件：Configure Endpoint 去配置（DC=1）/ Reset Device（EP0 除外）/ Disable Slot（任意态，含 EP0）；EP0 只受 Address Device、门铃与 Disable Slot 影响。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="端点状态机状态图：Disabled、Running、Stopped、Halted、Error 五态迁移">${stateSvg()}</div>` + legendHtml + zoomBarHtml("放大看状态盒与迁移条件 · 全屏后滚轮上下看 · 键盘 + − 0 F 缩放全屏"),
})}
</div>`;

// ---------- 页面数据（与 _gen/table_page.mjs cfg 同形） ----------
const cfg = {
  pageTitle: "§4.8 端点 · xHCI 规范对照学习",
  navTitle: "§4.8 端点",
  specRef: "xHCI 1.2b §4.8 Endpoint · p143–149 · 寻址图 Figure 4-4 p144 · 状态图 Figure 4-5 p146 · EP State 编码 Table 6-8 p413 · DCI 公式 §4.5.1 p83",
  prevHref: "../4.7-doorbells/index.html", prevLabel: "§4.7 门铃",
  nextHref: "", nextLabel: "",
  prose: [
    "一个 USB 设备最多支持 <b>31 个端点</b>：15 个 IN、15 个 OUT，外加 1 个 Control；Default Control EP（EP0）是所有 USB 设备都定义的<b>双向</b>端点（p143）。软件（规范原文称 system software（系统软件））要管理这些端点，先要能点名——USB 端点描述符用 4-bit 端点号加方向位编址，xHCI 用同一套骨架：<b>端点号从 16 对 Endpoint Context 里选出一对，方向位再选 IN 或 OUT 那一格</b>（§4.8.1 p144）。每格在 Device Context 里的位置由 Device Context Index（DCI）编号：Slot Context 占 DCI 0，EP0 占 DCI 1，其余按「DCI=(EP Number×2)+Direction」排布（公式原文在 §4.5.1 p83；图4-4 把 0–31 号格画在 p144）。",
    "控制端点是双向的，Direction 位在编址时被<b>忽略</b>——xHC 规定用该对的 <b>IN（奇数）格</b>管理双向端点；EP Number&gt;0 的双向端点，其 OUT（偶数）格被 xHC 忽略（§4.8.1 p144）。初始化时输入端点上下文<b>所有字段（含 Reserved）先清 0</b>，再按端点类型填少数例外：EP0 填 EP Type=Control、按速度的默认 Max Packet Size（设备描述符取回前可先用默认值）、CErr=3、传输环首段地址与 DCS=1（§4.8.2 p144–145）；描述符取回后用 Evaluate Context 命令把实际 Max Packet Size 更新给 xHC（§6.2.3.1 p417——§4.8.2.1 此句原文写作「Evaluate Endpoint Command」，命令本体即 Evaluate Context）。Bulk 的 Max Burst Size 与 Streams 数组、Isoch/Interrupt 的 Mult 与 Max ESIT Payload，各按 §4.8.2.3/§4.8.2.4 的清单填（p145–146）。",
    "端点上下文的现态由 <b>EP State 字段</b>表达，共五态：Disabled / Running / Halted / Error / Stopped（§4.8.3 p146；编码 Table 6-8 p413）。Running 是唯一干活态——Busy（正在跑 TRB）与 Idle（等门铃）只是它的两个子态，传输环跑空也不退出 Running（p148 注）。Halt 条件（STALL、USB Transaction Error 等）把 Running 打进 Halted，<b>Reset Endpoint 命令</b>清断后落到 Stopped；TRB Error 把 Running 打进 Error，<b>Set TR Dequeue Pointer 命令</b>落到 Stopped；<b>Stop Endpoint 命令</b>直接停在 Stopped；<b>门铃一响 Stopped 回 Running</b>。任何态都能被 <b>Disable Slot</b> 打回 Disabled（含 EP0）；去配置（Configure Endpoint DC=1）与 Reset Device 则把除 EP0 外的各态打回 Disabled（p146–148）。EP State 可能滞后——软件应自维护端点状态镜像，不依赖 EP State 的瞬时值（p149）。",
  ],
  quotes: [
    { en: "A USB device supports up to 31 endpoints (EPs): for example,15 IN, 15 OUT, and 1 Control. The Default Control EP (0) is a bidirectional EP defined for all USB devices.",
      zh: "端点总量与 EP0 的双向属性——31 个端点的账面从这里起算。",
      src: "xHCI 1.2b §4.8 p143" },
    { en: "The xHCI parallels this organization by using the Endpoint Number to select one of 16 Endpoint Context data structure pairs, and the Direction bit to select the IN or OUT Endpoint Context of a pair.",
      zh: "端点号选对、方向位选边——xHCI 对 USB 编址的逐格复刻。",
      src: "xHCI 1.2b §4.8.1 p144" },
    { en: "To accommodate the addressing anomaly of USB bidirectional endpoint addressing the xHC shall use the IN (odd) Endpoint Context of the pair to manage bidirectional endpoints.",
      zh: "双向端点一律住 IN（奇数）格——编址异例由固定落位消化。",
      src: "xHCI 1.2b §4.8.1 p144" },
    { en: "If an endpoint is in the Stopped state when the doorbell is rung, it will transition to the Running state.",
      zh: "门铃是 Stopped 回 Running 的扳机——恢复干活只差一响。",
      src: "xHCI 1.2b §4.8.3 p148" },
    { en: "An Endpoint is considered “enabled” if it is not in the Disabled state.",
      zh: "enabled 判据：不在 Disabled 态就算可用——门铃禁令只画在 Disabled 一态上。",
      src: "xHCI 1.2b §4.8.3 p148" },
  ],
  cards: [
    { h2: "4.8.1 端点寻址：EP Number × Direction → DCI 0–31",
      html: `<table class="xsp-tb">
<tr><th>对象</th><th>EP Number · 方向</th><th>DCI 编号规则（原文公式）</th><th>落位与特例</th><th>判据页</th></tr>
<tr><td>Slot Context</td><td>—</td><td class="mono">固定 DCI = 0</td><td>Device Context 第 0 格</td><td class="mono">§4.5.1 p83</td></tr>
<tr><td><b>Default Control EP0</b>（双向）</td><td>EP Number 0 · Direction 忽略</td><td class="mono">DCI = (Endpoint Number * 2) + 1 → 1</td><td>DCI 1（图4-4 标 Direction = N/A 的 BiDir 格）</td><td class="mono">图4-4 p144 · §4.5.1 p83</td></tr>
<tr><td>EP1–15 OUT（Isoch/Interrupt/Bulk）</td><td>EP Number n · OUT=‘0’</td><td class="mono">DCI = (Endpoint Number * 2) + Direction</td><td>偶数格 DCI 2/4/…/30</td><td class="mono">§4.5.1 p83 · 图4-4 p144</td></tr>
<tr><td>EP1–15 IN（Isoch/Interrupt/Bulk）</td><td>EP Number n · IN=‘1’</td><td class="mono">同上式（Direction=1）</td><td>奇数格 DCI 3/5/…/31</td><td class="mono">§4.5.1 p83 · 图4-4 p144</td></tr>
<tr><td>EP1–15 Control（双向）</td><td>Direction 忽略</td><td class="mono">Control 公式 → 奇数格</td><td>软件用该对 <b>IN（奇）格</b>管理；OUT（偶）格被 xHC 忽略</td><td class="mono">§4.8.1 p144</td></tr>
<tr><td>总量上限</td><td>4-bit Endpoint Number + Direction bit → 最多 31 值</td><td>—</td><td>15 IN + 15 OUT + 1 Control；EP0 双向</td><td class="mono">§4.8 p143 · §4.8.1 p144</td></tr>
</table>
<p>公式逐字取自 §4.5.1 p83：「DCI = (Endpoint Number * 2) + Direction, where Direction = ‘0’ for OUT endpoints and ‘1’ for IN endpoints」与 Control 端点「DCI = (Endpoint Number * 2) + 1」；§4.8.1 用 Figure 4-4（p144）把同一映射画成 0–31 号格。</p>` },
    { h2: "4.8.3 端点状态 × 含义（EP State 0–4，Table 6-8 p413–414）",
      html: `<table class="xsp-tb">
<tr><th>EP State</th><th>状态</th><th>Table 6-8 原文含义</th><th>迁移要点（§4.8.3）</th><th>判据页</th></tr>
<tr><td class="mono">0</td><td><b>Disabled</b></td><td>The endpoint is not operational</td><td>门铃禁写（p143/p148 注）；离开：Address Device（仅 EP0）或 Configure Endpoint（A=1·D=0，EP0 除外）→ Running</td><td class="mono">p413 · p146–147</td></tr>
<tr><td class="mono">1</td><td><b>Running</b></td><td>The endpoint is operational, either waiting for a doorbell ring or processing TDs</td><td>Busy/Idle 两子态，环跑空不退态（p148 注）；离开：Stop Endpoint→Stopped · Halt 条件→Halted · TRB Error→Error · 去配置/Reset Device（EP0 除外）/ Disable Slot→Disabled</td><td class="mono">p413 · p146–148</td></tr>
<tr><td class="mono">2</td><td><b>Halted</b></td><td>The endpoint is halted due to a Halt condition detected on the USB. SW shall issue Reset Endpoint Command to recover…（SW 可改传输环）</td><td>进入：Halt 条件（STALL 等，p147）；离开：Reset Endpoint→Stopped；Stop Endpoint=无效果+Context State Error；去配置/Reset Device（EP0 除外）/ Disable Slot→Disabled</td><td class="mono">p413–414 · p147–148</td></tr>
<tr><td class="mono">3</td><td><b>Stopped</b></td><td>The endpoint is not running due to a Stop Endpoint Command or recovering from a Halt condition.（SW 可改传输环）</td><td>不产生 Transfer Event（p148）；门铃→Running；Configure Endpoint（A=1·D=1，EP0 除外）→Running；去配置/Reset Device（EP0 除外）/ Disable Slot→Disabled</td><td class="mono">p413–414 · p147–148</td></tr>
<tr><td class="mono">4</td><td><b>Error</b></td><td>The endpoint is not running due to a TRB Error.（SW 可改传输环）</td><td>进入：TRB Error（should，p147）；离开：Set TR Dequeue Pointer→Stopped；Stop Endpoint=无效果+Context State Error；去配置/Reset Device（EP0 除外）/ Disable Slot→Disabled</td><td class="mono">p414 · p147–148</td></tr>
</table>
<p>判据与旁注：</p>
<ul>
<li><b>「enabled」判据</b>：An Endpoint is considered “enabled” if it is not in the Disabled state（p148）——五态里只有 Disabled 不可用（The endpoint is not operational，p413）；门铃禁写与 Endpoint Not Enabled Error（§4.7 p143）都以此为界。</li>
<li><b>Halted/Error 下发 Stop Endpoint</b>：无效果，且回 Command Completion Event，Completion Code=<b>Context State Error</b>（p147）。</li>
<li><b>EP State 会滞后</b>：xHC 应尽量保持及时，但可能让位于高优先级访存——软件应维护内部变量跟踪端点状态（p149）；xHC 复位时非 Disabled 端点的 EP State 值<b>无效</b>（p148）。</li>
<li><b>EP0 三条特例</b>：STALL 任一阶段都进 Halted，Reset Endpoint 清断后门铃（下一个 Setup Stage TD）回 Running（p147 注）；Configure Endpoint 不影响 EP0（p148）；只有 Disable Slot 能把 EP0 从任意态打回 Disabled（p146 注4 / p148）。</li>
<li><b>TRB Error 不保证优雅处理</b>：实现可能未定义行为乃至 HCE——软件的责任是始终呈现格式正确的 TRB（p148 注）。</li>
</ul>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——Address Device 把 EP0 从 Disabled 送入 Running（§4.8.3 注1）；EP0 上下文初值与 A0/A1 置位见该节。</p>
<p><a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——Disable Slot 把全槽端点（含 EP0）从任意态打回 Disabled（§4.8.3 注4）；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——Disabled 端点的门铃禁写与 Endpoint Not Enabled Error（p143）。</p>
<p><a href="../../../xhc-machines/fig2-transfer-ring/index.html">Fig2 传输环分度台</a>——状态机管的传输环本体（Stopped 态下软件可增删改 TD）。</p>
<p><a href="../../index.html">§4.9 TRB Ring（待建）</a>——传输环与 Dequeue Pointer；<a href="../../index.html">§4.12 Streams（待建）</a>——MaxPStreams&gt;0 时 DCS 不适用（p145）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.8 p143–149、§4.5.1 p83、§6.2.3 p413–414 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

// ---------- 页面组装（基底=table_page.mjs 的 CSS/markup，插入状态图卡，接 zoomfs） ----------
const pageCss = `<style>
${zoomFsCss()}
:root { --font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", "Segoe UI", sans-serif; --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
.iso { --ep8-amber: #d9a860; }
.iso[data-theme="light"] { --ep8-amber: #8a5f14; }
.xsp-nav { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin: 4px 0 2px; font-family: var(--font-ui); font-size: 14px; color: var(--anatomy-muted); }
.xsp-nav .ttl { font-size: 20px; font-weight: 700; color: var(--anatomy-text); }
.xsp-nav a { color: var(--anatomy-link, #9cc3e0); text-decoration: none; } .xsp-nav a:hover { text-decoration: underline; }
.xsp-specref { font-family: var(--font-mono); font-size: 12.5px; color: var(--anatomy-muted); margin: 0 0 14px; }
.xsp-card { background: var(--anatomy-paper, #171f2a); border: 1px solid var(--anatomy-line-mid, #2a3444); border-radius: 8px; padding: 16px 22px; margin: 14px 0; }
.xsp-card h2 { font-family: var(--font-ui); font-size: 18px; margin: 2px 0 8px; color: var(--anatomy-text); }
.xsp-card p { margin: 8px 0; line-height: 1.95; color: var(--anatomy-text); font-size: 16.5px; }
.xsp-card p b { color: var(--anatomy-text); }
.xsp-card table.xsp-tb { width: 100%; border-collapse: collapse; margin: 10px 0 4px; font-family: var(--font-ui); }
.xsp-card table.xsp-tb th { font-size: 14px; color: var(--anatomy-muted); text-align: left; border-bottom: 1.5px solid var(--anatomy-line-mid, #456); padding: 5px 8px; }
.xsp-card table.xsp-tb td { font-size: 15px; color: var(--anatomy-text); border-bottom: 1px dashed var(--anatomy-line-lo, #334); padding: 6px 8px; vertical-align: top; }
.xsp-card table.xsp-tb td.mono { font-family: var(--font-mono); font-size: 13px; }
.xsp-card li { color: var(--anatomy-text); font-size: 16px; line-height: 1.9; margin: 4px 0 4px 18px; }
.xsp-q { margin: 12px 0; padding: 10px 16px; border-left: 3px solid var(--anatomy-line-hi, #556); }
.xsp-q .en { font-family: var(--font-ui); font-style: italic; color: var(--anatomy-muted); font-size: 14.5px; line-height: 1.8; }
.xsp-q .zh { color: var(--anatomy-text); font-size: 15.5px; margin-top: 4px; }
.xsp-q .src { font-family: var(--font-mono); font-size: 12px; color: var(--anatomy-muted); }
.xsp-legend { display: flex; gap: 14px; flex-wrap: wrap; font-family: var(--font-ui); font-size: 13.5px; color: var(--anatomy-muted); margin-top: 10px; }
.xsp-legend i { display: inline-block; width: 11px; height: 11px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.xsp-foot { font-family: var(--font-ui); font-size: 13px; color: var(--anatomy-muted); margin-top: 18px; }
.ep8-name { font: 700 20px var(--font-ui); fill: var(--anatomy-strong); text-anchor: middle; }
.ep8-sub { font: 500 14px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.ep8-subm { font: 500 14px var(--font-mono); fill: var(--anatomy-text); text-anchor: middle; }
.ep8-lbl { font: 500 14px var(--font-ui); fill: var(--anatomy-text); paint-order: stroke; stroke: var(--anatomy-paper); stroke-width: 4px; stroke-linejoin: round; }
.ep8-pg { font: 400 12px var(--font-mono); fill: var(--anatomy-muted); }
.ep8-box { fill: var(--anatomy-shade-2, var(--anatomy-paper)); stroke-width: 2px; }
.ep8-running { stroke: var(--anatomy-green); }
.ep8-stopped { stroke: var(--anatomy-blue); }
.ep8-halted { stroke: var(--anatomy-red); }
.ep8-error { stroke: var(--ep8-amber); }
.ep8-disabled { stroke: var(--anatomy-mid); stroke-dasharray: 6 4; }
.ep8-arr { stroke: var(--anatomy-mid); stroke-width: 2px; fill: none; }
.ep8-mkfill { fill: var(--anatomy-mid); }
</style>`;

const navHtml = `
<div class="xsp-nav">
  <a href="../../index.html">← 规范目录</a>
  <span class="ttl">${esc(cfg.navTitle)}</span>
  ${cfg.nextHref ? `<a href="${cfg.nextHref}">下一节 ${esc(cfg.nextLabel)} →</a>` : ""}
  ${cfg.prevHref ? `<a href="${cfg.prevHref}">← 上一节 ${esc(cfg.prevLabel)}</a>` : ""}
</div>
<p class="xsp-specref">${esc(cfg.specRef)}</p>`;

const proseHtml = `<div class="xsp-card"><h2>规范要义</h2>
${cfg.prose.map((p) => `<p>${p}</p>`).join("\n")}</div>`;

const quotesHtml = `<div class="xsp-card"><h2>原文对照</h2>
${cfg.quotes.map((q) => `<div class="xsp-q"><div class="en">“${esc(q.en)}”</div>
<div class="zh">${q.zh}</div><div class="src">${esc(q.src)}</div></div>`).join("")}</div>`;

const cardsHtml = cfg.cards.map((c) => `<div class="xsp-card"><h2>${c.h2}</h2>
${c.html}</div>`).join("\n");

const body = pageCss + navHtml + proseHtml + quotesHtml + figureCard + cardsHtml + cfg.linksHtml + `
<p class="xsp-foot">${cfg.footLine}</p>`;

const page = k.pageHtml({ title: cfg.pageTitle, theme: THEME, body, script: zoomFsScript({ focus: [] }), width: 1500 });
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
console.log("端点状态图箭头触边核算（端点到目标盒边距，构造上应全为 0）：");
console.log(auditLines.join("\n"));
console.log(`  max Δ = ${auditMax.toFixed(1)}px （门限 ±2.5px）→ ${auditMax <= 2.5 ? "AUDIT-PASS" : "AUDIT-FAIL"}`);
