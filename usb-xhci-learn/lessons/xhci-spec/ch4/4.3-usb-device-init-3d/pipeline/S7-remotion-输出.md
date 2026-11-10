# S7-remotion-输出 —— Remotion 包装环节产出清单（片段表/门结果/体积账/HTML 变更）＋工具台账＋遗留

产出：2026-11-11 ｜ S7 worker ｜ 上游：S6 PASS（终版场景 sha256 `38992c5c…`）+ 主会话前置任务两项（§0）
交付：`media/S07-*.mp4` 14 段（9.20MB ≤30MB）+ HTML「演示视频」tab + `pipeline/tools/s7_record.mjs`/`s7_video_check.py` + `pipeline/tools/remotion-wrap/`（Remotion 项目）+ `pipeline/S7-需求.md`/`S7-设计.md`
纪律：DSL 零改动 ✓；src/ 仅演示视频入口增量（panel.js tab+数据表、style.css 清单样式）✓；不 git commit ✓；长命令后台+轮询 ✓；多行代码落盘 ✓

## 0. 前置任务（主会话裁定落地，先于本环节主链完成）

| # | 任务 | 结果 |
|---|---|---|
| 1 | `pipeline/tools/s6_desk_check.py` 加 `--mode v3`（S6-评分 重标定判据：gradY-mean≥1.2 且各向异性 gradY/gradX≥20 且节疤区 64px 最优窗 std≥4.0；row-mean-std 降级为报告值不作门；纹理级代理门 check_textures.py 仍为主门） | 落地并三帧验证：v3m-cam-deskCloseup **DESKCHECK-V3-PASS**（gradY=2.070/aniso=32.6/knot=4.63——与 scorer 实测表逐值一致）；v3k 同机位 FAIL（0.513/12.7/2.34 拦在门外）；`--row-req/--knot-req` V2 形态原样保留（默认 mode=v2 兼容复现）。注：判据按 scorer 口径为 deskCloseup 固定 crop/region 校准（0.03,0.615,0.67,0.135 / 0.538,0.518,0.152,0.165），其它机位帧不在判定域 |
| 2 | `pipeline/S6-blender-输出.md` 三处口径勘误（scorer 备注一） | 落地：①报备-1「行 std 报告值 10.2」→**13.7（scorer 复跑）**；②§3「tex03 albedo 22KB」→**29KB**（web 压缩件实测 28,912B，URL 38.6KB）；③tex11「rough [0.28,0.32]」→**实测 [0.286,0.310]（均值 0.297；DSL 标称 [0.3,0.3]）**——实测值本环节对 `out/tex11_rough.png` 独立复算与 scorer 一致 |

## 1. M0 环境（Remotion）

- `pipeline/tools/remotion-wrap/` npm 装 **remotion 4.0.542** + @remotion/bundler + @remotion/renderer + @remotion/cli + react/react-dom 19（242 包）；渲染时自动下载 **Chrome Headless Shell**（Remotion 自管浏览器，页面渲染与合成截图通道）；**自带 ffmpeg n7.1/ffprobe**（`node_modules/.bin/remotion ffmpeg|ffprobe`，输出走 stderr）——未装系统 ffmpeg（无需）。
- 冒烟：`node render_all.mjs --smoke`（frameRange 0–23 = 1s）→ `media/S07-intro.mp4` h264/1280×720/24fps/1.00s 渲通；抽帧目验 CJK（PingFang SC）无缺字。
- 坑记录：`ffmpegOverride` 传 `--movflags`（双横线）致 pre-stitcher 管道破裂 EPIPE——Remotion 4 默认已 faststart，直接删该参数；macOS xargs 无 `-d`、`xargs -n2` 会把含空格 needle 拆碎（needle 复跑命令已在 needle_pairs.txt 头注修正，24/24 实测）。

## 2. 管线与录制（s7_record.mjs，CDP screencast）

```
[探针 dev/s7_stage_probe.mjs] tend+say 时刻 → stages.json
[录制 pipeline/tools/s7_record.mjs] headless Chrome（与门工具同款 flags）+ Page.startScreencast jpeg q90 @1440×810
  → goto(i) 积累态（k=__x43.setSpeed(1)）→ !playing()+target 时长 → 24fps 槽桶化帧序列 frames/F<i>/ + manifest.json
[组态+渲染 remotion-wrap/] 14 <Composition>（章节卡 2.0s 前置→0.4s 交叉淡化→帧序列→段尾淡出 0.6s；底部解说词带）
  → renderMedia crf20 → media/S07-*.mp4
```

