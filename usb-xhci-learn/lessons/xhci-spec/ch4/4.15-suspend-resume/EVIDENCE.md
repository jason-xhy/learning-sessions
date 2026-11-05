# EVIDENCE.md —— §4.15 挂起与恢复（2026-11-04，anatomy 机器版「端口电源闸台」）

**范围声明（机器化施工）**：本页由「流程骨架版」（泳道生成器 lane_page.mjs 量产件，原件在
`backup-20261104/`，sha256 见该目录 SHA256SUMS.txt：build bd40d996…、EVIDENCE da341ce7…、
index 59426fb9…/84f2e6a0…）升级为 **anatomy 机器形态**——按 DESIGN.md §8 修订台账
2026-11-04 行「机器候选节…机器形态留后续会话」的追认执行（4.10/4.12 同批）。
现行页面结构对齐 4.10/4.12：正文块（要义+原文对照）+ **静态泳道总览卡** + **机器动画卡**
（.fig-ctl 控制条）+ PLS 要点表格卡 + 互链卡 + 页脚；双主题（index.html=dark、
index-light.html=light）。

## 0. 机器概况与主题名

- **机器**：「端口电源闸台」——任务派单建议名直接沿用（无退役词命中：端口/电源/闸台均不在
  retired_baseline 词族）。一台总线电源闸台：一条总线链路（双轨+枕柱+两端端口凸台）从 xHC
  总控台右面通到设备试验盒左面，票据沿链路走行＝总线信令（数据包/suspend 信令/LFPS）；
  链路南侧立一柄**三位闸刀**（上位 U0 跑包/中位 Resume/下位 U3）＝端口电源态；左文书台
  （xHCI 驱动）上是 **PLS 写入计数轮（0/3/15）+ LWS 拉杆**——软件唯一手柄，不压拉杆写不进
  PLS 字段；写入面板另有 TDRSMDN 计数轮（USB2 对照计时）、Stop Endpoint 命令卡槽、端点门铃
  钮、事件匣；中总控台（xHC）立面是**端口链接状态转筒窗**（U0/U1/U2/U3/U3Exit/Resume）+
  PED/PLC/R-S 三灯 + PSCEG 计数轮窗 + 评估窗（立即·或帧边界）+ 端点窗 + 常驻注记窗，
  台顶出卡口+事件出口短管；右试验盒（设备）立面是链路电源态窗 + 唤醒钮 + 教学锚长铭牌；
  两线：写入拉线（面板端子柱→总控台左面端子凸台）、事件回流管（台顶→事件匣）。
- **概念一句话**：写入计数轮与端口状态鼓是两个读数——suspend 信令在途期间（≤10 ms）写入值
  ≠状态鼓读数；信令送达、鼓转 U3、闸刀落位、PLC 亮、事件卡入匣；恢复由设备自发 LFPS 或
  软件写 PLS 驱动，xHC 评估发信令并出事件，但**从不自动把闸推回 U0**。
- **概念↔机制映射**（对象即解释）：

| 机器件 | 规范机制 | 页码 |
|---|---|---|
| PLS 写入计数轮（0/3/15）+ LWS 拉杆 | 写 PORTSC PLS 字段；LWS='1' 才写得进；仅 Enabled 态端口（PED='1'、PLS<'3'） | p253–254 |
| 端口链接状态转筒（六态列全，演示经 U0/U3/Resume/U3Exit） | 端口链接状态读数；U1/U2 低功耗态 | p253/p255 |
| 写入值≠状态鼓（F2 演出核心） | suspend 信令完成前 PLS 读数不变（≤10 ms）；至少每帧评估一次 | p253–254 |
| 评估窗（立即·或帧边界） | xHC 立即或微帧/帧边界评估 PLS 写入；立即也要等当前事务完成 | p253 |
| 三位闸刀（U0 上/Resume 中/U3 下） | 端口电源态指示；xHC 从不自动把 Resume/U3 转回 U0（闸座锚牌刻句） | p253 Note |
| PLC 灯 + PSCEG 计数轮（0→1 出事件） | PLC 置位→PSCEG 0→1 跳变→端口状态变化事件（§4.19.2 引用） | p254–256 |
| 事件出卡口+事件管+事件匣（单卡+读数计次） | Port Status Change Event；U3C/U3E：PLS→U3 即置 PLC 出事件（免轮询免 ~15 ms 定时器） | p254 |
| Stop Endpoint 命令卡（SP='1'）→端点窗 Stopped | 选择性挂起前停全部端点；功能挂起停 function 端点+SetFeature(FUNCTION_SUSPEND) | p254 |
| 端点门铃钮→端点窗 Running | 恢复后软件写端点门铃逐个重启（SP 停的端点不自启） | p254 |
| 设备链路电源态窗（U0/U3） | 设备侧只见总线信令：挂起＝链路安静、恢复＝信令唤醒 | p253–255 |
| 唤醒钮→LFPS 票据沿链路 | 远程唤醒设备发 resume 信令（USB2）/LFPS（USB3）；xHC 必须响应 | p252/p255 |
| TDRSMDN 计数轮（≥20 ms）+ USB2 差异注记板 | USB2：xHC 1 ms（TURSM）内反射到全部 Enabled 端口并维持；软件计满 TDRSMDN 后写 '0' | p255–256 |
| 整机挂起次序注记板 | 全部 Enabled 端口选择性挂起→R/S='0'→PCI PM 降态；唤醒后时钟稳定→R/S='1'→写 PLS='0' | p252 |
| R/S 灯（Run）+F7 注记 | Resume→U0 前必须 R/S='1'——保证发 ITP 并立即收包 | p255 Note |

