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

## 5. 可读性台阶（对齐 fig3 修订口径；数值已被 §7.3 修复轮参数表取代——以 §7.3 为准）

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

零件量：静态实体 118 solids / 126 items（audit 口径，2026-11-03 遮挡修复轮 +5：portsc.flagtext / portsc.pls.t / portsc.speed.t / portsc.port / dcbaa.sublabel）+ 动件层（命令单/事件卡/票据/门铃钮簧/描述符卡/TRB 小卡/待接垂缆，fig1/fig2 先例不入静态审计；输出上下文卡与 TRB 小卡另有就位姿态的隐藏静态记录入审计）。

## 7. 2026-11-03 遮挡/帧速/字号修复轮（用户反馈三问题；子代理B 执行，主会话口径）

### 7.1 组序修复清单（静态遮挡：文字被后画实体面板盖住，探针 57 组命中 → 0）

根因：`R.items` 按 settle key 发射，铭牌/标签的 key 小于大面积实体面板（desk.top / conv.rail.s / cons.body / cons.top / box.tower / box.roof / portsc.board / dcbaa.div），画家算法后画在上 → 318×203px 级不透明面板盖住全部面向观众的刻字。修复 = 发射序分层（`label:1` 的文字类 items 提到全体实体之后、actors 六组之前；**item.key 与 audit 不动**——depthOrder 校验 key 不校验发射序）：

| 层（label 层内显式序） | items | 说明 |
|---|---|---|
| tier 0 | portsc.board | 板面 slab 先行（其 AABB 下垂不再盖后层文字） |
| tier 1 | portsc.CCS/CSC/PR/PRC/PED、portsc.pls、portsc.speed | 灯窗/数码窗**实体**（与文字拆件） |
| tier 2 | portsc.flagtext、portsc.pls.t、portsc.speed.t、slot.win | 灯名/读数**文字**后发（静态件内的"先实体后文字"） |
| tier 3 | cons.label、portsc.port | 台铭牌与「端口 1」（自板面拆出，避开 PRC 灯窗 AABB） |
| tier 4 | box.nameplate | 长铭牌板在设备灯标签之前 |
| tier 5 | 其余按 key | desk.label/formcard/两匣标签/dcaa/ep0/bells/evstub/devlabel/rail.tag/lamp.*/intake/wreg… |

拆件明细：五灯名 → `portsc.flagtext`（record 盒贴面）；数码窗读数 → `portsc.pls.t`/`portsc.speed.t`（live.js 按 `data-win` 全 svg 查找，不受拆件影响）；「端口 1」→ `portsc.port`；「软件装载 · xHC 只读」→ `dcbaa.sublabel`（迁基座前脸）。表格卡盒内序改为格框先画、标题文字最后画。收件口/寄存器口的薄板**去填充只留框线**（22 世界宽薄板的斜投影 bbox 下垂会盖上方灯名）。

### 7.2 actors 避让明细（动态卡盖刻字；停留态全部清零）

- **票据带挂卡**：立式厚卡（16.5×6×1.1）→ **平板票贴塔面**（y=20 面 +0.06），自挂夹下缘垂挂（卡高 5.2，四夹 z 间距 6 → 卡间真实 z 间隙）；落位带东移 x 149.5–166 → **153–176**（避开设备灯标签带 128–152.6）；层内先发全部卡面、后发全部文字（宽卡沿方位角的斜投影 bbox 不再把邻卡文字判成被盖）。
- **事件匣堆叠**：2×2 格 × z 层（原 2 列 x 间距 1.4、行距 7.5 有格间互叠）→ 格距 13.1/8.4 真间隙；**被同格上层卡盖住的卡只画卡背无字**（堆叠语义=只见顶层卡面）；「事件匣」标签从匣沿顶面迁至**匣前桌面**（y≈31 顶面刻字）——匣沿/北立面位与匣内卡的斜投影 bbox 必交（实测扫描定位）。
- **描述符双卡**：并排（x 交叠 8.8 世界，Config 卡盖 Device 卡文字）→ **对角双卡位**（Device 西北/Config 东南）+ 卡面先行文字后发。
- **「票据带」标签**：x 178→183、z 35.8→36.2，与挂卡带（至 x 176）x 向分离。
- 门铃钮/簧、复位脉冲、读括号、待接垂缆：无命中，未动。

