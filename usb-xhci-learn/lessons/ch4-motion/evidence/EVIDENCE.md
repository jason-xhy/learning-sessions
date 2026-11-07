# EVIDENCE —— 立标三节视频课件断言表

判据源：`specs/625472_xHCI_Rev1_2b.pdf`（xHCI 1.2b）；提取文本切片
`evidence/spec-41.txt` / `spec-42.txt` / `spec-43.txt`（带页标，行号见各文件）。
规则：画面/字幕出现的每个位值、字段名、章节号、页码，逐条对回规范原文。

## 41-command-operation.mp4（§4.1 命令操作 · p68）

| 画面/字幕断言 | 规范出处（提取文本行） |
|---|---|
| "There is only one Command Ring that is used for issuing xHC specific commands or commands related to Device Slots." | spec-41.txt L2-7（§4.1 p68） |
| 命令发出方式：命令 TRB 上命令环 → 写门铃寄存器 0 的 DB Target=0（Host Controller Command） | spec-41.txt L8-18（"All xHC commands are issued by placing the desired Command TRB(s) … writing the Host Controller Command code to the DB Target field of Doorbell register 0" §4.1 p68） |
| "All commands result in the generation of a Command Completion Event TRB on the Event Ring." | spec-41.txt L19-24（§4.1 p68） |
| CRCR 属 Operational 寄存器空间（§5.4.5） | spec-41.txt L2-7（"The Command Ring Control Register is defined in the Operational Register space (refer to Section 5.4.5 …)"） |
| 中断可选：xHC 可由软件轮询事件环管理（§4.2 p69 脚注 7） | spec-42.txt L66（"7Interrupts are optional. The xHC may be managed by polling Event Rings."） |
| 命令完成事件走事件环、不回命令环；事件 TRB 详见 §4.11.3 | spec-41.txt L19-24（"Refer to Section 4.11.3 Event TRBs"） |
| 命令对设备不可见；Address Device 由 xHC 代发 USB 请求（转场到 §4.3） | spec-43.txt L331-343（Address Device 经命令环、xHC 总线发 SET_ADDRESS，§4.3.4 p76）——课程表述，非 §4.1 原文 |
| 示例值：Enable Slot / No Op 为示例命令；Slot ID=1 示例 | §4.3.2 p75（Slot ID 由 xHC 自选）；示例声明在片头字幕 |

## 42-host-controller-init.mp4（§4.2 · p68-70）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 开机：xHC 被枚举、分配寄存器空间基地址；软件设 FLADJ 为系统特定值 | spec-42.txt L2-4（p68） |
| 芯片硬件复位后等 USBSTS.CNR=0 才能写任何 Operational/Runtime 寄存器 | spec-42.txt L18-20（p69）；复位定义脚注6 L64 |
| Note：后续各步顺序不强制，但必须全部在 USBCMD R/S=1 之前完成 | spec-42.txt L21-23（p69） |
| S1 MaxSlotsEn（CONFIG 5.4.7） | spec-42.txt L25-27（p69） |
| S2 DCBAAP（5.4.6）指向 DCBAA | spec-42.txt L29-32（p69） |
| S3 CRCR（5.4.5）= 命令环首 TRB 地址 | spec-42.txt L34-37（p69） |
| S4 事件环：段分配 / ERST 段表（指向+大小）/ ERSTSZ / ERDP 首段地址 | spec-42.txt L60-88（p69-70） |
| 写 ERSTBA 即启用事件环 | spec-42.txt L96-98（p70 "Note that writing the ERSTBA enables the Event Ring."） |
| S5 中断：MSI-X 表向量 0 至少初始化并启用；PBA；Interval（5.5.2.2）；INTE（USBCMD 5.4.1）；IE（5.5.2.1） | spec-42.txt L41-54, L100-113（p69-70） |
| 中断可选可轮询（脚注 7） | spec-42.txt L66（p69） |
| R/S=1 → xHC 开始接受门铃引用 | spec-42.txt L115-117（p70） |
| 随后根集线器端口开始上报连接、软件按 §4.3 枚举 | spec-42.txt L118-121（p70） |
| USB2（LS/FS/HS）必须端口复位才到 Enabled；SS attach 成功自动 Enabled | spec-42.txt L122-126（p70） |
| 「DCBAA 表项由软件装载、xHC 只读」 | §4.3.3 p76 步10（spec-43.txt L324-329）——跨节引用，课程表述 |

## 43-usb-device-init.mp4（§4.3 · p71-80；示例=FS 设备插 USB2 根端口 1，Slot ID=1 为示例值）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 复位后根端口 Disconnected=PP1 上电等待 | spec-43.txt L10-13（p71） |
| USB3 attach 成功自动 Enabled（CCS/CSC=1）；USB2 进 Disabled；两族 Disabled 含义不同 | spec-43.txt L14-36（p71；Note p71） |
| B1: CCS=1 CSC=1；PSCEG 0→1 跳变才产生 Port Status Change Event | spec-43.txt L38-42（p71 步1） |
| B2: 软件评估 Port ID、读 PORTSC；USB2 由软件写 PR=1 复位 | spec-43.txt L44-78（p71-72 步2-3.b；§4.3.1 p75 步1） |
| B3 完成判据 PRC=1、PED=1、PR=0、PLS=U0('0')；复位把设备送 Default 备好收 SET_ADDRESS | spec-43.txt L80-86（p72 3.b） |
| 复位后 PORTSC Port Speed 指示设备速度 | spec-43.txt L247-248（§4.3.1 p75 Note） |
| B4: Enable Slot 经命令环；Slot ID 由 xHC 自选；成功→槽 Enabled | spec-43.txt L249-264（§4.3.2 p75） |
| B5: A0=1 A1=1；Slot：端口号/Route String=0（根直连·不含端口号 脚注8）/Context Entries=1；EP0：Control/MPS=按端口速度默认（FS=8）/MaxBurst=0/TR Dequeue=EP0 环首段/DCS=1/Interval=0/MaxPStreams=0/Mult=0/CErr=3 | spec-43.txt L270-322（§4.3.3 p75-76 步4-8）；脚注8 L284-285 |
| DCBAA 表项（Slot ID 格）由软件装载输出上下文指针 | spec-43.txt L324-329（p76 步10） |
| B6: Address Device BSR=0 经命令环；xHC 总线发 SET_ADDRESS；设备 Default→Address；槽 Enabled→Addressed | spec-43.txt L331-347, L364-365（§4.3.4 p76-77） |
| BSR=1 legacy：先 Default 态通信、xHC 禁发 SET_ADDRESS；成功→槽→Default | spec-43.txt L349-368（p76-77） |
| B7: 仅 FS 需读前 8 字节（LS/HS/SS=8/64/512 可跳过）；取 bMaxPacketSize0 | spec-43.txt L99-108（p72 步7） |
| Setup Stage TRB：TRT=IN Data Stage(3)/Length=8/IOC=0/IDT=1/bmRequestType=80h/bRequest=6/wValue=0100h/wIndex=0/wLength=8/Cycle=PCS | spec-43.txt L120-134（p73 ii） |
| Data Stage TRB：DIR=1/Length=8/CH=0/IOC=0/IDT=0/Buffer=描述符接收缓冲 | spec-43.txt L136-154（p73 iv） |
| Status Stage TRB：DIR=0/Length=0/CH=0/IOC=1/IDT=0/Buffer=0 | spec-43.txt L156-173（p73 vi） |
| 每段入环后推进入环指针；门铃 DB Target=Control EP0 Enqueue Pointer Update | spec-43.txt L135/155/174/181-182（p73 iii/v/vii + p74 viii） |
| Status 段成功 Transfer Event 回来后按 bMaxPacketSize0 更新 EP0 MPS | spec-43.txt L183-187（p74 ix） |
| B8: Evaluate Context A1=1 → xHC 后续用新 MPS | spec-43.txt L188-193（p74 x） |
| B9: 经 EP0 读完整 Device/Configuration Descriptor（可选 Evaluate Context A0=1 报 Max Exit Latency 未上屏） | spec-43.txt L194-205（p74 步8-9） |
| B10: Configure Endpoint + SET_CONFIGURATION 双操作同成→设备 Address→Configured、槽 Addressed→Configured | spec-43.txt L206-212（p74 步10）；§4.3.5 L377-384（p77） |
| Configure Endpoint 未成功发 SET_CONFIGURATION=未定义行为 | spec-43.txt L411-412（p78） |
| B11: 管道全通可调度 TD（任意已启用端点传输环） | spec-43.txt L408-410（p78）；步12 L217（p74） |
| hub/TT 逐层初始化（从根起一层完成再下一层），否则未定义行为 | spec-43.txt L218-221（p74 Note） |
| 设备视角：只见 USB 请求与总线事件（课程表述） | 由 §4.3.4（xHC 代发请求）+ §4.1（命令不经总线）推得；片尾双轨状态回顾为课程综合 |

