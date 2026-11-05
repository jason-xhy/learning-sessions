# EVIDENCE.md —— §4.23 电源管理（2026-11-04，anatomy 机器版「电源井配电台」）

**范围声明（机器化施工）**：本页由「流程骨架版」（泳道生成器 lane_page.mjs 量产件，原件在
`backup-20261104/`，sha256 见该目录 SHA256SUMS.txt：build dbd51737…、EVIDENCE 7e393801…、
index 1bfb0c68…/1a2bb5d4…）升级为 **anatomy 机器形态**——六节机器升级批次（4.10/4.12/4.14/
4.15/4.19/4.23）的末节。现行页面结构对齐 4.15/4.19：正文块（要义+原文对照）+ **静态泳道
总览卡** + **机器动画卡**（.fig-ctl 控制条）+ 对照表格卡 ×2 + 互链卡 + 页脚；双主题
（index.html=dark、index-light.html=light）。

## 0. 机器概况与主题名

- **机器**：「电源井配电台」——任务派单建议名直接沿用（词表自查：电源井/配电台均不在
  scan_words RETIRED_WORDS 词族；机器隐喻词使用面=配电台（实件名）/总控台/文书台/试验盒/
  镜像柜/卡槽/事件匣/铭牌/灯排/票据/旗/闸刀/抽屉/立板/端子柱——§3.2 清单与实件名范畴）。
  一台电源配电台：**台顶两口井柜**供着 xHC——Core 井柜（带供电闸刀+供电灯，闸刀一拉=断
  Core 井电）与 Aux 井柜（供电灯常亮，「AC 期间常在/PME 唤醒上下文在此/初次上电/HCRST
  复位」刻立面）；**左文书台**（xHCI 驱动）——写入面板立 CSS/CRS 双旗（推上=置位）、
  存档/恢复卡槽（写入卡五种文案）、事件匣（PME# 回执落位）、台面 PORTSC 带无；**台前
  镜像柜**（三抽屉立柜：①寄存器镜像 ②xHC 内部态 ③内存镜像，抽屉面刻名+状态签+状态线）；
  **中总控台**（xHC）——立面 **PCI 功耗态转筒窗**（D0/D1/D2/D3hot/D3cold，Table A-1）+
  **寄存器面板窗**（十组寄存器名三行，断电灰化=回默认）+ **五灯排**（SSS/RSS/SRE/R-S/PME）
  + 帧注记窗 + 台顶 PME# 出卡口/事件短管；**台前 MEL 锚牌**；**中段北带链路态映射板**
  （Table 4-12）；右**设备试验盒**——链路态窗 + PME 唤醒钮 + 教学锚铭牌；两线：写入拉线
  （面板端子柱→总控台左面端子凸台）、事件回流管（台顶短管→事件匣）+ 总线链路（票据走行）。
- **概念一句话**：台顶两口井柜供着 xHC——Core 井闸刀一拉，寄存器面板熄灭回默认、D 态
  转筒走 D3hot→D3cold，Aux 井灯不灭（PME 唤醒上下文活过断电）；软件侧三份镜像进镜像柜，
  CSS/CRS 双旗只在停机态可推；唤醒回 D0 后寄存器先写回、Restore 后执行，写 CRCR 合闸
  R/S='1' 复跑。
- **概念↔机制映射**（对象即解释）：

