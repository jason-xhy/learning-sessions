# R12 批 C · TrackA-2（§4.11 后五支主片+两支补丁片 · 2026-11-09）

> 主片判据全部出自 evidence/spec-411.txt（1707 行=规范 §4.11 全节，页标
> [PAGE 188-218] 行内嵌；行号=切片内行号）。补丁片判据全部现场
> `git -C /Volumes/KernelSrc/linux show <hash>` 取原文（禁手抄；diff 行号
> 由 r12c_hunk_lines.py 从 git show 机算，脚本=通用 hunk 行号对照器）。
> 上屏 EN 引文机核 93/93 MISS=0（探针 ~/.cache/zcode-tmp/r12c_quote_check2.py
> =波次 1 探针扩展版：主片 35 条对切片归一子串+补丁片 spec 1 条+message
> 20 段对 git show 归一全文；波次 1 六支 37 条回归零漂移）。
> 渲染/部署/smoke_player 归主会话。

## ① xh1103 §4.11.3 Event TRBs+4.11.3.1 Transfer Event TRB（1560f · beats=58 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - ED 定义+生产消费反转（chip）："Event TRBs shall be found on an Event
    Ring. A Work Item on an Event Ring is called an Event Descriptor (ED).
    An ED shall be comprised of only one … TRB data structure. … The xHC is
    the producer of all Event TRBs and system software is the consumer."
    ← **L677-679+L685+L687-688**（p201，跨 PAGE 201 标拆 … 三段）
  - 用途（chip）："Event TRBs are used to report events associated with the
    Command Ring and Transfer Rings, as well as a variety of other host
    controller related events (Port Status Change, Bandwidth Requests, etc.)"
    ← **L689-691**（p201）
  - 字段依赖（chip）："The field definitions of the Parameter, Length, and
    the high word of the Control components of Event TRBs are all Event Type
    Dependent. … The Event Type field shall define the contents of the Event
    Type Dependent fields. The Event Type field shall indicate Event Ring
    TRB Types as defined in Table 6-91." ← **L692-696**（p201）
  - 主/副环准入（chip+note）："Any Event Type may be found on the Primary
    Event Ring. Only Transfer, Bandwidth Request, and Device Notification
    Events may be found on a secondary Event Ring."（副环三类+§4.9.4.3 引）
    ← **L697-699**（p201）
  - IMPLEMENTATION NOTE（chip）：Dword 3（C 位）最后翻转/可单次 DMA 原子/
    离散更新则 C 位收尾 ← **L703-706**（p201）
  - Transfer Event 三条件（chip，bullet 分段）："Transfer Event TRB
    generation shall only occur under the following conditions: … If the
    Interrupt On Completion (IOC) flag is set. … When a short transfer
    occurs during the execution of a Transfer TRB and the Interrupt-on-Short
    Packet (ISP) flag is set. … If an error occurs during the execution of
    a Transfer TRB." ← **L709-716**（p201）
  - 不可归因错误（chip）：Ring Overrun/Underrun 等→TRB Pointer=‘0’ 软件视为
    无效 ← **L717-719**（p201）
  - 推进逐 IOC（chip）："each Transfer TRB encountered with its IOC flag set
    to ‘1’ shall generate a Transfer Event" ← **L720-724**（p201）
  - CC/Length 继承（chip）："The Condition Code of the “current” Transfer
    Event shall be set to the value of the Condition Code in the original
    Transfer Event, and the TRB Transfer Length … should be set to value of
    the TRB Transfer Length field in the original Transfer Event."
    ← **L725-728**（p201-202）
- 档位：任务档 中 800-1400f，实绩 1560f 超上限 160f（+11.4%，xh1004 +17.7%
  先例内记档）——9 拍判据链（ED/用途/字段/环准入/实现注记/三条件/Ptr=0/
  逐 IOC/继承）全覆盖不砍；pace 修平 +3.2s+富余收缩 -1.5s 后仍超。