## 44-device-detach.mp4（§4.4 · p81；TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头示例声明：根端口 1 设备 · Slot ID=1 为课程示例值 | 课程表述 |
| 设备在线态：PORTSC 灯排 CCS=1（设备槽 1 挂 DCBAA[1] 服务） | 课程表述（在线初始态） |
| 拔线：CCS 清 0、CSC 置 1（灯排变化）+ 引文 "When the device is detached from a Root Hub port, the PORTSC Current Connection Status (CCS) bit shall be cleared to ‘0’ and the Connect Status Change (CSC) bit shall be set to ‘1’."（逐字） | spec-44.txt L2-4（§4.4 p81） |
| PSCEG 0→1：xHC 写 Port Status Change Event 上事件环（xHC 写/软件读）+ 引文 "If a ‘0’ to ‘1’ transition of PSCEG (4.19.2), the xHC shall report the change through a Port Status Change Event."（逐字） | spec-44.txt L4-5 |
| 规范义务引文卡："After the detection of a detach, system software shall disable the Device Slot associated with the port by issuing a Disable Slot Command for the affected slot."（逐字） | spec-44.txt L5-8 |
| Disable Slot Command TRB（TRB Type=Disable Slot · Slot ID=1 示例 · Cycle bit=1）上命令环 + 门铃 0（DB Target=0，与 §4.1 同款回扣） | §4.1 惯例回扣（evidence/spec-41.txt）；TRB 字段=课程示例 |
| 完成事件回话：DCBAA[1] 清空、槽徽标转 Disabled；"The only command that software is allowed to issue for the slot in this state is the Enable Slot Command."（§4.5.3.2 回扣） | spec-45.txt L284-288（p87） |
| Slot ID 随即可回收（下一 Enable Slot 可再分配） | 课程表述 |
| 收口前转引文："Refer to section 4.6.4 for a description of the Disable Slot command."（逐字） | spec-44.txt L7-8 |

## 45-device-slot-management.mp4（§4.5 · p81-90；TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| xHC 最多 255 设备、每台一槽；三件套引文 "The xHCI supports up to 255 USB devices … Each xHC Device Slot is comprised of 3 major components: an entry in the Device Context Base Address Array, a Device Context data structure, and a Doorbell Register in the Doorbell Array."（节选逐字） | spec-45.txt L2-5（p81） |
| DCBAA 标题条："DCBAA · 255 项 · 每项=64 位指针 → Device Context 基址"（L6-8 断言浓缩） | spec-45.txt L6-8 |
| 脚注11 注记：总设备数 <256，部分槽保留（VF） | spec-45.txt L13-15 |
| Slot ID 索引引文："The Slot ID is the index that software uses when accessing the Device Context Base Address Array to retrieve a pointer to the Device Context data structure or to access the Doorbell Register associated with a device."（逐字） | spec-45.txt L9-11 |
| 门铃阵列标题条："门铃阵列 · 每槽一枚 32 位门铃寄存器" | spec-45.txt L70-71（p82） |
| Fig 4-1 简化重绘列：000h Slot Context(DCI 0) / 020h EP0 双向控制(DCI 1) / 040h EP1 OUT / 060h EP1 IN / … / 3C0h EP15 OUT / 3E0h EP15 IN / 400h Reserved(Page Size-1) | spec-45.txt 图区 L23-51（p82） |
| 组织句引文："The Device Context is organized as an array of 32 context data structures, consisting of 1 Slot Context and 31 Endpoint Context data structures."（逐字） | spec-45.txt L55-57 |
| 全 0 初始化引文："When software allocates a Device Context data structure all fields in all entries shall be initialized to ‘0’."（逐字） | spec-45.txt L58-59 |
| EP0 恒 Default Control EP 引文 + "Bidirectional, Control EP" | spec-45.txt L68-69、图区 L25-26 |
| DCI 范围引文："The range of DCI values is 0 to 31." "The DCI of the Slot Context is 0." | spec-45.txt L90-93（p83） |
| 公式卡逐字："DCI = (Endpoint Number * 2) + Direction,"（‘0’=OUT · ‘1’=IN）与 "DCI = (Endpoint Number * 2) + 1." | spec-45.txt L96-102 |
| 算例三连：EP1 OUT bulk→(1×2)+0=2；EP2 IN control→(2×2)+1=5；EP0 control→(0×2)+1=1 | 课程演算（依 L96-102 公式） |
| 状态机主线标签：Enable Slot（Disabled→Enabled） | spec-45.txt L291-292（p87） |
| Address Device · BSR=0（Enabled→Addressed） | spec-45.txt L314-316 |
| Configure Endpoint · DC=0（Addressed→Configured） | spec-45.txt L368-370（p88） |
| 侧路标签：BSR=1 → Default | spec-45.txt L311-313 |
| 侧路标签：Reset Device：Addressed/Configured → Default | spec-45.txt L382-383、L412-414 |
| 侧路标签：去配置 → Addressed（DC 位值不上屏——1.2b L410-411 印刷值疑勘误，出处行照引） | spec-45.txt L410-412（p89） |
| No Op 注记：Addressed 态 Configure Endpoint · DC=‘1’ 视作 No Op（"treated like a No Op Command"） | spec-45.txt L371-374 |
| 大泡泡注记：Disable Slot Command 四态任一 → Disabled（"…as noted by the large bubble"） | spec-45.txt L191-192（p85） |
| Disabled 唯一允许命令引文："The only command that software is allowed to issue for the slot in this state is the Enable Slot Command."（逐字） | spec-45.txt L286-288（p87） |
| Table 4-1 精简卡：五态 × 指针有效性/USB 地址/Slot State 值（Disabled=无效/N/A/Disabled；Enabled=无效/0/Disabled 0 复用；Default=有效/0/Default；Addressed=有效/Assigned/Addressed；Configured=有效/Assigned/Configured） | spec-45.txt L207-235、L256-276（p85-86） |
| 复用注记引文："the Slot State field value ‘0’ is overloaded for the Disabled and Enabled states"…"there never is a case where the xHCI would actually set the Slot State field to Enabled" | spec-45.txt L319-327（p87 Note） |
| §4.5.4.1：SET_ADDRESS 由 Address Device(BSR=‘0’) 内 xHC 自动发并拦截软件自发（软件 Setup TD 不上总线、TRB Error Completion Code 完成） | spec-45.txt L426-433（p89） |
| §4.5.4.2：SET_CONFIGURATION 双操作引文 "system software shall complete a successful Configure Endpoint command to the xHC and a successful SET_CONFIGURATION request to a device. Undefined results may occur otherwise."（逐字） | spec-45.txt L436-439 |
| §4.5.4.3：SET_INTERFACE 同款双操作；非必要注记引文 "A Configure Endpoint Command is not necessary if a SET_INTERFACE request does not change any Endpoint Context parameters."（逐字；SET_CONFIGURATION 同款注记 L445-446） | spec-45.txt L456-459、L460-462、L445-446（p90/p89） |
| 收口前转：下一节 §4.6 | spec-45.txt L464（§4.6 起） |