### 7.3 帧速/字号参数表

- **durs ×1.4**：`[3.2,5.5,5,5,6.5,6,6.5,7,5,6.5,7,4.5]` → `[4.5,7.7,7,7,9.1,8.4,9.1,9.8,7,9.1,9.8,6.3]`（build.mjs DATA 源头，非直改 index.html；双主题已核）。
- **字号**（size=build 参数，px=探针口径 SVG 计算值 ≈ size×1.965；"宁小勿溢出"= 每处以 `getComputedTextLength()` 实测字宽对宿主沿文字轴长度收敛）：

| 类 | 处 | 修复前 | 修复后 | 依据 |
|---|---|---|---|---|
| 三工位铭牌 | xHCI 驱动 | 9.04px | **9.53px** | 桌面前缘 |
| | xHC 控制器 | 8.65px | **9.53px** | ≥9px 门 |
| | USB 设备 | 7.47px | **9.53px** | 塔面上段 |
| 部件名 | PORTSC | 5.50px | **9.43px** | 板面 54 世界 |
| | 端口 1 | 4.32px | **7.47px** | 板面东段 |
| | DCBAA | 5.50px | **7.66px** | 背板 24 世界上限 |
| | EP0 传输环 | 5.11px | **7.27px** | 环床 38 世界上限 |
| | Device Slot | 4.32px | **4.62px** | 槽位窗 34 世界 / 7.07em 上限 |
| | 事件出口 | 3.93px | **9.04px** | 台面东南 |
| | 事件匣/命令单 | 4.32px | **9.04/7.86px** | 桌面顶面刻字 |
| | 收件匣（描述符） | 4.32px | **6.49px** | 桌面东缘 −120 内 |
| | 命令环·收件口 | 3.73px | **4.13px** | 台面西段 34 世界 / 8.17em 上限 |
| | 寄存器口 | 3.73px | **6.29px** | 槽位下方 |
| | 门铃 0 铭 | 3.93px | **5.90px** | 台面内单行 |
| | 门铃 1 铭 | 3.93px | **两行 3.54px** | 16.2em 单行越台面 27 世界→拆行 |
| | 票据带 | 3.93px | **4.32px** | 塔面东端 13 世界 |
| 数值窗读数 | PLS/Speed 值 | 5.90px | **6.88px**（×1.16） | 窗 12 世界 / 2em（复位）上限 |
| | 槽位窗读数 | 7.08px | **6.29px** 回调 | Configured 6.42em×font ≤ 窗 34（修复前 45.4 世界已溢出窗 1.33×） |
| 表格卡 | 标题/副题/组题 | 5.90/3.54/3.93px | **5.90/3.73/4.32px** | 卡宽 30 / 挂板 36 上限（em 实测） |
| | 格值/格注 | 4.52/3.34px | **4.72/3.34px** | 格距 9.8 世界钉死（Entries 4.49em×3.34=15 世界，与原件持平） |
| 教学锚句 | 只见 USB 请求与总线事件——槽/环/上下文对设备不可见 | 4.32px（已溢铭板 12.5 世界/侧） | **3.46px** | 26.58em 句长 × 唯一可容面（基座面 92 世界）= 3.46px 上限；铭板仅 84 世界且高 4 拆不了行（措辞冻结） |
| 动件卡 | 事件堆叠卡/票据夹卡/描述符卡 | 2.7–3.3px | 5.5/3.6/3.7/2.6px | 见 7.2 落位约束（卡 11–23 世界） |
| | 行走票据/命令单/写卡（瞬态） | 2.7–3.5px | 3.9–4.7px | 卡 11–23 世界，飞行中 |

