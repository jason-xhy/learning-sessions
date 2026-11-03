# CODE-STEPPER-设计提案 —— 逐代码调用分析与三环动画结合

> **用户已裁定（2026-11-03）：①方案 A 立项 ✓ ②首发样例=§4.1 Enable Slot 调用链 ✓ ③代码基线=本板块单独声明 ✓**
> 本文件自裁定起转为**实施蓝图**（新会话零上下文照此施工）。

## 〇、实施蓝图（2026-11-03 定稿）

### 步 1：rings3 世界面板模板（组件工程，1 会话）——✅ 已完成（2026-11-03）

- 位置：teach 工坊 `assets/codestepper.js` 扩展 `worldKind: "rings3"` 分发（引擎 API 不动，渲染层新增模板）；或独立 `assets/rings3.js` 由 codestepper 按数据 worldKind 引——**实施时读 codestepper.js 现行结构择侵入最小者**。
  **实施形态（v3.6，走侵入最小路径）**：codestepper.js 内新增 `rings3Html/applyEvR3/r3CellHtml` 函数组+`R3_OPS` 枚举表；`applyEv` 开头 dispatch（旧 4 op 零改动）；`go()` 渲染分发 `worldKind==='rings3'` 分支（先于 v3.5 machine 分支）；`alignWorld` sel 映射扩 9 op；builder（stepper_builder.py）lint 按 worldKind 分支放行高层 op+`render_world0_r3` 静态壳（无 JS 降级可读）；course.css 增 `.r3-*` 样式段（三方配色 CSS 变量 `--r3-drv/--r3-xhc/--r3-dev` 对齐 DESIGN §3.3，dark 集成时覆写变量即可）。
- 四区布局照本文 §3.1 线框（命令环/EP0 传输环/事件环/设备端纵向四区）；槽卡视觉语汇对齐 4.3 机器 TRB 小卡（类型缩写+cycle 位角标），指针=▲生产/▼消费；data-k 定位+变化脉冲沿用 .st-chg 机制。
  **落地细节**：槽卡 `{st,a,t,f,cyc}` 与卡片面板同构；门铃=环头徽标按次数累计（`db:0/1` data-k，闪=当帧脉冲）；寄存器窗=可选第五条区（`reg_wr` 驱动，data-k=`reg:<名>`）；指针着色按生产/消费方（cmd/ep0 ▲驱动蓝▼xHC 金，evt 环反转）。
- ev 枚举照 §3.2 表（ring_enq/ring_deq/ring_link/db/evt_enq/evt_deq/reg_wr/dev_req/dev_state）。
  **语义定案**：`ring_enq` 填槽+enq=(slot+1)%len（自动摸尾）；`ring_link` 独立教学帧=首槽 cyc 翻转+enq=0；`evt_enq` 载荷 `{t,a?,sid?,cc?}` 槽卡 f 行拼 `Slot=n · CC=n`；`dev_state {from,to}` from↔当前一致性归步 4 断言器管（运行时容错）。
- 布局契约并入 st_layout_probe：四区等高、槽卡不溢出、字号≥11px（2D 面板无透视压缩，主层直接 13-14px——本方案对"3D 字小"的结构性规避）。
  **契约机械化**（st_layout_probe v3.6 段，探测课内 stepper-data 的 worldKind 自动生效）：四区在场 / 三环 `.r3-cells` 带高两两差 ≤2px（"四区等高"的可量化形态）/ 槽卡与带容器零横向溢出 / `.r3-zone` 内全部叶文本 computed fontSize ≥11px / 世界面板无横向溢出。另：抽屉契约（mn-rail）条件化——无抽屉的课跳过（fixture/新板块课非违例）。