## 页码口径

提取文本页标 = PDF 页 = 规范印刷页（各节切片已带 `===== [PAGE n] =====` 标逐页核对）。
本表行号指 `evidence/spec-4x.txt` 内行号（非规范页码）。

## 4601-command-ring-operation.mp4（§4.6.1 Command Ring Operation · p91-93；R10 批 A TrackA 终订=成片上屏内容；mp4 由主会话统一渲染）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.1 命令环运行 · Command Ring Operation · p91-93 | spec-46.txt L40-41（节题） |
| 命令环三识卡：环型=专用 TRB Ring（§4.9）/ 准入=仅 Table 6-91 的 TRB 型 / 数量=每 xHC 实例 1 条 / 分工=软件生产 · xHC 消费 | spec-46.txt L42-46（p91） |
| 引文 "The Command Ring is a dedicated TRB Ring … which only allows those TRB types defined in Table 6-91. Only one Command Ring exists per xHC instance."（节选逐字） | spec-46.txt L42-44 |
| 注记引文 "System software is the producer of all Command TRBs and the xHC is the consumer."（逐字） | spec-46.txt L45-46 |
| CRCR·出队指针卡：出队指针=xHC 内部持有不暴露 / 上报=完成事件 Command TRB Pointer / 初值=CRCR 指针域（§5.4.5）/ 改写窗口=仅环停止（CRR=0）时——CRCR 位布局归 §5.4.5，位值不上屏（R10 口径：画面指路） | spec-46.txt L47-57（§5.4.5 指路 L51-52） |
| 引文 "Its value is reported in the Command TRB Pointer field of Command Completion Events." "…may only be modified by software while the Command Ring is stopped…"（节选逐字） | spec-46.txt L47-49、L55-57 |
| CD 注记：CD = 1 个 Command TRB（§4.11.3 / §6.4.3 指路）+ 引文 "A Work Item on a Command Ring is called a Command Descriptor (CD). … A CD shall be comprised of one Command TRB data structure."（节选逐字） | spec-46.txt L58-62 |
| 发命令两步：命令 TRB 卡（TRB Type/去向=命令环 enq/Cycle bit=命令环 PCS）上环点亮 + 写门铃 0（DB Target=HC Command）+ 引文 "…shall write the Host Controller Doorbell register (offset 0 in the Doorbell Register Array), asserting the Host Controller Command value in the DB Target field and ‘0’ in the DB Stream ID field."（逐字） | spec-46.txt L63-71 |
| 消费语义：xHC 连续取用直到停或空、多命令按序（可能延迟）+ 引文 "…shall execute commands until the Command Ring is stopped or empty." Note "…they are executed in order, so a delay may be incurred…"（节选逐字） | spec-46.txt L72-75 |
| 完成事件卡：TRB Pointer=回指命令 TRB / Completion Code=完成状态 / Slot ID·VF ID=照抄命令 TRB / 去向=主事件环 · 随环序 | spec-46.txt L76-81、L82、L89-90 |
| 引文 "The Primary Event Ring receives all Command Completion Events."（逐字） | spec-46.txt L82 |
| 停环卡（§4.6.1.1）：写 CS=1=执行完当前命令后停取 / 停稳事件 CC=Command Ring Stopped / 事件指针=当前出队指针 / 重启=再敲 HC 门铃 + CS/CA/CRR 灯排 + 注记「停止期间 CD 归软件所有（可删/增/重排）」 | spec-46.txt L100-118（p92） |
| 中止卡（§4.6.1.2）：写 CA=1 / 事件① CC=Command Aborted / 出队指针推进到下一 TRB / 事件② CC=Command Ring Stopped + 注记「仅命令“卡死”才需中止（如 Address Device 等设备应答）——实现注记」 | spec-46.txt L121-136、L149-157（p92-93） |
| 超时注记卡：引文 "Software shall be responsible for all command timeouts."（§4.6 p90）+ "If software doesn’t see CRR negated in a timely manner (for example, longer than 5 seconds), then it should assume that there are larger problems with the xHC and assert HCRST."（逐字） | spec-46.txt L31-33、L164-167 |
| 收口卡：身份/发令（摆 CD 上环→敲 HC 门铃）/回执（每命令必有 CCE·主事件环）/管控（CS 停环·CA 中止·超时软件兜底）；转场「下一支：§4.6.2 No Op」 | spec-46.txt L42-167 汇总；L168（§4.6.2 起） |

## 4602-no-op.mp4（§4.6.2 No Op · p93-94；R10 批 A TrackA 终订=成片上屏内容；mp4 由主会话统一渲染）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.2 No Op 空操作 · No Op Command · p93-94 | spec-46.txt L168-169（节题） |
| 引文 "The No Op command can be issued by software to exercise the TRB Ring mechanism of the xHC without affecting any xHC or USB Device state, or to report the current value of the Command Ring Dequeue Pointer."（逐字） | spec-46.txt L170-172（p93） |
| Note 注记：也可插在命令环上调整 Command TD 的对齐内存边界 | spec-46.txt L173-174 |
| 格式指路（EVIDENCE 口径）：命令 TRB=§6.4.3.1、完成事件 TRB=§6.4.2.2（画面不展开） | spec-46.txt L175-177 |
| No Op Command TRB 卡：TRB Type=No Op Command / 其余字段=全部清 0 / Cycle bit=命令环 PCS + 引文 "TRB Type = No Op Command (refer to Table 6-91)." "Clear all other fields of the command TRB to ‘0’." "Cycle bit = Command Ring’s PCS flag."（逐字） | spec-46.txt L178-195（L184/L192/L194） |
| 写门铃：DB Target=Host Controller Command（门铃 0 上环动画） | spec-46.txt L197-198 |
| 完成事件卡：TRB Type=Command Completion Event / TRB Pointer=回指 No Op TRB / Completion Code=Success / 其余字段=清 0 / Cycle bit=事件环 PCS | spec-46.txt L199-213（L205/L207/L209/L211/L213） |
| 引文 "Completion Code = Success (refer to Table 6-90)."（逐字） | spec-46.txt L209 |
| 收口卡：用途（练 TRB 环机制/报出队指针）/命令侧/事件侧；转场「下一支 Enable Slot（§4.6.3）」 | spec-46.txt L170-213 汇总；L214（§4.6.3 起） |