## ② xh1104 §4.11.4 Command TRBs 格式族轻片（1226f · beats=52 · pace fast=0 · probe viol=0 · scan ok）

- 定位（R12-SPEC §0）：命令 TRB 布局已在 §4.6 十八小节各卡讲透——本片只讲
  格式族公共口径，.4.1-.4.17 互链不重讲（收口卡「互链」行+分组表卡）。
- 上屏论断↔切片行号（spec-411.txt）：
  - 清零公共口径+Type 字段（chip）："The Parameter, Status and Length TRB
    components shall be cleared to ‘0’ by system software unless otherwise
    noted by a specific command. The TRB Type field of the Control
    component shall indicate the Command Type. Table 6-91 defines the
    available Command TRBs, that is, TRB Types allowed on a Command Ring."
    ← **L737-741**（p202）
  - 完成事件+Cycle=PCS（chip）："For every command, the xHC notifies system
    software of its completion by placing a Command Completion Event TRB on
    the Event ring. When a Command TRB is initialized on the Command ring,
    the Cycle bit will be set to the value of the Command Ring’s Producer
    Cycle State (PCS) flag." ← **L742-745**（p202）
  - Endpoint/Stream Context（chip）："the combined contexts are referred to
    as the “Endpoint/Stream” Context." ← **L746-749**（p202）；Input
    Context Note（note）：Address/Configure/Evaluate 三命令 ← **L752-753**
  - 十七命令分组表卡（槽位/端点/可选三族）+同格式事实（note）："The Enable
    Slot Command utilizes the same format as the No Op Command TRB"
    ← **L766-767**；逐命令互链 §4.6.2-4.6.18
  - 代表命令三连（chip+note）：Enable Slot "causes the xHC to select an
    available Device Slot and return the ID of the selected slot to the
    host in a Command Completion Event" ← **L763-765**（p202）；Address
    Device "transitions the selected Slot Context from the Default to the
    Addressed state. It also causes the xHC to select an address for the
    USB device and issue a SET_ADDRESS request" ← **L784-786**（p203）；
    Disable Slot 带宽/资源释放+Slot State=Disabled ← **L771-773**；Stop
    Endpoint 停包流+TD 所有权交软件 ← **L830-832**；Reset Endpoint 重启
    Halted ← **L817-819**
  - 可选族（chip+note）：BNC 能力位句 "If the BW Negotiation Capability
    (BNC) bit in the HCCPARAMS1 register is ‘1’, then the xHC shall support
    this command." ← **L866-867**（p205）+Optional Normative 标注口径
    （.4.11/.12/.13/.14/.16/.17，切片标题行）
- 档位：任务档 小 450-1000f，实绩 1226f 超上限 226f（+22.6%，xh0700
  +42.5% 先例内记档）——轻片=格式公共面+代表三连+可选族注记六拍；pace
  修平 +1.0s+富余收缩 -2.9s 后仍超（代表命令走读与可选族注记为 §9 口径
  的 Optional 标注义务，不砍）。