- **screencast 而非 recordVideo 的理由**（S7-设计 §2.1）：startScreencast 在「页面就绪后、goto 前一刻」启动，视频起点=工段动画起点（确定性对齐，误差≪1 帧）；recordVideo 从 context 创建即录、含加载段、无确定性裁剪点。
- **F0/F11 minhold=8s**：两段 tend 仅 0.4/0.6s（巡航展示段），按教学功能延长取景（车间初见/完工浏览），其余段=tend+飞行 1.2s+tail 1.5s。
- 结束判据：`!__x43.playing()` 且 elapsed≥target——每段 console 双域 clean（REC CONSOLE-CLEAN）。

### 录制实测表（k=1）

| 段 | tend | target | wall | 帧数(24fps) | uniq | | 段 | tend | target | wall | 帧数 | uniq |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F0 | 0.4 | 9.5 | 9.6s | 230 | 202 | | F6 | 9.1 | 11.8 | 11.85s | 284 | 233 |
| F1 | 7.1 | 9.8 | 9.83s | 236 | 188 | | F7 | 10.4 | 13.1 | 13.48s | 324 | 292 |
| F2 | 3.3 | 6.0 | 6.33s | 152 | 118 | | F8 | 5.2 | 7.9 | 8.16s | 196 | 186 |
| F3 | 4.4 | 7.1 | 7.33s | 176 | 130 | | F9 | 5.8 | 8.5 | 8.53s | 205 | 187 |
| F4 | 5.9 | 8.6 | 8.83s | 212 | 173 | | F10 | 4.7 | 7.4 | 7.78s | 187 | 152 |
| F5 | 6.3 | 9.0 | 9.20s | 221 | 203 | | F11 | 0.6 | 9.5 | 9.83s | 236 | 220 |

合计帧序列 2,659 帧 ≈110.8s 画面本体；uniq 比 70–94%（空槽=静止段前向填充，画面对应收尾静置——非冻结）。

## 3. 渲染与体积账（crf 迭代：26→20 两轮全量）

- 第一轮 crf26：全集 **4.85MB**（预算 16%）——质量再上探；第二轮 **crf20** 定稿：全集 **9.24MB / 151.8s / 平均 0.51Mbps = 预算 31%**（≤30MB 目标留 69% 余量；R1 闭环后 outro 146KB→181KB）。
- `sizes.json` 由 render_all 实测回写（--only 部分渲染改为合并写，__totalMB 按全表重算）；panel.js `VIDEO_SIZES` 回填 crf20 终值。

### 片段清单（14 段，ffprobe 实测；命名 media/S07-*.mp4）

| 段 | 文件 | 时长 | 大小 | 内容 |
|---|---|---|---|---|
| 片头卡 | S07-intro.mp4 | 4.0s | 127KB | 课名+xHCI 1.2b §4.3（p71–80）+12 工段导览+三区图例 |
| F0 | S07-F0.mp4 | 12.17s | 413KB | 全景·车间初见（三区+三环巡航+灯池呼吸；章节卡「工段 0」） |
| F1 | S07-F1.mp4 | 12.42s | 693KB | 插入检测：设备滑入/插头推入/CCS·CSC/PSCEG 跳变/事件卡（p71） |
| F2 | S07-F2.mp4 | 8.92s | 612KB | 查端口：读 PORTSC CCS=1/写 PR=1 复位按钮（p71–72/p75） |
| F3 | S07-F3.mp4 | 9.92s | 753KB | 复位完成：四信号 PRC/PED/PR/PLS+Port Speed=FS+Default 态（p72） |
| F4 | S07-F4.mp4 | 11.42s | 861KB | 取槽：Enable Slot 入命令环/门铃 0/Slot ID=1/DCBAA 挂卡（p72/p75/p76/p83） |
| F5 | S07-F5.mp4 | 11.79s | 696KB | 槽初始化：A0=A1 填表/EP0 九字段/传输环上架/试错入口（p75–76） |
| F6 | S07-F6.mp4 | 14.42s | 895KB | 编址：BSR=0 代发 SET_ADDRESS/铭牌翻面/Enabled→Addressed（p72/p76–77/p97–98） |
| F7 | S07-F7.mp4 | 16.08s | 1267KB | 问尺寸：FS 8 字节/三 TRB 逐值/门铃 1/回包落托盘（p72–74/p82–83） |
| F8 | S07-F8.mp4 | 10.75s | 689KB | 更新上下文：Evaluate Context A1=1+Linux 实路径对照（p74/hub.c） |
| F9 | S07-F9.mp4 | 11.13s | 645KB | 读档案：完整描述符/收件匣叠卡/Class Driver（p74） |
| F10 | S07-F10.mp4 | 10.38s | 844KB | 配置：双操作同成并行飞行/双灯翻转 Configured（p74/p77–78） |
| F11 | S07-F11.mp4 | 12.42s | 776KB | 完工：管道全通全景巡航+自测引导（p74） |
| 片尾卡 | S07-outro.mp4 | 6.0s | 181KB | 完工要点+自测引导（5 题 ≥4）+动手台三关+在线版 URL+课件=index.html（同目录） |

