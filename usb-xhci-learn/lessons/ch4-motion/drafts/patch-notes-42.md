# 4.2 补丁分析 · 复位失败如实报错 —— return an error if the host is not halted

- 上游 commit：`24d2a690fb83c40913c0b3f38151ae3997a5898f`（2026-10-09，作者 Henry Tseng <henrytseng@qnap.com>，QNAP）
- 文件/体量：`drivers/usb/host/xhci.c` 1 行；hunk `@@ -195,7 +195,7 @@`（xhci_reset）
- 对映课程小节：4.2 控制器初始化（halt→reset 握手节拍）；diff 与引文均为现场提取。

## 背景（何时 / 何硬件 / 谁报）

2026 年 10 月，QNAP（NAS 存储厂商）的 Henry Tseng 报告并提交：xhci_reset() 在主机控制器未 halted（未停机）时直接中止复位路径，却不写 CMD_RESET、也不返回错误。触发场景是主机未停机就有路径对控制器调用复位（驱动探测/恢复流程）。硬件无关——这是纯软件状态机的返回值语义缺陷。对应课程 4.2 的 halt→reset 握手节拍：复位的前提（主机已停机）与完成（CNR 清零）都要靠状态位逐级确认，前提不满足时必须把失败如实上抛，而不是伪装成功。

## 要解决的问题（症状 + 机制）

症状：调用方检查 xhci_reset() 返回值时被告知「复位成功」，而复位实际上根本没有执行——这是全部复位失败路径里唯一一个「失败却返回 0」的分支。机制：xhci_reset() 开头读 USBSTS 状态，若 `(state & STS_HALT) == 0`（主机未 halted），按语义复位应当中止；补丁前这个分支 `return 0`，与后续「写 CMD_RESET → handshake 等 CNR 清零 → 失败返回超时错误」的其他路径语义不一致。规范背景（§4.2 p69）：复位不是瞬时动作，而是带握手的流程——芯片硬件复位后要等 `USBSTS.CNR` 清零才允许写其它 Operational/Runtime 寄存器；前提不满足就应报错，让调用链不至于在「复位已完成」的假象上继续初始化。

## 代码逻辑（补丁前 → 后行为对照）

单行改动（`drivers/usb/host/xhci.c`，xhci_reset）：未 halted 中止分支 `return 0` → `return -EBUSY`。补丁前：中止复位被当成成功，调用方在错误状态下继续走初始化。补丁后：-EBUSY 把「主机忙、未停机」如实上抛，调用方走错误处理——xhci_reset 的所有失败出口（未 halted / handshake 超时）语义一致。与代码摘录（drafts/code-excerpts.json init 组 L229，同函数内 `xhci_handshake(&xhci->op_regs->status, STS_CNR, 0, timeout_us)`）对读：那条握手失败会返回超时错误，本补丁让"没进入复位"同样返回错误；凡依赖返回值判断复位成败的调用方（探测、休眠恢复、错误恢复路径）从此拿到一致语义，验收时可直接对 -EBUSY 分支验证未停机场景。

### diff 逐字切片（`git -C /Volumes/KernelSrc/linux show 24d2a690fb83c40913c0b3f38151ae3997a5898f` 现场取）

commit `24d2a690fb83c40913c0b3f38151ae3997a5898f` · `drivers/usb/host/xhci.c` · hunk `@@ -195,7 +195,7 @@`（1 行语义修改）

```diff
diff --git a/drivers/usb/host/xhci.c b/drivers/usb/host/xhci.c
index a9e47e178c28..2af6a7b91e55 100644
--- a/drivers/usb/host/xhci.c
+++ b/drivers/usb/host/xhci.c
@@ -195,7 +195,7 @@ int xhci_reset(struct xhci_hcd *xhci, u64 timeout_us)
 
 	if ((state & STS_HALT) == 0) {
 		xhci_warn(xhci, "Host controller not halted, aborting reset.\n");
-		return 0;
+		return -EBUSY;
 	}
 
 	xhci_dbg_trace(xhci, trace_xhci_dbg_init, "// Reset the HC");
```

### 规范锚点

> After Chip Hardware Reset6 wait until the Controller Not Ready (CNR) flag 
> in the USBSTS is ‘0’ before writing any xHC Operational or Runtime 
> registers.
—— evidence/spec-42.txt L18-L19（§·p69）
