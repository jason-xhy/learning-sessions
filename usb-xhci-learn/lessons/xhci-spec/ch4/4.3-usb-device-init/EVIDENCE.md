# §4.3 USB 设备初始化 · EVIDENCE.md

页面：`index.html`（dark）/ `index-light.html`（light）· 生成自 `build.mjs`（+ `live.js` + `43.css`）
判据：xHCI 1.2b（Intel 625472 Rev 1.2b）§4.3 p71–80，引用页以 pypdf needle 机核（47/47 PASS，见 build.log 与 pagecheck.py）。
演示样例：FS 设备插入 USB2 根端口 1。**Slot ID=1 与新地址 1 均为示例值**（Slot ID 由 xHC 自选 §4.3.2 p75；新地址由 xHC 选定 §4.6.5 p97）。

## 0. 机核记录（全部输出见 build.log）

| 门 | 结果 |
|---|---|
| `node build.mjs --audit`（dark/light） | `audit passed`（2 tubes · 113 solids · 121 items） |
| `lines.mjs --select ".xhp-stage"`（dark/light） | `line ends: 0 of 150 ends on 36 lines float`，console clean |
| 页码机核（pypdf needle，pagecheck.py） | **47/47 PASS**（p68/71/72/73/74/75/76/77/78/85/87/88/97，needle 列表见脚本） |
| 语言门 `scan_words.py retired` | index.html **total=0**、index-light.html **total=0**（残留 family = 空 ⊆ 豁免表；本页未用到豁免词——回执/柜台/泳道等一律改写，见 §4） |
| 自包含 | 0 外部 script/link/@import；http URL 仅 SVG xmlns |
| 互链相对路径 | 全部存在（../../index.html、../4.1、../4.2、../../../xhc-machines/fig1|fig2|fig4、../../../0009、EVIDENCE.md） |
| zoomfs | 三件套接线（zoomBarHtml/zoomFsCss/zoomFsScript）；`window.__zfs` 存活（zfscheck.mjs 机检：alive=true、stages=2、bars=2、zooms 1/1.6/2.4/3.2） |
| 12 帧状态真值表（verify_frames.mjs，DOM 断言） | **18/18 PASS**（设备态/槽态/PLS/速度/五信号灯/票据挂数/事件数/TRB 数逐帧核对） |
| 流程图布局机械检（teach check_lesson_svg_layout.py） | **svg0 findings=0**（overlap/arrow/fit/outside 四检清零；机器台 svg 的矩阵变换文本假阳性按主会话裁定不修） |

zoomfs focus 选择器登记：
- 流程图台（第一实例，shared 脚本默认绑定第一个 `.iso-stage`）：`focus: []`（居中）。
- 机器台（第二实例，选择器补丁绑定 `.iso-stage` 序号 1）：`focus: ['[data-name="portsc.board"]']`（放大时居中 PORTSC 读数板）。
- 双实例补丁方式：第二份 `zoomFsScript()` 输出中把 `document.querySelector(".iso-stage")` / `document.querySelector(".iso-zoombar")` 替换为 `querySelectorAll(...)[1]`，shared/zoomfs.mjs 本体未改。

## 1. 帧序表（12 帧 ↔ 规范步骤；机器与流程图同源）