- **验收（全绿 2026-11-03）**：fixture 课 `lessons/0099rings3-fixture.html`（数据件 `lessons-data/stepper_99r3demo.json`，九种 op 全走）——st_layout_probe PROBE-PASS（含 rings3 段）+ `scripts/r3_behavior_check.py` R3-BEHAVIOR-PASS（九帧逐帧 DOM 断言：入队卡/指针前移/门铃计数/事件卡 Slot·CC/消费指针/cyc 翻转/传输环/设备灯+票据；**帧对位用 reset 法**——增量步进曾致断言错位假阳性，已修）+ lesson_gates lang 门 total=0 + 0008 旧课回归 PROBE-PASS（组件改动对存量 8 课零影响）。视觉转写与 DOM 对账（帧 5 截图：四区渲染/指针色/事件卡黄底全对）。
- **遗留登记**：lesson_gates 的 lessons 子门（check_lessons 全目录）在 xhc-machines fig1-4 与 xhci-spec 三节存量上报 14 条「SVG 良构性」✗——两个板块上线时未跑过该门，与本组件无关，待 anatomy 维护窗归因。

### 步 2：基线声明（单独声明，值建议同源）

- 板块独立声明段（课头）：`代码基线：<commit>（本板块代码走读卡专用声明）`。
- commit 值**建议沿用 62f4c998b297**（与 0006-0010 同值）——理由：读者跨课看到的代码同版本；check_lesson_excerpts.py 直连 git show 无需新基建。**"单独声明"指归属独立（板块自己的声明段与检查参数），非必须换 commit**；实施时若用户另指定则以用户值为准。
- 内核树 /Volumes/KernelSrc/linux；函数行号一律实施时 `git show <commit>:<file> | grep -n` 现场核对+excerpts 检钉死（禁凭记忆写行号）。

### 步 3：§4.1 首发样例数据（内容工程，半会话）

走读范围（真函数名，行号实施时核）：
- `xhci_alloc_dev()`（xhci.c）Enable Slot 段：分配 command → `xhci_queue_slot_control(xhci, command, TRB_ENABLE_SLOT, 0)`（命令环入队）→ `xhci_ring_cmd_db(xhci, 0)`（门铃 0）→ 等待完成
- 桥帧（CM/CTX 帧，无代码行）：xHC 取命令 TRB→执行→选 Slot ID=1→写 Command Completion Event TRB 进事件环→MSI-X（注记：中断可选可轮询，§4.1 避雷）
- `handle_cmd_completion()`（xhci-ring.c）消费段：事件环取回执→`GET_SLOT_ID(le32_to_cpu(event->status))` 拿 Slot ID→`complete(&cmd->completion)` 交还上层
- 尾帧注记：设备端四区全程无票据无状态迁移——「命令对设备不可见」（与 §4.1 避雷第 3 条同构）

帧数据：lessons-data 式调用日志 JSON（usb-xhci-stepper/1 schema 扩 worldKind+ev[]），预计 18-26 帧（语句帧+桥帧+尾帧）。

### 步 4：集成与门

- 集成点：4.1 页新增第五块「代码走读卡」（正文块顺序 e 互链卡之前）；卡头立法声明=代码基线 commit+TD 双账本粒度挑明（规范 TD 按阶段 vs xhci_td 按 URB——teach 既有判据首现同框必挑明）。
- 门：lesson_gates 全家桶（assets/render/excerpts+新 rings3 布局契约）+ 三环账本断言器（新写：每帧后各环 TRB 计数单调、事件环写入数=命令完成数、设备灯迁移合法）+ 语言门（新卡文案过 retired 门）+ 三节联动验收（4.1 页全门复跑）。
- 装机：rsync → **适配**（板块 index/4.3 双主题 5 处 -standalone 改写会因 rsync --delete 复发，必须重做）→ check_lesson_links → 线上双门。

### 步 5：4.3 四区全动样例（第二个，1 会话）——步 3 验收通过后启动

Address Device 链（命令环+EP0 传输环+事件环+设备端四区全动：SET_ADDRESS 票据+Default→Address 灯迁），作为方案验收件。分镜参照 4.3 机器 F5-F6 语义。


