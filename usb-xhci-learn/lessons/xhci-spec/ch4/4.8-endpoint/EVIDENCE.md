# EVIDENCE.md —— §4.8 端点（2026-11-04，状态图＋表格节量产）

规范文本：/tmp/spec-audit-txt/xhci-1.2b.txt（p143–149 逐行细读）；引文与公式逐字取自提取文本并人工剔除断行伪影。

## 1. 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| USB 设备最多 31 端点：15 IN + 15 OUT + 1 Control；EP0 双向 | §4.8 p143（引文① PAGE-OK `up to 31 endpoints`@p143） |
| 端点号选 16 对 Endpoint Context 之一对，方向位选 IN/OUT | §4.8.1 p144（引文② PAGE-OK `16 Endpoint`） |
| 双向端点用该对 IN（奇）格管理 | §4.8.1 p144（引文③，`“ignored”` 原词在 p144 行 8348） |
| EP Number>0 的双向端点，OUT（偶）格被 xHC 忽略；软件用 IN（奇）格 | §4.8.1 p144 末段（行 8358–8361） |
| DCI 公式：Isoch/Interrupt/Bulk `DCI = (Endpoint Number * 2) + Direction`（OUT=0/IN=1）；Control `DCI = (Endpoint Number * 2) + 1`；Slot Context DCI=0 | §4.5.1 p83（PAGE-OK `Endpoint Number * 2`@p83；行 4695–4704） |
| 图4-4：DCI 0=Slot Context、EP0 BiDir（Direction=N/A）、EP1 OUT/IN=DCI 2/3 … EP15 OUT/IN=DCI 30/31 | §4.8.1 Figure 4-4 p144（行 8314–8339） |
| 输入端点上下文全字段（含 Reserved）先清 0，再按类型填例外 | §4.8.2 p144（行 8364–8365） |
| EP0 初始化：EP Type=Control、Max Packet Size=设备描述符 bMaxPacketSize0（取回前可用默认值）、CErr=3、TR Dequeue Pointer=传输环首段、DCS=1 | §4.8.2.1 p145（行 8374–8387） |
| 描述符取回后用 Evaluate Context 更新 EP0 Max Packet Size | §6.2.3.1 p417（行 24128 附近：`software may issue an Evaluate Context Command to inform the xHC of the actual Max Packet Size`）；§4.8.2.1 原文措辞「Evaluate Endpoint Command」见「已知边界」#1 |
| EP State 五态编码 0–4 与各态原文含义（Disabled/Running/Halted/Stopped/Error） | §6.2.3 Table 6-8 p413–414（PAGE-OK `Endpoint State (EP State)`@p413；行 43826–43843） |
| Address Device 使 EP0 Disabled→Running（注1）；Configure Endpoint（A=1·D=0）使其余端点 Disabled→Running（注2） | §4.8.3 注1–2 p146（行 8470–8474） |
| Configure Endpoint（A=0·D=1）/ Reset Device：任意态→Disabled，EP0 除外（EP0 可 Stopped→Running 或保持 Stopped）（注3）；Disable Slot：全槽端点任意态→Disabled，含 EP0（注4）；CEP（A=1·D=1）Stopped→Running，EP0 除外（注6）；Stopped 态可先 Set TR Dequeue Pointer 再门铃（注7） | §4.8.3 注3/4/6/7 p146–147（行 8475–8478、8485–8495） |
| Halt 条件（STALL、Invalid Stream Type/ID Error、Babble、Event Lost、USB Transaction、Split Transaction Error）使 Running→Halted；Reset Endpoint 清断 Halted→Stopped；Halted 下 Stop Endpoint 无效果 + Context State Error | §4.8.3 p147（行 8501–8509；PAGE-OK `Context State`） |
| EP0 的 STALL：任一阶段都进 Halted，Reset Endpoint 清断，下一个 Setup Stage TD 门铃回 Running；functional stall 与 protocol stall 同样处理 | §4.8.3 p147 两段 Note（行 8510–8521） |
| TRB Error 使 Running→Error（should）；Set TR Dequeue Pointer 使 Error→Stopped；Error 下 Stop Endpoint 无效果 + Context State Error | §4.8.3 p147（行 8525–8530） |
| Stop Endpoint 使 Running→Stopped；Stopped 态环所有权归软件（可增删改 TD）；门铃使 Stopped→Running；CEP 也使 Stopped→Running 但不影响 EP0 | §4.8.3 p148（行 8544–8553；引文④ PAGE-OK 语句在 p148） |
| 去配置（Configure Endpoint DC=1）/ Reset Device：Running/Halted/Error/Stopped→Disabled（EP0 除外）；Disable Slot：任意态→Disabled（含 EP0， detach 时软件义务） | §4.8.3 p148（行 8554–8560；PAGE-OK `deconfigure`@p148） |
| Stopped 态不产生 Transfer Event；门铃致 Stopped→Running 时 xHC 先更新 EP State 再发 Transfer Event | §4.8.3 p148（行 8564–8567） |
| enabled 判据：不在 Disabled 态即 enabled；Disabled 端点门铃禁写；xHC 复位后非 Disabled 端点 EP State 值无效 | §4.8.3 p148 注（行 8568–8572；引文⑤） |
| Running 有 Busy/Idle 两子态；环跑空不退出 Running；TRB Error 可能不被优雅处理（未定义行为/HCE），软件责任=正确格式 TRB | §4.8.3 p148 注（行 8537–8543） |
| EP State 可能滞后：软件应维护内部镜像变量（命令完成事件/TRB Error/STALL/门铃四条更新法） | §4.8.3 p149（行 8588–8620；PAGE-OK `instantaneous state of an endpoint`@p149） |
| Disabled 端点门铃 → Endpoint Not Enabled Error（Transfer Event，ED/TRB Pointer 置 0）；xHC 忽略 Halted/Error 端点的门铃引用 | §4.7 p143（行 8281–8300，跨节引用已在页内标注 §4.7） |
| Streams 启用时 DCS 不适用 | §4.8.2.3 p145（行 8428–8429，页内互链卡引用） |

