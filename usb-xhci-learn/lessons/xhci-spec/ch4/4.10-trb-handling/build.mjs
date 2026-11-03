// §4.10 主机控制器 TRB 处理 —— 泳道节（生成器 lane_page.mjs 量产件；骨架版：机器形态留后续会话）
// 判据：xHCI 1.2b §4.10 p170–188（引文五条逐字）；Table 4-5 p178、Table 4-6 p183 逐行转写；
//   §4.10.4 IOC 条文 p187–188（规范无位组合表，组合语义表按条文归纳、每行带页码）
// 工艺：_gen/lane_page.mjs + anatomy kit pageHtml + shared/zoomfs.mjs（构建期内联，自包含）
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { lanePage } from "../_gen/lane_page.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";

const cfg = {
  theme: THEME,
  pageTitle: "§4.10 主机控制器 TRB 处理 · xHCI 规范对照学习",
  navTitle: "§4.10 主机控制器 TRB 处理",
  specRef: "xHCI 1.2b §4.10 Host Controller TRB Handling · p170–188 · §4.10.1 传输 TRB / §4.10.2 错误 / §4.10.3 事件 / §4.10.4 IOC 标志",
  prevHref: "../4.9-trb-ring/index.html", prevLabel: "§4.9 TRB 环",
  nextHref: "../4.11-trbs/index.html", nextLabel: "§4.11 TRB（传输请求块）",
  prose: [
    "传输执行是 xHC 的日常主业务：全配置 xHC 最多 255 台设备 × 每台 31 个端点 × 30 个端点可开 64K Streams——最坏约 <b>5 亿条传输环</b>，xHC 必须高效上报几百上千条环的完成状态，载体就是事件环上的 <b>Transfer Event TRB</b>。xHC 在一个 Transfer TRB 关联的传输完成时，评估完成状态与 TRB 标志，决定要不要为它生成事件：<b>IOC=1 就生成事件</b>，且事件一生成必伴随对宿主的中断；事件的 Completion Code 与 Length 字段如实回传源 TRB 的完成状态。（本页泳道「xHCI 驱动」即规范原文所称 system software（系统软件）。）",
    "三种结局、三种事件策略：<b>正常完成</b>只有 IOC=1 的 TRB 出事件（惯例是 TD 末 TRB 一枚，即 TD 完成事件）；<b>短包</b>（实际收到的字节少于 TRB 期望）只有在 ISP 或 IOC 置位的 TRB 上才出事件，Completion Code=Short Packet、Length=未写入数据缓冲的残余字节数，且 xHC 自动推进到下一 TD；<b>错误</b>无视 IOC/ISP 一律出事件，需停机的错误把端点打到 Halted、恢复要软件介入。<b>等时端点是例外族</b>：没有握手，从不停机——错误、未服务（Missed Service Error）、环空转（Ring Overrun/Underrun）都只出事件，随后继续下一 ESIT。",
    "§4.10.4 的通用规则一句话：IOC 置位就生成事件；想知道 TD 何时完成，就在 TD 末 TRB 置 IOC——那条事件同时宣告 TD 占用的环空间可回收。短包事件可用 BEI 压掉中断；软件也可借 IOC 做及时的 Dequeue Pointer 更新，缩短错误恢复时间。〔注记：<b>本节 anatomy 机器形态留后续会话——本页为流程骨架版</b>：主线流程+要点表，不做 §4.10.1.1 短传细则的位级展开。〕",
  ],
  quotes: [
    { en: "If upon transfer completion of a TRB the Interrupt On Completion (IOC) flag is set, the xHC shall generate a Transfer Event TRB.",
      zh: "IOC=1 是「必出事件」的最强信号——事件还必伴随对宿主的中断（同页 Note）。",
      src: "xHCI 1.2b §4.10.1 p170" },
    { en: "A Short Packet will trigger the generation of a Transfer Event TRB on the Event Ring if the Interrupt-on-Short (ISP) or Interrupt On Completion (IOC) flags are set in the TRB that the Short Packet was detected on.",
      zh: "短包不必然出事件——ISP/IOC 置位的 TRB 上才出；Length=残余字节数。",
      src: "xHCI 1.2b §4.10.1 p171" },
    { en: "The detection of an error during a USB transfer shall always generate a Transfer Event, irrespective of whether the Interrupt-on-Short Packet (ISP) or Interrupt On Completion (IOC) flags are set in the Transfer TRB.",
      zh: "错误是唯一无视标志组合的事件源——Completion Code 指明错误条件。",
      src: "xHCI 1.2b §4.10.2 p175" },
    { en: "All Transfer Ring error conditions force the state of the associated endpoint to Halted and require system software intervention to recover.",
      zh: "传输环错误一律停机等软件——例外是等时端点（同页：无握手、不停机）。",
      src: "xHCI 1.2b §4.10.2 p176" },
    { en: "The general rule for how the xHC should handle the IOC flag is simple: if the IOC flag is set, then generate an event.",
      zh: "IOC 语义的总纲：置位即出事件——例外（事件环满、PAE=0）见下方组合表。",
      src: "xHCI 1.2b §4.10.4 p187" },
  ],
  figNo: "Fig 4.10",
  figTitle: "一条传输 TRB 的主线：取 TRB → 执行 → 三分支 → 事件回环",
  figCaption: "主线一镜到底，正常/短包/错误以注记卡分支呈现；Transfer Event 回事件环，IOC 组合决定通知强度。骨架版——anatomy 机器形态留后续会话。",
  figAria: "主机控制器 TRB 处理三方时序图：取 TRB 执行、正常/短包/错误三分支、Transfer Event 与 IOC 组合决定中断",
  tourNarr: "总览模式：完整流程图。主线=取 TRB→执行→事件回环→软件分派；三个结局分支以注记卡呈现，每框角标规范页码。",
  steps: [
    { kind: "arrow", from: "sw", to: "hc", lines: ["组 TD 写入传输环（IOC 置于 TD 末 TRB）", "写端点门铃 → xHC 取 Transfer TRB"], pg: "p187",
      narr: "想知道 TD 何时完成，就必须在 TD 末 TRB 置 IOC（§4.10.4 p187）；门铃启动取环见 §4.7。" },
    { kind: "box", at: "hc", lines: ["执行传输：按 Max Packet Size 切包", "搬数据缓冲（IN 收 / OUT 发）", "TD Transfer Size=Σ各 TRB 的 Length"], pg: "p172–173",
      narr: "§4.10.1.1：IN 端点每 TD 排 ((TD Transfer Size−1)/MPS)+1 个包，除最后包外全满包；USB 包边界与 TRB 缓冲边界无对齐假设（p173 Note）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["分支① 正常完成：末 TRB 执行完", "IOC=1 → 生成 Transfer Event", "CC=Success · Length=已传字节数"], pg: "p175",
      narr: "TD 完成事件三来源之一（p175）；TD 内更早的 IOC 事件 CC 同为 Success、Data 类 Length=0。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["分支② 短包：收到 < 期望字节数", "ISP 或 IOC 置位的 TRB 上才出事件", "CC=Short Packet · Length=残余", "中间 TRB 短包 → xHC 自动推进到下一 TD"], pg: "p171",
      narr: "引文②；推进途中遇到的 Event Data TRB 按 IOC/PAE 解析（§4.10.1.1.1 p172–173）——细则留 §4.11 展开。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["分支③ 错误：无视 IOC/ISP 必出事件", "CC=错误码（Stall/XactErr/Babble…）", "需停机 → xHC 停在出错 TRB 上", "软件用 Set TR Dequeue Pointer 推进环"], pg: "p171",
      narr: "引文③（§4.10.2 p175）：错误分类与恢复见下方表格卡；Cycle 翻越处推进不动时，等下次门铃再推（p171 Note）。" },
    { kind: "arrow", from: "hc", to: "sw", ev: true, lines: ["Transfer Event TRB 写入事件环", "TRB Pointer=源 TRB 地址（Device ID/EP ID）", "兼作 xHC 最新 Dequeue Pointer"], pg: "p171",
      narr: "位置信息让软件定位设备/端点/TRB，并追平自己那份 Dequeue Pointer 副本（p171）；中断开启时突发靠 §4.17 中断节流抚平。" },
    { kind: "box", at: "hc", lines: ["事件生成 → 必伴随对宿主中断", "突发由中断节流吸收（§4.17）", "BEI=1：短包事件可免中断"], pg: "p170",
      narr: "「generation of an Event TRB always generates an interrupt to the host」（p170）；BEI 见 §4.10.4 p187。" },
    { kind: "box", at: "sw", lines: ["软件读事件环，按 CC 分派：", "Success → TD 完成，回收环空间", "Short Packet → 按残余收尾/续传", "错误 → 恢复流程（见下）"], pg: "p187",
      narr: "TD 完成事件宣告 TD 占用的传输环空间可回收（p187）；短包事件≠TD 完成——除非事件指向 TD 末 TRB（p171/p174）。" },
    { kind: "note", lanes: ["sw", "hc"], lines: ["停机恢复两步（以 Stall 为例）：", "① Reset Endpoint 命令：Halted→Stopped", "② 软件清设备侧 halt（控制端点=", "接受下一个 SETUP）→ 再写门铃重启"], pg: "p176–177",
      narr: "§4.10.2.1：先 Reset Endpoint 成功、再清设备侧 halt，最后才准写门铃重启环（p177 Note 顺序是强制的）；非控制管道的清 halt 走独立控制管道。" },
    { kind: "note", dev: true, lanes: ["dev"], lines: ["设备：只见 USB 事务与握手", "（STALL/NAK/短包的数据包）", "环/TRB/事件对设备不可见", "等时端点无握手——不出 Stall、不停机"], pg: "p176",
      narr: "三方视角：STALL 是设备在本流程里唯一主动抛出的信号；等时端点因无握手而不产生 Stall 错误（§4.10.2.1.1 p177）。" },
  ],
  legend: [
    { i: "var(--xsp-sw)", t: "xHCI 驱动" },
    { i: "var(--xsp-hc)", t: "xHC 控制器" },
    { i: "var(--xsp-dev)", t: "设备（经 USB 事务被动参与）" },
    { t: "实线=命令/数据流 · 虚线=事件回执流" },
  ],
  linksHtml: `
<div class="xsp-card"><h2>IOC/ISP/BEI 标志组合语义（§4.10.4 p187–188 · 按条文归纳）</h2>
<p>§4.10 本身没有位组合表（本节仅有的原文表格=Table 4-5 p178、Table 4-6 p183，见下一张卡）——下表逐条归纳 §4.10.1/§4.10.4 条文，每行附页码。</p>
<table class="xsp-tb">
<tr><th>标志组合</th><th>xHC 行为</th><th>页</th></tr>
<tr><td class="mono">IOC=1（任意 TRB）</td><td>该 TRB 完成即生成 Transfer Event——通用规则；例外=事件环满等</td><td class="mono">p187</td></tr>
<tr><td class="mono">IOC=1 在 TD 末 TRB</td><td>TD 完成事件：告知 TD 全部完成，占用的传输环空间可回收</td><td class="mono">p187</td></tr>
<tr><td class="mono">ISP=1 且 IOC=0（末 TRB）</td><td>收到短包才出事件（CC=Short Packet）；缓冲被收满则不出事件</td><td class="mono">p187</td></tr>
<tr><td class="mono">同一 TRB 同时置 ISP+IOC</td><td>ISP 冗余（但允许）——IOC 恒生成事件</td><td class="mono">p175 Note</td></tr>
<tr><td class="mono">BEI=1</td><td>Short Packet 事件不产生中断</td><td class="mono">p187</td></tr>
<tr><td class="mono">Event Data TRB IOC=1 · PAE=0</td><td>仅第一个 Event Data TRB 出事件；推进途中后续 Event Data TRB 的 IOC 被忽略</td><td class="mono">p188 Note</td></tr>
<tr><td class="mono">Link TRB IOC=1</td><td>出事件：CC=Success、TRB Transfer Count=0（TD 内所有 Link TRB 都被解析，p173）</td><td class="mono">p175</td></tr>
<tr><td class="mono">出错（任意标志组合）</td><td>必出事件：CC=错误码——错误不理会 IOC/ISP</td><td class="mono">p175</td></tr>
</table></div>
<div class="xsp-card"><h2>§4.10.2 错误分类要点（§4.10.2.1–4.10.2.8 · Table 4-5 p178 · Table 4-6 p183）</h2>
<table class="xsp-tb">
<tr><th>错误</th><th>触发</th><th>端点后果 / 恢复</th><th>页</th></tr>
<tr><td><b>Stall Error</b></td><td>设备回 STALL（USB2 PID / USB3 LMP）——function 不能收发或控制请求不支持；xHC 自己永不回 STALL</td><td>EP State→Halted；两步恢复：Reset Endpoint 命令 + 软件清设备侧 halt</td><td class="mono">p176</td></tr>
<tr><td><b>TRB Error</b></td><td>TRB 字段越界或格式错误——纯驱动侧错误</td><td>应迁移到 Error 态（§4.8.3）；实现也可直接 HCE</td><td class="mono">p177</td></tr>
<tr><td><b>USB Transaction Error</b></td><td>事务失败：CRC/DPP 错、Timeout、Bad PID（Table 4-5）</td><td>Isoch 立即报错不停机；其余 CErr 次重试后放弃并 Halted</td><td class="mono">p178</td></tr>
<tr><td><b>Babble Detected Error</b></td><td>设备发数超预期（TD/Frame/Packet Babble）</td><td>CC=Babble Detected Error+停机；Frame Babble 另禁根端口；不计 CErr</td><td class="mono">p179–180</td></tr>
<tr><td><b>Data Buffer Error</b></td><td>收超限/发欠载——主机内存访问延迟所致，不属事务错误</td><td>不计 CErr；非等时 IN 不回握手（逼重发）；OUT 故意损坏包尾</td><td class="mono">p180</td></tr>
<tr><td><b>Host System Error (HSE)</b></td><td>灾难性系统错误（PCI 奇偶错/Master Abort/Target Abort）</td><td>xHC 清 R/S 停止执行；双方认定系统完整性已失——可恢复的内部错误走 HCE（§4.24.1）</td><td class="mono">p181–182</td></tr>
<tr><td><b>等时端点通则</b></td><td>无握手——错误只以 Completion Code 报告（§4.10.2.8）</td><td>从不停机：推进下一 ESIT/TD；Missed Service Error / Ring Overrun / Ring Underrun 亦然</td><td class="mono">p176 · p183–186</td></tr>
</table>
<p>Table 4-5（p178 逐行转写）：USB2 CRC 或 USB3 DPP 错→重试 CErr→USB Transaction；Timeout→CErr（USB2）/N/A（USB3）→USB Transaction；USB2 Bad PID→CErr→USB Transaction；Babble→N/A→Babble Detected Error；Buffer Error→N/A→Data Buffer Error。</p>
<p>Table 4-6（p183 逐行转写，CErr 管理）：Transaction Error→减计数；Stalled / Data Buffer Error / Babble Detected→不减（停机类自动终止重试）；No Error→重置回 CErr（起始值 00b 除外）。另：Slot Context Speed=FS/LS 时禁编 CErr=0——组合未定义（p183 Note）。</p></div>
<div class="xsp-card"><h2>相关</h2>
<p><a href="../4.9-trb-ring/index.html">§4.9 TRB 环</a>——传输环/Cycle/链接 TRB 的取环机制；<a href="../4.7-doorbells/index.html">§4.7 门铃</a>——端点门铃启动取 TRB；<a href="../4.8-endpoint/index.html">§4.8 端点</a>——EP State（Running/Stopped/Halted/Error）与 CErr 字段。</p>
<p><a href="../4.17-interrupters/index.html">§4.17 中断器</a>——中断节流与事件环到向量的映射；<a href="../4.11-trbs/index.html">§4.11 TRB（传输请求块）</a>——Transfer Event TRB / Event Data TRB / PAE 位定义；<a href="../../../xhc-machines/fig3-event-ring/index.html">四机课 Fig3 回执登记机</a>——事件环的生产与消费。</p>
<p><a href="../../index.html">§4.11.4.7 Reset Endpoint 命令（待建）</a>——停机恢复第一步；<a href="../../index.html">§4.11.2.2 控制端点错误处理（待建）</a>——控制管道的恢复细则。</p></div>`,
  footLine: "判据：xHCI 1.2b（625472 Rev 1.2b）§4.10 p170–188 · 引文逐字核对，证据见 <a href=\"EVIDENCE.md\">EVIDENCE.md</a> · 生成于 2026-11-04",
};

const page = lanePage(cfg);
const name = THEME === "light" ? "index-light.html" : "index.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, (page.length / 1024).toFixed(0) + " KB");