## ③ xh1105 §4.11.5 Other TRBs+.5.1 Link TRB+.5.2 Event Data TRB（1720f · beats=62 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - Link 用途（chip）："The Link TRB provides support for sizing and
    non-contiguous Transfer and Command Rings. A Link TRB indicates the end
    of a ring by providing a pointer to the beginning of the ring. … A
    non-contiguous TRB Ring is composed of Ring Segments." ← **L926-932**
    （p207）
  - 建环六规则（note）：16B/64B 对齐/段长 16B 倍/Link 居段尾/Pointer 指下
    段或首段/末段指回首段 ← **L935-949**（p207）
  - Toggle Cycle+两 Note（chip+note）："The Toggle Cycle flag should be set
    in at least one Link TRB of a ring." ← **L956-957**；Pointer 不必页首
    +Link 只进传输/命令环 ← **L958-960**
  - CH 跨段（chip）："If the Chain bit (CH) of the previous TRB is ‘1’,
    then the multi-TRB TD that it defines spans segments and shall continue
    with the first TRB of the next segment. In a Command Ring the Link TRB
    Chain bit (CH) is ignored by the xHC." ← **L1003-1007**（p207）
  - C 位=PCS+IOC 追踪 Deq（chip）："As software advances its Enqueue
    Pointer and advances over a Link TRB, the Cycle (C) bit shall be
    updated with the value of the PCS flag. … the ability to track the
    Dequeue Pointer as a function of segment boundary crossings."
    ← **L1008-1013**（p207）
  - 双环 IOC 事件字段（note）：传输环→Transfer Event（Slot/EP ID 对应/
    Length=‘0’/指针指 Link/CC=Success）← **L1021-1026**；命令环→Command
    Completion Event（Slot ID=‘0’/VF ID=‘0’/CC=Success）+Primary
    Interrupter+Target 忽略 ← **L1027-1034**（p207-208）
  - Event Data 用途+两特性（chip）："software defined event … inheriting
    the Completion Code of the previous (non-Event Data) TRB executed on a
    ring, and accumulating the transfer Lengths of preceding TRBs"
    ← **L1043-1047**（p208）
  - 典型用法（chip）：64 位标识收尾+IOC 只设 Event Data+ED 标志='1' 名
    Event Data Transfer Event ← **L1048-1057**（p208）
  - EDTLA 四规则（公式卡）：24 位/端点；TD 首 TRB 前或 Set TR Deq Ptr 清
    零/逐 TRB 累加/超 16,777,215 wrap/遇 Event Data 报数清零/
    Stopped-Short Transfer 报 EDTLA ← **L1058-1085**（p208-209）
  - 16MB 回卷+IOC 必设（note）：Intermediate Event Data TRB+软件自行累加
    ← **L1086-1091**；IOC 必设+落点受 Fragment 约束 ← **L1092-1095**
  - 事件规则+短包+Notes 群（chip+note）：走 Transfer Event 格式/ED=1/CC
    承前 TRB/中间报 Success ← **L1104-1119**（p209）；Parameter 承载+
    Length=TD 起累计 ← **L1126-1133**；短包推进照报 ← **L1096-1101**；
    不设 IOC 推进清 EDTLA/仅传输环/不紧跟/独立 ED TD 禁上等时环
    ← **L1138-1150**（p210）
- 档位：任务档 中 800-1400f，实绩 1720f 超上限 320f（+22.9% 记档）——
  双小节（Link+Event Data）合支 20 组判据全覆盖；pace 修平 +0.5s+富余
  收缩 -4.1s 后仍超。

## ④ xh1106 §4.11.6 Vendor Defined TRB Types（1117f · beats=41 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - 定义+三用途（chip）："xHC vendors may define proprietary TRB Types
    using the Vendor Defined TRB Type codes identified in Table 6-91. The
    Vendor Defined TRB Types may be used to define Command, Event, or
    Transfer TRBs." ← **L1153-1155**（p211）
  - 扩展能力枚举+多厂商重码（chip）："Multiple vendors may define the same
    xHCI Extended Capability code or Vendor Defined TRB code to perform
    different operations. … shall be qualified by system software with the
    PCI Configuration Space Header Vendor ID and Subsystem Vendor ID."
    ← **L1156-1158+L1191-1195**（p211-212）
  - 未识别三态（chip，bullet 分段）：传输环 CH 评估跳过/命令环当 No Op/
    事件环软件忽略 ← **L1161-1166+L1174-1178**（p211-212）
  - 位对齐三 Note（note）：C 位/完成码/CH 位与标准 TRB 同位同管
    ← **L1179-1187**（p212）
  - 自定义命令族（chip）："xHC vendors may use the Vendor Defined TRB Type
    codes to define proprietary xHCI commands. All vendor defined commands
    shall utilize the Command Completion Event TRB to report completions."
    ← **L1188-1190**（p212）
  - 完成码两群（表卡）：Info 群≈Success/Error 群≈Undefined Error+命令
    完成事件例 ← **L1196-1207**（p212）
