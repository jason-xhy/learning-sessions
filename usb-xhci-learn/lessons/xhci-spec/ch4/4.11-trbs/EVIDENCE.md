# EVIDENCE.md —— §4.11 TRB（传输请求块）（2026-11-04，家族地图型表格节量产）

节目录：`lessons/xhci-spec/ch4/4.11-trbs/`（build.mjs + index.html dark + index-light.html light + shots/）。
呈现类型：表格节（`_gen/table_page.mjs`）——TRB 家族总表 + 模板通用字段速览 + TD 使用规则要点三张表；
位级拆解不重造（归 §6.4 与机制课 0006，任务书口径「TRB 提单全解——位级拆解」），动态画面由互链机器/课承担。

## 逐条断言 → 判据

| 断言（页内位置） | 判据 |
|---|---|
| §4.11 定位＝§6.4 通用数据结构定义之外的属性与用法（要义 P1、引文①） | §4.11 p188（引文① QUOTE-OK；needle `outside of the`@p188） |
| TRB＝传输请求块（板块既有立法，DESIGN §3.1）；TRB 三组件 Parameter/Status/Control（要义 P1、引文②） | §4.11.1 p188（引文② QUOTE-OK；needle `Parameter, Status, and Control`@p188） |
| 格式/内容由 TRB Type 决定，恒在 Control 组件 bits 10-15（要义 P1/P3、字段表行 1） | §4.11.1.1 p188（needle `reside in bits 10-15`@p188） |
| Cycle bit 恒在 Control 组件 bit 0（要义 P3、字段表行 2） | §4.11.1.1 p189（needle `reside in bit 0`@p189；首轮 needle `bit 0 of the Control component` 因 PDF 断行假阴性，换断行前短 needle 通过） |
| 命令/传输 TRB 建环时软件全部清 0、此后 xHC 只读；事件 TRB 反向——xHC 写、软件建环后只读（要义 P3） | §4.11.1.1 p188 / §4.11.1.2 p189（提取文本逐字核：`shall be initialized to ‘0’ by the system software`、`treated as read- only by the xHC`、`read-only by system software`） |
| 四 Dword 非原子写时先 Parameter/Status 后 Control，违者未定义行为（要义 P3、字段表尾注） | §4.11.1.1 p189 Note（提取文本逐字核：`initialized prior to writing the Control Component`） |
| ENT 不跨 TD、仅 CH=1 时有效（字段表行 4） | §4.11.1.1 p189（needle `Evaluate Next TRB (ENT)`@p189） |
| 家族三大类各住三环；传输/命令＝软件生产 xHC 消费、事件环倒转（要义 P2、总表类别列） | §4.11.2 p190（`System software is the producer of all Transfer TRBs and the xHC is the consumer`）＋§4.11.3 p201（引文④ QUOTE-OK `producer of all Event TRBs`）＋§4.9 p150（三环既核） |
| 每条命令完成必有 Command Completion Event TRB 回执（要义 P2、引文⑤） | §4.11.4 p202（引文⑤ QUOTE-OK；needle `Command Completion Event TRB on the Event ring`@p202） |
| 传输环 TRB 清单：Normal / Setup / Data / Status Stage / Isoch（总表行 1） | §4.11.2.1 p190（needle `Normal TRB`、`multi-TRB Transfer Descriptors`）＋§4.11.2.2 p191（needle `SETUP Data`）＋§4.11.2.3 p195（needle `4.11.2.3`）小节头核 |
| No Op Transfer TRB 本节无独立小节：规则见 §4.11.7 p213、位级 §6.4.1.4 p437（总表行 1） | p213（`No Op Transfer TRB` 逐字核）＋§6.4.1.4 p437（needle `No Op TRB`@p437，标题行提取文本核） |
| 事件家族六类＋各小节页码：Command Completion §6.4.2.2 p440 / Port Status Change §6.4.2.3 p441 / Bandwidth Request §6.4.2.4 p443 / Doorbell §6.4.2.5 p444（虚拟化） / Host Controller §6.4.2.6 p445 / Device Notification §6.4.2.7 p446（总表行 2） | §6.4.2 各小节头提取文本核＋pagecheck needles（`Command Completion Event TRB`@p440、`Port Status Change Event TRB`@p441、`Bandwidth Request Event TRB`@p443、`Doorbell Event TRB`@p444、`Host Controller Event TRB`@p445、`Device Notification Event TRB`@p446） |
| 副环只许 Transfer / Bandwidth Request / Device Notification 三类（总表行 2） | §4.11.3 p201（`Only Transfer, Bandwidth Request, and Device Notification Events may be found on a secondary Event Ring`） |
| ED（事件描述符）恒为单颗 Event TRB（总表行 2） | §4.11.3 p200–201（needle `Event Descriptor (ED)`@p200；`comprised of only one Event TRB` 跨页逐字核） |
| 命令 TRB 17 种（4.11.4.1–4.11.4.17）、其中 6 种 Optional Normative（总表行 3） | §4.11.4 p202–206 小节头逐个核（提取文本）；Optional Normative＝Force Event/Negotiate Bandwidth/Set Latency Tolerance Value/Get Port Bandwidth/Get+Set Extended Property（各小节标题后缀逐字核） |
| Address Device / Configure Endpoint / Evaluate Context 走 Input Context（总表行 3） | §4.11.4 p202 Note（`utilize an Input Context data structure`） |
| 命令完成时 Cycle bit 取 PCS 值（未入页面——总表行 3 语义背景） | §4.11.4 p202（`the Cycle bit will be set to the value of the Command Ring’s Producer Cycle State (PCS) flag`） |
| 其它 TRB＝Link（§4.11.5.1 p206）/ Event Data（§4.11.5.2 p208）/ Vendor Defined（§4.11.6 p210）；Vendor Defined 命令环上视为 No Op（总表行 4） | 小节头核＋p211（needle `No Op Command TRB`@p211；Event Data 仅传输环 p210 Note `may only be found on a Transfer Ring`） |
| TRB 类型全目录 Table 6-91 §6.4.6 p469；传输环允许类型随端点类型 Table 6-92 p472（总表尾注） | 规范目录条目＋needle `Table 6-91`@p469、`Table 6-92`@p472 |
| 字段表行 3/5：CH 可用于 Normal/Data Stage/Status Stage/Isoch（引文③）；IOC 完成生成事件、Link TRB IOC 跟踪跨段 | 引文③ QUOTE-OK p190；IOC p190（`Interrupt On Completion (IOC) flag is set`）；Link IOC p207–208（`track the Dequeue Pointer as a function of segment boundary crossings`）；命令环 Link TRB 忽略 CH p207、忽略 Interrupter Target p208 Note |
| 字段表行 7：BEI＝事件照放环但不发中断，Normal/Isoch Transfer TRB 与 Event Data TRB 支持 | §4.17.5 p268（needle `Block Event Interrupt (BEI)`@p268；§4.11 范围外，按字段速览需要纳入并单独标页） |
| 字段表行 8：Setup Stage TRB 恒 IDT=1 且 Length=8；TD 内 IDT=1 者为唯一传输 TRB | §4.11.2.2 p192（`IDT flag = ‘1’`、`Length field shall be set to ‘8’`）＋§4.11.7 p212（needle `Interrupter Target`@p212 同页；`the only Transfer TRB of the TD`） |
| 字段表行 10/11：短包实长累加用 TRB Transfer Length（p212 两法）；TD Size 末颗清 0、5 位封顶 31 | §4.11.7 p212（`add the TRB Transfer Length fields … subtract the Transfer Event TRB Transfer Length field`）＋§4.11.2.4 p197–198（needle `TD Packet Count`@p197；`forced to 31` 逐字核） |
| 字段表行 12：Frame ID（SIA=0 才有效）/TBC/TLBPC Isoch 专用 | §4.11.2.3/4.11.2.5 p195–196、p198（`The Isoch TRB Frame ID field …`、`TBC and TLBPC`；needle `End Frame ID`@p198） |
| 字段表行 13：Event TRB 的 Parameter/Length/Control 高字随 Event Type 变 | §4.11.3 p201（`Event Type Dependent`） |
| TD 规则表：TD＝1+ TRB、Chain flag 除末颗外全置（引文⑥＝TD 边界判据）；跨段可含 Link TRB；TD Fragment 不跨段 | §4.11.7 p211（引文⑥ QUOTE-OK；needle `except the last`@p211）＋p211（`may include one or more Link TRBs`）＋§4.11.7.1 p214（`should not span Transfer Ring Segments`） |
| TD 规则表：Link/Event Data TRB 不算 Transfer TRB | §4.11.7 p212 Note（`Link and Event Data TRBs are not “Transfer TRBs”`） |
| TD 规则表：IN 端点短包两法（ISP 全置+末颗 IOC / Event Data 收尾互斥；实长算法；16,777,215 上限） | §4.11.7 p212（两法与算法逐字核；`16,777,215 byte transfer`；互斥句 `mutually exclusive`） |
| TD 规则表：Event Data 可多颗、不得紧跟另一颗、Isoch 环禁独立 Event Data TD | §4.11.7 p212（`More than one Event Data TRB may be defined within a TD`）＋§4.11.5.2 p210（`shall not immediately follow another Event Data TRB`、`shall not define a “stand-alone” Event Data TD … on an Isoch Transfer Ring`） |
| TD 规则表：Link TRB 禁首/末位、禁连续；Link TD 可前后缀；No Op 禁入多 TRB TD；违规＝未定义行为 | §4.11.7 p213（四句逐字核：`shall not define a Link TRB as the first TRB of a multi-TRB TD` 等、`Undefined xHC behavior may occur`） |
| TD 规则表：事件可定期收回 Dequeue Pointer；中途事件无错报 Success；报错覆盖 Success | §4.11.7 p213 Note（`periodically set IOC flags`、`shall report Success`、`overrides any Successful Completion Codes`） |
| TD 规则表：MBP＝(Max Burst Size+1)×Max Packet Size；Fragment 首 TRB 最后写；TRB Packet Boundary 定义；IOC 每 Fragment 至多一颗 | §4.11.7.1 p213–215（needle `Max Burst Payload (MBP)`@p214、`TD Fragments`@p213；`written last`、`TRB Packet Boundary`、`only one TRB of a TD Fragment` 逐字核） |
| 引文③⑥含规范原文排印原样（Figure 6-8 指称、used identify 缺 to）；引文② consist 原样 | 逐字原则（DESIGN §1.4）——保留并在 zh 侧注明 |
| p212 短包两法列表编号从「4.」起＝PDF 排版伪影 | 提取文本现场；规则表用规范化编号+页码（DESIGN 避雷第 21 条同型处置），表尾已注 |

