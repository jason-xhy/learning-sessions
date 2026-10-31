# EVIDENCE.md —— Fig2「环形分度轨道：传输环的生产与消费」

判据版本：
- 规范：**xHCI 1.2b**（Document Number 625472, Revision 1.2b），文本版 `/tmp/spec-audit-txt/xhci-1.2b.txt`，页码 = 文件 `===== [PAGE n] =====` 页标。
- 内核：`/Volumes/KernelSrc/linux` @ **d9008e061539**（7.3.0-rc7），行号全部现场 `grep -n` 勘定。
- 时序：`specs/actionflow-0007-xhc-ring-keys.md`（帧序权威重建）。

画面承载的每条断言逐条列示。行号格式 `file:line`。

## 1. 机器隐喻与所有权方向

| # | 画面断言 | 判据出处 |
|---|---|---|
| 1.1 | 铭牌「软件 · 生产者」握 enqueue 指针：软件把 TRB 写入传输环的 Enqueue 端 | §4.9.2 [PAGE 152]：「The producer (host) places items in a Transfer Ring at the Enqueue Pointer」 |
| 1.2 | 铭牌「xHC · 消费者」握 dequeue 指针：xHC 从 Dequeue 端取走 | §4.9.2 [PAGE 152]：「the consumer (xHC) removes items from the Transfer Ring at the Dequeue Pointer」；内核注释 xhci-ring.c:191「See Cycle bit rules. SW is the consumer for the event ring only.」（传输环消费者是 xHC） |
| 1.3 | 读数 `enqueue n · dequeue m · 生产轮色 · 满空态`：两端指针为软件/xHC 各自私有副本 | §4.9.2 [PAGE 153]：「Software uses and maintains private copies of the Enqueue and Dequeue Pointers」；xHC 同样私有（同页） |

## 2. Cycle 位与色带（§4.9.2.2 四条规则）

| # | 画面断言 | 判据出处 |
|---|---|---|
| 2.1 | F0：16 槽色带全为旧色（cycle=0 蓝），生产轮色=1 | §4.9.2.2 [PAGE 157]：「The Cycle bit shall be initialized by software to '0' in all TRBs of all segments when initializing a ring」；「The Producer Cycle State (PCS) and the Consumer Cycle State (CCS) bits shall be set to '1' when a ring is initialized」；内核 xhci-mem.c:327 `xhci_initialize_ring_info`：`ring->cycle_state = 1`（注释「New rings are initialized with cycle state equal to 1」），段内存 `dma_pool_zalloc` 清零 → 槽内 cycle=0 |
| 2.2 | 冲压=生产者以当前生产轮色（PCS）写 Cycle 位；每写一颗推进一次 | §4.9.2.2 [PAGE 157]：「The Cycle bit shall be written by the producer with the current value of the PCS bit」；Fig 4-8 [PAGE 157]：Write TRB → 「TRB Cycle bit = PCS」→「Enqueue Pointer += 16」；§4.9.2 [PAGE 153]「Software advances its copy of the Enqueue Pointer … every time it writes a TRB」；内核 xhci-ring.c:3246 `queue_trb` → :3257 `wmb()` 后写控制字 → `inc_enq`（:290） |
| 2.3 | 取件=Cycle 位对消费者只读；取走后槽内残留不擦除（色带保持残留色，托盘离槽表示空） | §4.9.2.2 [PAGE 157]：「The Cycle bit shall be treated as Read-Only by the consumer」；actionflow-0007 §1.2 第 4 步「取走后槽内 cyc=1 原样残留」；§4.11.1.1 [PAGE 188]：「All components of all Command and Transfer TRBs shall be treated as read-only by the xHC」 |
| 2.4 | 消费者只取 Cycle 位==CCS 的槽（行车只夹「本轮消费色」托盘） | §4.9.2.2 [PAGE 157]：「The Consumer may execute a TRB referenced by the Dequeue Pointer whose Cycle bit equals CCS」；「If they are not equal, then the consumer shall stop processing TRBs」；内核 xhci-ring.c:142 `unhandled_event_trb` 比对 `(flags & TRB_CYCLE) == ring->cycle_state` |
| 2.5 | PCS/CCS 不落在任何寄存器或数据结构（画面只有指针牌与色带，无 CCS 寄存器刻字） | §4.9.2.2 [PAGE 157] Note：「These flags are NOT defined in xHC registers or data structures」 |
| 2.6 | 翻色杆 TC 拨动 → 生产轮色翻转（1→0），新一轮与前一轮相反 | §4.9.2.2 [PAGE 158]：「if the Toggle Cycle bit is set to '1' in the Link TRB, the PCS bit shall be toggled by the Producer」；Fig 4-8：「PCS = −PCS」；内核 xhci-ring.c:239 `inc_enq_past_link`：`wmb(); …control ^= TRB_CYCLE; if (link_trb_toggles_cycle) ring->cycle_state ^= 1`（:259-265） |

