# EVIDENCE.md —— §4.4 设备拔出（2026-11-04，泳道节量产首件）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 拔出由 PORTSC 承载：CCS→0、CSC→1 | xHCI 1.2b §4.4 p81（引文①，pagecheck PAGE-OK：`Connection Status (CCS)` / `(CSC) bit` @p81） |
| PSCEG 0→1 跳变才产生 Port Status Change Event | §4.4 p81 句 + §4.19.2 Port Status Change Generation p291（pagecheck PAGE-OK） |
| 确认拔出后软件须对受影响槽发 Disable Slot | §4.4 p81（引文②，pagecheck PAGE-OK `Device Detach`） |
| Disable Slot 命令模型 = 唯一命令环 + 门铃 0 + 必回完成事件 | §4.1 p68（立标节已核）+ §4.6.4 p96（引文③ pagecheck PAGE-OK） |
| Disable Slot 五项回收（禁槽门铃/回收带宽/终止活动/释放资源/槽标记可复用） | §4.6.4 p96 五条 bullet（页码 PAGE-OK `4.6.4`） |
| 软件侧释放 Device Context / 传输环 / 段表内存 | §4.6.4 p96 "software can free the Device Context, Transfer Ring, Stream Context Array, etc." |
| 前置条件：端点 Stopped（或 Running 中 Idle）+ 未决 Transfer Events 已收齐 | §4.6.4 p96 Note |
| 槽位回收后可被 Enable Slot 再分配 | §4.6.4 p96 "available for subsequent reassignment by an Enable Slot Command" + §4.3.2 p75 |
| 设备泳道离场（拔出后设备侧无响应） | §4.4 全文无设备侧动作——三方视角诚实立法（DESIGN §1.7） |

页码机核：`python3 scripts/xhci_spec_pagecheck.py 81 'Connection Status (CCS)' 81 '(CSC) bit' 291 '4.19.2' 81 'Device Detach' 96 '4.6.4' 96 'Disable Slot Command is issued by software to force'` → PAGECHECK-PASS（needle 避 PDF 断行：`Current`/`Connect` 在断行处，用断行后短 needle）。

## 工艺与门

- 生成器：`ch4/_gen/lane_page.mjs`（从 4.1 build.mjs 参数化抽取）——布局推进量=内容高自适应（多行盒不压叠）；箭头激活标记：非 dev 端 UML 窄条贴边（teach 箭头触边判据的同构实现）；总览/步进单卡双模式同源（DESIGN §8 修订#2）。
- 本节 build.mjs 仅数据（分镜 steps/quotes/prose/legend/links），照抄 4.4 改数据即量产。
- 门：语言门 total=9 ⊆ 豁免集（回执3/泳道6——泳道=图表术语字面，回执=§3.2 给定词）；自包含（http URL 仅 SVG xmlns ×2）；console clean ×2 主题；步进交互冒烟 PASS（步 2/10 narr 实测）；页码 PAGECHECK-PASS。
- zoomfs 单实例单舞台接线（无第二 stage）。
- shots：lane-overview/step2/step-end × dark/light 共 6 张。

## 已知边界

- §4.6.4 逐命令展开归 §4.6（待建）——互链卡已挂待建链接到板块目录。
- ~~走读卡（Disable Slot 代码链）：本批不配~~ —— **已于 2026-11-04 走读卡轮补齐**（见下 §走读卡轮）。

## 走读卡轮（CODE-STEPPER 量产轮，2026-11-04；Disable Slot 链＝§4.1 Enable Slot 链的镜像）

- 数据件：`lessons-data/stepper_44x.json`（marker **X44**，schema usb-xhci-stepper/1，worldKind=rings3，**36 帧 / 6 ev / 9 refs / 41 锚点**）。
- 集成：本节走 lane_page 生成器（生成器不接受额外 css/js，禁改 `_gen/`）——走读卡三件（course.css 走读段+变量垫片 / body 块 / codestepper.js）对 lanePage 产物做**锚点注入**：head `</style></head>` 前、linksHtml 首标记 `<!--X44:WALK-->` 处（互链卡之前）、module 脚本首（replace 一律函数形态防 `$` 误展开）；卡前 `p.xsp-walknote` 导语（含 TD 计数口径挑明：规范按传输阶段、内核 struct xhci_td 按 URB——本链是命令，不涉传输 TD）。卡头基线声明=62f4c998b297（板块专用，与 §4.1/§4.3 同源）。
- 走读函数清单（行号全部现场 `git -C /Volumes/KernelSrc/linux show 62f4c998b297:<file> | grep -n` 核出，锚点断言构建期强制）：

