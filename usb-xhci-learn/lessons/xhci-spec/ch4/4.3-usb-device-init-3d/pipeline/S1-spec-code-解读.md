# S1-spec-code-解读 —— xHCI §4.3 USB 设备初始化（规范 × Linux xhci 驱动）

产出：2026-11-10 ｜ S1 worker ｜ 依据：PIPELINE.md §0/§1、S1-需求.md、S1-设计.md
定位：**S2–S7 全部环节的规范/代码事实唯一引用源**。后续环节引用数值、字段、流程、坑一律以本文档为准；新增数值必须回 S1 通道补核（PIPELINE §3）。

---

## 0. 素材与判据通道

| 项 | 值 | 现场核证据 |
|---|---|---|
| 判据规范 | xHCI 1.2b，Document Number 625472 | PDF 首页标注 "Document Number: 625472, Revision: 1.2b"（每页页眉） |
| PDF | `/Users/jason/ZCodeProject/usb-xhci-study/specs/625472_xHCI_Rev1_2b.pdf`（595 页） | pymupdf page_count=595（本轮实测） |
| 页码口径 | **印刷页码 = PDF 页码**（p71 = §4.3 节头页） | 本轮 awk 逐页核对；V1/V2 EVIDENCE 的 pNN 引用与本口径一致 |
| 提取文本 | `/tmp/spec-audit-txt/xhci-1.2b.txt`（`===== [PAGE n] =====` 页标），重产命令 `python3 scripts/xhci_spec_extract.py`（须用 `/usr/local/bin/python3.9`，自带 pymupdf） | EXTRACT-OK pages=595（本轮） |
| 内核源码 | `/Volumes/KernelSrc/linux`，**Linux 7.3.0-rc7** | Makefile：VERSION=7 PATCHLEVEL=3 SUBLEVEL=0 EXTRAVERSION=-rc7 |
| 驱动文件 | drivers/usb/host/xhci.c、xhci-mem.c、xhci-ring.c、xhci-hub.c、xhci.h；辅助 drivers/usb/core/hub.c | 本轮 grep/Read 实测 |
| 已核基线 | 同目录 `EVIDENCE.md`（V1 §2 内容断言 + V2 §7 改版） | 附录 A 逐条收录对照 |
| 设计约束 | `lessons/xhci-spec/DESIGN.md` §2 避雷清单 / §3.1 术语 / §3.2 隐喻词 | §7/附录 B 收编对照 |

术语口径（DESIGN §3.1）：system software 首用作「xHCI 驱动（规范称 system software）」；Device Slot=设备槽；TRB=传输请求块；doorbell=门铃；port reset=端口复位；Default/Addressed/Configured（设备态与槽态）保留英文、首用注中文；Command Completion Event=命令完成事件；Transfer Event=传输事件。

---

## 覆盖面速览（任务书 ①–⑧ → 本文档章节）

| 任务书项 | 章节 |
|---|---|
| ① 十二步初始化全流程事实表 | §1 |
| ② 三环+门铃+DMA+中断 代码级事实 | §4 |
| ③ FS 8 字节描述符与 GET_DESCRIPTOR 三 TRB 字段组 | §3 |
| ④ EP0 上下文初值与 Input Context A0/A1、Slot Context | §5 |
| ⑤ USB2 vs USB3 端口状态机差异 | §2 |
| ⑥ BSR=0/1 分支语义 | §6 |
| ⑦ 易错点清单 | §7 |
| ⑧ S2 设计师消费指引（建模提示） | 各章末「建模提示」+ §8 汇总 |

---

## 1. ① §4.3 十二步初始化全流程事实表

### 1.0 前置：端口从哪一态开始（p71）

- Chip Hardware Reset、HCRST、或被命令进入 PLS=RxDetect 后，**所有根集线器端口处于 Disconnected 态**：端口已上电（PP='1'），等待设备插入（p71）。
- 此后由 §4.19.1（Root Hub port states）细化端口状态机（p71 引用；本档不展开）。

### 1.1 十二步主表

> 规范 PDF 的编号在本节有两处断裂伪影：§4.3 主干步骤为 1.–12. 连续；§4.3.3 内部编号从「4.」起（应为 1.–8.）；§4.3.6 内部编号从「12.」起（应为 1.–5.）。**本表一律用规范化步骤号，括注 PDF 原编号**（避雷条目，DESIGN §2）。

| 步 | 规范动作（页码） | 寄存器/字段值 | 软件角色 | xHC 角色 | 设备角色 |
|---|---|---|---|---|---|
| 1 | xHC 检出插入：置 CCS=1、CSC=1；CSC 引起 PSCEG '0'→'1' 跳变则产生 Port Status Change Event（p71 步 1） | PORTSC.CCS=1、PORTSC.CSC=1 | 被动等待事件 | 检测插入、置位、产生事件 | 插入动作，进入 Powered |
| 2 | 收到 Port Status Change Event 后，软件按事件的 **Port ID 字段**定位是哪个端口（p71 步 2） | 事件 TRB Port ID 字段 | 读事件、辨端口 | 投递事件（写事件环） | — |
| 3 | 软件读该端口的 PORTSC（p71 步 3）：CSC=1 表示插入（CCS=1）或拔出（CCS=0）；插入时按协议族分叉（§2 章） | PORTSC 全寄存器 | 读 PORTSC | — | — |
| 4 | 端口 Enabled 后，软件用 **Enable Slot Command** 取设备槽（p72 步 4 → §4.3.2 p75） | 命令 TRB；回执 Slot ID 由 xHC 自选（p75） | 上命令、等命令完成事件 | 选 Slot ID、把槽从 Disabled 迁到 Enabled | — |
| 5 | 软件初始化该槽的数据结构（p72 步 5 → §4.3.3 p75–76）：Input Context 清零→A0/A1=1→填 Input Slot Context→分配 EP0 传输环→填 EP0 Context→分配 Output Device Context 清零→装载 DCBAA 表项（详见 §5 章） | A0=A1=1；Context Entries=1；EP0 上下文全字段（§5 表） | 全部主内存写（DMA 可见） | 不参与（此时未消费输入上下文） | — |
| 6 | 软件发 **Address Device Command**：给设备分配地址并使能 Default Control Endpoint（p72 步 6 → §4.3.4 p76–77） | 命令 TRB 带 BSR=0（主线）；输入上下文指针 | 上命令、等事件环回执 | 使能 EP0、选地址、代发 SET_ADDRESS、槽 Enabled→Addressed | 收 SET_ADDRESS，Default→Address |
| 7 | LS/HS/SS：默认包长 8/64/512 是唯一允许值，**步 7a 可跳过**；FS：软件先读 Device Descriptor **前 8 字节**取 bMaxPacketSize0，更新 EP0 Context 的 Max Packet Size 并告知 xHC（p72 步 7） | GET_DESCRIPTOR 三 TRB 字段组（§3 章） | 组 URB/写 EP0 环/按门铃/读回执/更新 MPS | 按 EP0 环执行传输、回 Transfer Event | 回 8 字节描述符 |
| 7a | FS 设备的 GET_DESCRIPTOR 三段 TD 操作细节（p73，全字段见 §3 章） | Setup/Data/Status 三 TRB 逐字段 | 写三 TRB + 三次推进 enqueue + 按 EP0 门铃 + 等 Status 段 Transfer Event 后更新 EP0 MPS（p74 步 ix）+ 发 Evaluate Context（A1=1）告知变更（p74 步 x） | 执行三段传输 | 按请求回数据 |
| 8 | EP0 完全可用后，软件读完整 Device/Configuration 描述符，交给对应 Class Driver（p74 步 8） | 经 EP0 环的 GET_DESCRIPTOR | 发请求 | 执行传输 | 回描述符 |
| 9 | 软件可发 **Evaluate Context Command**（A0=1）告知 Max Exit Latency；Output Slot Context 的 Interrupter Target 也可被此命令修改（p74 步 9） | A0=1 | 上命令 | 更新 MEL/Interrupter Target | — |
| 10 | Class Driver 用 **Configure Endpoint Command**（§4.3.5 p77–78）配槽，同时向设备发 **SET_CONFIGURATION**；**双操作同成**设备 Address→Configured、槽 Addressed→Configured（p74 步 10，引文 p74 "from Address to Configured"） | Configure Endpoint TRB（DC=0）；SET_CONFIGURATION 经 EP0 | 两个操作都发起并确认成功 | 执行命令、迁槽态 | 执行 SET_CONFIGURATION，迁设备态 |
| 11 | 如需要，软件为每个 Alternate Interface 设定替代接口（p74 步 11 → §4.3.6 p78–80） | Configure Endpoint + SET_INTERFACE | 停环/释放环/清 EP 上下文/重建/发命令 | 执行 Configure Endpoint | 执行 SET_INTERFACE |
| 12 | 管道全部就绪（p74 步 12）；Note：必须从 Root Hub 起**逐层**初始化每层拓扑的 hub 与 TT 再进下一层，否则 xHC 行为未定义（p74 Note） | — | 逐层驱动 | — | — |