## 4603-enable-slot.mp4（§4.6.3 Enable Slot · p94-95；R10 批 A TrackA 终订=成片上屏内容；mp4 由主会话统一渲染）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.3 Enable Slot · p94-95；示例声明「Slot ID=1 —— 课程示例值（实际由 xHC 自选）」 | spec-46.txt L214-215（节题）；L296（算法实现自定→示例值口径） |
| 引文 "The Enable Slot Command is issued by software to obtain an available Device Slot and to transition a Device Slot from the Disabled to the Enabled state."（逐字） | spec-46.txt L216-217（p94） |
| 槽位状态卡：Disabled → Enabled（§4.5 状态机回扣） | spec-46.txt L216-217；状态机=spec-45.txt L291-292 回扣 |
| Enable Slot TRB 卡：TRB Type=Enable Slot / Slot Type=协议槽型（Table 7-9）/ 其余字段=清 0 / Cycle bit=命令环 PCS + 引文 "TRB Type = Enable Slot command (refer to Table 6-91)." "Slot Type = value specified by the Protocol Slot Type field of the associated xHCI Supported Protocol Capability structure (refer to Table 7-9)."（逐字） | spec-46.txt L250-264（L256/L258-260） |
| 写门铃：DB Target=Host Controller Command（门铃 0） | spec-46.txt L265-267 |
| 自选槽双分支卡：可用→Slot ID=n · CC=Success / 不可用→Slot ID=0 · No Slots Available / 算法=xHC 实现自定 | spec-46.txt L220-225、L279-291、L296 |
| 引文 "If a Device Slot is not available, the Slot ID field shall be cleared to ‘0’ and a No Slots Available Error shall be returned in the Command Completion Event."（逐字） | spec-46.txt L223-225 |
| DCBAA[1] 高亮：Slot ID=1 → 表项写 'ctx 指针' + 引文 "…system software shall use the Slot ID to link a Device Context data structure to the slot by writing a pointer to the Device Context in the Device Context Base Address Array[Slot ID] location."（逐字） | spec-46.txt L226-229 |
| 先写后用注记：发本槽命令/敲 EP0 门铃前未写 DCBAA 表项=未定义操作 | spec-46.txt L229-231 |
| Input Context 有效性指路：Input Control / Slot / Endpoint Context 须 valid——细则 §6.2.2 · §6.2.3.1 | spec-46.txt L232-249（p94-95） |
| 槽位状态卡翻转为 Enabled ✓（中止时 Slot ID 无效未上屏，归 EVIDENCE 口径注记：L297-299） | spec-46.txt L216-217；L297-299 |
| 收口卡：命令侧/事件侧（Slot ID xHC 自选 · CC=Success）/跟进（DCBAA[Slot ID] ← 指针）；转场「下一支：Disable Slot（§4.6.4）」 | spec-46.txt L216-305 汇总；L306（§4.6.4 起） |

## 4604-disable-slot.mp4（§4.6.4 Disable Slot · p96-97；R10 批 A TrackA 终订=成片上屏内容；mp4 由主会话统一渲染）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.4 Disable Slot · p96-97；示例声明「Slot ID=1（已 Enabled 的槽）—— 课程示例值」 | spec-46.txt L306-307（节题）；示例值=课程口径 |
| 引文 "The Disable Slot Command is issued by software to force a Device Slot to the Disabled state. A typical use would be to free a Device Slot when a USB device is disconnected."（逐字） | spec-46.txt L308-310（p96） |
| 槽位状态卡：Enabled（示例）→ 目标 Disabled | spec-46.txt L308-310；状态机=spec-45.txt L191-192 回扣 |
| 前提 Note（不满足=未定义行为）：① 活动端点 Stopped 或 Idle-in-Running、在飞 Transfer Event 已收完；② 发往本槽命令已完结、本槽在途完成事件已收完 | spec-46.txt L330-339（p96） |
| Disable Slot TRB 卡：TRB Type=Disable Slot / Slot ID=1（示例）/ Cycle bit=命令环 PCS + 引文 "Slot ID = ID of the Device Slot to be disabled." "Write the Host Controller Doorbell with DB Target = Host Controller Command."（逐字） | spec-46.txt L343-355（L348/L354-355） |
| xHC 处置五项卡：门铃=禁用本槽门铃寄存器 / 带宽=放周期端点带宽 / 传输=断在飞 USB 传输 / 资源=放内部资源 / 槽=标记 “available” 可重用 | spec-46.txt L311-325（L313/L315/L317/L319/L321-325） |
| DCBAA 表项随之失效注记：软件可释放 Device Context / Transfer Ring / Stream Context Array 等（表项 1 显示'失效'） | spec-46.txt L321-325 |
| 引文 "A Command Completion Event is always returned for a Disable Slot Command."（逐字） | spec-46.txt L326 |
| 完成事件双分支卡：Slot ID=照抄命令 TRB / 曾 Enable→资源释放 · CC=Success / Slot State→Disabled / 未 Enable→Slot Not Enabled Error | spec-46.txt L364-391（L373/L375-387） |
| DCBAA[1] 清 0（'0 / 空'）+ 引文 "After software receives the Command Completion TRB for a Disable Slot Command it shall clear the respective DCBAA entry to ‘0’."（逐字）+ Restore State 辨槽说明 | spec-46.txt L392-395（p97） |
| Note：执行本命令时，未上事件环的挂起事件可被弃置 | spec-46.txt L396-397 |
| 收口卡：用途（强制 Disabled·拔设备释放槽）/前提/xHC（五项处置+槽标可重用）；转场「下一支：§4.6.5 Address Device（批 B）」 | spec-46.txt L306-397 汇总；L398（§4.6.5 起） |

### R10 批 A 口径注记

- CRCR 位布局（RCS/CRR/CA/CSE 等位值表）归 §5.4.5，四支画面均只指路「§5.4.5」不上位值；
  CS/CA/CRR 机制语义出自 4.6.1 正文（L55-57/L100-118/L121-136/L164-167），按正文措辞上屏。
- ch4603 中止注记（L297-299：aborted 时 Slot ID 视为无效）未上屏，归本表口径注记。
- §4.6 导语三 Note（未识别 TRB Type 报 TRB Error L20-22；Undefined/Vendor Defined Error L23-25；
  状态修改命令挂起期禁敲端点门铃 L26-30）属 4.6 大区面，批 A 未上屏，留待批 B-D 视需要取材。

