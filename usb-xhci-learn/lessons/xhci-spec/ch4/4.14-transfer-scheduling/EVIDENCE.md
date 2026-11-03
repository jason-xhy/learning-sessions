# EVIDENCE.md —— §4.14 传输环管理（2026-11-04，泳道节量产；骨架版）

**范围声明（骨架立法）**：本页为 §4.14 的**流程骨架版**——主线泳道 + 要点表格，
按 DESIGN.md §8 契约修订表 2026-11-04 行（机器候选节 4.10/4.12/4.14/4.15/4.19/4.23
本批先出流程骨架页，anatomy 机器形态留后续会话，用户过目后追认或打回）。
页内注记已按任务要求写入 prose 第 3 段与图注（figCaption）。

**页码范围实证（与任务派发单的偏差）**：任务面写「p232–252 跨 20 页」——实证 §4.14
实际为 **p232–251**：`4.15 Suspend-Resume` 节头在 p252（pagecheck PAGE-OK p252
`4.15 Suspend-Resume`；PyMuPDF 页标 14354 行亦在 PAGE 252 内），p232 顶部为 §4.13.5
收尾（FUNCTION_WAKE 句），§4.14 节头 p232 起。页面 specRef/footLine 按 p232–251 填写。

**小节头页码 TOC 实证**（/tmp/spec-audit-txt/xhci-1.2b.txt 目录区 awk）：
4.14→232、4.14.1→233、4.14.2→235、4.14.3→243、4.14.4→245——与 pypdf needle 逐条对上。

## 逐条断言 → 判据

