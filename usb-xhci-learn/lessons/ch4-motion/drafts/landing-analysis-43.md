# 4.3 落地页 · ① 规范与代码分析（文字稿）

> P6 落地页装配用文字稿（小节 4.3 设备初始化（§4.3 · p71-80））。引文与贴码全部由 build_r3c.py 现场提取：evidence/spec-43.txt 逐字切片（含页码）+ drafts/code-excerpts.json 逐字贴码（commit d9008e061539）。

## 规范要点

### 要点1 · FS 设备先经 EP0 读 Device Descriptor 前 8 字节取 bMaxPacketSize0

> For FS devices, system software should initially read the first 8 bytes of the 
> USB Device Descriptor to retrieve the value of the bMaxPacketSize0 field and 
> determine the actual Max Packet Size for the Default Control Endpoint, by 
> issuing a USB GET_DESCRIPTOR request to the device, update the Default 
> Control Endpoint Context with the actual Max Packet Size and inform the xHC 
> of the context change. Step a describes this operation.

—— evidence/spec-43.txt L103-L107（p72）

### 要点2 · 控制传输三段顺序：Setup → Data → Status（shall 要求）

> The USB GET_DESCRIPTOR request requires a Data Stage, so the 
> Setup Stage TD shall be followed by a Data Stage TD, then a Status 
> Stage TD.

—— evidence/spec-43.txt L115-L116（p73）

### 要点3 · Setup Stage TRB 字段：TRT=IN Data Stage(3)/Length=8/IOC=0/IDT=1/bmRequestType=80h/bRequest=6/wValue=0100h/wLength=8

> Initialize the Setup Stage TD (a single Setup Stage TRB) on the 
> Endpoint 0 Transfer Ring. 
> •  TRB Type = Setup Stage TRB. 
> •  Transfer Type (TRT) = IN Data Stage (3). 
> •  TRB Transfer Length = 8. 
> •  Interrupt On Completion (IOC) = 0. 
> •  Immediate Data (IDT) = 1.

—— evidence/spec-43.txt L120-L125（p73）

### 要点4 · 三段就绪后敲设备槽门铃：DB Target = Control EP 0 Enqueue Pointer Update

> Ring the Device Slots’ Doorbell with DB Target = Control EP 0 
> Enqueue Pointer Update.

—— evidence/spec-43.txt L181（p74）

### 要点5 · Address Device 命令完成后才能对该槽发更多命令（等待语义）

> System software shall wait for Address Device Command completion event on 
> the Event Ring before issuing any more commands to the slot.

—— evidence/spec-43.txt L346（p76）


（补充，见引文卡：Data/Status Stage TRB 字段——evidence/spec-43.txt L136-154/L156-173（p73）；Address Device 命令指向 Input Context——evidence/spec-43.txt L331-334（p76）。）

## 调用链贴码（commit d9008e061539，摘录=drafts/code-excerpts.json dev 组逐字）

**`drivers/usb/core/message.c` L150 · usb_control_msg**（commit d9008e061539）

```c
int usb_control_msg(struct usb_device *dev, unsigned int pipe, __u8 request,
```

注：USB 核同步控制传输入口：构造控制 URB、提交并等完成（动画起点，SET_ADDRESS 等由此发出）

**`drivers/usb/host/xhci.c` L1698 · xhci_urb_enqueue**（commit d9008e061539）

```c
		ret = xhci_queue_ctrl_tx(xhci, GFP_ATOMIC, urb,
```

注：hc_driver urb_enqueue 按端点类型分派，控制传输走 xhci_queue_ctrl_tx（现名仍叫此）

**`drivers/usb/host/xhci-ring.c` L3842 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
	field |= TRB_IDT | TRB_TYPE(TRB_SETUP);
```

注：Setup 段 TRB：TRB_SETUP + TRB_IDT（8 字节 SETUP 包作为立即数据随 TRB 走）

**`drivers/usb/host/xhci-ring.c` L3856 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
	queue_trb(xhci, ep_ring, true,
```

注：Setup TRB 入 EP0 传输环（bRequestType/wValue 等打包成 TRB 前两个字段）

**`drivers/usb/host/xhci-ring.c` L3866 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
		field = TRB_ISP | TRB_TYPE(TRB_DATA);
```

注：Data 段 TRB 类型：TRB_DATA（IN 方向带 ISP 短包中断）

**`drivers/usb/host/xhci-ring.c` L3892 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
		queue_trb(xhci, ep_ring, true,
```

注：Data TRB 入环：数据缓冲 DMA 地址 + 长度

**`drivers/usb/host/xhci-ring.c` L3914 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
			field | TRB_IOC | TRB_TYPE(TRB_STATUS) | ep_ring->cycle_state);
```

注：Status 段 TRB：TRB_STATUS + TRB_IOC，传输结束时产生完成事件

**`drivers/usb/host/xhci-ring.c` L3916 · xhci_queue_ctrl_tx**（commit d9008e061539）

```c
	giveback_first_trb(xhci, slot_id, ep_index, 0,
```

注：giveback_first_trb：三段齐后翻转首 TRB 的 Cycle 位，整个 TD 一次性移交硬件

**`drivers/usb/host/xhci-ring.c` L579 · xhci_ring_ep_doorbell**（commit d9008e061539）

```c
	writel(DB_VALUE(ep_index, stream_id), db_addr);
```

注：敲设备门铃：writel DB_VALUE(ep_index=0)——EP0 时 DB Target=ep+1=1（宏见 xhci.h:313）

**`drivers/usb/host/xhci.c` L4404 · xhci_setup_device**（commit d9008e061539）

```c
	ret = xhci_queue_address_device(xhci, command, virt_dev->in_ctx->dma,
```

注：设备编址：xhci_queue_address_device 把 Address Device 命令 TRB 入命令环（入口是 .address_device=xhci_address_device）

**`drivers/usb/host/xhci.c` L4412 · xhci_setup_device**（commit d9008e061539）

```c
	xhci_ring_cmd_db(xhci);
```

注：敲命令门铃 DB Target=0，xHC 开始处理编址命令

**`drivers/usb/host/xhci.c` L4416 · xhci_setup_device**（commit d9008e061539）

```c
	wait_for_completion(command->completion);
```

注：等命令完成事件：handle_cmd_completion 里 complete() 唤醒本行，设备拿到地址

## 版块衔接

② 动画：43-usb-device-init.mp4 + 分帧版入口（player/index.html?scene=2）；③ 交互：interactive/index.html 模块二（URB→TRB→TD 组装）/模块三 4.3 小节；④ 补丁收尾：patch-notes-43.md（EP0 avg_trb_len=8）+ 补丁分帧动画（?scene=5）。