用户需求原话拆解（四要素）：
1. **逐代码调用分析**——按内核真实调用链一行（一条语句/一次调用）走读；
2. **一行代码一帧动画**——代码行与动画帧一一对应；
3. **三环 TRB 变化**——传输环、事件环、命令环在每帧的可视变化（入队/消费/回绕/事件写入）；
4. **设备端变化**——设备状态灯与收到的 USB 请求票据同步演进。

## 一、现有资产盘点（不重复造轮子）

| 资产 | 与本需求的关系 |
|---|---|
| teach 工坊 codestepper 组件（v3.4b，8 课在用） | 左代码窗**语句级帧**（一次调用含跨行实参=1 帧）+右**世界面板事件溯源**（world0+每帧 ev[] 增量、data-k 定位、变化脉冲+对齐）——需求 1/2 的引擎已存在且过全部布局契约（等高/居中/对比度/追按钮） |
| lessons-data/stepper_*.json（usb-xhci-stepper/1 schema） | 数据外置先例：帧=调用日志式 JSON，stepper_builder 后缀分发直驱 |
| xhci-spec 三节 anatomy 机器 | 4.3 Hero 已有 EP0 传输环台（TRB 小卡×3 data-hide 逐显）、命令环收件口、事件出口——**环/TRB/票据的机器语汇已定型**，世界面板直接沿用同一套术语与三方配色（DESIGN §3.3） |
| 0006-0010 课锚点（基线 commit+excerpts 机检） | 代码窗走读的基线声明与逐字检合同已立法（check_lesson_excerpts.py：逐块对 git show 基线原文精确子串匹配） |
| 0009 传输剧（三视角/十二拍） | 三环+设备端变化的**帧序语义**先例（完税回执/数据先于事件被 DMA 直写） |

## 二、方案对比

**方案 A（推荐）：codestepper 世界面板定制「三环+设备」四区视图**
- 代码窗=引擎现状零改动；世界面板新增 worldKind: `rings3` 模板。
- 2D HTML/CSS 呈现：字号可控（不重蹈 3D 透视压缩字小的覆辙）、布局机械检可量。
- 数据面=现有 ev[] 机制扩展事件枚举，向后兼容（旧课 kind 不动）。

**方案 B：anatomy 机器当世界面板（代码窗驱动 3D 机器）**
- 视觉与三节机器连贯；但机器帧粒度=规范步骤（12 帧），代码链是语句级（30+ 帧）——机器状态机要改成可插值驱动，工程量大；3D 字小问题会再次上身；布局契约（st_layout_probe 的 worldNoScroll 等）需全部重议。**不推荐为主形态**。
- 折中用法：代码走到关键节点（如 SET_ADDRESS 发出）时，帧注记里嵌对应机器帧的互链/缩略图——零工程量，纯策展。

**方案 C：新写专用组件**——重复 codestepper 已解决的语句分帧/滚动钉住/对比度/追按钮四族问题，浪费。

## 三、方案 A 详细设计

### 3.1 世界面板四区布局（右侧定宽栏，沿用世界栏宽度惯例）

```
┌────────────────────────────┐
│ ① 命令环（CRCR 消费指针▸）    │  TRB 槽横排循环带：槽卡=类型缩写+cycle 位
│ ② 传输环 EP0（enq▸/deq▸双针） │  同上+双指针；Link 槽显回绕
│ ③ 事件环（ERDP 消费指针▸）    │  事件卡=Transfer/Command Completion+Slot ID
│ ④ 设备端（状态灯+请求票据串）  │  Powered/Default/Addressed/Configured 灯 +
│                             │  收到的 USB 请求票据（SET_ADDRESS/GET_DESC…）
└────────────────────────────┘
```

- 三环共用一套槽卡视觉（与 4.3 机器 TRB 小卡同语汇），cycle 位翻转用色变+脉冲（现有 .st-chg 机制）。
- 每帧变化=ev[] 增量驱动：命中的槽卡/指针/票据 data-k 定位脉冲 1.8s+对齐滚动（现有 alignWorld 机制）。
- xHC 侧无代码行驱动时的表现：帧注记写「此刻 xHC：取 TRB→执行→写事件环」（三方视角诚实——代码只覆盖软件侧，xHC/设备侧由面板演进+注记解释；这正是 0009 立法的"完税回执"教学锚）。