## 3. 空/满判据（F0 / F5 对照刻字）

| # | 画面断言 | 判据出处 |
|---|---|---|
| 3.1 | 卡底刻「空：DEQ=ENQ 且 cyc≠CCS」 | §4.9.2.2 [PAGE 156]：「A ring is defined as "empty" if the Dequeue Pointer is equal to the Enqueue pointer. The value of the Enqueue Pointer is defined by the Cycle bit transition.」 |
| 3.2 | 卡底刻「满:ENQ 前槽 cyc=CCS(有未取件)」 | §4.9.2 [PAGE 153]：「If advancing the Enqueue Pointer would make it equal to the Dequeue Pointer then the Transfer Ring is full and software shall wait for Transfer Events」；§4.9.2.2 [PAGE 156]：「The ring is defined as "full" if advancing the Enqueue Pointer will make it equal to the Dequeue Pointer. Software shall take Link TRBs into account」 |
| 3.3 | F5/F6 满环警报灯亮（F6=解锁后重冲再追平）：满由软件把关；占位判定=ENQ==DEQ 且 ENQ 前槽 cyc==CCS | §4.9.2 [PAGE 153]：「To prevent overruns, software shall determine when the Ring is full」（§4.9.2.2 同义）；内核 xhci-ring.c:3270 `prepare_ring`（余量把关，不足扩容/拒绝）+ :350 `xhci_num_trbs_free` |
| 3.4 | F6 消费解锁：取走 2/3/4 槽 → 空位再现，生产者继续 | §4.9.2 [PAGE 153]：「software shall wait for Transfer Events that will advance the Dequeue Pointer」→ 事件推进 dequeue 后可继续写入 |

## 4. Link TRB 接续导轨（F4 回绕）

| # | 画面断言 | 判据出处 |
|---|---|---|
| 4.1 | 段末槽（15）恒为 Link TRB（桥架 + 托板 + 链片记号，永久在槽） | §4.9.2.1 [PAGE 155]：「The last TRB in a Ring Segment is always a Link TRB.」；§4.11.5.1 [PAGE 206]：「A Link TRB shall be the last TRB of each Transfer or Command Ring Segment」；内核 xhci-mem.c:97 `xhci_set_link_trb`（把段末 TRB 写成 `TRB_TYPE(TRB_LINK)`，segment_ptr=下段址） |
| 4.2 | Link 卡：Type=6、TC=1、CH=0、IOC=0、C=翻色；Ring Segment Pointer → 段首（0 槽） | §6.4.4.1 [PAGE 462-463] Table 6-86：bit0 C、bit1 TC、bit4 CH、bit5 IOC、bits15:10 TRB Type；Table 6-84：bits 63:4 Ring Segment Pointer；§4.11.5.1 [PAGE 206]：「The Ring Segment Pointer field of a Link TRB shall point to the next Segment … or to first segment in a single Segment ring」；Type=6：Table 6-91 [PAGE 469-470] |
| 4.3 | TC=1 是单段环末段 Link 的取法（内核仅末段置 LINK_TOGGLE） | §4.11.5.1 [PAGE 207]：「The Toggle Cycle flag should be set in at least one Link TRB of a ring.」（建议性）；内核 xhci-mem.c:130：仅 `ring->last_seg` 的 Link `|= LINK_TOGGLE`（xhci.h:960 `LINK_TOGGLE = BIT(1)`），注释引 §4.9.2.1/§6.4.4.1 |
| 4.4 | 生产者跨过 Link 时把 Link 自身 Cycle 位写成当前 PCS，然后翻色、指针跳回段首 | §4.11.5.1 [PAGE 207]：「As software advances its Enqueue Pointer and advances over a Link TRB, the Cycle (C) bit shall be updated with the value of the PCS flag.」；§4.9.2.2 [PAGE 158]：「the Enqueue Pointer shall be set to Link TRB Ring Segment Pointer and … PCS bit shall be toggled」；内核 xhci-ring.c:259-268（先翻 Link 的 cycle，TC 命中再 `cycle_state ^= 1`，跳下段首） |
| 4.5 | 消费者过 Link 对称翻 CCS（EVIDENCE 口径；本片未演出消费者回绕） | §4.9.2.2 [PAGE 158]：「if the Toggle Cycle bit is set to '1' in the Link TRB, the CCS bit shall be toggled by the Consumer」；Note [PAGE 158]：「A Cycle bit transition takes place between a Link TRB and the first TRB of the segment that the Link TRB Ring Segment Pointer references.」 |

