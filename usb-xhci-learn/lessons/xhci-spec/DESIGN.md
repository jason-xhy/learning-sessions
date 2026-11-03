# DESIGN.md —— 「xHCI 规范对照学习」板块契约

本文件是本板块所有制作人的唯一合同。判据与契约冲突时，以判据（规范/源码）为准，
并回写「契约修订」节。

交付根目录：`/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/`

```
xhci-spec/
  DESIGN.md                     ← 本契约
  index.html                    ← 板块首页：规范章节目录镜像（主会话负责）
  shared/zoomfs.mjs             ← 缩放+全屏单源（拷贝自 xhc-machines，见 §8 修订节锚）
  ch4/
    4.1-command-operation/      ← build.mjs + index.html（主会话自建）
    4.2-host-controller-init/   ← 子代理A：anatomy Figure + 整页
    4.3-usb-device-init/        ← 子代理B：anatomy Hero + 整页
```

## 0. 任务与裁定（2026-11-03 用户六条要求 + 三项裁定）

要求：① 流程类内容必须提供流程图 **和** 动画；② 章节结构与规范一致；③ 流程图与动画
必须带 xHCI 驱动 / xHC 控制器 / 设备 三方视角；④ 参考历史任务（xhc-machines）——
可全屏、字体不能太小；⑤ 动画优先用 anatomy；⑥ 无自造词、语言去 AI 化。

裁定：本次交付 = 板块骨架 + 立标三节（4.1/4.2/4.3）；对照维度 = 规范原文 ↔ 中文白话
解读 ↔ 三方视角（内核代码只在关键分歧点出现，复引既有课锚点，不新锚行号）；
动画分级 = 核心流程 anatomy 机器 + 次要流程三方泳道步进动画 + 表格节不做动画。

## 1. 全局铁律（每个制作人受约束）

1. **判据优先级**：xHCI 1.2b 规范原文 > 内核源码（/Volumes/KernelSrc/linux）> 本契约。
   画面与正文出现的每个位值/字段名/章节号/页码，必须现场核对并记入 EVIDENCE.md。
   **禁止凭记忆写任何位号、字段值、章节号、页码。**
2. **规范文本**：`/tmp/spec-audit-txt/xhci-1.2b.txt`（带 `===== [PAGE n] =====` 页标；
   本文档的印刷页码 = PDF 页码，已实测一致。若丢失用 PyMuPDF 从
   `specs/625472_xHCI_Rev1_2b.pdf` 重提取，`python3 -I`）。检索用短关键词多 `-e`；
   负向结论前先 `grep -c` 证明（PDF 提取有断行与重复引用串伪影）。
3. **页码机核**：页面引用的每处 §+页码，交付前用 pypdf needle 复核：
   `from pypdf import PdfReader; r=PdfReader("specs/625472_xHCI_Rev1_2b.pdf");`
   `t=r.pages[<p>-1].extract_text() or ""; print(<needle> in t)`——needle 用节号原文
   （如 `"4.3.4"`）或标题短词。表可跨页，引起始页。
4. **规范原文引用**：对照块引英文原文短句（≤3 行），逐字取自提取文本并人工剔除
   PDF 伪影（重复的 `Section x.x ...` 引用串、断行连字）；每条尾注 `(xHCI 1.2b §x pNN)`。
   禁止改写后当"原文"引用；转述内容放解读侧，不进引号。