## 门输出（逐条实测，2026-11-04）

1. 页码机核：`python3 scripts/xhci_spec_pagecheck.py`（35 needle，覆盖 §4.11 全部小节页＋§4.17.5 p268＋§6.4.1.4 p437＋§6.4.2.2–6.4.2.7 p440–446＋Table 6-91/6-92 p469/472）→ 末行 **PAGECHECK-PASS**（35/35 PAGE-OK；needle `bit 0 of the Control component` 首轮因 PDF 断行 MISS，换 `reside in bit 0` 后通过——教训与 4.21 EVIDENCE 同型）。
2. 语言门：`scan_words.py retired index.html / index-light.html` → `total=5 {'回执': 5}`——残留 family ⊆ 豁免表（回执=板块豁免词），**PASS**。中途咬过 钥匙×2/实收×3/提单×2（非豁免族），当轮改写（钥匙→判据/分门别类；实收→实际字节数；提单→位级拆解表述）后复跑通过。
3. 静态冒烟：playwright channel="chrome"，console error=0 ×双主题 + 卡片 6 张在场 + 390px 宽实测 scrollWidth=390 ×双主题；截图 6 张落 shots/（见下清单）。表格节无 zoomfs/无步进（DESIGN 分级「表格节不做动画」）。末行 **STATIC-SMOKE-PASS**。
4. 自包含：`grep -c 'http://\|https://'` → index.html=0、index-light.html=0。
5. 互链存在性：`check_lesson_links.py lessons/xhci-spec/ch4/4.11-trbs` → ok=22 missing=0 **PASS**（EVIDENCE.md 落盘后复跑）。
6. 引文逐字：QUOTES-PASS（6/6，一次性脚本对 `/tmp/spec-audit-txt/xhci-1.2b.txt` 相应页做空白归一化+弯直引号归一包含比对；脚本为一次性验证件未入仓）。

