# EVIDENCE.md —— §4.17 中断器（2026-11-04，泳道节量产 #7）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| 中断器=事件与通知的管理单位；≤1024 个（MaxIntrs，至少 1）；组成=IMAN+IMOD+一条事件环 | §4.17 p261（pagecheck PAGE-OK `4.17 Interrupters` + `up to 1024 Interrupters`） |
| 每中断器映射单个 MSI/MSI-X 向量；总开关=USBCMD.INTE | §4.17 p261–262（引文② PAGE-OK `single MSI or MSI-X interrupt vector`——原句跨行，needle 取断行后段） |
| 节流三条件 IMODC=0·IPE=1·EHB=0 → IP=1；IMODI 默认 4000(1ms)、建议 651–5580；重负载合并/轻负载即时 | §4.17.2 p264–267（Figure 4-22/4-23/4-24；脚注 56 EHB 动机） |
| MSI/MSI-X：IP 由 PCI 写完成自动清；INTx#：软件写 IMAN 清 | §4.17.2 p265 |
| Pin：仅中断器 0，其余禁用；MSI：向量=Index MOD MME、Capable≤MaxIntrs、>32 限制；MSI-X：1:1、Table Size=MaxIntrs | §4.17 p261–262 + §4.17.3 p267 |
| 跨事件环不保序 | §4.17 p262 Note（引文③ PAGE-OK） |
| Interrupter Target 三来源（固定 Primary/TRB 字段/Slot Context 字段）；不支持映射则全进中断器 0 | §4.17.1 p263（引文④ PAGE-OK）+ §4.17.4 p267 |
| 设备泳道不参与 | §4.17 全文无设备侧动作 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #7（泳道+表格卡经 linksHtml 槽拼装——lanePage 无 cards 槽，表格卡走相关卡前置位）。
- 门：语言门 total=5 ⊆ 豁免集（回执1/泳道4）；交互冒烟 LANE-SMOKE-PASS ×2 主题；自包含；截图 6 张。
- ~~走读卡（事件环消费链）：待量产轮~~ —— **已于 2026-11-04 走读卡轮补齐**（见下 §走读卡轮）。

## 走读卡轮（CODE-STEPPER 量产轮，2026-11-04；事件环消费链＝泳道图第 3-4 步的代码侧）

- 数据件：`lessons-data/stepper_47x.json`（marker **X47**，schema usb-xhci-stepper/1，worldKind=rings3，**51 帧 / 5 ev / 8 refs / 51 锚点**；命名核：lessons-data 无 47x/417x 占用，4.4 先例「4.<节号>x」规则 → 417→47x）。
- 集成：照 4.4 三件注入模式（生成器禁改 `_gen/`）——head `</style></head>` 前 / linksHtml 首标记 `<!--X47:WALK-->` 处 / module 脚本首，replace 函数形态防 `$` 误展开；`p.xsp-walknote` 导语含 TD 计数口径挑明（规范按传输阶段记 TD、内核 struct xhci_td 按 URB 记；本例 bulk 单阶段两口径重合，控制传输三阶段在内核并成一个 TD）。卡头基线声明=62f4c998b297（板块专用，与 §4.1/§4.3/§4.4 同源）。
- 走读链（行号全部 `git -C /Volumes/KernelSrc/linux show 62f4c998b297:<file>` awk NR 现场核出——**管道 grep -n 行号有偏移实锤，awk NR 为准**，锚点断言构建期强制）：

