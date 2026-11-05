# 4.1 补丁分析 · wmb 门铃序 —— make sure TRB is fully written before giving it to the controller

- 上游 commit：`576667bad341516edc4e18eb85acb0a2b4c9c9d9`（2021-01-15，作者 Mathias Nyman <mathias.nyman@linux.intel.com>）
- 文件/体量：`drivers/usb/host/xhci-ring.c` +2 行；hunk `@@ -2931,6 +2931,8 @@`（queue_trb）
- 对映课程小节：4.1 命令操作（上环→门铃节拍）；diff 与引文均为现场提取（git show / evidence 切片），禁誊抄。

## 背景（何时 / 何硬件 / 谁报）

2021 年 1 月，xHCI 子系统维护者 Mathias Nyman（Intel）合入这枚补丁。问题发现于压力测试：多个 USB 设备同时在线、反复取消 URB 的场景——两条「Set TR Dequeue Pointer」命令背靠背进入命令环，第二条命令 TRB 还没写完就被控制器取走解析。硬件本身没有缺陷，这是纯软件侧的内存序问题：门铃敲响后 xHC 会立即回来解析命令环上 cycle 位已就绪的命令 TRB（§4.1 p68 的发出节拍），而驱动「先写完 TRB、再敲门铃」这个顺序在写缓冲与多核环境下并没有任何机制保证。对应课程 4.1 的三拍：上环→敲门铃→xHC 取指执行，补丁保证第一拍真正先于第二拍对硬件生效。

## 要解决的问题（症状 + 机制）

症状：压力测试中反复出现 `"Mismatch between completed Set TR Deq Ptr command & xHCI internal state"` 告警，出环指针被设成 bogus 值。机制：命令 TRB 长 16 字节，驱动分四个 32 位分片写入，含 cycle bit 的分片安排在最后写——但这只是程序顺序，普通 store 不保证实际落盘次序；当前一条命令完成、硬件立刻回来取下一条时，可能读到只写了一半、而 cycle bit 恰好已置位的 TRB，于是照常执行。规范背景（§4.1 p68）：命令的发出流程是「把命令 TRB 放上命令环，然后敲命令门铃寄存器 0」——"放完才敲"的语义在 SMP 下必须由写屏障兑现，否则门铃会抢在 TRB 完整之前通知 xHC。

## 代码逻辑（补丁前 → 后行为对照）

补丁前：`queue_trb()` 依次写 `field[0..3]`，`field[3]`（含 cycle bit）程序上最后写但无屏障——硬件可能在 `field[0..2]` 尚未全局可见时就看到 cycle 位翻转，取走半颗 TRB。补丁后：在写 `field[3]` 之前插入 `wmb()` 写屏障并加注释行（+2 行），保证前三个分片先于 cycle 位翻转全局可见——"TRB 完整写好才交给控制器"由架构屏障兑现；此后命令完成事件（Command Completion Event，§4.1 p68）回执对应的总是一颗完整 TRB。与代码摘录（drafts/code-excerpts.json cmd 组 L4397 `queue_trb(...)` 入环行、L438 门铃行）对读，补丁改动恰好落在"写 TRB"与"敲门铃"两拍之间的写路径上；对映课程动画，节拍从此是"写四片 → wmb → cycle 翻转 → 门铃"，任何一环都不会被硬件抢先看到。

### diff 逐字切片（`git -C /Volumes/KernelSrc/linux show 576667bad341516edc4e18eb85acb0a2b4c9c9d9` 现场取）

commit `576667bad341516edc4e18eb85acb0a2b4c9c9d9` · `drivers/usb/host/xhci-ring.c` · hunk `@@ -2931,6 +2931,8 @@`（新增 2 行：注释 + wmb()）

```diff
diff --git a/drivers/usb/host/xhci-ring.c b/drivers/usb/host/xhci-ring.c
index 5677b81c0915..cf0c93a90200 100644
--- a/drivers/usb/host/xhci-ring.c
+++ b/drivers/usb/host/xhci-ring.c
@@ -2931,6 +2931,8 @@ static void queue_trb(struct xhci_hcd *xhci, struct xhci_ring *ring,
 	trb->field[0] = cpu_to_le32(field1);
 	trb->field[1] = cpu_to_le32(field2);
 	trb->field[2] = cpu_to_le32(field3);
+	/* make sure TRB is fully written before giving it to the controller */
+	wmb();
 	trb->field[3] = cpu_to_le32(field4);
 
 	trace_xhci_queue_trb(ring, trb);
```

### 规范锚点

> All xHC commands are issued by placing the desired Command TRB(s) (Section 
> 6.4.3 Command TRBs) on the Command Ring, then ringing the xHC command 
> Doorbell register, that is, writing the Host Controller Command code to the DB 
> Target field of Doorbell register 0 (refer to Section 5.6 Doorbell Registers).
—— evidence/spec-41.txt L8-L10（§·p68）

> All commands result in the generation of a Command Completion Event TRB 
> (Section 6.4.3 Command TRBs) on the Event Ring.
—— evidence/spec-41.txt L19（§·p68）
