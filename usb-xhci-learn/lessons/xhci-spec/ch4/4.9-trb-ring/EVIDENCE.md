# EVIDENCE.md —— §4.9 TRB 环（2026-11-04，互链型表格节量产）

节目录：`lessons/xhci-spec/ch4/4.9-trb-ring/`（build.mjs + index.html dark + index-light.html light + shots/）。
呈现类型：表格节（`_gen/table_page.mjs`）＋互链卡——三环机制图不重造，链四机课 fig2/3/4 与机制课 0006/0007/0009（板块 index.html 4.9 行既定口径「互链四机 fig2/3/4 不重造」；**2026-11-05 起本节已自建机器、互链停用——见文末自含化段**）。

**形态**：全定制 build.mjs（照 4.12-streams 先例；prose 3 段/引文 6 条/三张对照表逐字移植自旧 table_page 量产件——仅三处例外：prose 第 1 段尾句改指本节机器、linksHtml 数据段删除、footLine 日期 2026-11-05）。机器＝「环运转台」：9 槽环形卡柜（8 数据 TRB 槽 + 第 9 槽 Link TRB，槽 0 在前、Link 在前左与槽 0 相邻——照 Figure 4-6 布局）悬在四柱上；中央立柱顶出双针＝两根指针（压卡头针＝Enqueue、取卡钳针＝Dequeue，配重臂+角色盾牌；事件环模式盾牌蓝金互换＝方向反转）；卡顶翻牌＝Cycle bit；环内侧点列＝回绕路径（Link→槽0，live 点亮）；前低控台＝模式三键（传输/命令/事件）+ Enq/Deq/PCS/CCS 读数窗 + 空/满窗；左文书台（xHCI 驱动·蓝：TD 卡堆/事件匣/门铃 DB Target）；右总控台（xHC·金：CRCR/ERDP 寄存器牌/中断灯）；通知缆一根（门铃去程/完成事件与中断回程/写 ERDP 去程）承担全部跨台信号。13 帧三模式（传输 F0–F8 / 命令 F9–F10 / 事件 F11–F12），`window.__fig49 = { playTo, pause, stateOf, frameOf, cycleMode }`。

## 逐条断言 → 判据