5. **语言（要求⑥，零容忍）**：全部中文标签与行文。机制优先、字面直说。
   - 术语走 `notes/r4-glossary-base.md`（93 条冻结）+ 本契约 §3 增补表；位域名/寄存器名/
     命令名/TRB 名保留英文官方名（Cycle bit、IOC、MaxSlotsEn、Enable Slot…）。
   - 机器隐喻词只许用 §3.2 给定清单，不得另造。
   - 行文禁 AI 腔：不写"让我们/值得注意的是/综上所述/我们不难发现"；不称呼读者
     "大家/朋友们"；不用空洞总结句；图注 = 一句机制事实。
   - 交付门：`python3 scripts/scan_words.py retired <页.html>`（study 仓根运行）
     输出 total=0（新页无存量豁免）。**豁免词表（2026-11-03 立法，首跑实测定）**：
     机制课（0001–0010）退役的词族里有三类在本板块是合法用法，语言门判据=
     「残留 family ⊆ 豁免表」而非 total=0：
     ① `回执`——DESIGN §3.2 给定机器隐喻词（fig3 回执登记机沿用，xhc-machines 已过
     用户验收的板块词表）；
     ② `柜台/传输剧/提单` 等——仅限互链课件与机器的专名照抄（fig4「订单柜台」、
     0009「传输剧」、0006「提单全解」——链接文字=对象本名，非本板块行文用词）；
     ③ `泳道`——流程图/时序图的图表术语字面用法（机制课退役的是"环视角"隐喻用法，
     本板块是 swimlane 图的本名，区分线=有无字面锚）。
     其余任何 family 命中=FAIL。
6. **anatomy 工艺**：按 anatomy SKILL.md 全流程——先概念与零件清单后几何；
   `node build.mjs --audit` 到 `audit passed`；`~/.zcode/skills/anatomy/scripts/lines.mjs`
   到 `line ends: 0`；双主题 dark+light 都构建；390px 宽可读；读数与模型同源为真。
   kit 用绝对 file:// 导入（照抄 `lessons/xhc-machines/fig2-transfer-ring/build.mjs`
   头部 import 段）。
7. **三方视角（要求③）**：每张流程图/动画固定三泳道/三工位：
   **xHCI 驱动 | xHC 控制器 | 设备**。规范称软件侧为 system software——泳道标签统一写
   「xHCI 驱动」，页内首用处加注「规范原文称 system software（系统软件）」。
   流程不涉设备时（如 §4.2 初始化），设备泳道保留但整体注记
   「本流程不参与——<一句原因>」，**不得删泳道，不得硬凑戏份**。
8. **可读性（要求④）**：页宽统一 1500（kit `pageHtml width:1500`）；正文 ≥16px；
   页面静态图（泳道流程图）框内文字在 1× 下 ≥14px；机内刻字对齐 fig3 修订后台阶
   （≥11px 等效）；zoomfs 三件套（zoomBarHtml/zoomFsCss/zoomFsScript）全接，
   `focus` 选择器在 EVIDENCE.md 登记。
9. **自包含**：零外部 script/link（http URL 只许 SVG xmlns）；构建期内联一切。
10. **一个画面一个断言**：画面每个数字/位值/箭头都要能回溯 EVIDENCE.md；无语义纯装饰
    允许，但不得写数。
11. **禁读旧课件正文**：`lessons/00*.html` 不读（避免旧表述串味）。可读：
    `lessons/xhc-machines/`（工艺参照+互链对象）、`lessons/spec-audit-*.md`、
    `specs/actionflow-*.md`。
12. **越界禁令**：子代理不 commit、不 push、不动 learning 仓、不动 index.html、
    不动其它节目录。日志与判据写自己目录内 EVIDENCE.md。

## 2. 避雷清单（§4.1–4.3 域，画面与正文严禁复现）

- §4.1：**全规范只有一条命令环**（"There is only one Command Ring"）——不得画多条。
- 命令门铃 = **门铃寄存器 0，DB Target = 0（Host Controller Command）**；它与
  「EP0 门铃 DB Target=1」并存且语义不同，两者同框时必须分开刻（Table 5-43 前例，
  xhc-machines fig4 已核）。
- 命令回执 = **Command Completion Event TRB，走事件环**——不回命令环。
- §4.2：**CNR=1 期间禁止写任何 Operational/Runtime 寄存器**（等 USBSTS.CNR=0 才动手）。
- §4.2 Note：**后续各步顺序自由，但全部完成必须在 USBCMD R/S=1 之前**——不得把
  某种特定顺序画成规范强制。
- §4.2 脚注 7：**中断可选，xHC 可轮询事件环运行**——不得把 MSI-X 画成唯一形态。
- §4.2 收尾：**R/S=1 后 xHC 才开始接受门铃**；端口从这时起上报连接。
- USB2（LS/FS/HS）端口到 Enabled **必须走端口复位**；SS 端口 attach 成功**自动**到
  Enabled——两个协议族不得画成同一自动路径。