（时长=合成口径 章节卡 2.0+画面+淡出 0.6，ffprobe 逐段核对见 §5 门 9。）

## 4. HTML 演示视频入口

- `src/panel.js`：①tab 行加「演示视频」（data-tab="video"，置于动手台与显示之间）+ `x43Pane-video` pane；②`switchTab` valid 表 +video；③`VIDEO_SIZES` 实测回填表 + `renderVideos()`（工段名/页码锚从 DSL timeline.stages 取，链接 `media/S07-<id>.mp4` 相对路径新窗打开，行尾 `x.xMB · xx.xs` 标注）；init 时渲染。文案规避退役词（「字幕」含退役字「幕」→改「解说词」）。
- `src/style.css`：`.x43-vrow/.x43-vrow a/.x43-vmeta` 三条清单样式（色板沿用 §E）。
- 重建 `node build.mjs` ×2 逐字节一致：**sha256 `1a20ae3fdec26a31…`**（S6 终版 38992c5c → 本环节增量=video tab+数据表+样式；场景/时序/交互面零接触）。运行时 drive 实测：tab 打开 14 行、首行 href=`media/S07-intro.mp4`、行标注与 console clean。
- **自包含口径**：mp4=旁文件（PIPELINE §4 裁定不内嵌），HTML 内仅 `<a href>` 相对链接；自包含 4 形态 grep 仍 0 命中。pane 内注明「离线分发需把 media/ 目录与 index.html 同放」。

## 5. 门复跑结果（S7 全套；终版构建 sha 1a20ae3f…）

| # | 门 | 结果 | 证据 |
|---|---|---|---|
| 1 | 构建 sha 可重复 | PASS | `node build.mjs` ×2 一致 `1a20ae3fdec26a31…` |
| 2 | 自包含零外链 | PASS | `<script src=`/`<link `/`@import`/`url(http` = 0 命中 |
| 3 | console 双域 | PASS | `console_check.mjs` CONSOLE-CHECK-PASS（video tab 不产生任何 console 输出） |
| 4 | 语言门 | PASS | `scan_words.py retired index.html --check pipeline/tools/retired-baseline.json` → **RETIRED-PASS total=24**（首跑 FAIL：新增「底部字幕」含退役字「幕」——改「解说词」后过；豁免={回执×24∪定案×1} 口径持平） |
| 5 | 页码 needle | PASS | needle_pairs.txt 24/24 **PAGE-OK**（复跑命令修正后全绿，见 §1 坑记录） |
| 6 | 标签不叠探针 | PASS | `label_probe.mjs` LABELPROBE-PASS |
| 7 | shots 全套 | PASS | `shots.mjs --prefix s7v1`：**31 件 exit 0** · CONSOLE-CLEAN · F0CHECK PASS（panorama+full marginFull=15.59）· ALARM-INVIEW-PASS · PHONE CLEAN；抽帧目验 3 帧：s7v1-tab-video（video tab 全清单渲染）/s7v1-f3-mid（F3 四信号+U0+FS，video tab 同屏开）/s7v1-exp-check |
| 8 | 性能门（独占） | PASS | `perf_check.mjs` PERF-CHECK PASS **wall=150.4s**（与 S4/S5/S6 基线 150.5s 持平，零回归）· longtask>100ms=0 · stage=11 receipts=14 |
| 9 | 视频侧自检 | PASS | `s7_video_check.py` **VIDEOCHECK-PASS 14/14**：逐段 ffprobe（h264/1280×720/24fps）+时长 vs 合成预期 ±0.25s 全对 + 中段无黑帧 + 冻结扫描（动画窗内病态冻结判据：连续 ≥3 采样对且跨度 ≥窗 1/3——F6 镜内定镜/画外收尾的窄静止段经抽帧目验排除） |
| 10 | 体积账 | PASS | **9.24MB ≤ 30MB（31%）**；逐段见 §3（R1 闭环复跑 VIDEOCHECK-PASS 14/14，2026-11-11） |
| 11 | 互动/冒烟（加跑） | PASS | `lab_check.mjs` LAB-CHECK-PASS · `smoke_check.mjs` SMOKE-CHECK-PASS |
| 12 | 字幕文案语言门 | PASS | `scan_words.py retired subtitles.json` → total=2 仅「回执」×2（DESIGN §1.5 豁免词，与 HTML 豁免集同口径）；数值全部 S1 已核值（§3 内容表页码锚可溯源） |

