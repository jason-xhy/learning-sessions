# EVIDENCE.md —— Fig1「总装流水线：一颗 URB 的三工位之旅」画面断言逐条登记

- 规范判据：**xHCI 1.2b**（Document Number 625472, Revision 1.2b），文本版 `/tmp/spec-audit-txt/xhci-1.2b.txt`，
  页码 = 该文件 `===== [PAGE n] =====` 页标（与印刷页码一致）。
- USB 判据：**Universal Serial Bus Specification Revision 2.0**，文本版 `/tmp/spec-audit-txt/usb-2.0.txt`，
  页码 = 该文件 PDF 页标（**PDF 页标 = 印刷页码 + 28**；下文同时标注两种页码）。
- 内核判据：`/Volumes/KernelSrc/linux` @ **d9008e061539**（7.3.0-rc7，"usb-storage: bound the isd200 config
  transfers"），全部行号 `grep -n` 现场实勘，无课件旧行号。
- 时序判据：`specs/actionflow-0006-xhc-trb-parts.md`、`specs/actionflow-0009-xhc-transfer-drama.md`
  （帧序重建权威，本画面未自创任何时序）。
- 画面文件：`fig1-assembly/build.mjs` / `live.js`（断言所涉的绘制与动画代码均在此二文件）。

## A. 传输结构断言（机器叙事骨架）

| # | 画面断言 | 出处（实勘） |
|---|---|---|
| A1 | 控制传输 = 2 或 3 个 Stage TD；本例 Setup TD + Data TD + Status TD 共 3 件 | xHCI 1.2b §6.4.1.2 @p429 原文 "Control transfers require two or three TDs to define them…"；§3.2.9 @p57 "…placing either two (Setup Stage and Status Stage), or three (Setup Stage, Data Stage, and Status Stage) TDs on the Transfer Ring before ringing the doorbell." |
| A2 | 本例 TRB 数 = **3 颗**（Setup / Data / Status 各 1 颗，无 Event Data TRB）；每件 Stage TD 恒单颗 | 内核 xhci-ring.c:3812–3820 `num_trbs = 2; if (urb->transfer_buffer_length > 0) num_trbs++;` = 3，且控制路径无 Event Data TRB 排队代码（`TRB_EVENT_DATA` 仅 :1191 表项）；§4.11.2.2 @p191 "Each Setup Stage TD shall contain a single Setup Stage TRB."、"A Status Stage TD shall contain of a single Status Stage TRB…"；契约原列「4 个 TRB」已按 §5 契约修订更正 |
| A3 | Setup TD 恒单颗（Setup TRB 无链位可用，DW3 bit4:1 = RsvdZ） | Table 6-26 @p430（bit4:1 RsvdZ）；§4.11.2.1 @p190（CH 允许列不含 Setup） |
| A4 | TRB 恒 16 字节，xHC 按 16 字节步进消费 | §4.9.2 @p151-152 "All TRB data structures shall be 16 bytes in size."；§4.9.2.2 @p156 "The xHC increments the pointer value by 16 bytes" |
| A5 | TD/TRB 术语（TD=单次传输、由 1..N TRB 组成） | §1.6 @p35 |
| A6 | 环与 TRB 对 USB 设备不可见（灯箱底铭牌） | §3.2.6.1（环为主机内存数据结构）+ §4.9.2（环=主机内存，设备只见线上事务）；actionflow-0009 §1 同口径 |

## B. 演示样例断言（GET_DESCRIPTOR(Config) wLength=18）