## shots 清单（playwright chrome，1500×1000 视口 + 390×844）

- shots/table-overview-dark.png / table-overview-light.png —— 全页全景（full_page）
- shots/table-card1-dark.png / table-card1-light.png —— TRB 家族总表卡特写（第 1 张含 xsp-tb 的卡）
- shots/table-overview-390-dark.png / table-overview-390-light.png —— 390px 窄幅全景（scrollWidth 实测 390）

## 互链清单（目标 → 演示什么；check_lesson_links ok=22 含全部）

| 目标 | 演示环节 |
|---|---|
| ../../../0006-xhc-trb-parts.html（课 0006 先认零件） | TRB 位级拆解——Parameter/Status/Control 三段与字段逐个拆 |
| ../../../0007-xhc-ring-keys.html（课 0007 环的运转） | Cycle bit 与环机制——PCS/CCS 比对执行规则 |
| ../../../0009-xhc-transfer-drama.html（课 0009 一场传输的三视角走查） | 一颗 TD 从写入到 Transfer Event 回执全程 |
| ../../../xhc-machines/fig1-assembly/index.html（四机课 Fig1 TRB 装配机器） | TRB 拼装成 TD 的几何（图 4-16/4-17 的机器版） |
| ../4.9-trb-ring/index.html（§4.9 TRB 环） | 三环与生产/消费方向——家族总表「住哪个环」列的机制面 |
| ../../index.html ×3 | 待建节指针（§4.10、§4.12）+ 规范目录 |

