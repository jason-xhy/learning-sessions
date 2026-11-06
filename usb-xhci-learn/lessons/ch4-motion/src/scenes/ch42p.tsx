// §4.2 补丁分帧 —— usb: xhci: return an error if the host is not halted
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 24d2a690fb83` 取原文，禁凭记忆）：
//  - commit 24d2a690fb83c40913c0b3f38151ae3997a5898f
//    Henry Tseng <henrytseng@qnap.com>, 2026-10-09, drivers/usb/host/xhci.c 1 行
//  - message 关键句（原文逐字）：
//    "xhci_reset() returns 0 when the host is not halted, without ever writing
//     CMD_RESET. Every other path that fails to reset the host returns an
//     error, so callers that check the return value are told the reset
//     succeeded on the one path where it did not happen."
//    "Return -EBUSY when the reset is aborted because the host is not halted."
//  - diff hunk @@ -195,7 +195,7 @@：-return 0; → +return -EBUSY;
//    （上文：if ((state & STS_HALT) == 0) { xhci_warn(... "Host controller not
//      halted, aborting reset.") ...）
//  - 规范锚点 evidence/spec-42.txt（§4.2 p69 切片）："After Chip Hardware Reset
//    wait until the Controller Not Ready (CNR) flag in the USBSTS is '0' before
//    writing any xHC Operational or Runtime registers."（xhci_reset() 即该步代码
//    载体：写 CMD_RESET 并等 CNR=0；谎报成功→调用方在 CNR=1 期间继续写寄存器）
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
    section: '§4.2 补丁',
    zh: '复位要如实报错',
    en: 'return an error if the host is not halted',
    cite: '24d2a690fb83 · xhci.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 24d2a690fb83 hunk 逐字，新文件行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci.c · xhci_reset() · commit 24d2a690fb83（diff 1 行，新行号）',
    lines: [
      {no: '195', code: '  if ((state & STS_HALT) == 0) {'},
      {no: '196', code: '    xhci_warn(xhci, "Host controller not halted, aborting reset.\\n");'},
      {no: '197', code: '  return 0;', kind: 'del'},
      {no: '197', code: '  return -EBUSY;', kind: 'add'},
      {no: '198', code: '  }'},
      {no: '199', code: ''},
      {no: '200', code: '  xhci_dbg_trace(xhci, trace_xhci_dbg_init, "// Reset the HC");'},
    ],
  });
  panel.ref().opacity(1);
  yield* waitFor(0.5);
  yield* panel.highlight(2);

  /* ===== 幕① 背景现场 ===== */
  yield* stage.say(
    '2026 年 10 月修补：xhci_reset() 未 halted 中止复位却 return 0——谎报成功。',
    '① 背景',
  );
  yield* waitFor(10.8);

  /* ===== 幕② 补丁前错误行为 ===== */
  const chainChip = makeChip(
    view,
    '错误链条（message 原文）：未 halted → 复位中止 → 返回 0 → 调用方以为 reset succeeded，继续走初始化流程。',
    {x: TLx(960), y: TLy(850), w: 1100, tint: C.warn, size: 19},
  );
  yield* stage.say(
    '错误链条：未 halted → reset 中止 → 返回 0 → 调用方继续写寄存器——复位根本没发生。',
    '② 补丁前',
  );
  chainChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(9.1);
  chainChip().opacity(0);
  yield* waitFor(0.3);
  yield* stage.say(
    'xhci_reset() 是"复位后等 CNR=0"的载体。谎报成功 → CNR=1 期间接着写——p69 禁止。',
    '② 补丁前',
  );
  yield* flash(panel.ref, 1);
  yield* waitFor(10.8);

  /* ===== 幕③ diff 逐行走读 ===== */
  yield* stage.say(
    '改动一行：return 0 → return -EBUSY。中止就是失败——让调用方拿到错误码。',
    '③ diff',
  );
  yield* panel.highlight(3);
  yield* panel.highlight(2);
  yield* waitFor(6.7);
  yield* stage.say(
    '逐行看：STS_HALT 未置位 → xhci_warn 提示中止复位 → 返回 -EBUSY 而不是 0。',
    '③ diff',
  );
  yield* panel.highlight(0);
  yield* panel.highlight(1);
  yield* waitFor(6.2);

  /* ===== 幕④ 补丁后行为 + 规范收尾 ===== */
  const okChip = makeChip(
    view,
    '"Return -EBUSY when the reset is aborted because the host is not halted."（message 原文）',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.ok, size: 19},
  );
  yield* stage.say(
    '补丁后：未 halted 的复位拿到 -EBUSY，调用方按失败处理——不会再误写寄存器。',
    '④ 补丁后',
  );
  okChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(6.4);
  okChip().opacity(0);
  yield* waitFor(0.3);
  const specChip = makeChip(
    view,
    '"After Chip Hardware Reset wait until the Controller Not Ready (CNR) flag in the USBSTS is \'0\'"——§4.2 p69',
    {x: TLx(960), y: TLy(850), w: 1300, tint: C.hc, size: 19},
  );
  yield* stage.say(
    '规范锚点（p69）：CNR=0 前禁写 Operational/Runtime 寄存器；就绪才 R/S=1。',
    '④ 收尾',
  );
  specChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(12.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · 24d2a690fb83（2026-10）',
    rows: [
      {k: '改动', v: 'return 0 → return -EBUSY'},
      {k: '效果', v: '中止的复位如实报错'},
      {k: '机制', v: '调用方按失败处理'},
    ],
    tint: C.hc,
    w: 700,
    rowSize: 22,
  });
  view.add(sum.node);
  yield* stage.say(
    '对照主线 24d2a690fb83。4.1 补丁管"写全再交"，这条管"如实回话"。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(9.5);
    sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.5);
});
