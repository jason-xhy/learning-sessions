# EVIDENCE.md — Fig4「订单柜台：命令环与它的回执」

判据版本：
- 规范：**xHCI 1.2b**（Document Number 625472, Revision 1.2b），文本提取本
  `/tmp/spec-audit-txt/xhci-1.2b.txt`，页码 = 文件 `===== [PAGE n] =====` 页标（下称「p N」）。
- 内核：`/Volumes/KernelSrc/linux` @ **d9008e061539**（7.3.0-rc7），行号全部现场 `grep -n` 实勘。
- 时序：`specs/actionflow-0002-hub-attach-chain.md`（插入七步链）、`specs/actionflow-0007-xhc-ring-keys.md`（环机制）。

画面上的每个承载断言逐条列出；「上画」= 画面刻了该值/字样。

## A. 位域验卡卡面（Enable Slot / Address Device / Configure Endpoint）

| # | 画面断言 | 判据出处 |
|---|---|---|
| A1 | Type **9**＝Enable Slot Command（上画） | Table 6-91 TRB Type Definitions，§6.4.6 p469-470（ID 9，仅 Command Ring Allowed）；内核 `drivers/usb/host/xhci.h:1122` `TRB_ENABLE_SLOT 9` |
| A2 | Cycle bit (C) 在 DW3 bit0（色标块） | Table 6-59，§6.4.3.2 p449（bit0 C "used to mark the Enqueue Pointer of a Command Ring"） |
| A3 | Type 字段＝DW3[15:10]（卡眉刻 "DW3[15:10]＝Type"） | §4.11.1 p188-189（TRB Template，Fig 4-13）；Table 6-59 p449 |
| A4 | Slot Type@20:16＝0（Enable Slot 卡，"ST@20:16＝0"） | Table 6-59 p449（20:16 Slot Type） |
| A5 | Type **11**＝Address Device；Type **12**＝Configure Endpoint（上画） | Table 6-91 p469-470；内核 `xhci.h:1126` `TRB_ADDR_DEV 11`、`xhci.h:1128` `TRB_CONFIG_EP 12` |
| A6 | BSR@bit9＝0（Address Device 卡 "BSR@9＝0"）＝0 时生成 USB SET_ADDRESS | Table 6-62，§6.4.3.4 p450（bit9 BSR，'0' → "shall generate a USB SET_ADDRESS request"）；§4.3.4 p76（BSR 清 0 发址）；内核 `xhci.h:974` `TRB_BSR BIT(9)`、`xhci-ring.c:4411-4417` `xhci_queue_address_device`（`setup == SETUP_CONTEXT_ONLY ? TRB_BSR : 0`） |
| A7 | DC@bit9＝0（Configure Endpoint 卡 "DC@9＝0"） | Table 6-64，§6.4.3.5 p451（bit9 DC Deconfigure，'1' 时忽略 Input Context Pointer） |
| A8 | Slot ID@DW3[31:24]＝1（"SID@24-31＝1"，卡内 span 值 1） | Table 6-62/6-64 p450/451（31:24 Slot ID）；内核 `xhci.h:821` `SLOT_ID_FOR_TRB(p) (((p) & 0xff) << 24)`；演示取值口径见 J1 |
| A9 | Input Context Pointer 63:4 · 16B 对齐（Address/Configure 卡跨 DW0-DW1 标注） | Table 6-61 p450、Table 6-63 p451（63:4 指针，"aligned on a 16-byte address boundary"）；§6.2.5 p421 |
| A10 | Enable Slot 的 DW0-DW2 全零（无参数字段，卡面 4 行 ruler 中 DW2/DW1/DW0 空白） | Figure 6-23，§6.4.3.2 p448-449（仅 DW3 有字段） |
| A11 | Address/Configure 卡 DW0-DW1 联合跨度 = Input Context Pointer（括线跨两行） | Table 6-61/6-63（Offset 00h and 04h 两行同为 63:4 指针） |
| A12 | 内核入队字段组装（TRB_TYPE<trb_type> \| SLOT_ID_FOR_TRB） | `xhci-ring.c:4403-4409` `xhci_queue_slot_control`、`:4436-4444` `xhci_queue_configure_endpoint`、`:4354` `queue_command`（field4 \| cmd_ring->cycle_state） |

## B. 命令环本体（8 槽台环）

