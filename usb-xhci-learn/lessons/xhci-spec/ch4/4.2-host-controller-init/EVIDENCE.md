# EVIDENCE.md —— §4.2 主机控制器初始化（启机配电台）

判据源：xHCI 1.2b（Document Number 625472, Revision 1.2b）§4.2 p68–70。
规范提取文本 `/tmp/spec-audit-txt/xhci-1.2b.txt`；PDF 本体 `specs/625472_xHCI_Rev1_2b.pdf`。
生成于 2026-11-03。构建：`node build.mjs`（dark→index.html）/ `node build.mjs --light`（→index-light.html），页宽 1500，自包含。

## 1. 页码机核（pypdf needle，全部现场跑）

`python3 -I` + PdfReader 逐页 `extract_text()` 判 `needle in text`，18/18 全 True（2026-11-03 本机输出）：

| 页 | needle | 结果 |
|---|---|---|
| p68 | `4.2` / `Host Controller Initialization` / `FLADJ` | True ×3 |
| p69 | `Controller Not Ready` / `does not imply a specific order` / `MaxSlotsEn` / `DCBAAP` / `Command Ring Control Register` / `Interrupts are optional` | True ×6 |
| p70 | `ERSTSZ` / `Event Ring Dequeue Pointer` / `ERSTBA` / `writing the ERSTBA enables` / `Run/Stop` / `doorbell references` / `reporting device connects` / `require the port reset` / `automatically advance to the Enabled state` | True ×9 |

页头行 `xHCI 1.2b §4.2 Host Controller Initialization · p68–70` 与五条原文对照的 `(xHCI 1.2b §4.2 pNN)` 尾注均以此为据。
跨行 needle 的两处（p68 "Frame Length Adjustment"、p70 "begin accepting doorbell"）按词级复核（`FLADJ`、`doorbell references` 命中）。

## 2. 画面断言 → 判据（机器每个可见事实）

### 三方工位与铭牌
| 断言（画面） | 判据 |
|---|---|
| 文书台铭牌「xHCI 驱动／规范称 system software」 | 契约 §1.7（泳道标签统一「xHCI 驱动」+首用注规范原称）；规范 p68 "generally referred to as system software" |
| 主机仓铭牌「xHC 控制器 · 寄存器面板」 | §4.2 全节对象；CONFIG/DCBAAP/CRCR 属 Operational、事件环组属 Runtime（p69–70 各 bullet） |
| 端口灯排铭牌「设备区 · 根集线器端口／本流程不参与——R/S=1 后端口才开始上报连接」 | p70 "the Root Hub ports will begin reporting device connects"（上报始于 R/S=1 之后，故本流程中设备不参与）；契约 §1.7 不得删泳道 |