- §4.3：USB2 与 USB3 的 **Disabled 态含义不同**（USB3=DSPORT.Disabled，USB2=USB2 规范
  Disabled 态），涉及时分开表述。
- USB2 复位完成判据组合：**PRC=1、PED=1、PR=0、PLS=U0(‘0’)**，复位后 PORTSC
  Port Speed 指示设备速度——四个信号一个不能少画。
- Address Device 的 **BSR=1 是 legacy 设备分支**（先在 Default 态通信、禁止 xHC 发
  SET_ADDRESS）；主线是 BSR=0。BSR=0 成功 → 槽 Enabled→Addressed；BSR=1 成功 →
  槽 Enabled→Default。不得混写。
- 8 字节描述符读取是**仅 FS 设备**步骤（LS=8/HS=64/SS=512 可跳过）；读的是
  Device Descriptor **前 8 字节**取 bMaxPacketSize0。
- 到 Configured 需要**双操作同成**：Configure Endpoint Command 成功 **且**
  SET_CONFIGURATION 请求成功——缺一不可，不得画成单操作升级。
- GET_DESCRIPTOR(Device, 前 8B) 字段组（p73 现场值）：Setup Stage TRB
  TRT=IN Data Stage(**3**)、Length=8、IDT=1、IOC=0、bmRequestType=**80h**、
  bRequest=**6**、wValue=**0100h**、wIndex=0、wLength=8；Data Stage TRB DIR=**1**、
  Length=8、CH=0、IOC=0、IDT=0；Status Stage TRB DIR=**0**、Length=0、CH=0、
  IOC=**1**、IDT=0、Buffer=0。控制读 Status 段方向=OUT（DIR=0）。
- EP0 上下文初值（§4.3.3 p76 现场值）：EP Type=Control、Max Packet Size=按端口速度
  的默认值（FS=8）、Max Burst=0、TR Dequeue Ptr=EP0 环首段、DCS=1、Interval=0、
  MaxPStreams=0、Mult=0、CErr=3。
- Input Context 置位：**A0=1 且 A1=1**（Slot Context 与 EP0 Context 同时受影响）；
  Slot Context：Root Hub Port Number=端口号、Route String=**0**（根端口直连；不含
  端口号）、Context Entries=**1**。
- DCBAA 表项由**软件**装载（xHC 只读）——xhc-machines fig4 契约修订已核，勿画反。
- 规范 PDF 的步骤编号有伪影（§4.3.3 内部从"4."起编号、§4.3.6 从"12."起）——课件
  一律用自己的规范化步骤号并引页码，**不得照抄规范断裂编号**。
- PSCEG（Port Status Change Event Generation）**0→1 跳变**才产生端口状态变化事件，
  不是"状态位=1 就有事件"。

## 3. 术语与词汇表

### 3.1 规范术语中文对照（首用立法，行文沿用）

| 规范词 | 本板块用法 |
|---|---|
| system software | 泳道/工位标签写「xHCI 驱动」，首用注规范原称 |
| Device Slot | 设备槽 |
| Input/Output Device Context | 输入/输出设备上下文 |
| Device Context Base Address Array (DCBAA) | 设备上下文基地址数组（DCBAA） |
| Event Ring Segment Table (ERST) | 事件环段表（ERST） |
| Root Hub | 根集线器 |
| Port Status Change Event | 端口状态变化事件 |
| Default / Addressed / Configured（设备态） | 保留英文，首用注「默认态/已编址/已配置」 |
| Enabled / Default / Addressed / Configured（槽态） | 保留英文，首用注中文 |
| Command Completion Event | 命令完成事件 |
| Transfer Event | 传输事件 |
| doorbell | 门铃 |
| port reset | 端口复位 |

命令名（Enable Slot / Disable Slot / Address Device / Configure Endpoint /
Evaluate Context / No Op…）保留英文原名。TRB=传输请求块（既有立法）。

