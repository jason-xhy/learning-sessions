# §4.3 USB 设备初始化 · 3D 交互课件（xHC 启机车间）· V3

three.js 真 3D + **DSL 驱动引擎**（V3）：场景唯一事实源 = `pipeline/scene.dsl.json`（S3 数据件，
构建期注入 + 机检），引擎/构件/工段/动手台全部消费 DSL。现行 2D 页 `../4.3-usb-device-init/`
原样保留；V1/V2 证据链见 `EVIDENCE.md`（存档），V3 门结果见 `pipeline/S4-build-输出.md`。

## 构建

```
node build.mjs     # 产出单文件 index.html（three.js r160 内联 + DSL 注入；构建期 DSL 机检；字节级可重复）
```

- 产物字节级可重复（无时间戳）；构建期断言 DSL 结构计数（38 实体/17 机位/12 工段/36 参数/19 标签/3 环/12 纹理卡/34 derived）与引用完整性（材质/机位/参数/标签 host 边）。
- three.js vendored：`vendor/three.module.min.js`（r160，sha256 见 EVIDENCE §1）。
- 源码：`src/engine.js`（X43D 解析适配层：derived 引用/材质工厂〔S6 注入口 userData.texRequest〕/参数表/机位表/标签表）/ `src/scene.js`（构件函数库：三区+三环+缆+走廊+FX，几何全取 DSL）/ `src/stages.js`（工段编译器 timeline.stages→步序 + 预设 branches + 面板内容）/ `src/lab.js`（动手台三关状态机 interactions L1/L2/L3+quiz）/ `src/panel.js`（4 tab 面板+活指标+HOLD 滑杆+徽章架）/ `src/main.js`（引擎装配/速度模型/门 API window.__x43）/ `src/style.css`。

## 验收（门工具在 pipeline/tools/，通用化=参数读 DSL，CLI 传路径）

```
node pipeline/tools/shots.mjs --prefix v3g        # 17 机位（cameras 分区驱动）+互动三关+试错+quiz 槽位+390px×2+F0 裁右缘人验图
node pipeline/tools/label_probe.mjs               # 标签不叠探针：17 台 + labels.neighbors 邻居扩检
node pipeline/tools/lab_check.mjs                 # 互动三关行为门（interactions 分区驱动判据值，真实 DOM 点选链）
node pipeline/tools/console_check.mjs             # console 双域 clean（全工段 instant+动画+预设+互动+试错）
node pipeline/tools/perf_check.mjs                # 性能门：0.5× 全线巡游 ≤8min + longtask>100ms=0（独占运行）
node pipeline/tools/smoke_check.mjs               # zoomfs/交互冒烟（键盘/工段条/复位/回工位/速度/HOLD）
python3 scripts/scan_words.py retired index.html --check lessons/xhci-spec/ch4/4.3-usb-device-init-3d/pipeline/tools/retired-baseline.json
/usr/local/bin/python3.9 scripts/xhci_spec_pagecheck.py $(awk -F'\t' 'NR>3{printf "%s %s ", $1, $2}' lessons/xhci-spec/ch4/4.3-usb-device-init-3d/pipeline/tools/needle_pairs.txt)
```

- 语言门基线豁免={回执（DESIGN §1.5 裁定）∪ DSL 数据层残余（scene.dsl.json d08 basis 内「定案」×1，S3 数据件只读不改）}。
- 页码 needle 18 对覆盖 V3 全部 UI 引用面（needle_pairs.txt；S5 精修引文后随更）。

## 交互

- 底栏五分组 12 工段；键盘 ←→/空格 单步；播放：单步 ▶ / 自动巡游 / 全线联动运行 / ⟲ 复位。
- 分支预设 chips ×5（timeline.branches）：全速〔默认·规范建议路径〕/ 高速（F7/F8 置灰）/ USB3（F1 无 Disabled 帧）/ BSR=1 legacy / Linux 实路径（两步流+注记卡，两卡永不合成）。
- 试错：F5 点「试错：不填上下文直接编址」→ Parameter Error 红牌（p100）。
- 动手台三关递进（interactions）：L1 按门铃（一键正确+双失败提示）→ L2 组一次控制读（六步·错选不推进）→ L3 值班工程师（无提示·T1/T2 BSR 双分支/T3 Linux 排序挑战；L2 徽章=入门票）+ 徽章架；quiz 5 题（F11 讲解 tab，≥4/5 可重做；题面=SLOTS-FOR-S5 占位）。
- 显示 tab：剖视/标签/粒子开关 + 速度 0.5×·1×·2× + HOLD_SET 滑杆（停留=max(1.2, HOLD_SET/k)）+ 回到工位。
- 速度模型（meta.speedModel）：观看层 t=base/k，方波速率 ×k（运行时按缆曲线实长排程），UI 固定 0.25s，动手台等待封顶 6s。