字号豁免清单（放不下且拆行也放不下，保持可达上限如实登记，宁小勿溢出）：教学锚句 3.46px（7px 目标不可达——26.58em×7px=186 世界 > 全机任何单面）；票据夹卡 SET_ADDRESS 3.64px（塔面右段被灯窗列/标签列/轨/票据带占满，23 世界卡内 6.62em 上限）；事件堆叠卡 5.50px（匣 24×18 内 2×2 格）；描述符卡 3.73/2.55px（同匣约束 + Descriptor 6.03em）；五灯名 5.50px（灯距 10.3 世界）；状态灯标签 3.93px（灯窗右缘 128→票据卡左缘 153 共 24 世界，Configured 6.42em 上限——修复前 4.91px 即溢出并压卡）；Device Slot 4.62px、槽位读数 6.29px（窗 34 世界）；命令环·收件口 4.13px（台面西段 34 世界 / 8.17em）；DCBAA 7.66px、EP0 传输环 7.27px、软件装载副铭 2.75px（各自宿主面上限）；表格卡格注 3.34px（格距钉死，与原件持平）；门铃铭 5.90/3.54px。
（2026-11-03 字号修复轮更正：本表 em→世界换算按「advance×1.04」记账偏悲观——实测正面/顶面矩阵下文字 advance 的 user 数与世界单位 **1:1**（矩阵 x 列基=世界 x 轴屏幕步进，双路校准：bbox 实测 92.8 vs 板 86.1 = 溢出吻合；基矢量 node 复算）。且本轮已按 FIXSPEC 授权改几何，豁免项逐条重做——**新值见 §8**，本表数值仅存档为修复前口径。）

### 7.4 探针前后对比（scripts/xhci_spec_occlusion_probe.py --frames 12 --dwell-ms 400）

| | 修复前 | 修复后 |
|---|---|---|
| dark index.html | **OCCLUSION-FAIL 57**（去重组：静态组序 33 + actors 动态 24） | **OCCLUSION-PASS**（exit 0） |
| light index-light.html | 同量级失败 | **OCCLUSION-PASS**（exit 0） |

迭代轨迹：57（初）→ 16（label 层+落位避让）→ 10（显式分层序）→ 4（nameplate 层序 bug 修复）→ 1（事件匣标签位）→ 0（标签迁匣前桌面）→ 2（字号回调触发格框/标题盒内序）→ **0**（盒内文字后置）。中途新增诊断脚本：/tmp/diag43.py（遮挡者身份）、/tmp/who44.py（dwell 对齐）、/tmp/scan43b.py（标签平移扫描定位）、/tmp/fit43b.py（getComputedTextLength 字宽×宿主沿轴长度溢出机检）。

### 7.5 门复跑记录（本轮终态，双主题）

audit passed（118 solids / 126 items）· lines.mjs `line ends: 0` console clean（双主题）· 真值表 18/18 PASS · 语言门 total=0（双主题）· 自包含 0 外链 · zoomfs alive（stages=2，zooms 1/1.6/2.4/3.2）· durs 已核落页 · shots/ 34 件复拍零 console 异常（含 phone390 + 3.2× zoom）。

## 8. 2026-11-03 老问题修复轮（FIXSPEC-42-43 三项字号豁免面；授权改几何，措辞一字不改）

### 8.1 换算基更正（方法论）

§7.3 旧表按「advance_user ≈ 世界×1.04」记账，实测偏悲观 1.35×：正面/顶面文字矩阵的 x 列基=世界 x 轴屏幕步进，**advance 的 user 数 = 世界单位 1:1**；竖直 em 框 = 1×字号世界高、CJK 墨 ≈0.86em、大写拉丁帽 ≈0.72em（探针 rect 含 1em 全框）。双路校准：① 真页面 rect（锚句 92.8 vs 铭板 86.1 = 溢出，与旧表口径一致）；② node 复算 iso 基矢量（x 列 1.0122/0.9663、z 列 0/1.6099）。fit 机检脚本升级：`~/.cache/zcode-tmp/fit43c.py`（getComputedTextLength×宿主沿轴，双主题 FIT-PASS）。