## 5. 门铃（F2）

| # | 画面断言 | 判据出处 |
|---|---|---|
| 5.1 | 门钮铭牌「Doorbell · DB Target=2 · EP1 OUT」 | §5.6 + Table 5-43 [PAGE 394-395]：DB Target bits 7:0；Device Context Doorbells 表：`2 = EP 1 OUT Enqueue Pointer Update` |
| 5.2 | 门铃响后取件臂才开始取件（F2 门铃→取件） | §4.7 Doorbells [PAGE 142]（门铃通知 xHC 有新工作）；actionflow-0007 §1.1 三视角流程第 2 步「xHC：收到门铃 → 从 TR Dequeue Pointer 起顺序取指」；内核 xhci-ring.c:558 `xhci_ring_ep_doorbell` → `writel(DB_VALUE(ep_index, stream_id), db_addr)`；xhci.h:313 `DB_VALUE(ep,stream) = ((ep+1)&0xff) \|(stream<<16)` |
| 5.3 | EP1 OUT 的门铃值=2 | 内核 xhci.c:1455 `xhci_get_endpoint_index`：`index = epnum*2 + dir −1`（OUT=0）→ EP1 OUT index=1；门铃=index+1=2（xhci.h:313）＝Table 5-43 的「EP 1 OUT」 |

## 6. 位域刻度卡（Normal TRB，F1/F5 演示值）

卡面字段与演示值（EP1 OUT bulk，3×6144 B URB → 每 TD 一颗 Normal TRB）：