## 已知边界

- 表格节无动画/无 zoomfs（DESIGN 动画分级「表格节不做动画」）；TRB 机制动态演示全部由互链机器/课承担——本节只做家族地图与条文对照。
- **窄幅适配补丁（构建期，照抄 4.9 先例）**：build.mjs 生成后注入 `@media (max-width:900px){.xsp-card table.xsp-tb{display:block;overflow-x:auto}}`——家族总表 4 列/字段表 4 列在 ≤900px 卡内横滚，页面本体不出横向滚动条（390px full-page 实测宽=390，冒烟输出在案）。
- BEI 判据页 §4.17.5 p268 与事件家族位级页 §6.4.2 p438–446、Table 6-91/92 p469/472 均在 §4.11 印刷范围之外——按任务书「通用字段/家族清单」需要纳入并单独标页（与 4.9 EHB/DESI 先例同型）。
- 引文②/⑥保留规范排印瑕疵（consist / used identify），zh 侧注明；引文③含弯引号 ‘1’ 按提取文本原样。
- p212 短包两法列表 PDF 编号伪影（从 4. 起）——规则表用规范化编号并在表尾声明；图 4-13/4-14/4-15/4-16/4-17/4-18 未作画面（表格节定位，图 4-16/4-17 几何由互链 Fig1 承担）。
- prev/next 导航留空（4.21 先例）：紧邻上节 §4.10 与下节 §4.12 均待建——前后节走互链卡（§4.9 直链；待建节链板块目录并标「待建」，DESIGN 契约修订条）。
- §4.11.4 命令逐条语义（每条命令干什么）不在本节展开——归 §4.6 命令接口节（并行施工中）；本节总表只列名册+页码。
- 中途语言门咬词 7 处（钥匙×2/实收×3/提单×2），当轮改写——见门输出 2。
- 390px 下表格卡内文字最小 13px（td.mono）且需卡内横滚——表格节窄幅形态如实登记，未做响应式重排（4.9 同口径）。