- **零件统计（audit 口径）**：**83 items · 51 solids · 2 tubes**（写入拉线/事件回流管，端环 rim
  落端子柱顶与端口凸台面过 terminals）——预算 40–113 内。
- **演示样例（登记）**：根集线器 **SS 端口（USB3 主线）**——恢复走 LFPS 握手；USB2 差异
  （resume 信令/TURSM 1 ms 反射/TDRSMDN 从通知或写 '15' 起算）以 F9 对照帧+注记板+泳道
  第 6–8 步承载，不与 USB3 主线混画。Slot/EP 编号不出现（非本节域）。
- **帧数 12**（F0–F11），DUR [3000,4200,4800,7200,4200,6000,5400,6000,3600,5400,7200,3000] ms，
  巡游驻留 5.5s。
- 读数（卡右下，与帧模型同源）：`步 n/11 · 写入 PLS <0|3|15> · 端口 <U0|U3|Resume|U3Exit> · 端点 <Running|Stopped>`。

## 1. 页码机核（pypdf needle，全部现场跑）

命令（study 仓根）：
```
python3 scripts/xhci_spec_pagecheck.py 252 "4.15" 252 "Suspend-Resume" 252 "Wake-up Events" \
253 "4.15.1" 253 "writing a ‘3’ into" 253 "every frame boundary" \
254 "4.15.1.1" 254 "Stop Endpoint Command" 254 "FUNCTION_SUSPEND" 254 "U3 Entry Capability" \
254 "Entry Enable (U3E)" 254 "mandatory for all" 254 "4.15.2" \
255 "LFPS Handshake" 255 "generates LFPS to initiate" 255 "TDRSMDN" 255 "transmitting ITPs" \
255 "Host Initiated" 255 "low power link state" \
256 "U3Exit" 256 "A U3 to U0 transition" 256 "start timing TDRSMDN" 256 "Wakeup Events" \
256 "reflected downstream" 256 "not suspended" \
257 "Table 4-10" 257 "not gated by a Wake Enable" 258 "4.16"
```
→ 28/28 PAGE-OK，末行 **PAGECHECK-PASS**。页头 specRef 的 p252–258 与小节题以此为据。

## 2. 帧序断言（12 帧）

