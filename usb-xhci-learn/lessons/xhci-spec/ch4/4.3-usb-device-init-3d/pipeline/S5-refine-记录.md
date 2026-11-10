# S5-refine-记录 —— V3 精修环节作业记录（逐项：发现→精修→证据）

产出：2026-11-10 ｜ S5 worker ｜ 上游：S4 复评 PASS（均分 9.15）随带清单 6 条 P2 + S4-build-输出 §7 残留
对象：`index.html`（重建）+ `src/` 六件（改 4 件：scene/stages/lab/panel/main 其中 panel 仅摘槽位标）+ `pipeline/tools/`（改 2 新 1）
纪律执行：`scene.dsl.json` 零改动（只读核验）；文案全部引 S1/S2 已核值；语言门棘轮零新增（新增文案串 dev/retired_precheck.py 预检 + 构建后 gate 复跑）。

---

## 0. 任务清单落点总表（任务书 5 项）

| # | 任务 | 落点 | 结果 |
|---|---|---|---|
| 1a | quiz 题面定稿（§K 递进阶梯） | stages.js QUIZ 全量换稿（5 题） | 定稿，语言门过 |
| 1b | 原文对照六条定稿 + needle | dev/quote_verify.py 逐字核验 9 段全 OK；needle_pairs.txt 18→24 对 | QUOTE-VERIFY-PASS / PAGECHECK 24/24 |
| 1c | L2 干扰项池结构化回填 | lab.js 每干扰选项带 hint（pNN 依据）+ lab_check.mjs 随更断言 | 回填 src 侧；DSL 侧回填报主会话（见 §6 报备-1） |
| 2 | ⑥收尾：灯排牌头裁 + 暗部层次 | scene.js：牌注两行化+缩窄+下移；旗标灯读取 bug 修复（新发现）；补光两盏 | 目验四机位过（§2/§3） |
| 3 | ⑤逐工段节奏核 | 静态对表（compileSteps vs §D/§J.2）+ 运行时实测（tools/stage_timing.mjs） | §4 |
| 4 | 取证修复（tryerror 滚动次序 + f3-mid） | shots.mjs 重写取证段 + 新增 f3-mid 帧 | gate 复跑取证（§5） |
| 5 | F2 分工口径落地 | main.js cardsOf(2) 增「机位口径」卡（文案层，不动机位） | 落地（§5） |

---

## 1. 任务 1a：quiz 题面定稿（§K 递进阶梯）

**发现**：S4 占位稿 5 题 topics 覆盖 DSL 六项中的五项（缺 PSCEG），但未按 §K 递进阶梯组织——任务书要求按「F0 认知→工段顺序→分支差异→试错→动手台经验」出题，试错经验（§K 试错阶 通过判据=红牌+输出上下文不动 p100）与 F0 认知目标（三环各司）在原稿中无题。

**精修**（stages.js QUIZ 全量 5 题，每题 3 选项+解析带 pNN，值全出 S1 已核值）：
| 阶梯 | 题面 | 判据 |
|---|---|---|
| F0 认知 | 命令完成事件走哪条环？ | p60（回执走事件环）+p68（命令环唯一原句） |
| 工段顺序 | Enable Slot 之后、Address Device 之前须等什么？ | p75（§4.3.2 等本槽命令完成事件；Slot ID 自选）+p72 |
| 分支差异 | BSR=1 成功后槽态？ | p76–77（Enabled→Default；BSR=0 才 Addressed；补编址 Note） |
| 试错经验 | F5 空输入上下文抢发 Address Device 结局？ | p100（Parameter Error、输出上下文不变；S1 §7.2 条 10） |
| 动手台经验 | EP0 门铃是哪个？ | p82–83（DB Target=1、DCI=(端点号×2)+1；xhci.h:313–314） |

**证据**：语言门 RETIRED-PASS（新题面零豁免词新增，总 24 持平基线）；lab_check quiz 槽位断言（≥4/5+重做）随题面驱动不受题面更换影响（判对/错由页内 quizData 驱动）；quiz 题面页码锚已含于 needle 对（60/68/72/75/76/77/82/83/100 全在 24 对内）。

## 2. 任务 1b：原文对照六条定稿