| # | 画面断言 | 出处（实勘） |
|---|---|---|
| B1 | bmRequestType = 0x80（Device-to-host, Standard, Device） | USB2 §9.4.3 Get Descriptor（PDF p281 / 印253，bmRequestType=10000000B）；Table 9-2（PDF p276 / 印248）D7=Data transfer direction（1=Device-to-host） |
| B2 | bRequest = 0x06 GET_DESCRIPTOR | USB2 Table 9-3/§9.4.3（PDF p281） |
| B3 | wValue 高字节 = 02h = CONFIGURATION 描述符类型，低字节 = 00 索引 | USB2 Table 9-5 Descriptor Types（PDF p279 / 印251：CONFIGURATION=2）；§9.4.3 "The wValue field specifies the descriptor type in the high byte (refer to Table 9-5) and the descriptor index in the low byte." |
| B4 | wIndex = 0x0000 | USB2 §9.4.3（非 string 描述符 wIndex = Zero） |
| B5 | wLength = 0x0012 = 18；只回前 18 字节 | USB2 §9.4.3 "The wLength field specifies the number of bytes to return. If the descriptor is longer than the wLength field, only the initial bytes of the descriptor are returned."（两段式读配置的标准首读） |
| B6 | Setup 包线上字节序 = 80 06 00 02 00 00 12 00 | USB2 Table 9-2 偏移 0..7（bmRequestType/bRequest/wValue/wIndex/wLength，小端） |
| B7 | Setup TRB DW0 = 0x02000680（bmRequestType\|bRequest<<8\|wValue<<16） | Table 6-23 @p430 + 内核 xhci-ring.c:3858 |
| B8 | Setup TRB DW1 = 0x00120000（wIndex\|wLength<<16） | Table 6-24 @p430 + 内核 xhci-ring.c:3859 |
| B9 | Setup TRB DW2 = TRB Transfer Length **8**（"Always 8"），Interrupter Target=0 | Table 6-25 @p430 + 内核 xhci-ring.c:3860（`TRB_LEN(8) \| TRB_INTR_TARGET(0)`） |
| B10 | Setup TRB DW3 bit6 **IDT=1**（8 字节 setup 载荷内联进参数域 DW0/DW1） | Table 6-26 @p430 "Immediate Data (IDT). This bit shall be set to '1' in a Setup Stage TRB."；内核 xhci-ring.c:3841–3842 `field \|= TRB_IDT \| TRB_TYPE(TRB_SETUP)` |
| B11 | Setup TRB DW3[15:10] **Type=2**（Setup Stage TRB） | Table 6-26 @p431（15:10 TRB Type）+ 内核 xhci.h:1108 `TRB_SETUP 2` |
| B12 | Setup TRB DW3[17:16] **TRT=3**（IN Data Stage，控制读且 wLength>0） | Table 6-26 @p431（0=No Data Stage / 1=Reserved / 2=OUT Data Stage / 3=IN Data Stage）；Table 4-7 @p192（Device-to-host & wLength>0 ⇒ Data Stage=IN）；内核 xhci-ring.c:3846–3854（`TRB_TX_TYPE(TRB_DATA_IN)`，xhci.h:1071 `TRB_TX_TYPE(p) ((p)<<16)`、:1072 `TRB_DATA_OUT 2`、:1073 `TRB_DATA_IN 3`） |
| B13 | **IDT 不是 Setup 专属**（避雷项对照：Normal/Data TRB 亦允许 IDT，画面在 B 组注释中对照呈现） | Table 6-20/6-22 @p429（"The Immediate Data (IDT) control flag selects this option for each Normal TRB"；仅 Max Packet Size<8B 或 IN 端点禁用）；内核 xhci.h:2027–2038 `xhci_urb_suitable_for_idt`（≤8B OUT 小包内联）、xhci-ring.c:3714（bulk 同样调用） |
| B14 | Data Stage TRB **Type=3**（不是 Normal） | Table 6-29 @p433（15:10 TRB Type = Data Stage TRB）+ 内核 xhci.h:1110 `TRB_DATA 3`、xhci-ring.c:3865 `TRB_TYPE(TRB_DATA)` |
| B15 | Data TRB DW3 bit16 **DIR=1（IN）** | Table 6-29 @p433 "Direction (DIR)…If set to '1', the data stage transfer direction is IN (Read Data)"；Table 4-7 @p192；内核 xhci-ring.c:3883 `field \|= TRB_DIR_IN`（xhci.h:1070 `TRB_DIR_IN BIT(16)`） |
| B16 | Data TRB **ISP=1**（bit2；仅 IN 端点设短包中断） | Table 6-29 @p432（ISP 定义）；内核 xhci-ring.c:3863–3866 `field = TRB_ISP \| TRB_TYPE(TRB_DATA)`（注释 "Only set interrupt on short packet for IN endpoints"） |
| B17 | Data TRB **IOC=0**（画面 Data 卡无 IOC 格） | §6.4.1.2 Note @p429 "The IOC flag should only be set in the Status Stage TRB of a Control transfer."；内核 xhci-ring.c:3863–3866 无 TRB_IOC |
| B18 | Data TRB DW2[16:0] **TX Length=18** | Table 6-28 @p432（"Valid values are 1 to 64K"）+ 内核 xhci-ring.c:3887–3890 `TRB_LEN(urb->transfer_buffer_length)` |
| B19 | Data TRB DW2[21:17] **TD Size=0**（Data TD 单颗，本颗即末颗） | 内核 xhci-ring.c:3521–3543 `xhci_td_remainder`：`trb_buff_len == td_total_len` → 返 0（调用点 :3891–3892）；Table 6-28 @p432 TD Size 定义 |
| B20 | Data TRB DW0/DW1 = 18 字节缓冲的 **DMA 地址**（非内联） | 内核 xhci.h:2027–2038（IDT 仅 ≤`TRB_IDT_MAX_SIZE 8` 字节 OUT 小包，:1064）；18B>8B → xhci-ring.c:3874–3878 `addr = (u64) urb->transfer_dma` |
| B21 | Status TRB **Type=4** | Table 6-31 @p434 + 内核 xhci.h:1112 `TRB_STATUS 4`、xhci-ring.c:3913 `TRB_TYPE(TRB_STATUS)` |
| B22 | Status TRB **DIR=0（OUT）**（控制读的状态段方向翻转） | Table 6-31 @p434 "If cleared to '0', the status stage transfer direction is OUT (Host-to-device)"；Table 4-7 @p192（DTD=IN & wLength>0 ⇒ Status Stage=OUT）；内核 xhci-ring.c:3905–3908 `field = 0`（数据段 IN ⇒ status 走 OUT） |
| B23 | Status TRB **IOC=1**（bit5） | Table 6-31 @p434 + 内核 xhci-ring.c:3914 `TRB_IOC`（注释 "Event on completion"）；§4.10.4 @p187（IOC → 事件） |
| B24 | Status TRB DW2 = 0（零长） | 内核 xhci-ring.c:3910–3913（queue_trb 传 0, 0）；USB2 Table 8-7（PDF p255 / 印227）：控制读状态段 = 主机先发零长数据包、状态在握手相 ACK |
| B25 | 一次门铃、三颗整件同时发布；首颗 TRB 反极性压着（冲压时 C=0），发布时 wmb 后翻 C=1 | 内核 xhci-ring.c:3841–3844（`if (start_cycle == 0) field \|= 0x1` 反着写）、:3830–3836（存 start_cycle）、:3439–3451 `giveback_first_trb`（wmb → 按 start_cycle 补写首颗 cycle → 门铃）；规范依据 §4.11 @p189 原子写规则（Parameter/Status 先于 Control 落笔）——画面以「一冲 DW0–DW2、二冲 DW3、入环时翻 C」表现 |
| B26 | DW3 控制字最后落笔（冲压顺序的规范依据） | §4.11 @p189 "…the Parameter and Status components of a TRB shall be initialized prior to writing the Control Component."；内核 queue_trb（xhci-ring.c:3251–3256）field[0..2] → `wmb()` → field[3] |

