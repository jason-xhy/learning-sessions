# 4.1 落地页 · ① 规范与代码分析（文字稿）

> P6 落地页装配用文字稿（小节 4.1 命令操作（§4.1 · p68））。引文与贴码全部由 build_r3c.py 现场提取：evidence/spec-41.txt 逐字切片（含页码）+ drafts/code-excerpts.json 逐字贴码（commit d9008e061539）。装配为版块①时引文用 `<blockquote>`，贴码块头标 `file:line` + commit。

## 规范要点

### 要点1 · 只有一条命令环，所有 xHC 命令都走它

> There is only one Command Ring that is used for issuing xHC specific 
> commands or commands related to Device Slots.

—— evidence/spec-41.txt L2（p68）

### 要点2 · 发出三拍：TRB 上环 → 敲门铃寄存器 0（DB Target=0）→ xHC 执行

> All xHC commands are issued by placing the desired Command TRB(s) (Section 
> 6.4.3 Command TRBs) on the Command Ring, then ringing the xHC command 
> Doorbell register, that is, writing the Host Controller Command code to the DB 
> Target field of Doorbell register 0 (refer to Section 5.6 Doorbell Registers).

—— evidence/spec-41.txt L8-L10（p68）

### 要点3 · 一切命令必产 Command Completion Event TRB 上事件环

> All commands result in the generation of a Command Completion Event TRB 
> (Section 6.4.3 Command TRBs) on the Event Ring.

—— evidence/spec-41.txt L19（p68）

### 要点4 · CRCR（命令环控制寄存器）属 Operational 寄存器空间（§5.4.5）

> The Command Ring Control 
> Register is defined in the Operational Register space

—— evidence/spec-41.txt L3（p68）


## 调用链贴码（commit d9008e061539，摘录=drafts/code-excerpts.json cmd 组逐字）

**`drivers/usb/host/xhci-ring.c` L4354 · queue_command**（commit d9008e061539）

```c
static int queue_command(struct xhci_hcd *xhci, struct xhci_command *cmd,
```

注：组装命令 TRB 入命令环的通用函数：所有 xHCI 命令（编址/配置端点等）都经它入环

**`drivers/usb/host/xhci-ring.c` L4377 · queue_command**（commit d9008e061539）

```c
	ret = prepare_ring(xhci, xhci->cmd_ring, EP_STATE_RUNNING,
```

注：先 prepare_ring 检查命令环有空位（含必须成功命令的预留 TRB），动画中“腾位置”动作

**`drivers/usb/host/xhci-ring.c` L4387 · queue_command**（commit d9008e061539）

```c
	cmd->command_trb = xhci->cmd_ring->enqueue;
```

注：记下本命令 TRB 的环上位置，完成事件回来按它配对命令

**`drivers/usb/host/xhci-ring.c` L4397 · queue_command**（commit d9008e061539）

```c
	queue_trb(xhci, xhci->cmd_ring, false, field1, field2, field3,
```

注：queue_trb 把命令四个字段写进命令环 enqueue 指向的 TRB

**`drivers/usb/host/xhci-ring.c` L438 · xhci_ring_cmd_db**（commit d9008e061539）

```c
	writel(DB_VALUE_HOST, &xhci->dba->doorbell[0]);
```

注：敲主机门铃：写 doorbell[0]，DB Target=0（DB_VALUE_HOST），通知 xHC 命令环有新命令

**`drivers/usb/host/xhci-ring.c` L3013 · xhci_handle_event_trb**（commit d9008e061539）

```c
		handle_cmd_completion(xhci, &event->event_cmd);
```

注：事件环读到 TRB_COMPLETION（命令完成事件），分派给 handle_cmd_completion

**`drivers/usb/host/xhci-ring.c` L1832 · handle_cmd_completion**（commit d9008e061539）

```c
	cmd_comp_code = GET_COMP_CODE(le32_to_cpu(event->status));
```

注：从事件 status 里解出完成码：动画里的“回执”（成功/失败判定）

**`drivers/usb/host/xhci-ring.c` L1718 · xhci_complete_del_and_free_cmd**（commit d9008e061539）

```c
		complete(cmd->completion);
```

注：complete() 唤醒正在 wait_for_completion 的发令线程，命令路径闭环

**`drivers/usb/host/xhci-ring.c` L1947 · handle_cmd_completion**（commit d9008e061539）

```c
	inc_deq(xhci, xhci->cmd_ring);
```

注：命令环 dequeue 指针前移一格，环回到可发下一条的状态

**`drivers/usb/host/xhci-ring.c` L1945 · handle_cmd_completion**（commit d9008e061539）

```c
	xhci_complete_del_and_free_cmd(cmd, cmd_comp_code, COMP_PARAM(status));
```

注：event_handled 收尾：把命令从 cmd_list 摘除并触发唤醒

**`drivers/usb/host/xhci-ring.c` L1810 · handle_cmd_completion**（commit d9008e061539）

```c
static void handle_cmd_completion(struct xhci_hcd *xhci,
```

注：命令完成事件处理函数入口（形参就是事件环上的 event_cmd）

## 版块衔接

② 动画：41-command-operation.mp4 + 分帧版入口（player/index.html?scene=0）；③ 交互：interactive/index.html 模块一（三环操作台）/模块三 4.1 小节；④ 补丁收尾：patch-notes-41.md（wmb 门铃序）+ 补丁分帧动画（?scene=3）。