| 帧 | 画面断言 | 判据（xHCI 1.2b） |
|---|---|---|
| F0 | 端口 1（USB2）Disconnected、PP=1 上电等待；试验盒未接线（缆端挂在挂钩） | p71（"powered on (PP='1') and waiting for a device connect"） |
| F1 | 插入检出 CCS=1·CSC=1；端口→Disabled（USB2）；PLS=7（Polling）；设备灯 Powered；PSCEG 0→1 触发端口状态变化事件→事件卡经回流管到文书台 | p71 步 1（CCS/CSC/PSCEG）；p71（USB2 → Disabled）；p72 3.b（"PED and PR '0' and PLS '7' (Polling)"、"from the Powered state"） |
| F2 | 读 PORTSC（读括号闪亮）；写卡 PR=1 经寄存器写口入总控台；PR 灯亮；复位脉冲沿总线缆往返 | p71 步 3（读 PORTSC/CCS=1）；p72 3.b + §4.3.1 p75 步 1（写 PR=1）。PLS 显示"复位"为文字不是数值——规范未给 USB2 复位期间的 PLS 数值，不造数 |
| F3 | PRC=1·PED=1·PR=0·PLS=U0(0)；Port Speed=FS；设备灯 Powered→Default；PRC 事件卡回流 | p72 3.b（四信号组合 + Default 态备好收 SET_ADDRESS）；p75 Note（复位后 Port Speed 指示设备速度）；p72（PRC 触发事件） |
| F4 | Enable Slot 命令单入命令环（收件口）→按门铃 0→命令完成事件卡（Slot ID=1）→文书台把输出上下文卡插入 DCBAA 1 号格（软件装载）→槽位窗 Enabled | p72 步 4 / §4.3.2 p75（Enable Slot、Slot ID 由 xHC 自选、等命令完成事件、槽→Enabled）；p76 步 10（软件装载 DCBAA 表项）；门铃 0=DB Target=0（Host Controller Command，§4.1 p68） |
| F5 | 表格卡字段依次点亮：A0=1·A1=1；端口 1·Route String=0·Entries=1；EP0 Ctrl·MPS 8·DCS 1·CErr 3；EP0 传输环就绪灯亮 | p75 步 5（A0/A1=1）；p75 脚注 8 + p76（根端口直连 Route String=0、不含端口号；Context Entries=1）；p76 步 8（EP Type=Control、MPS=端口速度默认值（FS=8）、Max Burst=0、DCS=1、Interval=0、MaxPStreams=0、Mult=0、CErr=3）；p76 步 7（EP0 传输环） |
| F6 | Address Device（BSR=0）命令单→门铃 0→xHC 执行：SET_ADDRESS 票据沿总线缆到试验盒（第一次收到 USB 请求）；设备灯 Default→Address；槽位窗 Enabled→Addressed；命令完成事件卡 | p76 / §4.3.4（BSR=0 主线）；p97 §4.6.5（xHC 选定地址并代发 SET_ADDRESS；USB2 请求发往地址 '0'）；p76/p77/p87（设备 Default→Address、槽 Enabled→Addressed）；票据副行"新地址 1·示例"——示例值登记于本表头 |
| F7 | 三张 TRB 小卡（S/D/St）落入 EP0 环台→按门铃 1（DB Target=1）→GET_DESCRIPTOR（前 8 字节）票据到试验盒→回票据 bMaxPacketSize0=8 逆行回总控台→MPS 字段高亮；旁注卡：仅 FS 必走 | p72 步 7（FS 读前 8 字节取 bMaxPacketSize0；LS/HS/SS 8/64/512 可跳过）；p73 步 7.a.ii/iv/vi（三 TRB 字段组，见 §2 逐字段）；p74 步 viii（门铃 DB Target=Control EP 0 Enqueue Pointer Update）；bMaxPacketSize0=8 为演示示例值 |
| F8 | Evaluate Context（A1=1）命令单→门铃 0→表格卡 MPS 格热标注记"更新生效"；命令完成事件卡 | p74 步 ix–x（回读 wMaxPacketSize；**若与默认值不同**则更新 EP0 MPS，随后 Evaluate Context A1=1 通知 xHC）。示例设备 bMaxPacketSize0=8 与 FS 默认一致——流程图 S8 与要义已注记该条件；见 §4 契约修订建议 |
| F9 | 三 TRB 再落环→门铃 1→GET_DESCRIPTOR（完整）票据→回票据→Device/Configuration 描述符卡抛入收件匣；传输事件卡 | p74 步 8（读完整 Device Descriptor 与 Configuration Descriptor，经 EP0 GET_DESCRIPTOR） |
| F10 | Configure Endpoint 命令单→门铃 0；两张 TRB（S/St）落环→门铃 1；SET_CONFIGURATION 票据到试验盒；双成功→设备灯 Address→Configured、槽位窗 Addressed→Configured；两张事件卡（命令完成+传输事件） | p74 步 10（**双操作同成**才升级，缺一不可）；p77 §4.3.5（SET_CONFIGURATION + Configure Endpoint）；p74/p88 §4.5.3.6（槽 Addressed→Configured，Configure Endpoint DC=0）。SET_CONFIGURATION 无数据阶段（控制传输 Setup+Status 两段）——USB 2.0 §9.4.7（wLength=0），本页不画数据段 TRB |
| F11 | 完工：读数汇总，管道全通 | p74 步 12（"The pipe interfaces to the USB device are now fully operational"）；p78（双操作完成后可在各 EP 传输环调度 TD） |

## 2. 8 字节描述符三 TRB 字段组（画面/流程图引据，逐字段 p73 现场值）

Setup Stage TRB：TRT=IN Data Stage(**3**) · TRB Transfer Length=8 · IOC=0 · IDT=1 · bmRequestType=**80h** · bRequest=**6** · wValue=**0100h**（Low byte=Descriptor Index 0，High Byte=1 Descriptor type）· wIndex=0 · wLength=8 · Cycle bit=CPCS。
Data Stage TRB：DIR=**1** · Length=8 · CH=0 · IOC=0 · IDT=0 · Buffer=描述符接收缓冲。
Status Stage TRB：DIR=**0**（控制读 Status 段方向=OUT）· Length=0 · CH=0 · IOC=**1** · IDT=0 · Buffer=0。
（承载位置如实登记·2026-11-03 评分门修订：机器 TRB 小卡与门铃刻牌只刻阶段缩写与 DB Target；流程图 S7 行刻「GET_DESCRIPTOR 前 8 字节 / Setup·Data·Status 三 TRB 入 EP0 环 / 按门铃 1」。**本节逐字段值仅登记于 EVIDENCE 此处，未逐字上画面**——逐字段上画面属后续增刻项，非现状。）

