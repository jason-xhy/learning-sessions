# 4.3 补丁分析 · EP0 avg_trb_len=8 —— Set avg_trb_len = 8 for EP0 during Address Device Command

- 上游 commit（正文引用一律此主线上游 hash）：`f72b9aa821a2bfe4b6dfec4be19f264d0673b008`（2025-07-17，作者 Jay Chen <shawn2000100@gmail.com>）
- 本地核验：同内容 stable 回移件 `dabf502ee8938159047f18c1a69f4efcef06dc27`（hunk 基线行号不同：stable `@@ -1182,6 +1182,8 @@` vs 主线 `@@ -1195,6 +1195,8 @@`）
- 文件/体量：`drivers/usb/host/xhci-mem.c` +2 行；对映课程小节：4.3 设备初始化（Address Device 输入上下文节拍）

## 背景（何时 / 何硬件 / 谁报）

2025 年 7 月，Jay Chen 报告：其公司正在开发一个严格遵循 xHCI 规范的自研虚拟 xHC 硬件平台，验证阶段设备枚举失败——Address Device 命令回 TRB Completion Code = 5（Parameter Error），bug 单在 kernel bugzilla 220033。根因不在虚拟平台自身，而是 Linux 驱动对规范两处条文的取舍：初始化输入端点上下文时全字段清零，其中 Average TRB Length（avg_trb_len）= 0，而严格按规范实现的控制器会判定该参数非法。主流真实硬件恰好不校验这个字段，问题因此在真机上从未暴露——虚拟平台反而成了规范的忠实裁判。对应课程 4.3 的 Address Device 输入上下文节拍。

## 要解决的问题（症状 + 机制）

症状：严格按规范实现的（虚拟）xHC 在 EP0 编址时返回 Parameter Error（完成码 5），设备枚举失败。机制：规范 §4.8.2（Endpoint Context Initialization）要求输入端点上下文所有字段初始化为 0；§6.2.3（Endpoint Context）却规定 Average TRB Length 应大于 0，且明确「Software shall set Average TRB Length to 8 for control endpoints」——两条条文在全 0 初始化面前互相矛盾。avg_trb_len 用于带宽计算，对控制端点填 0 没有意义。驱动此前按 §4.8.2 字面义把 EP0 的 avg_trb_len 留成 0：宽容的硬件忽略它，严格的硬件判错。课程侧对应证据：§4.3.3（p76）「Allocate an Input Context data structure (6.2.5) and initialize all fields to 0」之后逐字段初始化 EP0 Context——补丁即在这条全 0 路径上为控制端点开例外。

## 代码逻辑（补丁前 → 后行为对照）

+2 行（`drivers/usb/host/xhci-mem.c`，xhci_setup_addressable_virt_dev()）：在 `ep0_ctx->deq` 赋值之后、trace 之前插入 `ep0_ctx->tx_info = cpu_to_le32(EP_AVG_TRB_LENGTH(8));`（含一个空行）。补丁前：tx_info 整体为 0（含 avg_trb_len），严格控制器判 Parameter Error（CC=5）→ 枚举失败。补丁后：EP0 的 Average TRB Length = 8，与 §6.2.3 控制端点建议一致，虚拟 xHC 枚举通过；真实硬件行为不变。tx_info 是 Endpoint Context 里承载 Average TRB Length 的字组，该值供带宽计算使用；而 Address Device 命令的参数正是指向这份 Input Context（§4.3.3 p76：「Issue an Address Device Command…where the command points to the Input Context data structure」）——与代码摘录（drafts/code-excerpts.json dev 组 L4404/L4412/L4416 的编址路径）对读，补丁改的就是命令带上报给 xHC 的上下文内容。验收口径：正文引用一律主线上游 hash f72b9aa821a2，本地另以 stable 回移件 dabf502ee893 做同内容 diff 核验——两树基线行号不同，新增行逐字相同。

### diff 逐字切片（主线 hash 现场取：`git -C /Volumes/KernelSrc/linux show f72b9aa821a2bfe4b6dfec4be19f264d0673b008`）

commit `f72b9aa821a2bfe4b6dfec4be19f264d0673b008` · `drivers/usb/host/xhci-mem.c` · hunk `@@ -1195,6 +1195,8 @@`（新增 2 行：赋值 + 空行）

```diff
diff --git a/drivers/usb/host/xhci-mem.c b/drivers/usb/host/xhci-mem.c
index 6680afa4f596..07289333a1e8 100644
--- a/drivers/usb/host/xhci-mem.c
+++ b/drivers/usb/host/xhci-mem.c
@@ -1195,6 +1195,8 @@ int xhci_setup_addressable_virt_dev(struct xhci_hcd *xhci, struct usb_device *ud
 	ep0_ctx->deq = cpu_to_le64(dev->eps[0].ring->first_seg->dma |
 				   dev->eps[0].ring->cycle_state);
 
+	ep0_ctx->tx_info = cpu_to_le32(EP_AVG_TRB_LENGTH(8));
+
 	trace_xhci_setup_addressable_virt_device(dev);
 
 	/* Steps 7 and 8 were done in xhci_alloc_virt_device() */
```

### 规范锚点

> Allocate an Input Context data structure (6.2.5) and initialize all fields
—— evidence/spec-43.txt L271（§·p75）

> Initialize the Input default control Endpoint 0 Context (6.2.3). 
> •  
> EP Type = Control. 
> •  
> Max Packet Size = The default maximum packet size for the Default Control 
> Endpoint, as function of the PORTSC Port Speed field. 
> •  
> Max Burst Size = 0. 
> •  
> TR Dequeue Pointer = Start address of first segment of the Default Control 
> Endpoint Transfer Ring. 
> •  
> Dequeue Cycle State (DCS) = 1. Reflects Cycle bit state for valid TRBs written by 
> software. 
> •  
> Interval = 0. 
> •  
> Max Primary Streams (MaxPStreams) = 0. 
> •  
> Mult = 0. 
> •  
> Error Count (CErr) = 3.
—— evidence/spec-43.txt L301-L321（§·p76）

> Issue an Address Device Command for the Device Slot, where the 
> command points to the Input Context data structure described above. Refer to 
> sections 3.3.4 and 6.4.3.4 for more information on the Address Device 
> Command.
—— evidence/spec-43.txt L331-L333（§·p76）