支撑引用面：
- Enable Slot 细节 §4.3.2（p75）：**软件须等到该槽的命令完成事件后才可对同槽发后续命令**；成功后槽迁 Enabled（§4.5.3）。
- Address Device 细节 §4.3.4（p76–77）/§4.6.5（p97–98）：见 §6 章。
- Configure Endpoint 成功且 DC=0 → 槽 Addressed→Configured（p78）；失败而软件仍发 SET_CONFIGURATION = 未定义行为（p78）。
- §4.3.6（p78）：**xHC 不追踪 USB 接口与端口的归属关系**，由软件显式 Disable（Stop Endpoint + 释放传输环）再显式 Enable；受影响端口的 EP 上下文字段全部清 0（p79）。
- §4.3.7（p80）：经高速 hub 挂 LS/FS 设备时软件在 Slot Context 填 MTT、Parent Hub Slot ID、Parent Port Number；xHC 校验父 hub 的 Hub flag=1，为 0 则对违规 TD 生成 Parameter Error；根端口直连或非 LS/FS 设备时三字段清 0。
- §4.3.8（p80）：带宽不足 → §4.16.1 带宽协商。

**建模提示（①）**：十二步适合画成「设备登记流水线」的总时间轴：插入（步 1–3，端口读数屏亮 CCS/CSC）→ 取槽（步 4，从卡库抽一张空白槽卡）→ 填表（步 5，文书台填两张表格卡：Slot 卡与 EP0 卡，装入 DCBAA 格架）→ 编址（步 6，门铃一按、命令单沿命令环进站、设备铭牌翻面换地址）→ 试读 8 字节（步 7，FS 专属支线小卡）→ 配置（步 10，双票据并列——Configure Endpoint 命令单 + SET_CONFIGURATION 命令单都盖章才算过）。每步的"谁在动"三方角色就是三条可见动线：软件动笔（填卡）、xHC 动环（搬卡）、设备动灯（换态）。

---

## 2. ⑤ USB2 vs USB3 端口状态机差异

### 2.1 attach 分叉（p71）

| | USB3 协议端口 | USB2 协议端口 |
|---|---|---|
| 检出插入后 | 直接进 **Polling** 态（Figure 4-30，p71） | 进 **Disabled** 态（Figure 4-25，p71）并置 CCS=1、CSC=1 |
| 轮询/复位成功 | → **Enabled**：PED=1、PR=0、PLS=0；CCS=1、CSC=1；设备进 Default（p71 + p72 步 3a） | 须软件**端口复位**后才 Enabled（p72 步 3b） |
| 不成功 | → Disconnected：PED=0、PR=0、PLS=RxDetect('5')；设备保持供电（p72 步 3a） | （复位失败路径见 §4.3.1：PRC 无论成败都置 1，p74） |
| attach 后读数 | PED=1、PR=0、PLS=0、设备 Default | **PED=0、PR=0、PLS='7'（Polling）**（p72 步 3b；V1 场景屏 PLS 显示 7 的判据） |

- **Disabled 双义**（p71 Note）：USB3 的 Disabled = DSPORT.Disabled（USB3 规范 Figure 10-9）；USB2 的 Disabled = USB2 规范的 Disabled 态（Figure 11-10）。两族涉及时必须分开表述（避雷条目）。
- 已核（EVIDENCE §2「USB3 端口 attach 自动 Enabled（PED=1·PR=0·PLS=0）、无端口复位帧」）。

### 2.2 USB2 端口复位（p72 步 3b + §4.3.1 p74–75）

软件动作序列（§4.3.1，p75 编号 1–3）：
1. 写 PORTSC 的 **PR 位 = 1**（p75 步 1；驱动落点见下）。
2. 等该端口的 Port Status Change Event，**PRC=1**（p75 步 2）。
3. xHC 执行的复位操作见 §4.19.5（p75 步 3 引用；本档不展开）。

**复位完成四信号判据**（p72 步 3b 原句，避雷条目要求四信号一个不能少画）：
- PORTSC：**PRC=1（置位）、PED=1（置位）、PR=0（清零）、PLS=U0('0')**；
- PRC 的置位若引起 PSCEG '0'→'1' 跳变，xHC 产生 Port Status Change Event（p72）；
- 复位把 USB2 设备送入 Default 态，"preparing it for a SET_ADDRESS request"（p72；needle 句）；
- Note（p75）：复位成功后 **PORTSC Port Speed 字段指示所挂设备的速度**（V1 演示样例 FS 的判据）。
- 复位进行**期间**的 PLS 数值：规范未给，不造数（V1 口径；场景屏显示"复位"文字而非数值）。

USB3 无对应软件复位步骤（主线）；USB3 有独立的 warm reset 机制在 §4.19.1/§4.19.5.2，不在 §4.3 引用面内，本档不展开。

### 2.3 PSCEG 机制（p71 步 1 + §4.19.2 p291–292）

- 事件产生条件是 PSCEG（Port Status Change Event Generation）的 **'0'→'1' 跳变**，不是"变化位=1 就有事件"（p71；§4.19.2 p292 原句 "A '0' to '1' transition of the Port Status Change Event Generation (PSCEG) signal shall cause a Port Status Change Event to be generated"；避雷条目）。
- PSCEG 是 xHC 内部变量，**不直接暴露给软件**（p292）。
- 同步性警告（§4.19.2 p292 Note）：软件读 PORTSC 看到变化位=1 时，**不保证**对应事件已写入事件环（内部调度有滞后）；已核（EVIDENCE §2「PSCEG 0→1 跳变才产生事件」）。
- 无序性（p292 Note）：Transfer Event 与 Port Status Change Event 之间无顺序要求（如拔出时拔出事件可先入环）。
- 各端口变化位相或后经门控产生 PSCEG（p293 图示文字）。
- 软件确认方式：**清 PORTSC 对应变化位**（write-1-to-clear），为下次上报腾位（p292）。

### 2.4 驱动证据（xhci-hub.c，本轮行号）

| 驱动事实 | file:line |
|---|---|
| SetPortFeature(USB_PORT_FEAT_RESET) → `portsc \|= PORT_RESET` 后写回 PORTSC（=规范 p75 步 1 的写 PR=1） | xhci-hub.c:1468–1475 |
| GetPortStatus → `xhci_get_port_status`：PORT_CSC→USB_PORT_STAT_C_CONNECTION<<16、PORT_PEC、PORT_OCC、**PORT_RC→USB_PORT_STAT_C_RESET**（=PRC 映射） | xhci-hub.c:1148–1155 |
| PORT_CONNECT→连接位+xhci_port_speed（=复位后 Port Speed 上报）、PORT_PE→ENABLE（=PED 映射）、PORT_RESET→RESET（=PR 映射） | xhci-hub.c:1158–1167 |
| USB3/USB2 分道：`hcd->speed >= HCD_USB3` 走 xhci_get_usb3_port_status，否则 xhci_get_usb2_port_status（=两族不同判据的代码形态） | xhci-hub.c:1170–1173 |
| USB3 子函数：PLC/WRC/CEC 变化位与链路态上报 | xhci-hub.c:1020–1069 |
| USB2 子函数：上电门控下 U3→SUSPEND、U0 清挂起、RESUME 处理 | xhci-hub.c:1071–1123 |

