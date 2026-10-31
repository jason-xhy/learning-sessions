# DESIGN.md —— xHCI 四机分镜契约（动画制作合同）

本文件是动画制作人（子代理）与网页组装人之间的**唯一合同**。逐条执行，不得自行改换机器隐喻与帧序；
发现契约与技术判据冲突时，以判据（规范/源码）为准并回写本文件的「契约修订」节。

交付根目录：`/Users/jason/ZCodeProject/usb-xhci-study/lessons/xhc-machines/`

```
xhc-machines/
  DESIGN.md                 ← 本文件
  fig1-assembly/            ← Fig1 build.mjs + index.html + shots/ + EVIDENCE.md
  fig2-transfer-ring/
  fig3-event-ring/
  fig4-command-ring/
  index.html                ← 网页组装人负责（后做）
```

---

## 0. 全局铁律（每个制作人都受约束）

1. **判据优先级**：规范原文（xHCI 1.2b）> 内核源码（/Volumes/KernelSrc/linux，commit d9008e061539）
   > actionflow 文档 > 本契约。任何刻进画面的位域值/章节号/行号，必须现场核对并记入 EVIDENCE.md。
   **禁止凭记忆写任何位号、字段值、章节号。**
2. **规范文本**：`/tmp/spec-audit-txt/xhci-1.2b.txt`（带 `===== [PAGE n] =====` 页标；本机无 pdftotext，
   若丢失用 PyMuPDF 从 `specs/625472_xHCI_Rev1_2b.pdf` 重提取，`python3 -I`）。检索用短关键词多 `-e`，
   **负向结论前先 grep -c 证明**（PDF 提取有断行）。
3. **源码行号**：一律在当前树实勘（grep -n），并注明「7.3.0-rc7 d9008e061539」。不使用任何课件旧行号。
4. **禁读旧课件**：`lessons/*.html` 一律不读（本任务要求全新形式）。可读的只有：
   `lessons/spec-audit-*.md`（错误判词）、`specs/actionflow-*.md`（正确时序）。
5. **语言**：全部中文标签。机制优先、字面直说；隐喻词只许用契约给定的机器隐喻名
   （工位/托盘/冲压/轨道/回执/储物柜），不得另造新词。位域字段名保留英文官方名（Cycle bit、IOC、TD Size…）。
6. **anatomy 工艺**：按 anatomy SKILL.md 全流程（先概念与零件清单，后几何；--audit 到零；lines 检查到零；
   双主题 dark+light；390px 可读；读数与模型同源为真）。基座目录：
   `/Users/jason/.zcode/skills/anatomy/`（kit/、scripts/capture.mjs、examples/、references/）。
   build.mjs 用 `import ... from 'file:///Users/jason/.zcode/skills/anatomy/kit/iso-kit.mjs'` 绝对 file:// 导入。
7. **一个画面一个断言**：画面上出现的每个数字/位值/箭头都要能在 EVIDENCE.md 里指回规范章节或源码行。
   多余装饰不得携带语义（无语义的纯装饰零件允许，但不得写数）。

## 1. 避雷清单（规范审核家+逻辑学家的已判错误，画面严禁复现）

控制传输域：
- 控制传输 = **2 或 3 个 TD**（Setup TD + 可选 Data TD + Status TD），不得画成 1 个 TD。
- 控制读 Data 段首包 = **DATA1**（USB2 §8.6.1），不是 DATA0。
- 「控制传输不需要 ZLP」不得作为一般性断言（与 §8.5.3.2 冲突）。
- Setup TRB 必须 IDT=1（8 字节 setup 载荷内联）；但 **IDT 不是 Setup 专属**——Normal TRB 也允许 IDT
  （内核 xhci_urb_suitable_for_idt，≤8B 小包走 IDT）。两条一起画才完整。