| 断言（页内位置） | 判据 |
|---|---|
| 端点描述符（含 SS Companion）翻译成 Endpoint Context 的 Interval/MPS/Max Burst Size/Mult；xHC 用 MPS/Max Burst 管理 USB 事务 | §4.14 p232（PAGE-OK `System software shall translate`） |
| TD=不连续缓冲拼连续数据；TD Transfer Size=ΣTRB Transfer Length | §4.14 p232（PAGE-OK `sum of the TRB Transfer Length fields`） |
| IN 管道短包截断：退役该 TD、推进到下一 TD 或 Enqueue Pointer（Cycle 翻转）先到先算 | §4.14 p232（PAGE-OK `retire the TD that received the Short Packet`） |
| Active=在 Pipe Schedule 上/Inactive=不在；Running 态写门铃激活入表；环空或退出 Running 摘出；再写门铃重新入表（引文①） | §4.14 p232（PAGE-OK `considered Active when it is on the xHC`；引文逐字） |
| BI=一份单位总线带宽；Total Available Bandwidth 至少比标称速率低 20%；多根端口可共享一份 BI、映射对软件不可见 | §4.14 p232–233（PAGE-OK p232 `at least 20% lower`；共享句 p233） |
| 每 BI 典型两张 Pipe Schedule：周期（Isoch+Interrupt）/异步（Control+Bulk）（引文②） | §4.14.1 p233（PAGE-OK `two Pipe Schedules per Bus`；引文逐字） |
| SO=每过一遍表给每端点的一块搬包时间，内含 1–3 笔 USB 事务 | §4.14.1 p233（PAGE-OK p233 `General Scheduling Model` 同节） |
| MSOPC=(Max Burst Size +1)×(Mult + 1)；TDPC（部分/零长包计 1）；TRPC=ΣTDPC；SOPC 逐事务/重试递减、可<MSOPC、单端点在表时可超 | §4.14.1 p233–234（PAGE-OK p233 `(Max Burst Size +1) (Mult + 1)`、`The Transfer Descriptor Packet Count (TDPC)`） |
| 周期管道上限：SS/FS ≤90% 帧、HS ≤80% 微帧；剩余带宽归异步（Best Effort、延迟无界） | §4.14.1 p234 + §4.14.2 p236（PAGE-OK p236 `90% of any frame`；80% 句同段） |
| 系统总线带宽同法管理：Average TRB Length=平均 TD Transfer Size÷平均 TD 内 TRB 数（含 Link/No Op/Event Data）；初值 Control 8B/Interrupt 1KB/Bulk、Isoch 3KB；系统带宽不足 Configure Endpoint 被 Bandwidth Error/Secondary Bandwidth Error 拒 | §4.14.1.1 p234–235（PAGE-OK p234 `Average TRB Length`、p234 `Bandwidth Error`、p235 `Control endpoints would be 8B`） |
| ESIT=2^Interval×125µs、全对齐 MIT 边界；MFINDEX 按 MIT=125µs 推进 | §4.14.2 p235（PAGE-OK `ESIT = 2Interval * 125`） |
| Max ESIT Payload 三算法：USB2=MPS×(MaxBurst+1)；SS ISO Companion=0→wBytesPerInterval；=1→dwBytesPerInterval（SuperSpeedPlus）；Isoch TD 超 Max ESIT Payload→未定义行为 | §4.14.2 p236（PAGE-OK `Max ESIT Payload in Bytes`、`wBytesPerInterval`、`dwBytesPerInterval`、`Undefined behavior`）——**首轮误标 p235，pypdf 核对后改 p236**（见「坑」） |
| Reserved Bandwidth (MBytes/s)=Max ESIT Payload/(2^Interval×0.000125)；周期管道可常年用不满预留 | §4.14.2 p236（PAGE-OK `Reserved Bandwidth in MBytes/s`） |
| Max Allowed ESIT Payload 上限：FS Int 64B/FS Isoch 1KB/HS Int 3KB/HS Isoch 3KB/SS Int 3KB/SS Isoch 48KB | §4.14.2 p236（PAGE-OK `64B, 1KB, 3KB, 3KB, 3KB, and 48KB`） |
| Isoch：Active 时每 ESIT 恰处理一枚 Isoch TD（引文③）；每 SO 排包数=min(TDPC, MSOPC)；xHC 可在 ESIT 内任意时刻调度、TD 须有机会在 ESIT 内完成 | §4.14.2.1 p237 + §4.14.2 p236（PAGE-OK p237 `shall process one Isoch TD from`、`SOPC is set to the smaller of TDPC or MSOPC`；引文逐字） |
| Isoch 环空：IN→Ring Overrun、OUT→Ring Underrun，摘出周期表；再写门铃放回；TD 超 Max ESIT Payload→Bandwidth Overrun、截断推进且管道保持 Active | §4.14.2.1 p238（PAGE-OK `Overrun or Ring Underrun condition`、`Overrun Error shall be generated`（Bandwidth Overrun 句跨行）） |
| IST（HCSPARAMS2）=软件挂 TRB 必须领先 xHC 的最小时间量（引文④）；bit[3]=0→IST[2:0] 微帧/=1→帧；值 2=提前 2 微帧；软件读 MFINDEX 恒加 1 微帧；违反 IST→部分成形 Isoch TD=未定义行为 | §4.14.2.1.4 p242（PAGE-OK `Isochronous Scheduling Threshold`、`no later than 2 microframes`；引文逐字） |
| Interrupt：Interval 作节流/截止参数；空闲后首笔事务最迟 IST+ESIT；建议 ≤1 TD/ESIT；TD Transfer Size 可超 Max ESIT Payload（跨多 ESIT）；每 ESIT 恰一个 SO；短包终止 IN TD、下一 TD 等下一 ESIT；意外 ERDY 静默丢弃 | §4.14.3 p243（PAGE-OK `equal to IST + ESIT`、`single SO per ESIT`、`silently dropped`） |
| Interrupt 重试：重试可用满 MSOPC；超额不得影响其它端点已保证带宽 | §4.14.3 p243（同页 Note 段） |
| SS Interrupt 流控：NRDY→xHC 无限期等 ERDY、超时归软件；ESIT*2=ERDY 到 OUT DP/IN TP 调度的最大时延 | §4.14.3.2 p244–245（PAGE-OK p244 `indefinitely for a ERDY`） |
| 异步：round-robin 轮转保公平（引文⑤）；Max Service Transfer Size=MPS×(MaxBurst+1)；被周期传输打断→记住下一个该轮的管道；执行顺序 xHC 自定 | §4.14.4 p245（PAGE-OK `round-robin`、`Max Service Transfer Size`、`retain an identifier`；引文逐字） |
| 异步多端点限 MSOPC、仅剩一个端点可连续流；控制传输每个 Stage=独立 Async TD 可分属不同 SO | §4.14.4 p246（PAGE-OK `continuously stream packets`、`different Async TD`） |
| 异步 SS 流控（Deferred）：非 Isoch 端点内部标记流控、等 ERDY 回 Pipe Schedule | §4.14.4.1 p251（PAGE-OK `wait for an ERDY`） |
| TD Residue=TD Transfer Size−MPS×ROUNDDOWN(TD Transfer Size/MPS)——决定 TD 末包尺寸 | §4.14.4.1 p251（PAGE-OK `TD Residue`） |
| §4.14 章节范围=p232–251（§4.15 节头在 p252） | PAGE-OK p232 `4.14 Managing Transfer Rings` + PAGE-OK p252 `4.15 Suspend-Resume` |
| 设备视角：调度全在主机侧，设备只见 USB 事务（DP/TP/ACK/NRDY/ERDY/STALL） | §4.14.3/§4.14.3.2 p243–245（事件响应表语境；Table 4-8/4-9 的 Endpoint Response 列） |