| 帧 | 画面断言 | 判据 |
|---|---|---|
| F0 全景 | 链路 U0 跑包（数据票据往返）；计数轮 0、状态鼓 U0、闸上位、端点 Running、PED/PLC 之外的 R/S 灯亮 | p252「端口可恢复/可参数化敏感度」总起；U0 正常态 |
| F1 停端点 | Stop Endpoint 命令卡入槽（SP='1'）→端点窗 Running→Stopped | §4.15.1.1 p254 引文② |
| F2 写挂起 | 计数轮→3 + LWS 拉杆压下 + 「PLS='3' 写入」票走拉线；**状态鼓仍 U0**；注记「写入≠读数…≤10 ms」 | p253 引文① + p253–254（信令完成前不变，≤10 ms）；p254 LWS/PED/PLS<'3' 前提（面板刻字） |
| F3 评估与信令 | 评估窗节拍标记推进 → 「suspend 信令」票走链路 → 设备链路灯 U0→U3、链路安静 → 状态鼓 U3、闸落 U3 位 → PLC 灯亮闪 + PSCEG 0→1 → 「PLS→U3」事件卡经出卡口走事件管入事件匣；注记 U3C/U3E | p253（评估时机/等当前事务）；p253–254（信令送达才转 U3）；p254 引文③（U3C 置 PLC 出事件，U3E='1' 打开，1.1/1.2 强制） |
| F4 链路安静 | U3 常驻无包；注记「xHC 从不自动把 Resume/U3 转回 U0」+ 闸座锚牌 | p253 Note 引文⑥ |
| F5 设备发起 | 唤醒钮压下 → 「LFPS 唤醒」票设备→总控台 → 状态鼓 U3→Resume(15)、闸中位 → PLC/PSCEG → 「PLS=15 Resume」事件卡入匣；注记「xHC 未获指示不回应 LFPS——握手悬着」 | §4.15.2.1 p254–255 步 10（U3→Resume、PLC、PSCEG 0→1 出事件）+ p255 Note 引文④ |
| F6 软件指示 | 事件卡 Port ID 定位→读 PORTSC（PLC='1'、PLS=Resume 判设备发起）→ 计数轮→0+LWS → 「PLS='0' 写入」票 → xHC 发「LFPS 应答」票；PLC/PSCEG 清零（软件读清） | p255 步 11–12：USB3 写 '0' 指示 xHC 发起 LFPS 完成握手 |
| F7 恢复完成 | LFPS 应答到设备 → 链路灯 U0、跑包恢复 → 状态鼓 Resume→U0、闸抬上位 → PLC/PSCEG → 「U3→U0」事件卡入匣；R/S 灯高亮注记「R/S='1' 才准 Resume→U0——保 ITP 与立即收包」 | p255 步 13 + Note（R/S='1' 前提）+ p256 引文⑤（U3→U0 必置 PLC 出事件） |
| F8 门铃重启 | 端点门铃钮压下 →「门铃 端点重启」票走拉线 → 端点窗 Stopped→Running | §4.15.1.1 p254（恢复后写端点门铃重启） |
| F9 USB2 对照 | USB2 差异注记板点亮；TDRSMDN 计数轮 0→20 ms 计满演示；注记「xHC 1 ms（TURSM）内反射到全部 Enabled 端口」（主线端口保持 U0 不受扰） | p255 步 12.e（TURSM/TDRSMDN ≥20 ms 从转 Resume 通知起算）+ §4.15.2.3 p256（反射并维持） |
| F10 主机发起 | 快放再挂起（计数轮 3+LWS→鼓 U3 闸落）→ 写 '0'（U3Exit 子态过鼓、闸中位）→「LFPS」票总控台→设备立即发出 → U0 抬闸跑包 → 「U3→U0」事件卡；注记「USB3 写 '0'→U3Exit→LFPS；U1/U2 写 '0' 亦转 U0」 | §4.15.2.2 p255–256 步 14（USB3 写 '0'→U3Exit、xHC 立即发 LFPS）+ p255（U1/U2 写 '0' 亦转 U0；主机发起前提 PED='1'、PLS='3'） |
| F11 读数巡回 | 整机挂起次序注记板点亮；注记「全端口选择性挂起→R/S='0'→PCI PM 降态；唤醒后 R/S='1'」；回 F0 | §4.15 p252（整机次序） |

**帧序 drive 真值**（命令见 §4 门表）逐行输出与上表一致（F0–F11 readout 与关键 DOM 断言全
true），console clean。

## 3. 常驻机构与泳道断言

| 断言 | 判据 |
|---|---|
| 面板刻字「LWS 拉杆：不压写不进 PLS」「仅 Enabled 态端口：PED='1' · PLS<'3'」 | p254 |
| 转筒窗列全 U0/U1/U2/U3/U3Exit/Resume（演示不经过 U1/U2） | p253/p255/p256（U1/U2 为低功耗链路态） |
| PSCEG 窗刻「0→1 出事件」 | p255/p256（PSCEG 0→1 跳变才出端口状态变化事件，§4.19.2 引用） |
| 评估窗刻「立即 · 或帧边界（至少每帧一次）」 | p253 |
| USB2 差异板五条（resume 信令非 LFPS/TURSM 反射/维持到转 U0/TDRSMDN ≥20 ms 计满才写 '0'/p255–256） | p255–256 |
| 整机次序板五条 | p252 |
| 闸座锚牌「xHC 不自动回 U0／回 U0＝软件写 PLS（p253）」 | p253 Note |
| 设备锚牌「只见总线信令／挂起＝链路安静 恢复＝信令唤醒／PORTSC/事件对设备不可见」 | p252–255（设备只见总线信令；寄存器/事件在主机侧） |
| 台顶铭牌「xHC 控制器 · 端口电源管理／端口链接状态机 · 评估与上报」 | §4.15 总域 |
| 泳道总览 8 步 + 底部两条注记（整机次序/Wakeup Events 与 Table 4-10 注记） | p252–258（同帧序判据；Table 4-10 只入注记不逐行转写，沿骨架版边界） |
| 表格卡 PLS 迁移五行 + 注记段（Wakeup/USB3 LFPS t12–t10/步号伪影不照抄） | p253–258 + 骨架版同源 |

