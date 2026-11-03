// §4.14 传输环管理 —— 泳道节（生成器 lane_page.mjs 量产件；骨架版：机器形态留后续会话）
// 判据：xHCI 1.2b §4.14 p232–251（引文五条逐字）；§4.14.1 p233 / §4.14.1.1 p234 /
//   §4.14.2 p235 / §4.14.2.1 p237 / §4.14.2.1.4 IST p242 / §4.14.3 p243 / §4.14.4 p245 /
//   §4.14.4.1 p251；Table 4-8 p246–248、Table 4-9 p248–250 只入注记不逐行转写
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.14 传输环管理 · xHCI 规范对照学习",
  navTitle: "§4.14 传输环管理",
  specRef: "xHCI 1.2b §4.14 Managing Transfer Rings · p232–251 · §4.14.1 General Scheduling Model p233 / §4.14.2 Periodic Transfer Ring Scheduling p235 / §4.14.3 Interrupt Transfer Ring Scheduling p243 / §4.14.4 Asynchronous Transfer Ring Scheduling p245",
  prevHref: "../4.13-device-notifications/index.html", prevLabel: "§4.13 设备通知",
  nextHref: "", nextLabel: "",
  prose: [
    "本节是 xHC 与传输环打交道的总纲：软件（本页「xHCI 驱动」即规范原文所称 system software（系统软件））把设备端点描述符（含 SuperSpeed Endpoint Companion 描述符）翻译成 Endpoint Context 的 <b>Interval、Max Packet Size、Max Burst Size、Mult</b> 四个字段，xHC 用它们安排 USB 事务；TD 允许把不连续的主机内存缓冲拼成一段连续数据，<b>TD Transfer Size=TD 内全部 TRB 的 Transfer Length 之和</b>，IN 管道可被设备以 Short Packet 截断——xHC 退役该 TD 并推进到下一 TD 或 Enqueue Pointer（Cycle bit 翻转处），先到先算。端点是否被服务由 <b>Pipe Schedule</b>（调度表）决定：<b>Active=在表上、Inactive=不在表上</b>——Running 态端点被写门铃即激活入表，环空或退出 Running 即被摘出，再写一次门铃可重新入表。",
    "调度按 <b>Bus Instance（BI）</b> 组织：一个 BI 代表一份该速度下的单位总线带宽，Total Available Bandwidth 按经验至少比标称速率低 20%，且多个根集线器端口可共享一份 BI（映射对软件不可见）。xHC 每个 BI 典型维护<b>两张 Pipe Schedule</b>——周期表（Isoch+Interrupt）与异步表（Control+Bulk）；每过一遍表，每个端点拿到一个 <b>Service Opportunity（SO）</b>：一块用于搬包的时间，内含 1–3 笔 USB 事务，最多排 MSOPC=(Max Burst Size+1)×(Mult+1) 个 DP。周期管道由 Address Device / Configure Endpoint 命令严格看管，占用不超过 Total Available Bandwidth 的限定百分比（SS/FS 每帧 ≤90%、HS 每微帧 ≤80%，p236），剩下的带宽全归异步管道——异步端点是 <b>Best Effort</b>，投递延迟无上界。系统总线带宽也按同一思路管理：Average TRB Length 是关键指标，系统带宽不足时 Configure Endpoint 同样会被 Bandwidth Error 拒绝（§4.14.1.1 p234）。",
    "三类端点的差异集中在<b>服务时机</b>：Isoch 端点 Active 时 xHC <b>每 ESIT 恰好处理一枚 Isoch TD</b>（ESIT=2^Interval×125µs，全对齐 MIT 边界），软件挂 TRB 必须领先 xHC 至少 IST（HCSPARAMS2 里的等时调度提前量）；Interrupt 端点把 Interval 当节流/截止参数，每 ESIT 一个 SO、空闲后首笔事务最迟 IST+ESIT 内上总线，TD 可以超过 Max ESIT Payload 而跨多个 ESIT 完成；Bulk/Control 走异步表 <b>round-robin 轮转</b>——多端点时每个 SO 限 MSOPC 个包，只剩一个端点时可连续流。〔注记：<b>本节 anatomy 机器形态留后续会话——本页为流程骨架版</b>：主线流程+要点表；§4.14.2.1.1–4.14.2.1.3 逐速度细则（HS Multiplier、SS Mult、TD Payload Length 寄存器）与 Table 4-8/4-9 逐响应动作表不入本页。〕",
  ],
  quotes: [
    { en: "An endpoint is considered Active when it is on the xHC’s Pipe Schedule, and Inactive if it is not. Ringing the Doorbell of an endpoint in the Running state will activate it, and the xHC shall place the endpoint in its Pipe Schedule.",
      zh: "在表=Active、摘出=Inactive；激活与重新激活都由写门铃触发——门铃是软件驱动调度表的唯一入口。",
      src: "xHCI 1.2b §4.14 p232" },
    { en: "An xHC will typically maintain two Pipe Schedules per Bus Instance, one for periodic pipes (Isoch and Interrupt endpoints) and another for async pipes (Control and Bulk).",
      zh: "每个 BI 一张周期表、一张异步表——三类端点由此分道。",
      src: "xHCI 1.2b §4.14.1 p233" },
    { en: "If an Isoch Endpoint Context is Active, the xHC shall process one Isoch TD from its Transfer Ring each ESIT.",
      zh: "等时调度的节拍器：每 ESIT 恰一枚 Isoch TD；环里没 TD 可取就报 Ring Overrun（IN）/Ring Underrun（OUT）并摘出周期表（p238）。",
      src: "xHCI 1.2b §4.14.2.1 p237" },
    { en: "The value of this field indicates to system software the minimum distance (in time) that it is required to stay ahead of the host controller while adding TRBs in order to have the host controller process them at the correct time.",
      zh: "IST 是软件必须领先 xHC 的最小时间量——不满足会遇到部分成形的 Isoch TD（未定义行为，p242 Note）。",
      src: "xHCI 1.2b §4.14.2.1.4 p242" },
    { en: "To ensure fairness across the pipes in the async schedule, the xHC shall schedule Service Opportunities for each Async Pipe using a round-robin algorithm.",
      zh: "异步侧的公平由规范强制：round-robin 轮转，每过一遍表一个 SO。",
      src: "xHCI 1.2b §4.14.4 p245" },
  ],
  figNo: "Fig 4.14",
  figTitle: "三类端点的调度主线：写门铃 → 入调度表 → 服务时机 → 事件回执",
  figCaption: "同一入场主线（翻译上下文→组 TD→写门铃→入表），差异在服务时机：Isoch 每 ESIT 一 TD、Interrupt 每 ESIT 一 SO、异步 round-robin；事件按完成码回事件环。骨架版——anatomy 机器形态留后续会话。",
  figAria: "传输环管理三方时序图：写门铃激活端点、周期/异步两张调度表、三类端点服务时机与 Transfer Event 回执",
  tourNarr: "总览模式：完整流程图。三类端点（Isoch/Interrupt/Bulk+Control）共用同一条入场主线，分道处在服务时机——每框角标规范页码。",
  steps: [
    { kind: "box", at: "sw", lines: ["翻译端点描述符 → Endpoint Context", "Interval / MPS / Max Burst Size / Mult", "组 TD 上传输环", "TD Transfer Size=ΣTRB Transfer Length"], pg: "p232",
      narr: "软件侧入场：描述符字段翻译进端点上下文（§6.2.3，待建）；TD 把不连续内存缓冲拼成连续数据块，TD Transfer Size=TD 内全部 TRB 的 Transfer Length 之和。" },
    { kind: "arrow", from: "sw", to: "hc", lines: ["写端点门铃（Running 态端点）", "→ 入 Pipe Schedule=Active"], pg: "p232",
      narr: "引文①：Active=在调度表上；环空或退出 Running 即被摘出（Inactive），再写一次门铃可重新入表——门铃语义对三类端点通用。" },
    { kind: "box", at: "hc", lines: ["按 Bus Instance 排两张调度表", "周期表=Isoch+Interrupt 端点", "异步表=Control+Bulk 端点"], pg: "p233",
      narr: "引文②：每 BI 典型两张 Pipe Schedule。BI=一份单位总线带宽；Total Available Bandwidth 至少比标称速率低 20%，多根端口可共享一份 BI 且映射对软件不可见（p232–233）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["服务时机三类对比：", "Isoch——每 ESIT 处理一枚 Isoch TD（§4.14.2.1）", "Interrupt——每 ESIT 一个 SO，Interval 作节流/截止参数（§4.14.3）", "Bulk/Control——异步表轮转，每过一遍表一个 SO（§4.14.4）"], pg: "p237/243/245",
      narr: "三类端点共用入场主线，分道处在服务时机：周期侧按 ESIT 定拍，异步侧 Best Effort 轮转。" },
    { kind: "box", at: "hc", lines: ["Service Opportunity（SO）内搬包", "MSOPC=(Max Burst Size+1)×(Mult+1)", "SOPC=本 SO 实际排包数≤MSOPC"], pg: "p233–234",
      narr: "SO 是分给端点的搬包时间块，内含 1–3 笔 USB 事务；SOPC 逐事务/重试递减、归零即轮到下一端点（p233）；表中仅一个端点时 SOPC 可超 MSOPC 连续流（p233–234）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["Isoch 定拍：ESIT=2^Interval×125µs", "对齐 MIT 边界（MFINDEX 每 125µs 推进）", "挂 TRB 须领先 xHC ≥IST（HCSPARAMS2）", "带宽按 Max ESIT Payload 预留"], pg: "p235–242",
      narr: "引文③：Active 的 Isoch 端点每 ESIT 取一枚 TD（p237）；IST 编码 bit3=0 单位微帧 / bit3=1 单位帧（p242）；预留公式=Max ESIT Payload/(2^Interval×0.000125) MB/s（p236）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["Bulk/Control：Best Effort", "round-robin 轮转，每过一遍表一个 SO", "Max Service Transfer Size=MPS×(Max Burst Size+1)", "被周期传输打断 → 记住下一个该轮的管道"], pg: "p245–246",
      narr: "引文⑤：公平靠 round-robin 强制（p245）；多端点时限 MSOPC、仅剩一个端点时可连续流（p246）；被打断也要记住下一个该轮谁（p245）。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Transfer Event 写入事件环", "Ring Overrun/Underrun · Missed Service Error", "Bandwidth Overrun · Short Packet…按完成码报"], pg: "p232 · p238",
      narr: "事件回执：环空即摘出调度表并出 Ring Overrun（IN）/Ring Underrun（OUT）（p238）；TD 超 Max ESIT Payload 出 Bandwidth Overrun、截断推进且管道保持 Active（p238）；HS/FS 微帧结束前没跑完出 Missed Service Error（p240）。" },
    { kind: "box", at: "sw", lines: ["软件读事件环分派", "TD 完成 → 退役并回收环空间", "环空的端点：再写门铃重新入表"], pg: "p232 · p238",
      narr: "引文①收尾：Overrun/Underrun 后写端点门铃即放回周期表（p238）；IN 侧短包截断 TD（p232），ISP/IOC 置位的 TRB 上出 Short Packet 事件（p232）。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：只见 USB 事务", "DP/TP、ACK/NRDY/ERDY、STALL", "Pipe Schedule / SO / ESIT / IST", "都是 xHC 内部概念"], pg: "p243–245",
      narr: "三方视角：调度全在主机侧，设备以事务响应参与——SS 中断端点 NRDY 流控后 xHC 无限期等 ERDY、超时归软件管（p244），意外 ERDY 静默丢弃（p243）。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（经 USB 事务被动参与）" },
    { t: "实线=命令/数据流 · 虚线=事件回执流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>三类端点调度对比（§4.14.1–4.14.4 · 按条文归纳，每行带页码）</h2>
<table class="xsp-tb">
<tr><th>端点类型</th><th>调度时机（服务节奏）</th><th>带宽来源</th><th>门铃语义</th><th>页</th></tr>
<tr><td><b>Isoch（周期）</b></td><td>Active 时每 ESIT 恰处理一枚 Isoch TD；xHC 可在 ESIT 内任意时刻调度，但整个 TD 须有机会在 ESIT 内完成；每 SO 排包数=min(TDPC, MSOPC)；环空→摘出周期表</td><td>按 Max ESIT Payload 预留（Reserved Bandwidth 公式）；SS/FS ≤90% 帧、HS ≤80% 微帧</td><td>写门铃激活入表；Ring Overrun/Underrun 摘出后再写门铃放回周期表</td><td class="mono">p235–242</td></tr>
<tr><td><b>Interrupt（周期）</b></td><td>每 ESIT 恰一个 SO；空闲端点被写门铃后首笔事务最迟 IST+ESIT 上总线；应 ≤1 TD/ESIT 且每 ESIT ≤1×Max ESIT Payload（TD 可跨多个 ESIT）；短包终止 IN TD、下一 TD 等下一 ESIT</td><td>同周期预留口径；重试可用满 MSOPC，超额不得影响其它端点已保证的带宽</td><td>写门铃激活入表（首笔事务时限 IST+ESIT）；SS 侧 NRDY 流控后等设备 ERDY</td><td class="mono">p243–245</td></tr>
<tr><td><b>Bulk / Control（异步）</b></td><td>Best Effort、round-robin 轮转，每过一遍异步表一个 SO；多端点时每 SO 限 MSOPC 个包，仅剩一个端点可连续流；控制的每个 Stage 是独立 Async TD、可分属不同 SO</td><td>无预留——只用周期管道未占用的带宽（p234）</td><td>通用语义：Running 态端点写门铃激活/重新激活（p232）；SS 流控（Deferred）端点等 ERDY 回表（p251）</td><td class="mono">p245–251</td></tr>
</table>
<p>注：IST 约束（Isoch 挂 TRB 至少提前 IST）与 Interrupt 首笔事务的 IST+ESIT 上限同出 HCSPARAMS2 的 IST 字段（p242）；Table 4-8（USB2，p246–248）/ Table 4-9（USB3，p248–250）给出按端点响应的逐行 Pipe Action，本页不逐行转写。</p>
</div>
<div class="xsp-card"><h2>调度关键量与公式（每行带页码；PDF 提取把上标扁平化，指数以 ^ 标注）</h2>
<table class="xsp-tb">
<tr><th>量 / 公式</th><th>语义</th><th>页</th></tr>
<tr><td class="mono">MSOPC = (Max Burst Size +1) × (Mult + 1)</td><td>一个 SO 内 xHC 最多排的 DP 数（由端点上下文字段决定）</td><td class="mono">p233</td></tr>
<tr><td class="mono">TDPC</td><td>搬完一个 TD 所需包数——部分包或零长包也计 1</td><td class="mono">p233</td></tr>
<tr><td class="mono">TRPC</td><td>环上全部 TD 的 TDPC 之和</td><td class="mono">p233</td></tr>
<tr><td class="mono">SOPC</td><td>一个 SO 实际排的包数：SO 起点初始化、逐事务/重试递减，归零即转下一端点；可小于 MSOPC，表中仅一个端点时可超</td><td class="mono">p233–234</td></tr>
<tr><td class="mono">ESIT = 2^Interval × 125 µs</td><td>端点服务间隔时间——全部对齐 MIT 边界（MFINDEX 按 MIT=125µs 推进）</td><td class="mono">p235</td></tr>
<tr><td class="mono">Max ESIT Payload（USB2）= Max Packet Size × (Max Burst Size + 1)</td><td>每 ESIT 最大周期载荷（USB2 周期端点的软件算法）</td><td class="mono">p236</td></tr>
<tr><td class="mono">Max ESIT Payload（SS · ISO Companion=0）= wBytesPerInterval</td><td>取自 SuperSpeed Endpoint Companion 描述符</td><td class="mono">p236</td></tr>
<tr><td class="mono">Max ESIT Payload（SS · ISO Companion=1）= dwBytesPerInterval</td><td>取自 SuperSpeedPlus Isochronous Endpoint Companion 描述符</td><td class="mono">p236</td></tr>
<tr><td class="mono">Reserved Bandwidth (MBytes/s) = Max ESIT Payload / (2^Interval × 0.000125)</td><td>周期端点的带宽预留计算——可以常年用不满</td><td class="mono">p236</td></tr>
<tr><td class="mono">Max Allowed ESIT Payload 上限</td><td>FS Interrupt 64B · FS Isoch 1KB · HS Interrupt 3KB · HS Isoch 3KB · SS Interrupt 3KB · SS Isoch 48KB</td><td class="mono">p236</td></tr>
<tr><td class="mono">IST 编码（HCSPARAMS2）</td><td>bit[3]=0 → 不晚于 IST[2:0] 微帧；bit[3]=1 → 不晚于 IST[2:0] 帧（值 2=提前 2 微帧；软件读 MFINDEX 后恒加 1 个微帧扣读延迟）</td><td class="mono">p242</td></tr>
<tr><td class="mono">Max Service Transfer Size = Max Packet Size × (Max Burst Size + 1)</td><td>异步管道一个 SO 最多搬的数据量；不足一个 TD 时分多个 SO 搬</td><td class="mono">p245</td></tr>
<tr><td class="mono">TD Residue = TD Transfer Size − Max Packet Size × ROUNDDOWN(TD Transfer Size / Max Packet Size)</td><td>TD 末包尺寸——xHC 拼接 TRB 缓冲，除末包外全按 Max Packet Size 搬</td><td class="mono">p251</td></tr>
<tr><td class="mono">Average TRB Length</td><td>系统总线带宽指标=平均 TD Transfer Size ÷ 平均 TD 内 TRB 数（含 Link/No Op/Event Data）；初值参考 Control 8B / Interrupt 1KB / Bulk、Isoch 3KB</td><td class="mono">p234–235</td></tr>
</table></div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃寄存器与 DB Target；<a href="../4.8-endpoint/index.html">§4.8 端点</a>——Endpoint Context 的 Interval / Max Burst Size / Mult / CErr 字段；<a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环与 Cycle 翻转；<a href="../4.10-trb-handling/index.html">§4.10 TRB 处理</a>——Transfer Event 与短包/错误分支。</p>
<p><a href="../4.16-bandwidth-management/index.html">§4.16 带宽管理</a>——Configure Endpoint 预留与 Bandwidth Error；<a href="../4.17-interrupters/index.html">§4.17 中断器</a>——事件回执到中断的通路；<a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费。</p>
<p><a href="../../index.html">§4.11.2.5 等时调度的 MFINDEX 用法（待建）</a>；<a href="../../index.html">§5.3.4 HCSPARAMS2（待建）</a>；<a href="../../index.html">§6.2.3.8 Max ESIT Payload（待建）</a>。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.14 p232–251 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
