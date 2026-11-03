# EVIDENCE.md —— §4.9 TRB 环（2026-11-04，互链型表格节量产）

节目录：`lessons/xhci-spec/ch4/4.9-trb-ring/`（build.mjs + index.html dark + index-light.html light + shots/）。
呈现类型：表格节（`_gen/table_page.mjs`）＋互链卡——三环机制图不重造，链四机课 fig2/3/4 与机制课 0006/0007/0009（板块 index.html 4.9 行既定口径「互链四机 fig2/3/4 不重造」）。

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