| 机器件 | 规范机制 | 页码 |
|---|---|---|
| Core 井柜+供电闸刀+供电灯（断=灭+面板灰化） | Core 井可被系统关断；断电=移除 Core Well（存档步 10）；Core 井内存寄存器 Chip HW Reset/HCRST/D3hot→D0 回默认 | p310/p312/p311 |
| Aux 井柜+常亮供电灯+立面刻字 | Aux 井 AC 供电期间常在；仅初次上电/HCRST 复位；PME 唤醒上下文活过断电；Legacy Support 寄存器例外（页面表格承载） | p310–311 |
| PCI 功耗态转筒（五态列全，演示经 D0→D3hot→D3cold→D0） | PCI PM 功耗态 Table A-1：D0 必需/D1 D2 可选/D3hot 必需（深 USB 睡眠）/D3cold 必需（全睡） | p557 |
| 寄存器面板窗（十组名三行；F5 断电灰化=F7 写回点亮） | 存档步 5 按序读十组（USBCMD DNCTRL DCBAAP CONFIG ERSTSZ ERSTBA ERDP IMAN IMOD VTIO）；恢复步 4 写回九组（无 USBCMD）；断电回默认 | p312–313 |
| CSS/CRS 双旗+面板刻字「两旗只在停机态可置」 | Save State/Restore State 两控制位只在 R/S='0' 停机态可置 | p311–312 |
| SSS/RSS 灯（保存中/恢复中亮→灭=完成判据） | CSS='1' 等 SSS→'0'；CRS='1' 等 RSS→'0' | p312–313 |
| SRE 灯（恒灭=正常；注记「查 SRE」） | Save/Restore 完成后查 SRE；保存态损坏→SRE='1' Restore 终止；Save 后先 Run 再 Restore 亦报 SRE（Aux 井保住才报） | p313–314 |
| 镜像柜三抽屉（①寄存器 ②内部态 ③内存镜像） | 三份镜像：十组寄存器（步 5）/xHC 内部态（步 6–7：RCS、Enabled Device Slots）/内存镜像（步 8–9：SPR、DCBAA/Contexts/命令环/事件环——整棵树软件保存） | p312 |
| 抽屉③签「已回原址」 | Restore 要求镜像回同一物理地址，否则未定义行为 | p312 Note/p314 Note |
| PME 唤醒钮→resume/LFPS 票据沿链路→PME 灯+PME# 事件卡入匣 | 设备远程唤醒（§4.15.2.1）→ xHC 按 PCI PM 规则断言 PME# 并保留芯片上下文；D3hot→D0 内部复位、PMCSR.PME_Status/PME_En 保持（A.1.1） | p254–255/p557/p558 |
| R-S 灯（Run 门；F1 灭 F9 亮）+ 写 CRCR 卡 | 命令环重初始化（Cycle 对齐 RCS）→写 CRCR 重启→R/S='1' | p313 |
| 设备铭牌「端口挂起时序归 §4.15」+注记 F9 | 根集线器端口态不在 Save/Restore 覆盖内——软件走拓扑重初始化 PORTSC/PORTPMSC/PORTLI+逐端点门铃；设备应仍挂接、USB 地址不变 | p313–315 |
| 链路态映射板（Table 4-12 五族）+F10 设备窗 U1/U2 浅态往返 | On=L0↔U0/细粒度 U1 <~10μs/粗粒度 L1(Sleep)↔U2 ~1ms/Suspend=L2↔U3/Off=L3 断 VBus；LS/FS/HS 永不报 U1；USB2 写 PLS='2' 起 LPM 事务、L1S 三结果、硬件 LPM（HLC/HLE/BESL 强制） | p316–324 |
| MEL 锚牌（F11 点亮） | Max Exit Latency=路径最坏退出延迟一个值兜住；MEL='0'=无电源管理；SS Isoch 提前 MEL μs 发 PING（No Ping Response Error）；MEL 改动走 Evaluate Context（Max Exit Latency Too Large Error，CMC/CME 门控） | p324–326 |

- **零件统计（audit 口径）**：**93 items · 60 solids · 2 tubes**（写入拉线/事件回流管，端环
  rim 落端子柱顶与端口凸台面过 terminals）——预算 40–113 内。
- **主线选择（派单建议采纳）**：**D3 进出+寄存器丢失恢复**（F1–F9 逐帧纵深）；链路
  U1/U2 硬件 LPM 以 F10 对照帧+映射板承载（不逐帧展开）；端口挂起/恢复时序互链 §4.15
  不在本机复现（F1 注记+设备铭牌+互链卡三处指路）。
- **帧数 12**（F0–F11），DUR [3000,4800,5400,6600,4800,7200,5400,6600,7200,5400,4200,3000] ms，
  巡游驻留 5.5s。
- 读数（卡右下，与帧模型同源）：`步 n/11 · 井 Core 开|断 · xHC <D0|D3hot|D3cold> · 旗 <—|CSS|CRS|CSS+CRS> · 镜像 n/3`。

## 1. 页码机核（pypdf needle，全部现场跑）