| 断言（页内位置） | 判据 |
|---|---|
| TRB 环＝TRB 循环队列，在生产者/消费者间传 Work Item；Work Item=1+ TRB（要义段 1） | §4.9 p149–150（引文① QUOTE-OK；needle `producer and consumer entities`@p149） |
| 环分三种：传输/事件/命令；TRB 类型集独占、底层机制与模板共用（要义段 1） | §4.9 p150（引文② QUOTE-OK；needle `3 basic types`@p150） |
| 传输环与 USB 管道 1:1，由 Endpoint Context 或 Stream Context Array 定义 | §4.9 p150（needle 无——正文 p150 逐字核：`1:1 mapping between Transfer Rings and USB Pipes`） |
| 传输/命令环双指针均非物理寄存器；事件环仅出队指针=物理寄存器 ERDP（要义段 2、对照表行 1–3） | §4.9 p150 两则 Note（提取文本逐字核） |
| 空=Dequeue=Enqueue；满=Enqueue+1=Dequeue，+1 须计 Link TRB（要义段 2、引文③） | §4.9 p151（引文③ QUOTE-OK；needle `then the ring is full`@p151） |
| 全环 TRB 初建/重初始化清 0=空队列；TRB 16 字节；不跨 64KB 边界（要义段 2/3、要点表行初始化/几何） | §4.9 p151（提取文本逐字核：`all TRBs in the ring shall be cleared to ‘0’`、`All TRB data structures shall be 16 bytes in size`、`shall not cross a 64K byte boundary`） |
| TD=1+ TRB，除末颗外置 Chain bit；命令/事件描述符单 TRB（要义段 3） | §4.9.1 p151（`The TRB Chain (C) bit is set in all but the last TRB of a TD`）＋p152 Note（`Command and Event TRBs do not support a Chain bit (CH)`） |
| 零长 USB 事务=单 Transfer TRB 且 Transfer Length=0（要义段 3） | §4.9.1 p151（`a TD with a single Transfer TRB, and its TRB Transfer Length field shall equal ‘0’`） |
| producer (host) 放 / consumer (xHC) 取（对照表行 1） | §4.9.2 p152（needle `places items in a Transfer Ring at the Enqueue Pointer`@p152） |
| Cycle bit 标记入队位置、省掉物理 Enqueue 寄存器（引文④） | §4.9.2 p153（引文④ QUOTE-OK；needle `eliminating the need to define a physical`@p153） |
| 软件副本初值写 TR Dequeue Pointer 字段；消费进度经 Transfer Event TRB Pointer 报回（对照表行 1） | §4.9.2 p153（提取文本逐字核） |
| 传输环空判据=xHC 见 Cycle bit 翻转；满判据=软件 +16 / Link TRB 比对（对照表行 1、要点表入队/出队行） | §4.9.2 p153、p156（needle `if the Dequeue Pointer is equal to the Enqueue`@p156）；满判据 p156（`adding the size of a TRB (16)`、`compare the Ring Segment Pointer value`） |
| 传输环门铃=Device Context Doorbell 1–255、1:1 对应槽（对照表行 1） | §4.7 p142（needle `the Device Context Doorbell`@p142；DB Target/DB Stream ID 指明传输环=p142 逐字核） |
| Toggle Cycle=1 → 生产者翻 PCS / 消费者翻 CCS（引文⑤、要点表 Toggle Cycle 行） | §4.9.2 p154（引文⑤ QUOTE-OK；needle `state of its PCS flag`@p154） |
| 段尾恒为 Link TRB；64 位 Ring Segment Pointer（要点表段尾行） | §4.9.2.1 p155（needle `is always a Link TRB`@p155） |
| 命令环唯一（对照表行 2） | §4.1 p68（避雷清单既有锚 `There is only one Command Ring`，4.1 节已机核在案） |
| 命令环由 CRCR 管理（Operational Registers） | §4.9 p150（`managed by the Command Ring Control Register that resides in the Operational Registers`） |
| 停机（CRR=0）写 CRCR → 以 Command Ring Pointer 重载出队指针；门铃 0/DB Target=0；Command Completion 报出队位置；禁多 TRB TD（对照表行 2） | §4.9.3 p160（needle `No multi-TRB TDs are allowed`@p160；其余三条 p160 提取文本逐字核） |
| 命令环空判据/其余管理与传输环一致（对照表行 2） | §4.9.3 p160（`A Command Ring is defined as “empty”…`、`All other aspects of Command Ring management are identical`） |
| 事件环方向倒转：xHC 生产、system software 消费（引文⑥、对照表行 3） | §4.9.4 p161（引文⑥ QUOTE-OK；needle `the xHC is the producer and system software is the consumer`@p161） |
| 每中断器各一条事件环（对照表行 3） | §4.9.4 p161（`an xHC may implement multiple Interrupters, each with its own Event Ring`） |
| 事件环空=ERDP 所指 TRB Cycle bit ≠ CCS；写 ERDP 到失配 TRB 宣告清空（对照表行 3、要点表 ERDP 行） | §4.9.4 p161 及其 Note（`waits for an interrupt from the xHC for the Event Ring`＋Note 逐字核） |
| ERST=Base Address/Size 对数组；ERST(0) 由 ERSTBA 指向；项数=ERSTSZ；ERST 按循环队列回绕（要点表 ERST/段次序行） | §4.9.4 p161–162（needle `treated as a circular queue`@p162） |
| 建环次序：清 0+填 ERST → 写 ERSTSZ/ERDP → 写 ERSTBA 进 Start；每段 Size≥16（要点表建环行） | §4.9.4 p162–163（needle `is at least 16`@p163） |
| ERDP 写法：写最后处理 TRB 地址、不得连续同值、攒批 ≥4 条（要点表 ERDP 行） | §4.9.4 p163、p165（needle `minimum of 4 Events`@p165） |
| 事件环 PCS/CCS 初值 1、回绕环首时翻转；PCS 仅回绕时翻转（要点表 PCS/CCS 行） | §4.9.4 p161、p164 Note（needle `the Event Ring wraps back to the beginning`@p164） |
| EHB=Event Handler Busy（RW1C：IP=1 置 1、写 ERDP 清 0）；DESI=出队段索引低 3 位（要点表 EHB/DESI 行） | §5.5.2.3.3 p393 Table 5-42（needle `Event Handler Busy (EHB)`@p393；DESI=p393 逐字核） |
| 事件环满=留一格判满；满后主环停全部/副环只停指向它的传输环；虚拟化豁免；阻塞拖累其它环（要点表满的代价行） | §4.9.4 p166–167 步 12–17（needle `still room for one more entry`@p167）、p168 Note、p164 Note |
| ERST 表项 0..ERSTSZ−1 在 HCH=0 期间禁改（要点表 ERST 行） | §4.9.4.1 p169 Note（needle `are not allowed to be modified by software when HCHalted`@p169） |
| Primary/Secondary 中断器；副环 5 类事件 TRB；Interrupter Target 定向（要点表 Primary/Secondary 行） | §4.9.4.3 p170（needle `referred to as the Primary Interrupter`、`Vendor defined event (optional)`@p170） |
| 只许生产者改自己拥有的 Link TRB；扩段两法（要点表增缩段行） | §4.9.2.3/4.9.2.4 p158–160（Note 逐字核：`Only Link TRBs that are owned by the producer may be modified`；两法 p159–160） |
| 增段初值注（初始化行）: 传输环 CCS 初值=DCS、命令环=RCS、事件环恒 1 | §4.9.2.2 p157 Note（提取文本逐字核） |