## 2. 状态图（Fig 4-5 重绘）状态与迁移清单

状态（EP State 编码 = Table 6-8 p413–414）：Disabled=0 · Running=1 · Halted=2 · Stopped=3 · Error=4。

11 条迁移箭头（编号=SVG data-arrow；判据页为角标所刻）：

| # | 迁移 | 条件标注（图内） | 判据 |
|---|---|---|---|
| t01 | Disabled→Running | Address Device（仅 Default Control EP）/ Configure Endpoint（A=1·D=0，EP0 除外） | p146 注1–2 |
| t02 | Running→Stopped | Stop Endpoint Command | p148 |
| t03 | Stopped→Running | 门铃 · Configure Endpoint（A=1·D=1） | p147 注6 · p148 |
| t04 | Running→Halted | Halt 条件（STALL 等） | p147 |
| t05 | Halted→Stopped | Reset Endpoint Command | p147 |
| t06 | Running→Error | TRB Error | p147 |
| t07 | Error→Stopped | Set TR Dequeue Pointer | p147 |
| t08 | Running→Disabled | 同组条件（见下） | p148 |
| t09 | Stopped→Disabled | 同组条件 | p148 |
| t10 | Error→Disabled | 同组条件 | p148 |
| t11 | Halted→Disabled | 同组条件 | p146 注3–4 · p148 |

组条件（图内左中三行 + 图注复述）：Configure Endpoint 去配置（DC=1）/ Reset Device（EP0 除外）/ Disable Slot（任意态，含 EP0）——p146 注3–4 · p148。

EP0 特例不入箭头、在表卡与图注陈述：Configure Endpoint 不影响 EP0（p148）；去配置/Reset Device 不适用于 EP0（p146 注3 / p148）；仅 Disable Slot 可把 EP0 任意态→Disabled（p146 注4 / p148）。

## 3. 箭头触边静态核算表（gate 4）

核算法：端点坐标对目标盒矩形求边距（build.mjs `edgeDist`，与 SVG 同一常量源）；playwright 运行时对渲染后 polyline `points` 首末点复算（ep8_smoke AUDIT_JS），双通道同值。

```
端点状态图箭头触边核算（端点到目标盒边距，构造上应全为 0）：
  t01 Disabled→Running   A端 (505,510) → disabled Δ=0.0px   B端 (500,88) → running  Δ=0.0px
  t02 Running→Stopped    A端 (570,122) → running  Δ=0.0px   B端 (570,208) → stopped  Δ=0.0px
  t03 Stopped→Running    A端 (670,208) → stopped  Δ=0.0px   B端 (670,122) → running  Δ=0.0px
  t04 Running→Halted     A端 (500,105) → running  Δ=0.0px   B端 (315,208) → halted   Δ=0.0px
  t05 Halted→Stopped     A端 (330,242) → halted   Δ=0.0px   B端 (505,242) → stopped  Δ=0.0px
  t06 Running→Error      A端 (740,105) → running  Δ=0.0px   B端 (900,208) → error    Δ=0.0px
  t07 Error→Stopped      A端 (900,276) → error    Δ=0.0px   B端 (700,276) → stopped  Δ=0.0px
  t08 Running→Disabled   A端 (740,72) → running  Δ=0.0px   B端 (735,502) → disabled Δ=0.0px
  t09 Stopped→Disabled   A端 (620,276) → stopped  Δ=0.0px   B端 (620,468) → disabled Δ=0.0px
  t10 Error→Disabled     A端 (1020,276) → error    Δ=0.0px   B端 (680,468) → disabled Δ=0.0px
  t11 Halted→Disabled    A端 (190,276) → halted   Δ=0.0px   B端 (545,468) → disabled Δ=0.0px
  max Δ = 0.0px （门限 ±2.5px）→ AUDIT-PASS
```

