// §4.22 xHCI 扩展能力 —— 泳道节（生成器 lane_page.mjs 量产件 #5）
// 判据：xHCI 1.2b §4.22 p307–310（引文三条逐字；4.22.2→§7.6 / 4.22.3→第8章）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.22 xHCI 扩展能力 · xHCI 规范对照学习",
  navTitle: "§4.22 xHCI 扩展能力",
  specRef: "xHCI 1.2b §4.22 xHCI Extended Capabilities · p307–310 · 寄存器字段 §7.1.1/§7.1.2",
  prevHref: "", prevLabel: "",
  nextHref: "", nextLabel: "",
  prose: [
    "本节主体是 <b>4.22.1 Pre-OS 到 OS 的交接同步</b>：BIOS（Pre-OS 软件）可能先持有 xHC，OS 驱动加载后必须通过<b>信号量握手</b>拿所有权——机制失灵的后果是两个软件代理同时认为自己在独占 xHC。硬件面是扩展能力区两个 32 位寄存器：<b>USBLEGSUP</b>（高 16 位=OS/BIOS 两个所有权信号量，相邻字节互不覆盖）与 <b>USBLEGCTLSTS</b>（BIOS 的 SMI 使能位 + USBSTS 子集的只读影子）。",
    "握手协议是两台状态机（Figure 4-36/4-37）：BIOS 只能在 OS Owned=0 时取所有权；OS 驱动把 OS Owned 信号量置 1 发起请求，然后等 BIOS Owned 归 0——等待不超过 1 秒；BIOS 若使能了 SMI on OS Ownership Change，信号量一变就收到 SMI。规范没有反向机制（BIOS 向 OS 要回所有权的事件不存在）。",
    "交接前软件建议清单（§4.22.1 末）：暂停在途总线活动、关中断、存关键状态、使能 USB 唤醒事件、关掉其余根端口。两个指针小节：4.22.2 调试能力运行模型 → §7.6；4.22.3 虚拟化 → 第 8 章。",
  ],
  quotes: [
    { en: "BIOS is only allowed to take ownership of the xHCI when the OS Owned bit is a ‘0’.",
      zh: "BIOS 取所有权的唯一窗口：OS Owned 位为 0——交接协议的第一条规则。",
      src: "xHCI 1.2b §4.22.1 p308" },
    { en: "The OS driver initiates an ownership request by setting the OS Owned semaphore to a ‘1’.",
      zh: "OS 驱动发起接管：把 OS Owned 信号量写 1，然后等 BIOS 让位。",
      src: "xHCI 1.2b §4.22.1 p308" },
    { en: "The OS Handoff Synchronization registers are located in the Aux Power well, so any system event that removes power from the Aux Power well will result in these registers being reset to their default values",
      zh: "交接寄存器住在 Aux Power 井——掉电即回默认值（信号量归 0），握手表不吃电记忆。",
      src: "xHCI 1.2b §4.22.1 p308" },
  ],
  figNo: "Fig 4.22",
  figTitle: "xHC 所有权交接：BIOS 与 OS 的信号量握手",
  figCaption: "软件泳道先后站着两位代理（BIOS→OS）：握手全部通过 USBLEGSUP 信号量完成，SMI 只是 BIOS 侧的门铃。",
  figAria: "xHC 所有权交接三方时序图：BIOS 持有、OS 请求、SMI 通知、BIOS 让位",
  tourNarr: "总览模式：完整流程图。设备泳道不参与——所有权交接是软件代理之间的事。",
  steps: [
    { kind: "note", lanes: ["sw"], lines: ["Pre-OS（BIOS）：POST 时可取所有权", "条件=OS Owned=0；取后置 BIOS Owned=1", "并按需配置 SMI（含 SMI on OS Ownership Change）"], pg: "p308",
      narr: "Figure 4-36 的 BIOS 状态机：BIOS 让位后不得再抢——规范原话「must never attempt to claim the xHCI once it has relinquished control」。" },
    { kind: "box", at: "hc", lines: ["USBLEGSUP（扩展能力区）", "高 16 位=两个所有权信号量", "（OS/BIOS 各占一字节，互不覆盖）"], pg: "p307",
      narr: "相邻字节的巧劲：两个代理各自写自己的信号量，不会踩对方的字。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["OS 驱动：OS Owned 信号量 ← 1", "（发起所有权请求）"], pg: "p308",
      narr: "引文②：请求=一次信号量写；随后 OS 等 BIOS Owned 归 0，限时不超过 1 秒。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["SMI（OS Ownership Change）", "→ BIOS 收到让位请求"], pg: "p309",
      narr: "BIOS 若在 USBLEGCTLSTS 使能了 SMI on OS Ownership Enable，信号量一变就有 SMI——这是 BIOS 侧唯一的门铃。" },
    { kind: "box", at: "sw", lines: ["BIOS 让位：BIOS Owned 信号量 ← 0", "让位前五步建议：暂停总线活动 · 关中断", "存关键状态 · 使能 USB 唤醒 · 关其余根端口"], pg: "p309",
      narr: "OS 等到 BIOS Owned=0 才动手；规范另给五步交接前清单（§4.22.1 末）。" },
    { kind: "box", at: "sw", lines: ["OS 接管：独占使用 xHC", "（此后 OS 卸载时可反向让位：OS Owned ← 0）"], pg: "p309",
      narr: "反向让位同样走信号量 + SMI；但规范没有「BIOS 向 OS 要回」的事件——单向让出后 BIOS 不得再抢。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["交接寄存器住 Aux Power 井——掉电即回默认值", "（信号量归 0，状态机回起点）"], pg: "p308",
      narr: "引文③：电源井边界决定了握手表不吃电记忆——上电后永远从 BIOS Not Owned/OS Not Owned 出发。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：不参与", "交接是软件代理与 xHC 的管理面协议"], pg: "p307–309",
      narr: "设备泳道如实保留：握手全程不涉及任何 USB 传输。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动（BIOS→OS 两位代理先后在场）" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（不参与）" },
    { t: "实线=信号量写 · 虚线=SMI 通知" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.2-host-controller-init/index.html">§4.2 主机控制器初始化</a>——OS 接管后的初始化（交接完成才轮到它）；<a href="../../index.html">§4.23 电源管理（待建）</a>——Aux Power 井的功耗域细节（§4.23.1）。</p>
<p><a href="../../index.html">§7.1.1/§7.1.2 寄存器字段（第 5-7 章后续扩展）</a>——USBLEGSUP/USBLEGCTLSTS 位定义；调试能力归 §7.6、虚拟化归第 8 章（后续扩展）。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.22 p307–310 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