**建模提示（⑤）**：两族端口画成两条不同颜色的端口小台：USB2 台上有"复位按钮"（软件按下=写 PR，就绪灯三连闪后读数屏换 PLS=U0+PED=1）；USB3 台没有按钮，插入后读数屏自己走到 Enabled（自动档）。PSCEG 画成端口台上的一根"事件扳机"拉线：只有从松到紧的拉动瞬间才发射一张事件卡到事件环——读数屏已亮而拉线未拉的场景（同步性警告）可以作为试错展示点。

---

## 3. ③ FS 8 字节描述符与 GET_DESCRIPTOR 三 TRB 字段组

### 3.1 为什么只 FS 走这步（p72 步 7）

- LS/HS/SS 设备：Default Control Endpoint 只允许 **8/64/512** 字节，可直接填默认值，**跳过**读取（p72）。
- FS 设备：软件应先读 USB Device Descriptor **前 8 字节**，取 **bMaxPacketSize0** 字段确定真实 Max Packet Size，更新 EP0 Context 并告知 xHC（p72）；已核（EVIDENCE §2「8 字节描述符读取仅 FS 必走」）。
- 细则（§4.6.5 p98 Note）：SET_ADDRESS 无数据段，默认 Max Packet Size 足以发出；**发给设备的第一个请求应为 GET_DESCRIPTOR 且 wLength=8**；返回的部分 Device Descriptor 最后一字节（bMaxPacketSize0）即 EP0 最大包长，软件须用它更新 Control Endpoint 0 Context 的 Max Packet Size（p98）。

### 3.2 三 TRB 字段组全值（p73 步 7a.ii/iv/vi 原文逐值；避雷条目照录）

前置：软件先分配 8 字节接收缓冲（p73 步 7a.i）。三段 TD 都写在与 DC EP0 关联的传输环上，每段写完推进一次 Enqueue Pointer（p73 步 iii/v/vii），最后按门铃（p74 步 viii）。

**Setup Stage TD（单个 Setup Stage TRB）**（p73）：

| 字段 | 值 |
|---|---|
| TRB Type | Setup Stage TRB |
| Transfer Type (TRT) | IN Data Stage (**3**) |
| TRB Transfer Length | **8** |
| Interrupt On Completion (IOC) | **0** |
| Immediate Data (IDT) | **1** |
| bmRequestType | **80h**（Dir=Device-to-Host, Type=Standard, Recipient=Device） |
| bRequest | **6**（GET_DESCRIPTOR） |
| wValue | **0100h**（低字节 Descriptor Index=0，高字节 Descriptor Type=1） |
| wIndex | **0** |
| wLength | **8** |
| Cycle bit | 当前 Producer Cycle State |

**Data Stage TD（单个 Data Stage TRB）**（p73）：

| 字段 | 值 |
|---|---|
| TRB Type | Data Stage TRB |
| Direction (DIR) | **'1'**（IN） |
| TRB Transfer Length | **8** |
| Chain bit (CH) | **0** |
| IOC | **0** |
| IDT | **0** |
| Data Buffer Pointer | Device Descriptor 接收缓冲地址 |
| Cycle bit | 当前 Producer Cycle State |

**Status Stage TD（单个 Status Stage TRB）**（p73）：

| 字段 | 值 |
|---|---|
| TRB Type | Status Stage TRB |
| Direction (DIR) | **'0'**（控制读的状态段方向=OUT） |
| TRB Transfer Length | **0** |
| CH | **0** |
| IOC | **1** |
| IDT | **0** |
| Data Buffer Pointer | **0** |
| Cycle bit | 当前 Producer Cycle State |

收尾（p74）：viii. 按**设备槽门铃**，DB Target = Control EP 0 Enqueue Pointer Update；ix. 收到 Status Stage TRB 的成功 Transfer Event 后，若描述符里 wMaxPacketSize 与现值不同，更新 EP0 Context Max Packet Size；x. 发 **Evaluate Context Command（A1=1）** 告知变更，之后 xHC 对后续 EP0 传输一律用新 MPS（p74）。已核（EVIDENCE §2「GET_DESCRIPTOR 三 TRB 字段组逐值」「Evaluate Context（A1=1）更新 EP0 MPS 生效」）。

### 3.3 驱动证据（xhci-ring.c xhci_queue_ctrl_tx，本轮行号）

| 驱动事实 | file:line |
|---|---|
| 控制传输 TRB 数 = 2（Setup+Status）+ 数据段按需加 | xhci-ring.c:3812–3820 |
| 先存 start_trb/start_cycle，TRB 全部构造完才把第一个 TRB 交给硬件（cycle 位后补） | xhci-ring.c:3835–3836 + 3436–3453 |
| Setup TRB：`TRB_IDT \| TRB_TYPE(TRB_SETUP)`（IDT=1）；`start_cycle==0` 时补 0x1（=规范 Cycle=PCS） | xhci-ring.c:3840–3844 |
| xHCI 1.0+ 填 Transfer Type（TRT）：IN 请求 → TRB_TX_TYPE(TRB_DATA_IN)（=规范 TRT=3 的代码形态） | xhci-ring.c:3847–3854 |
| Setup TRB 载荷：`bRequestType \| bRequest<<8 \| wValue<<16` 与 `wIndex \| wLength<<16`、`TRB_LEN(8)`（=80h/6/0100h/0/8 的进环形态） | xhci-ring.c:3856–3861 |
| Data TRB：IN 请求加 `TRB_ISP`（短包中断）与 `TRB_DIR_IN`（=DIR=1）；短缓冲可 IDT 内联（IDT=0 主线之外的驱动优化路径） | xhci-ring.c:3863–3896 |
| Status TRB：有数据段且 IN 请求时方向 field=0（OUT，=DIR=0），否则 TRB_DIR_IN；`TRB_IOC` 置 1（=IOC=1）、`TRB_TYPE(TRB_STATUS)` | xhci-ring.c:3903–3914 |
| 交硬件：giveback_first_trb → wmb + 补 cycle 位 + `xhci_ring_ep_doorbell(slot_id, ep_index=0, stream_id=0)`（=按 EP0 门铃 DB Target=1 的触发点） | xhci-ring.c:3916–3917 → 3436–3453 |
| Etron 快捷路径：Setup/Data TRB 不与 Link TRB 相接时插 No Op TRB（quirk，非主线） | xhci-ring.c:3798–3810 |

### 3.4 FS MPS 口径差异（重要，防 S2 画错）

- **规范侧**：§4.3.3（p76）EP0 Context 的 Max Packet Size = "按 PORTSC Port Speed 的默认最大包长"；规范**没有**把 FS 硬编码为 8——FS 的真实值要读 bMaxPacketSize0 才知道（p72/p98）。V1 演示样例"FS=8"是**样例设备的 bMaxPacketSize0=8**，不是"FS 默认=8"的规范常量。
- **驱动侧**：Address Device 时 FS 的初始 MPS **猜 64**（`USB_SPEED_FULL → max_packets = MAX_PACKET(64)`，注释明言 "USB core guesses at a 64-byte max packet first for FS devices"）——xhci-mem.c:1125–1128。LS=8、HS=64、SS/SSP=512（xhci-mem.c:1113–1133）。
- 结论：S2 若演示 FS 设备，MPS 读数屏在「编址后」可显示 8（样例设备值），但**不得**把"FS 默认 MPS=8"写成规范条文；驱动事实条（初始猜 64）可作对比注记。