- 门铃 **DB Target：EP0 = 1**；0 = Reserved（Table 5-43）。不得写 0。
- TD Size 字段：不存在「USB2 主控写 0」的豁免；算术演示须自洽（128 KiB = 131072 B，不得写 130KB）。

环与寄存器域：
- Cycle 规则四条出 **§4.9.2.2**（不是 §4.9.2.1）；「不得改写已排程 TRB」注记在 §4.9.2.4 Note / §4.11.5.1。
- **Ring Overrun/Underrun：两种情况的判据都是「环空」**（IN 环 overrun 也是空环），不得写「IN 环满」。
- CRCR：**CRR=1 时对 CRCR 的写入被忽略**（§5.4.5），不是「RsvdP 位防写」。
- **xHCI 1.2b 不存在 Initialize Endpoint 命令**——命令清单里不得出现。
- 事件环初态：空闲槽 cycle 位须与 CCS 一致性的正确画法（以 actionflow-0007 修正后的口径为准，现场对 §4.9.4/§6.5 核）。
- 命令完成码表 = **Table 6-90**（§6.4.5），不是 6-91。
- 「整条事件链在同一 hardirq 跑完」不得作为断言（存在 HCD_BH 下半部）。
- giveback_first_trb 是**新 TD 入队路径**上的发布点（3 个调用点），不是 Set TR Dequeue 重启点。
- 页码口径：全部按 **xHCI 1.2b**（595 页 PDF）页标；写页码处必须与 /tmp 提取文本页标一致。
- `xhci_reset_device` 函数名不存在；真名 `xhci_discover_or_reset_device`。

## 2. 四机分镜契约

四机共享同一条叙事线（网页组装时按此排序）：**Fig1 看一颗 URB 怎么被装配成 TD 并敲铃**
→ **Fig2 装它的那圈轨道（传输环）怎么生产消费** → **Fig3 回执怎么回来（事件环）**
→ **Fig4 命令怎么下（命令环）**。三方视角在 Fig1 三工位同框；Fig2–4 为「软件 vs xHC」两方所有权机，
设备视角以铭牌/注释出现（「环与 TRB 对设备不可见」是全组的教学锚，必须出现在 Fig1）。

### Fig1 fig1-assembly —— 「总装流水线：一颗 URB 的三工位之旅」（Hero，80–150 零件）

**机器**：一座长条总装台，三个工位从左到右：文书台（xHCI 驱动）· 总装机（xHC 控制器）· 终端灯箱（USB 设备）。
一条传送轨道从文书台绕到总装机的环形轨道，再以细缆连到终端灯箱。

**演示样例**（必须用这个，保证算术与位域可核）：控制读 `GET_DESCRIPTOR(Config) wLength=18`
（USB2 §9.4.2 语义，值现场核），产生 **Setup TD + Data TD + Status TD = 3 个 TD、4 个 TRB**
（Setup TRB / Data TRB(18B) / Event Data TRB 可省略 → 不用 / Status TRB；实际 TRB 数以
actionflow-0006 重建的流程与 xhci_queue_ctrl_tx 实码为准，现场勘定后记录）。
禁止用 bulk 130KB 大样例（避免算术雷）。

**台站与帧序**（6 帧，可点击步进 + 自动巡游）：
- F0 静止全景：三工位铭牌（驱动/xHC/设备）+ 读数 TD=0。
- F1 文书台：URB 工作单（一张卡，标 `usb_submit_urb`）落进进件槽；调用栈牌竖列逐块点亮：
  `usb_submit_urb` (drivers/usb/core/urb.c:?) → `usb_hcd_submit_urb` (drivers/usb/core/hcd.c:?) →
  `xhci_urb_enqueue` (drivers/usb/host/xhci.c:?) → `xhci_queue_ctrl_tx` (drivers/usb/host/xhci-ring.c:?) ——
  每块牌的行号现场勘定刻字。
