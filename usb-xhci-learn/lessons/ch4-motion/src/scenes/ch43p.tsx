// §4.3 补丁分帧 —— usb: xhci: Set avg_trb_len = 8 for EP0 during Address Device Command
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show f72b9aa821a2` 取原文，禁凭记忆）：
//  - 主线上游 commit f72b9aa821a2bfe4b6dfec4be19f264d0673b008（正文引用一律用此 hash）
//    Jay Chen <shawn2000100@gmail.com>, 2025-07-17, drivers/usb/host/xhci-mem.c +2
//  - 本地核验件（stable 回移，diff 相同）dabf502ee8938159047f18c1a69f4efcef06dc27
//    （其 message 首行标注 "[ Upstream commit f72b9aa821a2... ]"，git show 已核）
//  - message 关键句（原文逐字）：
//    "Section 4.8.2 (\"Endpoint Context Initialization\") states that all fields
//     should be initialized to 0. However, Section 6.2.3 (\"Endpoint Context\",
//     p.453) specifies that the Average TRB Length (avg_trb_len) field shall be
//     greater than 0, and explicitly notes (p.454): \"Software shall set Average
//     TRB Length to '8' for control endpoints.\""
//    "we observed that enumeration fails and a parameter error (TRB Completion
//     Code = 5) is reported if avg_trb_len for EP0 is not set to 8"
//  - diff hunk @@ -1195,6 +1195,8 @@：+ep0_ctx->tx_info = cpu_to_le32(EP_AVG_TRB_LENGTH(8));
//    （插在 EP0 TR Dequeue 赋值之后、trace 之前）
//  - 规范锚点 evidence/spec-43.txt（§4.3 p75-76 切片）：步4 "Allocate an Input
//    Context data structure (6.2.5) and initialize all fields to '0'."（p75）；
//    步8 "Initialize the Input default control Endpoint 0 Context (6.2.3)"
//    字段表（p76，Max Packet Size/MaxBurst/TR Dequeue/DCS/Interval/MaxPStreams/
//    Mult/CErr——独缺 Average TRB Length）；§6.2.3 专门条款以 commit message 引文
//    为准（p453-454）。
import {makeScene2D} from '@motion-canvas/2d';
import {Vector2, all, waitFor} from '@motion-canvas/core';
import {C, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeDiffPanel,
  flash,
  DiffPanelApi,
  StageApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.3 补丁',
    zh: 'avg_trb_len=8',
    en: 'Set avg_trb_len = 8 for EP0 · Address Device',
    cite: 'f72b9aa821a2 · xhci-mem.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show f72b9aa821a2 hunk 逐字，新文件行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-mem.c · xhci_setup_addressable_virt_dev() · commit f72b9aa821a2（diff +2，新行号）',
    lines: [
      {no: '1195', code: '  ep0_ctx->deq = cpu_to_le64(dev->eps[0].ring->first_seg->dma |'},
      {no: '1196', code: '      dev->eps[0].ring->cycle_state);'},
      {no: '1197', code: ''},
      {no: '1198', code: '  ep0_ctx->tx_info = cpu_to_le32(EP_AVG_TRB_LENGTH(8));', kind: 'add'},
      {no: '1199', code: '', kind: 'add'},
      {no: '1200', code: '  trace_xhci_setup_addressable_virt_device(dev);'},
      {no: '1201', code: ''},
      {no: '1202', code: '  /* Steps 7 and 8 were done in xhci_alloc_virt_device() */'},
    ],
  });
  panel.ref().opacity(1);
  yield* waitFor(0.5);
  yield* panel.highlight(0);

  /* ===== 幕① 背景现场 ===== */
  const errChip = makeChip(
    view,
    '症状："enumeration fails and a parameter error (TRB Completion Code = 5) is reported if avg_trb_len for EP0 is not set to 8"。',
    {x: TLx(960), y: TLy(850), w: 1680, tint: C.warn, size: 18},
  );
  yield* stage.say(
    '2025 年 7 月：严格按规范实现的虚拟 xHC 枚举失败——Parameter Error（CC=5）。',
    '① 背景',
  );
  errChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(10.1);
  errChip().opacity(0);
  yield* waitFor(0.3);

  /* ===== 幕② 补丁前：一对规范矛盾 ===== */
  const ctxChip = makeChip(
    view,
    '"Allocate an Input Context data structure (6.2.5) and initialize all fields to \'0\'."——§4.3.3 步4 p75-76',
    {x: TLx(960), y: TLy(850), w: 1400, tint: C.dev, size: 19},
  );
  yield* stage.say(
    '根子是一对规范矛盾：§4.3.3 步4 说——输入上下文"所有字段初始化为 0"（spec-43 p76 原文）。',
    '② 矛盾',
  );
  ctxChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(7.8);
  ctxChip().opacity(0);
  yield* waitFor(0.3);
  const spec62Chip = makeChip(
    view,
    '"Software shall set Average TRB Length to \'8\' for control endpoints."——§6.2.3 p454（commit message 引文）',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.hc, size: 19},
  );
  yield* stage.say(
    '另一边 §6.2.3（p453-454 引文）：Average TRB Length 须 > 0，控制端点须设 8。',
    '② 矛盾',
  );
  spec62Chip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(9.7);
  spec62Chip().opacity(0);
  yield* waitFor(0.3);
  yield* stage.say(
    'avg_trb_len=0 对硬件没有意义（它用于带宽计算）——严格 xHC 报 Parameter Error，枚举失败。',
    '② 补丁前',
  );
  yield* flash(panel.ref, 1);
  yield* waitFor(9.2);

  /* ===== 幕③ diff 逐行走读 ===== */
  yield* stage.say(
    '补丁一行（1198 行）：tx_info 写入 EP_AVG_TRB_LENGTH(8)。',
    '③ diff',
  );
  yield* panel.highlight(3);
  yield* waitFor(9.6);
  yield* stage.say(
    '逐行看：deq 两行是上下文；新增行把 avg_trb_len=8 写进 EP0 上下文——§6.2.3 落地。',
    '③ diff',
  );
  yield* panel.highlight(0);
  yield* panel.highlight(1);
  yield* panel.highlight(3);
  yield* waitFor(9.8);

  /* ===== 幕④ 补丁后行为 + 规范收尾 ===== */
  const okChip = makeChip(
    view,
    '补丁后：Address Device 完成事件不再报 CC=5——枚举走通，设备 Default→Address，槽 Enabled→Addressed（§4.3.4 p76-77）。',
    {x: TLx(960), y: TLy(850), w: 1200, tint: C.ok, size: 19},
  );
  yield* stage.say(
    '补丁后：Address Device 不再报参数错，虚拟 xHC 枚举通过——设备 Default→Address。',
    '④ 补丁后',
  );
  okChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(8.6);
  okChip().opacity(0);
  yield* waitFor(0.3);
  const specChip = makeChip(
    view,
    '§4.3.3 步8（spec-43 p76）的 EP0 字段表独缺 Average TRB Length——§6.2.3 专门条款补上：控制端点=8。',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.hc, size: 19},
  );
  yield* stage.say(
    '规范锚点：步8 的 EP0 字段表独缺 Average TRB Length——§6.2.3：控制端点=8。',
    '④ 收尾',
  );
  specChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(10.8);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · f72b9aa821a2（2025-07）',
    rows: [
      {k: '改动', v: 'EP0 tx_info = AVG_TRB_LENGTH(8)'},
      {k: '效果', v: '严格 xHC 枚举通过（CC=5 消失）'},
      {k: '出处', v: '§6.2.3 p454 · stable dabf502ee893'},
    ],
    tint: C.dev,
    w: 760,
    rowSize: 22,
  });
  view.add(sum.node);
  yield* stage.say(
    '对照主线 f72b9aa821a2（stable 件 dabf502ee893 同 diff）——矛盾处以专门条款为准。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(7.7);
    sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.5);
});