### 3.2 机器隐喻词（只许用下列，含 xhc-machines 既有词）

工位 / 文书台 / 主控台 / 总控台 / 柜台 / 试验盒 / 托盘 / 冲压 / 轨道 / 回执 /
储物柜 / 命令单 / 卡 / 旋钮 / 闸刀 / 就绪灯 / 灯排 / 读数板 / 铭牌 / 表格卡 /
收件匣 / 票据。**追认（2026-11-03 评分门轮，均为机器实件名）**：端子 / 檐 /
卡笼 / 计数轮 / 收件口 / 拉线 / 滑车 / 门架 / 卡库 / 拉杆。新隐喻词必须走
契约修订登记后才可用。

### 3.3 三方配色（双主题各一套，承载文字时对比度 ≥4.5）

| 泳道 | dark | light |
|---|---|---|
| xHCI 驱动 | #7c9ff0 | #2d5fb3 |
| xHC 控制器 | #d9a860 | #8a5f14 |
| 设备 | #86bd7a | #2f7a3d |

色相族固定；为过对比度门可微调明度，登记修订。

## 4. 页面统一模板（三节页 + 后续量产页通用）

1. `build.mjs`（kit pageHtml，width 1500，THEME 双份构建：index.html=dark、
   index-light.html=light）→ 自包含 index.html。
2. 页头导航条：`← 规范目录`（链 `../../index.html`）· `§4.x 中文题` ·
   `上一节 / 下一节`（首尾节单侧）。下衬一行规范引用：
   `xHCI 1.2b §4.x 英文原题 · pNN–NN`（页码机核后填）。
3. 正文块顺序：
   a. **规范要义**——白话解读（≤3 段，每段一个断言群）；
   b. **原文对照**——blockquote 列表：英文短引 + `(xHCI 1.2b §x pNN)` + 中文对照一句；
   c. **流程图卡**（iso-figure）——三方泳道静态 SVG（规格见 §4.1/分镜契约）；
   d. **动画卡**（iso-figure）——anatomy 机器或泳道步进动画；
   e. **互链卡**——相关既有机器/课/前后节。
4. 泳道静态图规格：三泳道纵向排列（驱动左/xHC 中/设备右）或横向三条带，框=圆角矩形，
   实线箭头=控制/数据流，虚线=事件回执流；跨泳道箭头必须两端触框（teach 箭头落位
   判据：端点落框边 ±2.5px）；每框角标页码（如 `p69`）。
5. 页脚：`判据：xHCI 1.2b（625472 Rev 1.2b）· 证据见 EVIDENCE.md · 生成于 <日期>`。
6. 页面静态 SVG 也要包进 `.iso-stage` 接 zoomfs（可放大看小框）。

## 5. 三节分镜契约

### 5.1 §4.1 命令操作（p68）——主会话自建，次要级：泳道步进动画

**要义**：所有 xHC 命令共用一条命令模型——命令 TRB 上命令环 → 敲门铃 0
（DB Target=0）→ xHC 执行 → 命令完成事件写事件环 → 中断/轮询唤醒软件。

**原文对照三条**（p68，引时去 PDF 重复引用伪影）：
- "There is only one Command Ring that is used for issuing xHCI specific commands or
  commands related to Device Slots."
- "All xHC commands are issued by placing the desired Command TRB(s) on the Command
  Ring, then ringing the xHC command Doorbell register, that is, writing the Host
  Controller Command code to the DB Target field of Doorbell register 0"
- "All commands result in the generation of a Command Completion Event TRB on the
  Event Ring."

**泳道流程图 8 步**（兼作步进动画脚本）：
1. 驱动：组命令 TRB（示例 Enable Slot），写入命令环；
2. 驱动：写门铃寄存器 0，DB Target=0（Host Controller Command）；
3. xHC：按 CRCR 指针取命令 TRB；
4. xHC：执行命令；
5. xHC：命令完成事件 TRB（Command Completion）写入事件环；
6. xHC：MSI-X 中断唤起软件（注记：中断可选，软件也可轮询事件环——p69 脚注 7）；
7. 驱动：读事件环收回执；
8. 设备泳道全程注记：「命令对设备不可见——命令是软件与 xHC 的管理通道；个别命令
   （如 Address Device）由 xHC 在总线上代发 USB 请求，那是执行效果，设备看见的是
   USB 请求不是命令」（链 §4.3）。