| 段 | 函数:行号（基线实码） |
|---|---|
| 入口 | usb_disconnect → hub_free_dev（hub.c :2282，:2287 free_dev 钩子）→ xhci_free_dev（xhci.c :4105，挂钩 :5625） |
| 投递 | xhci_disable_slot（xhci.c :4144）→ xhci_alloc_command(:4151) → 死机判定(:4159-4161) → xhci_queue_slot_control（xhci-ring.c :4404-4408，TRB 字段 1/2/3 全 0）→ xhci_ring_cmd_db（:4174；xhci-ring.c :424）→ wait_for_completion(:4177) |
| 桥帧 | xHC 按 CRCR 取命令→五项回收（§4.6.4）→ CCE 写事件环（Slot=1·CC=1）→ MSI-X（中断可选 p69 脚注 7） |
| 消费 | handle_cmd_completion（xhci-ring.c :1803）:1806 取 Slot ID / :1825 完成码 / :1870-1876 switch 命中 TRB_DISABLE_SLOT → xhci_handle_cmd_disable_slot（:1607；:1623-1625 成功侧 DCBAA 1 号格清 0+devs 摘除）→ :1938/:1704/:1711 complete 唤醒 / :1940 inc_deq |
| 清理 | 回线程 ：4179-4181 回执核验、:4183 释放命令 → xhci_free_virt_device（xhci-mem.c :869）：:889-891 逐端点释放传输环（含 EP0）、:914-917 释放 in/out 上下文；:879-882 防御性 DCBAA 复核（正常路径空操作，帧注记如实登记） |

- 设备端四区全程注记「命令对设备不可见」＋设备已离场定格 Configured（与 §4.1 走读卡同构教学锚）；三方泳道标签 CT/HW tag 覆写（41x 先例）。
- 引文实锤（verify_refs 门抓出）：规范 p68 原文印作 **「xHC specific」**（非「xHCI specific」）——本卡 r_one 已按原文；§4.1/§4.3 走读卡同句引作「xHCI specific」，属转写偏差，**本节不改他节文件**，登记待板块维护窗统一订正。r_db 补回被 41x 剔除的插入语「(Section 6.4.3 Command TRBs)」后全 9 条 REF OK。
- 门（全绿，2026-11-04）：
  - `stepper_builder.py render_block` 零报错；幂等重放「OK 重生成」+ 与 node build **逐字节同源**（sha256 双跑一致）+ `--verify`（21 步/41 行与 git 基线逐字节一致）+ `--verify-refs`（9 条引文 pypdf 去空白子串全 OK）
  - `check_rings3_ledger.py stepper_44x.json` → LEDGER-PASS（frames=36 evt_enq=1 cmd_deq=1 ep0_deq=0；L1/L2/L3 全过，设备态不动=合法态）
  - `st_layout_probe.py <双主题>` → PROBE-PASS ×2（rings3 段：四区在场/三带等高 100.03px 三值相等/零溢出/字号≥11px/small=[]）
  - `xhci_spec_stepper_probe.py index.html` → STEPPER-PROBE-PASS（6 条 ev 帧逐帧 reset 法：DSLT 入队/门铃×1/cmd 消费/CCE Slot=1·CC=1/DCBAA 寄存器窗/ERDP）
  - `scan_words.py retired` ×2 → total=20 ⊆豁免集 {回执×12, 泳道×8}（走读卡文案未引入新豁免）
  - console ×2 主题 → 0 条（双域：Runtime.consoleAPICalled + CDP Log.entryAdded——4.3 卡轮实锤的解析错域；载入/滚动/36 帧全程步进三段）
  - pagecheck → PAGECHECK-PASS（原 6 needle + 走读卡新增 5 needle；「disable the Device Slot associated with the port」跨 PDF 断行假阴性，改断行后短 needle 双验）
  - 自包含（http URL 仅 SVG xmlns）；互链存在性 6/6 ×2
- shots 新增：walk-card-{dark,light}.png（行 1/36 初态）+ walk-card-end-{dark,light}.png（行 36/36 终态：CCE 卡 Slot=1·CC=1、▼ 过槽、DCBAA→0、Configured 灯定格），1500×1000、channel="chrome"。
