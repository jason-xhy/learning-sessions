// §4.4 补丁分帧 —— usb: xhci: Fix memory leak in xhci_disable_slot()
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show c1c8550e7040` 取原文，
// 全文落 drafts/patch-44.txt，62 行；面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit c1c8550e70401159184130a1afc6261db01fc0ce（短形 c1c8550e7040）
//    Zilin Guan <zilin@seu.edu.cn>, 2026-03-05, drivers/usb/host/xhci.c
//    2 hunks：@@ -4146,7 +4146,7 @@ 与 @@ -4154,7 +4154,7 @@（各 1 行替换）
//  - message 关键句（原文逐字）：
//    "xhci_alloc_command() allocates a command structure and, when the
//     second argument is true, also allocates a completion structure."
//    "Currently, the error handling path in xhci_disable_slot() only frees
//     the command structure using kfree(), causing the completion structure
//     to leak."
//    "Use xhci_free_command() instead of kfree(). xhci_free_command()
//     correctly frees both the command structure and the associated
//     completion structure."
//  - 佐证："Since the command structure is allocated with zero-initialization,
//    command->in_ctx is NULL and will not be erroneously freed by
//    xhci_free_command()."
//  - 规范锚点 evidence/spec-44.txt（§4.4 p81 切片）：detach 后软件须发
//    Disable Slot Command（L5-8）——错误路径同样要干净退出（工程表述）
import {makeScene2D} from '@motion-canvas/2d';
import {Vector2, waitFor} from '@motion-canvas/core';
import {C, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeNote,
  makeDiffPanel,
  flash,
  DiffPanelApi,
  StageApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.4 补丁',
    zh: 'Disable Slot 泄漏',
    en: 'Fix memory leak in xhci_disable_slot()',
    cite: 'c1c8550e7040 · xhci.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show c1c8550e7040 两 hunk 逐字，新行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci.c · xhci_disable_slot() · commit c1c8550e7040（两处错误路径，新行号）',
    lines: [
      {no: '4146', code: '    if (state == 0xffffffff || (xhci->xhc_state & XHCI_STATE_DYING) ||'},
      {no: '4147', code: '        (xhci->xhc_state & XHCI_STATE_HALTED)) {'},
      {no: '4148', code: '      spin_unlock_irqrestore(&xhci->lock, flags);'},
      {no: '4149', code: '      kfree(command);', kind: 'del'},
      {no: '4149', code: '      xhci_free_command(xhci, command);', kind: 'add'},
      {no: '4150', code: '      return -ENODEV;'},
      {no: '4151', code: '  }'},
      {no: '4153', code: '  ret = xhci_queue_slot_control(xhci, command, TRB_DISABLE_SLOT,'},
      {no: '4154', code: '        slot_id);'},
      {no: '4155', code: '    if (ret) {'},
      {no: '4156', code: '      spin_unlock_irqrestore(&xhci->lock, flags);'},
      {no: '4157', code: '      kfree(command);', kind: 'del'},
      {no: '4157', code: '      xhci_free_command(xhci, command);', kind: 'add'},
      {no: '4158', code: '      return ret;'},
      {no: '4159', code: '  }'},
    ],
  });

  /* ===== 幕① 背景+问题：成对分配 vs 半截释放 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '现场（message 原文）："xhci_alloc_command() allocates a command',
      'structure and, when the second argument is true, also allocates a',
      'completion structure."——命令+completion 成对分配；',
      '错误路径却 "only frees the command structure using kfree(),',
      'causing the completion structure to leak."',
    ],
    {x: TLx(700), y: TLy(275), w: 1100, tint: C.warn},
  );
  yield* stage.say('静态分析：错误路径只 kfree——泄漏。', '① 问题');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读（窗口滚动到第二处） ===== */
  yield* stage.say('修复：kfree → xhci_free_command。', '② diff');
  yield* panel.highlight(4);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(11);
  yield* waitFor(0.25);
  yield* waitFor(2.4);

  /* ===== 幕③ 规范收尾 ===== */
  const specChip = makeChip(
    view,
    '"After the detection of a detach, system software shall disable the Device Slot associated with the port by issuing a Disable Slot Command for the affected slot."——§4.4 p81；零初始化兜底 in_ctx=NULL 不会被误放（message 原文）。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 17},
  );
  yield* stage.say('成对释放——错误路径不再漏。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · c1c8550e7040（2026-03）',
    rows: [
      {k: '改动', v: '错误路径 kfree → xhci_free_command ×2'},
      {k: '效果', v: 'command+completion 成对释放'},
      {k: '出处', v: '§4.4 p81 · xhci_disable_slot()'},
    ],
    tint: C.hc,
    w: 760,
    rowSize: 21,
  });
  view.add(sum.node);
  yield* stage.say('双结构齐放——泄漏关闭。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