**发现**：S4 占位六条中第 2 条（USB2 复位 p72）把规范中**不相邻的两句**当作连续文本（p72 原文两句间隔有 PSCEG 段），逐字核验不过；其余五条核验通过。

**精修**：
- stages.js QUOTES[1] 拆两段（「/」分隔=同页非连续句，与 QUOTES[2]/[3] 形态一致）；
- 六条全部经 `dev/quote_verify.py`（一次性，留 dev/）对规范提取文本逐字核验：**9 段 QUOTE-OK / QUOTE-VERIFY-PASS**（提取文本含 PDF 加粗 `**` 伪影与断行，脚本按空白+星号归一后比对）；
- needle_pairs.txt 增补 6 对引文面 needle（71 detects a device attach / 72 completion of the port reset / 72 obtain a Device Slot / 75 selected by the host controller / 72 only packet sizes allowed / 74 successful completion of both operations）——先经 xhci_spec_pagecheck 逐一试跑全 OK 再入表；
- panel.js 摘除两处 `SLOTS-FOR-S5` 槽位标注（quiz fold + 引文节），stages.js/main.js 注释同步摘标。

**证据**：PAGECHECK 24/24 PAGE-OK（18 原有+6 新增）；QUOTE-VERIFY-PASS（9 段）。

## 3. 任务 1c：L2 干扰项池结构化回填

**发现**：S4-输出 L3——L2 六步的干扰项仅 s4 在 DSL 登记，s1/s2/s6 干扰项为 S4 自拟（值同源 S1 但无错选提示文案）；错选时六步共用一条步级 fail 文案，未针对具体干扰项给依据。

**精修**（src 侧结构化；DSL 侧受限见 §6 报备-1）：
- lab.js：s1/s2/s4/s6 全部 19 个干扰选项各带 `hint`（错选提示文案，规范依据 pNN/xhci-mem.c 行号全引 S1；样例：wValue=0001h→「Configuration Descriptor（类型 2）；Device Descriptor 是 wValue=0100h（高字节类型 1，p73）」）；
- 错选处理链（l2pick/l2choice）改为「选项级 hint 优先、步级 fail 回退」；
- s3（排卡步）/s5（等待步）无选项型干扰项，维持步级 fail（含 S1 锚）——结构化口径在记录中声明；
- lab_check.mjs 随更：阶段 1 dump 增采 `hints`/`optHints`（v→hint 映射），s1/s2/s4/s6 四处错选断言升级为「选项级 hint 逐字」（回退 fail），断言强度只增不减。

**证据**：dev/retired_precheck.py 全部新文案串预检 PASS；lab_check 门复跑（见 §7 门表）。

## 4. 任务 2：⑥收尾（灯排牌头 + 暗部层次）+ 新发现旗标灯 bug

### 4.1 灯排牌头「Enabled 与 Disabled」被裁——根因改判

**发现**：任务书与复评残留均记载「牌头被首灯球裁（F3/F4/F7/F10 同现）」。本环节先做几何探针（dev/lamp_plate_probe.mjs，一次性：4 机位投影量化球-牌间隙 + dy 扫描）——实测 dy=0（现位）四机位间隙全为正（F4 +22px / F7 +8px / F10 +13px），**球体并未遮牌**；目验 v3j-cam-F4 帧定位真根因：**牌注文案以固定 fs30 画在 512px 画布上超宽约 2 倍，被画布两侧裁**（左「Enabled」头部、右「（p87）」尾部同时缺失）——首灯球恰在左端视觉上「背锅」。

**精修**（scene.js 表现层；DSL materials.lampRowPlate.text 未动）：
- `plateMesh()` 增自适应字号：逐行 measureText 超画布宽则收缩 fs（下限 14），布局不变只缩字——顺带修复同型隐患（FS 闸口牌约 3% 超宽）；
- 灯排牌改**两行排布**（「——」处折行）+ 板缩窄 4.6→3.1wu（x[-1.55,1.55] 让开格架牌 x[-4.2,-1.6]，消 3D 牌×3D 牌交叠面）+ 中心下移 0.12（首灯球投影间隙 8→17px，取 F7 最紧机位）。

