// §4.9.2 补丁分帧 —— xhci: Fix failure to detect ring expansion need.
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show b234c70fefa7` 取原文，
// 面板行=diff 内容逐字，制表符按 2 空格显示；基线 d9008e061539 行号亲核）：
//  - commit b234c70fefa7532d34ebee104de64cc16f1b21e4（短形 b234c70fefa7）
//    Mathias Nyman <mathias.nyman@linux.intel.com>, 2024-03-05,
//    drivers/usb/host/xhci-ring.c（8 行：+7/-1）·
//    Reported-by/Tested-by: Chris Yokum（TotalPhase）·
//    Fixes: f5af638f0609（环扩容量计算）· Cc: stable # v6.5+
//  - message 关键句（原文逐字）：
//    "Ring expansion checker may incorrectly assume a completely full ring
//     is empty, missing the need for expansion.
//     This is due to a special empty ring case where the dequeue ends up
//     ahead of the enqueue pointer. This is seen when enqueued TRBs fill up
//     exactly a segment, with enqueue then pointing to the end link TRB.
//     Once those TRBs are handled the dequeue pointer will follow the link
//     TRB and end up pointing to the first entry on the next segment, past
//     the enqueue.
//     This same enqueue - dequeue condition can be true if a ring is full,
//     with enqueue ending on that last link TRB before the dequeue pointer
//     on the next segment."
//    场景句："queuing several ~510 small URBs via usbfs in one go before
//     a single one is handled"
//  - 修复核心（diff 原文，xhci-ring.c @@ -326,7 +326,13 @@，
//    xhci_ring_expansion_needed）：
//    `if (trbs_past_seg <= 0)` → 7 行注释 + `if (trbs_past_seg < 0)`
//    ——恰好填满段（trbs_past_seg==0）即扩，不再等 TRB 伸进下一段；
//    把「满环」与「空环特例」（enq 卡 Link TRB 而 deq 已前进）在边界处
//    解耦。对读段=xhci-ring.c L386-L426（本函数，基线即含此补丁）；
//    调用方=xh0902 卡贴码段 xhci_ring_expansion（xhci-mem.c L413-449）
//  - 规范锚点 evidence/spec-49.txt（§4.9.2，p156 L375-L383）：
//    "To prevent overruns, software shall determine when the Ring is full.
//     The ring is defined as 'full' if advancing the Enqueue Pointer will
//     make it equal to the Dequeue Pointer. Software shall take Link TRBs
//     into account when evaluating the full condition. ... If the Enqueue
//     Pointer is pointing at a Link TRB, then software shall compare the
//     Ring Segment Pointer value in the Link TRB with the Dequeue Pointer."
//    ——满环判定必须把 Link TRB 计入：恰好填满段的 enq 正停在 Link TRB 上，
//    「再进一格就撞 deq」即满；旧检查在这一格上提前返回「不用扩」。
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
    section: '§4.9.2 补丁',
    zh: '环满被误判空环',
    en: 'Fix failure to detect ring expansion need',
    cite: 'b234c70fefa7 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show b234c70fefa7 逐字，行号=基线 d9008e061539） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit b234c70fefa7（+7/-1：边界条件 <= → <）',
    lines: [
      {no: '', code: '—— xhci_ring_expansion_needed()（基线 L386-L426 · 调用方=xh0902 卡 xhci_ring_expansion）——'},
      {no: '394', code: '  enq_used = ring->enqueue - ring->enq_seg->trbs;'},
      {no: '396', code: '  /* how many trbs will be queued past the enqueue segment? */'},
      {no: '397', code: '  trbs_past_seg = enq_used + num_trbs - (TRBS_PER_SEGMENT - 1);'},
      {no: '405', code: '  if (trbs_past_seg <= 0)', kind: 'del'},
      {no: '399', code: '  /*', kind: 'add'},
      {no: '400', code: '   * Consider expanding the ring already if num_trbs fills the current', kind: 'add'},
      {no: '401', code: '   * segment (i.e. trbs_past_seg == 0), not only when num_trbs goes into', kind: 'add'},
      {no: '402', code: '   * the next segment. Avoids confusing full ring with special empty ring', kind: 'add'},
      {no: '403', code: '   * case below', kind: 'add'},
      {no: '404', code: '   */', kind: 'add'},
      {no: '405', code: '  if (trbs_past_seg < 0)', kind: 'add'},
      {no: '406', code: '    return 0;'},
      {no: '408', code: '  /* Empty ring special case, enqueue stuck on link trb while dequeue advanced */'},
    ],
  });

  /* ===== 幕① 背景+问题：恰满段的两个同形状态 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文）：usbfs 一次排 ~510 个小 URB、一个还没被处理——',
      'TRBs 恰好填满一段，enq 停在段尾 Link TRB；deq 处理完跟随 Link 跳到',
      '下一段首，越过 enq。「deq 在 enq 前面」这个形态，空环特例与完全',
      '满环同形——扩容检查器把满环当成了空环：漏扩容。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('满环和空环，长成了一个样子。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：边界条件收紧一格 ===== */
  yield* stage.say('修复：恰好填满（==0）就扩，不等伸进下一段。', '② diff');
  yield* panel.highlight(4);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(11);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  const logicChip = makeChip(
    view,
    '边界条件 <= 0 → < 0（+7 行注释）：trbs_past_seg==0 即「这批 TRB 恰好填满当前段」——此时 enq 将停在 Link TRB 上，先扩环，不再让满环走到下方空环特例（L408-410）去撞同形判定。',
    {x: TLx(960), y: TLy(200), w: 1720, tint: C.hc, size: 17},
  );
  logicChip().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  logicChip().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕③ 规范收尾 ===== */
  const specChip = makeChip(
    view,
    '"To prevent overruns, software shall determine when the Ring is full. The ring is defined as \'full\' if advancing the Enqueue Pointer will make it equal to the Dequeue Pointer. Software shall take Link TRBs into account when evaluating the full condition. If the Enqueue Pointer is pointing at a Link TRB, then software shall compare the Ring Segment Pointer value in the Link TRB with the Dequeue Pointer."——§4.9.2 p156 L375-383。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('满判定须计 Link TRB——规范早已写明。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · b234c70fefa7（2024-03）',
    rows: [
      {k: '改动', v: '边界 <= 0 → < 0（+7 行注释）'},
      {k: '触发', v: '~510 小 URB 一次排入（usbfs）'},
      {k: '对齐', v: '§4.9.2 满判定须计 Link TRB'},
      {k: '堵漏', v: '恰满段不再被当空环漏扩容'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('扩容检查与满环判定对齐。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