| # | 卡面断言 | 判据出处 |
|---|---|---|
| 6.1 | 行结构 DW0–DW3 = Offset 03-00H / 07-04H / 0B-08H / 0F-0CH；每行 32 刻度、8 位一主刻度，字节位号 31/23/15/7 | §6.4.1.1 [PAGE 427] Figure 6-8（Normal TRB 图：03-00H/07-04H/0B-08H/0F-0CH 四行）；TRB Template §4.11.1 [PAGE 188] |
| 6.2 | DW0/DW1 = Data Buffer Pointer Lo/Hi（bits 63:0） | §6.4.1.1 [PAGE 427] Table 6-20：「63:0 Data Buffer Pointer Hi and Lo」 |
| 6.3 | DW2：TRB Transfer Length bits 16:0 = **6144**（OUT=待发送字节数，0..64K）；TD Size bits 21:17 = **0**；Interrupter Target bits 31:22 = **0** | Table 6-21 [PAGE 427-428]：「16:0 TRB Transfer Length. For an OUT, this field defines the number of data bytes the xHC shall send … Valid values are 0 to 64K」；「21:17 TD Size. This field provides an indicator of the number of packets remaining in the TD」；「31:22 Interrupter Target」；内核 xhci-ring.c:3616 `xhci_queue_bulk_tx`：`length_field = TRB_LEN(trb_buff_len) \| TRB_TD_SIZE(remainder) \| TRB_INTR_TARGET(0)`，TRB_LEN=(p)&0x1ffff（xhci.h:1036）、TRB_TD_SIZE=min(p,31)<<17（:1038）、TRB_INTR_TARGET=(p&0x3ff)<<22（:1043） |
| 6.4 | TD Size=0 的算术：单 TRB TD 恒 0（图例只作解释，不画多 TRB 算术） | §4.11.2.4 [PAGE 197-198]：「TD Size (x) = 0」（末 TRB 恒 0）、「The TD Size field of a TRB defines a number of packets that remain to be transferred for a TD after processing … the current TRB and all previous TRBs」；内核 xhci-ring.c:3521 `xhci_td_remainder`：`trb_buff_len == td_total_len` 时 return 0 |
| 6.5 | DW3：C bit0=1、ENT bit1=0、ISP bit2=0（OUT 不置 ISP）、NS bit3=0、CH bit4=0、IOC bit5=1、IDT bit6=0、TRB Type bits15:10=1。OUT 不置 ISP 的实码：xhci-ring.c:3723 `if (usb_urb_dir_in(urb)) field \|= TRB_ISP`（仅 IN） | §6.4.1.1 [PAGE 428] Table 6-22 逐位：0 Cycle bit、1 ENT、2 ISP、3 NS、4 CH、5 IOC、6 IDT、9 BEI、15:10 TRB Type；内核 xhci.h:1047 `TRB_CYCLE=BIT(0)`、:1054 `TRB_ISP=BIT(2)`、:1058 `TRB_CHAIN=BIT(4)`、:1060 `TRB_IOC=BIT(5)`、:1102 `TRB_TYPE(p)=p<<10`、:1106 `TRB_NORMAL=1` |
| 6.6 | CH=0：单 TRB TD 的末 TRB 清 chain | §6.4.1.1 Table 6-22 [PAGE 428]：「The Chain bit is always '0' in the last TRB of a TD.」；内核 xhci-ring.c:3709-3713（末 TRB `field &= ~TRB_CHAIN; field |= TRB_IOC; td->end_trb=…`） |
| 6.7 | IOC=1：每 TD 恰一颗收尾事件（bulk 口径） | §6.4.1.1 Table 6-22 [PAGE 428]：「If this bit is set to '1' … placing an Transfer Event TRB on the Event ring and asserting an interrupt」；内核 xhci-ring.c:3710 `field \|= TRB_IOC`（末 TRB） |
| 6.8 | IDT=0（6 KiB > 8 B，不满足立即数据条件） | §6.4.1.1 [PAGE 429]：「the Length field shall contain a value between '0' and '8'」；内核 xhci-ring.c:3714 `xhci_urb_suitable_for_idt(urb)` 仅小包置 `TRB_IDT` |
| 6.9 | 卡题「EP1 OUT bulk · 6144 B · 单 TRB TD」：3 个 6 KiB URB → 3 TD × 1 Normal TRB | 6144 B ≤ 64K 且不跨 64K 边界 → `count_trbs_needed` = 1（内核 xhci-ring.c:3647 `num_trbs = count_trbs_needed(urb)`，一条连续缓冲一颗 TRB）；「TRB buffer should not cross 64KB boundaries」（:3679 注释） |
| 6.10 | 首颗 TRB 发布前反极性压着、giveback 时才翻（动画未展开，口径记档） | 内核 xhci-ring.c:3687-3690（first_trb 按 start_cycle 反极性写入）+ :3439 `giveback_first_trb`（wmb → 翻首 TRB cycle → :3452 门铃）；actionflow-0007 §1.4 |
| 6.11 | Link 卡（F4）：标题「Link TRB · Type 6」+ 同一套四行位域 | §6.4.4.1 [PAGE 462] Figure 6-38 + Tables 6-84/85/86（见 4.2）；Table 6-91 [PAGE 469]：ID 6 = Link（Transfer Ring Allowed） |
| 6.12 | TD Size 图例「=本 TRB 之后该 TD 剩余 MPS 包数 · 单 TRB TD 恒 0」 | §4.11.2.4 [PAGE 197]（见 6.4）；§6.4.1.1 Table 6-21 [PAGE 427-428]「an indicator of the number of packets remaining in the TD」 |
| 6.13 | 满/空判据刻字（见 §3） | §4.9.2 / §4.9.2.2（见 3.1/3.2） |

## 7. 演示样例算术

| # | 画面断言 | 判据出处 |
|---|---|---|
| 7.1 | 6 KiB = 6144 B（卡面 TX Length=6144，不出现 130KB/131072 混写） | 6×1024=6144；MPS=1024（USB2 high-speed bulk，§4.11.2.4 的 TD Packet Count=ROUNDUP(6144/1024)=6 包，单 TRB 后剩余 0） |
| 7.2 | 3 个 URB → 3 个 TD；环上逐槽独立托盘 | 每次提交独立 `xhci_queue_bulk_tx`（xhci-ring.c:3616）；actionflow-0007 §1.4 TD1/TD2 逐件排队口径 |

