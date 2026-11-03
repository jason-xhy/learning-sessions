// §4.5 设备槽管理 —— 状态图＋表格节（2026-11-04）
// 形态：table_page.mjs 表格节布局（cfg.cards 承载全部卡，状态图卡按 brief「额外 HTML 拼进
//   linksHtml 前的位置」进入 cards 数组）+ zoomfs 三件套以 body 尾注入（_gen/ 未改）。
//   状态图卡单 .iso-stage，接 zoomBarHtml/zoomFsCss/zoomFsScript（照抄 4.4 接线形态）。
// 判据：xHCI 1.2b §4.5 p81–90（三组件/布局/DCI/初始化/槽态/映射逐条对页）；
//   状态图按 §4.5.3.2–4.5.3.6 p86–89 文字逐边重构（对照 Figure 4-2 p85 五态名与 large bubble 原注）；
//   Configured→Addressed 取 DC=‘1’（§4.6.6 p102 · Table 6-64 p451；§4.5.3.6 p89 印刷 DC=‘0’ 为矛盾值，
//   与 §4.5.3.5 p88「DC=‘1’ 才按 No Op 保持 Addressed」冲突——取值理由登记 EVIDENCE.md）。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";
import * as k from "/Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs";
import { zoomBarHtml, zoomFsCss, zoomFsScript } from "../../shared/zoomfs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------- 槽状态机静态 SVG（Figure 4-2 复刻；坐标核算表见 EVIDENCE.md） ----------
const BOX_W = 150, BOX_H = 64;
const BOXES = [
  { id: "disabled",   name: "Disabled",   zh: "已禁用",          x: 65,   y: 298 },
  { id: "enabled",    name: "Enabled",    zh: "已分配（逻辑态）", x: 345,  y: 298 },
  { id: "default",    name: "Default",    zh: "默认态",          x: 485,  y: 88 },
  { id: "addressed",  name: "Addressed",  zh: "已编址",          x: 825,  y: 88 },
  { id: "configured", name: "Configured", zh: "已配置",          x: 1165, y: 88 },
];
// 每条边：d=路径（端点全部精确落在盒边线上，±0px），labels=[text, x, y, cls, anchor]
const EDGES = [
  { d: "M215,330 L345,330", labels: [
    ["Enable Slot 成功", 280, 314, "st-cmd", "middle"], ["p86", 280, 352, "st-pg", "middle"]] },
  { d: "M420,298 L420,238 L505,238 L505,152", labels: [
    ["Address Device", 432, 206, "st-cmd", "start"], ["成功 · BSR=1", 432, 224, "st-cond", "start"],
    ["p87", 515, 172, "st-pg", "start"]] },
  { d: "M470,298 L470,272 L860,272 L860,152", labels: [
    ["Address Device 成功", 650, 256, "st-cmd", "middle"], ["BSR=0", 650, 290, "st-cond", "middle"],
    ["p87", 875, 172, "st-pg", "start"]] },
  { d: "M635,126 L825,126", labels: [
    ["Address Device 成功", 730, 100, "st-cmd", "middle"], ["BSR=0", 730, 116, "st-cond", "middle"],
    ["p87", 730, 146, "st-pg", "middle"]] },
  { d: "M975,126 L1165,126", labels: [
    ["Configure Endpoint 成功", 1070, 100, "st-cmd", "middle"], ["DC=0", 1070, 116, "st-cond", "middle"],
    ["p88", 1070, 146, "st-pg", "middle"]] },
  { d: "M1240,152 L1240,200 L940,200 L940,152", labels: [
    ["Configure Endpoint", 1090, 188, "st-cmd", "middle"], ["DC=1 · deconfigure · p89", 1090, 220, "st-cond", "middle"]] },
  { d: "M1240,88 L1240,52 L560,52 L560,88", labels: [
    ["自 Addressed / Configured · p88–89", 900, 24, "st-cond", "middle"], ["Reset Device 成功", 900, 40, "st-cmd", "middle"]] },
  { d: "M1290,152 L1290,395 L140,395 L140,362", labels: [
    ["Disable Slot Command 成功", 715, 383, "st-cmd", "middle"],
    ["（Enabled / Default / Addressed / Configured 任一态）· p85–89", 715, 417, "st-cond", "middle"]] },
];