## 6. 工具通用化台账（PIPELINE §6）

| 工具 | 类型 | 参数化点 | 驱动分区/数据 | 下游复用 |
|---|---|---|---|---|
| `pipeline/tools/s7_record.mjs` | 新增 | --stages/--fps/--width/--height/--speed/--tail/--minhold/--quality/--outdir/--fresh；工段表/时长运行时读 stages.json+`__x43` | `__x43`（goto/playing/setSpeed）、timeline.stages | 同型课件视频化（换 --page/--dsl 即用）；manifest 支持断点续录（--fresh 重录） |
| `pipeline/tools/s7_video_check.py` | 新增 | --media/--frames-out；时长预期=stages.json 合成口径；冻结窗=tend 推算 | ffprobe 元数据+抽帧统计 | 任意 mp4 交付集自检 |
| `pipeline/tools/remotion-wrap/` | 新增（项目） | Root.js 注册表由 stages.json/subtitles.json/sizes.json 驱动；render_all.mjs --crf/--only/--smoke/--out | 帧序列 publicDir | 换课=换三个 json+注册表零改码 |
| `pipeline/tools/s6_desk_check.py` | 随更（前置任务） | --mode v2/v3 + --grady-req/--aniso-req/--knot-v3-req/--knot-region | S6-评分 重标定判据 | V3 口径截图级机检即插即用 |
| `dev/s7_stage_probe.mjs` | 一次性 | ——（tend/say 导出） | __x43.stageSteps | 留档 |
| `needle_pairs.txt` | 头注随更 | ——（复跑命令修正：tab 展开 + xargs -0 -n2） | —— | needle 门复跑 |

## 7. 遗留

| # | 级 | 事项 | 指向 |
|---|---|---|---|
| R1 | ~~P2~~ **已闭环（2026-11-11 主会话给 URL）**：片尾卡写入装机地址 `https://jason-xhy.github.io/learning-sessions/usb-xhci-learn/lessons/xhci-spec/ch4/4.3-usb-device-init-3d/`（Cards.js OutroCard）→ `render_all.mjs --crf 20 --only S07-outro` 重渲 → s7_video_check 复跑 **VIDEOCHECK-PASS 14/14**；抽帧目验 URL 完整可读（断行在连字符界）；index.html 零改动（sha `1a20ae3f…` 不变）。残留微瑕：video tab outro 行标注 0.1MB vs 实际 0.2MB（+39KB 越过 0.1 圆整界）——HTML 零改动约束下未重建，待下次维护窗一并回填 | 已闭环/维护窗 |
| R2 | P3 | `remotion-wrap/frames/` ≈430MB 录制帧中间产物（渲染已消费）：删后重渲需重录——`node pipeline/tools/s7_record.mjs --stages all`（~2min）即复原；保留供 scorer 抽验，终验后可删 | 主会话裁定 |
| R3 | 备注 | 章节卡 hint 字段未启用（stages.json 无该字段；每工段语义已由解说词承载，双份反而重复） | 维持现状 |
| R4 | 备注 | 解说词时间锚=say 步实测时刻（dev/s7_stage_probe.json），文案=手工按 S2 §D 撰写于 subtitles.json——如改文案需同改 from/to（语义同相由 say 时刻表保证） | 维护窗 |
| R5 | 备注 | 片头/章节卡静态段无配乐/无旁白（教学视频集当前=画面+解说词形态）——加旁白属新需求，需用户裁定 | 主会话 |
| R6 | 备注 | video tab 的 14 行链接在 ≤480px 窄屏未单独目验（面板窄屏形态走既有折叠逻辑，清单为普通流式行，无定宽元素——回归风险低） | 维护窗 |

## 8. 复现命令（全链）

```
node dev/s7_stage_probe.mjs                                        # tend/say 探针 → stages.json
node pipeline/tools/s7_record.mjs --stages all                     # 录制 12 段帧序列
node pipeline/tools/remotion-wrap/render_all.mjs --crf 20          # 渲染 14 段 mp4 + sizes.json
node build.mjs && node build.mjs                                   # HTML 重建（含 video tab）×2 sha 核对
python3 pipeline/tools/s7_video_check.py                           # 视频侧自检门
# HTML 侧门：console_check/label_probe/lab_check/smoke_check/shots/perf_check + scan_words/needle（命令见各文件头注）
```