**步进动画**：同一张泳道图加步进模式——按步高亮当前框 + 消息令牌（小卡）沿箭头
行走（驱动→环→门铃 / xHC→事件环→驱动）；键盘空格步进、A 自动播放、R 复位；
idle 8s 自动巡游。全部包 iso-stage 接 zoomfs。

**互链**：fig4（命令环机器）、§4.3（命令的执行效果）、§4.6（命令清单，待建）。

### 5.2 §4.2 主机控制器初始化（p68–70）——子代理A，anatomy Figure「启机配电台」

**机器**：双位配电台。左侧操作位=文书台（xHCI 驱动：拉杆/插卡/合闸的执行者）；
右侧主机仓=xHC（一组寄存器面板）；台前下沿=根集线器端口灯排（2×USB2 + 2×SS，四灯）。

**零件组（≥40，制作人细化）**：底座/地脚/铭牌/标尺条；主机仓面板群——
USBCMD 总闸（R/S 大闸刀）、USBSTS 就绪灯（CNR）、CONFIG 插槽格旋钮（MaxSlotsEn）、
DCBAAP 卡槽+地址卡、CRCR 卡槽+命令环起点卡、事件环组（事件环段卡、ERSTSZ 计数轮、
ERDP 卡、ERSTBA 卡+事件环启用灯）、中断组（MSI-X 向量表卡[向量 0]、节流旋钮
Interval、INTE 闸刀、IE 闸刀）；端口灯排四灯+速度铭牌；操作位到各面板的拉线/导轨。

**帧序 8 帧**（点步进 + 自动巡游）：
- F0 全景静止：三区铭牌（xHCI 驱动/xHC/设备——设备区=端口灯排，铭牌「本流程无设备
  参与——R/S=1 后端口才开始上报连接」）；读数 0/7。
- F1 上电等就绪：Chip Hardware Reset 后 CNR 就绪灯亮→转灭（刻 `USBCMD 前必等
  USBSTS.CNR=0`）；刻「CNR=1 期间禁写 Operational/Runtime 寄存器」。
- F2 配置槽位与账本：旋 MaxSlotsEn（刻 `CONFIG.MaxSlotsEn`）+ DCBAAP 插地址卡
  （刻 `DCBAAP→DCBAA`）。
- F3 命令环起点：CRCR 插命令环起点卡（刻 `CRCR`）。
- F4 事件环登记：段卡+ERSTSZ 计数轮+ERDP 卡+ERSTBA 卡依次落位；ERSTBA 写入→
  事件环启用灯亮（刻 `写 ERSTBA=启用事件环`）。
- F5 中断链：MSI-X 向量表卡（向量 0）+ Interval 节流旋钮 + INTE 闸刀 + IE 闸刀
  （各刻官方名）；旁注「中断可选——可轮询事件环（p69 脚注 7）」。
- F6 合闸：R/S 总闸合上（刻 `USBCMD R/S=1`）→ 端口灯排苏醒：USB2 两灯亮
  「等待端口复位」、SS 两灯闪「自动检测中」；刻「R/S=1 后 xHC 才开始接受门铃」。
- F7 读数巡回：寄存器面板汇总读数；回到 F0。

**帧间注记常驻**：「后续各步顺序自由，但必须在 R/S=1 前全部完成（p69 Note）」。

**读数**（右下）：`启动步 n/7 · CNR 0/1 · R/S 0/1 · 端口活动 n/4`。

**泳道流程图（页面静态）**：驱动/xHC 两泳道 + 设备泳道注记（本流程不参与——端口
在 R/S=1 后才上报连接）。步骤框：等 CNR=0(p69) → MaxSlotsEn(p69) → DCBAAP(p69) →
CRCR(p69) → 事件环四件[段/ERSTSZ/ERDP/ERSTBA](p69–70) → 中断四件[MSI-X 表/Interval/
INTE/IE](p69–70) → R/S=1(p70) → 端口开始上报连接(p70)。虚框标注「顺序自由组」
括住中间六步。

