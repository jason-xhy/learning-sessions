// §4.4 设备拔出 —— 泳道节（生成器 lane_page.mjs 首个量产件）
// 判据：xHCI 1.2b §4.4 p81（拔出检测/PSCEG/Disable Slot 三句逐字）；§4.6.4 p96（命令效果五项）
// 工艺：_gen/lane_page.mjs 生成器 + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

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
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——拔出的逆过程：Enable Slot 取槽与登记（§4.3.2 取槽，本节 Disable Slot 还槽）。</p>
<p><a href="../4.1-command-operation/index.html">§4.1 命令操作</a>——Disable Slot 的投递与回执模型；<a href="../../index.html">§4.6.4 Disable Slot（待建）</a>——命令逐条展开。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.4 p81、§4.6.4 p96、§4.19.2 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