- F2 冲压台（总装机左翼）：TD 夹具（黄铜夹）逐个上托盘；每个 TRB 托盘冲压时，**位域刻度卡**逐格打号：
  4 行 DW0–DW3，32 刻度（每 8 位一根主刻度+字节刻字）。Setup TRB 卡必须刻出：
  Type=2（DW3[15:10]）、IDT=1、TRT（DW3[17:16]，控制读的取值现场对 §6.4.1.2 与
  xhci_queue_ctrl_tx 实码核）、Transfer Length=8、Buffer=8 字节内联载荷、Cycle 色标。
  Data TD 卡：**Data Stage TRB（Type=3，不是 Normal）**（§6.4.1.3 现场核），TX Length=18，
  方向位=IN（方向位位置现场核），是否带 IOC 以实码为准。
  Status TD 卡：**Status TRB（Type=4）**（§6.4.1.4 现场核），控制读的状态段方向=**OUT**
  （DIR 位现场核），IOC=1（以实码为准）。
- F3 入环+门铃（总装机主体）：3 夹具依次滑入环形轨道，槽位**所有权色带**上色（Cycle bit 视觉化的机器件：
  色带翻色杆），enqueue 指针牌推进；末尾**门铃按钮**（真弹簧钮）压下，旁侧刻 `Doorbell Write DB Target=1 (EP0)`。
- F4 xHC 取件：取件臂（ DMA 抓头）沿轨道把 TRB 逐个取走（dequeue 牌推进），同时终端灯箱上
  包序灯依次亮：`SETUP → DATA1(18B) → STATUS`（设备视角只见 USB 包）；
  灯箱底铭牌刻「环与 TRB 对设备不可见——设备只见令牌/数据/握手包」。
- F5 完成回流：事件回执（小卡）从总装机沿回执管返回文书台顶的回执栏（只一笔带过，细节归 Fig3），
  读数 TD=1 装配完成，循环回 F0。

**读数**（右下，真值同源）：`TD 装配 n/3 · 门铃 n · 包序 m/3`。
**图注**（卡下一行）：「一颗 URB 被拆成 TD 夹具上的 TRB 托盘：软件冲压，硬件取件，设备只见包。」

### Fig2 fig2-transfer-ring —— 「环形分度轨道：传输环的生产与消费」（Hero）

**机器**：钟表匠分度台式环形轨道（16 槽），台上两件机构：**生产者冲压头**（司机侧，铭牌「软件 · 生产者」，
握着 enqueue 指针牌）与**消费者取件臂**（对侧，铭牌「xHC · 消费者」，握着 dequeue 指针牌）。
每槽沿口有一圈**所有权色带**（双色，Cycle bit 的机器件），轨道尽头一节**接续导轨**=Link TRB（带翻色小杆 TC），
台角一只门铃钮。放大镜架上架着当前 TRB 的**位域刻度卡**。

**演示样例**：同一 bulk OUT 端点（EP1 OUT，MPS=1024）连续提交 3 个 6 KiB（6144 B）URB
→ 3 个 TD，每 TD 1 个 Normal TRB（Type=1、TX Length=6144、TD Size=0、IOC=1、Cycle=1，
全部字段现场核 §6.4.1.1 与 xhci_queue_bulk_tx 实码）。门铃 DB Target=**2**（EP1 OUT，
Table 5-43 现场核）。TD Size 在位域卡图例里只作解释性标注（「多 TRB 的 TD 中=本 TRB 之后
该 TD 剩余的 MPS 包数」，单 TRB TD 恒 0）——不画多 TRB TD 算术，不出现 130KB/131072 混写。

**帧序**（7 帧）：
- F0 空环全景：16 槽全为「上一轮消费过的旧色」；指针牌都指 0 槽；图注口径=§4.9.2.2 现场勘定文案。
- F1 软件冲压 3 盘：冲压头把 3 个 TRB 托盘压入 0/1/2 槽（色带翻成「本生产轮」色=cycle 1），enqueue 牌→3；
  放大位域卡特写 Normal TRB：Type=1、TX Length=1024、TD Size、IOC=0、CH=0、Cycle=1（DW3 位号现场核 §6.4.1.1）。