## 4605-address-device.mp4（§4.6.5 Address Device · p97-102；R10 批 B TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.5 Address Device · p97-102；示例声明「Slot ID=1（Enabled 槽）· 选中地址 0x11 —— 课程示例值」 | spec-46.txt L398-399（节题）；示例值=课程口径 |
| 引文 "… to transition a Device Slot from the Enabled to the Default or Addressed state or from the Default to the Addressed state, depending on the state of the Block Set Address Request (BSR) flag."（逐字） | spec-46.txt L400-403（p97） |
| 槽位状态卡：Enabled（示例）→ BSR=1 目标 Default / BSR=0 目标 Addressed | spec-46.txt L400-403 |
| xHC 三件事注记：使能 DCEP / 选地址 / 发 SET_ADDRESS——USB2 发往 Address '0'，USB3 用 Route String | spec-46.txt L404-408（p97） |
| 成功后三件卡：DCEP 加入端点调度表 / DCEP 0 Context Doorbell 使能 / TRB 可上 DCEP Transfer Ring | spec-46.txt L409-412（p97） |
| 引文 "Once a successful Address Device Command has completed, system software can issue USB GET_DESCRIPTOR requests through the Default Control Endpoint …"（逐字） | spec-46.txt L422-424（p98） |
| BSR 语义卡：BSR='1' 不发 SET_ADDRESS 其余照做（老设备先读描述符兼容）；BSR='0' 选地址+发 SET_ADDRESS | spec-46.txt L437-445（p98） |
| Input Context 装配卡：A0+A1=1、其余 Add/Drop 全 0 + 引文 "The Add Context flags A0 and A1 … shall be set to '1' …"（逐字） | spec-46.txt L456-458、L476-482（p98-99） |
| EP0 Context 四有效值（TR Dequeue Pointer/EP Type/CErr/Max Packet Size）与三清零（MaxPStreams/Max Burst/EP State） | spec-46.txt L476-482 |
| 发行流程：DCBAA 表项就位（flash）→ 摆 Address Device TRB（TRB Type/Slot ID/Input Context Pointer/其余清 '0'/Cycle bit=PCS）→ 敲 HC 门铃 + 引文 "Ensure that the Device Context Base Address Array entry points to … Write the Host Controller Doorbell with DB Target = Host Controller Command."（节选逐字） | spec-46.txt L470-499（p98-99） |
| 守卫卡：查槽曾被 Enable Slot 使能？（DCBAA/槽检索）否 → CC=Slot Not Enabled Error | spec-46.txt L518-519、L596-598（p99-100） |
| BSR=1 分支：Enabled 态 → Input Slot/EP0 整块拷贝 → Output，EP0→Running、Slot State→Default、Address→'0'、CC=Success；非 Enabled → Context State Error | spec-46.txt L523-549（p99-100） |
| BSR=0 分支：SET_ADDRESS 请求卡（bmRequestType=0 / wValue=选中地址 / wIndex=0 / wLength=0 / Route String 取自 Input Slot Context）→ 成功：拷贝+Running+Slot State→Addressed+Address=选中值+Success | spec-46.txt L550-586（p100） |
| 失败分支：SET_ADDRESS 不成功 → CC=USB Transaction Error、槽停 Default；非 Enabled/Default → Context State Error；软件负责 SetAddress() 恢复间隔计时与超时中止 | spec-46.txt L588-594、L625-627（p100-101） |
| 错误族卡：地址耗尽=Resource Error / context 无效=Parameter Error（输出不动）/ 失败恢复=Disable+Enable Slot / TT 后设备=CLEAR_TT_BUFFER / 命令中止=设备状态未知 / 端点须 Stopped 或 Idle | spec-46.txt L603-606、L621-644（p100-101） |
| 引文 "If a USB Transaction Error … may be due to a Stall response … Software should issue a Disable Slot Command … then an Enable Slot Command to recover …"（逐字） | spec-46.txt L633-636（p101） |
| 护栏二条：① SET_ADDRESS 在 DCEP Transfer Ring 上被检出 → TRB Error、永不转发；② 首请求 GET_DESCRIPTOR wLength=8、末字节 bMaxPacketSize0 回写 Max Packet Size | spec-46.txt L446-449、L428-436（p98） |
| 收口卡：用途/BSR/Input Context 合同/成功（EP0 全通）；转场「下一支：§4.6.6 Configure Endpoint（本批）」 | spec-46.txt L398-651 汇总；L657（§4.6.6 起） |

## 4606-configure-endpoint.mp4（§4.6.6 Configure Endpoint · p102-112；R10 批 B TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.6 Configure Endpoint · p102-112；示例声明「Slot ID=1（Addressed 槽）· 启用 EP1 IN / EP1 OUT —— 课程示例值」 | spec-46.txt L657-658（节题）；示例值=课程口径 |
| 引文 "The Configure Endpoint Command is issued by software to enable, disable, or reconfigure endpoints associated with a target configuration."（逐字） | spec-46.txt L659-660（p102） |
| 三大场景卡：配置设备（配 SET_CONFIGURATION · Addressed→Configured）/ 去配置（DC=1 + SET_CONFIGURATION(0) · Configured→Addressed）/ 改交替接口（配 SET_INTERFACE） | spec-46.txt L665-704（L667-672/L677-686/L698-702） |
| xHC 不维护配置↔端点关系注记：软件用 Add/Drop 旗标显式指出受影响端点 | spec-46.txt L711-726（p103） |
| DC 捷径卡：DC='1' 等价 Drop 2-31 全 1 + Add 2-31 全 0；Input Context Pointer 被忽略；输出 Context Entries 落 '1'；只有 DCEP 的设备发 SET_CONFIGURATION(0) 前无需本命令 | spec-46.txt L689-696（p102） |
| Input Context 旗标合同卡：A1/D0/D1 清 '0'（EP0 不适用）、A0='1'、其余按端点定；Add 引用须初始化、仅 Drop 引用无需初始化 + 引文（逐字节选） | spec-46.txt L732-743（p103） |
| 发行流程：Configure Endpoint TRB 卡（TRB Type/Slot ID/Input Ctx Pointer（DC=1 时忽略）/DC 位/其余清 '0'/Cycle bit=PCS）→ 敲 HC 门铃 | spec-46.txt L1043-1061（p108） |
| 评估两变量卡：先 Drop 后 Add；Resource Required=Σ Drop 释放 − Σ Add 需求；Bandwidth 同式记账（周期端点）；Drop 命中 Disabled=无操作；全部评完才动资源与 Slot State + 引文（逐字节选） | spec-46.txt L752-789、L791-816（p103-104） |
| 超额判定与零改动注记：Resources/Bandwidth Available−Required<0 → Resource/Bandwidth Error（次域=Secondary）；失败→资源/带宽/Slot State/输出 EP Context 全不动；undefined 警栏（D=0、A=1 而非 Disabled=加端点不清旧账） | spec-46.txt L818-859（p104-105） |
| 成功四象限（2×2 卡阵）：D=0A=0 无操作 / D=1A=0 摘调度表+Disabled / D=0A=1 入调度表+全字段拷贝+Running+DB 使能 / D=1A=1 释放旧配额+分配新+拷贝+Running；拷贝=Stream Context Array/Transfer Ring 所有权软件→xHC（Figure 4-3 指路 p108） | spec-46.txt L868-932（p105-106）；L1007-1041（图） |
| Slot State 收束卡：全 DCI 2-31 Disabled → Addressed + Context Entries='1'；任一 enabled → Configured + Entries=最后有效上下文索引（槽状态卡翻转 Configured ✓） | spec-46.txt L934-942（p106）、L1193-1204（p110） |
| Alt Interface 四规则卡：不修改=00 / 新启用=01（须初始化）/ 禁用=10 / 参数修改=11 | spec-46.txt L943-958（p106-107） |
| 错误族卡：Slot State=Disabled→Slot Not Enabled Error / 带宽不够→Bandwidth Error / 资源不够→Resource Error / Add DCI>Entries→Parameter Error / 槽非 Addr/Cfg→Context State Error / 退出延迟超限→Max Exit Latency Too Large | spec-46.txt L975-981（p107）、L1237-1243、L1259-1262（p111） |
| 完成事件与 ELD 卡（4.6.6.1）：ELD=0 不支持 hint；Success→Max Exit Latency 可增 μs 数；MELTL Error→须减 μs 数；其余 CC Param 清 '0' | spec-46.txt L1270-1294（p111-112） |
| 双确认门注记：命令成功+SET_CONFIGURATION（或 SET_INTERFACE）都成功才可排传输；成功后端点入调度表、DCB 使能、TRB 可上环 | spec-46.txt L965-972、L986-989（p107） |
| 收口卡：用途/旗标（四象限）/天平（先评估失败零改动）/收束（Configured↔Addressed）；转场「补丁片 ch4606p（本批）」 | spec-46.txt L657-1294 汇总 |