**建模提示（③）**：三 TRB 画成三张依次进站的票据卡沿 EP0 传送带进站（Setup 卡/数据卡/状态卡，字段值印在卡面：TRT=3、IDT=1、IOC=0 → DIR=1、Len=8 → DIR=0、IOC=1）；门铃=设备槽门铃柱上的第二只旋钮（DB Target=1）。「FS 才需要读 8 字节」画成一条 FS 专属支线闸口：LS/HS/SS 卡车直接绕行（闸口牌写 8/64/512）。

---

## 4. ② 三环 + 门铃 + DMA + 中断的代码级事实

### 4.1 命令环唯一性

- 规范：§4.1（p68）原句 **"There is only one Command Ring that is used for issuing xHC specific commands or commands related to Device Slots"**——全规范唯一一条命令环（避雷条目：不得画多条）。
- 驱动：`struct xhci_hcd` 只有一个 `struct xhci_ring *cmd_ring` 成员——xhci.h:1544。
- 命令按序：§3.3（p60）**"Commands are executed by the xHC in the order that they are placed on the Command Ring"**；所有命令都以 Command Completion Event 在**事件环**上报完成（p60；避雷条目：回执走事件环，不回命令环）。
- 命令发起形态（§3.3 p60）：软件把 Command Descriptor 放上命令环，然后按**主机控制器门铃**；命令环可用 Link TRB 扩容（与传输环同机制）。

### 4.2 门铃（Doorbell Array）与 DB Target 分刻

- 寄存器组：每个设备槽一个 32 位门铃寄存器，**Slot ID 作索引**（p82）；DB Target 与 DB Stream ID 字段说明"按门铃"的目的（p82）。
- **门铃 0 = 主机控制器命令门铃**：DB Target = Host Controller Command，告知 xHC 命令环上软件已放好命令（p83）；避雷条目：与 EP0 门铃并存且语义不同，必须分开刻。
- DB Target 的数值语义（§4.5.1 p82）：DCI 编号——Slot Context DCI=0；**控制端点 DCI=(端点号×2)+1 → EP0 的 DCI=1**；Isoch/Interrupt/Bulk 为 (端点号×2)+方向。**DB Target=1 即 EP0**（V1 门铃分刻牌的数值依据）。
- 驱动宏：`#define DB_VALUE(ep, stream) ((((ep) + 1) & 0xff) | ((stream) << 16))`——**目标值=ep_index+1=DCI**（EP0 的 ep_index=0 → 写 1）；`#define DB_VALUE_HOST 0x00000000`——命令门铃写 0——xhci.h:313–314。
- 命令门铃写入：`xhci_ring_cmd_db` → `writel(DB_VALUE_HOST, &xhci->dba->doorbell[0])` + readl 冲刷；命令环未 RUNNING 时不写——xhci-ring.c:429–441。
- EP 门铃写入：`xhci_ring_ep_doorbell` → `writel(DB_VALUE(ep_index, stream_id), &xhci->dba->doorbell[slot_id])` + 冲刷；有停环命令在途/SET_DEQ 在途/halted 等状态时跳过——xhci-ring.c:558–582（写点 579）。
- 门铃数组映射：`xhci->dba = (void __iomem *)xhci->cap_regs + offset`——xhci.c:514；成员声明 xhci.h:1515。
- 「按门铃 = 通知 xHC 有新工作」的其他写点：Enable Slot 后（xhci.c:4246）、Address Device 后（xhci.c:4412）、Configure Endpoint/Evaluate Context 后（xhci.c:3027，函数 xhci_configure_endpoint 内 xhci_ring_cmd_db）；传输交硬件（giveback_first_trb，xhci-ring.c:3452）。

### 4.3 三环的驱动实例化

| 环 | 驱动事实 | file:line |
|---|---|---|
| 命令环（唯一） | xhci_hcd.cmd_ring 单成员 | xhci.h:1544 |
| 事件环 | 每个 interrupter 一条 `ir->event_ring`；主中断器 = interrupters[0]（xhci_irq 处理器用它） | xhci-ring.c:3104、3224 |
| EP0 传输环 | 每设备分配：`dev->eps[0].ring = xhci_ring_alloc(xhci, 2, TYPE_CTRL, 0, flags)`（2 段起步，类型 CTRL） | xhci-mem.c:1010 |
| 环初值 | `xhci_initialize_ring_info`：enqueue=dequeue=首段首 TRB；**cycle_state=1**（注释：新环全 0，生产者写 1 移交所有权，PCS=1；消费者比对 CCS——与规范 §4.9.2 口径一致，p79 脚注 10 同义） | xhci-mem.c:314–329（=327 赋值） |

### 4.4 事件环回执链（中断路径，代码级全程）

1. 硬件中断 → `xhci_irq`：读 USBSTS（xhci-ring.c:3193）；全 1 → 控制器已亡（3194–3196）；无 STS_EINT → IRQ_NONE（3199–3201，共享中断让位）；HCE/FATAL → 停机（3204–3214）；写 1 清 EINT（3221）；调 `xhci_handle_events(xhci, xhci->interrupters[0], false)`（3224）。MSI 包装 `xhci_msi_irq`（3231–3235）。
2. `xhci_handle_events`：先清 IMAN.IP（write-1-clear，xhci-ring.c:3101 → 3076–3088）；循环 `while (unhandled_event_trb(...))`（3120）；每处理半段 TRB 推进一次 ERDP（3128–3129）。
3. `unhandled_event_trb`：事件 TRB 的 **Cycle 位 == 软件侧 cycle_state（PCS）** 才算 OS 所有——xhci-ring.c:142–146。
4. `xhci_handle_event_trb` 分发（xhci-ring.c:2994 起，分发 switch 3011–3020）：**TRB_COMPLETION → handle_cmd_completion**（命令回执）；**TRB_PORT_STATUS → handle_port_status**（端口事件，def xhci-ring.c:2016）；**TRB_TRANSFER → handle_tx_event**（传输回执，def xhci-ring.c:2653）；TRB_DEV_NOTE/厂商事件。
5. 命令回执处理 `handle_cmd_completion`：`slot_id = TRB_TO_SLOT_ID(event->flags)`（1813）、GET_COMP_CODE（1832）、**校验事件指向的命令 TRB 地址 == 命令环 dequeue**（1846、1856–1859，不匹配即告警丢弃）→ 按命令类型分发（1877–1881）；Enable Slot 回执：成功则 `command->slot_id = slot_id`，否则 0——xhci-ring.c:1605–1612（**xHC 自选 Slot ID 的落点**，规范 p75）。Disable Slot 回执：成功则**软件把 DCBAA 表项清 0** 并注销设备结构——xhci-ring.c:1631–1632（=规范 §4.6.4 p97 Note 的软件义务）。
6. ERDP 推进 `xhci_update_erst_dequeue`：写段号（DESI）+ 新出队指针 + **EHB（事件处理忙）write-1-clear**——xhci-ring.c:3046–3073（注释引 §4.9.4：写 ERDP 必须推进出队指针）。
7. 命令超时兜底：`xhci_mod_cmd_timer` 按当前命令的 timeout_ms 挂定时器——xhci-ring.c:443–447（Address Device 用 XHCI_CMD_DEFAULT_TIMEOUT，xhci.c:4512）。

### 4.5 中断可选（规范 + 驱动双证据）

- 规范：§4.2 **脚注 7（p69）**："Interrupts are optional. The xHC may be managed by polling Event Rings."（避雷条目：不得把 MSI-X 画成唯一形态）。
- 驱动轮询路径双证据：
  - `xhci_run` 设 `hcd->uses_new_polling = 1`——xhci.c:637（USB 核心可走根集线器轮询而非纯中断驱动）。
  - 轮询数据源 `xhci_hub_status_data`——xhci-hub.c:1611（hcd 操作表登记 `.hub_status_data`，xhci.c:5651）；USB 核心轮询时经它读端口变化位。
  - 中断本体在 `xhci_run_finished` 使能：USBCMD.CMD_EIE（xhci.c:592–594）+ `xhci_enable_interrupter` 置 IMAN.IE（xhci.c:307–321，写点 597）+ USBCMD R/S 启动（599）+ `cmd_ring_state = CMD_RING_STATE_RUNNING`（605）。中断使能是运行路径的一部分，不是唯一形态。