**原文对照五条**（p68–70）：FLADJ 句（p68）；CNR 等待句（p69）；顺序自由 Note
（p69）；R/S=1 句 "Write the USBCMD to turn the host controller ON via setting the
Run/Stop (R/S) bit to '1'. This operation allows the xHC to begin accepting doorbell
references."（p70）；收尾句 "At this point, the host controller is up and running and
the Root Hub ports will begin reporting device connects…"（p70）。

**互链**：§4.3（端口上报后进入）、fig3（事件环机器）、fig4（命令环）、§4.7（门铃，待建）。

### 5.3 §4.3 USB 设备初始化（p71–80）——子代理B，anatomy Hero「设备登记流水线」

**机器**：三工位流水线（三方同框）：左=文书台（xHCI 驱动：命令单、输入上下文表格卡、
描述符收件匣）；中=xHC 总控台（PORTSC 读数板 + 命令柜台 + 事件回执口 + 线缆出口）；
右=设备试验盒（USB 设备：状态灯 Powered/Default/Address/Configured + 收到的 USB
请求票据串）。总控台与试验盒之间一条总线缆（USB 请求票据沿缆行走——设备视角的
唯一通道）。

**演示样例**：全速（FS）USB 设备插入 USB2 根端口 1（教学最全分支：必须走端口复位 +
8 字节描述符读取）。Slot ID=1 为示例值（xHC 自选，登记于 EVIDENCE）。

**帧序 12 帧**：
- F0 全景：端口 Disconnected（PP=1 等待），试验盒未接。
- F1 插入：USB2 端口→Disabled 态，CCS=1/CSC=1；PSCEG 0→1 → 端口状态变化事件卡
  经事件环到文书台（三方注记：设备只感到上电）。
- F2 查端口：软件读 PORTSC（CCS=1）；写 PR=1 发起端口复位。
- F3 复位完成：PRC=1、PED=1、PR=0、PLS=U0(0)；Port Speed=FS；试验盒状态灯
  Powered→Default（刻「复位把设备送入 Default 态，备好收 SET_ADDRESS」）。
- F4 取槽：Enable Slot 命令单→命令环→门铃 0→回执 Slot ID=1；DCBAA 1 号格挂
  输出上下文（软件装载）；槽→Enabled。
- F5 槽初始化：输入上下文表格卡填格（A0=1、A1=1；Slot Context：端口号 1、
  Route String=0、Context Entries=1；EP0 Context：Control/MPS=8/DCS=1/CErr=3）；
  EP0 传输环上架；备好 Address Device 命令单。
- F6 编址：Address Device（BSR=0）→xHC 执行：总线上发 SET_ADDRESS(地址=1)——
  请求票据沿缆到试验盒，状态灯 Default→Address；槽 Enabled→Addressed。
  （三方教学锚：设备第一次收到 USB 请求——发请求的是 xHC，不是驱动。）
- F7 问尺寸：FS 分支——GET_DESCRIPTOR 前 8 字节（Setup/Data/Status 三 TRB 上 EP0
  环+门铃 DB Target=1）；试验盒回 8 字节票据（bMaxPacketSize0=8）。
  旁注「LS/HS/SS（8/64/512）可跳过此步——仅 FS 必走（p72）」。
- F8 更新上下文：Evaluate Context（A1=1）→EP0 Max Packet Size 更新生效。
- F9 读档案：GET_DESCRIPTOR 读完整 Device/Configuration Descriptor 入收件匣。
- F10 配置：Configure Endpoint 命令单 + SET_CONFIGURATION 请求票据沿缆到试验盒；
  双成功→设备 Address→Configured、槽 Addressed→Configured（刻「双操作同成才升级，
  缺一不可（p74）」）。
- F11 完工：EP 环点亮可调度；管道全通。
- F12 巡回回 F0（账本与票据保留一拍再清）。