### 8.2 三项改动面（build.mjs + live.js）

1. **教学锚句 → 7.00px 达标（目标 ≥7）**：拆两行（「——」收 L1 尾，拼接逐字==原句，机检 28/28 PASS），立专用面板 `box.nameplate` 106×1.6×17.2 世界 @y44（替换旧 84×1.2×4 贴地板板），内缩框线+四角点，面板顶缘等效塔面 z≈7.6 < 最低灯窗下缘 8.7（面板前移 Δy=24.6 使屏幕投影沉到灯列之下；AABB 与灯窗的角部虚交已用四边形边线数学排除，探针为证）。
2. **软件装载副铭 → 5.00px 达标（目标 ≥5）**：`dcbaa.sublabel` 自基座前脸（28 世界，5px 需 53.7 世界放不下）迁**基座台板顶面**，topText anchor start @(-114,-1)，西避 desk.top 悬缘(-120) 6 世界、东避 cons 身(-40) 19.7。
3. **动件卡**（l1=主行/l2=副行）：
   - 票据夹卡 23×5.2 → **33×6.3**，挂夹 z 13.2+i·6 → **12.4+i·6.5**，带位 x 154..187：**SET_ADDRESS 3.64→4.50px 达标**；
   - 描述符卡 11.5×8.8 → **27×8.3**，落位由对角双卡位改**匣内两行**（Device 北 -137.95,-16.9 / Config 南 -137.45,-8.15，南缘 ≤-4.0 避标签框）：**l1 3.73→4.50px、l2 2.55→4.00px 达标**；`tray.desc` 匣体 x→-123.5/y→-21.5、唇同步；
   - 事件堆叠卡 11×8.8 → **13×8.8**，列距 13.1→13.4、`evTray.x`→-140.9，`tray.event` x→-124.5、唇同步：**l1 5.50→6.01px 达标**（l2 4.72→5.01px 顺带）。
   - §7.2 避让重核：挂卡带位仍西距「Configured」标签带 1.4 世界、顶缘 32.2 < 「USB 设备」铭牌框底 32.4；「票据带」标签因挂卡 AABB 相交迁**塔身东立面**（沿 y 34 世界，4.32→5.00px）；「收件匣（描述符）」标签因描述符卡 AABB 相交迁**匣前桌面西段**（-165,2.5 @z23，字号不变）；探针迭代 2 命中 → **0**。

### 8.3 豁免清单逐条新值（旧值 → 新值）

| 处 | 旧 | 新 | 判定 |
|---|---|---|---|
| 教学锚句 | 3.46px | **7.00px**（双行 97.0/89.1 世界 ≤ 面板可容 99） | 达标（≥7） |
| 软件装载副铭 | 2.75px | **5.00px**（advance 53.7 ≤ 台板可容 58） | 达标（≥5） |
| SET_ADDRESS 票据夹卡 | 3.64px | **4.50px**（advance 29.8 ≤ 卡内可容 30） | 达标（≥4.5） |
| 票据夹卡副行 | 3.54px | **2.30px** | **新豁免（回退登记）**：四卡带高硬约束——塔面可用带 6.3..32.2 共 25.8 世界 < 4×(4.5px+3.54px) 清叠放需求 30.5 世界；副行 2.30px 在 3.2× 档等效 7.4px（DESIGN §1.8 追注细节层 ≥7px 起），换主行达标且主/副行墨迹零叠印 |
| 描述符卡 l1/l2 | 3.73/2.55px | **4.50/4.00px**（16.2/24.1 ≤ 卡内 24.6） | 达标（≥4.5/4） |
| 事件堆叠卡 l1/l2 | 5.50/4.72px | **6.01/5.01px**（「事件」12.0 ≤ 卡内 12.1） | 达标（≥6） |
| 票据带标签 | 4.32px | **5.00px**（迁塔身东立面 34 世界宿主面） | 顺带提升 |
| 收件匣（描述符）标签 | 6.49px | 6.49px（迁匣前桌面，字号不变） | 避让挪位，不涉字号 |
| 其余 §7.3 豁免项（五灯名/状态灯标签/Device Slot/槽位读数/命令环·收件口/DCBAA/EP0/表格卡格注/门铃铭） | — | 未动 | 不回退 |