引文六条逐字机核：QUOTES-PASS（脚本对 `/tmp/spec-audit-txt/xhci-1.2b.txt` 相应页做空白归一化包含比对，直引号/弯引号归一；核对脚本为一次性验证件，未入仓）。

## 门输出（逐条实测，2026-11-04）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py`（22 needle，覆盖 §4.9/4.9.1–4.9.4/§4.7/§5.5.2.3.3 各断言页）→ 末行 **PAGECHECK-PASS**（22/22 PAGE-OK；构建终版后复跑 12 needle 仍 PASS）。
2. 语言门：`scan_words.py retired index.html / index-light.html` → `total=4 {'柜台': 1, '回执': 3}`——残留 family ⊆ 豁免表（柜台=fig4 专名链接文字；回执=板块豁免词），**PASS**。中途咬过 2 处子串巧合（「放上环」含上环、「机器在演示」含在演），当轮改写为「放上传输环」「机器负责演示」后复跑通过。
3. 静态冒烟：playwright channel="chrome"，console error=0 ×双主题 + 6 卡片在场；截图 6 张落 shots/（见下清单）。表格节无 zoomfs/无步进（DESIGN 分级「表格节不做动画」）——zoombar 在场性不适用。末行 **STATIC-SMOKE-PASS**。
4. 自包含：`grep -c 'http://\|https://'` → index.html=0、index-light.html=0（≤2 且无需 SVG xmlns 豁免）。
5. 互链存在性：`check_lesson_links.py lessons/xhci-spec/ch4/4.9-trb-ring` → ok=24 missing=0 **PASS**（EVIDENCE.md 落盘后复跑）。
6. 引文逐字：QUOTES-PASS（6/6，见上）。
7. 390px 门：full-page 截图宽实测 390（补丁前 631——六列对照表 min-content 宽超视口，见下「窄幅适配补丁」）。

## shots 清单（playwright chrome，1500×1000 视口 + 390px）