**试验盒铭牌**：「只见 USB 请求与总线事件——槽/环/上下文对设备不可见」。

**读数**：`设备状态 · 槽状态 · PLS · 回执 n`。

**分支注记卡**（页内小卡三张）：USB3 端口 attach 成功自动 Enabled（p71–72）；
BSR=1 legacy 分支（先通信后编址，p76–77）；hub/TT 逐层初始化要求（p74 Note）。

**泳道流程图（页面静态）**：三泳道 12 步（上帧序展开），虚线=事件回流，实线=命令/
请求流，票据色=设备泳道色。每框角标页码 p71–p80。

**原文对照六条**（p71–76，短引现场核）：attach 检测句（p71 步 1）、USB2 复位句
（p72 3.b）、取槽句（p72 步 4 / §4.3.2 p75）、Address Device 句（p76 / §4.3.4）、
8 字节句（p72 步 7）、双操作句（p74 步 10 / §4.3.5 p77）。

**互链**：fig1（TRB 装配机器）、fig4（命令柜台机器）、§4.1（命令模型）、
0009 课（传输剧）、§4.4（拔出，待建）。

## 6. 交付物与验收门（每节全绿才算完）

1. `build.mjs` 可重复构建 → 自包含 index.html（dark）+ index-light.html（light）。
2. 机器页：`node build.mjs --audit` → `audit passed`；`lines.mjs` → `line ends: 0`。
3. 泳道静态图：箭头两端触框（坐标核算或截图目检），框内字 ≥14px@1×。
4. shots/：dark/light 全景 + 每帧 ≥1 特写（≥1280 宽）+ 390px 全景（含 zoom 一张）；
   console clean（截图时抓）。
5. EVIDENCE.md：逐条断言→判据（§页码 / 字段值来源），含 zoomfs focus 选择器登记。
6. zoomfs 三件套接线 + `window.__zfs` 存活。
7. 自包含扫描：零外部 script/link。
8. 语言门：`python3 scripts/scan_words.py retired <每页 html>` total=0；术语对照
   §3.1/§3.2 抽查。
9. 页码机核：pypdf needle 全通过（引文与节头各至少一次）。
10. 页面互链可达（相对路径文件存在）。

## 7. 评分门（主会话执行，独立子代理评分）

评分者=独立子代理（美学专家+逻辑学家双身份），对每页 dark/light 全帧审：
- 美感（10 分制）：真实仪器/流水线感而非框线图；零件密度与归属；线条全部有终点；
  三方配色一致；双主题均成立。
- 逻辑（10 分制）：帧序与规范步骤一致；三方视角诚实（不硬凑）；每个数值可回溯
  EVIDENCE；避雷清单零复现；语言门抽查（无自造词、无 AI 腔）。
- 双维 ≥9 通过；<9 出具体缺陷清单打回重做。

## 8. 契约修订

