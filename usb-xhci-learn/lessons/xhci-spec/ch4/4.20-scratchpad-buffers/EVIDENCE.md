# EVIDENCE.md —— §4.20 暂存缓冲区（2026-11-04，泳道节量产 #4）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| Scratchpad Allocation=xHC 请求一/多个 PAGESIZE 系统内存缓冲存内部状态 | §4.20 p304 首段（pagecheck PAGE-OK `4.20 Scratchpad Buffers`@p304；PAGESIZE 寄存器 §5.4.3） |
| 页数=HCSPARAMS2 的 Max Scratchpad Buffers Hi/Lo，可为 0 | §4.20 p304（HCSPARAMS2 §5.3.4 引述） |
| 分配须在 R/S=1 之前 | §4.20 p305（引文① PAGE-OK `in to Run mode (Run/Stop`——needle 避断行） |
| 数组基址写 DCBAA 槽 0 表项 | §4.20 p305（引文② PAGE-OK `Entry 0 of the Device Context Base Address Array`；数组结构 §6.6） |
| 装载四步：读页数→分配数组→写 DCBAA 槽 0→逐页（分配/清 0/写指针） | §4.20 p305 步骤 1-4 |
| 软件不读写内容（写=未定义行为）；xHC 不越 PAGESIZE 块；SPR=1 内容跨 D3.cold 存活 | §4.20 p305 features 四条（引文③ PAGE-OK `shall not read or write a Scratchpad buffer`；SPR 归 Table 5-11） |
| 设备泳道不参与 | §4.20 全文无设备侧动作——DESIGN §1.7 立法 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #4；build.mjs 纯数据（7 步）。
- 门：语言门 total=4 ⊆ 豁免集（泳道4）——**首轮实锤「账本」×1 越豁免（narr「私有账本」），当轮改「登记」清零**；交互冒烟 LANE-SMOKE-PASS ×2 主题；自包含；截图 6 张。