- shots/table-overview-dark.png / table-overview-light.png —— 全页全景
- shots/table-card1-dark.png / table-card1-light.png —— 三环对照表卡特写（第 2 张 .xsp-card）
- shots/table-overview-390-dark.png / table-overview-390-light.png —— 390px 窄幅全景

## 互链清单（目标 → 演示什么；check_lesson_links ok=22 含全部）

| 目标 | 演示环节 |
|---|---|
| ../../../xhc-machines/fig2-transfer-ring/index.html（Fig2 环形分度轨道） | §4.9.2 传输环管理：双指针推进/Cycle bit 位置标记/Link TRB 回绕（规范图 4-6 动态版） |
| ../../../xhc-machines/fig3-event-ring/index.html（Fig3 回执登记机） | §4.9.4 事件环管理：xHC 生产、CCS 比对消费、写回 ERDP |
| ../../../xhc-machines/fig4-command-ring/index.html（Fig4 订单柜台） | §4.9.3 命令环管理：命令投递、门铃 0、Command Completion 回执 |
| ../../../0006-xhc-trb-parts.html（课 0006 先认零件） | §4.9.1 TD：TRB 模板/TD 拼装/Chain bit |
| ../../../0007-xhc-ring-keys.html（课 0007 环的运转） | §4.9.2 指针推进与 Cycle 位比对规则 |
| ../../../0009-xhc-transfer-drama.html（课 0009 一场传输的三视角走查） | §4.9.1–4.9.2 一颗 TD 从写入到 Transfer Event 回执全程 |
| ../4.8-endpoint/index.html | 上一节（§4.8 端点——传输环由端点上下文定义 p150） |
| ../../index.html ×2 | 待建节指针（§4.10、§4.11）+ 规范目录 |

## 已知边界

- **窄幅适配补丁（构建期，登记在案）**：`_gen/table_page.mjs` 无 CSS 钩子且禁改共享生成器——本节 build.mjs 生成后注入 `@media (max-width:900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}`（页 head 前）。效果：≤900px 时六列对照表在卡内横向滚动，页面本体不出横向滚动条（补丁前 full-page 390 截图实测宽 631，补丁后=390）。同 DESIGN 契约修订「构建期补丁并在 EVIDENCE 登记」形态（zoomfs 单实例补丁先例）；若后续 table_page.mjs 加官方窄幅处理，可删本补丁。
- 表格节无动画/无 zoomfs（DESIGN 动画分级），三环机制动态演示全部由互链机器承担——本节只做条文对照，不重造图。
- EHB/DESI 为 ERDP 寄存器位（§5.5.2.3.3 p393 Table 5-42），不在 §4.9 印刷范围内；按任务书要求纳入事件环要点表并单独标页码。
- 引文③含规范原文的半角双引号（"Enqueue Pointer + 1"），按提取文本逐字保留。
- §4.9.4 图 4-12（事件环状态机）与 Table 4-4（状态机定义）未做成画面——文字判据已入要点表；图 4-9/4-10（扩段前后态）同此。
- 上一节链接指向 4.8-endpoint（并行施工节，本节交付时其 index.html 已存在且 check_lesson_links 通过；若 4.8 最终未落地需回改本节 prevHref）。
- 中途语言门咬词 2 处（子串巧合），已当轮改写——见门输出 2。
- 390px 下六列对照表内文字最小约 13px（td.mono 13px）且需卡内横滚——表格节窄幅形态如实登记，未做响应式重排。

---

---

# 2026-11-05 自含化改造——anatomy 机器「环运转台」（替换互链承载）

用户指令：去掉互链逻辑、忘掉 0001-0010 课程，在本节内自建机器重述四机课 fig2/3/4 的概念承载（环几何 / Cycle bit / Link TRB 回绕（Toggle Cycle 翻 PCS·CCS）/ 生产消费双指针）。

