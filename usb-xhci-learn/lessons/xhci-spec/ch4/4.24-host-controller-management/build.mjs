// §4.24 主机控制器管理 —— 表格节（table_page.mjs 量产件 #2）
// 判据：xHCI 1.2b §4.24 p327–331（引文四条逐字）；HSE 交叉 §4.10.2.6；映射描述 Appendix D
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.24 主机控制器管理 · xHCI 规范对照学习",
  navTitle: "§4.24 主机控制器管理",
  specRef: "xHCI 1.2b §4.24 Host Controller Management · p327–331 · HSE 详见 §4.10.2.6",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "主机控制器管理管两件事：<b>内部错误</b>（4.24.1）与<b>端口到连接器的映射</b>（4.24.2）。前者是 xHC 自身故障的处理协议——<b>HCE</b> 置 1 后 xHC 停止一切活动，软件的响应是 HCRST 复位并重新初始化；后者保证「用户插的口」和「软件看到的根集线器端口」之间的对应关系可管理、可描述。",
    "错误分两路上报：<b>HCE</b> 只报「只影响 xHC 自身」的内部错误（例：访问内部数据结构的 SRAM 奇偶错）；影响整个系统的错误走 <b>HSE</b>（Host System Error，§4.10.2.6）。硬错误会在重新初始化后立刻再次置 HCE——软件要有启发式判断，别让 xHC 永远陷在「错误-复位-初始化」循环里，要报告给用户。",
  ],
  quotes: [
    { en: "When the HCE flag is set to ‘1’ the xHC shall cease all activity. Software response to the assertion of HCE is to reset the xHC (HCRST = ‘1’) and reinitialize it.",
      zh: "HCE=1 即全面停车；软件的处置只有一个：HCRST 复位重来。",
      src: "xHCI 1.2b §4.24.1 p327" },
    { en: "However a hard error shall cause the xHC to reassert HCE immediately after it is reinitialized.",
      zh: "硬错误的判据：重新初始化后 HCE 立刻再亮——这种循环要被软件打断并上报。",
      src: "xHCI 1.2b §4.24.1 p327" },
    { en: "There shall be a 1:1 mapping between xHC Root Hub ports and xHC External Ports, where the Root Hub port 1 shall map to External Port 1, Root Hub port 2 shall map to External Port 2, and so on.",
      zh: "无集成集线器时：根集线器端口与外部端口一一对应，编号从 1 对齐。",
      src: "xHCI 1.2b §4.24.2.1 p328" },
    { en: "External Ports 1 and n+1 shall map to USB connector 1 to form a USB3 compatible port",
      zh: "默认映射：USB2 第 1 口与 USB3 第 1 口合体为 1 号连接器——一只 USB3 口背后是两套协议端口。",
      src: "xHCI 1.2b §4.24.2.2 p329" },
  ],
  cards: [
    { h2: "4.24.1 内部错误：HCE 的处置协议",
      html: `<table class="xsp-tb">
<tr><th>项</th><th>规范规定</th><th>页</th></tr>
<tr><td>HCE 置 1 后</td><td>xHC 停止<b>一切</b>活动</td><td class="mono">p327</td></tr>
<tr><td>软件响应</td><td>HCRST=1 复位 → 重新初始化</td><td class="mono">p327</td></tr>
<tr><td>排查建议</td><td>xHC 无响应时软件应主动查 HCE 标志</td><td class="mono">p327</td></tr>
<tr><td>软错误例</td><td>SRAM 奇偶错（复位后可恢复）</td><td class="mono">p327 Note</td></tr>
<tr><td>硬错误判据</td><td>重初始化后 HCE 立即再亮 → 软件启发式打断「错误-复位-初始化」循环并上报用户</td><td class="mono">p327 Note</td></tr>
<tr><td>系统级错误</td><td>走 <b>HSE</b>（不是 HCE）——§4.10.2.6</td><td class="mono">p327 Note</td></tr>
</table>` },
    { h2: "4.24.2 端口到连接器映射：三形态与默认规则",
      html: `<table class="xsp-tb">
<tr><th>形态</th><th>规则要点</th><th>页</th></tr>
<tr><td><b>无集成集线器</b><br>（IHI=0）</td><td>根集线器端口 ↔ 外部端口 <b>1:1</b>，编号对齐（引文③）；协议一致（§7.2 Supported Protocol Capabilities）</td><td class="mono">p328</td></tr>
<tr><td><b>有集成集线器</b><br>（IHI=1，USB2 侧）</td><td>根端口与外部端口间至多<b>一层</b>集成集线器；USB2/Enhanced SS 层级错位只允许「USB2 在 Tier 2、USB3 在 Tier 1」一种；同协议外部端口连续编号（1..n=USB2，n+1..n+m=USB3）；厂商必须提供映射描述（Appendix D 的 ACPI 例）</td><td class="mono">p327–328</td></tr>
<tr><td><b>嵌入式集线器</b><br>（系统侧）</td><td>外部端口到连接器<b>不允许</b>层级错位；系统必须经 ACPI 等提供五级映射描述（根端口/集成集线器/外部端口/嵌入式集线器/连接器）</td><td class="mono">p329</td></tr>
<tr><td><b>无描述时的默认映射</b></td><td>外部端口 1 与 n+1 → 连接器 1（USB3 兼容口），2 与 n+2 → 连接器 2……（引文④）；多出的归 USB2 或 USB3 兼容口</td><td class="mono">p329</td></tr>
</table>
<p>USB3 集线器=USB2 集线器与 Enhanced SuperSpeed 集线器的逻辑合体，各自独立总线运行（p328）。</p>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.21-pci-express/index.html">§4.21 PCI Express</a>——HCRST 恢复路径的入口场景（跑着清 BME）；<a href="../../index.html">§4.10.2.6 主机控制器错误（待建）</a>——HSE 的上报与系统影响。</p>
<p><a href="../../index.html">§4.19 根集线器（待建）</a>——端口状态机细节；Appendix D——ACPI 映射描述示例。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.24 p327–331 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
