// §4.13 设备通知 —— 泳道节（生成器 lane_page.mjs 量产件 #3）
// 判据：xHCI 1.2b §4.7 p229（DNCTRL/事件路由两条引文逐字）+ §4.13.1 LTM p229–231
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.13 设备通知 · xHCI 规范对照学习",
  navTitle: "§4.13 设备通知",
  specRef: "xHCI 1.2b §4.13 Device Notifications · p229–232 · §4.13.1 Latency Tolerance Message Handling",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "USB3 规范定义了 <b>Device Notification Transaction Packet</b>（设备通知事务包）：16 种通知类型里，一部分由 xHC 直接处理，另一些可以上报软件。<b>DNCTRL</b>（Device Notification Control）寄存器让软件逐位选中自己关心的通知类型——被选中的类型会生成 <b>Device Notification Event</b> 写入事件环（TRB 格式 §6.4.2.7）。",
    "事件的去向由设备槽决定：xHC 用该槽 Slot Context 的 <b>Interrupter Target</b> 字段选择接收它的事件环。调试例外：DNCTRL 也允许把本来由 xHC 直接处理的通知类型一并上报（便于排查）。",
    "本节主体 4.13.1 是 <b>LTM</b>（Latency Tolerance Messaging，延迟容忍消息）：USB3 设备用 LTM TP 报告自己的延迟容忍值（<b>BELT</b>）；xHC 逐设备记录 Device BELT，比较后把最小值经宿主平台的 <b>LTR</b> 机制转发——这条转发路径在三方泳道之外（平台总线特定，如 PCIe LTR）。软件可用 <b>Set LTV 命令</b>自设一个 Device BELT 值（§4.6.14）。",
  ],
  quotes: [
    { en: "The Device Notification Control (DNCTRL) register allows system software to individually select which notifications are important to it and shall generate a Device Notification Event.",
      zh: "DNCTRL 按位选择要收的通知类型——选中的才生成设备通知事件。",
      src: "xHCI 1.2b §4.13 p229" },
    { en: "The xHC shall use the Device Slot’s Slot Context Interrupter Target field to determine the Event Ring that shall receive the event.",
      zh: "事件进哪条事件环由该槽 Slot Context 的 Interrupter Target 字段决定——不是固定进 0 号中断器。",
      src: "xHCI 1.2b §4.13 p229 Note" },
    { en: "The xHC's role in supporting this new platform capability is to accept latency tolerance values from USB3 devices, evaluate the values and forward the lowest value to the host platform, using the host platform’s Latency Tolerance Reporting (LTR) mechanism.",
      zh: "xHC 在 LTM 里的角色：收设备 BELT 值、比较、把最小值经平台 LTR 转发给宿主。",
      src: "xHCI 1.2b §4.13.1 p229" },
  ],
  figNo: "Fig 4.13",
  figTitle: "设备通知与 LTM：设备第一次主动说话",
  figCaption: "通知类型先经 DNCTRL 筛选；LTM 例子里 xHC 比较各设备 BELT、把最小值经平台 LTR 转出三方泳道。",
  figAria: "设备通知三方时序图：Dev Notification TP、DNCTRL 筛选与 Device Notification Event",
  tourNarr: "总览模式：完整流程图。本节设备泳道真实在场——设备是通知的发起方。",
  steps: [
    { kind: "arrow", from: "dev", to: "hc", lines: ["USB3 Device Notification TP", "（Notification_Type=16 种之一）"], pg: "p229",
      narr: "设备主动发通知包——与「设备只见 USB 请求」的下行方向相反，这是设备→主机的消息（§7.5.1.6 定义包格式）。" },
    { kind: "box", at: "sw", lines: ["软件预置：写 DNCTRL", "按位选中要收的通知类型"], pg: "p229",
      narr: "DNCTRL 的每一位对应一种通知类型；选中的类型才生成事件——调试时可把 xHC 自处理的类型也打开。" },
    { kind: "box", at: "hc", lines: ["xHC 处置：多数类型自行消化", "被选中的类型 → 生成 Device Notification Event"], pg: "p229",
      narr: "xHC 是第一道过滤器：能自己处理的直接处理，软件关心且已选中的才上报。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Device Notification Event", "写入事件环"], pg: "p229",
      narr: "进哪条事件环由该槽 Slot Context 的 Interrupter Target 字段决定（Note 原文）——事件路由跟着槽走。" },
    { kind: "box", at: "sw", lines: ["读事件环收设备通知事件"], pg: "p229",
      narr: "TRB 格式归 §6.4.2.7；软件按 Notification Type 字段分派处理。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["LTM 例子（§4.13.1）：", "设备 LTM TP 带 BELT 值 → xHC 逐设备记 Device BELT", "比较取最小值 → 经平台 LTR 转发宿主", "（LTR 在三方泳道之外——平台总线特定机制）"], pg: "p229–230",
      narr: "xHC 维护 Current BELT（初始 tBELTdefault）与每设备 Device BELT；设备拔出后按 §4.13.1 规则重算。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["Set LTV 命令：软件可自设一个 Device BELT 值", "（可选规范件 · §4.6.14）"], pg: "p231",
      narr: "软件用自己的值参与最小值比较——宿主平台的诉求通过命令通道注入。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（通知发起方）" },
    { t: "实线=包/配置写 · 虚线=事件流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——事件环消费模型；<a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费。</p>
<p><a href="../../index.html">§4.6.14 Set LTV（待建）</a> · <a href="../../index.html">§4.23 电源管理（待建）</a>——LTM 所属的功耗管理域。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.13 p229–232 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