- 档位：任务档 小 450-1000f，实绩 1117f 超上限 117f（+11.7% 记档）——
  六拍判据链全覆盖；pace 修平 +2.3s+富余收缩 -0.6s 后仍超。

## ⑤ xh1107 §4.11.7 TD Usage Rules+.7.1 TD Fragments+三图+尾 Note（2989f · beats=97 · pace fast=0 · probe viol=0 · scan ok）

- 上屏论断↔切片行号（spec-411.txt）：
  - TD 构成+CH（chip）："A Transfer Descriptor (TD) may be composed of 1
    or more TRBs. The TRB Chain flag is used identify the TRBs of a TD,
    where the Chain flag is set in all the TRBs of a TD except the last. …
    If a TD crosses a TRB Ring Segment boundary it may include one or more
    Link TRBs." ← **L1210-1215**（p212）
  - IOC+Transfer TRB Note（chip+note）："Setting the TRB Interrupt on
    Completion (IOC) flag allows the completion of a TRB to generate an
    event." ← **L1222-1224**；"Link and Event Data TRBs are not “Transfer
    TRBs”" ← **L1225-1226**
  - 选项 4（chip）：ISP 全设+末位 IOC+实传量=TRB Length 求和减事件 Length
    ← **L1230-1239**（p212）
  - 选项 5+互斥（chip）："Terminate the TD with an Event Data TRB that has
    its IOC flag set … mutually exclusive." ← **L1240-1255**（p212）
  - 杂项四连（note）：Event Data TD 附注 ← **L1256-1258**；IDT 单
    Transfer TRB ← **L1259-1260**；Interrupter Target 全 TD 同值+虚拟化
    隔离 ← **L1261-1265**；TD Size 恒有效 ← **L1266-1267**
  - 禁忌清单（表卡+note）：No Op 禁入多 TRB TD/Link 禁首尾/禁连续 Link/
    Link TD 可夹前后/违者未定义 ← **L1274-1284**（p213）
  - 事件定期更新 Deq（note）：三用+逢 IOC 必出+大 TD 周期 IOC 回收 TRB
    ← **L1285-1295**（p213）
  - 中间事件 Success+错误覆盖+错误≠完成（双 note）← **L1296-1304**（p213）
  - Fragment 动机（chip，bullet 分段）："Maximize burst opportunities …
    Simplify Event generation by limiting the frequency and locations in a
    TD where the IOC flag may be set." ← **L1307-1327**（p213-214）
  - MBP+尺寸规则（chip+公式卡+note）："(Max Burst Size + 1) * Max Packet
    Size bytes … only last TD Fragment shall define less than MBP data
    (or the Residue) bytes … The first TRB of a TD Fragment is written
    last" ← **L1328-1345**（p214）
  - 结构规则（chip，bullet 分段）：首支恒 Transfer TRB/不跨段/Packet
    Boundary 定义/首尾贴 Boundary ← **L1346-1365**（p214）
  - IOC 单设规则（chip，bullet 分段）："The IOC flag may be set in only
    one TRB of a TD Fragment" ← **L1366-1374**（p214）
  - Figure 4-16 语义重建（双卡分时，L1381-1422 p215）：两 Fragment 各自
    Boundary（TRB2|3、TRB4 末=整 MPS 倍；TRB5|6、TRB7 末=TD 终点）+IOC
    候选（F1: TRB2/4/Link；F2: TRB5/7/EventData）+TRB1/3/6 不可（不紧邻
    Boundary）+末 TRB 落 MPS 边界或 TD 终点
  - Figure 4-17 语义重建（表卡+note，L1593-1614 p216-217）：31KB/3KB 偏移
    /9 页同缓冲四例（Ex1 MBP16K+Residue15K；Ex2 单 Fragment 全 TD；Ex3
    MBP8K×3+7K；Ex4 F2=2×MBP）+写序 2->3->1、5->6->7->8->4、10->11->9
    +单页拆分 TRB5(3K)+TRB6(1K)（L1623-1628）
  - Isoch 全成形（note）："Only fully formed TDs may be scheduled on
    Isoch endpoints … write the first TRB of a multi-TRB TD last"
    ← **L1629-1632**（p217）
  - Figure 4-18+尾 Note（chip+note）："due to the initial offset (3.75KB),
    page boundaries do not land on packet boundaries … the IOC flag only
    may be set in TRBs 5 and 10 … the Link TRB does not land on a packet
    boundary … In Figure 4-17 all TRBs define buffers that end on Packet
    boundaries; hence an IOC flag may be set in any TRB of a TD Fragment,
    but only once per TD." ← **L1677-1695**（p217）；尾 Note
    "a partially formed TD shall not be posted to an Isoch endpoint"
    ← **L1702-1707**（p218）
