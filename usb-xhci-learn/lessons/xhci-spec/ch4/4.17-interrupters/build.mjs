// §4.17 中断器 —— 泳道节（生成器 lane_page.mjs 量产件 #7；泳道互链 fig3）
// 判据：xHCI 1.2b §4.17 p261–269（引文四条逐字）；节流流程 Figure 4-22/4-23/4-24 p264–267
// 走读卡（CODE-STEPPER 量产轮，2026-11-04）：render_block 渲染 stepper_47x.json + codestepper/course.css
//   走读段内联——渲染单一事实源=scripts/stepper_builder.py，行号零誊抄（锚点断言门）。
//   生成器不接受额外 css/js（禁改 _gen/），走读卡三件（CSS/body 块/JS）对 lanePage 产物做
//   锚点注入：head `</style></head>` 前、linksHtml 首标记 `<!--X47:WALK-->` 处、module 脚本首。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = "/Users/jason/ZCodeProject/usb-xhci-study";
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- 代码走读卡（rings3 四区：命令环/EP1 传输环/事件环/设备端；事件环消费链） ----------
const stepperHtml = execFileSync("python3", [
  join(WS, "scripts/stepper_builder.py"), "render_block",
  join(WS, "lessons-data/stepper_47x.json"),
], { encoding: "utf8" });
const courseCss = readFileSync(join(WS, "assets/course.css"), "utf8");
const cssSeg = (a, b) => {
  const i = courseCss.indexOf(a);
  const j = courseCss.indexOf(b, i);
  if (i < 0 || j < 0) throw new Error(`course.css 段标记缺失: ${a.slice(0, 30)}`);
  return courseCss.slice(i, j);
};
const stepperCss = cssSeg("/* ===== 代码步进放映机", "/* ===== 右缘批注")
  .replace(/\/\*[\s\S]*?\*\//g, "");  // 剥段内注释：资产注释不进交付件（载体三分），兼减字节
const stepperJs = readFileSync(join(WS, "assets/codestepper.js"), "utf8");

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
  extraHtml: `<!--X47:WALK-->`,  // 自含化：原互链卡移除，仅留走读卡注入锚
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.17 p261–269 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

// ---------- 走读卡三件注入（lanePage 产物后处理；锚点唯一，replace 函数形态防 $ 误展开） ----------
const walknote = `<p class="xsp-walknote">中断器三方时序图第 3-4 步（ISR 读事件环处理事件）在真实内核代码里的样子——从 MSI-X 向量抵达进入 xhci_irq 起，逐语句走进事件环主循环、Transfer Event 分发与 URB 交还，最后 ERDP 写回解除 EHB（与上方泳道图第 3-4 步对表）。TD 计数口径：规范按传输阶段记 TD，内核 struct xhci_td 按 URB 记；本例 bulk 单阶段传输两个口径重合，控制传输三阶段在内核并成一个 TD。命令环本链无 TRB 流转，右列如实呈现为空。</p>
`;
const stepperCssBlock = `
/* 代码走读卡（rings3）：course.css 走读段整体内联 + 纸面卡变量垫片——走读卡固定
   浅色纸面（读代码的场景材质），双主题同形；变量映射到板内中性色。 */
${stepperCss}
.stepper { --line: #c9c4b2; --ink: #1f1c14; --muted: #6b675a; --accent: #8a5f14; --good: #2f7a3d;
  font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans CJK SC", sans-serif);
  color: #1f1c14; }
.xsp-walknote { font-family: var(--font-ui); font-size: 14.5px; color: var(--anatomy-muted); margin: 10px 2px 0; }
`;
let page = lanePage(cfg);
for (const [anchor, inject] of [
  ["</style></head>", () => stepperCssBlock + "</style></head>"],
  ["<!--X47:WALK-->", () => walknote + stepperHtml],
  ['<script type="module">', () => '<script type="module">' + stepperJs.replace(/<\/(script)/gi, "<\\/$1") + "\n"],
]) {
  if (!page.includes(anchor)) throw new Error(`注入锚点缺失: ${anchor.slice(0, 40)}`);
  page = page.replace(anchor, inject);
}
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
