// §4.7 门铃 —— 泳道节（生成器 lane_page.mjs 量产件 #2）
// 判据：xHCI 1.2b §4.7 Doorbells p142–143（引文四条逐字）；Table 5-43 前例（xhc-machines fig4 已核）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.7 门铃 · xHCI 规范对照学习",
  navTitle: "§4.7 门铃",
  specRef: "xHCI 1.2b §4.7 Doorbells · p142–143 · DB Target 编码 Table 5-43",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "门铃是一列 MMIO 寄存器：最多 256 个 32 位门铃，按 <b>Device Slot ID</b> 索引，基址由能力寄存器的 <b>DBOFF</b> 给出（§5.3.7）。软件「按铃」就是往门铃寄存器写一个值——<b>DB Target</b> 字段说明这次按铃的来意。",
    "两类门铃语义严格分开：<b>门铃 0</b> 专属主机控制器，唯一合法值是 DB Target=0（Host Controller Command），1–255 保留；<b>门铃 1–255</b> 与设备槽一一对应，DB Target 与 DB Stream ID 一起指明设备哪条传输环新挂了工作（编码见 Table 5-43）。",
    "写完不需要清除——xHC 内部记录每次门铃写引用，用它判断命令环或传输环是否新挂了 TD；设备的两条传输环各有新工作就写两次。读门铃不返回任何信息。禁写情形：槽 Disabled 或目标端点 Disabled（xHC 回 Endpoint Not Enabled Error 事件或直接忽略）；端点 Halted/Error 态的门铃引用必被忽略。",
  ],
  quotes: [
    { en: "Doorbell Register 0 is dedicated to the Host Controller. For this register, there is only one valid value for the DB Target field, 0 (Host Controller Command).",
      zh: "门铃 0 专属主机控制器，唯一合法值 DB Target=0——命令通道的按铃。",
      src: "xHCI 1.2b §4.7 p142" },
    { en: "System software rings a Device Context Doorbell after it has inserted work on a Transfer Ring (endpoint/Stream) associated with the respective Device Slot.",
      zh: "设备槽门铃在「传输环新挂了工作之后」按——顺序是先挂工作、后按铃。",
      src: "xHCI 1.2b §4.7 p142" },
    { en: "The xHC internally records all Doorbell Register write references and uses the information to determine if the Command Ring or a Transfer Ring has newly posted work items (TDs). There is no need to “clear” a Doorbell Register.",
      zh: "xHC 内部记录每次按铃；门铃没有「清除」动作——它是边沿信令，不是状态位。",
      src: "xHCI 1.2b §4.7 p143" },
    { en: "The xHC shall ignore doorbell references to endpoints in the Halted or Error state.",
      zh: "对 Halted/Error 态端点的按铃，xHC 必须忽略——错误恢复走 §4.6.8/§4.6.10（待建）。",
      src: "xHCI 1.2b §4.7 p143" },
  ],
  figNo: "Fig 4.7",
  figTitle: "两类门铃、一次按铃的全程：三方泳道",
  figCaption: "门铃 0 喂命令环、门铃 1–255 各对一台设备槽的传输环；按铃是写入即生效的边沿信令，无需清除。",
  figAria: "门铃三方时序图：命令门铃 0 与设备槽门铃的按铃全程",
  tourNarr: "总览模式：完整流程图。设备泳道不参与——门铃是软件与 xHC 之间的信令。",
  steps: [
    { kind: "arrow", from: "sw", to: "hc", lines: ["写门铃 0：DB Target=0", "（Host Controller Command）"], pg: "p142",
      narr: "命令环上有新命令时按门铃 0——§4.1 命令模型的投递后半句；唯一合法值 0，1–255 保留。" },
    { kind: "box", at: "hc", lines: ["命令门铃 0：查命令环", "取新挂的命令 TRB 开始执行"], pg: "p142–143",
      narr: "xHC 内部记录这次写引用，判定命令环新挂了 TD——无需任何清除动作。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写设备槽门铃 N（N=Slot ID）", "DB Target=端点号 · DB Stream ID=流号"], pg: "p142",
      narr: "门铃 1–255 与设备槽一一对应；先把 TD 挂上传输环、再按铃——顺序由 §4.7 第一条引文钉死。" },
    { kind: "box", at: "hc", lines: ["按 DB Target + Stream ID 定位传输环", "取新挂的 TD 开始执行"], pg: "p142–143",
      narr: "DB Target/DB Stream ID 指明设备哪条传输环被改——编码见 Table 5-43（EP0 门铃 DB Target=1 的实例见 §4.3）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["两条传输环各有新工作 = 写两次门铃", "每次写由 DB Target 指明目标环"], pg: "p143",
      narr: "门铃按「次」计：一 writes 一环，不打包。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["无需清除：边沿信令，非状态位", "读门铃寄存器不返回信息"], pg: "p143",
      narr: "xHC 内部记录所有写引用——软件侧没有任何「清门铃」操作可做。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["禁写情形：槽 Disabled / 端点 Disabled →", "回 Endpoint Not Enabled Error 事件（或忽略）", "端点 Halted/Error：必忽略"], pg: "p143",
      narr: "对禁用槽/端点按铃要么收到错误事件（主事件环上，字段全 0 的 Transfer Event）、要么被忽略；Halted/Error 端点必忽略——恢复走 Reset Endpoint / Set TR Dequeue（§4.6，待建）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：不参与", "门铃是软件与 xHC 的信令——", "设备只看见后果：总线上的传输"], pg: "p142",
      narr: "三方视角诚实立法：门铃协议完全位于主机侧，设备泳道保留但不硬凑。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（不参与）" },
    { t: "实线=门铃寄存器写 · 本图无事件回执流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——门铃 0（DB Target=0）的由来与命令模型；<a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——R/S=1 之后 xHC 才开始接受门铃。</p>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——EP0 门铃（DB Target=1）的真实使用；<a href="../../../xhc-machines/fig4-command-ring/index.html">四机课 Fig4 订单柜台</a>——命令环与命令门铃的机器动画。</p>
<p><a href="../../index.html">§4.6 命令接口（待建）</a> · <a href="../../index.html">§4.14 传输环管理（待建）</a>——门铃两侧的环如何运转。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.7 p142–143 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