**证据**：迭代帧 `dev/iteration-frames/s5a-F4.png`（两行全文首证）+ 终版 `shots/v3k-cam-F4/-F7/-F10.png` 三机位目验——两行全文完整（「Enabled 与 Disabled 共用编码 '0'——／看 DCBAA 指针是否有效分辨（p87）」），与 `shots/v3j-cam-F4.png` 同机位对照（v3j 左右双裁）成立；label_probe 门（含 3D 牌两两检测）复跑过（§7）。

### 4.2 新发现（P0 级渲染 bug）：PORTSC 五旗标点常暗

**发现**：节奏核对表时发现 `drawPortsc2` 读 `st.flags["CCS"]`（大写键），而 `state.flags` 键为小写（ccs/csc/pr/prc/ped）——**五旗标点在任何状态都不点亮**，F1「CCS=1 灯亮」、F3「四信号一个不能少」的教学核心读数自 S4 起从未在画面上亮过（scorer 两轮以「点亮态缺取证帧」登记，实为此键名错位）。

**精修**：scene.js 一行改 `st.flags[f.toLowerCase()]`（带注释）。

**证据**：`dev/iteration-frames/s5b-F3.png`（播放至四信号齐）目验——CCS/CSC/PRC/PED 四点亮琥珀、PR 熄灭（=0 语义正确）、PLS=U0、Speed=FS，与页内探针 `sceneState().flags={ccs:1,csc:1,pr:0,prc:1,ped:1}` 一致；终版 `shots/v3k-f3-mid.png` 同态复证（§7）。

### 4.3 暗部层次（复评②⑥残留·S5 打磨义务）

**发现**：v3j-cam-F0 顶部三环区辨识度低（金属环管仅镜面高光、无环境贴图）；v3j-deskCloseup 桌面道具群南立面近剪影（吊灯+北向 rim 只照顶面）。

**精修**（scene.js 表现层补光两盏，承 S4 内灯回场同形态）：
- 三环带补光 ringL：0xa9c4ef 强 24→44、位 (0.5,16.2,7)→(0.5,14.8,8.5)（下压近环带）；
- 新增桌面行南向正面补光 deskFill：0xaebfd8 强 16 @ (-15,5.5,9)。

**证据**：`dev/iteration-frames/s5c-F0.png` 目验——三环管体+回绕弧+cycle 片在全景可辨（对照 `shots/v3j-cam-F0.png` 近乎不可见）；`dev/iteration-frames/s5c-deskCloseup.png` 目验——桌面木纹暖调回场、托盘绿顶更亮、道具轮廓可读（S6 PBR 回灌后 ③ 终评）；两翼其余区域未过曝，deep-dark 基调保持。

## 5. 任务 4+5：取证修复与 F2 口径

**取证修复（shots.mjs，复评 P2 连续两轮登记）**：
- 根因：红牌 `#x43Alarm` in-flow 于面板顶部；旧次序 `scrollTop=0` 复位被随后 `scroll #x43Trap` 抵消，红牌停留时滚出画面。
- 精修：改为「点击 Trap → 等 10.5s 红牌出现 → `scrollTop=0` 回顶 → eval 断言 `#x43Alarm` in-view（!hidden 且矩形在视口内）→ 再拍」；gate 输出增 `SHOTS-TRYERROR ALARM-INVIEW-PASS/FAIL` 且纳入 exit code（取证失败=门失败）。
- 新增 f3-mid 帧：仿 f4-mid 轮询法，goto(3) 播放中 5.6s（k=0.5 下四信号齐、回执卡飞行中段）拍摄——补复评残留「四信号点亮态缺 mid-anim 取证」。

**F2 分工口径落地（主会话裁定：F2=桌面组+柜面全景，USB2 屏读数由 F3 特写承载）**：
- 核对：F2 讲解卡（DSL panel 文案）与 RUNTIME 均未宣称「USB2 屏读数本帧可读」，口径无冲突；
- 落地：main.js cardsOf(2) 增「机位口径」卡：「本帧=桌面组与柜面全景观看位：读线/写线闪与复位按钮阻尼下压在此看全景；USB2 屏的 CCS/PR/PLS 读数由 F3 特写承载，本帧屏面呈侧角作语境」——文案层，机位零改动；
- 证据：页内 DOM 断言 heads=[本工段要点/场景状态/流转路径/物理动作感瞬间/机位口径] 且卡片全文在案；`shots/v3k-cam-F2.png` 桌面组+柜面同视野构图成立。

