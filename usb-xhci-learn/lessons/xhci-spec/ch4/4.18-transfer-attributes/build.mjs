// §4.18 传输定义与属性 —— 表格节（table_page.mjs 量产件 #4；主体=Table 4-11）
// 判据：xHCI 1.2b §4.18 p270–272（引文三条逐字；Table 4-11 逐行转写 p270–271）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.18 传输定义与属性 · xHCI 规范对照学习",
  navTitle: "§4.18 传输定义与属性",
  specRef: "xHCI 1.2b §4.18 Transfer Definition and Attributes · p270–272 · Table 4-11 xHC Traffic Attributes",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "本节定义 xHC 发起的 PCIe 事务带哪些<b>请求者属性</b>——No Snoop（NS，不强制缓存一致性嗅探）与 Relaxed Ordering（RO，允许乱序）。前提：PCIe 能力结构的 Enable No Snoop 位已置 1（Table 7-12 位 11，§5.2.8）；即便如此 xHC 也只在<b>能保证地址不在任何缓存里</b>时才许置 NS——不是全部事务都 NS。",
    "软件可以逐 TRB 控制：传输 TRB 的 <b>No Snoop (NS) 标志</b>（Table 4-11 中 IN/OUT 数据行的动态开关）。两类例外不许 NS：MSI 中断的内存写与消息请求（除特别允许处）。Table 4-11 是<b>推荐</b>行为——实现可以自选其它设置。",
  ],
  quotes: [
    { en: "If Enabled in the PCI Express Capability Structure and directed by software in (for example, TRB No Snoop (NS) flag is set to ‘1’), then the xHC may set the No Snoop bit in the Requester Attributes of PCIe transactions it initiates that do not require hardware enforced cache coherency.",
      zh: "NS 的三重前提：Enable No Snoop 已置 + 软件经 TRB NS 标志指示 + 事务不需硬件强制缓存一致性。",
      src: "xHCI 1.2b §4.18.2 p270" },
    { en: "The xHC shall not assert the No Snoop attribute on PCIe transactions for memory requests that are Message Signaled Interrupts, and Message Requests (except where specifically permitted).",
      zh: "MSI 中断与消息请求不许 NS——中断路径不进这个优化。",
      src: "xHCI 1.2b §4.18.1 p270" },
    { en: "The Scratchpad Buffer Array and the Scratchpad Buffers that it references are exclusively owned by the xHC.",
      zh: "scratchpad 归 xHC 独占（§4.20 的「只买单不窥探」在 PCIe 属性上的落点=NS）。",
      src: "xHCI 1.2b §4.18.2.2 p271" },
  ],
  cards: [
    { h2: "Table 4-11：xHC 流量属性（推荐行为，逐行转写）",
      html: `<table class="xsp-tb">
<tr><th>传输类型</th><th>No Snoop</th><th>Relaxed Ordering</th><th>备注</th></tr>
<tr><td>TRB Read</td><td class="mono">N</td><td class="mono">Y</td><td>命令、传输 IN 或 OUT</td></tr>
<tr><td>IN Data Write · TRB NS=1</td><td class="mono">Y</td><td class="mono">N</td><td rowspan="2">嗅探由传输 TRB 的 NS 标志动态控制</td></tr>
<tr><td>IN Data Write · TRB NS=0</td><td class="mono">N</td><td class="mono">N</td></tr>
<tr><td>OUT Data Read · TRB NS=1</td><td class="mono">Y</td><td class="mono">Y</td><td rowspan="2">嗅探由传输 TRB 的 NS 标志动态控制</td></tr>
<tr><td>OUT Data Read · TRB NS=0</td><td class="mono">N</td><td class="mono">Y</td></tr>
<tr><td>Command Data Write</td><td class="mono">N</td><td class="mono">N</td><td>例：端口带宽上下文</td></tr>
<tr><td>TRB Write</td><td class="mono">N</td><td class="mono">N</td><td></td></tr>
<tr><td>Events</td><td class="mono">N</td><td class="mono">N</td><td></td></tr>
<tr><td>Context Read</td><td class="mono">N</td><td class="mono">Y</td><td>任何上下文读，含 Opaque 区</td></tr>
<tr><td>Context Write</td><td class="mono">N</td><td class="mono">N</td><td>任何上下文写，含 Opaque 区</td></tr>
<tr><td>Opaque Read</td><td class="mono">Y</td><td class="mono">Y</td><td>Scratchpad Opaque 区读</td></tr>
<tr><td>Opaque Write</td><td class="mono">Y</td><td class="mono">N</td><td>Scratchpad Opaque 区写</td></tr>
</table>
<p>「N」=该请求者属性不置位；「Y」=置位（p271 Note）。RO 属性细节归 PCIe 规范 §2.2.6.4/§2.4。</p>` },
    { h2: "NS 的两个专项（4.18.2.1 / 4.18.2.2）",
      html: `<table class="xsp-tb">
<tr><th>小节</th><th>规则</th><th>页</th></tr>
<tr><td><b>4.18.2.1 payload 的 NS 选项</b></td><td>软件知道「CPU 自上次 xHC 持有后未碰过这缓冲」时可置 IN TRB 的 NS 位——xHC 写该缓冲时走 no-snoop DMA（典型：应用缓冲由 xHC DMA 引擎填过）</td><td class="mono">p271</td></tr>
<tr><td><b>4.18.2.2 Scratchpad 引用的 NS</b></td><td>scratchpad 数组与缓冲归 xHC 独占——xHC 访问它们应走 no-snoop DMA，省掉不必要的总线嗅探</td><td class="mono">p271–272</td></tr>
</table>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.20-scratchpad-buffers/index.html">§4.20 暂存缓冲区</a>——Opaque 区的归属与 NS 的落点；<a href="../4.21-pci-express/index.html">§4.21 PCI Express</a>——PCIe 配置空间里的 Enable No Snoop 位语境。</p>
<p><a href="../../index.html">§5.2.8 PCIe 能力结构（第 5 章后续扩展）</a>——Table 7-12 位 11。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.18 p270–272 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
