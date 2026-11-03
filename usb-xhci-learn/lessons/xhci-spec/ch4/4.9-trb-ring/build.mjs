// §4.9 TRB 环 —— 互链型表格节（table_page.mjs 量产件；三环机制图不重造，链四机课 fig2/3/4）
// 判据：xHCI 1.2b §4.9 p149–170（4.9.1 p151 / 4.9.2 p152 / 4.9.3 p160 / 4.9.4 p161）；
// EHB/DESI 位判据取自 §5.5.2.3.3 p393（Table 5-42）。引文六条逐字。
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tablePage } from "../_gen/table_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.9 TRB 环 · xHCI 规范对照学习",
  navTitle: "§4.9 TRB 环",
  specRef: "xHCI 1.2b §4.9 TRB Ring（4.9.1 传输描述符 · 4.9.2 传输环管理 · 4.9.3 命令环管理 · 4.9.4 事件环管理）· p149–170",
  prevHref: "../4.8-endpoint/index.html", prevLabel: "§4.8 端点",
  nextHref: "", nextLabel: "",
  prose: [
    "一条 <b>TRB 环</b>＝TRB 数据结构的<b>循环队列</b>，在生产者与消费者之间传递工作项——Work Item 由 1 个以上 TRB 组成，既可以是「待执行的操作」，也可以是「已执行的结果」（p149–150）。环分三种——<b>传输环 / 事件环 / 命令环</b>——各自的 TRB 类型集互不通用，但共用同一套底层机制与 TRB 模板（p150）。方向一句话：传输环与命令环由驱动生产、xHC 消费；事件环倒过来，xHC 生产、驱动消费（规范原文称 system software（系统软件））。三环机制的动态画面本节不重造——四机课各有一台机器负责演示，互链卡逐一标注「哪个环节由哪台机器演示」。",
    "指针与位置标记：<b>传输环、命令环的 Enqueue / Dequeue 指针都不是物理寄存器</b>——xHC 与软件各自维护镜像副本（facsimile），入队位置由 Cycle bit 的翻转标记（p150 Note、p153）；<b>事件环只有出队指针是物理寄存器 ERDP</b>（Runtime 寄存器，p150 Note），入队指针 EREP 只是 xHC 内部变量（p164 Table 4-4）。初建或重初始化时全环 TRB 清 0，代表空队列（p151）；生产者按 PCS 值写 Cycle bit，消费者拿 CCS 比对——相等才可执行（p153、p157）。空＝Dequeue 等于 Enqueue；满＝Enqueue+1 等于 Dequeue，这个 +1 必须把 Link TRB 算进去（p151、p156）。",
    "条目与分段：<b>TD（传输描述符）＝1 个以上 TRB</b>，除最后一颗外全部置 Chain bit；命令/事件 TRB 没有 Chain bit，命令描述符与事件描述符单 TRB 成项（p151、p152 Note）。显式造一个零长 USB 事务＝单 Transfer TRB 且 Transfer Length=0（p151）。环可以分段：Link TRB 把多段连成一环，环可跨页、可动态伸缩，但不得跨 64KB 边界（p151、p154–155）；事件环的分段走<b>事件环段表（ERST）</b>，每段至少 16 个 TRB（p161–163）。命令环的独有约束：全规范只有一条命令环（§4.1 p68）、由 CRCR 管理（p150）、禁多 TRB TD（p160）。",
  ],
  quotes: [
    { en: "A TRB (Transfer Request Block) Ring defines a queue, which is used to transfer Work Items between producer and consumer entities",
      zh: "TRB 环就是一个队列——生产者与消费者之间传递工作项的通道。",
      src: "xHCI 1.2b §4.9 p149" },
    { en: "There are 3 basic types or TRB Rings; Transfer, Event, and Command. Each type of ring defines an exclusive set of TRB data structures; however they all employ the underlying TRB Ring mechanism to organize their work items and the basic TRB template.",
      zh: "环分三种：传输、事件、命令——TRB 类型集各自独占，底层机制与 TRB 模板共用。",
      src: "xHCI 1.2b §4.9 p150" },
    { en: "If the Dequeue Pointer equals the Enqueue Pointer, then the TRB Ring is empty. If the \"Enqueue Pointer + 1\" = Dequeue Pointer, then the ring is full.",
      zh: "空＝Dequeue 等于 Enqueue；满＝Enqueue+1 等于 Dequeue——+1 要把 Link TRB 算进去。",
      src: "xHCI 1.2b §4.9 p151" },
    { en: "The Cycle bit field in a TRB identifies the location of the Enqueue Pointer in a Transfer Ring, eliminating the need to define a physical Enqueue Pointer register.",
      zh: "Cycle bit 就是入队指针的位置标记——省掉一个物理 Enqueue 寄存器。",
      src: "xHCI 1.2b §4.9.2 p153" },
    { en: "If the Producer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its PCS flag. If the Consumer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its CCS flag.",
      zh: "遇 Toggle Cycle=1 的 Link TRB：生产者翻 PCS、消费者翻 CCS——回绕后双方的期望值各自翻转。",
      src: "xHCI 1.2b §4.9.2 p154" },
    { en: "A fundamental difference between an Event Ring and a Transfer or Command Ring is that the xHC is the producer and system software is the consumer of Event TRBs.",
      zh: "事件环与另两种环的根本差别：xHC 生产、系统软件消费。",
      src: "xHCI 1.2b §4.9.4 p161" },
  ],
  cards: [
    { h2: "三环对照表：生产者 / 指针寄存器 / 空 / 满 / 门铃",
      html: `<table class="xsp-tb">
<tr><th>环</th><th>生产者 → 消费者</th><th>指针的物理形态</th><th>空判据</th><th>满判据</th><th>门铃</th></tr>
<tr><td><b>传输环</b> Transfer Ring<br>（§4.9.2 p152–156）</td>
<td>驱动（host）→ xHC：producer (host) 在 Enqueue 处放、consumer (xHC) 在 Dequeue 处取（p152）；与 USB 管道 1:1（p150）</td>
<td>两根指针均非物理寄存器（p150 Note）；软件私有副本初值写进 Endpoint/Stream Context 的 TR Dequeue Pointer 字段（p153）；xHC 消费进度经 Transfer Event 的 TRB Pointer 字段报回（p153）</td>
<td>xHC 取 TRB 时见 Cycle bit 翻转 → 空（p153）</td>
<td>软件负责：推进 Enqueue 将等于 Dequeue 即满——不指向 Link TRB 时 +16 比对；指向时与 Ring Segment Pointer 比对（p156，总判据 p151）</td>
<td>设备上下文门铃（Doorbell 1–255，1:1 对应槽；DB Target/DB Stream ID 指明哪个传输环）——工作放上传输环后写（§4.7 p142）</td></tr>
<tr><td><b>命令环</b> Command Ring<br>（§4.9.3 p160–161）</td>
<td>驱动 → xHC；全规范仅一条命令环（§4.1 p68）</td>
<td>CRCR（Command Ring Control Register，Operational Registers，p150）；停机（CRR=0）时写 CRCR → 以 Command Ring Pointer 重载出队指针（p160）；消费进度经 Command Completion 事件上报（p160）</td>
<td>同传输环：Dequeue＝Enqueue，入队位置由 Cycle bit 翻转定义（p160）</td>
<td>管理其余方面与传输环一致（p160「All other aspects … identical」）</td>
<td>门铃寄存器 0，DB Target=0（Host Controller Command）（p160）</td></tr>
<tr><td><b>事件环</b> Event Ring<br>（§4.9.4 p161–170）</td>
<td>xHC → 驱动：根本差别在方向倒转（p161）；每个中断器各配一条事件环（p161）</td>
<td>仅出队指针是物理寄存器 ERDP（p150 Note、p161）；入队指针 EREP＝xHC 内部变量（p164 Table 4-4）</td>
<td>ERDP 所指 Event TRB 的 Cycle bit ≠ CCS → 环空；软件把 ERDP 写到该 TRB 地址宣告清空（p161 及其 Note）</td>
<td>xHC 侧：EREP+16＝ERDP 即满——特意留一格，给 Event Ring Full Error 腾位（p166–167 步 12–17、p167）</td>
<td>无门铃——xHC 写环后发中断，软件从中断处接着消费（p161）</td></tr>
</table>
<p>（TRB 统一规格：16 字节/颗（p151）；TRB 类型按环配额见规范 Table 6-91/6-92，p151 Note）</p>` },
    { h2: "Link TRB 与回绕要点表",
      html: `<table class="xsp-tb">
<tr><th>要点</th><th>规范判据</th><th>页码</th></tr>
<tr><td>段尾定则</td><td>Ring Segment 的最后一颗 TRB 恒为 Link TRB；Link TRB 提供 64 位 Ring Segment Pointer 指向下一段</td><td class="mono">p155</td></tr>
<tr><td>单段成环</td><td>环尾插一颗指回环首的 Link TRB 即成环；多颗 Link TRB 可把多个段连成一环</td><td class="mono">p154</td></tr>
<tr><td>出队推进</td><td>xHC 每取一颗 +16 字节；下一颗若是 Cycle bit 有效的 Link TRB → 出队指针自动跳到其 Ring Segment Pointer 指向的段首</td><td class="mono">p156</td></tr>
<tr><td>入队推进</td><td>软件每写一颗推进一次：+16，或遇 Link TRB 重载为 Ring Segment Pointer；每过环一圈靠写 Cycle bit 完成翻转</td><td class="mono">p153、p156</td></tr>
<tr><td>Toggle Cycle</td><td>Link TRB 的 Toggle Cycle=1：生产者翻 PCS、消费者翻 CCS；Cycle bit 翻转发生在 Link TRB 与其指向段的首 TRB 之间</td><td class="mono">p154、p158 Note</td></tr>
<tr><td>初始化</td><td>全环 TRB 的 Cycle bit 清 0（p151、p157）；PCS 与 CCS 置 1（p157）；传输环 CCS 初值取 Endpoint Context DCS、命令环取 CRCR 的 RCS、事件环恒 1（p157 Note）</td><td class="mono">p151、p157</td></tr>
<tr><td>几何边界</td><td>环可大于一页但不得跨 64KB 边界（p151）；Link TRB 使环可跨页、可动态伸缩（p154）；TR Dequeue Pointer 与 Link TRB 不要求对齐页首（p158 Note）</td><td class="mono">p151、p154、p158</td></tr>
<tr><td>增缩段</td><td>只许生产者改自己拥有的 Link TRB（p158 Note、p160）；扩段两法：新段 Cycle bit 全清 0 并改两端 Toggle Cycle 标志，或新段全置 1（p159–160）</td><td class="mono">p158–160</td></tr>
</table>` },
    { h2: "事件环管理要点表",
      html: `<table class="xsp-tb">
<tr><th>要点</th><th>规范判据</th><th>页码</th></tr>
<tr><td>事件环段表（ERST）</td><td>Base Address/Size 对的数组，每项定义一个段；ERST(0) 由 ERSTBA 指向；表项数＝ERSTSZ；0..ERSTSZ−1 的表项在 HCH=0 期间禁改</td><td class="mono">p161、p169 Note</td></tr>
<tr><td>段消费次序</td><td>xHC 按表项序填段，写入数超过 ERST.Size 即换下一段；ERST 本身按循环队列使用——取到 ERST(ERSTSZ−1) 后回绕 ERST(0)</td><td class="mono">p162</td></tr>
<tr><td>建环次序</td><td>先清 0 各段并填好 ERST 各项 → 写 ERSTSZ 与 ERDP（初值＝ERST(0).BaseAddress）→ 写 ERSTBA，事件环状态机进 Start 态；每段 Size ≥16</td><td class="mono">p162–163</td></tr>
<tr><td>ERDP 写法</td><td>写「最后处理的 Event TRB」地址（含「见失配即环空」情形）；两次连续写不得同值；尽量攒批——例如至少处理 4 条事件再写一次</td><td class="mono">p163、p165</td></tr>
<tr><td>EHB / DESI（ERDP 寄存器位）</td><td>EHB＝Event Handler Busy：IP 置 1 时硬件置 1，软件写 ERDP 时清 0（RW1C）；DESI＝出队所在段索引低 3 位，供 xHC 跳过查满加速入队</td><td class="mono">§5.5.2.3.3 p393（Table 5-42）</td></tr>
<tr><td>PCS / CCS</td><td>双方初值 1，各自回绕到环首时翻转；PCS 仅在事件环回绕到环首时翻转</td><td class="mono">p161、p164 Note</td></tr>
<tr><td>满的代价</td><td>判满留一格（p167）；主事件环满 → 全部命令/传输环停；副环满 → 可只停指向它的传输环；虚拟化下副环满不得拖停命令环/主环/其它副环（p168）；被堵的事件环可拖累其它事件环上端点的推进（p164 Note）</td><td class="mono">p164、p167–168</td></tr>
<tr><td>Primary / Secondary</td><td>MaxIntrs 定中断器数：0 号＝Primary，其余＝Secondary；副环只许 5 类事件 TRB（Transfer / Bandwidth Request / Device Notification / Host Controller / Vendor defined 可选）；Transfer TRB 的 Interrupter Target 非 0 即定向副环</td><td class="mono">p170</td></tr>
</table>` },
  ],
  linksHtml: `
<div class="xsp-card"><h2>互链 · 三环机制的机器演示（本节不重造）</h2>
<p>三环运转的动态画面已在四机课与机制课建成——本节三张对照表把规范条文钉回机器：</p>
<table class="xsp-tb">
<tr><th>本节环节</th><th>机器 / 课</th><th>演示什么</th></tr>
<tr><td>§4.9.2 传输环管理（规范图 4-6/4-7/4-8）</td><td><a href="../../../xhc-machines/fig2-transfer-ring/index.html">四机课 Fig2 环形分度轨道</a></td><td>传输环的生产与消费：Enqueue/Dequeue 双指针推进、Cycle bit 位置标记、Link TRB 回绕——图 4-6 Index Management 的动态版</td></tr>
<tr><td>§4.9.4 事件环管理</td><td><a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a></td><td>xHC 生产事件、软件比对 CCS 消费并写回 ERDP——事件环的方向与回绕</td></tr>
<tr><td>§4.9.3 命令环管理</td><td><a href="../../../xhc-machines/fig4-command-ring/index.html">四机课 Fig4 订单柜台</a></td><td>命令 TRB 投递、门铃 0（DB Target=0）、Command Completion 事件回执的全链</td></tr>
<tr><td>§4.9.1 传输描述符</td><td><a href="../../../0006-xhc-trb-parts.html">课 0006 · 先认零件：TRB、TD 与环的几何</a></td><td>TRB 模板、TD 由 TRB 拼装与 Chain bit 的拆解</td></tr>
<tr><td>§4.9.2 指针推进与 Cycle 位</td><td><a href="../../../0007-xhc-ring-keys.html">课 0007 · 环的运转：环机制与四个控制位</a></td><td>PCS/CCS 与 Cycle bit 的比对执行规则</td></tr>
<tr><td>§4.9.1–4.9.2 TD 全程</td><td><a href="../../../0009-xhc-transfer-drama.html">课 0009 · 一场传输的三视角走查</a></td><td>一颗 TD 从写入传输环到 Transfer Event 回执的全程三方走查</td></tr>
</table>
<p>前后节：<a href="../4.8-endpoint/index.html">§4.8 端点</a>——传输环由端点上下文（或 Stream Context Array）定义（p150）；<a href="../../index.html">§4.10 主机控制器 TRB 处理（待建）</a>——TRB 执行、错误与事件细节；<a href="../../index.html">§4.11 TRB（待建）</a>——TRB 模板与类型逐条展开。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.9 p149–170（EHB/DESI 位判据 §5.5.2.3.3 p393）· 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = tablePage(cfg);
// 窄幅适配补丁（构建期注入，不改 _gen/table_page.mjs；同 DESIGN 契约修订"构建期补丁"形态）：
// ≤900px 时表格卡内横向滚动（.xsp-tb display:block + overflow-x:auto），页面本体不出横向滚动条——
// 三环对照表 6 列的 min-content 宽 > 390px 视口，不补丁则 full-page 截图宽 631>390（DESIGN §1.8 390px 门）。
const NARROW_CSS = '<style>@media (max-width: 900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}</style>';
const patched = page.includes("</head>") ? page.replace("</head>", NARROW_CSS + "</head>") : page + NARROW_CSS;
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), patched);
console.log("wrote", name, (patched.length / 1024).toFixed(0) + " KB");