## C. 门铃与环规则断言

| # | 画面断言 | 出处（实勘） |
|---|---|---|
| C1 | 门铃刻牌 **Doorbell · DB Target=1 (EP0)**；DB Target=0 为 Reserved（画面不写 0） | Table 5-43 @p395（Device Context Doorbells 1-255：0=Reserved、**1=Control EP 0 Enqueue Pointer Update**；Doorbell 0 专用于命令环） |
| C2 | 软件在传输环放入工作项后敲设备上下文门铃 | §4.7 @p142 "System software rings a Device Context Doorbell after it has inserted work on a Transfer Ring…"；内核 xhci-ring.c:579 `writel(DB_VALUE(ep_index, stream_id), db_addr)` |
| C3 | 内核 EP0（ep_index=0）写入门铃值 = 1 | 内核 xhci.h:313 `DB_VALUE(ep, stream) ((((ep)+1)&0xff)\|((stream)<<16))` → ep_index=0 ⇒ 1 |
| C4 | Cycle 规则四条（初始化全 0、PCS/CCS=1、生产者写 PCS、消费者只读且 C=CCS 才执行） | §4.9.2.2 @p156-157 原文四条款（画面所有权色带=Cycle bit 机器件：蓝=本轮 C=1 可被取件、灰=旧轮） |
| C5 | ENQ/DEQ 双针指示仪：ENQ=生产者推进（软件）、DEQ=消费者推进（xHC） | §4.9.2.2 @p156（Software is responsible for advancing the Enqueue pointer）；§4.9.2.2 @p157（Consumer 执行 Dequeue Pointer 处 C=CCS 的 TRB） |
| C6 | 取件后槽色带褪回旧色（消费不擦、槽内旧值残留） | §4.9.2.2 @p156-158 复用模型；actionflow-0009 §3 帧 5「主环三颗变旧值残留（消费不擦、覆写即回收）」 |
| C7 | 完成回流=Transfer Event 回执（一笔带过，细节归 Fig3） | §4.10.4 @p187（IOC → xHC 产 Transfer Event）；§6.4.2.1 @p438-439（事件字段） |

