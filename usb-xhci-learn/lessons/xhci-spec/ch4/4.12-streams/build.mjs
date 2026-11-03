// §4.12 流（Streams） —— 泳道节（生成器 lane_page.mjs 量产件；骨架版：机器形态留后续会话）
// 判据：xHCI 1.2b §4.12 p218–228（引文五条逐字）；§4.12.1 xHCI Stream Protocol p219–223、
//   §4.12.2 Stream ID Management p223–225、§4.12.2.1 Stream Array Bounds Checking p225–227、
//   §4.12.3 Evaluate Next TRB (ENT) p227–228（页码现场核：§4.13 起于 p229）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.12 流（Streams） · xHCI 规范对照学习",
  navTitle: "§4.12 流（Streams）",
  specRef: "xHCI 1.2b §4.12 Streams · p218–228 · §4.12.1 xHCI Stream Protocol · §4.12.2 Stream ID Management · §4.12.3 Evaluate Next TRB (ENT)",
  prevHref: "../4.11-trbs/index.html", prevLabel: "§4.11 TRB（传输请求块）",
  nextHref: "../4.13-device-notifications/index.html", nextLabel: "§4.13 设备通知",
  prose: [
    "流（Streams）给 SS Bulk 端点扩容传输环：标准端点只配一条 Transfer Ring，开了流的端点最多可挂 <b>65533 条</b>（Stream ID 0、FFFEh=Prime、FFFFh=No Stream 保留——p218 脚注 39）。开流后端点上下文的 TR Dequeue Pointer 改指<b>流上下文数组</b>（Stream Context Array），流 ID（Stream ID）索引进数组，每个流上下文再各持一个 TR Dequeue Pointer 指向自己的传输环。三方分工一句话：xHCI 驱动备好各条流的环并写门铃（本页泳道「xHCI 驱动」即规范原文所称 system software（系统软件）），xHC 按 Stream ID 索引流上下文、推进流协议状态机，哪条流活跃（当前流 CStream）由设备决定。",
    "门铃不是随按随动——xHC 用流协议状态机（xSPSM：Disabled/Idle/Prime Pipe/Start Stream/Move Data，Figure 4-19）配一套<b>去抖动旗标</b>决定每次门铃的效果：IPPV 把 Prime Pipe 压到每进一次 Idle 只发一次；DBPV 补记非 Idle 期的门铃，一回 Idle 立即补发；LFCV 记住设备用 NRDY(Stream n) 流控过当前流，之后不再为它主动搬数；可选的 DSICV 捕获门铃里的流 ID，省一次查环。<b>HID=1</b> 时主机主导的 Idle→Move Data 转移整体关闭——有的用法让设备全权选流更高效；xHC 也可因内部资源限制按 HID=1 运行。",
    "流 ID 管理走<b>层级数组</b>：主流数组 2<sup>MaxPStreams+1</sup> 项（开辅流时上限 256 项即 MaxPStreams=7；Linear 模式上限 64K 项），Stream ID 拆低位 PSID 与高位 SSID——SSID=0 落主数组直指传输环（SCT=1），非 0 落辅流数组。越界检查是 xHC 的义务：SID=0 或超出数组大小回 <b>Invalid Stream ID Error</b>、SCT 类型不符回 <b>Invalid Stream Type Error</b>，均停端点；Set TR Dequeue Pointer 命令越界则以完成码 TRB Error 报告。设备切流可能落在 TD 中途——xHC 存流状态前先看 <b>ENT</b> 旗标：置位就把后随的 Event Data TRB 执行完再存，免得「数据移完、TD 悬着」把等完成的软件锁死。〔注记：<b>本节 anatomy 机器形态留后续会话——本页为流程骨架版</b>：主线流程+流协议要点表，不做 xSPSM 与越界检查的逐分支展开。〕",
  ],
  quotes: [
    { en: "Streams extend the number of Transfer Rings that may be accessible to a SS Bulk USB endpoint. A standard endpoint defines a single Transfer Ring.",
      zh: "流把单环端点扩成流数组——上限 65533 条（脚注 39：SID 0、65534=Prime、65535=No Stream 保留）。",
      src: "xHCI 1.2b §4.12 p218" },
    { en: "The USB device determines which Stream is active at any time, that is, which Stream Context Transfer Ring is being used to move data.",
      zh: "选流权在设备——xHC 只按包头流 ID 备好各条流上下文，活跃的那条叫 CStream。",
      src: "xHCI 1.2b §4.12 p218" },
    { en: "Reliably determining whether a Stream Context is active or not, is a Device Class responsibility. There is no xHCI defined method.",
      zh: "流上下文是否活跃没有 xHCI 统一判法——空环或带外机制，判定责任归设备类协议（UASP 例见同页）。",
      src: "xHCI 1.2b §4.12 p219" },
    { en: "Stream Array bounds checking shall be supported by the xHCI. This feature ensures that an invalid Stream ID presented by a device or a Set TR Dequeue Pointer Command shall not cause the xHC to reference host memory that it doesn’t have access to.",
      zh: "越界检查是 xHCI 的强制义务——坏流 ID 不许变成越权内存访问。",
      src: "xHCI 1.2b §4.12.2.1 p225" },
    { en: "System software shall set the ENT flag in the last Transfer TRB before a terminating Event Data TRB in a TD. This action ensures the timely execution of an Event Data TRB if the Transfer Ring is flow controlled.",
      zh: "ENT 用法立法：TD 末尾是 Event Data TRB 时，前一个传输 TRB 必须置 ENT——防流控期 TD 悬挂。",
      src: "xHCI 1.2b §4.12.3 p228" },
  ],
  figNo: "Fig 4.12",
  figTitle: "一条流传输的主线：带 ID 门铃 → 去抖动起跑 → 设备选流/切流 → 存状态回执",
  figCaption: "门铃带 DB Stream ID 起跑，xSPSM 旗标去抖动；设备定 CStream、包边界切流，xHC 存状态前先跑 ENT。骨架版——anatomy 机器形态留后续会话。",
  figAria: "流协议三方时序图：开流、带流 ID 门铃、xSPSM 去抖动、设备选流切流、流控、保存流状态与事件回执",
  tourNarr: "总览模式：完整流程图。设备是选流方——CStream 由它定、可在包边界切流；每框角标规范页码。",
  steps: [
    { kind: "note", lanes: ["sw", "hc"], lines: ["建立流：Configure Endpoint 开流（MaxPStreams>0）", "EP 上下文 TR Dequeue Pointer → 主流数组", "xSPSM 随之进入 Disabled 态（首铃才走）"], pg: "p219–220 · p224",
      narr: "开流即换指针——Configure Endpoint 把 TR Dequeue Pointer 从传输环改指主流数组；首次门铃先经 Prime Pipe 再由设备转入 Idle（p220）。" },
    { kind: "box", at: "sw", lines: ["给流 n 的 Transfer Ring 挂 TD", "（UASP 例：流 ID 与命令绑定）"], pg: "p218–219",
      narr: "挂 TD=往那条流的传输环写 TRB；流是否 active 是 Device Class 职责——UASP 里门铃后 active、命令完成或 Abort Task 后 non-active（p219）。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写端点门铃 · DB Stream ID=流 n"], pg: "p220 · p223",
      narr: "DB Stream ID 指明这次门铃指向哪条流；xHC 不强制捕获它（可选特性 DSICV）——不捕获就得查 LCStream（USB3 §8.12.1.4.1 定义）的环是否为空（p221）。" },
    { kind: "box", at: "hc", lines: ["xSPSM：Idle 态按旗标去抖动", "IPPV=0 → Prime Pipe（每 Idle 一次）", "HID=0 且命中 → Move Data", "DBPV=1 回 Idle → 补发 Prime Pipe"], pg: "p220–221",
      narr: "去抖动判据（p221 算法）：IPPV 限每 Idle 一次 Prime Pipe；DBPV 补记非 Idle 期门铃；LFCV=1 或流 ID 未命中则退回 Prime Pipe；DSICV=0 时改查 LCStream 环空不空。" },
    { kind: "arrow", from: "hc", to: "dev", lines: ["Prime Pipe：宿主缓冲已更新/新增"], pg: "p220",
      narr: "Prime Pipe 是 xHC 对设备的通报——缓冲被改或被加，设备可据此启动或重启流活动（p220）。" },
    { kind: "box", at: "dev", w: 230, lines: ["设备定当前流 CStream", "按包头 Stream ID 选流", "包边界可随时切流", "共享管道：一条 Stall 全停"], pg: "p218–219",
      narr: "引文②：哪条流活跃由设备决定；全部流共用同一 bulk 管道——CStream 让管道 Stall，所有流一起停（p218）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备流控：NRDY(Stream n)", "LFCV 置位 → 不再主动搬数", "临时切流由设备稍后重新调度"], pg: "p221",
      narr: "NRDY(Stream n) 是设备流控信号——Move Data 因它退出时 LFCV 置位，xHC 不再为该流主动发数据；临时切流稍后由设备重新调度（ENT 正是为这种暂停设计的，见步 8）。" },
    { kind: "box", at: "hc", lines: ["保存流状态：TR Dequeue Ptr、DCS", "SEC=1 加存 Stopped EDTLA", "ENT=1 → 先执行 Event Data TRB 再存"], pg: "p218 · p227–228",
      narr: "引文③（p228 Note）：TD 末尾是 Event Data TRB 时，软件必须在最后一个传输 TRB 置 ENT——否则设备切走后 Event Data TRB 拖到下次调度才跑，等 TD 完成的软件被锁死。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Transfer Event 写事件环", "无归因 TRB → 指针/长度=0"], pg: "p218–219 · p222",
      narr: "回执走事件环；Prime Pipe 相关状态出的错没有可归因 TRB——事件给零指针，去向由 Slot Context Interrupter Target 指定的事件环（p222 Note）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["停止/撤流：Stop Endpoint（§3.3.8）", "Set TR Dequeue Pointer（§4.6.10）", "越界流 ID → Invalid Stream ID Error、停端点"], pg: "p223 · p225–226",
      narr: "停止流对流上下文的影响见 §3.3.8（p223 交叉引用）；Set TR Dequeue Pointer 命令越界的报错形态=完成码 TRB Error（p226 Note）。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（选流方：CStream 由它定）" },
    { t: "实线=命令/数据流 · 虚线=事件回执流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>流协议要点（§4.12 · 按条文归纳）</h2>
<table class="xsp-tb">
<tr><th>要点</th><th>内容</th><th>页</th></tr>
<tr><td><b>扩容上限</b></td><td>单 SS Bulk 端点最多 65533 条流；SID 0、FFFEh（Prime）、FFFFh（No Stream）保留；Linear 模式主数组 64K 项（末两项同为保留）</td><td class="mono">p218 脚注 39 · p225</td></tr>
<tr><td><b>选流权</b></td><td>流选择由 USB 设备驱动——可在包边界切流；xHC 按包内 Stream ID 索引流上下文数组取流上下文</td><td class="mono">p219 · p222</td></tr>
<tr><td><b>SID 编码（层级模式）</b></td><td>Stream ID 拆低位 PSID（索引主流数组）+ 高位 SSID（索引辅流数组）；分界由 MaxPStreams 定</td><td class="mono">p224</td></tr>
<tr><td><b>数组大小</b></td><td>主流数组 2<sup>MaxPStreams+1</sup> 项；开辅流时上限 256 项（MaxPStreams=7）；MaxPStreams ≤ 描述符 MaxStreams；实现上限由 HCCPARAMS1.MaxPSASize 定、辅流支持由 NSS 位定</td><td class="mono">p223–225</td></tr>
<tr><td><b>SCT 流上下文类型</b></td><td>主数组：SCT=1→传输环、SCT=2–7→辅流数组（容量随值编码）；辅数组内 SCT=0→传输环；辅流启用时主流数组 0 号项必须指辅数组（SCT>1）——SCT=0/1 未定义行为</td><td class="mono">p224–227</td></tr>
<tr><td><b>去抖动旗标</b></td><td>IPPV 限每个 Idle 态一次 Prime Pipe；DBPV 补记非 Idle 期门铃、回 Idle 立即补发；LFCV 记 NRDY(Stream n) 流控后禁主动搬数；DSICV 可选捕获 DB Stream ID</td><td class="mono">p220–221</td></tr>
<tr><td><b>HID</b></td><td>HID=1 禁主机主导 Idle→Move Data（设备全权选流）；xHC 也可因内部资源限制按 HID=1 运行</td><td class="mono">p221–222 · p223</td></tr>
<tr><td><b>越界检查</b></td><td>SID=0 或 ≥ 主数组大小 → Invalid Stream ID Error、停端点；SCT 不符 → Invalid Stream Type Error、停端点；TR Dequeue Ptr=0：SCT=环按空环拒（NoStream 响应）、SCT=辅数组报 Invalid Stream Type Error；Set TR Dequeue Pointer 命令越界 → 完成码 TRB Error</td><td class="mono">p225–227</td></tr>
<tr><td><b>共享管道</b></td><td>全部流共用同一 bulk 管道——CStream 停转（Stall）全体流一起停；无归因 TRB 的停转事件：TRB Pointer/Length=0、走 Slot Context Interrupter Target 指的事件环</td><td class="mono">p218–219 · p222</td></tr>
<tr><td><b>active 判定</b></td><td>空环或带外机制得知不会被选为 CStream = non-active；可靠判定属 Device Class 职责、无 xHCI 方法；进 Stopped 后 CStream 不暴露——非空环只能带外判</td><td class="mono">p219</td></tr>
</table></div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.11-trbs/index.html">§4.11 TRB（传输请求块）</a>——Event Data TRB 与 ENT 位定义；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃与 DB Stream ID 字段；<a href="../4.8-endpoint/index.html">§4.8 端点</a>——EP Context 的 MaxPStreams/HID 字段与 EP State。</p>
<p><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环与门铃取环；<a href="../4.17-interrupters/index.html">§4.17 中断器</a>——事件环去向（Slot Context Interrupter Target）。</p>
<p><a href="../../index.html">§4.6.10 Set TR Dequeue Pointer 命令（待建）</a>——撤流与越界报错入口；<a href="../../index.html">§6.2.3 Stream Context 数据结构（待建）</a>——PSID/SSID/SCT 位定义。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.12 p218–228 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