## 3. 页面文本断言

- 原文对照六条引文（要义卡下方）：attach 检测句 p71 步 1；USB2 复位句 p72 3.b；取槽句 p72 步 4 + §4.3.2 p75；Address Device 句 p76 + p77；8 字节句 p72 步 7；双操作句 p74 步 10。逐字取自提取文本（PyMuPDF `===== [PAGE n] =====` 页标），已剔除断行；弯曲引号按 PDF 原样（'1'）。
- 分支注记卡三条：USB3 attach 成功自动 Enabled + 两族 Disabled 不同义（p71–72 + p71 Note）；BSR=1 legacy 分支（p76–77，先 Default 态通信、xHC 被禁止发 SET_ADDRESS、成功→槽 Enabled→Default）；hub/TT 逐层初始化（p74 Note）。
- 术语：「xHCI 驱动」首用注 system software（系统软件）（§1.7）；Default/Addressed/Configured 等槽态设备态首用注中文（§3.1）；命令名/TRB 名/寄存器名保留英文官方名。
- 页脚判据行与页头规范引用行（§4.3 · p71–80）。

## 4. 语言门适配与契约修订建议（待主会话裁决，未改 DESIGN.md）

1. **语言门改写**（本轮按旧判据 total=0 制作，新判据下同样通过且更严）：页面把 §3.2 白名单中的「回执」写作**事件卡/完成通知**、「命令柜台」写作**命令收件口/总控台**；「泳道」在页面文本写作**三列/三方流程**（DESIGN 正文里的"泳道"仅在 EVIDENCE/内部描述使用）。主会话若统一改用豁免词，只需替换 build.mjs 文案重跑。
2. **4.1 互链深度错误**：`ch4/4.1-command-operation/index.html` 内链 `../../xhc-machines/...`、`../../0009-...html`（两层）指向 `lessons/xhci-spec/xhc-machines`（不存在）；从 `ch4/<节>/` 出发应为三层 `../../../`。本节已用三层路径；建议主会话修 4.1。
3. **F8 示例值与规范条件的张力**：规范步 ix 更新 MPS 带 "if the wMaxPacketSize value is different" 条件；本演示设备 bMaxPacketSize0=8 恰等于 FS 默认值，更新为无变化。本页按 DESIGN F8 主线展示 Evaluate Context，并在流程图 S8 与要义中注记条件。备选：演示设备改报 32/64 使更新实质化（需改 F7 回票据值并登记）。
4. **zoomfs 多舞台**：shared/zoomfs.mjs 假设单 `.iso-stage`；本页双舞台用选择器补丁绑定第二实例（见 §0）。若后续页面普遍双舞台，建议上游加 scope 参数。
5. **§4.6.5 细节呈现口径**：SET_ADDRESS 票据副行「新地址 1·示例」；总线请求发往地址 0（p97）刻在流程图 S6 行（"请求发往地址 0 · 新地址 xHC 自选"）。

## 5. 可读性台阶（对齐 fig3 修订口径）

- 三工位铭牌（xHCI 驱动/xHC 控制器/USB 设备）：size 3.8–4.6 ≈ 13–16px 等效（1×，页宽 1500）。
- 面板题名（PORTSC/DCBAA/EP0 传输环/Device Slot）：≈ 10–12px 等效。
- 次级刻字（信号灯标签/票据/命令单/表格卡字段）：≈ 7–10px 等效——低于 11px 台阶的字全部是"放大后看"的细节层，缩放条四档（1/1.6/2.4/3.2×）与全屏已接（要求④）。
- 流程图框内文字 16px（viewBox 1560 → 1× 渲染 ≈ 14.4px ≥ 14px）；箭头标签 15.5px ≈ 14px。

## 6. 复现

```
cd lessons/xhci-spec/ch4/4.3-usb-device-init
node build.mjs            # → index.html（dark）
node build.mjs --light    # → index-light.html
node build.mjs --audit    # audit passed
node ~/.zcode/skills/anatomy/scripts/lines.mjs index.html --select ".xhp-stage"
python3 -I pagecheck.py   # 页码 needle 47/47
node verify_frames.mjs    # 12 帧真值表 18/18 PASS
node zfscheck.mjs         # __zfs 存活机检
node shots.mjs dark|light|phone|zoom
```

零件量：静态实体 113 solids / 121 items（audit 口径）+ 动件层（命令单/事件卡/票据/门铃钮簧/描述符卡/TRB 小卡/待接垂缆，fig1/fig2 先例不入静态审计；输出上下文卡与 TRB 小卡另有就位姿态的隐藏静态记录入审计）。