- F2 门铃+取件：门铃钮响，取件臂取走 0/1 槽，dequeue 牌→2，被取走槽的色带褪回旧色。
- F3 冲压到 15 槽：继续冲压，enqueue 牌走到 15；
- F4 回绕特写：接续导轨（Link TRB）特写卡：Type=6、TC(Toggle Cycle)=1，翻色杆「咔哒」翻色——
  新一轮生产色与前一轮相反；enqueue 回到 0 槽。
- F5 满环警报：enqueue 追上 dequeue（同槽）而色带同色 → **满**；对照处补刻「同槽异色=空」
  （判据措辞现场对 §4.9.2 核）；台顶警示灯亮。
- F6 消费解锁：取件臂取走数槽 → 空位再现，生产者继续。读数：`enqueue n · dequeue m · 生产轮色 · 满空态`。
**图注**：「传输环是单向食道：软件只管往里压，xHC 只管往前吃；Cycle 色带分辨『空』与『满』。」

### Fig3 fig3-event-ring —— 「回执登记机：事件环的生产与消费」（Hero）

**机器**：邮局分拣环形台（16 槽），**生产者是 xHC**（盖章投递头，铭牌「xHC · 生产者」），
**消费者是软件**（取件窗口，铭牌「软件 · 消费者」，窗口内一块 **ERDP 牌**由软件拨动）。
台侧一只**铃**（MSI-X 中断的机器件：电磁铃），铃锤连着投递头。回执卡=Event TRB 位域刻度卡。

**帧序**（6 帧）：
- F0 空环：与 Fig2 同一套物理，但指针牌换边（关键教学：ERDP 在软件手里）。
- F1 xHC 投递：传输完成 → 盖章头把 Event TRB 回执压入（色带=cycle），投递头推进；
  回执特写卡：Type=32（Transfer Event）、Completion Code（DW2[31:24]=1 Success）、
  Endpoint/Slot ID、ED 位（现场核 §6.4.2.1）。
- F2 敲铃：铃锤击铃——刻字「MSI-X 中断：铃响唤软件」。
- F3 软件取件：取件窗口沿色带核对（色带与 CCS 一致才收），连续收 2 张；ERDP 牌推进。
- F4 签收回写：软件把 ERDP 牌回写（**注意箭头方向：软件→寄存器，与传输环相反**），
  EHB 位的小旗子竖起（现场核 §5.5.2.3 EHB=bit1）。
- F5 静默：铃停、环空；读数 `未取回执 n · ERDP 槽 m · 生产轮色`。
**图注**：「事件环方向反转：xHC 生产、软件消费；ERDP 这根指针反过来握在软件手里。」

### Fig4 fig4-command-ring —— 「订单柜台：命令环与它的回执」（Figure，40–80 零件）

**机器**：银行柜台式小环（8 槽）+ CRCR 铭牌（**运行灯 CRR** + **翻色旋钮 RCS** +
「运行中写入被忽略」小锁牌）+ 台后**编号储物柜 DCBAA**（槽号→设备上下文地址牌）+
申请单夹（Input Context：输入控制上下文+槽上下文+端点上下文三格）。
命令回执从台侧窗口出（走事件环——画面注明「回执走 Fig3 的登记机」）。

**帧序**（5 帧）：
- F0 柜台全景：CRCR 铭牌 CRR 灯亮、RCS 旋钮指「生产轮色」。
- F1 投单：`Enable Slot`（Type=9）托盘入环 + 门铃（DB Target=0=命令环，现场核 Table 5-43——
  **命令环门铃 target=0 是合法的，与「EP0 门铃=1」并存，画面必须把两个 0/1 语义分开刻**）。
