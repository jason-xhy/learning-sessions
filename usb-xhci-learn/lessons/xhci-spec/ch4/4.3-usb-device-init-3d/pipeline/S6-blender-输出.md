# S6-blender-输出 —— V3 材质工厂环节产出清单（逐项：方案/参数/尺寸/注入点/对照）＋门结果＋体积账

产出：2026-11-11 ｜ S6 worker ｜ 上游：S6-需求.md / S6-设计.md（M0 Blender 4.5.16 LTS 无头路线）
交付：`pipeline/tools/blender_gen/` 五件工具链 + `out/`（32 张烘焙 PNG+env 全景留档）+ `src/textures.gen.js`（生成件）+ `src/engine.js`/`scene.js`/`main.js` 注入改造 + `build.mjs` 装配 + 终版 `index.html`
纪律：`scene.dsl.json` 零改动 ✓（textureRequests 只读消费）；不 git commit ✓；只动 4.3 目录 ✓

## 0. M0 与生成链（复现命令）

```
blender -b --python pipeline/tools/blender_gen/gen_textures.py -- --outdir pipeline/tools/blender_gen/out --dsl pipeline/scene.dsl.json
python3 pipeline/tools/blender_gen/post_tile.py --dir pipeline/tools/blender_gen/out --restore --fade 0.04
python3 pipeline/tools/blender_gen/check_textures.py --dir pipeline/tools/blender_gen/out   # TEXCHECK-PASS
python3 pipeline/tools/blender_gen/compress_textures.py --dir pipeline/tools/blender_gen/out # BUDGET 择优
node pipeline/tools/blender_gen/pack_textures.mjs --dir pipeline/tools/blender_gen/out --out src/textures.gen.js
node build.mjs
```
色彩空间自适应探针（gen 内建）：bake 缓冲 linear、save 做 sRGB 编码（PNG 字节实证 188=0.5linear）→ albedo/emissive 常量节点侧先行 linear 化（COL），数据图（rough/ao/normal）恒为线性直写（Non-Color）。

## 1. 12 项逐项表（textureRequests 对表）