命令（本节目录内 `python3 pagecheck_423.py`，等价于 study 仓根：
`python3 scripts/xhci_spec_pagecheck.py 310 "4.23 Power Management" 310 "Core power may be switched off" …`，
41 对 needle 全列见 pagecheck_423.py）→ **41/41 PAGE-OK，PAGECHECK-PASS**（首跑 40/41：
`'save their state'` 在 p311 断行假阴性——提取文本实证该短语跨行断开、完整串在 p312 步 5
「and VTIO and save their state」，改 needle p312 `'and save their state'` 后全过）。覆盖：
节头/两口井规则/井复位条件/LHCRST/两旗前提/FSC/存档步序/CSS/SSS/断 Core 井/CRS/RSS/
拓扑重初始化/端口不覆盖/SRE/§4.23.3 指路/LPM 强制/Table 4-12/永不报 U1/USB2 LPM 入口/
硬件 LPM（HLC/HLE/BESL 强制）/MEL 三成分/No Ping/Too Large/上界 §4.24 p327/Appendix A
（Table A-1、出 D0 前端口挂起、Power State Transitions p558）/§4.15 互链锚 p252·p254。

## 2. 帧序断言（12 帧）

| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 全景 | Core/Aux 井灯亮、D0、R-S 灯 Run、寄存器面板十组亮、设备窗「U0 跑包」、镜像柜三抽屉空；注记「两口井：Core 可断 · Aux 常在」 | p310/p557（D0 全醒） |
| F1 停端点停机 | Stop Endpoint 卡入槽→R-S 灯灭（R/S='0'）；注记「停端点→命令环收讫→停机；出 D0 前端口先挂起（§4.15）」 | p312 步 1–3/p557 |
| F2 读寄存器 | 「读寄存器｜十组按序」卡→抽屉①开（签「十组按序」）；注记存档步 5 | p312 步 5 |
| F3 Save State | CSS 旗推上→「CSS='1'」票走拉线→SSS 亮（保存中）→灭（完成）→抽屉②开（签「RCS·槽集」）；注记两旗只在停机态 | p312 步 6–7/p311–312 |
| F4 存内存镜像 | 抽屉③开（签「DCBAA·环」）；注记整棵结构树软件保存+同物理地址 | p312 步 8–9/p312·314 Note |
| F5 断 Core 井 | Core 闸刀拉下→Core 灯灭（闪灭）→转筒 D0→D3hot→D3cold 两跳→寄存器面板灰化（regs=false）→设备窗「挂起/断电」；Aux 灯保持亮 | p312 步 10/p311/p557（D3cold 下游挂起或断电） |
| F6 唤醒 | PME 钮压下→设备窗「发唤醒信令」→resume/LFPS 票沿链路设备→xHC→PME 灯亮→「PME# 唤醒」事件卡经出卡口走事件管入事件匣（events=1） | §4.15.2.1 p254–255/p557（断言 PME# 并保留上下文） |
| F7 上电回 D0 | Core 闸刀合→Core 灯亮→转筒回 D0→「写回寄存器｜九组」票→面板点亮（regs=true）→抽屉③签「已回原址」；注记 D3hot→D0 内部复位+写回九组（无 USBCMD） | p312–313 恢复步 1–4/p558 |
| F8 Restore State | CRS 旗推上→「CRS='1'」票→RSS 亮→灭→抽屉②签「已恢复」；SRE 灯保持灭（查 SRE=0 正常）；注记「寄存器先写回 · Restore 后执行」 | p313 步 5/p313–314 Note |
| F9 重启复跑 | 「写 CRCR」+「R/S='1'」票→R-S 灯亮→数据票跑链路→设备窗「U0 恢复」；注记端口态不在覆盖内·软件重走 | p313 步 6–10/p314 Note |
| F10 链路 LPM 对照 | 映射板点亮；设备窗 U1 浅待（<~10μs）→U2 待（~1ms）→U0 往返演示；注记 Table 4-12+挂起 U3 归 §4.15 | p316–317 |
| F11 MEL 读数巡回 | MEL 锚牌点亮（最坏退出延迟兜住路径/SS Isoch 提前 MEL μs 发 PING）；回 F0 | p324–326 |

