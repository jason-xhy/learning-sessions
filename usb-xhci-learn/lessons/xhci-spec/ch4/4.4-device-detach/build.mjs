// §4.4 设备拔出 —— 泳道节（生成器 lane_page.mjs 首个量产件）
// 判据：xHCI 1.2b §4.4 p81（拔出检测/PSCEG/Disable Slot 三句逐字）；§4.6.4 p96（命令效果五项）
// 工艺：_gen/lane_page.mjs 生成器 + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
// 走读卡（CODE-STEPPER 量产轮，2026-11-04）：render_block 渲染 stepper_44x.json + codestepper/course.css
//   走读段内联——渲染单一事实源=scripts/stepper_builder.py，行号零誊抄（锚点断言门）。
//   生成器不接受额外 css/js（禁改 _gen/），走读卡三件（CSS/body 块/JS）对 lanePage 产物做
//   锚点注入：head `</style></head>` 前、linksHtml 首标记 `<!--X44:WALK-->` 处、module 脚本首。
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const WS = "/Users/jason/ZCodeProject/usb-xhci-study";
const THEME = process.argv.includes("--light") ? "light" : "dark";

// ---------- 代码走读卡（rings3 四区：命令环/EP0 传输环/事件环/设备端；Disable Slot 链） ----------
const stepperHtml = execFileSync("python3", [
  join(WS, "scripts/stepper_builder.py"), "render_block",
  join(WS, "lessons-data/stepper_44x.json"),
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
  pageTitle: "§4.4 设备拔出 · xHCI 规范对照学习",
  navTitle: "§4.4 设备拔出",
  specRef: "xHCI 1.2b §4.4 Device Detach · p81 · Disable Slot 命令语义 §4.6.4 p96",
  prevHref: "../4.3-usb-device-init/index.html", prevLabel: "§4.3 USB 设备初始化",
  nextHref: "", nextLabel: "",
  prose: [
    "设备从根集线器端口拔出时，xHC 的端口硬件先于软件知道：PORTSC 的 <b>CCS</b>（当前连接状态）清 0、<b>CSC</b>（连接状态变化）置 1。状态变化不是事件本身——<b>PSCEG</b> 发生 0→1 跳变才产生端口状态变化事件（§4.19.2），事件走事件环送达软件。",
    "软件确认拔出后，必须用 <b>Disable Slot 命令</b>停用该端口关联的设备槽。命令的投递沿用 §4.1 命令模型：命令 TRB 上唯一的命令环 + 写门铃 0；命令完成事件必回（§4.6.4）。",
    "Disable Slot 由 xHC 执行五项回收（禁槽门铃、回收周期端点带宽、终止该槽 USB 活动、释放内部资源、把槽标记为可复用）；软件随后释放自己的数据结构（Device Context、传输环内存等）。拔出后设备侧无任何响应——本节全部动作发生在主机侧。",
  ],
  quotes: [
    { en: "When the device is detached from a Root Hub port, the PORTSC Current Connection Status (CCS) bit shall be cleared to ‘0’ and the Connect Status Change (CSC) bit shall be set to ‘1’.",
      zh: "拔出由端口硬件捕获：CCS 清 0、CSC 置 1——软件从寄存器位读出这件事。",
      src: "xHCI 1.2b §4.4 p81" },
    { en: "After the detection of a detach, system software shall disable the Device Slot associated with the port by issuing a Disable Slot Command for the affected slot.",
      zh: "确认拔出后，软件必须对受影响的槽发 Disable Slot 命令——停用槽位是软件的义务。",
      src: "xHCI 1.2b §4.4 p81" },
    { en: "A Command Completion Event is always returned for a Disable Slot Command.",
      zh: "Disable Slot 命令必回一条命令完成事件——命令模型的闭环在此同样成立。",
      src: "xHCI 1.2b §4.6.4 p96" },
  ],
  figNo: "Fig 4.4",
  figTitle: "一次拔出的完整回收路径：三方泳道",
  figCaption: "拔出先落在端口硬件（CCS/CSC），经事件环交给软件；软件用 Disable Slot 命令把槽位整个还回 xHC。",
  figAria: "设备拔出三方时序图：拔出、端口状态变化、Disable Slot 命令与完成事件",
  tourNarr: "总览模式：完整流程图。设备泳道在拔出后离场——后续动作全部发生在主机侧。",
  steps: [
    { kind: "arrow", from: "dev", to: "hc", lines: ["设备拔出（物理事件）"], pg: "p81",
      narr: "设备从根集线器端口被拔出——从这里开始，设备泳道离场。" },
    { kind: "box", at: "hc", lines: ["PORTSC：CCS→0 · CSC→1"], pg: "p81",
      narr: "xHC 端口硬件捕获拔出：当前连接状态清 0、连接状态变化置 1（§4.4）。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["PSCEG 0→1 跳变", "Port Status Change Event 写入事件环"], pg: "p81",
      narr: "状态位不产生事件——PSCEG 发生 0→1 跳变才有端口状态变化事件（§4.19.2）；事件走事件环（§4.9.4）。" },
    { kind: "box", at: "sw", lines: ["读事件环收端口状态变化事件", "读 PORTSC：CCS=0 → 判定拔出"], pg: "p81",
      narr: "软件取事件、回读 PORTSC 确认 CCS=0——拔出判定成立。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["Disable Slot 命令 → 命令环", "写门铃 0（DB Target=0）"], pg: "p81",
      narr: "命令投递沿用 §4.1 模型：唯一命令环 + 命令门铃 0；受影响的槽由 PORTSC 事件携带的端口号对应。" },
    { kind: "box", at: "hc", lines: ["执行 Disable Slot：", "禁槽门铃 · 回收周期端点带宽", "终止该槽 USB 活动 · 释放内部资源", "槽标记为「可复用」"], pg: "p96",
      narr: "§4.6.4 五项回收由 xHC 完成；前置条件：该槽端点已 Stopped（或 Running 中 Idle）且未决 Transfer Events 已收齐。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Command Completion Event", "Disable Slot 必回完成事件"], pg: "p96",
      narr: "回执走事件环——与每条命令一样（§4.1）。" },
    { kind: "box", at: "sw", lines: ["软件释放自己的数据结构", "Device Context / 传输环 / 段表内存"], pg: "p96",
      narr: "xHC 把槽标记为可复用后，DCBAA 表项不再被 xHC 认为有效——软件可以安全释放配套内存（§4.6.4）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["回收的槽位可被后续 Enable Slot 命令再次分配", "（§4.6.4 · 取槽见 §4.3.2）"], pg: "p96",
      narr: "槽位生命周期闭环：Disabled → Enable Slot 可再分配。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：已不在总线", "拔出后设备侧无任何响应——", "本流程的全部动作发生在主机侧"], pg: "p81",
      narr: "设备泳道离场是有意的：拔出没有「设备配合」环节，回收是主机侧的事。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（拔出即离场）" },
    { t: "实线=命令流 · 虚线=事件回执流" },
  ],
  extraHtml: `<!--X44:WALK-->`,  // 自含化：原互链卡移除，仅留走读卡注入锚
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.4 p81、§4.6.4 p96、§4.19.2 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

// ---------- 走读卡三件注入（lanePage 产物后处理；锚点唯一，replace 函数形态防 $ 误展开） ----------
const walknote = `<p class="xsp-walknote">同一条回收主线在真实内核代码里的样子——从 USB 核心 usb_disconnect 收尾起步，逐语句走进 xhci_free_dev 的 Disable Slot 投递、xHC 五项回收、中断侧消费，最后回到驱动线程释放内存（与上方泳道图第 5-8 步对表）。TD 计数口径：规范按传输阶段记 TD，内核 struct xhci_td 按 URB 记——本链是命令，不涉传输 TD（EP0 传输环的内存只在收尾帧被释放，环上无 TRB 流转）。</p>
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
  ["<!--X44:WALK-->", () => walknote + stepperHtml],
  ['<script type="module">', () => '<script type="module">' + stepperJs.replace(/<\/(script)/gi, "<\\/$1") + "\n"],
]) {
  if (!page.includes(anchor)) throw new Error(`注入锚点缺失: ${anchor.slice(0, 40)}`);
  page = page.replace(anchor, inject);
}
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