## 门输出（2026-11-04 实跑）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py` 两批共 **25 needle**（第一批 20 条含 5 个小节头+§4.15 边界；第二批 5 条公式/断言补充）→ 末行 **PAGECHECK-PASS**。
   （首轮 3 条 MISS=pypdf 与 PyMuPDF 断行位置不同（`per Bus \nInstance`/`Ring \nOverrun`/`wait \nindefinitely`），改行内短 needle 后全过——与 brief「避 PDF 断行」判据一致。）
   TOC 实证：awk 抽出 4.14.1→233 / 4.14.2→235 / 4.14.3→243 / 4.14.4→245，与 needle 对上。
2. 语言门：`python3 scripts/scan_words.py retired`（dark/light 各跑）→ total=7 `{回执:6, 泳道:1}` ⊆ 豁免集 {回执,柜台,泳道}。
3. 交互冒烟：`python3 scripts/xhci_spec_lane_smoke.py lessons/xhci-spec/ch4/4.14-transfer-scheduling 10` →
   `[dark] PASS console=0` / `[light] PASS console=0` → **LANE-SMOKE-PASS**（步进计数 3/10 对、aria-pressed 对、复位回总览对）。
4. 自包含：`grep -c 'http://\|https://'` = 2（dark）/ 2（light），命中全为 SVG xmlns（`http://www.w3.org/2000/svg`）。
5. 互链：相对链接目标 10 个（两页同集），EVIDENCE.md 落盘后 missing=0（4.7/4.8/4.9/4.10/4.13/4.16/4.17 各节 + 板块 index + fig3 机器 + 本 EVIDENCE）。

## shots 清单（scripts/xhci_spec_lane_smoke.py 自动落盘）

- shots/lane-overview-dark.png / lane-overview-light.png（总览全景）
- shots/lane-step2-dark.png / lane-step2-light.png（步进第 3 步态）
- shots/lane-step-end-dark.png / lane-step-end-light.png（步进末态）

## 已知边界（骨架范围声明）

1. **机器形态缺位**：本节在机器候选清单内，anatomy 机器留后续会话；页内 prose 第 3 段
   〔注记〕+ 图注已如实标注「本页为流程骨架版」。
2. **逐速度细则从简**：§4.14.2.1.1（HS wMaxPacketSize 拆位/Multiplier、TD Payload Length
   寄存器、Isoch Buffer Overrun）、§4.14.2.1.3（SS Mult 0–2、Delta Time 计数器、ITP/ITS、
   IN ACK TP 发不出→Data Buffer Error 等 bullet 群）、§4.14.2.1.2（Missed Service Error
   触发条件）只在泳道/表格卡点到，不入位级展开——留 §4.11 TRB 节语境。
3. **Table 4-8/4-9 不逐行转写**（USB2 p246–248 / USB3 p248–250 按 Endpoint Response 的
   Pipe Action 表）：只在对比表注记中给页码与用途；Note 8-1/8-2（Stall/Babble→Halted）与
   脚注 46–51 未转写。
4. **MFINDEX Wrap Event / EU3S 省电行为未展开**（p237）——属 MFINDEX 细节，待建
   §4.11.2.5/§5.4.1 语境展开；本页只刻 MFINDEX 按 MIT 推进与 Frame/µFrame 分区事实不画。
5. **§4.14.4.1 Burst Transaction 超时三 Note（tHostTransactionTimeout/tHostACKResponse/
   重试限幅）未展开**（p251）——只入「Deferred→等 ERDY」一行。
6. IST 取值「值 2=提前 2 微帧」是规范自举例（p242），表格卡照录；Missed Service Error
   持续时可自选更大 IST 值的建议（p242 Note）未入页。

## 坑（施工实录）

1. **p236/p235 页界误标**：PyMuPDF 提取文本的 PAGE 235 标在 §4.14.2 节头后约 19 行，
   Max ESIT Payload 三公式与 Reserved Bandwidth 公式实际在 p236——首轮表格卡把这 4 行
   标成 p235，pypdf 复核（`Max ESIT Payload in Bytes`/`Reserved Bandwidth in MBytes/s`
   在 p235 文本中不存在、p236 存在）后当场改 p236。教训：**公式块/居中块的页码必须
   单独 needle 实证，不能从邻近行推断**。
2. **pypdf≠PyMuPDF 断行**：pagecheck 用 pypdf，/tmp 提取文本用 PyMuPDF——同一句话
   断行位置不同，跨行 needle 会假阴性（首轮 3 例）。判据：needle 必须在 pypdf 单行内。
3. zsh 下 `echo == light ==` 触发 `=` 命令路径展开报错（echo 参数含裸 `==`）——引号包住
   或换措辞；与全局规则 zsh 等号展开条一致。