### 原文对照六条（正文 blockquote）
逐字取自提取文本 p253/p254/p254/p255（脚注 52 剔除，src 栏注明）/p256/p253；弯引号 ‘3’/‘1’
保留提取原样；每条尾注 `(xHCI 1.2b §x pNN)` 与 §1 机核对应。

## 4. 泳道去留决定

**保留泳道静态总览卡、退役其步进模式（机器接管）**——4.10/4.12 同款决定：
1. DESIGN §4 模板 c+d 双卡是板块常态形态（流程图总览 + 动画卡互补）；
2. 骨架版单卡双模式的步进动画与机器 12 帧内容重合度高，机器接管后保留即双份步进交互；
   泳道的三方同时性时间线（驱动/xHC/设备同列对齐）是机器受视角所限给不了的教学视角，保留；
3. Wakeup Events 细则/Table 4-10/整机次序留在泳道底部注记与表格卡（机器不逐帧展开，帧数预算内取舍）。
实现：泳道卡由 lane_page 生成器改为本 build.mjs 内静态 SVG（4.10 三列时间线形态，三方配色
§3.3 内联）；lane_smoke 门对非生成器页不适用（4.10/4.12 同裁定），等价替代＝ctl_probe +
帧序 drive + 遮挡探针三件。

## 5. 验收门结果（2026-11-04 实跑，全绿）

| 门 | 命令（完整可复跑） | 末行输出 |
|---|---|---|
| audit ×2 | `node build.mjs --audit` / `node build.mjs --light --audit` | `audit passed` ×2（audit · 2 tubes · 51 solids · 83 items · 1 depth states · 211 overlaps · 211 order rules；clearance/terminals/loose/folds/support/sunk/depth/through/self-overlap/wobble/saddles/stand-in/crowding 全 0） |
| lines ×2 | `node ~/.zcode/skills/anatomy/scripts/lines.mjs index.html --select '.fig-wrap .iso-plate'`（+ index-light.html，--out shots/lines-*.png） | `line ends: 0 of 56 ends on 40 lines float` ×2 · console clean ×2 |
| 遮挡探针 ×2 | `python3 scripts/xhci_spec_occlusion_probe.py lessons/xhci-spec/ch4/4.15-suspend-resume/index.html --frames 12 --dwell-ms 8000`（+ index-light.html） | `OCCLUSION-PASS` ×2（0 命中；首轮 38 命中——修复链见 §7 坑 3/4/5） |
| 控制条探针 | `python3 scripts/xhci_spec_ctl_probe.py /Users/jason/ZCodeProject/usb-xhci-study/lessons/xhci-spec/ch4/4.15-suspend-resume/index.html fig42` | `CTL-PROBE-PASS`（next/prev/tour aria-pressed/reset 四项 PASS；帧计数取 `window.__fig42.frameOf()`——本页暴露 `__fig415` 主名 + `__fig42` 兼容别名） |
| 页码机核 | §1 命令 | `PAGECHECK-PASS`（28/28） |
| 语言门 ×2 | `python3 scripts/scan_words.py retired lessons/xhci-spec/ch4/4.15-suspend-resume/index.html`（+ index-light.html；study 根） | `total=11 {'回执': 6, '泳道': 5}` ×2——残留 family ⊆ 豁免表 {回执,柜台,泳道}，PASS（回执=§3.2 隐喻词；泳道=总览卡图表术语） |
| 帧序真值 | `node ~/.zcode/skills/anatomy/scripts/drive.mjs index.html --actions steps-frames.json` | 12 帧逐行：F0 `步 0/11 · 写入 PLS 0 · 端口 U0 · 端点 Running` / F1 `…端点 Stopped cmd=true epStopped=true` / F2 `写入 PLS 3 · 端口 U0 dial3=true drumU0=true note=true`（写入≠读数帧） / F3 `端口 U3 plc=true psceg1=true tray=true devU3=true` / F4 `noteNoAuto=true` / F5 `端口 Resume tray(PLS=15)=true` / F6 `dial0=true plcOff=true` / F7 `端口 U0 devU0=true tray(U3→U0)=true noteRS=true` / F8 `epRun=true` / F9 `usb2lit=true timer20=true` / F10 `drumU0=true tray=true noteHost=true` / F11 `busLit=true noteBus=true`；console clean |
| 交互冒烟 | 机器节形态：ctl_probe + 帧序 drive + 遮挡探针三件（lane_smoke 不适用，§4） | 三门 PASS |
| console | capture/drive 全部 shots 过程 | 每张 `console: clean`（双主题；含 390/--reduced/zoom 变体） |
| 自包含 | `grep -c 'http://\|https://' index.html`（+light） | 各 3，命中全为 `http://www.w3.org/2000/svg` xmlns（`grep -o` 复核唯一值）→ PASS |
| 互链 | 相对链接目标存在性 | ../../index.html、4.14/4.16/4.7/4.17/4.2/4.19 直链节页 + EVIDENCE.md 全存在；待建节（§5.4.8/§3.3.8）链板块 index.html 并标「待建」 |