| # | 画面断言 | 判据出处 |
|---|---|---|
| B1 | 命令环 8 槽（演示规模，画图取小；真实段 256 TRB） | 契约 §2 Fig4 给定；规模注记：§4.9.2.1 p155（Ring Segment）、内核 `xhci.h:1265` `TRBS_PER_SEGMENT 256`（256×16B=4KB） |
| B2 | **7 号槽＝Link TRB，TC=1**（立牌 "Link·TC=1"） | §4.9.2.1 p155 "The last TRB in a Ring Segment is always a Link TRB"；§4.11.5.1 p206-207（Toggle Cycle "should be set in at least one Link TRB"）；Table 6-86 p463（Link DW3 bit1 TC）；内核 `xhci-mem.c:97` `xhci_set_link_trb`、`:130`（仅末段 Link 置 LINK_TOGGLE） |
| B3 | 命令托盘 Cycle 色标＝当前生产轮色（amber=轮1 / 青灰=轮0） | §4.9.2.2 p156-158（生产者以 PCS 写 Cycle）；内核 `xhci-ring.c:4354` queue_command（`field4 | xhci->cmd_ring->cycle_state`） |
| B4 | 巡绕回绕时色标/RCS 翻色（生产轮 1→0→1） | §4.9.2.2 p157-158（过 TC=1 的 Link，PCS 翻转）；§5.4.5 p366（RCS=CCS 初值语义） |
| B5 | enqueue/dequeue 指针牌沿环推进、空环时同槽 | §4.9.3 p160（"A Command Ring is defined as 'empty' if the Dequeue Pointer is equal to the Enqueue pointer"） |
| B6 | 每槽至多一颗命令 TRB（单 TRB 命令，无链） | §4.9.3 p160 "No multi-TRB TDs are allowed on the Command Ring" |
| B7 | 旋臂吊＝xHC 取件（软件只入环，xHC 消费） | §4.9.3 p160（门铃后 xHC 处理并推进 Dequeue）；角色分工与 actionflow-0007 §1.1（环角色）一致 |

## C. CRCR 铭牌

| # | 画面断言 | 判据出处 |
|---|---|---|
| C1 | **RCS**＝bit0（RW，铭牌照刻） | Table 5-24，§5.4.5 p366（bit0 Ring Cycle State RW） |
| C2 | **CS**＝bit1、**CA**＝bit2，均刻 RW1S | Table 5-24 p366-367（bit1 CS RW1S、bit2 CA RW1S） |
| C3 | **CRR**＝bit3（RO）＋运行灯常亮 | Table 5-24 p367（bit3 Command Ring Running RO）；灯常亮的机理：§4.9.3 Note p161 "CRR is not negated when the Command Ring has completed all queued commands" |
| C4 | 锁牌「**CRR=1 写入被忽略**」 | Table 5-24 p366（RCS "Writes to this flag are ignored if Command Ring Running (CRR) is '1'"）；p367（Command Ring Pointer "Writes to this field are ignored when Command Ring Running (CRR) = '1'"）——**不是 RsvdP 防写**（避雷清单条目） |
| C5 | Command Ring Pointer 63:6（铭牌下行刻字） | Table 5-24 p367（63:6） |
| C6 | RCS 旋钮面随生产轮翻色 | Table 5-24 p366（RCS=CCS 值，随回绕翻转，§4.9.2.2） |
| C7 | CRCR 标头 | §5.4.5 p366 寄存器名 Command Ring Control Register (CRCR) |

## D. 门铃（0/1 语义分刻）

| # | 画面断言 | 判据出处 |
|---|---|---|
| D1 | 按钮（0 号门铃＝命令环） | §5.6 p394 "Doorbell Register 0 is dedicated to Command Ring"（Table 5-43 引语） |
| D2 | 铭牌行1「0 号门铃＝命令环 / Target 0＝命令门铃」 | Table 5-43，§5.6 p395 Host Controller Doorbell (0)：Value 0＝Command Doorbell（1:247 Reserved） |
| D3 | 铭牌行2「1–255＝设备门铃 / Target 0＝保留 · 1＝EP0」 | Table 5-43 p394-395 Device Context Doorbells (1-255)：0＝Reserved、1＝Control EP 0 Enqueue Pointer Update——**两个 0/1 语义分刻**（避雷清单条目） |
| D4 | （机制）软件写 doorbell[0]＝0 触发命令环 | 内核 `xhci-ring.c:429-440` `xhci_ring_cmd_db`：`writel(DB_VALUE_HOST, &xhci->dba->doorbell[0])`；`xhci.h:314` `DB_VALUE_HOST 0x00000000`；调用点 `xhci-ring.c:774/1029/1300`（命令入队后响铃） |
| D5 | 门铃后 xHC 才取件（旋臂动作在响铃帧之后） | §4.9.3 p160 "When the Host Controller Doorbell Register (0) is written … the xHC will evaluate the Command TRB pointed to by the Command Ring Dequeue Pointer" |

## E. DCBAA 编号储物柜