- 档位：任务档 巨头 1800-2800f，实绩 2989f 超上限 189f（+6.75%，xh1001
  +7.7% 先例同量级记档）——16 拍判据链+三图语义重建全覆盖；pace 修平
  +3.4s+富余收缩 -4.5s 后净 -1.1s 仍超（内容体量=两大节+三图）。

## ⑥ xh1102dp 补丁片 · f18f8ed2a9adc41 等时 TD Size 掩码（896f · beats=25 · pace fast=0 · probe viol=0 · scan ok）

- 三幕走读同构 xh1002p（三幕+makeDiffPanel diff 行；判据全部现场
  `git -C /Volumes/KernelSrc/linux show f18f8ed2a9adc41` 取原文，Sarah
  Sharp 2013-01-11，xhci-ring.c 3+/2-，Cc stable 3.0+）：
  - 幕① 背景（bgNote）：TD Size=处理后剩余包数（§4.11.2.4 同式，规范锚
    spec-411 **L505-533** p198）+message 原文逐字 "The TD size calculation
    did not mask off those bits before using the field."
  - 幕② 问题（logicChip 单行+数字例 note，message 数字例逐字上屏）：
    端点 2 additional service opportunites+最大包 1020B（原文拼写保留）；
    帧缓冲 3060B 跨 64KB 拆 1276B+1784B；正解 DIV_ROUND_UP(3060/1020)=3、
    3−(1276/1020)=2；旧算 DIV_ROUND_UP(3060/5116)=1、1−(1276/5116)=1
    （5116=1020|额外机会位 bits 10-11，logicChip 注记 1020+2×2048=5116）
  - 幕③ 修复（specChip+diff 走读）：两处除数套 GET_MAX_PACKET——
    xhci_v1_0_td_remainder packets_transferred 除数（@@ -3108,7 +3108,7：
    del 3111→add 3111）+xhci_queue_isoc_tx total_packet_count 除数
    （@@ -3642,7 +3642,8：del 3645→add 3645-3646）；specChip 引 §4.11.2.4
    "TD Packet count = ROUNDUP( TD Transfer Size / Max Packet Size )"
    （机核对切片 L511-514 ✓）
  - 片尾沿革注记（ch4610p 先例）：修复函数后经 c840d6ce772d 重构统一为
    xhci_td_remainder——基线 d9008e061539 现行 xhci-ring.c **L3501-3545**
    （对读段归 TrackB landing）
- diff 行号=机算（r12c_hunk_lines.py 从 git show 逐行标号，禁手数）。
- 档位：补丁片预算 ~650f，实绩 896f（xh1002p 950f/ch4606p 871f 同族记档）。

## ⑦ xh1102ep 补丁片 · add8469b3e0031a2e Frame ID 窗口径（896f · beats=25 · pace fast=0 · probe viol=0 · scan ok）

