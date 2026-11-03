# EVIDENCE.md —— §4.16 带宽管理（2026-11-04，泳道节量产 #6）

## 逐条断言 → 判据

| 断言 | 判据 |
|---|---|
| xHC 可把根集线器端口组织成任意数量内部 USB 实例（共享/每端口独享/组合） | §4.16 p258 首段（pagecheck PAGE-OK `4.16 Bandwidth Management`@p258；实例数例 p258） |
| 带宽评估取决于端口所属实例+同实例其它设备占用 | §4.16 p258 第二段 |
| 带宽申请入口=Configure Endpoint 命令；评估是 xHC 职责 | §4.16 p258（引文① PAGE-OK `Software uses the Configure Endpoint Command`——needle 避断行 `to / ask`） |
| 失败码=Bandwidth Error / Secondary Bandwidth Error；可重试或 Negotiate Bandwidth | §4.16 p258 段末 |
| Negotiate Bandwidth → 同实例每台有周期端点的设备一张 Bandwidth Request Event | §4.16 p259 + §4.16.1 p259（Isoch/Interrupt 定义句） |
| 让带宽自愿（好公民）；让法=换配置/备选接口→重新 Configure Endpoint | §4.16.1 p259（引文② PAGE-OK 待补 needle：`good citizen`） |
| 协商命令不阻塞命令环（先回完成事件） | §4.16.1 p259–260 |
| Disable Slot 释放该槽周期端点带宽 | §4.16 p259（引文③ PAGE-OK `A Disable Slot Command will cause any bandwidth`） |
| 设备只在重新配置时出场（xHC 代发 SET_INTERFACE，§4.5.4.3） | §4.5.4.3 p90 交叉引用 |

页码机核：PAGECHECK-PASS。

## 工艺与门

- 生成器 lane_page.mjs 量产件 #6；build.mjs 纯数据（8 步）。
- 门：语言门 total=4 ⊆ 豁免集（回执1/泳道3）——**首轮实锤「上环」「出场」×2 越豁免，当轮清零**（量产文案自查清单再 +2）；交互冒烟 LANE-SMOKE-PASS ×2 主题；自包含；截图 6 张。