---

# 2026-11-05 自含化改造：原生小件「TRB 装配卡座」（arf411）+ 正文三处外借改板块内自含

板块自含化（SELFCONTAIN-PLAN §二：互链卡已停渲染）后，本节原「机制课 0006 先认零件／互链卡 Fig1 装配几何」两处外借讲解改由节内原生 anatomy 小件承担：构建期补丁把 `<style>+<div>+<script>` 三件套注入 tablePage 产物（照 NARROW_CSS 先例形态，_gen/ 未动）。id/class 全部收敛 `arf411-` 前缀；inline-kit 用 anatomy skill `scripts/inline-kit.mjs` 的 `kitScript()` 内联（34KB，file:// 可开、零 import）。

## 帧清单（4 帧，步进/回退 + ←/→ + reduced-motion 静止）

| 帧 | 画面 | narr 要义 | pg 角标 |
|---|---|---|---|
| F1 模板四字 | 主卡从卡槽立起：DW0–DW3 四行卡＋行标（Parameter/Status/Control）＋DW3 位号标尺（bit0 在右）＋空位槽丝印 | 16 字节四双字＝三组件；模板印死 Cycle=bit0、TRB Type=bits10-15（+ENT bit1/ISP bit2） | p188 · Figure 4-13（Cycle=bit0 见 p189） |
| F2 字段落位 | 11 颗字段芯片按「先 Parameter→Status→Control」顺序滑入位槽（p189 Note 写序纪律）；TRB Type 芯片点亮为 F2 主体 | C=bit0/CH=bit4/IOC=bit5/IDT=bit6/BEI=bit9/TRB Type=bits10-15；Length=bits16:0/TD Size=21:17/Int Target=31:22；指针 64 位占 DW0+DW1 | p427-429 · Figure 6-8 / Table 6-20~6-22 |
| F3 拼装 TD | 三颗小卡上导轨：前两颗 CH=1 链夹相连、末颗 CH=0+IOC 旗升起、事件灯亮 | TD＝1 颗以上 TRB；Chain 置于除末颗外全部；末颗 IOC=1 完成生成 Transfer Event 回执 | p211 · §4.11.7 |
| F4 入环视角 | TD token 鱼贯进环段托盘槽序列；段尾 LINK token＋回绕线指回段首（0 号槽头） | 段尾必是 Link TRB，Ring Segment Pointer 指回段首/下一段；Toggle Cycle 至少一颗置起；环机制详见 §4.9（板块内导航） | p206-207 · §4.11.5.1 |

## 真值表（卡座读数 ↔ 规范条文，位号全部现场核自 /tmp/spec-audit-txt/xhci-1.2b.txt）

| 卡座读数 | 规范条文（页码机核 needle 见门输出 1） |
|---|---|
| 四字布局：Parameter=03-00H+07-04H（DW0+DW1）、Status=0B-08H（DW2）、Control=0F-0CH（DW3） | Figure 4-13 §4.11.1 p188（三组件句＝本节引文②） |
| Cycle bit＝Control bit0（卡面标尺 0 位） | §4.11.1.1 p189「Cycle bit shall always reside in bit 0 of the Control component」 |
| TRB Type＝Control bits 10-15 | §4.11.1.1 p188「TRB Type field shall always reside in bits 10-15 of the Control component」 |
| ENT=bit1、ISP=bit2（模板丝印） | Figure 4-13 位号行 p188 + Table 6-22 p428 |
| CH=bit4、IOC=bit5、IDT=bit6、BEI=bit9、NS=bit3、RsvdZ=8:7 与 31:16 | Table 6-22（Offset 0Ch）p428-429 |
| TRB Transfer Length=bits16:0、TD Size=bits21:17、Interrupter Target=bits31:22 | Table 6-21（Offset 08h）p427-428 |
| Data Buffer Pointer 64 位占 DW0+DW1（Lo=31:0/Hi=63:32） | Table 6-20（Offset 00h/04h）p427「bits 63:0」 |
| 芯片落位顺序＝先 Parameter/Status 后 Control | p189 Note（非原子写序纪律，prose 第 3 段同源） |
| TD＝1+ TRB、Chain 除末颗全置 1、末颗 IOC 生成事件 | §4.11.7 p211（本节引文⑥）+ p212 |
| Link TRB 恒为段尾、指针回绕段首 | §4.11.5.1 p206；Toggle Cycle 至少一颗 p207 |