## 4611-reset-device.mp4（§4.6.11 Reset Device · p128-130；R10 批 B TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.11 Reset Device · p128-130；示例声明「Slot ID=1（已 Configured 的槽）—— 课程示例值」 | spec-46.txt L2347-2348（节题）；示例值=课程口径 |
| 引文 "The Reset Device Command is used by software to inform the xHC that the USB Device associated with a Device Slot has been Reset (by either; setting the Root Hub port PR flag …, or issuing a SetPortFeature(PORT_RESET) request …)."（逐字） | spec-46.txt L2349-2353（p128） |
| 复位操作已置形态注记：Slot State→Default、Address→'0'、除 DCEP 外端点全 Disabled——xHC 侧簿记要跟上 | spec-46.txt L2353-2357（p128） |
| 前提注记：先停全部端点活动 + 引文 "Software should stop all endpoint activity before issuing a Reset Device Command."（逐字）；未成功复位=未定义行为（后续 Address Device 必失败） | spec-46.txt L2357-2375（p128） |
| Reset Device TRB 卡：TRB Type / Slot ID=1（示例）/ Input Context=不引用（与 4.6.5/4.6.6 最大差异）/ 其余清 '0' / Cycle bit=PCS + 引文（逐字节选） | spec-46.txt L2385-2400（p129） |
| xHC 处置卡：非 DCEP 五项（终止 USB 活动/禁门铃/弃未上环挂起事件/放周期带宽/放内部资源）+ DCEP 三项（终止活动+弃挂起+转 Running） | spec-46.txt L2359-2372（p128） |
| 执行算法动画：Slot Context 逐行翻转（Slot State→Default / Context Entries→'1' / Address→'0'）+ EP 条禁用（EP1/EP2→Disabled、EP0 保持）+ 引文（逐字节选） | spec-46.txt L2401-2417（p129） |
| 完成事件卡：固定 Interrupter 0 的事件环；曾 Addressed/Configured→CC=Success；否则→Context State Error + 引文（逐字节选） | spec-46.txt L2419-2433（p129） |
| 软件回收义务注记：被禁端点上下文拥有的内存结构（Stream Context Array/Transfer Ring 等）由软件收回 | spec-46.txt L2438-2440（p129） |
| 无 Input Context 深意注记：TRB 不引用 Input Context，复位后 Slot/EP0 Context 值由 xHC 直接落成（须足以向刚复位设备的 DCEP 发请求，6.2.2.4/6.2.3.7 指路） | spec-46.txt L2447-2454（p130） |
| 收口卡：用途/命令 TRB（无 Input Context）/xHC（五项清算+DCEP 回 Running）/事件（Interrupter 0 · CC 双分支）；转场「下一支：§4.6.12 Force Event（批 D）」 | spec-46.txt L2347-2454 汇总；L2455（§4.6.12 起） |

## ch4606p 补丁分帧（d6759133e981 "Correct last context entry calculation for Configure Endpoint"；R10 批 B 补丁候选首支）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 幕① 背景：内核在 add_endpoint()/drop_endpoint() 里增量重算 Context Entries；drop 假定 add_flags 含全部端点（实际只含新增）+ EP0_FLAG 非恒置 → 全 drop 算出 0（Parameter Error）或 -1（按 31 解读沿用旧值）（message 原文逐字） | git show d6759133e981 message（drafts/patch-46.txt） |
| 幕② diff 面板：drop 旧 1637-1644 删增量块 / add 旧 1762-1769 同删 / check_bandwidth 新 2723-2734 终点重算循环（i 自 31 下探：ring 存活未 Drop 或 Add 置位 → LAST_CTX(i)；i==1 兜底）（diff 逐字） | git show d6759133e981 diff（drafts/patch-46.txt） |
| 幕② 逻辑注记卡：循环判据=存量（ring 存活且未 Drop）或增量（Add 置位）取第一个命中；全不命中 i==1=只剩 EP0 | 同上 diff L2725-2734 |
| 幕③ 规范收尾引文 "If all Endpoints are Disabled: … Set the Context Entries field … to '1'. else … to the index of the last valid Endpoint Context"（逐字）——i==1 兜底与 else 分支=两行内核直译；坏值 0 代价=p111 Parameter Error 判据（Add DCI > Context Entries） | spec-46.txt L1193-1204（p110）、L1256-1257（p111） |
| 总结卡：改动（删两处增量 -33）/新增（check_bandwidth 终点重算 +11）/对齐（i==1==规范 Entries='1' 分支）/堵漏（全 drop 不再算出 0/-1） | git show d6759133e981 |

### R10 批 B 口径注记

- ch4605 选中地址 0x11、ch4606 启用 EP1 IN/OUT、ch4611 三端点示例皆为课程示例值（规范未定具体值）。
- ch4605 三个 Note（SetAddress 恢复间隔 L625-627 / TT CLEAR_TT_BUFFER L642-644 / 端点 Stopped-Idle L637-641）
  与 ch4606 脚注 14（Add+Drop 同置不写中间 Disabled 态 L1212-1214）、脚注 15（主/次域检查顺序 L1216-1217）
  按降密度原则归错误族卡/注记一行带过，全文在 landing 卡引文（s46-05/06 full 区间）。
- ch4606 ELD 数值语义（μs）上屏，granularity 报 '1' 细则（L1292-1294）归本注记。
- ch4611 6.2.2.4/6.2.3.7（复位后 Slot/EP0 Context 字段值细则）只指路不展开。

## 4607-evaluate-context.mp4（§4.6.7 Evaluate Context · p112-114；R10 批 C TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.7 Evaluate Context · p112-114；示例声明「Slot ID=1（Addressed 槽，Add 旗标点名 EP1/EP2）——课程示例值」 | spec-46.txt L1295-1296（节题）；示例值=课程口径 |
| ① 目的引文 "The Evaluate Context Command is issued by software to inform the xHC that specific fields in the Device Context data structures have been modified. … the Max Packet Size of the control endpoint may be determined only after software reads the Device Descriptor …"（逐字节选） | spec-46.txt L1296-1303（p112） |
| ② Input Context 合同注记：Add 旗标点名评估对象 / Drop 全清 '0' 不适用 / 未被 Add 引用的 Context 全部忽略 | spec-46.txt L1318-1325（p112） |
| ③ EvalCtx TRB 卡（TRB Type / Slot ID=1 / Input Context Ptr / Add flags=A1+A2·Drop=全'0' / Cycle=PCS）+ 入环+门铃 + 发行引文（逐字节选） | spec-46.txt L1326-1355（p112-113） |
| ④ 执行分支卡（受理槽态三态内 / 逐 Add 评估·无效→Parameter Error / MEL+Isoch 排不下→Too Large / 槽态外·未使能→两族 Error）+ 执行引文（逐字节选） | spec-46.txt L1356-1405（p113） |
| ⑤ 完成事件卡（CC=Success 才逐 Add 端点更新 Output / 任一错误输出侧一字节不改 / MEL 改动 Isoch TD 数据不弃）+ 引文（逐字节选） | spec-46.txt L1393-1397、L1420-1421、L1423-1425（p113-114） |
| ⑥ 槽字段翻转动画（Max Exit Latency 旧值→新值）+ DCI 守卫引文 "The xHC shall consider an Endpoint Context invalid if the DCI of an Add Context flag = '1' is greater than the value of Context Entries."（逐字） | spec-46.txt L1417-1418（p114） |
| 收口卡：用途（报备上下文参数事后更新）/评估对象（Add 点名）/执行（槽三态内逐 Add 评估）/事件（Success 才更新）；转场「下一支：§4.6.8 Reset Endpoint（本批）」 | spec-46.txt L1296-1425 汇总 |

