# 4.2 落地页 · ① 规范与代码分析（文字稿）

> P6 落地页装配用文字稿（小节 4.2 控制器初始化（§4.2 · p68-70））。引文与贴码全部由 build_r3c.py 现场提取：evidence/spec-42.txt 逐字切片（含页码）+ drafts/code-excerpts.json 逐字贴码（commit d9008e061539）。

## 规范要点

### 要点1 · 复位后等 USBSTS.CNR 清零，才能写任何 Operational/Runtime 寄存器

> After Chip Hardware Reset6 wait until the Controller Not Ready (CNR) flag 
> in the USBSTS is ‘0’ before writing any xHC Operational or Runtime 
> registers.

—— evidence/spec-42.txt L18-L19（p69）

### 要点2 · 各步顺序不强制，但必须在 USBCMD R/S=1 之前全部完成

> Note: This text does not imply a specific order for the following operations, however 
> these operations shall be completed before setting the USBCMD register 
> Run/Stop (R/S) bit

—— evidence/spec-42.txt L21-L22（p69）

### 要点3 · CONFIG.MaxSlotsEn 使能软件要用的设备槽

> Program the Max Device Slots Enabled (MaxSlotsEn) field in the CONFIG 
> register (5.4.7) to enable the device slots that system software is going to

—— evidence/spec-42.txt L25（p69）

### 要点4 · CRCR=命令环首 TRB 地址（含 Cycle 位）

> Define the Command Ring Dequeue Pointer by programming the Command 
> Ring Control Register (Section 5.4.5 Command Ring Control Register 
> (CRCR)) with a 64-bit address pointing to the starting address of the first 
> TRB of the Command Ring.

—— evidence/spec-42.txt L34-L36（p69）

### 要点5 · R/S=1 开机——xHC 从此开始接受门铃引用

> Write the USBCMD (5.4.1) to turn the host controller ON via setting the 
> Run/Stop (R/S) bit to ‘1’. This operation allows the xHC to begin accepting 
> doorbell references.

—— evidence/spec-42.txt L115-L116（p70）


（补充，见引文卡：DCBAAP 指向 Device Context Base Address Array——evidence/spec-42.txt L29-32（p69）；写 ERSTBA 即启用事件环——evidence/spec-42.txt L96-98（p70）。）

## 调用链贴码（commit d9008e061539，摘录=drafts/code-excerpts.json init 组逐字）

**`drivers/usb/host/xhci.c` L5431 · xhci_gen_setup**（commit d9008e061539）

```c
int xhci_gen_setup(struct usb_hcd *hcd, xhci_get_quirks_t get_quirks)
```

注：各宿主驱动（PCI/平台）setup 主线的公共汇合点，对应规范 §4.2 控制器初始化的起点

**`drivers/usb/host/xhci.c` L229 · xhci_reset**（commit d9008e061539）

```c
	ret = xhci_handshake(&xhci->op_regs->status, STS_CNR, 0, timeout_us);
```

注：复位后轮询 USBSTS 等 CNR=0：控制器就绪前不允许写其它寄存器（§4.2 的就绪等待）

**`drivers/usb/host/xhci.c` L5565 · xhci_gen_setup**（commit d9008e061539）

```c
	xhci_init(hcd);
```

注：本树新拆出的 xhci_init：基础寄存器编程总入口（mem_init 分配内存后调用）

**`drivers/usb/host/xhci.c` L487 · xhci_enable_max_dev_slots**（commit d9008e061539）

```c
	writel(config_reg, &xhci->op_regs->config_reg);
```

注：写 CONFIG 寄存器 MaxSlotsEn=设备槽数上限（§4.2 第 1 步）

**`drivers/usb/host/xhci.c` L506 · xhci_set_cmd_ring_deq**（commit d9008e061539）

```c
	xhci_write_64(xhci, crcr, &xhci->op_regs->cmd_ring);
```

注：写 CRCR：命令环基址 + Cycle 位（§4.2 命令环定义）

**`drivers/usb/host/xhci.c` L555 · xhci_init**（commit d9008e061539）

```c
	xhci_write_64(xhci, xhci->dcbaa.dma, &xhci->op_regs->dcbaa_ptr);
```

注：写 DCBAAP：设备上下文基址数组指针（§4.2 第 2 步）

**`drivers/usb/host/xhci-mem.c` L2311 · xhci_alloc_interrupter**（commit d9008e061539）

```c
	ir->event_ring = xhci_ring_alloc(xhci, segs, TYPE_EVENT, 0, flags);
```

注：分配事件环：命令/传输完成事件都写到这个环

**`drivers/usb/host/xhci-mem.c` L2343 · xhci_add_interrupter**（commit d9008e061539）

```c
	writel(erst_size, &ir->ir_set->erst_size);
```

注：写 ERSTSZ：事件环段表项数（中断器初始化）

**`drivers/usb/host/xhci-mem.c` L2351 · xhci_add_interrupter**（commit d9008e061539）

```c
		xhci_write_64(xhci, erst_base, &ir->ir_set->erst_base);
```

注：写 ERSTBA：事件环段表基址（事件环与中断器绑定）

**`drivers/usb/host/xhci.c` L627 · xhci_run**（commit d9008e061539）

```c
int xhci_run(struct usb_hcd *hcd)
```

注：hc_driver .start 钩子：主机由停止态转入运行态的入口

**`drivers/usb/host/xhci.c` L154 · xhci_start**（commit d9008e061539）

```c
	writel(temp, &xhci->op_regs->command);
```

注：R/S=1 写入 USBCMD（151 行 temp |= CMD_RUN；经 xhci_run->xhci_run_finished->xhci_start 调到这里）

**`drivers/usb/host/xhci.c` L605 · xhci_run_finished**（commit d9008e061539）

```c
	xhci->cmd_ring_state = CMD_RING_STATE_RUNNING;
```

注：命令环状态置 RUNNING：此后 ring_cmd_db 才真正敲钟，即“允许门铃”

## 版块衔接

② 动画：42-host-controller-init.mp4 + 分帧版入口（player/index.html?scene=1）；③ 交互：interactive/index.html 模块三 4.2 小节（寄存器清单题组）；④ 补丁收尾：patch-notes-42.md（xhci_reset 未 halted 返回 -EBUSY）+ 补丁分帧动画（?scene=4）。