| # | 画面断言 | 判据出处 |
|---|---|---|
| E1 | 柜名牌「DCBAA · 槽号→上下文地址」 | §3.2.1 p48（DCBAA＝Slot ID 查找表）；§6.1 p403（entry＝64-bit 指针，按 Device Slot ID 索引） |
| E2 | **0 号格＝Scratchpad**（格内刻字） | §3.2.1 Note p48（"the first entry (Slot ID = '0') … utilized by the xHCI Scratchpad mechanism"）；内核 `xhci-mem.c:1675` `xhci->dcbaa.ctx_array[0] = scratchpad sp_dma` |
| E3 | 2–5 号格刻「0」（未分配＝0） | §6.1 p404 "Software shall set Device Context Base Address Array entries for unallocated Device Slots to '0'" |
| E4 | **1 号格插入「设备上下文地址」牌**（软件挂入，非柜员） | §3.2.1 p48 "system software … inserts a pointer to the newly created Device Context into the DCBAA at the location indicated by the Slot ID"；§4.3.3 step10 p76（软件装载 DCBAA 表项后发 Address Device）；内核 `xhci-mem.c:1018-1019`（`xhci_alloc_virt_device`：`xhci->dcbaa.ctx_array[slot_id] = dev->out_ctx->dma`，由软件在收 Enable Slot 回执后调用，调用点 `xhci.c:4279`）——**与契约 §2「柜员插牌」的出入见 DESIGN §5 修订** |
| E5 | 6 格可见（0-5）为演示取小 | §6.1 p403-404（MaxSlotsEn+1 项、64B 对齐、至多 256×64bit=2KB；画图取 6 格） |
| E6 | 柜顶「已编址」灯（F3 回执后亮，账本不擦） | §4.3.4 p76（Address Device 完成后进 Device Configuration，槽 Default→Addressed，§6.4.3.4 p450）；灯不随巡绕熄灭＝账本持续有效 |

## F. 申请单夹（Input Context）

| # | 画面断言 | 判据出处 |
|---|---|---|
| F1 | 夹页三格：输入控制上下文 / 槽上下文 / EP 上下文 0 | §6.2.5 Figure 6-5 p421-422（ICI 0=Input Control Context@000h、1=Slot@020h、2=EP Context 0@040h，CSZ=0 口径） |
| F2 | Address Device 页点亮 **A0 A1**（页首格 "A0 A1"） | §4.3.3 step5 p75（Input Control Context 置 A0、A1＝1，Slot Context 与 EP0 Context 受影响） |
| F3 | Configure Endpoint 页点亮 **A2 A3**＋「EP 上下文 1 OUT（DCI 2·A2）/ EP 上下文 1 IN（DCI 3·A3）」 | §6.2.5 p421-422（"EP context 1 OUT maps to D2 and A2, and so on, up to EP 15 IN mapping to D31 and A31"；Figure 6-5 ICI 2/3＝EP1 OUT/IN） |
| F4 | 槽上下文格提法「Route · Ctx=1」 | §4.3.3 step6 p75-76（Route String 拓扑定义、Context Entries = 1） |
| F5 | EP0 格提法「EP Type=Control」 | §4.3.3 step8 p76（EP Type = Control；另 Max Packet Size 取自 PORTSC Port Speed、DCS=1） |
| F6 | 夹子展开（F3）/翻页（F4）的时点 = 对应命令冲压之前 | §4.3.3 p75-76（Input Context 先初始化、后发命令）；内核 `xhci.c:4504` `xhci_address_device` / `:2958` `xhci_configure_endpoint` 均以 in_ctx 指针入队 |

## G. 回执卡（Command Completion Event）

| # | 画面断言 | 判据出处 |
|---|---|---|
| G1 | 「Command Completion」＋「Type 33（DW3[15:10]）」 | Table 6-91 p471（ID 33 Command Completion Event）；§6.4.2.2 p440 |
| G2 | 「CC 1 · Success（DW2[31:24]）」 | Table 6-41 p441（31:24 Completion Code）；Table 6-90，§6.4.5 p465（Value 1＝Success）——**完成码表＝Table 6-90**（避雷清单条目） |
| G3 | 「Slot ID 1（DW3[31:24]）」 | Table 6-42 p441（31:24 Slot ID；Enable Slot 时＝新分配 Device Slot ID）；演示取值口径见 J1 |
| G4 | 「Command TRB Pointer → n 槽」（回指被执行命令 TRB） | Table 6-40 p440（63:4 Command TRB Pointer＝产生本事件的命令 TRB 地址） |
| G5 | 窗牌「回执 → Fig3 登记机」 | §6.4.2.2 Note p440 "The Primary Event Ring (0) shall receive all Command Completion Events"（回执走事件环，机制归 Fig3） |
| G6 | 回执出窗后入管道（事件环消费在 Fig3 完成） | §4.9.3 p160 "The location of the Command Ring Dequeue Pointer is reported on the Event Ring in Command Completion Events" |

## H. 帧序机制断言