**形态**：全定制 build.mjs（照 4.12-streams 先例；prose 3 段/引文 6 条/三张对照表逐字移植自旧 table_page 量产件——仅三处例外：prose 第 1 段尾句改指本节机器、linksHtml 数据段删除、footLine 日期 2026-11-05）。机器＝「环运转台」：9 槽环形卡柜（8 数据 TRB 槽 + 第 9 槽 Link TRB，槽 0 在前、Link 在前左与槽 0 相邻——照 Figure 4-6 布局）悬在四柱上；中央立柱顶出双针＝两根指针（压卡头针＝Enqueue、取卡钳针＝Dequeue，配重臂+角色盾牌；事件环模式盾牌蓝金互换＝方向反转）；卡顶翻牌＝Cycle bit；环内侧点列＝回绕路径（Link→槽0，live 点亮）；前低控台＝模式三键（传输/命令/事件）+ Enq/Deq/PCS/CCS 读数窗 + 空/满窗；左文书台（xHCI 驱动·蓝：TD 卡堆/事件匣/门铃 DB Target）；右总控台（xHC·金：CRCR/ERDP 寄存器牌/中断灯）；通知缆一根（门铃去程/完成事件与中断回程/写 ERDP 去程）承担全部跨台信号。13 帧三模式（传输 F0–F8 / 命令 F9–F10 / 事件 F11–F12），`window.__fig49 = { playTo, pause, stateOf, frameOf, cycleMode }`。

## 帧清单（13 帧；narr 全中文带 pg 角标）

| 帧 | 名 | pg | 帧终态（stateOf 实测） |
|---|---|---|---|
| F0 | 全景 · 三环共用一套机构 | p149 | mode 传输环 enq0 deq0 pcs1 ccs1 |
| F1 | 建环：清 0 与 Link | p151·p157 | enq0 deq0 pcs1 ccs1（Link 卡入位） |
| F2 | 生产：压入一颗 TD（NC,NC,ED） | p151–153 | enq3 deq0 pcs1 ccs1 |
| F3 | 门铃与消费（Transfer Event 回报） | p152–153 | enq3 deq3（CCS=1==Cycle 执行） |
| F4 | Link 回绕 · PCS 翻转 | p154–155 | enq0（重载回槽0） pcs0 |
| F5 | 出队过 Link · CCS 翻转 | p154·p156 | deq0（跳回槽0） ccs0 |
| F6 | 第二圈：双翻后照常 | p154 | enq1 deq1（新 Cycle=0==CCS0 执行） |
| F7 | 空：双针重合（失配停等） | p153·p156 | enq1 deq1 empty=1 |
| F8 | 满：入队+1＝出队 | p151·p156 | enq0 deq1 pcs1 full=1 |
| F9 | 命令环：单 TRB · 门铃 0 | p160·§4.1 p68 | mode 命令环 enq1 deq0（CRCR 牌/CMD 卡） |
| F10 | 命令完成回执 | p160 | deq1（Command Completion） |
| F11 | 事件环：方向反转 · ERDP | p150·p161 | mode 事件环 enq3 deq3（盾牌互换/中断灯/写 ERDP） |
| F12 | ERST 分段：每段 ≥16 | p161–163 | erdp 牌示 EHB→0·DESI＝0 |

## 机器读数 ↔ 规范条文真值表（stateOf 实测对表）