### 帧序断言（8 帧）
| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 | 全景静止，读数「启动步 0/7 · CNR 0 · R/S 0 · 端口活动 0/4」 | 读数四段与模型状态同源（live.mjs snapshot/render） |
| F1 | CNR 就绪灯亮→灭（Chip Hardware Reset 后等待），檐刻「等 CNR=0 再动寄存器」 | p69 "After Chip Hardware Reset wait until the Controller Not Ready (CNR) flag in the USBSTS is '0' before writing any xHC Operational or Runtime registers"；脚注 6（复位=PCI reset 或可选上电复位输入） |
| F2 | MaxSlotsEn 旋钮转动+数字窗显 4；DCBAAP 卡吊运插入 | p69 "Program the Max Device Slots Enabled (MaxSlotsEn) field in the CONFIG register (5.4.7)"；"Program the DCBAAP register … with a 64-bit address pointing to where the Device Context Base Address Array is located"。数字 4 为示例值（规范未定具体值，登记于此） |
| F3 | CRCR 卡插入（卡面「CRCR／命令环首 TRB 地址」） | p69 "Define the Command Ring Dequeue Pointer by programming the CRCR with a 64-bit address pointing to the starting address of the first TRB of the Command Ring" |
| F4 | 事件环段卡、ERSTSZ 计数轮转至 1、ERDP 卡、ERSTBA 卡依次落位；事件环启用灯亮 | p69–70 "Allocate and initialize the Event Ring Segment(s)" / "Program the ERSTSZ … with the number of segments" / "Program the ERDP … with the starting address of the first segment" / "Program the ERSTBA … with a 64-bit address pointer"；p70 "Note that writing the ERSTBA enables the Event Ring"。计数轮 1=示例段数 |
| F5 | MSI-X 表卡（卡面「MSI-X 表／向量 0」）+ Interval 旋钮 + INTE 闸刀 + IE 闸刀；檐刻「中断可选 · 可轮询／事件环」 | p69 "At a minimum, table vector entry 0 shall be initialized and enabled"；p70 "Enable the MSI-X interrupt mechanism …" / "Initializing the Interval field of the Interrupt Moderation register (5.5.2.2)" / "writing a '1' to the Interrupter Enable (INTE) flag of the USBCMD register (5.4.1)" / "writing a '1' to the Interrupt Enable (IE) field of the Interrupter Management register (5.5.2.1)"；p69 脚注 7 "Interrupts are optional. The xHC may be managed by polling Event Rings." |
| F6 | R/S 大闸刀合上（底座刻「USBCMD · R/S 总闸」「OFF/ON」）；端口灯排苏醒：USB2 两灯常亮、SS 两灯闪烁；灯排铭「USB2 两灯＝等待端口复位 · SS 两灯＝自动检测中」 | p70 "Write the USBCMD to turn the host controller ON via setting the Run/Stop (R/S) bit to '1'. This operation allows the xHC to begin accepting doorbell references."（底座另刻「R/S=1 后 xHC 才开始接受门铃」）；p70 "USB2 (LS/FS/HS) devices require the port reset process to advance the port to the Enabled state" / "SS ports automatically advance to the Enabled state if a successful device attach is detected"（两协议族灯语义分开） |
| F7 | 读数巡回（读数 7/7），回 F0 | 契约 §5.2 帧序 |

### 常驻注记
| 断言 | 判据 |
|---|---|
| 顺序自由注记牌「中间各步顺序自由／全部完成须在 R/S=1 前／（p69 Note）」 | p69 Note "This text does not imply a specific order for the following operations, however these operations shall be completed before setting the USBCMD register Run/Stop (R/S) bit to '1'." |
| CNR 檐注「等 CNR=0 再动寄存器」＋铭牌「亮＝未就绪禁写，灭后才可动手（p69）」 | 同 F1 判据（CNR=1 期间禁写 Operational/Runtime 寄存器——避雷清单 §4.2 条；画面刻字为等价口语表述，非判据句逐字） |

### 避雷清单核对（§4.2 域）
- CNR=1 禁写寄存器：F1 灯亮期间无任何插卡/旋钮动作，灯灭后 F2 才动手 ✓
- 顺序自由不画成强制：机器帧序是一种**示例**顺序（注记牌常驻声明顺序自由）；泳道图步骤 2–7 框间无先后箭头 ✓
- 中断可选：F5 檐注「中断可选 · 可轮询 事件环」（p69 脚注 7）✓ MSI-X 未画成唯一形态（注记明示轮询替代）✓
- R/S=1 后 xHC 才接受门铃：闸刀底座刻字，R/S 合上前端口灯不亮 ✓
- USB2 走端口复位 / SS 自动 Enabled 两族分开：灯排铭牌与 F6 灯行为（常亮 vs 闪烁）分开表述 ✓（复位/attach 的完整过程属 §4.3，本节不展开）

### 泳道静态图断言
| 断言 | 判据 |
|---|---|
| 步骤框 1–7 与页码角标 p69/p69–70/p70 | 同上各判据；表可跨页取起始页（事件环四件 p69–70、中断四件 p69–70） |
| 顺序自由组虚框只括步骤 2–6，框上注 p69 Note | p69 Note（"the following operations" 自 MaxSlotsEn 起不含 CNR 等待）；第 1 步（等 CNR）与第 7 步（R/S=1）在框外 ✓ |
| 第 1 条箭头虚线（读）、其余实线（写）；第 8 框→设备注记框虚线（状态上报） | 契约 §4.4（实线=控制/数据流、虚线=事件/状态流）；「读 USBSTS」是读操作 |
| 设备泳道整注「本流程不参与——端口在 R/S=1 后才上报连接」 | p70 收尾句；契约 §1.7 不删泳道 |