| 段 | 函数:行号（基线实码，全部 xhci-ring.c 除注明） |
|---|---|
| 入口 | MSI-X 向量 → xhci_irq（:3183；.irq 钩子注册 xhci.c :5605，MSI 包装 xhci_msi_irq :3229）：:3191 读 USBSTS / :3197 STS_EINT 共享中断判定（HCE :3202/FATAL :3208 错误路径如实注记不走）/ :3219 EINT 写1清（先清 op 状态让其它 MSI-X 中断器进来）/ :3222 xhci_handle_events(interrupters[0]) 主中断器 |
| IP 清除 | xhci_handle_events（:3092）:3099 → xhci_clear_interrupt_pending（:3074）：:3076 ip_autoclear 分岔——MSI-X 时 xhci.c :639 已置 true，PCI 写完成自动清（§4.17.2 p265），软件写 1 清+回读冲刷（:3079-3084）仅 INTx# 形态 |
| 环循环 | :3118 while(unhandled_event_trb) → 判定函数 :137（:139 cycle 位==cycle_state）→ :3120 xhci_handle_event_trb（:2992）：:3005 rmb 屏障 / :3006 取 trb_type / :3009-3018 switch 四路分发（命令完成 :3011 / 端口状态 :3014 / **传输完成 :3017 本链** / 设备通知） |
| 传输分支 | handle_tx_event（:2632）：:2648-2651 四字段（Slot/EP/CC/TRB DMA）/ :2659 DMA 地址反查传输环 / :2847-2849 TD 匹配循环（td_list，内核 TD=按 URB）/ :2951-2959 按端点类型三选一 → process_bulk_intr_td（:2505，bulk IN）:2563-2570 finish_td 标号 → finish_td（:2247）:2286 xhci_dequeue_td（:924）：:927-929 传输环软件出队指针推进（xHC 侧消费桥帧已演）→ xhci_td_cleanup（:877）：:906-908 inc_td_cnt+last_td_in_urb / :919 → xhci_giveback_urb_in_irq（:807）:824 usb_hcd_giveback_urb（URB 交还 USB 核心） |
| ERDP 写回 | :3126-3127 半段防满（每 256 颗中途写 ERDP，演示环 4 槽不触发如实注记）/ :3136 inc_deq（:188；事件环无 Link TRB，段尾 :199 翻 cycle_state）/ :3142 收尾 xhci_update_erst_dequeue（:3044）：:3051 读 ERDP 算 deq / :3060 未动且不清 EHB 不写（规范禁连续写同值 p165 的内核对策）/ :3063-3070 DESI+PTR+ERST_EHB（RW1C 写1清 p393）写回 erst_dequeue |
| 收束 | :3144 返回 0 → xhci_irq :3224 解锁 / :3226 IRQ_HANDLED——中断再武装=MSI-X IP 自动清+EHB 随 ERDP 写回归 0，无需额外动作（轻负载 Figure 4-24） |

- 引文 8 条 verify-refs 全 OK（p261×2 / p265×2 / p163 / p165 / p393 / p69 脚注7 quote 空）。本节引文不含 p68「xHC specific」句——4.4 登记的 §4.1/§4.3 该句偏差与本节无关。
- 三环账本：事件环消费侧主线（evt_enq=1 = ep0_deq 1+cmd_deq 0，L2 平衡）；命令环本链无 TRB 流转（world0 全空如实呈现）；设备端注记「中断对设备不可见」——HW 尾帧与 r3 静态壳注记双通道。
- 门（全绿，2026-11-04）：
  - `stepper_builder.py <47x>` 幂等「OK 重生成」+ sha256 前后一致（IDEM-OK，与 node build 产物同源）+ `--verify`（28 步/114 行与 git 基线逐字节一致）+ `--verify-refs`（8 条 REF OK）
  - `check_rings3_ledger.py stepper_47x.json` → LEDGER-PASS（frames=51 evt_enq=1 cmd_deq=0 ep0_deq=1；L1/L2/L3 全过）
  - `st_layout_probe.py <双主题>` → PROBE-PASS ×2（rings3 段三带等高 100.03 三值相等/零溢出/small=[]）——**首跑实锤：world0 预置带 t 文本的 written 卡使 ep0 带高 138≠100 违例**，改「链前回放帧」方案（初始态全空=44x 同构，TD 入队由帧 2 ring_enq 演出）后过门
  - `xhci_spec_stepper_probe.py index.html` → STEPPER-PROBE-PASS（5 ev 帧 reset 法：DATA 入队/ep0 消费指针/TRFE 卡 Slot=1·CC=1/事件环消费指针/ERDP 寄存器窗）
  - `scan_words.py retired` ×2 → total=15 ⊆豁免集 {回执×8, 泳道×7}——**首跑实锤 15 处非豁免命中（给回13/记账1/收口1），当轮改定**（给回→交还、记账→清尾、收口→出口）
  - console ×2 主题三域（Runtime.consoleAPICalled+pageerror+CDP Log.entryAdded）→ 全 0，含 5 帧步进驱动
  - pagecheck → PAGECHECK-PASS（原 6 needle + 走读卡新增 7 needle；p265 两句跨 PDF 断行假阴性，断行后短 needle 双验：`cleared by the completion of the PCI` / `by software writing the IMAN register`）
  - 自包含（http URL 仅 SVG xmlns）；互链存在性 ×2（walk-note/走读块/互链卡全链）
  - 视觉转写与 DOM 对账（暗主题初始+尾帧）：初始四区全空/Configured 灯 on/寄存器窗三值；尾帧 TRFE 卡（Slot=1·CC=1）+▼消费指针+ERDP 值更新——双通道一致
- shots 新增：walk-card-{dark,light}.png（初态）+ walk-card-end-{dark,light}.png（尾帧：TRFE 卡、▼、ERDP→槽 0 后），channel="chrome"。