- 三幕走读同构 xh1002p（Mathias Nyman 2026-08-06，xhci-ring.c 182 行重构
  +xhci-mem.c+xhci.h，86+/104-；基线 d9008e061539 已含修复后形态）：
  - 幕① 背景（bgNote）：Frame ID 合法窗按帧（§4.11.2.5 p199，规范锚
    spec-411 **L555-576**：End=(MFINDEX+895ms) MOD 2048/Start=(MFINDEX+
    IST+1) MOD 2048；.5.1 有效窗判跳过/执行 **L563-569**）
  - 幕② 问题（logicChip+message note）：旧码微帧口径算窗（roundup/
    rounddown 到微帧 8 倍数再折帧）与规范帧口径不一致；越窗 -EINVAL 拒收
    +xhci_warn "Ignore frame ID field, use SIA bit instead"（diff 旧行
    4028 逐字）→中途切 SIA/留 frame id gap；message 原文逐字含 "winow"
    原文拼写注记
  - 幕③ 修复（specChip+diff 走读，182 行挑代表 hunk）：新
    xhci_frame_in_range+xhci_get_isoc_start_frame 按帧算窗（MFINDEX_TO_FRAME
    宏，win_start=(curr_frame+DIV_ROUND_UP_POW2(ist,8)+1)%MAX_FRAMES/
    win_end=(curr_frame+895)%MAX_FRAMES）+每 URB 一次范围校验+越窗仅
    xhci_dbg（"Ill-timed isoc URB"）+首 URB 对齐整帧；message 自引
    "better match how xhci specification section 4.11.2.5 does it" 逐字
  - 片尾注记：对读段=基线现行 xhci_get_isoc_start_frame（xhci-ring.c
    **L4015-4073**，landing 已挂）
- diff 代表行号=机算（r12c_hunk_lines.py：旧 3983/3984/3993/3994/4028，
  新 4001-4003/4019/4023，xhci.h 294-296）。
- 档位：同 xh1102dp（896f 同族记档）。

## ⑧ 注册·登记·门禁记录（TrackA-2）

- **render.ts**：import 块+scenes 数组扩七支（注释「R12 批 C TrackA-2」；
  主片 xh1103-07 插 xh1102e 后=44-48，补丁片 xh1102dp/xh1102ep 尾插=61/62
  ——**补丁片照既有补丁形态进 render.ts 显式清单**（ch41p..xh1002p 先例
  全部显式 import+数组追加），63 支与 player.ts orderedSceneKeys glob 序
  node 模拟同构自证 match=true（~/.cache/zcode-tmp/r12c_scene_order_check.js
  ，比较器=player.ts isPatch 正则同构；44-48=xh1103..xh1107、61/62=
  xh1102dp/xh1102ep、补丁组字典序 xh1002p<xh1102dp<xh1102ep）。
- **帧表**：44-48/61/62 由 scan 新产（初扫+pace 修平后重扫 44-48 两轮；
  61/62 未改动单轮）；0-43/49-60 既有表零触碰；63 张齐。61/62 total/
  distinct 巧合相同（896/38）经 sha256+scene 字段核验非错位（两支三幕
  同构节奏、内容不同）。
- **scripts/pace_audit.py SCENES** 增七项（主片五支插 xh1102e 后+补丁两支
  尾部）；**scripts/smoke_player.py BEATS_EXPECT** 增七键（帧表 distinct
  gap>=2 机核值：xh1103=58/xh1104=52/xh1105=62/xh1106=41/xh1107=97/
  xh1102dp=25/xh1102ep=25）——BASE_SCENES/PATCH_SCENES 范围未动（主会话
  统一扩），BEATS 只登记不验证（smoke_player 未跑）。
- **player.ts 零改动**（glob 自动发现+补丁正则 `^(ch\d+p|xh\d{4}[a-z]?p)
  \.tsx$` 对 xh1102dp/xh1102ep 天然匹配）。.meta×7（随机 seed）。
- **引文机核 93/93 MISS=0**（探针 r12c_quote_check2.py）：修正 6 处后达标
  ——xh1103 三条件 bullet 分段、xh1106 未识别三态 bullet 分段+xHC vendors
  抄写修正（原文 "xHC vendors" 非 "xHCI vendors"）、xh1107 动机/结构规则/
  IOC 单设三处 bullet 分段；补丁片 message 20 段对 git show 归一全文逐段
  核（含 "opportunites"/"winow" 原文拼写保留）。
