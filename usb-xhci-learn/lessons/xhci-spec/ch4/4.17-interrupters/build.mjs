// §4.17 中断器 —— 泳道节（生成器 lane_page.mjs 量产件 #7；泳道互链 fig3）
// 判据：xHCI 1.2b §4.17 p261–269（引文四条逐字）；节流流程 Figure 4-22/4-23/4-24 p264–267
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.17 中断器 · xHCI 规范对照学习",
  navTitle: "§4.17 中断器",
  specRef: "xHCI 1.2b §4.17 Interrupters · p261–269 · 节流寄存器 §5.5.2",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "<b>中断器</b>（Interrupter）管理事件与它们对宿主的通知：xHCI 支持最多 <b>1024</b> 个（HCSPARAMS1 的 MaxIntrs 定实现数，至少 1 个）。每个中断器 = 1 个中断器管理寄存器（IMAN）+ 1 个节流寄存器（IMOD）+ 1 条事件环，并且必须映射到<b>单个</b> MSI 或 MSI-X 中断向量。总开关是 USBCMD 的 <b>INTE</b> 位。",
    "节流（§4.17.2）：中断要同时满足三条件——节流计数 IMODC 减到 0、Interrupt Pending Enable（IPE）=1、事件处理器不忙（EHB=0）。重负载时中断被合并（IMODI 默认 4000≈1ms，建议范围 651–5580）；轻负载时计数停在 0、事件一来立即中断（Figure 4-22/4-23/4-24）。",
    "事件进哪个中断器由 <b>Interrupter Target</b> 字段决定（Transfer TRB 或 Slot Context，§4.17.1/§4.17.4）；不支持映射时该字段被忽略、全部进中断器 0。注意：规范<b>不保证跨事件环的事件顺序</b>。",
  ],
  quotes: [
    { en: "An Interrupter manages events and their notification to the host. The xHCI supports up to 1024 Interrupters.",
      zh: "中断器=事件到宿主通知的管理单位，上限 1024 个。",
      src: "xHCI 1.2b §4.17 p261" },
    { en: "Each Interrupter shall be mapped to a single MSI or MSI-X interrupt vector.",
      zh: "每个中断器绑定单个 MSI/MSI-X 向量——多对一不合法。",
      src: "xHCI 1.2b §4.17 p261" },
    { en: "The xHC is not required to maintain event ordering across Event Rings.",
      zh: "跨事件环不保序：顺序产生的事件落不同环可乱序到达——软件别做顺序假设。",
      src: "xHCI 1.2b §4.17 p262 Note" },
    { en: "If Interrupter Mapping is not supported, the Interrupter Target field shall be ignored by the xHC and all Events targeted at Interrupter 0.",
      zh: "不支持映射的实现：Target 字段忽略、事件全进中断器 0。",
      src: "xHCI 1.2b §4.17.1 p263" },
  ],
  figNo: "Fig 4.17",
  figTitle: "从事件环到中断向量：一个中断器的全程",
  figCaption: "事件落环→三条件放行（IMODC/IPE/EHB）→按 PCI 机制发通知；跨环不保序是软件必须记住的坑。",
  figAria: "中断器三方时序图：事件入环、节流放行、PCI 通知与 ISR 消费",
  tourNarr: "总览模式：完整流程图。设备泳道不参与——中断是 xHC 与软件之间的信令。",
  steps: [
    { kind: "box", at: "hc", lines: ["事件 TRB 写入中断器的事件环", "（每中断器=IMAN+IMOD+一条事件环）"], pg: "p261",
      narr: "事件去向由 Transfer TRB / Slot Context 的 Interrupter Target 字段决定（§4.17.1）；不支持映射则全进中断器 0。" },
    { kind: "box", at: "hc", lines: ["节流放行三条件：", "IMODC 减到 0 · IPE=1 · EHB=0", "满足 → IP=1"], pg: "p264",
      narr: "Figure 4-22 流程；重负载合并中断（IMODI 默认 4000≈1ms），轻负载计数停 0、事件即到即报（p267）。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["MSI/MSI-X：PCI Dword 写", "（IP 由写完成自动清）", "INTx# 引脚：IP 软件写 IMAN 清"], pg: "p265",
      narr: "两种通知路径的清 IP 方式不同——消息中断自动清、引脚中断软件清。" },
    { kind: "box", at: "sw", lines: ["ISR：读事件环处理事件", "（EHB=高流量期可关中断批量跑）"], pg: "p264 脚注56",
      narr: "脚注 56 点破动机：高速串行每秒几千次中断说的都是同一件事「有 TRB 要处理」——EHB 让驱动在高流量时关中断省系统负载。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["PCI 三机制映射（§4.17 p261–262）：", "Pin：仅中断器 0 可用 INTx#，其余禁用", "MSI：向量=Index MOD Multiple Message Enable", "MSI-X：Index↔向量 1:1，Table Size=MaxIntrs"], pg: "p261–262",
      narr: "细节见下方表格卡；MSI 的多消息能力字段须 ≤ MaxIntrs。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["跨事件环不保序——", "顺序产生的事件可乱序到达软件"], pg: "p262 Note",
      narr: "引文③：多中断器并行是常态，软件不得假设事件环之间的时间序。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：不参与", "中断是 xHC 与软件之间的信令——", "设备只见总线上的传输本身"], pg: "p261",
      narr: "设备泳道如实保留：中断路径不经过任何 USB 传输。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（不参与）" },
    { t: "实线=事件/寄存器流 · 虚线=中断通知" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>PCI 三中断机制 × 中断器映射（§4.17 p261–262 · §4.17.3）</h2>
<table class="xsp-tb">
<tr><th>机制</th><th>中断器→向量映射</th><th>约束</th><th>IP 清除方式</th></tr>
<tr><td><b>PCI Pin（INTx#）</b></td><td>仅中断器 0 可用，其余禁用（p261–262）</td><td>PCI 只允许一 function 一引脚；MSI/MSI-X 使能时不用引脚（§4.17.3 p267）</td><td class="mono">软件写 IMAN（p265）</td></tr>
<tr><td><b>MSI</b></td><td class="mono">向量 = Index MOD Multiple Message Enable</td><td>MaxIntrs&gt;32 时 32–MaxIntrs-1 禁用；Multiple Message Capable ≤ MaxIntrs（p262）</td><td class="mono">PCI 写完成自动清（p265）</td></tr>
<tr><td><b>MSI-X</b></td><td>Index↔MSI-X Table 条目 <b>1:1</b>（含 PBA Pending Bit）</td><td>Table Size = MaxIntrs；按各中断器 MSI-X Enable 位分配（p262）</td><td class="mono">PCI 写完成自动清（p265）</td></tr>
</table>
<p>事件目标三来源（§4.17.4 p267–268）：固定 Primary 中断器 / Transfer TRB 的 Interrupter Target 字段 / Slot Context 的 Interrupter Target 字段——各事件 TRB（§6.4.2）规定用哪一种。</p>
</div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——中断四件（MSI-X 表/Interval/INTE/IE）装配；<a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费（本节是它的通知出口）。</p>
<p><a href="../4.13-device-notifications/index.html">§4.13 设备通知</a>——Slot Context Interrupter Target 决定事件环的实例；<a href="../../index.html">§5.5.2 中断器寄存器（第 5 章后续扩展）</a>——IMAN/IMOD/ERDP 位定义。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.17 p261–269 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