## D. 包序断言（灯箱三盏灯：SETUP → DATA1·18B → STATUS）

| # | 画面断言 | 出处（实勘） |
|---|---|---|
| D1 | SETUP 事务：SETUP 令牌 + DATA0（8B） | USB2 §8.5.3（PDF p253 / 印225）"A SETUP always uses a DATA0 PID"；设备必须接受 SETUP 并回 ACK（PDF p254 / 印226） |
| D2 | 数据段（控制读）：IN 令牌 + **DATA1** 短包（18B） | USB2 §8.5.3 Figure 8-37 Control Read（PDF p254 / 印226：IN(1)/DATA1）；§8.6.1（PDF p261 / 印233）SETUP 事务结束时主机与设备序列位同为 1 ⇒ 数据段首笔=DATA1（避雷清单 F1 对照项） |
| D3 | 状态段（控制读）：主机 OUT + 零长 DATA1，设备以 ACK 应答 | USB2 §8.5.3（PDF p254）"A Status stage…always uses a DATA1 PID"；Table 8-7（PDF p255 / 印227）控制读行=握手相 ACK |

## E. 调用栈牌断言（四块铭牌刻字，全部实勘）

| # | 刻字 | 出处（grep -n @d9008e061539） |
|---|---|---|
| E1 | `usb_submit_urb` — drivers/usb/core/urb.c:**375** | drivers/usb/core/urb.c:375 `int usb_submit_urb(struct urb *urb, gfp_t mem_flags)` |
| E2 | `usb_hcd_submit_urb` — drivers/usb/core/hcd.c:**1516** | drivers/usb/core/hcd.c:1516 `int usb_hcd_submit_urb (struct urb *urb, gfp_t mem_flags)`；:1543 `hcd->driver->urb_enqueue(...)`（分发点） |
| E3 | `xhci_urb_enqueue` — drivers/usb/host/xhci.c:**1620** | drivers/usb/host/xhci.c:1620 `static int xhci_urb_enqueue(...)`；:1698 控制 urb 调 `xhci_queue_ctrl_tx` |
| E4 | `xhci_queue_ctrl_tx` — drivers/usb/host/xhci-ring.c:**3774** | drivers/usb/host/xhci-ring.c:3774 `int xhci_queue_ctrl_tx(...)` |

## F. 避雷清单对照（§1 逐条自查）

| 避雷条目 | 本画面处置 |
|---|---|
| 控制传输不得画成 1 个 TD | 3 件 TD 夹具（A1/A2） |
| 控制读 Data 段首包 = DATA1 | 灯箱灯 2 刻 DATA1·18B（D2） |
| 「控制传输不需要 ZLP」不作一般断言 | 画面不断言 ZLP；状态段只按 Table 8-7 刻「主机 OUT 零长 + ACK」（D3） |
| IDT 不是 Setup 专属 | B13 注释对照（Normal TRB IDT 条款 + 内核 ≤8B 内联） |
| 门铃 DB Target：EP0=1，不写 0 | 门铃刻牌 DB Target=1（C1） |
| TD Size 算术自洽（无 130KB 样例） | 演示样例 18B，TD Size=0（B19），无 130KB/131072 字样 |
| Cycle 四条出 §4.9.2.2 | C4 |
| 命令环/事件环内容不入本图 | 仅 F5 一笔回执带过（C7） |
| 「整条事件链同一 hardirq 跑完」不作断言 | 画面无此表述 |
| `xhci_reset_device` 等不存在的名字 | 画面无此名（调用栈牌四名全实勘） |
| 页码口径全部 1.2b | 全文页标 = /tmp 提取文本页标（页眉声明） |