## 6. 报备主会话（S5 无权处置项）

| # | 事项 | 指向 |
|---|---|---|
| 报备-1 | S4-输出 L3 建议「S5 回填 DSL interactions 干扰项池结构化」——scene.dsl.json 本环节禁改，已在 **src/lab.js 侧结构化**（选项级 hint 全量+工具断言随更）；DSL interactions 增补 distractors/hints 字段需主会话裁定后由 DSL 属主环节补（lab.js 已按可平移结构组织，回填后工具判据自动跟随 DSL） | DSL 属主 |
| 报备-2 | 上轮 P2「五机位 DSL 补丁无授权注记（第二次登记）」未在本环节处置范围（DSL 只读）——仍待主会话补裁定记录+DSL 属主补 s2 注记 | 主会话+DSL 属主 |
| 报备-3 | 上轮 P2「f0Check 16.6 授权痕迹」同上未处置（DSL 只读；S3-dsl-说明 §7 旧值 16.1 仍待 DSL 属主同步） | DSL 属主 |
| 报备-4 | f3-mid 取证依赖旗标灯 bug 修复（§4.2）——修复前该帧拍不出点亮态；bug 属 S4 交付缺陷的 S5 责任面修复，已在记录+评分对象清单 | scorer 复评核 |

## 7. 门复跑结果（受影响门全复跑；scorer 可独立复核）

**构建谱系**：门跑时点构建=`375b2df3…`（§3/§4 全部行为门于此构建跑）；其后仅一行 lab.js 注释修正（「屏幕」含退役字「幕」致语言门超基线，改词「投影」）→ 终版重建 ×2 一致。终版与门跑构建**仅差一行注释**，行为零差异；文件级门（语言/自包含/槽位标清零）在终版复跑。

| # | 门 | 结果 | 证据 |
|---|---|---|---|
| 1 | 构建 sha 可重复 | **PASS** | 终版连续两次 `node build.mjs` sha256 一致：`0a4c685ff0994d3b43e5d41c4c4e4dfbd1ced98614b94e48845589d8491b0a21`（含谱系注：行为门跑于 `375b2df3…`，差异=lab.js 一行注释，行为等价） |
| 2 | 自包含零外链 | **PASS** | 终版 `<script src=`/`<link `/`@import`/`url(http` 全 0 命中 |
| 3 | console 双域 | **PASS** | `console_check.mjs`：CONSOLE-CHECK-PASS（加载+instant 巡检+动画工段+chips+互动+试错，双域 clean） |
| 4 | 语言门 retired ⊆豁免 | **PASS** | 终版 RETIRED-PASS total=24 基线内（回执 24/定案 1 持平；新增文案串 dev/retired_precheck.py 预检 PASS；「屏幕」踩「幕」一次已被自纠） |
| 5 | 页码 needle | **PASS** | needle_pairs.txt 24 对逐对 PAGE-OK（18 原有+6 引文面新增；先行试跑全 OK 再入表） |
| 6 | shots 全套 | **PASS** | `shots.mjs --prefix v3k`：31 件 exit 0（30 件常规+v3k-f3-mid 新增）· CONSOLE-CLEAN×2 · F0CHECK PASS（panorama+full、marginWu=15.59）· **SHOTS-TRYERROR ALARM-INVIEW-PASS**（新增取证断言入 exit code） |
| 7 | 标签不叠探针 | **PASS** | `label_probe.mjs`：LABELPROBE-PASS 17 台（含 3D 牌×HTML+3D 牌两两检测；两行灯排牌新几何全台无叠） |
| 8 | LAB-CHECK | **PASS** | `lab_check.mjs`：LAB-CHECK-PASS（徽章门+三关全链+s1/s2/s4/s6 选项级 hint 逐字断言升级+BSR 双分支+Linux 排序+quiz 4/5+重做） |
| 9 | zoomfs/交互冒烟 | **PASS** | `smoke_check.mjs`：SMOKE-CHECK-PASS |
| 10 | 性能门（独占） | **PASS** | `perf_check.mjs`：PERF-CHECK PASS wall=150.5s ≤8min · longtask>100ms=0 · stage=11 · receipts=14（与 S4 基线 150.5s 持平，零回归） |
| 11 | 节奏审计（新增） | **PASS** | `stage_timing.mjs`：STAGE-TIMING-PASS 12 工段（k=0.5 实测墙钟 ∈ 容差；F1–F10 实测/期望比 1.12–1.35；F0/F11 短展示段按飞行时长托底+1.5s 轮询开销标定） |