- F2 执行+回执：xHC 执行，回执卡（Command Completion，Type=33，CC=1，Slot ID=1）从窗口出，
  柜员在 DCBAA 储物柜 1 号格插上「设备上下文地址」牌。
- F3 大单：`Address Device`（Type=11，BSR 位=0）+ 申请单夹展开（Input Context 三格）；
  完成 → 柜上地址牌写入（Address Assigned 灯亮）。
- F4 配置端点：`Configure Endpoint`（Type=12）+ 新申请单（EP 上下文对）→ 完成。
  读数 `命令 n · 完成 n · RCS 色`。
**图注**：「命令环：软件下单、xHC 办结；办结回执走事件环，账本（设备上下文）挂进 DCBAA。」

## 3. 每机交付物与验收门（评分门前置自检）

1. `build.mjs`（可重复构建）→ `index.html`（standalone，自包含）。
2. `node build.mjs --audit` 输出 `audit passed`（有管线/圆件者必需）。
3. `scripts/lines.mjs`（anatomy skill 的）输出 `line ends: 0`。
4. `--light` 主题同样构建并各截全景 PNG。
5. `shots/` 目录：全景 dark/light + 每帧至少 1 张特写（用 capture.mjs/drive.mjs），
   分辨率 ≥1280 宽，另附 390px 手机宽全景。
6. `EVIDENCE.md`：**逐条**列画面承载的每个断言（位值/字段/章节号/行号/数值）→
   判据出处（规范 §+页标 / 源码 file:line 实勘结果 / actionflow 文档行）。
   缺一条=交付不合格。
7. 构建期自检脚本输出与产物一并留存在 shots/ 同级（build log）。

## 4. 评分门（网页组装人执行，制作人事后可读）

评分者=独立子代理（美学专家+逻辑学家双身份），对每机 dark/light PNG 全帧审：
- 美感（10 分制）：是「真实仪器」而非框线图；零件密度与归属；线条全部有终点；双主题均成立。
- 逻辑（10 分制）：帧序与 actionflow 时序一致；生产者/消费者所有权方向正确；
  位域卡每个数值可回溯 EVIDENCE；避雷清单零复现。
- 双维均 ≥9 = 优秀（通过）；<9 由评分者出具**具体缺陷清单**打回制作人重做，直到达标。

## 5. 契约修订

（制作过程中若判据与契约冲突，在此登记：日期、制作人、冲突条目、判据出处、修订后条目。）

- 2026-10-31 · 动画制作人（Fig1）· 冲突条目：§2 Fig1「产生 Setup TD + Data TD + Status TD = 3 个 TD、
  **4 个 TRB**（… Event Data TRB 可省略 → 不用 …）」· 判据出处：内核 xhci_queue_ctrl_tx 实码
  num_trbs = 2 + (transfer_buffer_length>0) = 3（xhci-ring.c:3812–3820 @d9008e061539），控制路径无
  Event Data TRB 排队代码；规范 §6.4.1.2 @p429（2-3 TD）· 修订后条目：**3 颗 TRB**
  （Setup TRB / Data TRB(18B) / Status TRB），画面与 EVIDENCE.md（A2）均按 3 颗执行。
- 2026-10-31 · 动画制作人（Fig1）· 实现备注（非判据冲突）：§2 Fig1 F3「3 夹具依次**滑入**环形轨道」
  实现为**上下料龙门依次吊放入槽**——单口入料通道无法既线性填 0/1/2 号槽又不穿越已占槽（环轨几何
  约束）；入环 + 所有权色带上色 + ENQ 指针推进 + 门铃的教学语义全部保留，特此登记。
- 2026-10-31 · 动画制作人（Fig1）· 实现备注（非判据冲突）：§2 Fig1 F5「读数 TD=1 装配完成」按 §2
  读数公式呈现为 `TD 装配 3/3 · 门铃 1 · 包序 3/3 · 完成 1`（「完成 1」=装配完成 1 件）。

---

## 5. 契约修订