| 机器读数 | 规范条文 |
|---|---|
| F2 每写一张卡顶翻牌＝PCS 值、入队针推进一格 | p153「The Cycle bit field in a TRB identifies the location of the Enqueue Pointer…eliminating the need to define a physical Enqueue Pointer register」+ Figure 4-8 入队推进流图（p157） |
| F3 出队针读翻牌与 CCS 相等才执行、完成后「毕」标 | p153「If the CCS flag is equal to the value of the TRB Cycle bit, then the consumer owns the TRB…may process it」 |
| F4 入队针到 Link 槽重载回槽 0、PCS 1→0 | p154「If the Producer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its PCS flag」；重载＝Ring Segment Pointer（p153） |
| F5 出队针过 Link：CCS 1→0、跳回槽 0 | p154（Consumer 侧同条）+ p156「xHC will automatically set the Dequeue Pointer to the address provided by the Link TRB」 |
| F6 第二圈 Cycle=0 与翻转后 CCS 相等照常执行 | p154 Figure 4-6「~PCS」第二圈语义 |
| F7 双针重合＋空窗亮（失配＝入队未到） | p153「If a transition detected, the ring is empty」+ p156 空＝Dequeue＝Enqueue |
| F8 满窗亮：入队+1 撞出队（跨 Link 计入） | p151「If the “Enqueue Pointer + 1” = Dequeue Pointer, then the ring is full」+ p156 +16/Link 比对两法 |
| F9 单命令单 TRB、DB Target=0、CRCR 管起点 | p160「No multi-TRB TDs are allowed」「Host Controller Doorbell Register (0)」「CRCR…initialize the Command Ring Dequeue Pointer」；仅一条命令环＝§4.1 p68 |
| F10 Command Completion 报出队位置 | p160「The location of the Command Ring Dequeue Pointer is reported on the Event Ring in Command Completion Events」 |
| F11 盾牌互换＝xHC 生产/驱动消费；无门铃发中断；写 ERDP | p161「the xHC is the producer and system software is the consumer」+「Software shall write the Event Ring Dequeue Pointer (ERDP) register」；ERDP 物理寄存器＝p150 Note |
| F12 段尾卡「段尾 ERST」+ 注记牌 | p161–163 ERST Base/Size 对、每段 ≥16（p163「is at least 16」）、段表循环使用（p162） |

## 门输出（2026-11-05 实测，逐条末行）

1. 构建：`node build.mjs --audit` / `--light --audit` → **audit passed** ×2（75 solids · 78 items · 1 tubes · 162 order rules）；纯构建 `node build.mjs && node build.mjs --light` → wrote index.html/index-light.html 301 KB。
2. 页码机核：`python3 scripts/xhci_spec_pagecheck.py 149 "TRB Ring" 151 "4.9.1" 152 "4.9.2" 160 "4.9.3" 161 "4.9.4" 157 "Consumer Cycle State (CCS)" 155 "is always a Link TRB" 156 "adding the size of a TRB" 163 "is at least 16" 150 "Only the Dequeue Pointer for an Event Ring" 68 "There is only one Command Ring"` → 12/12 PAGE-OK，末行 **PAGECHECK-PASS**。
3. 语言门：`scan_words.py retired index.html / index-light.html` → 双主题 **total=6 {'回执': 6}** ⊆ 豁免表 **PASS**（中途咬过一次「ERST 段表」〔统一形 guard〕与一次「签下」〔geometry-live 注释「上标签下值」内联进页〕，当轮改写复跑通过）。
4. console 清点：playwright channel="chrome" 双主题加载 + playTo 驱动 13 帧 → **console error 0 / pageerror 0 ×2**；API 实测 `playTo(5) → frameOf()==5`、`stateOf()` 逐帧读数见上真值表（playwright 逐帧采集后并入本表，采集脚本为一次性验证件未入仓）。
5. 自包含：`grep -c 'http://\|https://'` → index.html=2、index-light.html=2，命中均为 SVG xmlns → **PASS**。
6. 遮挡探针：`xhci_spec_occlusion_probe.py index.html --frames 13` → **OCCLUSION-FAIL 6**（light 同 6）——**已知边界**，见下「遮挡门实录」。
7. anatomy 线端检查：`scripts/lines.mjs index.html / index-light.html` → 无 finding、console clean（初版 hub.column 装饰弧线端悬空 2.57px，删弧后清零）。
8. 互链存在性：本节出链 `../../index.html`（板块目录）、`../4.8-endpoint/index.html`、`EVIDENCE.md`——三目标均在场。

## 遮挡门实录（15 → 6，全部定性）

