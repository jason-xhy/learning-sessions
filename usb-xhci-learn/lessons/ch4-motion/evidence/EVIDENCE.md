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

提取文本页标 = PDF 页 = 规范印刷页（三节切片已带 `===== [PAGE n] =====` 标逐页核对）。
本表行号指 `evidence/spec-4x.txt` 内行号（非规范页码）。