**帧序 drive 真值**（§5 门表命令）逐行输出与上表一致：20 条断言（12 终态+5 瞬态 until 锚定+
3 复合）全 true、console clean。瞬态断言用 until 轮询锚定（SSS/RSS 灯亮、D3hot 转筒中途、
设备发唤醒窗）——超时即 throw 不假阳。

## 3. 常驻机构与泳道断言

| 断言 | 判据 |
|---|---|
| 面板刻字「CSS 旗 · Save State（p312）／CRS 旗 · Restore（p313）／两旗只在停机态可置（p312）」 | p311–313 |
| 台顶标「电源井对 · 供 xHC（p310）」+PW-1 铭 | p310 |
| Core 井面刻「HW Reset/HCRST/＋D3hot→D0 → 回默认」 | p311（Core 井内存寄存器复位三条件） |
| Aux 井面刻「AC 期间常在（p310）／PME 唤醒上下文在此／初次上电/HCRST 复位」 | p310–311 |
| 井柜闸刀通/断触点+标签；断=移除 Core Well（figCard keys 承载） | p312 步 10 |
| 立面铭「xHC · 电源管理」+「PCI 功耗态」窗标 | §4.23 总域/p557 |
| 五灯副签（保存中/恢复中/存毁查/Run 门/唤醒） | p312–314/p557 |
| 映射板五行（Table 4-12 五族+页码） | p316–317 |
| MEL 锚牌两行 | p324–326 |
| 设备锚牌「只见链路信令与 VBus／端口挂起时序归 §4.15（互链）／寄存器/Save 对设备不可见」 | p252–255/p314–315 |
| 泳道总览 9 步+底部两注记（端口重走+PCI 功耗态表） | p310–p558（同帧序判据） |
| 表格卡三张（井对照/PCI D 态/Table 4-12）+Save/Restore 要点表 | 沿用骨架版逐行判据（p310–326/p557–558），页码 §1 41 needle 复核覆盖 |

### 原文对照五条（正文 blockquote）
逐字取自提取文本 p311/p312/p314（Note）/p315–316（Note，剔除脚注指引跨行）/p324；
弯引号 ‘’ 按提取文本保留；每条尾注 `(xHCI 1.2b §x pNN)` 与 §1 机核对应（骨架版沿用）。

## 4. 泳道去留决定

**保留泳道静态总览卡、退役其步进模式（机器接管）**——4.15 同款决定（同为泳道骨架升级件）：
1. DESIGN §4 模板双卡（总览+动画）是板块常态形态；
2. 骨架版单卡双模式的步进动画与机器 12 帧主线重合度高；泳道的三方同时性时间线
   （驱动/xHC/设备同列对齐+九步全页码）是机器受视角所限给不了的教学视角，保留；
3. USB PD 走 ACPI/两错误完成码/硬件 LPM 细则（Table 4-13）留在泳道注记与表格卡
   （机器不逐帧展开，帧数预算取舍）。
实现：泳道卡由 lane_page 生成器改为本 build.mjs 内静态 SVG（4.15 三列时间线形态，三方
配色 §3.3 内联）；lane_smoke 门对非生成器页不适用（4.15 同裁定），等价替代＝ctl_probe +
帧序 drive + 遮挡探针三件。

## 5. 验收门结果（2026-11-04 实跑，全绿；命令完整可复跑）