function stateSvg() {
  const defs = `<defs><marker id="st-mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="st-mk-fill"/></marker></defs>`;
  const edges = EDGES.map((e) =>
    `<path d="${e.d}" class="st-edge" marker-end="url(#st-mk)"/>` +
    e.labels.map(([t, x, y, cls, anch]) =>
      `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anch}">${esc(t)}</text>`).join("")
  ).join("");
  const boxes = BOXES.map((b) => `
  <g class="st-box st-${b.id}">
    <rect x="${b.x}" y="${b.y}" width="${BOX_W}" height="${BOX_H}" rx="10"/>
    <text x="${b.x + BOX_W / 2}" y="${b.y + 26}" class="st-name">${b.name}</text>
    <text x="${b.x + BOX_W / 2}" y="${b.y + 48}" class="st-zh">${b.zh}</text>
  </g>`).join("");
  return k.figureSvg({
    width: 1360, height: 440,
    label: "槽状态机：Disabled / Enabled / Default / Addressed / Configured 五态与命令迁移（xHCI 1.2b Figure 4-2 p85 对照）",
    body: defs + edges + boxes,
  });
}

const stateCardHtml = `
${k.plateHtml({
  fig: "Fig 4.5",
  title: "槽状态机：五态与命令迁移",
  hint: "静态状态图 · 可放大可全屏",
  readout: "",
  keys: [],
  caption: "迁移由命令成功完成驱动；大泡=Disable Slot 从四个非 Disabled 态任一进入 Disabled（Figure 4-2 p85 原注）。",
  body: `<div class="iso-stage" tabindex="0" role="group" aria-label="槽状态机状态图：五态与命令迁移">${stateSvg()}</div>` +
    zoomBarHtml("放大看框内文字 / 全屏后滚轮上下看 · 键盘 + − 0 F 缩放全屏"),
})}
<p>读图注记（判据逐条对页）：</p>
<ul>
<li>迁移判据=命令<b>成功完成</b>；命令不成功完成不迁移（p85 Note）。</li>
<li><b>Disable Slot 大泡</b>：Enabled / Default / Addressed / Configured 四态任一都可因 Disable Slot 命令进入 Disabled——对应 Figure 4-2 的 large bubble 原注（p85），逐态原文见 p86–89。</li>
<li><b>保持原态未画自环</b>：Default 态——Evaluate Context / Reset Endpoint / Stop Endpoint / Set TR Dequeue Pointer 完成后仍 Default（p87）；Addressed 态——Evaluate Context / Stop Endpoint / Set TR Dequeue Pointer 仍 Addressed（p88），Configure Endpoint(DC=‘1’) 在此态按 No Op 处理（p88）；Configured 态——Evaluate Context / Configure Endpoint / Reset Endpoint / Stop Endpoint / Negotiate Bandwidth / Set TR Dequeue Pointer 仍 Configured（p89）。</li>
<li><b>Reset Device 合并边</b>：Addressed→Default（p88）与 Configured→Default（p89）条件相同，合并为一条、标注两来源。</li>
<li><b>Configured→Addressed 取 DC=‘1’</b>：§4.6.6 p102「Deconfigure (DC) = ‘1’ … transition the Device Slot from the Configured to the Addressed state」，§6.4.3.5 Table 6-64（p451）TRB 位定义同为 ‘1’=deconfigure；§4.5.3.6 p89 印刷作「(DC = ‘0’)」，与 §4.5.3.5 p88（DC=‘1’ 才按 No Op 保持 Addressed）矛盾——本页按 DC=‘1’ 取值。</li>
<li>同页配套纪律：同一时刻只允许一个槽处于 Default（p85/p87 Note）；输出 Slot Context 初值 Disabled(‘0’) 由软件写，此后 Slot State 字段归 xHC 维护（p85 Note）。</li>
</ul>`;

