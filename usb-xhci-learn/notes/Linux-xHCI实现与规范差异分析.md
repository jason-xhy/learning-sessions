# Linux xHCI/USB 主机栈实现与协议规范差异分析（Linux v7.3.0，本地树 /Volumes/KernelSrc/linux）

> 证据方法：本会话逐段 Read 了 xhci-ring.c 事件/入队/完成全路径、xhci.c urb_enqueue、core/hcd.c 提交回收、core/urb.c 校验，其余论点均经 grep 本树证实（文末附复核命令）。行号以该树为准，引用格式 `函数() 文件:行号`（宏/静态表项单独标注）；`ring.c`=drivers/usb/host/xhci-ring.c，`xhci.c`=drivers/usb/host/xhci.c，`hub.c`/`message.c`/`urb.c`/`sysfs.c`=drivers/usb/core/ 下同名文件，`usb.h`=include/linux/usb.h。
> 范围声明：xhci-mem.c、dbgcap（调试端口）、sideband（卸载）内部未逐行审计，相关结论限定在"通用提交/完成路径"。

## 0. 分析口径：先分清三个"实现域"

USB 2.0 ch7/ch8 与 USB 3.2 Physical/Link/Protocol 三层的**线缆协议本体不存在于 Linux 代码中**——它们在 xHC 硬件里（LTSSM、链路重传、128b/132b、PING/SPLIT 全是硬件行为）。Linux 实现的是两个东西：

1. **xHCI 1.2 接口契约**（环/门铃/中断器/TRB，即"软件该怎么喂硬件"）；
2. **usbcore 主机语义**（URB 框架、ch9 枚举、hub/LPM/挂起唤醒策略）。

因此"与协议的差异"只有三种来源：**对 xHCI 规范 shall/should 的偏离**、**对 USB2/3.2 主机侧义务的取舍**、**为违约硬件/设备打的补丁**。下文按用户三问定性。

---

## 1. 妥协（明知偏离或放宽，换取对存量硬件/吞吐的兼容）