| 门 | 命令（完整可复跑） | 末行输出 |
|---|---|---|
| audit ×2 | `node build.mjs --audit` / `node build.mjs --light --audit`（节目录内） | `audit passed` ×2（audit · 2 tubes · 60 solids · 93 items · 1 depth states · 219 overlaps · 219 order rules；clearance/terminals/loose/folds/support/sunk/depth/through/self-overlap/wobble/saddles/stand-in/crowding 全 0） |
| lines ×2 | `node ~/.zcode/skills/anatomy/scripts/lines.mjs index.html --select '.fig-wrap .iso-plate' --out shots/lines-dark.png`（+ index-light.html） | `line ends: 0 of 42 ends on 40 lines float` ×2 · console clean ×2 |
| 文字墨迹 SAT | `python3 ink_check.py`（本节目录；getBBox×getScreenCTM 四角 SAT，帧 0/1/3/5/6/7/10 × 双主题） | `ink-overlaps 0` ×14（首轮 13–20——修复链见 §7 坑 3/4/5） |
| 遮挡探针 ×2 | `python3 scripts/xhci_spec_occlusion_probe.py lessons/xhci-spec/ch4/4.23-power-management/index.html --frames 12 --dwell-ms 8000`（+ index-light.html；study 仓根） | `OCCLUSION-PASS` ×2（首轮 2 命中——修复链见 §7 坑 2） |
| 控制条探针 ×2 | `python3 scripts/xhci_spec_ctl_probe.py /Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.23-power-management/index.html fig42`（+ index-light.html） | `CTL-PROBE-PASS` ×2（四钮实驱；帧计数取 `window.__fig423.frameOf()`——本页暴露 `__fig423` 主名 + `__fig42` 兼容别名） |
| 页码机核 | §1 命令（pagecheck_423.py 41 对） | `PAGECHECK-PASS`（41/41） |
| 语言门 ×2 | `python3 scripts/scan_words.py retired lessons/xhci-spec/ch4/4.23-power-management/index.html`（+ index-light.html；study 根） | `total=6 {'回执': 1, '泳道': 5}` ×2——残留 family ⊆ 豁免表 {回执,柜台,泳道}，PASS（回执=§3.2 隐喻词；泳道=总览卡图表术语；首轮咬「重演」×2——改「复现」后清零） |
| 帧序真值 | `node ~/.zcode/skills/anatomy/scripts/drive.mjs index.html --actions steps-frames.json` | 12 帧逐行正确（§2 表）：F0 `步 0/11 · 井 Core 开 · xHC D0 · 旗 — · 镜像 0/3` / F1 `rsOff=true wcard=true dev=true` / F2 `镜像 1/3 d1=true regs=true` / F3mid `sssOn=true` / F3 `旗 CSS css=true sssOff=true d2=true` / F4 `镜像 3/3 d3=true` / F5mid `drumD3hot=true` / F5 `井 Core 断 · xHC D3cold coreLampOff=true auxLampOn=true regs=false dev=true` / F6mid `devWake=true` / F6 `pmeOn=true tray=true events=1` / F7 `coreOn=true drumD0=true regs=true d3回址=true` / F8mid `rssOn=true` / F8 `旗 CSS+CRS crs=true rssOff=true sreOff=true d2已恢复=true` / F9 `rsOn=true dev=true` / F10 `lpmLit=true dev=true` / F11 `anchorLit=true`；console clean |
| 交互冒烟 | 机器节形态：ctl_probe + 帧序 drive + 遮挡探针三件（lane_smoke 不适用，§4） | 三门 PASS |
| console | capture/drive 全部 shots 过程 | 每张 `console: clean`（双主题；含 390/--reduced/zoom 变体；ink_check pageerrors=[] ×2） |
| 自包含 | `grep -c 'http://\|https://' index.html`（+light） | 各 3，命中全为 `http://www.w3.org/2000/svg` xmlns（`grep -o` 复核唯一值）→ PASS |
| 互链 | 页面相对链接目标存在性（python3 os.path 循环） | 双页 15 hrefs missing=[]；4.22/4.24/4.15/4.20/4.2/4.21 直链节页 + 板块 index + EVIDENCE.md；待建节（§5.4.1/§5.4.2/§5.4.9/Appendix A）链板块 index.html 并标「待建」 |

## 6. zoomfs 登记与字号台阶

- 三件套：`zoomBarHtml()` ×2 + `zoomFsCss()`（一次）+ `zoomFsScript()` 两实例 scoped（构建期
  querySelector→querySelectorAll[0/1]；泳道卡 `__zfsLane`、机器卡 `__zfs`）。
- focus 选择器：泳道卡（stage 0）`["#lane-svg .notebox"]`；机器卡（stage 1）
  `['[data-name="con.body"]', '[data-name="well.core"]']`（常驻实体，规避 data-part 空组聚焦塌陷）。
- 存活验证：drive eval `__zfs.setZoom(3.2)` → `phone-390-zoom.png` / `frame-zoom32-dark.png`
  （readout 行同步入画）。