- IMOD：`xhci_set_interrupter_moderation(ir, xhci->imod_interval)`——xhci.c:651。

### 4.6 DMA 可见性事实

- 上下文与环都是 DMA 内存：Input/Output Context 以 dma 地址进出命令（xhci_queue_address_device 收 `in_ctx->dma`，xhci-ring.c:4414；DCBAA 表项直接存 `dev->out_ctx->dma`，xhci-mem.c:1019）。
- TRB Data Buffer Pointer 是缓冲的 DMA 地址（规范 p73 Data Stage）；驱动传 `urb->transfer_dma`（xhci-ring.c:3880），超短缓冲才用 IDT 内联数据替代 DMA（3874–3878）。
- 门铃/ERDP/IMAN 是寄存器写（MMIO），写后 readl 冲刷保证 posted write 落地（xhci-ring.c:580–581、440、3072）。
- EP0 上下文的 TR Dequeue Pointer 存环首段 DMA 地址 | DCS——驱动 `ep0_ctx->deq = first_seg->dma | cycle_state`（xhci-mem.c:1197–1198）。

**建模提示（②）**：
- 三环 = 机柜上方三条独立环形传送带：命令环唯一（挂"命令环 · 唯一"铭牌，别画第二条）；事件环=回执传送带（卡片从 xHC 端上带、软件端下带）；EP0 传输环按槽各一条（演示只画当前槽的一条）。
- 门铃 = 两只独立旋钮并排刻在门铃排上：0 号旋钮（命令，蓝色牌 DB Target=0）与 1 号旋钮（EP0，绿色牌 DB Target=1）；按旋钮的动画时点=环上最后一卡落位之后。
- 事件环回执链 = 回执卡上带 → 中断闪线（或轮询探针两种形态都画，脚注 7 避雷）→ 软件读取 → ERDP 读指针前移（画一根沿环移动的读指针小旗）。
- DMA = 文书台表格卡与环之间的蓝色光束直写（卡片内容瞬移，不经过"人手"）。

---

## 5. ④ EP0 上下文初值与 Input Context A0/A1、Slot Context

### 5.1 §4.3.3 步序与全字段（p75–76；PDF 原编号 4.–11. 断裂，本档重编 1.–8.）

| 步 | 动作 | 字段值 |
|---|---|---|
| 1 | 分配 **Input Context**（§6.2.5），全字段清 0（p75 步 1） | — |
| 2 | 填 Input Control Context：**A0=1 且 A1=1**（Slot Context 与 EP0 Context 同时受本命令影响）（p75 步 2） | A0=A1=1（避雷条目；已核 EVIDENCE §2） |
| 3 | 填 Input Slot Context（§6.2.2）：Root Hub Port Number=拓扑定义；Route String=拓扑定义（**脚注 8**：根端口直连设备 Route String=0、Root Hub Port Number 指明具体根端口；Route String **不含**端口号）；**Context Entries=1**（p75–76 步 3） | Route String=0（直连）、RHPN=端口号、Context Entries=1（避雷条目；已核 EVIDENCE §2） |
| 4 | 分配并初始化 EP0 传输环（§4.9 环初始化要求、§6.4 TRB 格式）（p76 步 4） | — |
| 5 | 填 Input EP0 Context（§6.2.3），全值见下表（p76 步 5） | 见下 |
| 6 | 分配 **Output Device Context**（§6.2.1）并清 0（p76 步 6） | — |
| 7 | 把（Device Slot ID）表项装入 **DCBAA**（§5.4.6）——指向 Output Device Context（p76 步 7） | DCBAA[Slot ID]=指针（**软件装载**，避雷条目：xHC 只读，已核 EVIDENCE §2） |
| 8 | 发 Address Device Command，命令指向上述 Input Context（p76 步 8；命令细节 §6.4.3.4） | — |

**Input EP0 Context 全字段（p76 步 5 原值；避雷条目照录）**：

| 字段 | 初值 |
|---|---|
| EP Type | Control |
| Max Packet Size | 按端口速度的默认最大包长（见 §3.4 口径差异：规范给规则，样例 FS=8，驱动猜 64） |
| Max Burst Size | **0** |
| TR Dequeue Pointer | EP0 传输环首段起始地址 |
| Dequeue Cycle State (DCS) | **1**（对软件写入的有效 TRB 的 Cycle 位状态） |
| Interval | **0** |
| Max Primary Streams (MaxPStreams) | **0** |
| Mult | **0** |
| Error Count (CErr) | **3** |

### 5.2 Input Slot Context 的规范级约束补充（§4.5.2 p83–84）

- Address Device 时 Input Slot Context 允许非 0 的字段白名单：Route String、Root Hub Port Number、Context Entries='1'（只使能 EP0）、Interrupter Target、Speed（由所挂下行端口定义）；LS/FS 经高速 hub 时加 MTT/Parent Port Number/Parent Hub Slot ID（p83）。其余字段（含 Reserved）清 0（p83 首句）。
- **Route String 与 Root Hub Port Number 由该槽的第一条 Address Device Command 初始化，此后任何命令不得修改**；Interrupter Target 可被 Address Device 或 Evaluate Context 修改（p84 Note）。
- Evaluate Context 白名单：Max Exit Latency、Interrupter Target（p84）。
- Configure Endpoint 白名单：Context Entries=最大 DCI+1；hub 设备加 Hub/Number of Ports/TTT/MTT（p84）。
- 槽态相关：软件分配 Output Slot Context 时把 Slot State 置 Disabled('0')，**此后只有 xHC 更新该字段**（p85 Note）；Slot State 编码见 §6.2。

### 5.3 驱动证据（本轮行号）

| 驱动事实 | file:line |
|---|---|
| EP0 传输环与 DCBAA 装载在分配设备结构时完成（函数尾注释 "Steps 7 and 8 were done in xhci_alloc_virt_device()"，指规范数据结构准备） | xhci-mem.c:1204、969–1039 |
| out_ctx/in_ctx 分配 | xhci-mem.c:988/995 |
| EP0 环分配（2 段 TYPE_CTRL） | xhci-mem.c:1010 |
| **DCBAA 表项=软件写 out_ctx->dma**（=p76 步 7 软件装载） | xhci-mem.c:1019 |
| Slot Context 填充：`dev_info \|= LAST_CTX(1) \| udev->route`（Context Entries=1 + Route String） | xhci-mem.c:1111 |
| 速度→SLOT_SPEED 编码 + MPS 初猜（SSP/SS=512、HS=64、FS=64、LS=8） | xhci-mem.c:1112–1137 |
| Root Hub Port Number = `ROOT_HUB_PORT(hw_portnum + 1)`（寄存器端口号转 1 基） | xhci-mem.c:1145 |
| LS/FS-under-HS-hub：tt_info=父槽 ID|端口<<8、MTT 位 | xhci-mem.c:1180–1185 |
| EP0 Context：`EP_TYPE(CTRL_EP)`；`MAX_BURST(0) \| ERROR_COUNT(3) \| max_packets`；`deq = first_seg->dma \| cycle_state`（DCS=1）；`EP_AVG_TRB_LENGTH(8)` | xhci-mem.c:1191–1200 |
| A0/A1 置位：`ctrl_ctx->add_flags = SLOT_FLAG \| EP0_FLAG`；drop_flags=0（=规范 A0=A1=1、其余 0） | xhci.c:4396–4397 |
| 二次 Address Device（BSR=0 补编址）时不再重填槽上下文，只把 EP0 出队指针抄进输入上下文（`xhci_copy_ep0_dequeue_into_input_ctx`，deq=enqueue dma\|cycle） | xhci.c:4391–4395 → xhci-mem.c:1041–1061 |
| 编址成功后软件读输出上下文取设备地址：`udev->devaddr = out slot_ctx->dev_state & DEV_ADDR_MASK` | xhci.c:4489–4490 |