## 4608-reset-endpoint.mp4（§4.6.8 Reset Endpoint · p114-118；R10 批 C TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.8 Reset Endpoint · p114-118；示例声明「Slot ID=1、Endpoint ID=2（Halted 端点）——课程示例值」 | spec-46.txt L1434-1435（节题）；示例值=课程口径 |
| ① 目的引文 "The Reset Endpoint Command is issued by software to recover from a halted condition on an endpoint. … removed from the xHC's Pipe Schedule, the Doorbell Register for that pipe is disabled, … set to Halted, … silently dropped."（逐字节选） | spec-46.txt L1436-1444（p114） |
| ② 前提分支卡（非 Halted→Context State Error / TSP='0'→清 Toggle/SeqNum+失效缓存 TD / TSP='1'→保留+软重试）+ TSP 引文（逐字节选） | spec-46.txt L1450-1466（p114） |
| ③ Reset EP TRB 卡（TRB Type / TSP='0'（'1'=SoftRetry）/ Endpoint ID=2 / Slot ID=1 / Cycle=PCS）+ 入环+门铃 + 发行引文（逐字节选） | spec-46.txt L1537-1554（p116） |
| ④ 完成事件：EP 卡翻转（Halted→Stopped / Doorbell 已使能）+ 事件环推进 + 完成引文 "…Set the Endpoint State (EP State) field to Stopped. … Enable the Doorbell register for the endpoint. Completion Code = Success"（逐字节选） | spec-46.txt L1555-1587（p116） |
| ⑤ reset-a-pipe 五步注记（两段分时）：①Reset Endpoint（TSP='0'）②CLEAR_TT_BUFFER（TT 后 Control/Bulk）③ENDPOINT_HALT（非 Control）④Set TR Dequeue Pointer ⑤Ring Doorbell——第④步=下一支命令 | spec-46.txt L1503-1525（p115） |
| ⑥ Soft Retry 卡（场景=临时性 Trx Error / 两步=TSP='1'→门铃 / 收益=再得 CErr 次 / 禁忌=Isoch·TT 后·限次）+ Soft Retry 引文（逐字节选） | spec-46.txt L1626-1650（p117）；禁忌 L1649-1650/L1657-1659/L1662-1663 |
| 收口卡：用途（从 halted 恢复·仅限 Halted 态）/TSP 两分支/事件（EP→Stopped·门铃使能·Success）；转场「下一支：§4.6.9 Stop Endpoint（本批）」 | spec-46.txt L1436-1663 汇总；仅限 Halted L1620-1624 |

## 4609-stop-endpoint.mp4（§4.6.9 Stop Endpoint · p118-125；R10 批 C 巨头 TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.9 Stop Endpoint · p118-125；示例声明「Slot ID=1、Endpoint ID=2（Running 端点）——课程示例值」 | spec-46.txt L1664-1665（节题）；示例值=课程口径 |
| ① 目的引文 "…issued by software to stop the xHC execution of the TDs on an endpoint. … temporarily take ownership of Transfer Ring TDs … or to stop USB activity prior to powering down the xHC."（逐字节选） | spec-46.txt L1666-1669（p118） |
| ② 断点续传注记（四行）：快到可能停在 TRB 中间 / TR Dequeue Pointer+DCS（及 Opaque）写回上下文 / 4KB TRB 停在 1KB 处例 / Set TR Deq 覆盖断点=旧进度作废 | spec-46.txt L1675-1687（p118） |
| ③ 三场景卡（TD 之间→FSE·Stopped-Invalid Len / 短包已检出·SPC='1'→Stopped-Short Packet / TD 进行中→Stopped·Len=残余 / 共同点=Stopped Event 先于 CC Event）+ FSE 引文（逐字节选） | spec-46.txt L1721-1748（p120） |
| ④ xHC 停止动作卡（in-flight 先完成 / ERDY·轮询 忽略·收手 / SS 等 ERDY 清流控 / SO·Schedule 终止·移出） | spec-46.txt L1792-1816（p120） |
| ⑤ Stop EP TRB 卡（TRB Type / Endpoint ID=2 / Slot ID=1 / SP 旗标=挂起场景'1' / Cycle=PCS）+ 入环+门铃 + 发行引文（逐字节选） | spec-46.txt L2038-2068（p123-124）；SP L1789-1791 |
| ⑥ 完成事件双件卡（先 Transfer Event·CC=Stopped / 后 Command Completion / 写回 DeqPtr+DCS·EP→Stopped）+ 双事件环推进 + EP 卡三行翻转（Running→Stopped / 内部→已写回 / 在列→已移出） | spec-46.txt L2069-2161（p124-125） |
| ⑦ 竞态暗礁引文 "A possible race condition may occur if software, thinking an endpoint is in the Running state, issues a Stop Endpoint Command however at the same time the xHC asynchronously transitions…"（逐字节选）——为 ch4609p 补丁铺路 | spec-46.txt L1881-1887（p122） |
| ⑧ 软件三选项注记（四行）：暂停意图=直接门铃续跑 / 中止 TD=Set TR Deq 换起点 / 重排 TD=先看事件环定位、停点 TRB 不可改 | spec-46.txt L1760-1782（p120） |
| 收口卡：用途（停管道拿回控制权）/断点（Deq Ptr+DCS 写回）/回执（Stopped 先于 CC）/竞态（异步 Halted/Error）；转场「下一支：§4.6.10 Set TR Dequeue Pointer（本批）」 | spec-46.txt L1666-2165 汇总 |

## 4610-set-tr-dequeue-pointer.mp4（§4.6.10 Set TR Dequeue Pointer · p125-128；R10 批 C TrackA 终订=成片上屏内容）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 片头：§4.6.10 Set TR Dequeue Pointer · p125-128；示例声明「Slot ID=1、Endpoint ID=2（Stopped 端点）——课程示例值」 | spec-46.txt L2166-2167（节题）；示例值=课程口径 |
| ① 目的引文 "…issued by software to modify the TR Dequeue Pointer field of an Endpoint or Stream Context. … may be executed only if the target endpoint is in the Error or Stopped state."（逐字节选） | spec-46.txt L2168-2176（p125） |
| ② xHC 三件事注记：出队指针改写为 TRB 新值 / 失效全部缓存 TD（回内存重取）/ 清残余传输状态（EDTLA 归 0·split 清）→ CC=Success | spec-46.txt L2197-2212（p126） |
| ③ SetDeqPtr TRB 卡（TRB Type / EP·Slot ID=2/1 / Stream ID='0' / New Deq Ptr·DCS=新起点+配套 CCS / Cycle=PCS）+ 入环+门铃 + 发行引文（逐字节选） | spec-46.txt L2220-2252（p126-127） |
| ④ 完成事件分支卡（受理前提=Stopped/Error / Stream 有效→拷 NewDeq+DCS·Success / Stream 无效→TRB Error / EP 非两态→Context State Error）+ 事件环推进 + 分支引文（逐字节选） | spec-46.txt L2253-2319（p127） |
| ⑤ 输出侧翻转动画（TR Deq Ptr 旧→新 / DCS 旧→新 / 残余状态→已清零）+ 拷贝引文（逐字节选） | spec-46.txt L2281-2303（p127）+ L2204-2209（p126） |
| ⑥ 时机三条注记：部分执行 TD 剩余 TRB 不再执行 / 指向部分完成 TRB=当 TD 首个 TRB（先前进度作废）/ 传输终止后尽快发（释放读-ahead 缓存）+ 与 §4.6.8 reset-a-pipe 第④步配合 | spec-46.txt L2213-2215（p126）、L2330-2342（p128）；配合 L1519-1525（p115） |
| 收口卡：用途（改出队指针·Error/Stopped 态）/动作（改指针+失效缓存+清残余）/TRB（New Deq Ptr 与 DCS 配套）/事件（Stream ID 分支+CC 四族）；转场「下一支：§4.6.11 Reset Device（已上线）」 | spec-46.txt L2168-2346 汇总 |