### 原文对照五条（正文 blockquote）
五条英文短句逐字取自提取文本 p68/p69/p69/p70/p70（含弯引号 '1'），PDF 重复引用串伪影已剔除；每条尾注 `(xHCI 1.2b §4.2 pNN)` 与 §1 机核对应。

## 3. zoomfs 登记

- 三件套：`zoomBarHtml()` + `zoomFsCss()`（一次）+ `zoomFsScript()`（两实例 scoped，来自 `../../shared/zoomfs.mjs` 单源内联）。
- 双实例 scoped 方式：构建期把 IIFE 内 `document.querySelector(".iso-stage")` / `(".iso-zoombar")` 替换为 `querySelectorAll(...)[0/1]`；第二实例 `window.__zfs` 改名 `window.__zfs2` 前缀避免覆盖（实际实现：泳道卡写 `window.__zfsLane`、动画卡写 `window.__zfs`）。**契约修订建议**：zoomfs.mjs 单源假设单舞台，多舞台页需构建期 scope 化——建议上游加 `stageIndex` 参数。
- **focus 选择器登记**：
  - 泳道卡（stage 0）：`["#grp-free-anchor"]`（顺序自由组虚框锚点，放大定位到教学热点）
  - 动画卡（stage 1）：`['[data-name="cage.rail1"]', '[data-name="panel.face"]']`（卡笼中轨与柜面面板——选取常驻可见实体，规避 data-part 空组 0×0 rect 的聚焦塌陷坑）
- 存活验证：dark `window.__zfs.zoomOf()=3.2`（setZoom(3) 后）；light `__zfs/__zfsLane/__fig42` 均 object（drive eval 输出在 shots 过程日志）。

## 4. 验收门结果（2026-11-03）

| 门 | 命令 | 结果 |
|---|---|---|
| audit | `node build.mjs --audit` / `--light --audit` | 双主题 `audit passed`（111 items · 79 solids · 2 tubes；allow 2 对＝拉线端子连接固有，4x 目检 z-rs-4x-r.png 后放行） |
| lines | `scripts/lines.mjs index.html --select '.fig-wrap .iso-plate'`（两主题） | 双主题 `line ends: 0 of 162 ends on 43 lines float`；`--out` 环形图 shots/lines*.png |
| 双主题 | index.html（dark）/ index-light.html（light） | 均构建、audit、lines、截图通过 |
| 截图 | shots/ 24 张（终验修复轮重拍 lane/page 双主题） | dark/light 机器全景+页面全景、frame-1..8 逐帧（2816px 宽）、lane-dark/light、390px 全景+3.2× zoom、4x/8x 特写；console clean（每张 capture/drive 输出） |
| 语言门 | `python3 scripts/scan_words.py retired index.html / index-light.html`（study 仓根） | **按 2026-11-03 契约修订判据（残留 family ⊆ 豁免表）PASS**：残留 = {柜台×1, 回执×3, 泳道×6}——柜台＝互链 fig4 机器专名「订单柜台」（grep 1:1）；回执＝§3.2 隐喻词清单内正常使用（互链 fig4 描述）；泳道＝图表术语字面用法（泳道图卡标题/图例）。非豁免 family（账本/戏/幕 初稿 7 处）已全部改写归零 |
| 页码机核 | `python3 -I checks.py`（§1 表同源 18 needle） | 18/18 PASS |
| 自包含 | checks.py | 双页 ext_script=0 ext_link=0 other_http=0（仅 www.w3.org xmlns） |
| 互链 | checks.py | ../../index.html、fig3、fig4、shared/zoomfs.mjs、../4.1-command-operation/index.html、../4.3-usb-device-init/index.html 全存在（兄弟节页面主会话终验轮已建）；页脚 EVIDENCE.md 链接在位 |
| zoomfs | 双主题 eval | `__zfs`/`__zfsLane` object、zoomOf 1→3.2 |