运行时复算（playwright，dark/light 各一遍）：`触边max=0.00px`，明细 t01–t11 全 0.00。

## 4. 门输出（逐条实测末行）

1. 页码机核（11 needle，≥6）：`PAGECHECK-PASS`（11× PAGE-OK，见 §1 与命令记录）。
2. 语言门：`RETIRED-COUNT index.html: total=0`；`RETIRED-COUNT index-light.html: total=0`（残留 ⊆ 豁免集，实为空）。
3. 交互冒烟（playwright channel=chrome，双主题 + 390px×2）：`EP8-SMOKE-PASS`；逐主题行
   `[dark] arrows=11 触边max=0.00px 文本互撞=0 压盒=0 小字=0 PASS` / `[light]` 同
   `[390-dark] 截图完成 console=0` / `[390-light] 截图完成 console=0`。
   覆盖：console=0 ×2 主题、zoombar 在场（count=1）、`window.__zfs` 存活、触边复算、
   标注/角标文本互撞=0、标注压盒=0、框内文字 <14px 计数=0。
4. 自包含：`grep -c 'http://\|https://' index.html` = 1（light 同 =1），命中仅 `http://www.w3.org/2000/svg`（SVG xmlns）。
5. 互链：相对链接目标 5/5 存在（EVIDENCE.md 本文件补齐后齐）——../../index.html ·
   ../4.3-usb-device-init/index.html · ../4.4-device-detach/index.html · ../4.7-doorbells/index.html ·
   ../../../xhc-machines/fig2-transfer-ring/index.html。

## 5. zoomfs 接线登记

- 单 `.iso-stage`（tabindex=0 role=group aria-label=端点状态机…），包 zoomBarHtml 四档（1/1.6/2.4/3.2）+ 全屏 + 键盘 + − 0 F。
- `zoomFsScript({ focus: [] })`——静态状态图无步进高亮，focus 登记为空集。
- `window.__zfs` 存活实测（smoke 断言）；`setZoom(2)` 实测生效（特写截图 zoombar aria-pressed=2.4×）。

## 6. shots 清单

| 文件 | 内容 |
|---|---|
| shots/ep8-overview-dark.png / ep8-overview-light.png | 双主题整页全景（full_page，1500×1750 视口） |
| shots/ep8-state-dark.png / ep8-state-light.png | 状态图特写（zoom 2.4× + stage 内部滚动居中，普通视口截） |
| shots/ep8-390-dark.png / ep8-390-light.png | 390px 窄屏全景（full_page） |

工艺注：playwright 元素截（locator.screenshot）与 full_page/clip 截都会把 `.iso-stage` 内部
scrollLeft 重置为 0（实测三次），特写改走「高视口（1500×1750）+ 页面滚到 stage 顶 + 普通视口截」——
内部滚动实测保留（962 before/after）。

## 7. 已知边界

1. **§4.8.2.1 原文措辞**：该处句为「An Evaluate Endpoint Command shall be used to modify the value of Max Packet Size…」（p145 行 8379–8380）——命令本体名为 Evaluate Context（§6.2.3.1 p417 原文），页内 prose 双侧引注，未按疑似笔误改写。
2. **Fig 4-5 重绘**：规范原图（p146）版式未逐像素复刻；迁移集合以 §4.8.3 p146–148 文字逐条对出（§2 清单），图中组条件三行是四条 →Disabled 箭头的共享标注（图注复述）。
3. **跨节引用**：门铃禁写/Endpoint Not Enabled Error/Halted·Error 门铃忽略出自 §4.7 p143（§4.8 页尾注与表卡均已标 §4.7）。
4. **EP State 数值来源**：状态盒刻的 EP State 0–4 编码取自 §6.2.3 Table 6-8 p413–414（§4.8.3 本身只给状态名）；页内 specref 与表卡头均已标 Table 6-8。
5. **表格节不做动画**（DESIGN 分级裁定）；可读性由 zoomfs 四档缩放+全屏承载，390px 下 SVG 整幅缩入一列，依赖放大档查看细节。
6. **DCI 公式出处**：公式原文在 §4.5.1 p83（不在 §4.8.1）；§4.8.1 以 Figure 4-4（p144）呈现同一映射——页内表格两处分别引注，未把公式安到 §4.8.1 名下。