### 8.4 门复跑记录（本轮终态，双主题原始输出摘要）

- `node build.mjs --audit` ×2 → `audit passed`（118 solids / 126 items，双主题）
- `node ~/.zcode/skills/anatomy/scripts/lines.mjs <页> --select ".xhp-stage"` ×2 → `line ends: 0 of 150 ends on 37 lines float` · `console: clean`（双主题）
- 遮挡探针 `scripts/xhci_spec_occlusion_probe.py <页> --frames 12 --dwell-ms 400` ×2 → `OCCLUSION-PASS`（dark/light；中途 2 命中：F7 票据带×挂卡 0.32、F9 收件匣×描述符卡 0.17，均按 §8.2 迁标签清零）
- `python3 -I pagecheck.py` → `47/47 needles PASS`
- `node verify_frames.mjs` → `frames-truth: 18/18 PASS`
- `node zfscheck.mjs` → `alive=true, stages=2, bars=2, zooms 1/1.6/2.4/3.2`
- 语言门 `python3 scripts/scan_words.py retired`（study 仓根）×2 → `total=0`（双主题）
- 自包含 → 0 外部 script/link/@import（http 仅 SVG xmlns）
- fit 机检 fit43c ×2 → 8 项全 FIT（见 §8.1/8.3 各行 advance/host 实测）
- 措辞机检（拆行拼接==原句 + 冻结串在场）×2 → 28/28 PASS；`durs [4.5,7.7,7,7,9.1,8.4,9.1,9.8,7,9.1,9.8,6.3]` 落页核对不变；zoomfs focus 选择器 `['[data-name="portsc.board"]']` 未动（portsc.board 几何未变）
- shots：`node shots.mjs dark|light|phone|zoom` 全量重拍 34 件，console clean

### 8.5 shots 清单（本轮重拍，shots/ 34 件全量覆盖）

full-{dark,light} · machine-{dark,light} · flowchart-{dark,light} · f00..f11 特写 ×双主题（f06-address 挂卡、f09-read-desc 描述符双卡、f10-configure 事件堆叠+四挂卡为重点复核帧）· phone390-machine · phone390-zoom（3.2× 档）。

## §9 步进按钮轮（2026-11-03 深夜，用户问题①：机器动画补控制条）

改动面：build.mjs（body 内联 style +7 行 .fig-ctl 段；machineBody 插 machineCtlHtml + hint 一句）、
live.js（syncModeBtn + next/prev/tick/键位接线 30 行；键盘行为全部保留）。机器几何/SVG/帧序/durs 零改动。

门复跑（重建后）：audit passed ×2（dark/light）；lines.mjs line ends: 0 ×2（输出形态注记同 4.2 §12）；
遮挡探针 OCCLUSION-PASS ×2；verify_frames frames-truth 18/18 PASS；pagecheck 48 行全 PASS exit=0；
zfscheck ZFS alive stages:2 console clean；语言门 total=0。

新门：scripts/xhci_spec_ctl_probe.py CTL-PROBE-PASS（fig43 帧计数取 __fig43.frame 实测）。
shots 新增：ctl-bar-dark/light.png + ctl-bar-*-bar.png。

## §10 代码走读卡轮（CODE-STEPPER 步 5，2026-11-04；Address Device 链四区全动=方案验收件）

### 10.1 交付面