### 5.4 Device Context 结构与 DCI（支撑事实，§4.5 p81–83）

- Device Slot 三组件 = DCBAA 表项 + Device Context + 门铃寄存器（p81）；xHCI 支持最多 255 设备（p81；脚注 11：设备数 <256 因部分上下文槽留作特殊用途）。
- Device Context = 1 Slot Context + 31 Endpoint Context 的数组（Figure 4-1，p82）；分配时全 0（p82）；**Endpoint Context 0 恒为 Default Control Endpoint**（p82）。
- DCI 编号规则见 §4.2（p82–83）；EP0→DCI 1。

**建模提示（④）**：Input Context 画成一张 A0/A1 打勾的两页表格卡（第一页 Slot 卡、第二页 EP0 卡）；DCBAA 画成机柜里的格架（每格一指针，1 号格由软件手工放入 Output 卡——牌写"软件装载"）；EP0 卡九个字段做成九格可点亮的小格（CErr=3、DCS=1、Max Burst=0…逐格填入动画）。Route String=0 与 RHPN=端口号做成卡面两格，配小字"Route String 不含端口号"。

---

## 6. ⑥ BSR=0/1 分支语义

### 6.1 规范分支（§4.3.4 p76–77 + §4.6.5 p97–98）

| | BSR=0（主线） | BSR=1（legacy 分支） |
|---|---|---|
| 语义 | xHC 选 USB 设备地址并**代发 SET_ADDRESS**（p98 Note） | 使能 EP0 但**阻止 xHC 发 SET_ADDRESS**（p77；避雷条目） |
| SET_ADDRESS 参数 | USB2 设备发往地址 0；USB3 设备用 Route String（p97） | 不发 |
| 槽态迁移（成功） | **Enabled→Addressed**（p77；§4.5.3.3 p87） | **Enabled→Default**（p77；§4.5.3.3 p87） |
| 成功后 | EP0 加入 xHC 调度列表、EP0 门铃使能、可上 TRB（p97）；GET_DESCRIPTOR 等即可发起（p98） | 可先在 Default 态与设备通信（读描述符），之后再发一条 **BSR=0** 的 Address Device 完成编址（p76–77 Note 流程） |
| 通用（两分支同） | 使能 Default Control Endpoint、成功后槽可收后续命令；A0=A1=1、其余 Add/Drop 位=0；其余 EP 上下文被忽略（p98） | 同左 |
| 失败语义 | SET_ADDRESS 出错 → USB Transaction Error，**槽不迁 Addressed**（p97）；一般规则：命令不成功不迁槽态（p85 Note） | 同左 |

- 补充红线（p98 Note）：xHC 在 EP0 传输环上检出 SET_ADDRESS 请求 → 对该 TD 生成 **TRB Error**，且**永不转发** SET_ADDRESS 到设备——软件侧 SET_ADDRESS 票据在 xHCI 上不是合法路径。
- Driver 侧槽态初值注：Output Slot State 由软件初始化为 0，xHC 接管更新（p85 Note）。
- 已核（EVIDENCE §2「Address Device 带 BSR=0，成功槽 Enabled→Addressed」「BSR=1 legacy：EP0 启用、禁止 SET_ADDRESS、槽 Enabled→Default；通信完成后再 BSR=0 编址」）。

### 6.2 槽状态表（§4.5.3 Table 4-1，p85–86 逐行；Figure 4-2 p85）

| 槽态 | USB 设备态 | Default Control EP | 其他 EP | USB 设备地址 | DCBAA 指针 | Slot State 字段值 |
|---|---|---|---|---|---|---|
| Disabled | N/A | Disabled | Disabled | N/A | Not valid | Disabled |
| Enabled | Default | Disabled | Disabled | 0 | Not valid | Disabled（'0'，与 Disabled 复用） |
| Default | Default | Not Disabled | Disabled | 0 | Valid | Default |
| Addressed | Address | Not Disabled | Disabled | Assigned | Valid | Addressed |
| Configured | Configured | Not Disabled | Any（脚注 13：由 Configure Endpoint 决定） | Assigned | Valid | Configured |

关键注记（p85–87）：
- **Enabled 是逻辑态，编码与 Disabled 复用 '0'**——软件把 Device Context 清 0（=Disabled），Address Device 命令同时把槽推向 Default/Addressed，所以不存在字段上的独立 Enabled 值（p87）。DCBAA 指针是否有效是区分两态的可用线索（Table 4-1 行）。
- Enabled 态下**门铃未使能**、DCBAA 指针无效，只允许 Address Device 与 Disable Slot 两条命令（p86）；Disabled 态下门铃寄存器禁用、DCBAA 指针无效，只允许 Enable Slot，且**不得写 Disabled 槽的门铃**、**Disabled 槽不产生事件**（p86）。
- **软件不得同时把两个以上（含两个）设备槽迁向 Default**（p85 Note "shall not transition more than one Device Slot to the Default State at a time"；精确语义=同一时刻至多一个）。
- Disable Slot 成功 → 槽回 Disabled、资源释放（§4.6.4 p96–97）；回执后**软件清 DCBAA 表项**（p97 Note；驱动 xhci-ring.c:1631）。
- 不成功命令不迁槽态（p85 Note）。

### 6.3 驱动证据：双入口 + usb core 两步流（本轮行号）

| 驱动事实 | file:line |
|---|---|
| `xhci_address_device` → `xhci_setup_device(SETUP_CONTEXT_ADDRESS)`（=BSR=0 主线入口） | xhci.c:4504–4508 |
| `xhci_enable_device` → `xhci_setup_device(SETUP_CONTEXT_ONLY)`（=BSR=1 上下文刷新入口） | xhci.c:4510–4515 |
| BSR 位进命令 TRB：`TRB_TYPE(TRB_ADDR_DEV) \| SLOT_ID_FOR_TRB(slot_id) \| (setup == SETUP_CONTEXT_ONLY ? TRB_BSR : 0)`；`TRB_BSR = BIT(9)`；Slot ID 在 field[3] 高 8 位 | xhci-ring.c:4411–4418；xhci.h:974、821 |
| SETUP_CONTEXT_ONLY 幂等守卫：输出槽态已是 DEFAULT 则直接返回 | xhci.c:4361–4367 |
| Enable Slot 流程：queue TRB_ENABLE_SLOT → 命令门铃 → 等完成 → 取回执 slot_id → 分配数据结构 → udev->slot_id | xhci.c:4239–4287 |
| **usb core 两步流（新枚举方案）**：hub_port_init 先 `hub_enable_device`（→BSR=1）**再** `get_bMaxPacketSize0`（8 字节 GET_DESCRIPTOR）；后 `hub_set_address` → **xHCI 走 `hcd->driver->address_device`（BSR=0），不发软件 SET_ADDRESS 控制请求**（对照 p98 Note 红线：软件 SET_ADDRESS 上 EP0 环=TRB Error） | drivers/usb/core/hub.c:5056–5065、4765–4800（4785–4786 分支） |
| hub_enable_device 守卫：设备态须为 USB_STATE_DEFAULT 才调 enable_device | drivers/usb/core/hub.c:4827–4839 |
| **Linux xHCI 枚举主线 = 规范 BSR=1 legacy 两步流的常态化**：Enable Slot → BSR=1（使能 EP0，槽 Default）→ 读 8 字节 → BSR=0（xHC 代发 SET_ADDRESS，槽 Addressed） | 综合以上 |
| **驱动枚举路径不重写 EP0 ctx MPS**：ep0_ctx->ep_info2 仅在 xhci_setup_addressable_virt_dev 一处写入（xhci-mem.c:1191–1194）；Evaluate Context 命令仅经 xhci_configure_endpoint(ctx_change=true) 发出（xhci.c:3016–3018 → xhci-ring.c:4458），枚举链路不在其中（MEL/带宽等场景用） | 见左 |