## 6. zoomfs 登记与字号台阶

- 三件套：`zoomBarHtml()` ×2 + `zoomFsCss()`（一次）+ `zoomFsScript()` 两实例 scoped（构建期
  querySelector→querySelectorAll[0/1]；泳道卡 `__zfsLane`、机器卡 `__zfs`）。
- focus 选择器：泳道卡（stage 0）`["#lane-svg .notebox"]`；机器卡（stage 1）
  `['[data-name="gate.base"]', '[data-name="con.body"]']`（常驻实体，规避 data-part 空组聚焦塌陷）。
- 存活验证：drive eval `__zfs.setZoom(3.2)` → `phone-390-zoom.png`（readout 行同步截到）。
- 等效 px = 世界字号 × KS 1.638 × 页内显示比（1408/920 ≈ 1.53）≈ **世界字号 × 2.506**：
  - 主层：工位铭牌主行 9（≈22.6px）/副行 6；台顶铭 9；状态转筒态名 6.4（≈16px）、PSCEG 值 7.5、
    端点窗值 6.4、设备链路态值 9、注记窗 4.2（≈10.5px，3.2× 档充裕——按 §1.8 追注登记为
    主/细节层边界件）、板题 6.4、锚牌首行 5.4-5.6。
  - 细节层清单（1× ≥7px 等效、3.2× 档可读）：闸位标签 U0/U3/Resume 3.6-4.2、面板窗标签 3.6-4.2、
    票据两行 3.8、事件卡 3.2、命令卡 3.4-3.8、板行 4.2、评估窗副行 3.4-3.8、TDRSMDN 值 4.6、
    台面散注（出卡口/事件匣/卡槽/门铃/链路）3.8-4.6。
  - 正文 16.5px、泳道框字 16px/页码 13px@1×、表格 14.5px。

## 7. 施工坑与绕法（本轮实测）

1. **fit 投影点漏展开 → NaN 投影**：`[...k.boxCorners(a), k.boxCorners(b), …]` 第二个调用漏
   `...` → 嵌套数组进 iso → `P.origin=[null,null]`、scaleOf NaN → 一切下游 disc/lathe 报
   "undefined is not iterable"（表象指向 G.disc，实际投影已坏）。判据：先打 KS/scaleOf。
   通用（NaN 家族新成员，与 .entries() 坑并列）。
2. **G.disc/A.disc 参数序**：`(s0, s1, r, F, P)`——跨距在前半径在后；误当 (s0, r, s1) 写会
   出怪形或 NaN。照抄 4.12 用例核对。
3. **cue 每 tick 重复触发（幽灵票据堆积）**：`anim.cues.forEach(if t>=at apply)` 无 fired
   标记 → 推票据的 cue 每个 rAF 重推一遍（F3 实测 30+ 残影、F10 48）。修：cue.fired 一次性
   触发。**4.12 同型 bug 在案**——其 live 用 IO 可见性门控 rAF、探针视口外 tick 不跑，从未
   暴露；4.10 改 document.hidden 后机器真动起来才见光。报主会话（4.12 建议 Same 修法复跑探针）。