**取证帧目验（复评点名项双票补证）**：
- `shots/v3k-tryerror.png`：Parameter Error 红牌全文+复位设备按钮完整在画面（对照 v3j 同帧红牌滚出画面——两轮登记的取证缺陷关闭）；
- `shots/v3k-f3-mid.png`：四信号点亮态（CCS/CSC/PRC/PED 亮、PR 熄、PLS=U0、Speed=FS，面板 F3 进行中态）——依赖 §4.2 旗标灯修复；
- `shots/v3k-cam-F4/-F7/-F10.png`：灯排牌两行全文完整（对照 v3j-cam-F4 双侧裁）；
- `shots/v3k-quiz-slot.png`：五题定稿题面渲染（§K 阶梯结构）；
- `dev/iteration-frames/`：s5a/s5b/s5c 迭代过程帧留档（含 s5b-F3 修复后单帧取证）。

## 8. 工具通用化台账（本环节新增/随更）

| 工具 | 类型 | 参数化点 | 被消费分区 | 下游复用 |
|---|---|---|---|---|
| `pipeline/tools/stage_timing.mjs` | 新增（门工具） | --k/--tol/--width/--height；工段数=timeline.stages.length；基准=页内 `__x43.stageSteps()` | timeline.stages/meta.speedModel | S6 回灌复检、**S7 分镜时长表直读** |
| `pipeline/tools/shots.mjs` | 随更 | tryerror 取证段重写+ALARM-INVIEW 断言入 exit code；f3-mid 帧 | cameras/timeline/panel | S5 复拍/S6/S7 |
| `pipeline/tools/lab_check.mjs` | 随更 | dump 增采选项级 hints；四处错选断言升级 hint 逐字 | interactions | S6/S7 构建回归 |
| `pipeline/tools/needle_pairs.txt` | 随更 | 18→24 对（引文面 6 对增补） | （S1 引文面） | 语言/引用门复跑 |
| `dev/quote_verify.py` | 一次性 | ——（六条 QUOTES 逐字核验；引用面变更时手工重跑） | stages.js QUOTES | 留档 |
| `dev/retired_precheck.py` | 一次性 | ——（新增文案串预检） | 新文案 | 留档 |
| `dev/lamp_plate_probe.mjs` | 一次性 | ——（球-牌投影间隙量化+dy 扫描） | d05/lampRowPlate | 留档 |
| `dev/shot_frames.mjs` | 一次性 | 机位清单 CLI 传参 | cameras | S5 迭代用，S6 可参考（注意其 cam 分支不更新面板，正式门以 shots.mjs 为准） |

## 9. 遗留

| # | 级 | 事项 | 指向 |
|---|---|---|---|
| R1 | P2 | 桌面道具群立面可读性仍为占位档上限（补光已尽力，PBR albedo/normal 属 S6 纹理回灌面） | S6 |
| R2 | P2 | 三环环管本体为金属材质无环境贴图，F0 远景辨识度靠补光已达「可辨」但非「醒目」——envMap 属 S6 材质工厂面 | S6 |
| R3 | 备注 | quiz 题面更换后 DSL quiz.topics 六项中「8 字节仅 FS/双操作同成/PSCEG 跳变/Linux 实路径差异」未全部入题（5 题容量按 §K 阶梯取舍：PSCEG 并入 F1–F3 工段面、8 字节/双操作保留在字段卡+试错/L3 面）——如需全 topics 覆盖需 DSL count 上限调整，属主裁定 | 主会话 |
| R4 | 备注 | label_probe 的 3D 牌检测不含「3D 牌 vs 场景几何（灯球等）」遮挡检测——本环节以 dev 探针+目验覆盖；如需机检化（牌注×邻近几何投影求交）属工具增强，留 S6 前维护窗 | tools 维护窗 |