**建模提示（⑥）**：BSR 分支画成编址闸口上的一只两位旋钮：0 位=直通道（xHC 代发 SET_ADDRESS 小卡东行、设备铭牌换地址、槽卡翻成 Addressed）；1 位=旁路道（不发 SET_ADDRESS 小卡、槽卡停在 Default、但 EP0 灯亮着可先通信）。配套槽态灯排（Disabled/Enabled/Default/Addressed/Configured 五灯）挂机柜正面，每命令成功点亮/切换一灯；Enabled 灯与 Disabled 灯可画成同一盏双色灯（编码复用 '0'，p87）——牌上注明"读 DCBAA 指针是否有效分辨"。

---

## 7. ⑦ 易错点清单

### 7.1 DESIGN §2 避雷清单收编对照（§4.1–4.3 域全条）

| 避雷条目（DESIGN §2） | 本文档锚点 |
|---|---|
| 全规范只有一条命令环 | §4.1（p68 原句 + xhci.h:1544） |
| 命令门铃=门铃 0/DB Target=0，与 EP0 门铃 DB Target=1 分刻 | §4.2（p83 + xhci-ring.c:438 + xhci.h:313–314） |
| 命令回执=Command Completion Event 走事件环 | §4.1（p60）+ §4.4 分发链（xhci-ring.c:3011–3020） |
| §4.2 CNR=1 期间禁写 Operational/Runtime 寄存器（等 CNR=0） | 属 §4.2 域，本档不展开；S2 引用时按 DESIGN §2 原文 |
| §4.2 Note 顺序自由、R/S=1 前全部完成 | 同上（§4.2 域） |
| §4.2 脚注 7 中断可选、可轮询事件环 | §4.5（p69 脚注 + xhci.c:637 + xhci-hub.c:1611） |
| §4.2 收尾 R/S=1 后才接受门铃 | 同 CNR 条（§4.2 域）；驱动侧命令门铃 RUNNING 门 xhci-ring.c:431–432 |
| USB2 必须端口复位到 Enabled；SS 自动 Enabled；两族不同路径 | §2.1–2.2 |
| USB2/USB3 Disabled 态双义 | §2.1（p71 Note） |
| USB2 复位四信号 PRC=1/PED=1/PR=0/PLS=U0 + Port Speed | §2.2（p72 + xhci-hub.c:1148–1167） |
| BSR=1 是 legacy 分支；BSR=0→Addressed；BSR=1→Default；不得混写 | §6.1–6.2 |
| 8 字节描述符仅 FS 必走（LS/HS/SS=8/64/512 跳过）；读前 8 字节取 bMaxPacketSize0 | §3.1–3.2 |
| Configured 需双操作同成（Configure Endpoint + SET_CONFIGURATION） | §1 步 10（p74/p77–78） |
| GET_DESCRIPTOR 三 TRB 字段组逐值 | §3.2（p73 全表） |
| EP0 上下文初值九字段 | §5.1（p76 全表） |
| Input Context A0=A1=1；Slot Context 三字段；Route String=0 直连且不含端口号 | §5.1（p75 步 2–3 + 脚注 8） |
| DCBAA 表项软件装载（xHC 只读） | §5.1 步 7 + §5.3（xhci-mem.c:1019） |
| 规范伪编号不得照抄（§4.3.3 从 4. 起、§4.3.6 从 12. 起） | §1.1 表头注 + §5.1 注 |
| PSCEG 0→1 跳变才产生事件 | §2.3（p71 + p292） |

### 7.2 新发现的坑（本轮现场核，S2–S7 必读）

1. **旧提取目录页标过期**：`notes/.xhci-extract/pNNN.txt`（2026-10-03 生成）的 PAGE 标号与现行 PDF 偏移 +12（其 p083=现行 p71）。任何引用该目录页码的旧材料**不可**直接沿用；现行通道=重跑 `scripts/xhci_spec_extract.py`（本文档全部页码出自现行提取）。
2. **驱动函数改名**：任务素材里提到的 `xhci_setup_addressable_val_dev` 在现行内核（7.3.0-rc7）不存在，现名 **`xhci_setup_addressable_virt_dev`**（xhci-mem.c:1093）。旧内核资料检索时注意换名。
3. **FS MPS 三口径**：规范只给规则（读 bMaxPacketSize0，p72/p98）；V1 演示样例取 8（样例设备值）；驱动初猜 64（xhci-mem.c:1125–1128）。三者并存，S2 文案不得互相冒充。
4. **驱动枚举不走 Evaluate Context 更新 MPS**：规范步 7.x（p74）建议 Evaluate Context（A1=1）；Linux 驱动实为 BSR=1 → 读 8 字节 → BSR=0 两步流，EP0 MPS 一次性按速度猜值写入（§6.3）。演示若画"Evaluate Context 更新 MPS"帧，须标注"规范建议路径"，与"Linux 驱动实路径"分开表述。
5. **软件 SET_ADDRESS 在 xHCI 上是非法路径**（p98 Note：TRB Error、永不转发）；驱动相应地用 `hcd->driver->address_device` 特判替代 usb_control_msg SET_ADDRESS（hub.c:4785–4786 分支）。任何"驱动向设备发 SET_ADDRESS 请求"的说法都是错的——是 xHC 代发。
6. **Enabled 槽态无独立编码**：Slot State 字段 '0' 同时是 Disabled 与 Enabled（p87），分画时靠 DCBAA 指针有效性/门铃是否可用区分，别画成五个互斥数值。
7. **命令在环上按序执行**（p60）：xHC 按入环顺序执行命令；驱动一次只挂一条命令等回执（wait_for_completion，xhci.c:4416；命令单发串行是驱动形态，不是规范强制）。S2 别把"驱动串行等回执"画成规范要求。
8. **读 PORTSC 看到变化位 ≠ 事件已入环**（§4.19.2 p292 同步性警告）——时间轴动画别把"置位"与"事件卡上带"画成同一瞬间。
9. **事件卡与传输卡无序**（p292 Note）：拔出情形下端口事件可与传输回执乱序入环。
10. **Disabled 槽不产生事件、不可按门铃**（p86）：试错路径"抢发命令"演示要选 Enabled 之前的合法窗口（如空输入上下文），别演示成"对 Disabled 槽按门铃"。
    - 空输入上下文抢发 Address Device 的正确演示口径：命令完成事件 Completion Code=Parameter Error、输出上下文不变（规范 p100 "Completion Code set to Parameter Error" 段；已核 EVIDENCE §2）。
11. **门铃目标值=DCI 而非 ep_index**：驱动宏 `DB_VALUE(ep,...)=(ep+1)`（xhci.h:313）；EP0 门铃写 1 的代码根源在此。S2 标牌写"DB Target=1（EP0，DCI=1）"最准确。
12. **Address Device 命令 TRB 的 Slot ID 在 field[3] 高 8 位、BSR 在 field[3] bit 9**（xhci.h:821 SLOT_ID_FOR_TRB<<24、xhci.h:974 TRB_BSR=BIT(9)）——画命令 TRB 卡面时两个值同在第四字（word3），别分开画。

---

## 8. ⑧ S2 设计师消费指引（建模提示汇总）

### 8.1 分章建模提示索引