4. **转筒被裁剪表项的 rect 参与遮挡探针**：clipPath 只裁显示不裁 getBoundingClientRect——
   窗外表项（如 pos=Resume 时的 U2）rect 落在别处，与后画实体 AABB 相交→假命中。修：只渲染
   |i−pos|≤1.3 的邻域表项。通用（所有转筒/数码窗类件）。
5. **探针扫描窗的确定性**：巡游在 dwell 期推进下一帧 + 环境数据包在巡游空窗仍发放 → 扫描
   时刻票据在途不可复现。修：playTo 重置 tourTimer（DUR≥3s ⇒ DUR+5.5>8s 扫描窗内不进下一
   帧）；环境包改 `anim` 门控（仅帧动画进行中发放）。另：票据推进/清除移出 `if (anim)` 块
   （否则动画结束后票据只发不清——61 票实测）。
6. **事件匣叠卡遮字**：多卡叠放必然后卡盖前卡文字（AABB 探针 1.0 命中）。修：匣内只摆最新
   一张卡，计次入读数行。
7. **闸刀触点几何三连**：①柱顶与闸臂端球切触在 settle 出深度环——记录位与演出位分离
   （4.10 halt 先例：记录位不触任何柱、球切在铰柱顶）；②三柱共面且垂直→相邻柱 x 距 3.0<
   3.6 沉入——触点角散开（54/6/-40°）拉开柱心距；③记录棱柱过长穿柱——stand-in 覆盖率与
   clearance 二选一时按「记录位止于柱面外、演出臂端球贴柱」收。
8. **读图通道**：analyze_image 对直传 PNG 仍 400（4.12 坑 1 持续）；**sips 重编码 JPEG
   （-Z 800-1100）后可过**——本轮 z-gate/z-console 两张特写实读通过（闸位/转筒/PSCEG/Stopped/
   板行文字确认可读）；全页大图缩到 1100 后细节误读明显（小字不可辨时模型补脑），只可作
   结构参考。三证闭环（遮挡 0 + drive 真值 + audit/lines）仍是主判据。

## 8. shots 清单（35 张，console 全 clean）

- 页面全景：page-dark.png / page-light.png（1500×5829 整页，无横滚）
- 机器卡全景：machine-dark.png / machine-light.png
- 泳道卡：lane-dark.png / lane-light.png
- 逐帧：frame-01…frame-11-dark（11 张，drive 步进取景）+ frame-03/05/09/10-light（4 张）
- 390：phone-390.png（390×7848 无横滚）/ phone-machine-390.png（358 宽机器卡）/ phone-390-zoom.png（__zfs.setZoom(3.2)）
- reduced：reduced-dark.png（prefers-reduced-motion）
- 4× 特写：z-gate / z-console / z-panel / z-dev × dark/light（8 张：闸刀组/立面窗组/写入面板/设备窗+锚牌）
- lines：lines-dark.png / lines-light.png
- 工作脚本：steps-frames.json（帧序真值）、steps-shots.json / steps-shots-light.json（截图驱动）。

## 9. 已知边界与共享件建议（报主会话）

1. **4.12 cue 重复触发同型 bug 建议同修**（§7 坑 3）：其 live.mjs cues 无 fired 标记，IO 门控
   掩盖至今；4.10 修法（document.hidden）+ 本节 fired 标记双落地后，4.12 页建议复跑
   occlusion/ctl 探针与 drive 抽帧核实。
2. **转筒裁剪 rect 坑建议登记为板块级判据**（§7 坑 4）：4.12 的 xSPSM 转筒/DIY 数码窗同构，
   其历轮 OCCLUSION-PASS 亦可能含此类假阴性/假阳性。
3. **探针扫描窗判据**：dwell-ms 必须同时大于 max(DUR)+巡游驻留−playTo 重置余量——本节
   DUR max 7.2s + 5.5s = 12.7s，8s 扫描落在帧内间隙靠 tourTimer 重置保证；后续节 DUR 若
   >2.5s 同法安全，建议在探针脚本注释登记。
4. `__fig42` 别名与 4.2 页同名（4.12 同款边界，两页互不加载无冲突）；主会话在探针登记
   `fig415: window.__fig415.frameOf()` 后可移除别名。
5. 机器演示 SS 端口 USB3 主线；USB2 差异不逐帧展开（帧数预算取舍，泳道/表格/注记板承载）；
   U1/U2 只在转筒列名与 F10 注记出现（§4.15 原文对 U1/U2 仅 p255 一句）。
6. FSC（Force Save Context）不属 §4.15（骨架版 grep 实证零出现），沿用骨架版边界不入页。