| # | id（烘焙尺寸） | 节点方案要点（参数实测） | 注入点 | 验收 |
|---|---|---|---|---|
| 1 | tex01 机柜钢板（albedo 1024²/rough 512²/normal 512²/ao 512²） | 水平拉丝=Wave(Y,220)+Bump(0.15)；宽幅明暗 Noise(16)×[0.93,1.06]；污渍 Noise 门控 fac0.12；指纹 3 斑（定点软圆 fac0.22）；螺丝点阵 4×4（sin 阈值 0.982）；边框磨损带 3–8%×噪声断裂 | `mat("mCabinetSteel")` 全柜面/抽屉/钢卡座 | 拉丝横纹+螺丝+磨损目验 ✓（v3m-cam-F4/F0）；rough 均值 0.43=区间中值 ✓ |
| 2 | tex02 轨道钢（512²×2） | 纵向划痕=Noise 经 Mapping(0.12,7) 拉伸；锈斑 2–3 处=Voronoi F1 门控+暖褐 #c98a5a；横梁顶磨损 v>0.80 | `mat("mRailSteel")` 轨道/门架/环管 | 锈斑+划痕在案 ✓ |
| 3 | tex03 桌面木（albedo 1024×512/rough 512×256/normal 512×256） | 木纹=Wave(Y,**10**,dist 1.2)（偶整数→滚移半幅相位不变）+细纹 Wave(56)；节疤 A/B=暗心(r0.045/0.03)+亮晕+定位环(freq 45/60)（pre-roll (0.66,0.75)/(0.80,0.85)→避中缝带）；抛光斑 rough×(mid−0.10)；normal=Bump(0.28)+节疤雕刻 | `mat("mDeskWood")` 桌面/桌腿 | 纹理级：节疤 local-std 45.0/37.2（代理≥35）、ΔL 62.0/57.9（≥18）✓；deskCloseup 双疤入画幅目验 ✓（§4 报备-1 截图级数值口径） |
| 4 | tex04 设备塑料（512²×3） | 磨砂=Noise(60,detail2)（降频防亚像素走样）+Bump(0.35)；斜划痕 Mapping rot32°；四角磨损 | `mat("mDevicePlastic")` 设备壳/打印机/托盘 | 微颗粒 normal std 61 ✓ |
| 5 | tex05 缆皮（256²×2） | 纵向细纹 Wave(X,80)+均匀微尘；rough [0.62,0.73] | `mat("mCableRubber")` 缆管 repeat[6,1] | 细纹环向 ✓；**偏差**：上侧灰尘沉积依赖世界方向、管 UV 无法对齐→均匀微尘替代（S6-设计①已记） |
| 6 | tex06 插头金属（256²×2） | 镀层拉丝 Wave(Y,64)；接触带 v[0.3,0.7] rough×0.85 | `mat("mPlugMetal")` 插头法兰/端子 | 免滚移（波纹+带全周期）✓ |
| 7 | tex07 地板环氧（1024×512×3） | 云纹 Noise(1.5)±6%；网格线=Wave X/Y 阈值（间距 1.2wu 换算 46.7/23.3 条）；三灯池 rough×0.714（UV 对齐 scene.js 灯池 (0.44,0.5)/(0.2,0.5)/(0.72,0.5)）；ao=机柜/桌/设备 bbox→UV 软阴影 | scene.js buildWorld 地板（applyTexData+aoMapIntensity 0.9） | F0 网格+灯池目验 ✓；rough 均值 0.414≈0.42 ✓ |
| 8 | tex08 卡纸（512²×2） | 纤维 Noise(120,detail3) 保持占位色族；rough [0.70,0.85] | `mat("mCardPaper")`：铭牌背板（DSL 锁定）+ 桌面内衬卡 3 处换绑（构件层 `cardBg`→`mCardPaper`，基色同 #1e2836） | 纤维噪点 ✓；**偏差**：S2「四款 tint」未在构件层实现，回灌维持单一 tint 防②回归 |
| 9 | tex09 旋钮铝（256²×3） | 滚花 Wave(X,48)+Bump(0.30)；中心指尖磨损 r0.28 rough×0.8 | `mat("mKnobAlu")` 旋钮/拉手 | 滚花+中心磨损目验 ✓；免滚移（径向特征）✓ |
| 10 | tex10 格架塑料（256²×2） | 底缘磨口带 v<0.18+噪声微磨损；rough [0.45,0.60] | `mat("mGridPlastic")` DCBAA 格架 | **偏差**：编号 0..7 丝印仍由构件层小屏逐格绘制（共享材质无法逐格变号）——纹理承载磨口/磨损（S6-设计①已记） |
| 11 | tex11 灯罩（albedo 256²/emissive 256²/rough 128²） | 细尘 Noise(50)；emissive 竖向渐变（口缘暖→顶冷）；rough 实测 [0.286,0.310]（均值 0.297；DSL 标称 [0.3,0.3]——2026-11-11 勘误，原记 [0.28,0.32] 与 DSL 微差） | scene.js domeMat（构件层自建，动画驱动）applyTexData **skip emissiveMap**（发光色语义归动画，静态贴图会压过工段点灯色——偏差记录）；albedo/rough 已接 | 细尘+渐变生成件在案；接线面=albedo/rough ✓ |
| 12 | tex12 屏面玻璃（128²×2） | 抗反射微噪 Noise(64)+指纹椭圆环纹 (0.62,0.55)（极低对比） | `mat("mScreenGlass")` 设备屏/状态窗板 | 微纹理+指纹 ✓；metal/rough null→S6 保守裁定=沿用 S4 缺省（metal 0.10/rough 中值 0.16），map 落区间 [0.10,0.22] ✓ |
| env | env_equirect（1024×512） | 纯世界节点全景：三段渐变（天顶 #0b0f14 系→地平带→地面反弹）+三盏暖灯 halo（DSL 灯位方向点积）+两道冷窗；PANO 相机 samples4 | main.js：TextureLoader→EquirectangularReflectionMapping→PMREM→scene.traverse metalness≥0.4 材质 envMap（metal≥0.8 强度 0.5，地板 0.15；plastics 不挂） | F0 环管反光定义度改善 ✓（R2 闭环）；scene.background/fog 未动，deep-dark 保持 ✓ |

## 2. 门复跑结果（终版构建 sha256=38992c5c… ×2 一致）