const cfg = {
  theme: THEME,
  pageTitle: "§4.5 设备槽管理 · xHCI 规范对照学习",
  navTitle: "§4.5 设备槽管理",
  specRef: "xHCI 1.2b §4.5 Device Slot Management · p81–90 · 状态图对照 Figure 4-2 p85 · 请求映射 §4.5.4 p89–90",
  prevHref: "../4.4-device-detach/index.html", prevLabel: "§4.4 设备拔出",
  nextHref: "", nextLabel: "",
  prose: [
    "每台挂在 xHC 上的 USB 设备占用一个设备槽（Device Slot）；xHCI 最多支持 255 台——不是 256，架构保留了一部分槽位挪作他用（脚注 11：虚拟化场景下分给某个 VF 的槽，对其它 VF 就显示为保留，p81）。一个槽由三件套组成：<b>DCBAA 表项</b>（64-bit 指针，指向该槽 Device Context 的基地址）、<b>Device Context 数据结构</b>、<b>Doorbell Array 里的槽门铃寄存器</b>。Slot ID 是访问三件套的统一索引：软件（规范原文称 system software，系统软件）拿它查 DCBAA 取回上下文指针，也拿它选中该槽的门铃寄存器。",
    "<b>Device Context 是 32 个 context 的数组</b>（Figure 4-1，p82）：DCI 0 = Slot Context（管整台设备与全部端点共享的属性），DCI 1–31 = Endpoint Context——DCI 1 恒为 Default Control Endpoint（EP0），其余按 §4.5.1 公式编（Control 端点=端点号×2+1；Isoch/Interrupt/Bulk OUT=×2、IN=×2+1）。内存里从 000h 起每项 20h 连续排布，3E0h（DCI 31）之后 400h 到页尾保留。软件分配 Device Context 时把所有字段清 ‘0’；往输入 Slot Context 里填字段则按命令各有一份例外清单（§4.5.2）：Address Device 要填 Route String、Root Hub Port Number、Context Entries=‘1’ 等，其中 Route String 与 Root Hub Port Number 只认第一次 Address Device，此后其它命令不得改（p84 Note）。",
    "<b>槽状态是本节的主轴</b>：Slot State 五态 Disabled / Enabled / Default / Addressed / Configured，迁移一律由命令的<b>成功完成</b>驱动——命令失败不迁移（p85 Note）。三个易踩的暗桩：① Enabled 是 xHC 内部的逻辑态，Slot Context 的 Slot State 字段没有它的编码——字段值 ‘0’ 同时承载 Disabled 与 Enabled（p87 Note · Table 4-1）；② 同一时刻只允许一个槽处于 Default 态，否则行为未定义（p85/p87 Note）；③ 门铃解锁跟状态走：Disabled/Enabled 态门铃不可写（p86–87），Default/Addressed 态只为 Control EP0 开，Configured 态才对全部已启用端点开（p87–88）。",
  ],
  quotes: [
    { en: "Each xHC Device Slot is comprised of 3 major components: an entry in the Device Context Base Address Array, a Device Context data structure, and a Doorbell Register in the Doorbell Array.",
      zh: "三件套=DCBAA 表项 + Device Context + 槽门铃寄存器——本节全部内容的骨架。",
      src: "xHCI 1.2b §4.5 p81" },
    { en: "The Device Context is organized as an array of 32 context data structures, consisting of 1 Slot Context and 31 Endpoint Context data structures.",
      zh: "32 = 1 个 Slot Context + 31 个 Endpoint Context——DCI 0–31 的来历。",
      src: "xHCI 1.2b §4.5 p82" },
    { en: "Note: A Device Slot may be referred to as “enabled” if it is not in the Disabled state.",
      zh: "「enabled」槽=非 Disabled 态——Enabled 逻辑态也算「enabled」，这个术语歧义是 §4.5.3 的头号暗桩。",
      src: "xHCI 1.2b §4.5.3 p85" },
    { en: "When in the Enabled state, the slot shall transition to the Addressed state due to the successful completion of an Address Device Command with the Block Set Address Request (BSR) flag cleared to ‘0’.",
      zh: "BSR=‘0’ 的 Address Device 成功完成 → 槽 Enabled→Addressed——主线编址路径。",
      src: "xHCI 1.2b §4.5.3.3 p87" },
    { en: "For a USB device to be successfully configured with new endpoint settings, system software shall complete a successful Configure Endpoint command to the xHC and a successful SET_CONFIGURATION request to a device. Undefined results may occur otherwise.",
      zh: "配置双操作：Configure Endpoint 命令与 SET_CONFIGURATION 请求都成功才算配置——缺一不可。",
      src: "xHCI 1.2b §4.5.4.2 p89" },
  ],
  cards: [
    { h2: "§4.5 三组件：DCBAA 表项 / Device Context / 槽门铃",
      html: `<table class="xsp-tb">
<tr><th>组件</th><th>职责</th><th>关键属性</th><th>页</th></tr>
<tr><td><b>Slot ID</b>（索引）</td><td>访问三件套的统一下标：查 DCBAA 取 Device Context 指针、选中槽门铃</td><td>由枚举流程分配（§4.3.2）</td><td class="mono">p81–82</td></tr>
<tr><td><b>DCBAA 表项</b></td><td>64-bit 指针 → 该槽 Device Context 基地址</td><td>数组最多 255 项可用（架构保留部分槽位，脚注 11）；指针有效性跟槽态走（Table 4-1：Disabled/Enabled 态 Not valid）</td><td class="mono">p81 · p85–86</td></tr>
<tr><td><b>Device Context</b></td><td>描述整台设备的特征与当前状态</td><td>32 个 context = 1 Slot Context + 31 Endpoint Context；软件分配时全字段清 ‘0’；结构细节归 §6.2.1</td><td class="mono">p82</td></tr>
<tr><td><b>槽门铃寄存器</b></td><td>软件通知 xHC「该槽有新工作」——DB Target + DB Stream ID 说明响铃目的</td><td>每 Slot 一个 32-bit 寄存器，按 Slot ID 索引；Disabled 态禁写（p86）、Enabled 态未使能（p86–87）；门铃 0 是命令门铃（Host Controller Doorbell，p83）</td><td class="mono">p82–83 · p86–87</td></tr>
</table>` },
    { h2: "§4.5.1–4.5.2 Device Context 布局、DCI 编号与输入 Slot Context 初始化",
      html: `<p>Device Context 内存布局（Figure 4-1，p82）：DCI 0 的 Slot Context 在 000h，之后每个 context 占 20h——DCI 30/31（EP15 OUT/IN）落在 3C0h/3E0h，400h 到 Page Size-1 保留。Endpoint Context 0 恒为设备的 Default Control Endpoint（p82）；某配置下哪些 Endpoint Context「enabled」由 Class Driver 选定的 Configuration 决定（p82，脚注 12：不在 Disabled 态即算 enabled）。</p>
<table class="xsp-tb">
<tr><th>Context</th><th>DCI 规则（§4.5.1 p83）</th><th>示例（Figure 4-1 p82）</th></tr>
<tr><td>Slot Context</td><td>DCI = 0</td><td>000h · DCI 0</td></tr>
<tr><td>Control 型端点（含 EP0）</td><td class="mono">DCI = 端点号×2 + 1</td><td>EP0 → DCI 1（020h）</td></tr>
<tr><td>Isoch / Interrupt / Bulk OUT</td><td class="mono">DCI = 端点号×2 + 0</td><td>EP1 OUT → DCI 2（040h）· EP15 OUT → DCI 30（3C0h）</td></tr>
<tr><td>Isoch / Interrupt / Bulk IN</td><td class="mono">DCI = 端点号×2 + 1</td><td>EP1 IN → DCI 3（060h）· EP15 IN → DCI 31（3E0h）</td></tr>
</table>
<p>输入 Slot Context 初始化例外清单（§4.5.2 p83–84，默认全 ‘0’ 只填例外）：<b>Address Device</b>——Route String、Root Hub Port Number（拓扑定）、Context Entries=‘1’、Interrupter Target、Speed（由所挂下游端口定）；LS/FS 设备经 HS hub 访问时另填 MTT / Parent Port Number / Parent Hub Slot ID（p83）。<b>Evaluate Context</b>——Max Exit Latency、Interrupter Target（p84）。<b>Configure Endpoint</b>——Context Entries=最大 DCI+1；hub 设备另填 Hub / Number of Ports / TTT / MTT（p84）。Route String 与 Root Hub Port Number 由第一次 Address Device 定值，此后其它命令不得修改（p84 Note）。</p>` },
    { h2: "§4.5.3 槽状态机（状态图）",
      html: stateCardHtml },
    { h2: "§4.5.3.1 Table 4-1 槽状态编码与逐态语义",
      html: `<table class="xsp-tb">
<tr><th>槽状态</th><th>USB 设备态</th><th>Default Control EP</th><th>其它 EP</th><th>USB 设备地址</th><th>DCBAA 指针</th><th>Slot State 字段值</th></tr>
<tr><td><b>Disabled</b></td><td>N/A</td><td>Disabled</td><td>Disabled</td><td>N/A</td><td>Not valid</td><td>Disabled</td></tr>
<tr><td><b>Enabled</b></td><td>Default</td><td>Disabled</td><td>Disabled</td><td>‘0’</td><td>Not valid</td><td>Disabled（‘0’ 双载）</td></tr>
<tr><td><b>Default</b></td><td>Default</td><td>Not Disabled</td><td>Disabled</td><td>‘0’</td><td>Valid</td><td>Default</td></tr>
<tr><td><b>Addressed</b></td><td>Address</td><td>Not Disabled</td><td>Disabled</td><td>Assigned</td><td>Valid</td><td>Addressed</td></tr>
<tr><td><b>Configured</b></td><td>Configured</td><td>Not Disabled</td><td>Any</td><td>Assigned</td><td>Valid</td><td>Configured</td></tr>
</table>
<p>（Table 4-1 p85–86；数值编码见 Table 6-7，p86；脚注 13：非 Default Control 端点是否 Disabled 由 Configure Endpoint Command 决定，p86。Enabled 行的 Slot State 字段值仍是 Disabled——‘0’ 双载，见状态卡注记。）</p>
<table class="xsp-tb">
<tr><th>槽状态</th><th>软件允许发的命令</th><th>门铃使能范围</th><th>进入该态时 xHC 的动作</th></tr>
<tr><td>Disabled</td><td>仅 Enable Slot</td><td>门铃禁用；槽不产生事件</td><td>若 Output Slot Context 有效，Disable Slot 完成时置 Slot State=Disabled</td></tr>
<tr><td>Enabled</td><td>仅 Address Device / Disable Slot</td><td>未使能（禁写）</td><td>—（Slot State 字段保持 ‘0’）</td></tr>
<tr><td>Default</td><td>Address Device(BSR=‘0’) / Reset Endpoint / Stop Endpoint / Evaluate Context / Set TR Dequeue Pointer / Disable Slot</td><td>仅 DB Target=Control EP0</td><td>置 Slot State=Default 且 USB Device Address=‘0’</td></tr>
<tr><td>Addressed</td><td>Evaluate Context / Configure Endpoint / Reset Endpoint / Stop Endpoint / Negotiate Bandwidth / Set TR Dequeue Pointer / Reset Device / Disable Slot</td><td>仅 DB Target=Control EP0</td><td>置 Slot State=Addressed</td></tr>
<tr><td>Configured</td><td>Configure Endpoint(DC=‘0’/‘1’) / Reset Endpoint / Stop Endpoint / Set TR Dequeue Pointer / Evaluate Context / Reset Device / Negotiate Bandwidth / Disable Slot</td><td>Control EP0 ＋ 任何已启用端点</td><td>置 Slot State=Configured</td></tr>
</table>
<p>（§4.5.3.2–4.5.3.6 逐态原文：Disabled p86 · Enabled p86–87 · Default p87 · Addressed p88 · Configured p88–89。）</p>` },
    { h2: "§4.5.4 USB 标准设备请求 → xHCI 命令映射",
      html: `<table class="xsp-tb">
<tr><th>USB 标准设备请求</th><th>对应的 xHCI 侧动作</th><th>规范要点</th><th>页</th></tr>
<tr><td><b>SET_ADDRESS</b>（bRequest=5h，bmRequestType=0h）</td><td>Address Device Command（BSR=‘0’）——xHC 自动代发</td><td>地址取自 Output Slot Context 的 USB Device Address；软件自发 SET_ADDRESS 不产生总线 Setup 事务、以 TRB Error 完成码结束</td><td class="mono">§4.5.4.1 p89</td></tr>
<tr><td><b>SET_CONFIGURATION</b>（wValue≠‘0’）</td><td>Configure Endpoint Command ＋ SET_CONFIGURATION 请求（双操作）</td><td>两操作都成功才算配置成功，否则未定义结果；不改变任何 Endpoint Context 参数时 Configure Endpoint 可省（Note）</td><td class="mono">§4.5.4.2 p89</td></tr>
<tr><td><b>SET_CONFIGURATION</b>（wValue=‘0’，deconfigure）</td><td>Configure Endpoint（Drop Context 全 ‘1’、Add Context 全 ‘0’；等价 DC=‘1’ 形态见 §4.6.6 p102）＋ SET_CONFIGURATION(‘0’)</td><td>两操作都完成后设备才 deconfigured</td><td class="mono">§4.5.4.2 p89</td></tr>
<tr><td><b>SET_INTERFACE</b></td><td>Configure Endpoint Command ＋ SET_INTERFACE 请求（双操作）</td><td>同样缺一不可；不改变 Endpoint Context 参数时 Configure Endpoint 可省（Note）</td><td class="mono">§4.5.4.3 p90</td></tr>
<tr><td><b>GET_DESCRIPTOR</b>（Device 前 8 字节，仅 FS 设备）</td><td>Evaluate Context Command（A1=‘1’）</td><td>§4.5.4 清单外：映射叙述在 §4.3 步 7a.x——读到 wMaxPacketSize 后更新 EP0 Context 的 Max Packet Size，并用 Evaluate Context 告知 xHC</td><td class="mono">§4.3 p74</td></tr>
</table>
<p>注：§4.5.4 开头说明——Standard Device Requests 经 Default Control Endpoint 上的 Setup Stage TD 发给设备（p89）；本表前三行按 §4.5.4 三个小节逐行核对，GET_DESCRIPTOR 行为 §4.3 的补充映射、非 §4.5.4 原文清单。</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——本节状态机的第一次完整走查（取槽 → Default → Addressed → Configured）；<a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——Disable Slot 还槽：四态任一退回 Disabled 的真实触发。</p>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——状态迁移的投递模型（命令环＋门铃 0＋完成事件）；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——DB Target 编号展开。</p>
<p><a href="../../index.html">§4.6 命令接口（待建）</a>——各命令逐条展开（含 §4.6.6 Configure Endpoint 的 DC=‘1’ 语义）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.5 p81–90 · 状态图对照 Figure 4.2 p85 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
// 状态图 SVG 样式 + zoomfs 三件套注入（table_page.mjs 为静态表格节无 zoomfs——本节状态图卡需要，
// _gen/ 未改，样式与脚本以 body 尾注入；--font-ui/--font-mono 由 table_page 的 :root 提供）
const ST_CSS = `
.st-box rect { fill: var(--anatomy-face, #1b1b1b); stroke: var(--anatomy-hi, #556); stroke-width: 1.8; }
.st-name { font: 700 17px var(--font-ui); fill: var(--anatomy-strong); text-anchor: middle; }
.st-zh { font: 500 14px var(--font-ui); fill: var(--anatomy-text); text-anchor: middle; }
.st-edge { stroke: var(--anatomy-blue, #6b9bff); stroke-width: 2; fill: none; }
.st-mk-fill { fill: var(--anatomy-blue, #6b9bff); }
.st-cmd { font: 500 14px var(--font-ui); fill: var(--anatomy-text); }
.st-cond { font: 500 13.5px var(--font-mono); fill: var(--anatomy-text); }
.st-pg { font: 400 12.5px var(--font-mono); fill: var(--anatomy-muted); }
.iso[data-theme="light"] .st-pg { fill: #6b6350; }
`;
const inject = `<style>${zoomFsCss()}${ST_CSS}</style><script>${zoomFsScript({ focus: [".st-enabled"] })}</script>`;
const out = page.replace("</body>", inject + "</body>");
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), out);
console.log("wrote", name, (out.length / 1024).toFixed(0) + " KB");