| # | 画面断言 | 判据出处 |
|---|---|---|
| H1 | 帧序 F1 投单→F2 执行+回执→F3 大单→F4 配置端点，逐条等待回执后推进 | §4.3.2 p75（"shall wait for the Command Completion Event associated with the Enable Slot Command before issuing any more commands to the slot"）；§4.3.4 p76（Address Device 同款） |
| H2 | 三条命令的真实次序＝插入链的 xHCI 段 | actionflow-0002 S6 时间线 5-7 条：hub_enable_device（hub.c:5057）→ xhci_enable_device（xhci.c:4510）/ xhci_alloc_dev（xhci.c:4225，内含 `xhci-ring.c:4403` 队列 TRB_ENABLE_SLOT）→ hub_set_address（hub.c:5093）→ address_device（hub.c:4785-4786 → xhci.c:4504）→ usb_set_configuration（message.c:2062）→ usb_hcd_alloc_bandwidth（hcd.c:1850）→ add_endpoint（hcd.c:1915/1951）→ xhci_configure_endpoint（xhci.c:2958） |
| H3 | 门铃每命令恰一次、在入环后 | §5.6 p394＋内核 `xhci_ring_cmd_db` 调用点（D4）；规范每次下单响 0 号门铃 |
| H4 | xHC 内核侧完成处理（回执 CC/Slot ID 的消费方） | `xhci-ring.c:1810` `handle_cmd_completion`：`:1813` `slot_id = TRB_TO_SLOT_ID(...)`、`:1832` `cmd_comp_code = GET_COMP_CODE(...)`、`:1880` `xhci_handle_cmd_enable_slot`、`:1887` `xhci_handle_cmd_config_ep`、`:1892` `xhci_handle_cmd_addr_dev` |
| H5 | 命令环运行灯在整个演示期保持亮（CRR 不随空闲清零） | §4.9.3 Note p161（CRR=1 时环可 Busy 或 Idle，完成全部命令不清 CRR） |
| H6 | 巡绕复位仅重置演示态（托盘回料架、计数清零、色轮翻转），DCBAA 牌与「已编址」灯保留 | 色轮翻转＝§4.9.2.2 PCS 翻转；账本保留＝§3.2.1/§6.1（DCBAA 表项持续有效，直至 Disable Slot） |

## I. 演示取值口径（防误读）

| # | 口径 | 说明 |
|---|---|---|
| J1 | **Slot ID＝1 为演示值** | 规范语义＝xHC 选中的新分配槽（Table 6-42 p441）；具体数值由 xHC 实现决定（§4.3.2 p75），画面取首个分配槽＝1 作示例 |
| J2 | 8 槽环 / 6 格柜 / 3 条命令为画图取小 | 真实规模：段 256 TRB（xhci.h:1265）、DCBAA 至多 256 项（§6.1 p404）、命令集见 Table 6-91；与 actionflow-0007 §教学简化 1 同口径 |
| J3 | 「Initialize Endpoint」**不存在**，画面与卡面均未出现 | 1.2b 无此命令（避雷清单条目）；端点上下文经 Address Device / Configure Endpoint 投递（§6.2.5 p421、§4.3.3 p75-76） |
| J4 | DCBAA 判据章节为 **§3.2.1（p48-49）＋§6.1（p403-404）**；任务派单所写「§6.5（DCBAA）」在 1.2b 中实为 Event Ring Segment Table（p473） | 已按 DESIGN §5 登记 |

## K. 不在画面出现的已知语义（防复现备注）

- 门铃 DB Stream ID：命令门铃须清 0（Table 5-43 p395）——画面未涉及 Stream，不刻。
- CRCR CS/CA 的 RW1S 写 1 生效语义（停环/中止）：铭牌只刻位名与 RW1S 属性，不演示。
- Resource Error/Bandwidth Error（Table 6-90 值 7/8）：演示全 Success，不画失败分支。

## L. R1 重做轮排版备注（2026-10-31，评审判据：只修遮挡与可读性，无新增判据断言）

- 「CRR=1 写入被忽略」锁牌由铭牌挂面式改为**顶置立牌**（立于铭牌顶面 z 84），CRR 单元
  （bit3）与「Ring Pointer 63:6」行不再被遮挡；铭牌加宽至 x 78..116。
- 验卡卡头缩写对照：**T9＝Enable Slot、T11＝Address Device、T12＝Configure Endpoint**
  （Type ID 仍见 Table 6-91，与 A1/A5 同源）；卡眉公式行「15:10＝Type · bit0＝C」
  即 A3＋A2 的位域位置。字段值与位号未变（A1-A12 原样有效）。
- 门铃铭牌左移 4、栅栏（wicket）右移 20，消除横梁投影压字；dark 下卡面底色
  #1d1d1d/#262626、次级字 #9a9a9e、字号 fx-lbl 2.15/fx-lbl2 1.8——数值判据零变化。
