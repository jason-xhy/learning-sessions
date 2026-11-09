// §4.7 补丁分帧 —— xhci: fix null pointer dereference on ring_doorbell_for_active_rings
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show d66eaf9f8950` 取原文，
// 面板行=diff 内容逐字，制表符按 2 空格显示；基线 d9008e061539 行号亲核）：
//  - commit d66eaf9f89502971fddcb0de550b01fa6f409d83（短形 d66eaf9f8950）
//    Oleksij Rempel <linux@rempel-privat.de>, 2013-07-21,
//    drivers/usb/host/xhci-ring.c（2 行：+1/-1）· Cc: stable，回移至 2.6.35+
//    （e9df17eb1408 "Correct assumptions about number of rings per endpoint" 起）
//  - message 关键句（原文逐字）：
//    "in some cases where device is attched to xhci port and do not responding,
//     for example ath9k_htc with stalled firmware, kernel will
//     crash on ring_doorbell_for_active_rings.
//     This patch check if pointer exist before it is used."
//  - 修复核心（diff 原文，xhci-ring.c @@ -434,7 +434,7 @@）：非流端点分支
//    `if (!(list_empty(&ep->ring->td_list)))` →
//    `if (ep->ring && !(list_empty(&ep->ring->td_list)))`——用前判空。
//    修复行=基线 L595，恰在 s47 卡贴码段（xhci-ring.c L585-607，本函数）内
//    ——本片无对读段，卡内贴码即补丁后形态（ch4610p 无对读段同型处置）
//  - 规范锚点 evidence/spec-47.txt（§4.7，p142 L16-20 / p143 L27-33）：
//    "System software rings a Device Context Doorbell after it has inserted
//     work on a Transfer Ring (endpoint/Stream) associated with the respective
//     Device Slot."——「有工作才敲」；内核侧 ring_doorbell_for_active_rings
//    正是此句的镜像（只对非空 td_list 的环敲门铃）；ep->ring 为 NULL 时
//    连「关联的 Transfer Ring」都不存在，判空即把敲铃收回到规范语义内。
//    L27-29 "The xHC internally records all Doorbell Register write references
//     and uses the information to determine if the Command Ring or a Transfer
//     Ring has newly posted work items (TDs)."——敲铃=通知新工作，无环即无通知义务
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
    section: '§4.7 补丁',
    zh: '门铃路径空指针崩溃',
    en: 'fix null pointer dereference on ring_doorbell_for_active_rings',
    cite: 'd66eaf9f8950 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show d66eaf9f8950 逐字，行号=基线 d9008e061539） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit d66eaf9f8950（+1/-1：用前判空）',
    lines: [
      {no: '', code: '—— ring_doorbell_for_active_rings()（基线 L585-L607 · s47 卡贴码段即本函数）——'},
      {no: '593', code: '  /* A ring has pending URBs if its TD list is not empty */'},
      {no: '594', code: '  if (!(ep->ep_state & EP_HAS_STREAMS)) {'},
      {no: '595', code: '    if (!(list_empty(&ep->ring->td_list)))', kind: 'del'},
      {no: '595', code: '    if (ep->ring && !(list_empty(&ep->ring->td_list)))', kind: 'add'},
      {no: '596', code: '      xhci_ring_ep_doorbell(xhci, slot_id, ep_index, 0);'},
      {no: '597', code: '    return;'},
      {no: '598', code: '  }'},
      {no: '', code: '—— 流端点分支（L600-L606）：逐 stream_id 对非空 td_list 的流环敲门铃 ——'},
    ],
  });

  /* ===== 幕① 背景+问题：设备僵死窗口里 ep->ring 为 NULL ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文）：设备挂在 xHCI 口上但不响应——例如 ath9k_htc',
      '固件停摆——内核在 ring_doorbell_for_active_rings 里直接崩溃。',
      '机制：该函数对每个「有挂起 TD」的环敲门铃；但走到非流端点分支时',
      'ep->ring 可能为 NULL（端点尚无环），&ep->ring->td_list 一取址即',
      '空指针解引用。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('敲铃前先问：这个端点有环吗？', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：判空守卫 ===== */
  yield* stage.say('修复：ep->ring 在场才看它的 td_list。', '② diff');
  yield* panel.highlight(3);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(4);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  const logicChip = makeChip(
    view,
    '判空守卫 ep->ring &&：非流分支「有环且有挂起 TD」两个条件都成立才敲门铃；流分支走 stream_info->stream_rings[] 本就带索引边界，无需此守卫。',
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
    '"System software rings a Device Context Doorbell after it has inserted work on a Transfer Ring (endpoint/Stream) associated with the respective Device Slot"——§4.7 p142：敲铃的前提是「已把工作放上某条 Transfer Ring」；ep->ring 为 NULL 时关联的环根本不存在，判空正是把内核敲铃收回到这句规范语义内。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('无环即无通知义务——与规范对齐。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · d66eaf9f8950（2013-07）',
    rows: [
      {k: '改动', v: '非流分支用前判空（+1/-1）'},
      {k: '触发', v: '设备不响应（ath9k_htc 固件停摆）'},
      {k: '对齐', v: '§4.7「有工作才敲」敲铃语义'},
      {k: '堵漏', v: 'ep->ring NULL 不再解引用崩溃'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('门铃路径与规范语义对齐。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