- 数据件：`lessons-data/stepper_43x.json`（marker **X43**，schema usb-xhci-stepper/1，worldKind=rings3，40 帧 / 8 ev / 7 refs / 47 锚点）。
- 集成：build.mjs 照抄 4.1 模式——`stepper_builder.py render_block` 构建期 stdout 内联（渲染单一事实源=引擎，行号零誊抄）；course.css 走读段（「代码步进放映机」→「右缘批注」段，剥注释）+ 纸面卡变量垫片追加进 body style；走读卡插机器 plate 之后、互链卡之前，卡前 `p.xsp-walknote` 导语（含 TD 计数口径挑明：规范按传输阶段、内核 struct xhci_td 按 URB——本链不涉传输 TD）；script 拼装 `kitScript()+stepperJs+LIVE+zfsFlow+zfsMach`（codestepper 文档级 keydown 已有 .iso-stage 避让，:414-419）。
- 语义对表：机器 F5（槽初始化）→F6（编址）。world0 初态＝F4 后状态：设备灯 Default（复位已完成，F3）、DCBAA 1 号格已挂输出上下文（软件装载）、三环全空。

### 10.2 走读函数清单（行号全部现场 `git -C /Volumes/KernelSrc/linux show 62f4c998b297:<file> | grep -n` 核出，锚点断言构建期强制）

| 函数 | file:line | 语义 |
|---|---|---|
| hub_set_address | drivers/usb/core/hub.c :4778-4781 | Default 态闸＋address_device 钩子分发（xHCI 走 Address Device 命令） |
| xhci_setup_device | drivers/usb/host/xhci.c :4318-4319, 4369, 4375, 4391-4392, 4396, 4404-4405, 4412, 4416, 4451, 4487 | 入口/分配命令/绑 in_ctx/首次编址分支/**A0=A1=1（SLOT_FLAG\|EP0_FLAG）**/投递/门铃 0/睡眠/COMP_SUCCESS/读回 devaddr |
| xhci_setup_addressable_virt_dev | drivers/usb/host/xhci-mem.c :1093, 1111, 1145, 1191, 1194-1195, 1197-1198 | Context Entries=1·Route String=0 / Root Hub Port Number / EP Type=Control / MaxBurst=0·CErr=3·MPS / TR Dequeue=环首·DCS=1 |
| xhci_alloc_virt_device（前置回放） | drivers/usb/host/xhci-mem.c :1010-1014 | EP0 传输环 Enable Slot 完成回调已建（Link TRB 装配 xhci_set_link_trb :97/:110/:130——环初始化即写） |
| xhci_queue_address_device | drivers/usb/host/xhci-ring.c :4412-4413, 4415-4418 | TRB 装配：in_ctx 地址进字段 1/2；**BSR 位仅 SETUP_CONTEXT_ONLY 置位（TRB_BSR）——本链 SETUP_CONTEXT_ADDRESS＝BSR=0 主线** |
| handle_cmd_completion | drivers/usb/host/xhci-ring.c :1803-1804, 1806, 1825, 1870-1871, 1884-1885, 1938, 1940 | 事件消费：Slot ID/CC/分发 case TRB_ADDR_DEV/统一出口/命令环出队指针前移 |
| xhci_handle_cmd_addr_dev | drivers/usb/host/xhci-ring.c :1662 | 编址结果已由 xHC 写输出上下文（驱动侧仅 trace）——槽 Enabled→Addressed 迁移在 xHC 侧 |
| xhci_complete_del_and_free_cmd | drivers/usb/host/xhci-ring.c :1704, 1711 | complete() 唤醒睡眠线程 |

### 10.3 帧数与 ev 统计（40 帧）

四区动作：命令环 ring_enq（ADDR 槽 0）→db 0→ring_deq（xHC 取，HW 帧）；EP0 环 ring_enq（LINK 槽 0，环上架回放帧）；事件环 evt_enq（CCE Slot=1·CC=1 槽 0）→evt_deq（ERDP 前移）；设备端 dev_req（SET_ADDRESS OUT）→dev_state（Default→Addressed）。reg_wr 零条——CRCR/DCBAA/ERDP 本链只读不写（DCBAA 1 号格 F4 已挂，初值如实呈现），自洽。

### 10.4 EP0 Max Packet Size：内核值 vs 规范值（差异登记，数值不冲突）