- 等效 px = 世界字号 × KS 1.866 × 页内显示比（1420/920 ≈ 1.54）≈ **世界字号 × 2.875**：
  - 主层：工位铭牌主行 9（≈25.9px）/副行两行 5.0（≈14.4）；立面铭「xHC · 电源管理」5.4；
    转筒态名 5.8（≈16.7）；井柜题 4.2（≈12.1）；设备窗值 6.4；MEL 锚牌题 5.0；面板题
    （寄存器面板 · Core 井）4.0。
  - 细节层清单（1× ≥7px 等效、3.2× 档充裕）：五灯名 4.0/副签 3.2、寄存器行 3.4、井柜行
    3.0、抽屉名 3.4/签 3.2、台顶散注（PW-1/出卡口/事件出口/电源井对）3.6–4.2、票据两行
    3.8、事件卡 3.2–3.4、写入卡 3.4–3.8、映射板行 4.0、旗题 3.6、MEL 行 3.8–4.0、
    「PCI 功耗态」窗标 3.0、闸刀通/断 3.2。
  - 正文 16.5px、泳道框字 16px/页码 13px@1×、表格 14.5px。

## 7. 施工坑与绕法（本轮实测）

1. **井柜灯 dome 判 loose（support 门）**：台面灯 dome 框若起在 seat 盘前方之外（间隙
   0.4 > touch 0.15），表面求距永不接触 → 断链判 loose。修：seat 盘跨距加到 2.2、dome 框
   内嵌 2.15（dome 底部回接进 seat 盘内）——4.19 立面灯是 0.15 临界擦过，属侥幸形态，
   本节固化「内嵌 0.05」写法。判据：dome 框偏移必须 < seat 盘 s1。
2. **镜像柜初版立台面挡卡槽（遮挡探针实锤 overlap=1.0）**：写入卡文字被后画的柜体整盖
   ——立面大件立在南侧必扫台面北带。修：镜像柜迁台前地面（y 8..32），卡槽视窗复通。
   通用判据：台面南沿 20 单位内禁立高于 15 的立面件。
3. **立面竖排文字行距的剪切放大（墨迹 SAT 连环咬）**：等距立面文字 quad 是斜带——同行
   宽文本行距需 Δz≥7（本节实测：Δ4.7/5.4 咬、Δ7 过）；台铭副行 22 字单行放不下三行叠 →
   拆「规范原文称/system software」两短行。判据：立面多行先按 Δz 7 排，放不下拆短行。
4. **地面立板（y −26 带）与 CON 立面窗文字同屏带相撞（结构级）**：骨架版注记板沿用的
   地面位置（4.19 BOARD2 位）在 4.19 可行是因其板立台顶 z 99+；地面立板文字带与总控台
   立面窗（drum/寄存器窗 z 58..88）屏幕带大面积相交——两口井复位纪律板两易位（地面
   y−70 与 BOARD1 撞、台顶东段与事件管撞）后**退役**，内容并入两口井柜立面刻字（井柜
   本就是该纪律的载体）。判据：总控台立面窗前面的地面带（y −40..40）禁放带字立板。
5. **转筒窗外表项仍进 getBBox（墨迹 SAT 假阳）**：|i−pos|≤1.3 邻域渲染时，转筒过渡位
   的邻项 base 会落在窗外（被 clipPath 裁掉但 bbox 仍在）→ 与 Aux 井面文字假交。修：
   drumSvg 增加 `base ∈ [z0+0.8, z1−0.8]` 窗内过滤（遮挡探针先例「只渲染窗口邻域」的
   收紧版）。判据：所有转筒/数码窗类件一律只渲染窗内表项。
6. **事件管直角绕行折出自交（audit self-overlap）**：为避让井柜先走正东再正北的直角
   航点在屏幕上折返（1.05px 半径 < 管半宽 1.67px）。修：改 4.19 同形斜腿航点
   （短竖段→东北斜腿→西向长腿），拐角 ≤45°。判据：管路拐角世界角 ≤45°，禁止直角
   楼梯形航点。
7. **首段竖管 fillet 自折**：起点 3 单位竖段配 fillet 5 吃满整段在屏上折返。修：首段
   加长到 6（z 104→110）。判据：fillet 半径 ≤ 最短航段长 −1。