## 正文改写三处（其余 cfg 逐字不动）

1. prose[0] 尾句：原「归第 6 章 §6.4 与机制课 0006（先认零件：TRB、TD 与环的几何）」→「位级骨架本节自含：……见下方『TRB 装配卡座』的机器演示……取值表仍归第 6 章 §6.4」。
2. prose[2] 尾句：原「（三环运转见互链卡的 4.9 节）」→「（TD 拼装与入环画面见本节装配卡座 F3/F4；三环指针细节见 §4.9）」+ 新增 F2 落位顺序＝p189 Note 写序半句。
3. cards[2] 表尾注：原「图 4-16/4-17/4-18 的拼装几何未作画面，机器演示见互链卡 Fig1」→「图 4-16/4-17/4-18 的拼装几何见本节装配卡座 F3」（p212 排版伪影半句保留）。
4. footLine 生成日期 2026-11-04→2026-11-05；头部注释同步。

## 门输出（逐条实测，2026-11-05）

1. 构建：`node build.mjs && node build.mjs --light` → `wrote index.html 162 KB | arf411 anchors ok (card x1, body x1, script 1/1)` ×2 主题。
2. 页码机核：`python3 scripts/xhci_spec_pagecheck.py 188 "4.11 TRBs" 188 "TRB Template" 189 "Cycle bit shall always reside in bit 0" 427 "Data Buffer Pointer Hi and Lo" 428 "Chain bit (CH)" 429 "TRB Type. This shall be set to Normal TRB type" 429 "Immediate Data (IDT)" 211 "TRBs of a TD except the last" 206 "A Link TRB shall be the last TRB of each Transfer or Command Ring" 207 "Toggle Cycle flag should be set in at least one Link TRB"` → 末行 **PAGECHECK-PASS**（needle `Chain flag is set in all the TRBs of a TD except the last` 首轮因 PDF 断行 all↵the MISS，换断行后短 needle 通过——与本文件 2026-11-04 段教训同型）。
3. 语言门：`scan_words.py retired index.html / index-light.html` → `total=5 {'回执': 5}` ×2 ⊆ 豁免表，**PASS**。
4. console 清点（锚点安全实证）：playwright channel="chrome" 双主题加载＋四帧步进＋回退一支 → `console/pageerror total: 0` **ARF411-PROBE-PASS**（=验收门 4；锚点唯一性另由构建期断言机检：家族总表卡头 ×1、真 `</body>` lastIndexOf ×1、注入体零未转义 `</script>`）。
5. anatomy 线端检查（skill 自带）：`node …/scripts/lines.mjs index.html / index-light.html` → `line ends: 0 of 254 ends on 50 lines float` ×2（3 轮收敛：卡槽缝贴块缘 0.4 / 托盘槽位改闭合槽形 / 小卡行线延到卡缘）。
6. 文本几何审计（自建探针，同变换组内平面坐标两两比＋出界查，四帧全测）→ **TEXT-AUDIT-PASS**（曾抓出组内文本双重变换真 bug，见坑 3）。
7. 遮挡：官方 `xhci_spec_occlusion_probe.py` 对本页输出 `PROBE-FAIL: 无机器驱动接口（__fig49/__fig412/__fig42/__fig43 均不在场）` + 空转 `OCCLUSION-PASS`（候选驱动表硬编码、scripts/ 禁改——如实记录，不算逐帧实证）；等价审计（照抄该脚本 EXTRACT_JS/rect_overlap/0.15 阈值/画家序判据，按钮驱动四帧＋滚动入场）→ **OCCLUSION-PASS**（0 findings；首轮 17 条，逐类归因修复后归零，见坑 4）。
8. 自包含：`grep -c 'http://\|https://'` → index.html=2、index-light.html=2，命中均 `http://www.w3.org/2000/svg`（figureSvg xmlns + kit 内联 pageHtml 模板串字面量）——**≤2 且全为 xmlns PASS**（2026-11-04 段的 0 已被本件 SVG 顶替，口径更新）。
9. 互链存在性：`check_lesson_links.py lessons/xhci-spec/ch4/4.11-trbs` → `VERDICT: ok=2 missing=0 outside=2 -> PASS`。