| # | 门 | 结果 | 证据 |
|---|---|---|---|
| 1 | 构建 sha 可重复 | PASS | `node build.mjs` ×2 一致：`38992c5c4a1e5a69…`（1532→1541KB 档，实测见 §3） |
| 2 | 自包含零外链 | PASS | `<script src=`/`<link `/`@import`/`url(http` = 0 命中 |
| 3 | console 双域 | PASS | `console_check.mjs`：CONSOLE-CHECK-PASS（加载+instant 巡检+动画+chips+互动+试错，双域 clean；纹理 30 张 data-URL 加载零报错） |
| 4 | 语言门 | PASS | `scan_words.py retired --check`：RETIRED-PASS total=24 基线内（回执 24/定案 1 豁免持平；新增注释零退役词） |
| 5 | 页码 needle | PASS | needle_pairs.txt 24 对逐对 PAGE-OK（NEEDLE-GATE PASS miss=0；S6 未动任何文案/页码锚） |
| 6 | shots 全套 | PASS | `shots.mjs --prefix v3m`：31 件 exit 0 · CONSOLE-CLEAN×2 · F0CHECK PASS（panorama+full，marginFull=15.59）· SHOTS-TRYERROR ALARM-INVIEW-PASS（终版重拍见 §5 门表补注） |
| 7 | 标签不叠探针 | PASS | `label_probe.mjs`：LABELPROBE-PASS（纹理回灌不改标签/几何位形） |
| 8 | LAB-CHECK | PASS | `lab_check.mjs`：LAB-CHECK-PASS（互动三关+hint 断言不受材质面影响） |
| 9 | zoomfs/交互冒烟 | PASS | `smoke_check.mjs`：SMOKE-CHECK-PASS |
| 10 | 性能门（独占） | PASS | `perf_check.mjs`：PERF-CHECK PASS（wall 与 longtask 见 §5；纹理/PMREM 为一次性加载开销，巡游 RAF 面零长任务） |
| 11 | S6 新增·纹理机检 | PASS | `check_textures.py`：TEXCHECK-PASS（tex03 节疤代理 45.0/37.2+ΔL 62.0/57.9+全 map 尺寸对表/非恒值/法线健康+albedo 色族） |
| 12 | S6 新增·占位回退 | PASS | 移除 textures.gen.js 重建：构建过、页面开、行为=现行占位档（Blender 不进构建依赖）；恢复后终版重建 |

## 3. 体积账（预算 ≤+1.5MB）

| 项 | 值 |
|---|---|
| 基线构建（S5 终版） | 971,764 B |
| S6 终版构建 | 1,612,243 B——**增量 = +640,479 B ≈ +0.61MB = 预算的 41%** |
| 内嵌 base64 总量（pack 口径） | 635,156 B（12 tex 全部 + env；compress 择优后零降级 pass0 直接过） |
| 大头 | tex04 normal 310KB（磨砂颗粒 WebP-lossless 高熵）、tex03 albedo 29KB（web 压缩件实测 28,912B，URL 38.6KB——2026-11-11 勘误，原记 22KB）、tex01 albedo 14KB（周期性内容 WebP 高效） |
| 砍序动用 | 未动用（预算余量 58%） |
| 留档 | 原始烘焙 PNG `pipeline/tools/blender_gen/out/`（32 张+env）；raw/（滚移前备份）；web/（压缩件） |

## 4. 报备主会话（S6 无权处置项）

| # | 事项 | 证据与指向 |
|---|---|---|
| 报备-1 | **textureRequests.acceptance.deskRowStd=40 / knotStd=55 在 S5 灯光体系下不可达（规格冲突）**：桌面区渲染亮度上限 45/255（§E.7 basecolor 乘法管线 ×0.31 + deep-dark 灯光），截图级实测 row-mean-std：v3k 占位档=7.3 vs v3m 纹理回灌=7.3（同 crop 同灯光——纹理细节在亮度带 [0,45] 内被压平，数值天花板 ~12）；节疤定点截图 std v3m=9.2 vs v3k=7.9。**V2 的 40–59 系 V2 灯光 rig 下的数值**（EVIDENCE §128）。纹理级代理门全过（节疤 local-std 45/37、ΔL 62/58、行 std 报告值 13.7——2026-11-11 勘误，原记 10.2，scorer 复跑同 crop 实测 13.7）且近景放大判据（主判据）目验成立。待裁：①重标定 V3 数值阈值（建议按「≥v3k 基线×1.25 且纹理级代理门全绿」口径）或 ②授权桌面区补光（属 S5/S5+ 灯光域）——worker 未擅动灯光 | `pipeline/tools/s6_desk_check.py` + dev/iteration-frames/s6-previews/s6l-deskzone.png |
| 报备-2 | tex11 emissiveMap 生成但未接线：domeLamp 发光色由工段动画驱动（构件层 domeMat emissive 黑→逐帧换色），静态 emissiveMap 会压过点灯色语义——albedo/rough 已接，emissive 生成件留档待构件层裁定 | scene.js domeMat 处注释 + out/tex11_emissive.png |
| 报备-3 | tex08「四款 tint 变体」未实现：桌面内衬卡换绑 mCardPaper（基色同 #1e2836，+纤维调制），tint 变体属构件层配色改动（防②回归不做）；铭牌背板 tex08 天然接线 | scene.js 3 处 D.mat("mCardPaper") |
| 报备-4 | tex10 编号丝印 0..7 仍由构件层小屏逐格绘制（共享材质无法逐格变号）——纹理承载磨口/磨损近似 | S6-设计① 偏差记录 |
| 报备-5 | tex05「上侧灰尘沉积」以均匀微尘替代（管 UV 环向与世界方向无法对齐） | S6-设计① 偏差记录 |

