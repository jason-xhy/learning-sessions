// §4.21 PCI Express —— 表格节（table_page.mjs 量产件 #1；表格节不做动画，DESIGN 分级）
// 判据：xHCI 1.2b §4.21 p306–307（引文三条逐字）；FSC 实现注记 p306（跨 §4.23.2 引述）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.21 PCI Express · xHCI 规范对照学习",
  navTitle: "§4.21 PCI Express",
  specRef: "xHCI 1.2b §4.21 PCI Express · p306–307 · PCIe 术语见 PCIe 规范",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "本节是 xHC 与 PCIe 总线的两个交点：<b>配置共享</b>（4.21.1）与 <b>Bus Master Enable</b>（4.21.2）。规范提醒：本节用 PCIe 术语（Physical Layer / Receiver Errors / Data Link / Transaction 层等），错误事件与配置寄存器细节归 PCIe 规范。",
    "关 Bus Master 的正确姿势是一条时序：先把 xHC <b>停机</b>（R/S=0 并确认 <b>HCH</b>=1），再清 PCI 配置空间的 <b>BME</b> 位。xHC 跑着的时候清 BME，xHC 可能把它当主机控制器错误处理——置 HCE=1 并立即停机，此后恢复要靠 <b>HCRST</b>（内部错误路径，§4.24.1）。",
  ],
  quotes: [
    { en: "The xHC should be Halted, that is, with the Run/Stop (R/S) bit set to ‘0’, and HCHalted (HCH) verified as being ‘1’ before system software disables bus master activity by clearing the BME bit.",
      zh: "先停机（R/S=0 + HCH=1 实证）再清 BME——顺序就是防错本身。",
      src: "xHCI 1.2b §4.21.2 p307" },
    { en: "If the BME bit is set to ‘0’ when the xHC is running, the xHC may treat this as a Host Controller Error, asserting HCE (‘1’) and immediately halt (R/S = ‘0’ and HCH = ‘1’). Recovery from this state will require an HCRST.",
      zh: "跑着的时候拔总线主控：xHC 可能报 HCE 并当场停机——恢复只能 HCRST。",
      src: "xHCI 1.2b §4.21.2 p307" },
    { en: "In Virtualization mode, the xHCI is designed to appear as distinct Virtual Functions, where each of the USB devices (Device Slots 0-n) may be mapped exclusively to a specific Virtual Function.",
      zh: "虚拟化模式下每台设备槽可独占地映射到某个 Virtual Function——设备到功能的映射粒度。",
      src: "xHCI 1.2b §4.21.1 p306" },
  ],
  cards: [
    { h2: "4.21.1 配置共享：Normal 与 Virtualization 两种形态",
      html: `<table class="xsp-tb">
<tr><th>形态</th><th>PCIe 呈现</th><th>设备槽归属</th><th>PCIe 设备头空间</th></tr>
<tr><td><b>Normal 模式</b></td><td>单个物理 PCIe 核心接口，所有设备槽出现在<b>单一 function</b></td><td>Device Slots 0–n 同属一个 function</td><td>xHC 自身实现（§5.2）</td></tr>
<tr><td><b>Virtualization 模式</b></td><td>呈现为多个独立 Virtual Function</td><td>每台设备（槽 0–n）可<b>独占</b>映射到特定 VF</td><td>VMM 通过仿真实现</td></tr>
</table>
<p>（§4.21.1 p306–307；两种模式的寄存器面细节归 §5.2 与第 8 章）</p>` },
    { h2: "4.21.2 Bus Master Enable：停机时序与错误分支",
      html: `<table class="xsp-tb">
<tr><th>场景</th><th>动作序列</th><th>后果</th></tr>
<tr><td>正常关总线主控</td><td>R/S=0 → 验证 HCH=1 → 清 BME</td><td>安全停机</td></tr>
<tr><td>跑着清 BME（xHC 可能判定）</td><td>HCE=1 → 立即停机（R/S=0 · HCH=1）</td><td>恢复需 <b>HCRST</b>（§4.24.1 内部错误）</td></tr>
</table>
<p>旁注（p306 实现注记，跨 §4.23.2）：FSC 能力位区分挂起流程是否需要对全部端点先发 Stop Endpoint——FSC=1 的实现只对 Running:Busy 端点要求；新实现建议支持 FSC 以兼容假定 FSC 行为的存量驱动。</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——R/S 与 HCH 的停机语义（§4.2 收尾的逆过程）；<a href="../4.20-scratchpad-buffers/index.html">§4.20 暂存缓冲区</a>——SPR 位与 Save/Restore（同为电源事件边界）。</p>
<p><a href="../../index.html">§4.24.1 内部错误（待建）</a>——HCE/HCRST 恢复路径；<a href="../../index.html">第 8 章虚拟化（后续扩展）</a>——Virtualization 模式全貌。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.21 p306–307 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