## ch4609p 补丁分帧（1174d44906d5 "xhci: handle stop endpoint command completion with endpoint in running state."；R10 批 C 补丁第二支）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 幕① 背景：上一轮 URB 取消完成并重启端点后硬件可能未真正跑环；再发 Stop Endpoint 报 "context state error" 假失败；门铃写 flush 降概率未根除；修法=完成处理查环在跑即重发（message 原文逐字） | git show 1174d44906d5 message（drafts/patch-47.txt） |
| 幕② diff 面板：@@ -983,6 +983,7 @@ 新增 command 局部变量 / @@ -1029,6 +1030,18 @@ EP_STATE_RUNNING case 补 race 注释+GFP_ATOMIC 分配+重挂 stop_cmd_timer+重发 Stop Endpoint+重敲命令环门铃；halted case 补 return（diff 逐字） | git show 1174d44906d5 diff（drafts/patch-47.txt） |
| 幕② 逻辑注记卡：环在跑=假 Context State Error——原地重发命令+重挂 timer+止住 halted case 串入 | 同上 diff L1030-1043 |
| 幕③ 规范收尾引文 "…a Context State Error may be generated for the command completion."（逐字节选）——竞态 Note 的驱动侧实修（反向形态：环实际 Running）；修复块至今存活于基线对读段 | spec-46.txt L1881-1887（p122） |
| 总结卡：改动（完成处理 EP_STATE_RUNNING case +13/-0）/动作（重挂 timer+原地重发）/堵漏（假 Context State Error 自愈）/对齐（竞态 Note 驱动侧实修） | git show 1174d44906d5 |

## ch4610p 补丁分帧（0d9f78a92ef5 "xhci: Fix hang on back-to-back Set TR Deq Ptr commands."；R10 批 C 补丁第三支）

| 画面/字幕断言 | 规范出处 |
|---|---|
| 幕① 背景（两段分时）：LifeChat 3000 耳机稳定挂死+日志刷屏 "ERROR Transfer event TRB DMA ptr not part of current TD"；触发面=双段环+TD 恰好结束在 link TRB 前+背靠背两次 Set TR Deq（message 原文逐字）；后果链=无条件推进越段（la-la-land）→ deq_seg/dequeue 失同步 → virt_to_dma NULL → 事件被忽略 → 超时转 No-Op → 中断上下文死循环 → 整机挂死 | git show 0d9f78a92ef5 message（drafts/patch-48.txt） |
| 幕② diff 面板：while 前补 last_trb 段尾守卫（+11）——软件指针停在 link TRB 时先跨段回段首（diff 逐字） | git show 0d9f78a92ef5 diff（drafts/patch-48.txt） |
| 幕② 逻辑注记卡：守卫=段尾先跨段回段首再进 while，不再越段扫内存 | 同上 diff L889-898 |
| 幕③ 规范收尾引文 "Set the Dequeue Pointer … Invalidate any xHC TDs that may be cached…"（逐字节选）——补丁修的=软件簿记与硬件对齐；沿革注记：修复函数已由 856563be98b2（2025-03-06）退役（queued_* 直存），基线无修复后形态，判据=diff 原文 | spec-46.txt L2197-2202（p126）；856563be98b2=message 原文 |
| 总结卡：改动（while 前补 last_trb 段尾守卫 +11）/动作（段尾先跨段、dequeue 回段首）/堵漏（越段扫描/失同步/整机挂死）/沿革（2025-03 函数退役） | git show 0d9f78a92ef5 |

### R10 批 C 口径注记

- ch4607 Add 旗标点名 EP1/EP2、ch4608 Endpoint ID=2、ch4609 Endpoint ID=2、ch4610 EP ID=2/Stream ID='0' 皆为课程示例值（规范未定具体值）。
- 批 C 补丁片两支的三判据实证（R10-SPEC §6）：1174d44906d5（Mathias Nyman 2021-01-29，halted endpoint 系列，完成处理竞态实修；lore 20210129130044.206855-24）/ 0d9f78a92ef5（Sarah Sharp 2012-06-21，Cc stable 回移 3.4+，整机挂死修复）。
- ch4610p 无基线对读段=诚实处置：修复函数 update_ring_for_set_deq_completion 已被 856563be98b2（2025-03-06）删除
  （TRB/段出队指针此后直接存 queued_deq_seg/queued_deq_ptr），基线不含修复后形态，硬凑对读段=造伪；landing s46-10 卡逻辑段注记沿革，分帧走读以 diff 原文为判据。
- ch4608 Soft Retry 三禁忌（Isoch L1649-1650 / TT 后 L1657-1659 / 限次 L1662-1663）与 undefined behavior TSP='0' 注（L1533-1536）、
  资源不释放注（L1599-1600）、recovery interval 软件计时注（L1610-1611）、控制端点后必发 Set TR Deq 注（L1612-1614）、
  部分完成传输清理注（L1615-1619）按降密度原则归 Soft Retry 卡禁忌行/EVIDENCE 注记，全文在 landing s46-08 full 区间。
- ch4609 stopped 时 EDTLA 细则（L1688-1691 Event Data TRB 先执行）、SEC 能力注（L1692-1710）、
  字节数计算四分支 Note（L1830-1848）、Event Data 模拟注（L1849-1855）、USB2 split 等待注（L2164-2165）
  按降密度原则归三场景卡/双件卡一行带过，全文在 landing s46-09 full 区间（含 Table 4-2 全表 (1888,1952)+(1959,2034)）。
- ch4610 非 active Stream Context 修改注（L2216-2219）、active Stream 目标=未定义行为注（L2343-2346）
  归时机注记/landing full 区间；MaxPStreams>'0' 且 Stream ID='0' → TRB Error 分支在 landing 卡引文（s46-10 full (2253,2319)）。
- ch4607 Interrupter Target 修改前须全端点 Stopped 注（L1427-1429）归 EVIDENCE 注记；MEL Isoch 不弃数据注（L1423-1425）上屏完成事件卡。
- 批 C 帧预算对照（R10-SPEC §3）：ch4607=1340f（中档 900-1600 ✓）/ ch4608=1428f（大档 1400-1800 ✓）/
  ch4609=1673f（巨头档 2000-2400，低于下限 327f≈10.9s——降密度收得比预算紧，机制面全覆盖（8 段+收口），
  pace/probe/fullwalk 三硬门全绿，预算偏差记档不返工）/ ch4610=1250f（中档 900-1600 ✓）/
  ch4609p=847f、ch4610p=976f（R9 形态 ~650f 上浮，三幕结构同 ch4606p）。