## 5. 门结果补注（终版复跑实测值）

- shots v3m 终拍（终版构建）：31 件 exit 0 · SHOTS-F0CHECK PASS（panorama=true full=true marginFull=15.59）· SHOTS-TRYERROR ALARM-INVIEW-PASS · CONSOLE-CLEAN×2
- perf：PERF-CHECK PASS（wall=150.4s ≤8min · longtask>100ms=0 · stage=11 receipts=14——与 S4/S5 基线 150.5s 持平，零回归；30 张 data-URL 纹理+PMREM 为一次性加载开销）
- 对照帧（v3m vs v3k 同机位，③ 终评判面）：deskCloseup（木纹+双节疤入画幅）、deviceCloseup（磨砂+灯罩细尘）、F0（钢板拉丝+地板网格+灯池反光+环管定义度）、F4（柜面钢板+格架）——全部 `shots/v3m-*.png` 在案
- 迭代过程帧：`dev/iteration-frames/s6-previews/`（拼板/tex03 1:1 裁片/s6l-deskzone）+ s6k/s6l 单帧

## 6. 工具通用化台账（PIPELINE §6）

| 工具 | 参数化点 | 驱动分区/数据 | 下游复用 |
|---|---|---|---|
| `pipeline/tools/blender_gen/gen_textures.py` | --outdir/--only/--dsl/--manifest/--no-env/--env-only；尺寸表内置+DSL 上限校验 | textureRequests（尺寸/上限）、S2 §E.7（rough 区间） | S7 分镜材质特写、同型课件换肤重跑 |
| `pipeline/tools/blender_gen/post_tile.py` | --dir/--fade/--restore（raw 恢复重做防二次混合） | manifest.tileable | 任何烘焙贴图平铺化 |
| `pipeline/tools/blender_gen/check_textures.py` | --dir；判据表=FAMILY 带+节疤定点（滚移换算） | textureRequests 验收+V2/V3 判据 | 纹理回归机检 |
| `pipeline/tools/blender_gen/compress_textures.py` | --dir/--budget-b64；编码择优+六级降级梯 | policy 预算/砍序 | 预算循环可复用 |
| `pipeline/tools/blender_gen/pack_textures.mjs` | --dir/--out；META repeat/normalScale 表 | textureRequests+材质槽名 | 生成件装配 |
| `pipeline/tools/s6_desk_check.py` | --shot/--crop/--knot-at/--row-req/--knot-req | V2/V3 截图级判据 | 报备-1 重标定后即插即用 |

## 7. 遗留

| # | 级 | 事项 | 指向 |
|---|---|---|---|
| R1 | P1-报备 | deskRowStd/knotStd 截图级数值不可达（§4 报备-1）——待主会话裁定口径或补光授权 | 主会话 |
| R2 | P2 | tex11 emissiveMap 接线（待构件层点灯语义裁定，§4 报备-2） | 主会话/构件属主 |
| R3 | P2 | tex08 四款 tint（§4 报备-3） | S5+/构件属主 |
| R4 | P3 | tex04 normal WebP-lossless 310KB 占预算一半——如需进一步瘦身可走 JPEG4:4:4 q92（视觉近无损），预算富余暂不动作 | 后续维护窗 |
