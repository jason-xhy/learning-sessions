// §4.25 USB VTIO —— 表格节（table_page.mjs 量产件 #3）
// 判据：xHCI 1.2b §4.25 p331–334（引文四条逐字）；xHCI-IOV 区分 p332
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.25 USB VTIO · xHCI 规范对照学习",
  navTitle: "§4.25 基于 USB 虚拟化的可信 IO 管理（USB VTIO）",
  specRef: "xHCI 1.2b §4.25 USB Virtualization Based Trusted IO Management · p331–334",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "USB VTIO 是<b>可选</b>能力：给 xHCI 定义的各种内存结构与消息建立「多软件/硬件所有者与访问模型」。PCI 形态的 xHC 用 PCI 总线/设备/功能号（BDF）当请求者身份——枚举时锁存的 Primary DMA-ID；VTIO 在它之外再要求一个<b>备用 DMA-ID</b>（全系统唯一、不经标准枚举发现，经 PCI 厂商自定义方法+VTIO 能力寄存器向 OS 披露），用于区分「可信/非可信设备」的内存访问。",
    "VTIO 依赖能按 PCI function 隔离内存访问的基础设施（实现细节不在本规范内；例：Intel VT-d）。硬件隔离的配套纪律：不同 DMA-ID 的内存结构<b>不得共用同一页</b>（按 PAGESIZE 寄存器口径）。注意与 xHCI 扩展能力里的 <b>xHCI-IOV</b> 是两回事——用 xHCI-IOV 就必须关 VTIO；单一 DMA-ID 模式也合法（两个 ID 任选其一独占使用）。",
    "PCI 资源重平衡可能改变分配给 xHC 的 DMA-ID——软件应保证重平衡后先做主机控制器复位，再按需重写 VTIO 分配寄存器。",
  ],
  quotes: [
    { en: "XHCI VTIO calls for an alternate DMA-ID (in addition to the primary DMA-ID) to be assigned for use by a USB Controller.",
      zh: "VTIO 的核心动作：在 Primary DMA-ID 之外给 USB 控制器配一个备用 DMA-ID。",
      src: "xHCI 1.2b §4.25 p331" },
    { en: "The USB VTIO capability should not be confused or conflated with the xHCI-IOV capability defined in the xHCI Extended Capabilities. These are two distinct capabilities meant for different applications. The usage of xHCI-IOV requires that USB VTIO will be disabled.",
      zh: "VTIO 与 xHCI-IOV 是两种不同能力——用 IOV 就必须关 VTIO。",
      src: "xHCI 1.2b §4.25 p332" },
    { en: "XHCI SW should guarantee that a Host Controller Reset is issued following such rebalance and re-initialize the VTIO assignment registers as needed.",
      zh: "DMA-ID 因重平衡而变：先主机控制器复位，再重配 VTIO 分配寄存器。",
      src: "xHCI 1.2b §4.25.1.1 p333" },
    { en: "To further facilitate hardware isolation SW should ensure that structures in memory corresponding to different DMA-ID’s do not share the same page as defined by the PAGESIZE field in the Page Size Register.",
      zh: "隔离的页级纪律：不同 DMA-ID 的结构不共用同一页。",
      src: "xHCI 1.2b §4.25 p331" },
  ],
  cards: [
    { h2: "4.25.1.1 受备用 DMA-ID 管的结构与粒度",
      html: `<table class="xsp-tb">
<tr><th>结构</th><th>分配粒度</th></tr>
<tr><td>Device Context Base Address Array / Input Control Context / 命令环及段 / 事件环段表及段 / Scratchpad 数组及缓冲 / 端口带宽上下文 / 扩展属性上下文</td><td><b>每 xHC 一份</b></td></tr>
<tr><td>Device Context（输出设备上下文）</td><td><b>每设备</b></td></tr>
<tr><td>传输环及段、数据缓冲；流上下文及数组</td><td><b>每端点</b></td></tr>
<tr><td>事件环段表及段（按中断器计）</td><td><b>每中断器</b></td></tr>
</table>
<p>VTIO 寄存器定义「硬件访问上述结构时用哪个 DMA-ID」；第 6 章数据结构定义本身零改动（p332）。调试能力（DBC）的内存结构不逐结构分配——整体归入单一控制（p333）。</p>` },
    { h2: "4.25.2 DMA-ID 分配管理：四类粒度",
      html: `<table class="xsp-tb">
<tr><th>类别</th><th>例</th></tr>
<tr><td>每控制器单结构</td><td class="mono">命令环 · Input Context · DCBAA · Scratchpad</td></tr>
<tr><td>每设备单结构</td><td class="mono">Device Context</td></tr>
<tr><td>每端点单结构</td><td class="mono">传输环/数据缓冲 · 流上下文数组</td></tr>
<tr><td>每中断器单结构</td><td class="mono">事件环段表/段</td></tr>
</table>
<p>前提：任何结构的 DMA-ID 映射必须在<b>硬件启用访问它之前</b>设好（p333）。可信流的识别由软件负责（板载设备走 BIOS 指认；即插即用设备按 VID/PID 白名单，p332）。</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.20-scratchpad-buffers/index.html">§4.20 暂存缓冲区</a>——PAGESIZE 口径（VTIO 页隔离与其同源）；<a href="../4.13-device-notifications/index.html">§4.13 设备通知</a>——同为「按位/按类」的控制寄存器形态。</p>
<p><a href="../../index.html">§4.22.3 虚拟化（已建）</a>——虚拟化的运行模型；xHCI-IOV 归扩展能力章（第 7 章后续扩展）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.25 p331–334 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