| # | 主题 | 规范口径 | Linux v7.3 现实 | 证据 | 妥协代价 |
|---|---|---|---|---|---|
| 1.1 | 控制器 quirk 体系 | 规范假设控制器行为一致 | **48 个 quirk 位**（宏定义区 xhci.h:1589-1648：NEC_HOST/AMD_PLL_FIX/AMD_0x96/SPURIOUS_SUCCESS/AVOID_BEI/MTK_HOST/ETRON_HOST/ZHAOXIN/CDNS_SCTX/SG_TRB_CACHE/EP_LIMIT/RESET_ON_RESUME…），配套行为改写：Etron 在 Setup TRB 前插 No-Op 防 Link TRB 截断（xhci_queue_ctrl_tx() ring.c:3799-3811）、MTK 0.96 的 TD-size 字段语义（xhci_td_remainder() :3526-3536）、AVOID_BEI 主机每 8 个 TD 至少放一个事件（trb_block_event_intr() :4085-4090） | 各行号 | 代码路径分支膨胀；新控制器先过 quirk 狩猎 |
| 1.2 | 规范内部歧义的自选立场 | xHCI 0.95 与 0.96 对"babble 的控制端点是否 halt"表述冲突 | 不选边：0.95 控制端点按端点上下文实际状态判定，其余照 0.96 处理 | xhci_halted_host_endpoint() ring.c:2213-2221；出处仅为内核注释——xHCI 1.2 版本史表（p19）从 0.96 起且无 0.95 记载、无 babble 相关历史条目，现行文本一律 halt（4.10.2） | 无（歧义只能选边） |
| 1.3 | 容忍"缺事件"的主机 | xHCI 4.10.2/4.10.3.2：错误 mid-TD 后 xHC 应对最后 IOC 的 TRB 发事件；Missed Service 时 xHC 应转下一等时 TD | NEC 类主机不发。Linux 不死等：事件落在 TD 外即提前回收（handle_tx_event() 的 error_mid_td 机制 :2801-2818）；xHCI 1.0 允许 Missed Service 事件不带 ep_trb_dma（handle_tx_event() :2821-2826），Linux 直接放弃本次定位 | handle_tx_event() ring.c:2801-2826 | TD 边界定位变复杂（trb_in_td 循环 + skip 状态） |
| 1.4 | 容忍"多事件"的主机 | 一 TD 一事件 | 短包/错误后多发 Success 事件 → 识别后静默吞掉 | xhci_spurious_success_tx_event() ring.c:2600-2613（XHCI_SPURIOUS_SUCCESS、XHCI_ETRON_HOST 分支） | 需要跨事件记 old_trb_comp_code 状态 |
| 1.5 | 等时排班"窗口内即信" | xHCI 4.11.2.5：软件必须在合法窗口内排班 | 窗口照规范算（IST 提前量 + 895 帧窗口，xhci_get_isoc_start_frame() ring.c:4044-4047），但 **mid-stream URB 出窗只打 dbg 日志不纠偏**（xhci_get_isoc_start_frame() :4062-4068），错账交给 Missed Service→skip 补账机器兜底 | xhci_get_isoc_start_frame() ring.c:4021-4074 | 排班错误从"提交期拒绝"降级为"运行期丢帧" |
| 1.6 | 自有容错策略层 | 规范只定义 Reset Endpoint 机制（soft/hard），不规定重试策略 | 事务错误先 **EP_SOFT_RESET 重试至多 MAX_SOFT_RETRY=3 次**再上报（process_bulk_intr_td() ring.c:2542-2551，xhci.h:1271；与 xHCI 4.6.8.1 Soft Retry 的禁用条件一致——规范禁止对等时与 TT 后设备软重试，内核 ：2545 的 TT_SLOT 检查同源）；halted 端点照常收 URB（prepare_ring() :3287-3289 "queueing URB anyway"） | process_bulk_intr_td() ring.c:2542-2551 | 错误延迟暴露，最多多跑 3 轮无效事务 |
| 1.7 | 中断粒度换吞吐 | 每 TD 都可 IOC | 等时流大量 TD 打 **BEI**（Block Event Interrupt，xhci_queue_isoc_tx() ring.c:4213-4214 + trb_block_event_intr() :4077-4093）；事件环消费过半就提前回写 ERDP 且等时 BEI 间隔减半（xhci_handle_events() :3126-3133） | xhci_handle_events() ring.c:3126-3133；trb_block_event_intr() ring.c:4077-4093 | 回调粒度变粗，靠事件环水位间接感知断流（Ring Underrun 事件） |
| 1.8 | 性能取向（合规但规范不要求） | — | 小包 **TRB_IDT 内联**进 TRB（批量 xhci_queue_bulk_tx() ring.c:3715-3720、控制 xhci_queue_ctrl_tx() ring.c:3843/:3875）；TD 尾不对齐时 **bounce buffer 按 maxp 对齐**（xhci_align_td() ring.c:3546，调用点 :3700） | :3546/:3715 | 拷贝开销换 DMA 效率与段边界安全 |
| 1.9 | 根集线器软件仿真 | xHCI 里根集线器是控制器真实对象（端口即其一部分） | 统一 HCD 模型：根集线器做成虚拟 usb_device，控制 URB 走 rh_urb_enqueue 软件应答（usb_hcd_submit_urb() hcd.c:1537-1538），xHCI 驱动只管端口事件 | hcd.c:1537 | 多一层虚拟化（所有 HCD 一致的历史架构妥协） |
| 1.10 | 时序义务参数化 | USB2 9.2.6.1：请求处理 ≤5s | 无栈级集中 enforcement；usbcore 自身 ch9 请求用 5000ms（宏常量 usb.h:1936-1937 USB_CTRL_GET/SET_TIMEOUT），类驱动自定超时（usb-storage 30s 等），usbfs 由用户传参 | usb.h 宏常量 :1936 | 时序义务落到每个调用方，漏传 timeout 的驱动无保护 |

## 2. 规避措施（按规范字面做会撞现实坑，代码主动绕开/加防御）