| 章 | 核心画面隐喻（已追认词） | 关键分镜锚 |
|---|---|---|
| ①（§1） | 设备登记流水线时间轴；软件动笔/xHC 动环/设备动灯三动线 | 十二步各自的可视化产物（事件卡/槽卡/表格卡/命令单/门铃旋钮/铭牌翻面） |
| ②（§2） | 两族端口小台（USB2 带复位按钮、USB3 自动档）；PSCEG 事件扳机拉线 | 四信号读数屏（PRC/PED/PR/PLS）；PLS=7 中间态；复位期间不造数（显"复位"文字） |
| ③（§3） | 三张依次进站的票据卡沿 EP0 传送带；FS 支线闸口（8/64/512 绕行牌） | 三卡字段印面；门铃第二旋钮；8 字节回包西行 |
| ④（§4） | 三环传送带+两只门铃旋钮+DMA 光束+中断闪线/轮询探针双形态 | 命令环唯一铭牌；回执传送带；ERDP 读指针小旗 |
| ⑤（§5） | Input Context 两页表格卡；DCBAA 格架（软件装载牌）；EP0 九格字段卡 | A0/A1 打勾动画；逐格填值动画 |
| ⑥（§6） | BSR 两位旋钮闸口；五灯槽态灯排（Enabled/Disabled 双色灯） | 两分支结局卡；试错卡（空输入上下文→Parameter Error 红牌） |

### 8.2 全景完整性建议（供 F0 总览机位）

- 必入画元素清单（§1–§6 全部实体）：根集线器端口台 ×2 族、机柜（三环传送带+门铃排+槽态灯排+DCBAA 格架）、文书台（Input/Output 表格卡、事件匣）、设备试验盒（铭牌+四态灯+EP0 小窗）、USB 缆（方波信号段）。
- 数字口径统一表（场景内一切读数屏用）：CCS/CSC（0/1）、PED（0/1）、PR（0/1）、PLS（Polling='7'、U0='0'、RxDetect='5'，复位中不显示数值）、DB Target（0/1）、槽态（Disabled/Enabled/Default/Addressed/Configured 五态英文+中文注）、地址（示例值 1，xHC 自选牌）、MPS（样例 FS=8）。
- 帧序骨架（十二步→演示帧）建议沿用 V1/V2 的 F0–F11 帧距（S1 不定帧，仅提供步→素材映射：步 1–3→F1–F3、步 4→F4、步 5→F5、步 6→F6、步 7→F7–F8、步 10→F10、完工→F11）。

### 8.3 交互与试错路径素材（来自 §7）

- 试错主卡：空输入上下文抢发 Address Device → Parameter Error 红牌、输出上下文卡不动（§7.2 条 10）。
- 分支预设：usb3（自动 Enabled，无复位帧）、bsr1（BSR=1 旁路道）、hs（跳过 8 字节读取）——三预设的规范依据在 §2.1、§6.1、§3.1。
- 动手台字段组素材：GET_DESCRIPTOR 六步组包（80h/6/0100h/8）+ 三 TRB 字段确认 + 门铃选择（1 号旋钮）——判据全部在 §3.2 表。

---

## 附录 A：EVIDENCE 基线逐条收录对照

> 「已核（EVIDENCE …）」= 该值以 V1/V2 EVIDENCE 已核断言为基线，且本文档对应章节已给出规范页码/驱动行号的现场核依据。V1 §2 内容断言表逐行收录；V2 §7 的数值行与 V1 同值（V2 §7.2 门 5 PAGECHECK-PASS 21/21），不另立重复表。

| EVIDENCE §2 断言（V1） | 本文档收录位置 | 状态 |
|---|---|---|
| 插入由 xHC 检出：CCS 与 CSC 同时置 1 | §1.1 步 1（p71） | 已核（EVIDENCE §2） |
| USB2 attach 后 PLS='7'（Polling） | §2.1 表（p72 步 3b） | 已核（EVIDENCE §2） |
| USB2 复位完成四信号 PRC=1·PED=1·PR=0·PLS=U0 | §2.2（p72 原句） | 已核（EVIDENCE §2） |
| 复位后 PORTSC Port Speed 指示设备速度=FS（样例） | §2.2 Note（p75）+ §3.4 口径 | 已核（EVIDENCE §2） |
| PLS 复位期间显示文字非数值（规范未给） | §2.2 + §7.2 条 3 口径 | 已核（EVIDENCE §2） |
| Enable Slot 回执 Slot ID=1（示例，xHC 自选） | §1.1 步 4 + §4.4 条 5（p75；xhci-ring.c:1605–1612） | 已核（EVIDENCE §2） |
| DCBAA 1 号格软件装载、xHC 只读 | §5.1 步 7 + §5.3（xhci-mem.c:1019） | 已核（EVIDENCE §2） |
| 输入上下文 A0=1 且 A1=1 | §5.1 步 2 + §5.3（xhci.c:4396） | 已核（EVIDENCE §2） |
| Slot Context：端口=1·Route String=0·Context Entries=1 | §5.1 步 3（p75–76 + 脚注 8；xhci-mem.c:1111/1145） | 已核（EVIDENCE §2） |
| EP0 Context 九字段全值 | §5.1 表（p76；xhci-mem.c:1191–1200） | 已核（EVIDENCE §2） |
| Address Device BSR=0 成功槽 Enabled→Addressed | §6.1 表（p77） | 已核（EVIDENCE §2） |
| 编址后设备 Default→Address | §1.1 步 6 + §6.1（p97）+ 设备态映射 Table 4-1（p85） | 已核（EVIDENCE §2） |
| 8 字节读取仅 FS 必走；LS/HS/SS 8/64/512 可跳过 | §3.1（p72） | 已核（EVIDENCE §2） |
| GET_DESCRIPTOR 三 TRB 字段组逐值 | §3.2 表（p73 全值） | 已核（EVIDENCE §2） |
| Evaluate Context（A1=1）更新 EP0 MPS 生效 | §3.2 收尾（p74 步 x）+ §7.2 条 4 驱动差异注 | 已核（EVIDENCE §2） |
| 双操作同成：Configure Endpoint 且 SET_CONFIGURATION | §1.1 步 10（p74/p78） | 已核（EVIDENCE §2） |
| hub/TT 逐层初始化 | §1.1 步 12 Note（p74） | 已核（EVIDENCE §2） |
| USB3 attach 自动 Enabled（PED=1·PR=0·PLS=0）、无复位帧；两族 Disabled 分述 | §2.1 表 + p71 Note | 已核（EVIDENCE §2） |
| BSR=1 legacy 全链 | §6.1 表（p76–77） | 已核（EVIDENCE §2） |
| 试错：空输入上下文 → Parameter Error、输出上下文不变 | §7.2 条 10（p100 段） | 已核（EVIDENCE §2） |
| PSCEG 0→1 跳变才产生事件 | §2.3（p71 + p292） | 已核（EVIDENCE §2） |
| 命令门铃 0 与 EP0 门铃 1 分刻 | §4.2（p83 + xhci.h:313–314） | 已核（EVIDENCE §2） |
| Slot ID=1 与新地址 1 为示例值（xHC 自选） | §1.1 步 4 + §6.1（p75/p97） | 已核（EVIDENCE §2） |
| 设备铭牌「只见 USB 请求与总线事件——槽/环/上下文对设备不可见」 | 场景约定（非规范事实）；规范侧佐证=§4.5 结构对软件可见性（p81–83） | 已核（EVIDENCE §2，场景牌文案沿用） |
| 状态窗 USBC R/S=1/MaxSlotsEn/DCBAAP 不写数值（§4.2 域不越界） | 场景约定；本档 §1.0 前置仅涉 §4.3 端口初态 | 已核（EVIDENCE §2，口径沿用） |

## 附录 B：DESIGN §3.1 术语与 §3.2 隐喻词使用登记

- 本文档术语全部按 DESIGN §3.1 首用立法（§0 末段）；新增首用：PSCEG=端口状态变化事件生成信号（内部变量）、DCI=设备上下文索引、DCS=出队循环态、PCS=生产者循环态、EHB=事件处理忙、ERDP=事件环出队指针、ERST=事件环段表（§3.1 表内已有）。
- 建模提示用词全部取自 §3.2 名单与 V2 追认六词（状态窗/读数屏/收件屏/传送带/格架/事件匣）；未发明新隐喻词。
- 本文档语言门自查结果见 S1-输出.md §4（扫描词表=scripts/scan_words.py RETIRED_WORDS，豁免集={回执}）。