| 日期 | 制作人 | 条目 | 判据 | 修订 |
|---|---|---|---|---|
| 2026-11-03 | 主会话 | shared/zoomfs.mjs 拷贝自 xhc-machines/shared（同源锚） | sha256 54e556763001368216da1d3ed65f3d9e534fee8e6bc968a5492dce3e684e1d4f 双侧一致 | 上游 zoomfs 改版时同步拷贝并更新此锚 |
| 2026-11-03 | 主会话 | §5.1 4.1 页「流程图卡+动画卡」两张卡 → 单卡双模式（总览=完整流程图 / 步进=动画，同一 SVG 数据同源） | zoomFsScript 单实例绑定首个 .iso-stage，双卡则第二卡无缩放/全屏；同图同源防两张图漂移 | §4.1 已按单卡执行；后续泳道页沿用 |
| 2026-11-03 | 主会话 | §1.5 语言门 total=0 → 残留 family ⊆ 豁免表（回执/柜台专名/泳道图表术语） | 机制课退役词族与本板块给定词表冲突的实测定界；详见 §1.5 豁免段 | 已通报全部在飞制作人 |
| 2026-11-03 | 主会话（评分门轮） | §1.8 机内刻字 ≥11px 台阶 vs §4.3 次级刻字 7–10px 等效 | xhc-machines fig3 修订后事实台阶＝细字段靠缩放档可读（3.2×），zoomfs 四档全页已接 | §1.8 追注：主层刻字守 ≥11px；「细节层」（缩到 3.2× 才读的次级刻字）允许 7px 起，EVIDENCE §5 必须登记细节层清单 |
| 2026-11-03 | 主会话（评分门轮） | §4.4 图例「虚线=事件回执流」在 §4.2 页兼表「读操作」（读 USBSTS） | 泳道图需要区分写流/读流/回执流三态，两符号不够 | 图例扩展：实线=写流 · 虚线=事件回执流 · 细虚线=读操作；页面图例同步 |
| 2026-11-03 | 主会话（评分门轮） | shared/zoomfs.mjs 单实例（写死首个 .iso-stage），双舞台页需构建期 scope 化补丁（4.2/4.3 两页各自实现） | 双卡页（流程图+机器）是本板块常态形态 | 上游建议：zoomfs 加 stageIndex 参数——待下次 xhc-machines/xhci-spec 共同维护窗统一改，现阶段各页构建期补丁并在 EVIDENCE 登记 |
| 2026-11-03 | 主会话（评分门轮） | §7 评分门新增「视觉通道自检」纪律 | 评分环境 Read(PNG)→CDN URL，未自检的评分者可能没看见图却打分（幻觉评分风险）；实测转写中继可用（~700KB 级 PNG 稳定 400，小图可用，sips 重编码可救部分） | 评分者必须先自检通道并在输出第一行声明；不可用时如实标「美学维未评」，禁编造视觉判语 |
| 2026-11-03 | 主会话（上线轮） | 上线适配门：study 树全部门 ≠ learning 线上可达——跨课互链两仓命名不同（study 裸名 `lessons/0006-xhc-trb-parts.html` vs 线上 `-standalone` 后缀），study 树内永不报错 | 首次上线实锤：板块 index 3 处＋4.3 双主题 2 处互链直接 push 即 404；装机后 `scripts/check_lesson_links.py` 对 learning 树机检抓出，改线上命名后 54/54 PASS＋线上 12 URL 200＋verify_pages_dir_online 92 件逐字节 PASS（learning 9c7757f） | 装机（rsync 至 learning）后、push 前必须对 learning 树跑 check_lesson_links.py（MISSING=0）；适配处数与改写形态记入当轮 EVIDENCE 或台账 |
| 2026-11-03 | 主会话（动画优化轮） | §1.8 可读性补强：机器页文字不得被机械部件遮挡（SVG 画家算法：后画实体盖先画标签=遮挡） | 用户新反馈三件（遮挡/帧速/字小）＋逐帧遮挡探针实锤：4.2 铭牌 4 处 overlap=1.0、4.3 去重 57 处（工位铭牌/部件标签被后画不透明面板整盖，actors 动态卡盖静态刻字）——探针=`scripts/xhci_spec_occlusion_probe.py`（text bbox vs DOM 序在后部件 bbox 求交，阈值 overlap>0.15 且遮挡者 opacity≥0.35） | 机器页交付门新增「探针 OCCLUSION-PASS」（两主题全帧）；标签/铭牌类文字组必须在实体之后、actors 之前绘制；帧速/字号台阶由每节 EVIDENCE 修订段登记 |
| 2026-11-03 | 主会话（动画优化轮） | 新卡型提案（待用户裁定）：代码走读卡＝codestepper 引擎（语句级帧）×「三环+设备」世界面板（rings3 模板，ev 枚举 ring_enq/ring_deq/ring_link/db/evt_enq/evt_deq/reg_wr/dev_req/dev_state） | 用户需求：调用一行代码显示一帧动画，动画显示传输环/事件环/命令环 TRB 变化与设备端变化；codestepper v3.4b 引擎零改动、数据面 lessons-data JSON 先例、4.3 机器环语汇沿用 | 详见 `CODE-STEPPER-设计提案.md`；裁定后登记分镜契约与机检门（三环账本断言），量产节按内容选配 |