| 日期 | 制作人 | 冲突条目 | 判据出处 | 修订后条目 |
|---|---|---|---|---|
| 2026-10-31 | fig2 制作人 | §2 Fig2 F1 帧序文字「放大位域卡特写 Normal TRB：Type=1、TX Length=1024、TD Size、IOC=0、CH=0、Cycle=1」与同节演示样例「TX Length=6144、TD Size=0、IOC=1」自相矛盾 | xHCI 1.2b §6.4.1.1 Table 6-21/22（p427-429）+ §4.11.2.4（p197-198，末 TRB TD Size=0）+ 内核 d9008e061539 xhci-ring.c:3709-3713（末 TRB 清 CH、置 IOC）、:3521 `xhci_td_remainder`（单 TRB TD 返回 0） | 位域卡按演示样例与实码刻：Type=1、TX Length=6144、TD Size=0、IOC=1、CH=0、IDT=0、C=1；「TX Length=1024、IOC=0」系合同帧序文字笔误，作废 |
| 2026-10-31 | fig2 制作人 | §2 Fig2 F2「被取走槽的色带褪回旧色」与判据冲突：消费者对 Cycle 位只读，取走后槽内残留不擦除 | xHCI 1.2b §4.9.2.2（p157）「The Cycle bit shall be treated as Read-Only by the consumer」+ §4.11.1.1（p188）TRB 对 xHC 只读 + actionflow-0007 §1.2 第 4 步「槽内 cyc=1 原样残留」 | 画面改为：消费取走=托盘离槽（空槽），色带保持该槽残留 Cycle 色（残留不擦除）；「空槽」由托盘离位表达，不改色带 |
| 2026-10-31 | fig2 制作人 | §2 Fig2 F5「同槽同色=满 · 同槽异色=空」措辞在轮色翻转后（F4 翻色）产生歧义：翻转后新生产色恰等于旧色相 | xHCI 1.2b §4.9.2（p153）/§4.9.2.2（p156）满/空定义（指针推进判据，非色相判据） | 刻字精化为：「满:ENQ 前槽 cyc=CCS(有未取件) · 空:DEQ=ENQ 且 cyc≠CCS」；色带仍为双色 Cycle 机器件，托盘在槽=所有权 |
| 2026-10-31 | fig2 制作人 | TD Size 计算规则出处：§6.4.1.1 Table 6-21 自引「Refer to section 4.10.2.4」，该节实为 Babble Detected Error | xHCI 1.2b §4.11.2.4「TD Size」（p197-198）为计算规则正文 | EVIDENCE 引 §4.11.2.4，并记 Table 6-21 原始自引以备查 |
- 2026-10-31 · 动画制作人（Fig3）· 冲突条目：§2 Fig3 F4「EHB 位的小旗子竖起（现场核 §5.5.2.3
  **EHB=bit1**）」· 判据出处：§5.5.2.3.3 Table 5-42 @p393-394（ERDP：DESI=bits 2:0 RW，**EHB=bit3**
  RW1C，"shall be set to '1' when the IP bit is set to '1' and cleared to '0' by software when the
  Dequeue Pointer register is written"）；内核 xhci.h:276 `ERST_EHB BIT_ULL(3)`、xhci-ring.c:3070-3071 ·
  修订后条目：EHB=**bit3**；旗子时序改为 **F2（IP 置 1 时）升起、F4（软件写 ERDP）放下**（RW1C 写 1
  清 0），画面与 EVIDENCE.md（C7/F1/F2）均按此执行。
- 2026-10-31 · 动画制作人（Fig3）· 冲突条目：槽沿色带在消费后的画法（合同未明写，Fig2 同物理画的是
  「被取走槽褪回旧色」）· 判据出处：§4.9.2.2 @p157（Cycle 位对消费者只读、初始化清 0）+ §4.9.4 @p161
  （消费只推进 ERDP）+ actionflow-0007【不符合】#1 修正口径（消费不擦除、残留由生产者覆写失效）·
  修订后条目：Fig3 色带=槽内 Cycle 位残留，**消费后不褪色**（0/1 槽保持 cyc=1），「已消费」由 ERDP
  牌/指针位置表达；图例明写「消费不擦除」。
