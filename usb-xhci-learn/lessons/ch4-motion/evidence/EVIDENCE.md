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