初跑 15 处，三轮修复后 6 处，逐处用 `isPointInFill` 精判（文字中心+四角 5 点采样）：
- 纯 bbox 假阳性 4 处（F0/F4「6」槽号、F4「C=1」：0/5 点在遮挡 path 填充内）——探针 rect-overlap 近似 vs 针件斜置 bbox；几何实测无覆盖。
- 动作瞬间单角掠边 2 处（F4/F5 卡顶翻牌数字「1」：1/5，中心与三角全清，≤1px 角点）——取卡钳悬停在正下方卡顶翻牌上方的物理瞬间，属针头工作位的真实近距，非文字不可读。
- 修复历程：槽号外移 r82（针尖 r72 之外）＋针梁分三段（分段件 bbox 收窄）＋前控台降为低台并收窄至 x+40（投影 bbox 退出前卡文字带）＋deq 针整体抬高 1.8（轭退出卡面文字行）＋模式钮改平贴点亮环（凸帽不遮刻名）。

## 坑实录（2026-11-05）

1. **kit plan 缺 `r` 即 NaN**：`k.slabOf/planOutline/roundedPlan` 收到无 `r` 的 plan 会产出 `MNaN NaN` 路径（本节踩 3 处：TRAY、cardSvg 卡体/翻牌、desk.top 内联 insetPlan）——首跑 85 条 console error 全源于此；判据＝console 报 `<path> attribute d: Expected number, "MNaN…"` 时先查 plan 字面量。
2. **A.prism 第 4 参是终点不是高度**：`A.prism(F, poly, s0, s1)` 传成 `(F, poly, 46.9, 1.4)` 产出一根从 z1.4 到 z46.9 的巨柱（sunk 2.5 报警）——与 `slab(name, plan, z, h)` 的「z+高度」习惯不同形。
3. **径向单体质穿立轴**：针梁单体 polygon 从 r−15 连到 r+72 必过柱心（sunk 2.2）——拆「梁三段+配重臂」四件，端面贴轴面。
4. **遮挡探针是 bbox 近似**：斜置长件（针梁/轭）的 bbox 远大于实体；已按「修复到可修、余下 isPointInFill 定性记录」收口（见上）。低前台若高过 z≈22，其投影 bbox 必进前卡（槽 0/1）文字带——前控台限高 21.5 + 收窄右缘 x+40 是实测边界。
5. **注释也会进语言门**：geometry-live.mjs 源码整体内联进页面，注释里的「上标签下值」拼出退役词「签下」——内联源码的注释按页面文本对待。
6. **遮挡探针只认 `__figNN`**：按序探测 `__fig49 → __fig412 → __fig42 → __fig43`（2026-11-05 泛化后），本节 `window.__fig49` 直接可驱动，无需别名。
7. 双针 painter 序：径向梁跨环轨前后景深，单键画家序必出环（settle 报 8 cycles）——双针按逐帧动件处理：形状入 R.solids 供支撑/间距审计、绘制恒在 actors 顶层（双针 z≥46.9 高于全部静件卡顶 46.2；钟顶饰 z56+ 仅柱心 r≤3.2 与针根无屏面交，4× 截图核过）。

## shots 清单（2026-11-05 终版；playwright chrome 1500×1000@2x）

- page-overview-dark.png / page-overview-light.png —— 全页全景
- page-390-reduced-dark.png —— 390px 窄幅 + reduced-motion（playTo(6) 静止帧）
- machine-390-dark.png —— 390px 机器特写
- machine-f4-wrap-dark/light.png —— F4 Link 回绕·PCS 翻转（回绕点列点亮）
- machine-f8-full-dark/light.png —— F8 满（空/满窗、双针相邻）
- machine-f9-cmd-dark/light.png —— F9 命令环（注记牌/CRCR/DB Target=0）
- machine-f11-evt-dark/light.png —— F11 事件环（盾牌互换/中断灯/ERDP）
- lines-dark.png —— 线端检查环示图（anatomy lines.mjs）
- （2026-11-04 旧表格节 shots：table-*.png 6 张留档未删）
