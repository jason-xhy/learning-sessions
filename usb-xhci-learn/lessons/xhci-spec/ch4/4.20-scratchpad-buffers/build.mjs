// §4.20 暂存缓冲区 —— 泳道节（生成器 lane_page.mjs 量产件 #4）
// 判据：xHCI 1.2b §4.20 Scratchpad Buffers p304–306（引文三条逐字；分配四步 p305）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.20 暂存缓冲区 · xHCI 规范对照学习",
  navTitle: "§4.20 暂存缓冲区",
  specRef: "xHCI 1.2b §4.20 Scratchpad Buffers · p304–306 · 数组结构 §6.6",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "xHC 需要一块「草稿纸」存内部状态：<b>Scratchpad Allocation</b> 机制允许 xHC 向系统内存要一个或多个 <b>PAGESIZE</b> 大小的缓冲区（PAGESIZE 寄存器 §5.4.3）。要几页由 <b>HCSPARAMS2</b> 的 Max Scratchpad Buffers Hi/Lo 字段声明（§5.3.4）——可以为 0。",
    "装载路径全由软件买单：先看 HCSPARAMS2 拿到页数，分配一个指针数组（Scratchpad Buffer Array），把数组基址写进 <b>DCBAA 的槽 0 表项</b>；然后逐页分配 PAGESIZE 缓冲、清 0、把每页基址写回数组。全部完成必须在 <b>R/S=1 之前</b>——与 §4.2 初始化同一条终点线。",
    "三条使用边界：软件不许读写 scratchpad 内容（写了可能未定义行为）；xHC 访问不许越出 PAGESIZE 块；SPR=1 时内容须跨系统电源事件（含 D3.cold）保持完好（Save/Restore State 用它存内部状态）。",
  ],
  quotes: [
    { en: "System software shall allocate the Scratchpad Buffer(s) before placing the xHC in to Run mode (Run/Stop (R/S) = ‘1’).",
      zh: "scratchpad 分配是 R/S=1 的前置条件之一——初始化清单里的一项。",
      src: "xHCI 1.2b §4.20 p305" },
    { en: "Entry 0 of the Device Context Base Address Array points to the Scratchpad Buffer Array.",
      zh: "DCBAA 槽 0 表项指向 scratchpad 数组——槽 0 不给设备，给 xHC 自己。",
      src: "xHCI 1.2b §4.20 p305" },
    { en: "System software shall not read or write a Scratchpad buffer. System software writes to the Scratchpad buffer memory may result in undefined xHC operation.",
      zh: "软件对 scratchpad 只买单不窥探：读写都可能把 xHC 搞成未定义行为。",
      src: "xHCI 1.2b §4.20 p305" },
  ],
  figNo: "Fig 4.20",
  figTitle: "给 xHC 买草稿纸：scratchpad 装载四步",
  figCaption: "页数由 HCSPARAMS2 声明、数组挂 DCBAA 槽 0、逐页清 0 装指针；R/S=1 前必须全部就位。",
  figAria: "scratchpad 缓冲区装载三方时序图：读页数、分配数组、写 DCBAA 槽 0、逐页装载",
  tourNarr: "总览模式：完整流程图。设备泳道不参与——scratchpad 是 xHC 的私有内存。",
  steps: [
    { kind: "box", at: "sw", lines: ["读 HCSPARAMS2", "Max Scratchpad Buffers Hi/Lo → 页数 N"], pg: "p304–305",
      narr: "页数由 xHC 自己声明（可为 0）；PAGESIZE 决定每页大小（§5.4.3）。" },
    { kind: "box", at: "sw", lines: ["分配 Scratchpad Buffer Array", "（N 个指针的数组）"], pg: "p305",
      narr: "数组结构归 §6.6；数组本身就是一串指针。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["数组基址 → DCBAA 槽 0 表项"], pg: "p305",
      narr: "DCBAA 槽 0 不对应任何设备——它登记的是 xHC 自己的数组，不给设备；设备槽从 1 起（§4.5）。" },
    { kind: "box", at: "sw", lines: ["逐页装载 ×N：", "分配 PAGESIZE 缓冲（页对齐）", "清 0 → 基址写回数组表项"], pg: "p305",
      narr: "规范四步的循环体：分配、清 0、写指针——一步不能省（清 0 也是 shall）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["时序铁律：全部完成须在 R/S=1 之前", "（与 §4.2 初始化同一条终点线）"], pg: "p305",
      narr: "引文①：R/S=1 之前分配完毕——放不进「以后再补」的清单。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["使用边界：软件不读写内容", "xHC 不越 PAGESIZE 边界", "SPR=1 时内容跨 D3.cold 存活"], pg: "p305",
      narr: "引文③ + 边界两条；SPR 归 Table 5-11，Save/Restore State 操作依赖内容完好。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：不参与", "scratchpad 是 xHC 的私有草稿纸——", "分配与回收全在主机侧"], pg: "p304–305",
      narr: "设备泳道如实保留：scratchpad 机制从头到尾不经过总线。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（不参与）" },
    { t: "实线=内存/寄存器写 · 本图无事件流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——R/S=1 终点线与 DCBAA 装载（scratchpad 数组走 DCBAA 槽 0，与 §4.2 的 DCBAAP 步同域）。</p>
<p><a href="../4.3-usb-device-init/index.html">§4.3 USB 设备初始化</a>——DCBAA 设备槽表项（槽 1 起）的装载；<a href="../../index.html">§4.23 电源管理（待建）</a>——SPR/D3.cold 的功耗域。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.20 p304–306 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
