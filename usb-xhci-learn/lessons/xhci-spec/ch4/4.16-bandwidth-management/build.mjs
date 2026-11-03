// §4.16 带宽管理 —— 泳道节（生成器 lane_page.mjs 量产件 #6；泳道＋表格）
// 判据：xHCI 1.2b §4.16 p258–261（引文三条逐字）；§4.16.1 Bandwidth Negotiation p259
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.16 带宽管理 · xHCI 规范对照学习",
  navTitle: "§4.16 带宽管理",
  specRef: "xHCI 1.2b §4.16 Bandwidth Management · p258–261 · §4.16.1 Bandwidth Negotiation",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "xHCI 不再假设「一条控制器接口=一份 USB 带宽」：厂商可以把根集线器端口组织成任意数量的内部 <b>USB 实例</b>（全体端口共享一份，或每端口独享一份，或任意组合）。带宽评估因此取决于两件事：端口被分到哪个实例、同实例上其它设备已占用多少。",
    "软件用 <b>Configure Endpoint 命令</b>问 xHC「这个配置的带宽够不够」；xHC 按内部组织评估，失败回 <b>Bandwidth Error / Secondary Bandwidth Error</b>。软件可换端点设置重试，或发 <b>Negotiate Bandwidth 命令</b>——它给同一 USB 实例上每台有周期端点的设备生成一张 <b>Bandwidth Request Event</b>，请各家自愿让出带宽。",
    "让带宽没有强制：收到请求的设备驱动可以不理会（好公民才会配合），配合的方式=换配置或备选接口→重新 Configure Endpoint，xHC 随之重算实例可用带宽。<b>Disable Slot 命令</b>会释放该槽周期端点的全部带宽（§4.4 的回收项之一）。",
  ],
  quotes: [
    { en: "Software uses the Configure Endpoint Command to ask the xHC if the bandwidth required for a specific device configuration is available.",
      zh: "带宽申请的入口就是 Configure Endpoint 命令——问句式命令，答案在完成事件里。",
      src: "xHCI 1.2b §4.16 p258" },
    { en: "There is no requirement that a device give up bandwidth due to a Bandwidth Request Event, however a “good citizen” will do their best to comply.",
      zh: "Bandwidth Request Event 是请求不是命令——让不让带宽是驱动自愿，规范只劝「好公民」。",
      src: "xHCI 1.2b §4.16.1 p259" },
    { en: "A Disable Slot Command will cause any bandwidth allocated to the periodic endpoints of a device slot to be freed.",
      zh: "停用槽即释放其周期端点带宽——§4.4 五项回收的带宽项在这里落地。",
      src: "xHCI 1.2b §4.16 p259" },
  ],
  figNo: "Fig 4.16",
  figTitle: "一次带宽协商：申请、拒绝与好公民协议",
  figCaption: "Configure Endpoint 问一句、xHC 按实例评估；失败后 Negotiate Bandwidth 广撒请求，让带宽全凭自愿。",
  figAria: "带宽管理三方时序图：Configure Endpoint 评估、Bandwidth Error、Negotiate Bandwidth 与请求事件",
  tourNarr: "总览模式：完整流程图。设备泳道在重新配置时才被波及——带宽评估本身对设备不可见。",
  steps: [
    { kind: "box", at: "sw", lines: ["Class 驱动选配置/备选接口", "（典型：先试最高质量的设置）"], pg: "p259",
      narr: "USB 摄像机的例子：十几档备选接口对应不同分辨率/帧率——先试最好的。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["Configure Endpoint 命令 → 命令环", "（问：这个配置的带宽够吗）"], pg: "p258",
      narr: "引文①：带宽申请走命令通道（§4.1 模型）——命令 TRB 写入命令环 + 写门铃 0。" },
    { kind: "box", at: "hc", lines: ["评估：该端口所属 USB 实例", "＋同实例已占用带宽", "→ 可用则扣减并接受"], pg: "p258",
      narr: "xHC 对软件隐藏内部实例组织——评估是 xHC 的职责，软件只看结果。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["成功 → 完成事件（Success）", "失败 → Bandwidth Error /", "Secondary Bandwidth Error"], pg: "p258",
      narr: "答案走事件环；失败码专设两种带宽错误。" },
    { kind: "box", at: "sw", lines: ["失败分支：换端点设置重试", "或发 Negotiate Bandwidth 命令"], pg: "p258–259",
      narr: "重试与协商两条路；协商命令用 Slot ID 字段指明受困设备所在的 USB 实例。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Bandwidth Request Event ×N", "（同实例每台有周期端点的设备一张）"], pg: "p259",
      narr: "引文②（§4.16.1）：请求事件的收件人=同实例上声明了 Isoch/Interrupt 端点的设备槽。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["好公民协议：让带宽自愿", "让法=换配置/备选接口 → 重新 Configure Endpoint", "xHC 随每次命令重算实例可用带宽"], pg: "p259",
      narr: "没有设备必须让步的要求；协商命令不阻塞命令环，先回完成事件、请求事件随后送（p259–260）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：带宽评估对它不可见——", "只被重新配置（换接口设置时", "xHC 代发 SET_INTERFACE，§4.5.4.3）"], pg: "p259",
      narr: "三方视角：评估在 xHC 内部，设备只在重新配置的执行效果里出现。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（仅被重新配置）" },
    { t: "实线=命令流 · 虚线=事件流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——两条命令的投递与回执模型；<a href="../4.4-device-detach/index.html">§4.4 设备拔出</a>——Disable Slot 释放带宽的回收项。</p>
<p><a href="../../index.html">§4.6.6 Configure Endpoint / §4.6.13 Negotiate Bandwidth（待建）</a>——逐命令展开；<a href="../../index.html">§4.5.4.3 SET_INTERFACE（待建）</a>——备选接口切换。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.16 p258–261 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