## 8. 避雷清单核对（DESIGN.md §1 逐条）

| # | 条目 | 本片处理 |
|---|---|---|
| 8.1 | Cycle 规则出处=§4.9.2.2（不是 4.9.2.1） | 全部刻字/读数按 §4.9.2.2（见 §2），无一处 4.9.2.1 |
| 8.2 | Ring Overrun/Underrun 判据都是「环空」，不写「IN 环满」 | 本片为 OUT 环，只按 §4.9.2 满定义刻字，未涉及 IN 环满措辞 |
| 8.3 | CRCR：CRR=1 时写入被忽略 | 本片无 CRCR 元素（命令环归 Fig4），不复现错误机理 |
| 8.4 | 1.2b 无 Initialize Endpoint 命令 | 未出现 |
| 8.5 | 事件环初态口径 | 本片不画事件环（归 Fig3） |
| 8.6 | 完成码表=Table 6-90 | 未画完成码 |
| 8.7 | 「同一 hardirq 跑完事件链」不作断言 | 未涉及事件链（归 Fig3） |
| 8.8 | giveback_first_trb 是新 TD 入队路径的发布点 | 仅记档于 6.10，画面未刻行号 |
| 8.9 | 页码按 1.2b 页标 | 本 EVIDENCE 全部为 /tmp 提取本页标 |
| 8.10 | `xhci_reset_device` 不存在 | 未引用该函数 |
| 8.11 | DB Target：EP0=1、0=Reserved（Table 5-43）；命令环 target=0 归 Fig4 | 本片只刻 EP1 OUT=2；未画 0/1 语义 |

## 9. 帧序 ↔ actionflow-0007 对应

| 帧 | 画面 | actionflow/规范依据 |
|---|---|---|
| F0 | 空环（槽 cyc=0 ≠ PCS/CCS=1，xHC 扫描停摆=空） | actionflow §1.2 三视角流程 1-2 步；§4.9.2.2 [PAGE 156-157] |
| F1 | 冲压 0/1/2（cycle=1），enqueue→3，卡值全刻 | actionflow §1.2 流程 3 步；queue_trb/giveback 口径（§6.4-6.7） |
| F2 | 门铃（DB Target=2）→ 取件 0/1，dequeue→2，收料架 +2 | actionflow §1.1 流程 2-4 步；Table 5-43（§5） |
| F3 | 续冲 3..14，enqueue→15（Link 槽） | actionflow §1.3 流程 3 步（走到段尾 Link） |
| F4 | Link 特写：翻色杆、Link 槽 Cycle=PCS、轮色 1→0、enqueue 回 0 | actionflow §1.2 流程 5 步 + §1.3 流程 3 步；§4.9.2.2/§4.11.5.1（§4） |
| F5 | 重冲 0/1（新轮色 0），enqueue 追平 dequeue=2 → 满环警报 | §4.9.2/§4.9.2.2 满定义（§3.2/3.3）；prepare_ring 把关口径 |
| F6 | 消费者取走 2/3/4（dequeue→5，收料架 5 件）→ 生产者以第二轮色（Cycle=0）重冲 2/3/4，enqueue=5 追平 dequeue；ENQ 前槽 5 残留 cyc=1==CCS=1 → 满环，警报亮。相位词=占位判定（ENQ==DEQ 且 ENQ 前槽 cyc==CCS → 满环） | §4.9.2 [PAGE 153]（满定义+「wait for Transfer Events that will advance the Dequeue Pointer」）；§4.9.2.2 [PAGE 156]；评分门 R1 修订见 DESIGN.md §5 |

## 10. 画面装饰与语义边界

- 无语义装饰（刻度带、螺栓、铭牌划线、工艺环）不携带数值；凡刻数处（槽位号 0/4/8/12、门铃牌、卡面字段、读数）均在上表。
- 「环与 TRB 对设备不可见」锚点属 Fig1（DESIGN.md §2），本片不重复承载。
- 槽位号 0/4/8/12 为机刻刻度（便于读出 enqueue/dequeue 数值），非规范内容。