| # | 主题 | 规范假设 | Linux 防御 | 证据 |
|---|---|---|---|---|
| 2.1 | 控制器暴毙 | 寄存器读取有效、命令必完成 | MMIO 读回**全 1 即判死**（xhci_irq() 调 xhci_hc_died()，ring.c:3192-3195）；命令环 5s 超时（XHCI_CMD_DEFAULT_TIMEOUT，xhci.h）→ Abort + 等 Stop 事件再宽限 2s（xhci_abort_cmd_ring() ring.c:525-547） | ring.c:3192/:525-547 |
| 2.2 | 事件可信度防御链 | 事件 TRB 有效 | 无效 slot/EP → err_out（handle_tx_event() :2654）；端点 DISABLED（:2662）；事件 DMA 不在任何在册 TD → 判控制器坏并 -ESHUTDOWN（:2968-2974）；spurious success 识别（xhci_spurious_success_tx_event() :2600）；xrun 后新 TD 排队"不慌"只跳过一个（:2865-2889）；MISSED_SERVICE 且找不到 TD → 直接放弃等下一个事件（:2825）——以上除注明外均在 handle_tx_event() 内 | ring.c:2654-2974 多点 |
| 2.3 | 门铃时序门禁 | 4.6.x 散见的"不得在此状态下响铃" | 集中为**五态硬门禁**：EP_STOP_CMD_PENDING/SET_DEQ_PENDING/EP_HALTED/EP_CLEARING_TT/EP_DROP_PENDING 任一置位即不响铃 | xhci_ring_ep_doorbell() ring.c:566-568 |
| 2.4 | 取消/恢复状态机 | 4.6.9/4.10 给了 Stop Endpoint + Set TR Deq 流程，但**多 Stream 场景的缓存清理规范未给全** | 自补状态机 TD_DIRTY/TD_CLEARING_CACHE/TD_CLEARED/TD_CLEARING_CACHE_DEFERRED：跨 stream 的缓存清理逐流排队 defer（:1090-1097），避免错清它流缓存 | xhci_invalidate_cancelled_tds() ring.c:1036-1106 |
| 2.5 | Event Ring Full 只防不治 | 4.9.4 允许软件随时回写 ERDP；ER Full Error 是错误事件 | 消费过半即提前回写（xhci_handle_events() ring.c:3126-3127）主动腾位；真满无恢复路径（只能靠整体 halt 重建）——把规范允许的"错误后处理"改为"事前规避" | xhci_handle_events() ring.c:3126 |
| 2.6 | 设备端违约拦截 | ch9 定义设备义务 | usbcore 主动校验并拒绝：控制方向/wLength 不符（urb.c:409-419 "BOGUS control"）、maxp=0（:436-444）、未配置态提交（:432-434） | usb_submit_urb() urb.c:376-444 |
| 2.7 | 入队预检 | — | prepare_ring 按端点上下文状态分档：disabled/error 拒绝、未知状态拒绝、halted 放行（风险自担） | prepare_ring() ring.c:3274-3300 |
| 2.8 | 内存序防御 | 规范无此层 | 事件消费前 rmb（:3005）、TRB 主体写完再发所有权 wmb（:3254-3256）——平台正确性所需，规范之外 | xhci_handle_event_trb() ring.c:3005；queue_trb() ring.c:3254-3256 |
| 2.9 | LPM 黑名单 | LPM 是规范标准特性 | usb_enable/disable_lpm 完整实现（usb3_lpm_permit_store() port.c:312、usb2_lpm_l1_timeout_show/store() sysfs.c:527-549、usb_set_lpm_timeout() hub.c:4246-4249），但对违约设备整机禁用（USB_QUIRK_NO_LPM：模块参数路径 quirks_param_set() quirks.c:126、静态黑名单 usb_quirk_list[] :233/:240） | quirks.c :126/:233/:240 |

## 3. 未实现 / 未启用（规范有、通用路径代码无）