## shots 增量（playwright chrome，本轮新增 6 张）

- shots/arf411-dark-full.png / arf411-light-full.png —— 全页全景（full_page，双主题）
- shots/arf411-390-dark.png —— 390px 窄幅全景
- shots/arf411-reduced-dark.png —— prefers-reduced-motion 下卡座区（四帧内容全在、无动画）
- shots/arf411-closeup-dark.png / arf411-closeup-light.png —— 卡座特写（F3 态，deviceScaleFactor=2）

## 坑实录（2026-11-05）

1. **kitScript() 源含字面 `</script>` / `<script>`**（inline-kit 输出的 kit 源里 pageHtml 模板串原样带标签）：裸拼 `<script>` 会提前终止解析。pageHtml 内部本有 `</script → <\/` 转义，照抄该转义；同时构建期机检改为真不变量——注入前基线（真 `</body>`/`</html>` 各恰 1、零 `<script>`）＋注入体零未转义闭标签＋注入后真闭合居页尾。教训：给 tablePage 产物外挂 script 时，开标签计数会被源内字面量污染，闭标签转义+基线断言才是可机检的不变量。
2. **roundedPlan 缺 r 字段＝NaN 路径**：TRAY 平面少 `r`，`Math.min(undefined,…)=NaN` 产出 `MNaN NaN…`（console error 2 条/页）。教训：kit 的 plan 对象 r 必填，构建后 grep NaN 应入自检。
3. **plane 组内文本双重变换**：卡面文本各自带整面 sideMatrix 又嵌在 `<g transform=plane>` 内→变换复合两遍，文字飞出画布（路径全对、只有文字漂移；自建文本审计以屏幕坐标抓出）。组内文本改平面坐标 `translate(x,-z)`，组外铭牌才用全矩阵。教训：sideMatrix 惯用法（desk-computer 的 planeOf）是给「组」的，元素级锚点文本不能与其叠用。
4. **遮挡探针两类结构性假阳**：①探针只看元素自身 computed opacity，组级 opacity:0 的隐藏芯片仍算可见形状→隐藏态改用 `visibility:hidden`（可继承，探针 vis() 能看到）；②剪切平面里宽元素（87 世界单位宽的指针芯片）的屏幕 AABB 覆盖整片卡面，排在窄文本之后即误判遮挡→卡面发射序重排为「底槽几何→芯片实体→全部文本」，且芯片 body 路径独立携带 data-enter/--arf-d 先发（同款隐藏变换，与组同步滑动）；③铭牌从卡槽正面迁到底板左前角（主卡面大 AABB 假阳）。归零后官方判据复跑 OCCLUSION-PASS。
5. **官方遮挡探针无驱动接口即空转 PASS**：本件无 `__figNN` API、候选表硬编码、scripts/ 禁改——空转 PASS 不算实证，已按同判据自建等价审计补上（坑 4 的修复即由它驱动）。教训：借官方探针先读源码确认驱动面，无驱动面时等价复刻判据并如实记录差异。
6. **视觉模型 QC 通道不可用**（analyze_image 对签名 CDN URL 报错/限流、Read 不内联渲染）：本轮质量核验全部程序化（console=0／线端 0／文本平面+屏幕双坐标审计／遮挡 0／布局分区包围盒／帧可见性），未做模型看图复核——如实记录为已知边界。