### 3.2 事件枚举扩展（usb-xhci-stepper/1 schema 增补，向后兼容）

| kind | 载荷 | 面板动作 |
|---|---|---|
| `ring_enq` | ring: cmd\|ep0, slot, trb(类型缩写, cycle) | 槽卡亮起入队 |
| `ring_deq` | ring, slot | 消费指针前移 |
| `ring_link` | ring, slot | 回绕槽触发（首槽 cycle 翻转） |
| `db` | target(0\|1) | 门铃闪（命令门铃/EP0 门铃分开） |
| `evt_enq` | slot, ev(类型, slot-id, CC) | 事件环写卡（xHC 侧动作，代码行为"读"时回放） |
| `evt_deq` | slot | ERDP 前移 |
| `reg_wr` | reg, val | 寄存器窗值变（DCBAA/CRCR/ERST…） |
| `dev_req` | req(SET_ADDRESS…), dir | 票据沿缆到设备区 |
| `dev_state` | from, to | 状态灯迁移 |

### 3.3 代码窗走读脚本（首个样例建议）

**样例 1（最短闭环，建议首发）：§4.1 命令操作调用链**——Enable Slot 从入队到回执：
`xhci_queue_slot_control()`（命令环入队）→ `xhci_ring_cmd_db()`（门铃 0）→
「xHC 执行」桥帧 → `handle_cmd_completion()`（事件环消费、Slot ID 回收）。
全程命令环+事件环双环联动，设备区全程注记「命令对设备不可见」——与本节避雷立法同构。

**样例 2（全四区）：§4.3 Address Device 链**——命令环+EP0 传输环+事件环+设备端（SET_ADDRESS 票据+Default→Address 灯迁）四区全动，教学密度最高，作为方案验收件。

函数名与行号以实施时基线核对为准（ excerpts 检逐块钉死，禁止凭记忆写行号——DESIGN §1.1 铁律）。

### 3.4 契约关系与门

- **板块立法冲突处理**：原裁定「内核代码只在关键分歧点出现，不新锚行号」限定的是**规范对照正文**；代码走读卡是独立维度（0010 补丁解析课先例：基线声明+双账本代码块立法），课头必须声明代码基线 commit+账本粒度（跨账本同名术语首现挑明——TD 规范账 vs xhci_td 内核账，teach 既有判据）。
- 新卡型登记 DESIGN §8 修订台账后生效；4.4–4.25 量产节按内容选配（命令/传输密集节配，表格节不配）。
- 机检新增：① excerpts 逐字检（现有）② **三环账本断言**——每帧后各环 TRB 计数单调不回退、事件环写入数=命令/传输完成数、设备状态灯迁移合法（Powered→Default→Addressed→Configured 单向）；③ 世界面板布局探针（st_layout_probe 扩 rings3 契约：四区等高、槽卡不溢出）。

### 3.5 工作量与落地路径

| 步骤 | 量 | 说明 |
|---|---|---|
| rings3 世界模板+schema 枚举 | 1 个工作会话 | 模板渲染+stepper_builder worldKind 分发+三环账本断言器 |
| 样例 1（§4.1 链）数据+上线 | 半会话 | 走读脚本帧 JSON+门全绿 |
| 样例 2（§4.3 链）数据 | 1 会话 | 四区全动验收件 |
| 量产 | 每节增量半会话内 | 只写数据 JSON |

### 3.6 待用户裁定项

1. 是否按方案 A 立项（vs B/C）；
2. 首发样例选 §4.1（短）还是 §4.3（全）；
3. 代码窗基线沿用既有课锚点 commit（复引）还是为本板块单独声明基线（新锚）——影响 excerpts 检的 baseline 参数。