8. **语言门咬「重演」×2**：派单建议句「互链不重演」本身带退役词族（演 family）。修：
   改「不复现」。判据：新句子入页前先过 scan_words 自查（本节 EVIDENCE §5 门行）。
9. **pagecheck 断行假阴性（复发性，本节新例）**：`'save their state'` 在 p311 跨行断开
   （完整短语在 p312）——needle 单行短词+提取文本现场核的判据再次生效。
10. **读图通道本轮可用（与 4.12–4.19 各节相反）**：直传 PNG 与 CDN URL 双路均过
    analyze_image（缩略图判读结构 PASS；小字为登记细节层，3.2× 档可读）——通道状态随
    会话波动，四证闭环仍为主判据，视觉目检作补充而非替代。

## 8. shots 清单（39 张，console 全 clean）

- 页面全景：page-dark.png / page-light.png（1500 宽整页，无横滚）
- 机器卡：machine-dark.png / machine-light.png（F0 全景）
- 泳道卡：lane-dark.png / lane-light.png
- 逐帧：frame-01-stop … frame-11-mel-dark（11 张，drive 步进取景）+ frame-05/07/10-light（3 张）
- 缩放：frame-zoom32-dark.png（drive 内 3.2×）+ phone-390-zoom.png（__zfs.setZoom(3.2)）
- 390：phone-390-full-dark.png（390×9437 整页）/ phone-390-dark.png / phone-390-light.png /
  phone-machine-390.png（358 宽机器卡）
- reduced：reduced-dark.png（prefers-reduced-motion）
- 4× 特写：z-wells（双井柜+闸刀）/ z-console（转筒+寄存器窗+五灯）/ z-desk（双旗+卡槽+
  事件匣）/ z-cab（镜像柜三抽屉）/ z-dev（链路+试验盒+锚牌）× dark/light（10 张）
- lines：lines-dark.png / lines-light.png
- 工作脚本：steps-frames.json（帧序真值）、steps-shots.json / steps-shots-light.json
  （截图驱动）、ink_check.py（墨迹 SAT）、pagecheck_423.py（页码 needle 清单）。

## 9. 已知边界与共享件建议（报主会话）

1. **ink_check 固化建议再报**（4.19 §9.1 同款）：本节第三次手工重建同型墨迹 SAT 链
   （4.14/4.19/4.23），且它抓到遮挡探针必漏的立面文字互叠与转筒窗外假阳——
   `scripts/xhci_spec_ink_probe.py` 化时机已过熟（本节 ink_check.py 可直接升格，
   FRAMES 参数与主题循环已参数化一半）。
2. **立面文字行距 Δz≥7 判据建议登记为板块级**（§7 坑 3）：三条姐妹节（4.12/4.14/4.15）
   的立面多行件可按此自查；与 4.19 §9.2「水平面长文禁令」配对成两条排版铁律。
3. `__fig42` 别名与 4.2 页同名（4.14/4.15/4.19 同款边界，两页互不加载无冲突）；主会话在
   探针登记 `fig423: window.__fig423.frameOf()` 后可移除别名。
4. 机器演示主线=D3 进出+寄存器丢失恢复；链路 LPM 只在 F10 对照帧+映射板+设备窗浅态演示
   （Table 4-13 BESL 编码/两错误完成码/HIRD Cases 1–2 细则以表格卡与泳道注记承载，
   帧数预算取舍）；SRE 出错面只演「查 SRE=0 正常」路径（损坏报错不逐帧展开，灯+注记承载）。
5. PCI 功耗态 D1/D2 在转筒列名但不经帧（Table A-1 可选态，主线走 D0→D3hot→D3cold）；
   PMCAP/PMCSR 桥角色以 PME# 事件卡+A.1.1 注记承载，PCI 侧寄存器细节归 Appendix A
   （待建节互链）。
6. 视觉像素级目检本轮通道可用（§7 坑 10）：machine-dark 与 z-wells/z-console 判读
   PASS——次要瑕疵（台面南带留白较空、细节层小字低对比）属设计台阶内，未发现结构性
   缺陷；上线评分轮可按需补拍其它特写。