| # | 特性 | 规范出处 | 现状 | 证据 |
|---|---|---|---|---|
| 3.1 | **多中断器分摊**（MSI-X 多向量、每中断器独立事件环/合流） | xHCI 4.17、5.5.3 | 通用 IRQ 路径**只用 interrupters[0]**（"This is the handler of the primary interrupter"，xhci_irq() 内 ring.c:3221-3222）；secondary interrupter 基建存在但只服务 sideband 卸载（drivers/usb/host/xhci-sideband.c 在树，通用提交/完成路径不经它） | xhci_irq() ring.c:3221-3222 |
| 3.2 | **MFINDEX Wrap 事件** | xHCI TRB type 39 | 仅类型号与字符串映射（类型号宏 xhci.h:1163，字符串表 :1234/:2073），xhci_handle_event_trb() 的 switch（ring.c:3009-3027）无分支 → 不启用；排班改为直接读 MFINDEX 寄存器 + 模运算自对齐（xhci_get_isoc_start_frame() :4041、xhci_queue_isoc_tx() :4171-4172）。该事件 type 39：USBCMD.EWE=1 时由 xHC 在 MFINDEX 0x3FFF 到 0 回绕时产生（5.4.1/6.4.2.8） | xhci_handle_event_trb() ring.c:3009-3027 vs 类型号宏 xhci.h:1163 |
| 3.3 | **Force Event / Force Header 命令** | xHCI 1.1（TRB type 18/22；Force Event=VMM 向 VF 事件环注入事件、规范标注仅虚拟化用 4.11.4.11；Force Header=向 Root Hub 口发事务/链路管理包 4.11.4.15） | 仅有宏定义与字符串表（xhci.h:1135/1143），无任何 queue 使用点 | grep 全树仅 xhci.h 命中 |
| 3.4 | **等时时间戳主机通道**（ITP 到驱动/用户态的上报） | USB 3.2 ITP 机制 | ITP 由硬件接收，主机栈无对应 API：usb.h/devio.c 无 timestamp 面向等时的接口（grep 无命中） | grep 证无 |
| 3.5 | **PTM（Precision Time Measurement）消费链路** | USB 3.2 PTM | 规范侧 PTM 机制完备（USB3.2 8.4.8，SSP hub/host 强制实现）；内核侧仅 usb_get_status 支持读 PTM 状态选择器（usb_get_status() 头注释 message.c:1164，定义 :1184），无时间戳机制启用/消费（对比 PCIe 侧有完整 PTM 框架） | usb_get_status() 头注释 message.c:1164，定义 :1184 |
| 3.6 | **Device Notification 上层策略** | USB 3.2 协议层 DEV_NOTIFICATION TP（如 sublink/event 通告） | 收到 DEV_NOTE 事件只查 slot 有效性然后 xhci_dbg 日志丢弃（handle_device_notification() ring.c:1951-1965），无任何 usbcore 动作——主机侧选择最小实现（功能唤醒走端口resume路径） | handle_device_notification() ring.c:1951-1965 |
| 3.7 | **线缆协议本体** | USB2 ch7/ch8、USB3.2 三层 | 不在 Linux 代码域（硬件职责）；软件的"支持"止于协议能力表/speed ID 解析与端口 context 配置 | 口径声明 |

## 4. 交叉观察

1. **妥协集中在"硬件违约"与"吞吐"**：quirk 体系（1.1）+ 缺/多事件容忍（1.3/1.4）都是把"规范正确性"让位给"存量生态兼容"；BEI/合流（1.7）是纯性能取舍。
2. **规避集中在"状态机与时序"**：Linux 对规范里所有"软件 shall 保证"的时序点（门铃、ERDP、取消流程）都加了状态机硬门禁和防御（2.2-2.5），哲学是**不信硬件假设、宁可降级不可挂死**（hc_died、-ESHUTDOWN 的出口很多）。
3. **未实现集中在"新特性与时间域"**：多中断器、虚拟化注入命令（Force Event，规范标注仅虚拟化用）、时间戳类（ITP/PTM）全部缺席或最小化——主线对"能用但不赚钱的特性"保持保守；sideband 基建（3.1）是唯一的破例，服务虚拟化/卸载场景。
4. 与规范"最像规范"的部分反而是**等时排班**（4.11.2.5 窗口逐条实现，xhci_get_isoc_start_frame() ring.c:4021-4074）和**完成码语义**（6.4.5 完成码表 → errno 映射逐条落地）——这两块硬件无法兜底，必须软件精确做。

## 5. 复核命令

```bash
T=/Volumes/KernelSrc/linux
# quirk 名单与计数
grep -nE "#define XHCI_.*BIT_ULL" $T/drivers/usb/host/xhci.h
# 多中断器/主中断器声明
grep -n "primary interrupter" $T/drivers/usb/host/xhci-ring.c
# MFINDEX_WRAP / Force Event / Force Header 使用面
grep -rn "TRB_MFINDEX_WRAP\|TRB_FORCE_EVENT\|TRB_FORCE_HEADER" $T/drivers/usb/host/
# PTM / 等时时间戳
grep -rn "PTM" $T/drivers/usb/core/message.c
grep -n "timestamp" $T/drivers/usb/core/devio.c
# 排班窗口（4.11.2.5）
sed -n '4021,4093p' $T/drivers/usb/host/xhci-ring.c
```