## H. R1 重做轮记录（评分门打回，仅动视觉与截图，零语义/帧序改动）

- 评分门结论：美感 7 打回、逻辑 9 过线 → 本轮只改：dark 主题机身基色提亮（fig1.css 覆盖 kit 暗色
  token，对齐 Fig2/Fig4 暗景亮度；light 主题经特异性隔离不受影响）、全局刻字字号上调 1.5–2 档、
  画幅 900×460/pad22 → 1040×680/pad12（scale 1.594 → 2.093，模型放大约 1.31 倍）、390 视口 CSS
  拉伸 140% 满幅、f5 截图改取回执落地收敛帧（读数含「完成 1」）。
- 随字号上调的版式适配（不改任何断言内容）：位域卡行距收紧、DW0/DW1 字节串移作卡底行、冗余脚注串
  移除（全部合同要求值仍以色带+格值呈现）；门铃刻字由顶面小牌改刻床身前面板大字
  （内容逐字不变：「门铃 Doorbell · DB Target=1 (EP0)」）；栈牌改三行（函数名/目录/文件:行号，
  行号数值不变）。
- 门禁复跑：`node build.mjs --audit`（dark/light）均 `audit passed`；`lines.mjs`（dark/light）
  均 `line ends: 0 of 1114`；全套截图（双主题逐帧全景+特写、390、reduced、慢速连拍）重摄并逐张目检。
- 本文件 A–F 组全部断言在 R1 中零改动。

## I. R2 复评轮记录（定点修复两处视觉残余，零语义/帧序改动）

- 包序灯 SETUP 永不亮：非渲染竞态——灯箱塔身为单件 slab，其中心 painter 深度恰夹在
  lamp0/lamp1 两 item 之间，塔身前面（含开窗区）在 lamp0 之后绘制，窗内暗腔与琥珀灯泡
  一并被面漆覆盖。修复：三盏灯 item 各加 bias 10，绘制序越过塔身（灯窗本就是塔面
  上的显示层）。验证：f4（包序 1/3）SETUP 单盏琥珀、f5（包序 3/3）三盏全亮，
  双主题放大逐盏数灯（lamp-f4/lamp-f5 及终版 f4-full/f5-full）。
- URB 工作单叠影：平躺卡四行文字在 35° 俯视下行屏距 ~1.03px/世界单位，
  与 2.09px/字的字号相比必然相互压叠。修复：改为立插进件槽前唇的竖卡
  （竖直面行距不受俯视压缩），卡加宽至 36、四行 anchor 补 middle、
  亮面专属配色；DW 行标签改 DW0/DW3 端点标注（消除 2.0 行距下四行连排叠影）；
  文书台工位铭牌移至台身前面板大字（屏面与 URB 立卡不再重叠）。
- 门禁复跑：`node build.mjs --audit`（dark/light）均 `audit passed`；`lines.mjs`
  （dark/light）均 `line ends: 0 of 1114`；全套截图（双主题逐帧全景+特写、
  390、reduced、慢速连拍）重摄并逐张目检。A–H 组断言在 R2 中零改动。

## G. 契约偏离登记（详见 DESIGN.md §5）

1. §2 原文「3 个 TD、4 个 TRB」→ 实勘更正为 **3 颗 TRB**（Event Data TRB 不排，内核控制路径无此代码）。
2. F3「3 夹具依次**滑入**环形轨道」→ 实现为**上下料龙门依次吊放入槽**（单口入料的通道无法既线性填
   0/1/2 槽又不穿越已占槽；吊放机制下所有权上色、ENQ 推进、首颗 C 翻色等教学语义全部保留）。
3. F5 读数「TD=1 装配完成」按读数公式呈现为 `TD 装配 3/3 · 门铃 1 · 包序 3/3 · 完成 1`（完成计数 1 件）。