规范 §4.3.3 p76 步 8：Max Packet Size＝端口速度默认（FS=8），机器 F5 刻规范值。内核 62f4c998b297 `xhci_setup_addressable_virt_dev` 对 **FS 写 MAX_PACKET(64)**（xhci-mem.c :1126-1128，注释原文「USB core guesses at a 64-byte max packet first for FS devices」——USB 核心新方案先按 64 字节试探读描述符，hub.c :4844-4847）。走读卡帧注记两侧如实登记（代码值 64＋规范值 8＋口径说明），机器页不动。

### 10.5 顺带修复：机器数码窗/信号灯 cap1 面 NaN（预存在缺陷，非本轮引入）

- 症状：Playwright console 捕获载入期 7 条 `Error: <path> attribute d: Expected number ... NaN`——portsc 五信号灯（CCS/CSC/PR/PRC/PED）与两数码窗（PLS/Speed）各 1 条。
- 根因：build.mjs FLAGS 循环与 win() 的 cap1 第 4 点误写 `[quad[0], quad[1][1]-X, quad[1][2]]`（数组当标量 → NaN）；同文件 slot.win/box.lamp 处（:410/:485）为正确形态 `[quad[0][0], quad[0][1]-X, quad[0][2]]`。预存在——本轮改动未触及这些行。
- 修复：:356/:382 两行对齐正确形态，重建后 `grep -c NaN` 双主题 = 0；audit 118 solids/126 items 不变、occlusion/verify_frames/lines 全部复跑 PASS（补上的是灯窗凹槽底面一小片，位于灯泡与凹槽暗区之后被覆盖，无可见视觉变化、无新增遮挡）。
- **规则洞登记（共享探针盲区）**：anatomy drive.mjs 的「console: clean」只捕 `Runtime.consoleAPICalled`，浏览器内部 SVG 属性解析错误走 `Log.entryAdded` 域——此前各轮 console: clean 判据对这类错误全盲（本轮 Playwright `page.on("console")` 才实锤）。建议 drive.mjs 维护窗补 `Log.enable`+`Log.entryAdded` 监听；本任务边界禁改 scripts/，只登记不改。

### 10.6 门复跑记录（本轮终态，cap1 修复后重建双主题）

- `python3 scripts/check_rings3_ledger.py lessons-data/stepper_43x.json` → `LEDGER-PASS`（frames=40 evt_enq=1 cmd_deq=1 ep0_deq=0 dev≤Addressed）
- `python3 scripts/st_layout_probe.py <index.html|index-light.html> 1600` → `PROBE-PASS` ×2（三环带等高/无溢出/字号达标）
- `python3 scripts/xhci_spec_stepper_probe.py index.html` → `STEPPER-PROBE-PASS`（40 帧逐帧 reset 法，ev 签名全对）
- `python3 scripts/scan_words.py retired <双主题>` → `total=0` ×2（本页无豁免词，走读卡文案同判据）
- `node build.mjs --audit` ×2 → `audit passed`（118 solids / 126 items）；`node verify_frames.mjs` → `frames-truth: 18/18 PASS`；`python3 -I pagecheck.py` → `47/47 needles PASS`；`node zfscheck.mjs` → alive=true stages=2 console clean；`lines.mjs --select .xhp-stage` ×2 → `line ends: 0` console clean；`xhci_spec_occlusion_probe.py` ×2 → `OCCLUSION-PASS`；`xhci_spec_ctl_probe.py <abs path> fig43` → `CTL-PROBE-PASS` ×2（注意：该探针要求绝对路径参数——相对路径时拼出 `file:///lessons/...` 导航失败）
- console（Playwright 全程捕获 error 级）：0 条——载入/滚动/走读卡步进三段分桶验证均 0
- shots 新增：walk-card-{dark,light}.png（行 1/40 初态）+ walk-card-end-{dark,light}.png（行 40/40 终态：CCE 卡 Slot=1·CC=1、Addressed 灯、SET_ADDRESS OUT 票据），均 1500×1000、channel="chrome"