- 2026-10-31 · 动画制作人（Fig3）· 实现备注（非判据冲突）：§2 Fig3 F1「ED 位（现场核 §6.4.2.1）」
  现场核得 **ED=DW3 bit2**（Table 6-39 @p439），画面值 0，无冲突，特此记录于 EVIDENCE.md（B8/F4）。
- 2026-10-31 · 动画制作人（Fig3）· 实现备注（非判据冲突）：F2「铃锤连着投递头」实现为**触发索**
  （投递头滑座顶 → 导索弯折 → 铃锤臂侧面着床），索随旋臂方位实时重建；教学语义（投递动作触发
  MSI-X 铃）保留。
- 2026-10-31 · 动画制作人（Fig4）· 冲突条目：§2 Fig4 F2「**柜员**在 DCBAA 储物柜 1 号格插上
  『设备上下文地址』牌」· 判据出处：xHCI 1.2b §3.2.1 p48（"system software … inserts a pointer to
  the newly created Device Context into the DCBAA at the location indicated by the Slot ID"）、
  §4.3.3 step10 p76（软件装载 DCBAA 表项后才发 Address Device）、§6.1 p403-404；内核
  d9008e061539 xhci-mem.c:1018-1019（xhci_alloc_virt_device 写 ctx_array[slot_id]，软件侧调用，
  调用点 xhci.c:4279）· 修订后条目：地址牌由**软件侧**（下单窗旁文书口）沿台面暗槽挂入 1 号格，
  柜员（xHC）只读该柜；画面与 fig4-command-ring/EVIDENCE.md（E4）按此执行。
- 2026-10-31 · 动画制作人（Fig4）· 判据源注记：任务派单将 DCBAA 判据写作「规范 §6.5（DCBAA）」；
  xHCI 1.2b 中 §6.5 为 Event Ring Segment Table（p473），DCBAA 定义在 **§3.2.1（p48-49）＋
  §6.1（p403-404）**，画面与 EVIDENCE.md（E1-E5、J4）均按 1.2b 实际章节标注。
- 2026-10-31 · 动画制作人（Fig4）· 实现备注（非判据冲突）：演示取值口径——Slot ID=1 为 xHC 自选
  新分配槽的示例值（Table 6-42 p441 语义=新分配 Slot，具体数值实现决定，§4.3.2 p75）；命令环 8 槽、
  DCBAA 6 格、3 条命令为画图取小（真实段 256 TRB，xhci.h:1265；柜至多 256 项，§6.1 p404）；巡绕
  （F4→F0）色轮翻转、计数清零，DCBAA 牌与「已编址」灯保留（账本不擦）。详见
  fig4-command-ring/EVIDENCE.md §I。
| 2026-10-31 | fig2 制作人（评分门 R1 重做） | §2 Fig2 F6 终帧「空位再现，生产者继续」账目自相矛盾：enq 2→5 跨槽无写入即推针；且终帧 ENQ 前槽 5 残留 cyc=1==CCS=1，读数词「可写入」与卡底刻字判据「满:ENQ 前槽 cyc=CCS」冲突 | 评分门 R1 缺陷清单（协调人选方案 a）+ xHCI 1.2b §4.9.2（p153）满定义 + §4.9.2.2（p156） | 终帧改：消费者取走 2/3/4（deq→5，dock=5）→ 生产者以第二轮色重冲 2/3/4（Cycle=0）→ enq=5=deq，按占位判据 full=true、警示灯亮、相位词「满环」；相位词全部改为占位判定（ENQ==DEQ 且 ENQ 前槽 cyc==CCS → 满环），F5/F6/刻字三者一致 |