- **三门数值表**（pace 修平+收缩后终值）：

| 场景 | idx | total | distinct | beats | pace fast | probe viol | 档位对账 |
|---|---|---|---|---|---|---|---|
| xh1103 | 44 | 1560 | 169 | 58 | 0 | 0 | 中档超 160f（+11.4% 记档） |
| xh1104 | 45 | 1226 | 148 | 52 | 0 | 0 | 小档超 226f（+22.6% 记档） |
| xh1105 | 46 | 1720 | 154 | 62 | 0 | 0 | 中档超 320f（+22.9% 记档） |
| xh1106 | 47 | 1117 | 106 | 41 | 0 | 0 | 小档超 117f（+11.7% 记档） |
| xh1107 | 48 | 2989 | 251 | 97 | 0 | 0 | 巨头档超 189f（+6.75% 记档） |
| xh1102dp | 61 | 896 | 38 | 25 | 0 | 0 | 补丁 ~650f 预算同族记档 |
| xh1102ep | 62 | 896 | 38 | 25 | 0 | 0 | 同上 |

- **超档记档口径**（ch4611/xh0803/xh1001/xh1004/xh0700 先例：判据不砍+
  三门全绿不返工）：超档主因=字幕拍阈值下限（加权字数/5.5+1.0s）对规则
  清单/三条件枚举/公式链类内容偏紧（xh1103 三条件、xh1105 EDTLA 四规则、
  xh1107 结构/IOC 双规则链）；已做一轮定向修平（fast 拍加 wait 至阈值
  +0.2s：xh1103 六拍/xh1104 两拍/xh1105 两拍/xh1106 三拍/xh1107 四拍）
  +富余拍收缩（xh1103 -1.5s/xh1104 -2.9s/xh1105 -4.1s/xh1106 -0.6s/
  xh1107 -4.5s）后 pace fast=0 全绿；xh1104/xh1105 相对超档更多系轻片
  定位（格式族公共面+代表三连/双小节合支）的内容义务（§9 全覆盖+Optional
  标注）不可砍。
- **布局避让带**：全七支沿用批 B/A 验证参数（chip(1090,265,w1300)/note
  (1300,285,w1040)≤4 行/表卡(740,295,w560)≤5 行/收口卡(960,840-850)/
  双环带 470+655/补丁片 logicChip 单行 y200+specChip ≤2 行 y850-872+
  bgNote(700,265,w1100)≤4 行）——probe 两轮（初扫+重扫）均 viol=0×7，
  零避让重排回合；xh1107 巨头片 f13a/f13b 双卡 TLx(370)→TLx(740) 提前
  修正（左上槽卡占位带 x≤410 避让）。
- 未动 dist/、未跑 vite build、未 git commit、未动 output/ 既有 mp4、
  未动 public/frames- 既有 0-43/49-60、未跑 smoke_player（BEATS 只登记）、
  未碰 TrackB/TrackC 文件面（build_landing/check_landing_code/
  online_e2e_r6/flowcharts/zh-quotes.json/interactive/smoke_interactive/
  EVIDENCE.md/drafts-r12c-tracka1.md）。

## ⑨ 探针/工具沉淀（本波次产出，均 ~/.cache/zcode-tmp/）

- r12c_quote_check2.py：波次 1 探针扩展（七支 SCENES+补丁片 message 引文
  对 git show 归一全文核对）；
- r12c_hunk_lines.py：git show 统一 diff 行号对照器（旧/新行号逐行标注，
  补丁片 diff 面板行号禁手数的固化防线）；
- r12c_scene_order_check.js：render.ts scenes 数组 vs player glob 序同构
  自证（isPatch 正则同构）；
- r12c_beats_calc.py：帧表 beats 机核（distinct gap>=2，与 smoke_player
  公式同构）。