## 5. 零件与帧数

- 零件（audit items）111：基座组（底板/4 地脚/凹槽/角螺丝/标尺条/铭牌）、主机仓（柜身两段/柜顶盖/通风刻槽/面板/铭牌）、卡笼（三轨/两挡块/六槽位框/六卡）、控件排（CNR 座+罩、CONFIG 座+旋钮+数字窗、ERSTSZ 框+轮+启用灯、Interval 座+旋钮、INTE/IE 座+铰柱+触点+杆）、R/S 闸刀（底座/铰柱/触点/杆）、桁架（双柱+帽+梁+端挡+滑车+双爪）、文书台（身/面/铭牌/卡库托盘+叠卡/三拉杆）、拉线 2 条+端子柱 2、端口灯排（基座/注记牌/四灯座+罩/速度铭）、注记牌、标签檐。
- 帧数 8（F0–F7）；读数 `启动步 n/7 · CNR 0/1 · R/S 0/1 · 端口活动 n/4` 与帧模型同源。
- 刻字台阶：主名 4.8–6.4 世界单位（×KS 1.579 ×页内 1.75 ≈ 13.2–17.7px ≥11px 等效）；最小微字 4.0（≈11.05px）；页内正文 16.5px、泳道框字 16px@1×、机内主刻字走 topMatrix 水平面（等距下不斜切）。

## 6. 契约修订建议（报主会话裁决，未改 DESIGN.md）

1. **§5.2 泳道图「括住中间六步」**：规范实际顺序自由组 = MaxSlotsEn、DCBAAP、CRCR、事件环四件、中断四件共 **5 个操作框**（系统 I/O memory maps 为可选预备步骤未画入；R/S=1 与端口上报是边界不在组内）。本页虚框括步骤 2–6（5 框）。
2. **§8 可读性「机内刻字 ≥11px 等效」的换算式**建议明文化：等效 px = 世界字号 × KS × (页内显示宽/viewBox 宽)（本页 = 字号 × 2.76）；竖直面（+y）vtext 因 45° 斜切在大段文字下不可读，控件名宜走 topMatrix 水平面（本页标签檐方案）或斜面，建议契约补一条「柜面/竖直面禁排多行小字」。
3. **shared/zoomfs.mjs 多舞台**：单源 IIFE 写死 `.iso-stage` 首个；多卡页需构建期 scope 化替换（本页做法见 §3）。建议上游加 `stageIndex`/`stageSelector` 参数。
4. **机器隐喻词清单（§3.2）建议增补**：「端子」「（标签）檐」「卡笼」「计数轮」——本页已用（卡/旋钮/闸刀/灯排/铭牌在列；檐/笼/轮/端子为配电台实件名，未列入清单，若按严格白名单需追认）。

## 7. 构建日志

见同目录 `BUILD-LOG.md`（轮次、audit 问题收敛 176→84→54→24→13→9→3→1→0、整改记录）。

## 8. 终验修复轮（2026-11-03）

- 流程图第 8 框→设备框箭头尖端距框边 3px（marker 预留超过 ±2.5 容差）→ 端点收紧至 -2px（水平箭头统一收紧）；check_lesson_svg_layout.py 双主题 svg0 findings=0（机器卡 svg4 文本矩阵报错为已知假阳性，按主会话裁定不修）。
- 页头导航直链 ../4.1-command-operation/index.html 与 ../4.3-usb-device-init/index.html（DESIGN §4 模板第 2 条；终验指示覆盖早前「暂指目录页」处理；兄弟节页面主会话终验轮已建，checks.py 验证存在）。
- 页脚「证据见 EVIDENCE.md」补 href="EVIDENCE.md"（模板第 5 条）。
- 防回归全绿：audit passed ×2、lines 0 ×2、语言门残留纯豁免集 {柜台1, 回执3, 泳道6}、checks 12/12 + 兄弟页 2/2 PASS、页码 18/18；受影响截图重拍（lane-dark/light、page-dark/light）。
