// §4.5 补丁分帧 —— usb: xhci: Fix slot_id resource race conflict
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 2eb03376151b` 取原文，
// 全文落 drafts/patch-45.txt，221 行；面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit 2eb03376151bb8585caa23ed2673583107bb5193（短形 2eb03376151b）
//    Weitao Wang <WeitaoWang-oc@zhaoxin.com>, 2025-08-19,
//    xhci-ring.c / xhci-mem.c / xhci.c / xhci-hub.c / xhci.h（节选前两者）
//  - message 关键句（原文逐字）：
//    "xHC controller may immediately reuse a slot_id after it's disabled,
//     giving it to a new enumerating device before the xhci driver freed
//     all resources related to the disabled device."
//    六步冲突时序（message 原文 1-6 提炼）：
//    1.[A] disable slot → 2.[B] enable slot → 3.[A] disable 完成 →
//    4.[B] enable 完成（slot_id=1）→ 5.[B] xhci_alloc_virt_device 见
//    slot_id 仍被 A 占用，枚举失败 → 6.[A] xhci_free_virt_device 才清
//    xhci->devs[slot_id]
//  - 修复核心（diff 原文，xhci-ring.c 新行号 1611-1614）：disable slot 完成
//    中断里 COMP_SUCCESS 即清 xhci->dcbaa->dev_context_ptrs[slot_id]=0 与
//    xhci->devs[slot_id]=NULL；配套 xhci_free_virt_device 改签名按 dev 指针
//    身份校验后才清（xhci.c 新函数 xhci_disable_and_free_slot 4141-4149）
//  - 规范锚点 evidence/spec-45.txt：§4.5.3.2 Disabled 态唯一允许 Enable Slot
//    Command（L286-288, p87）——完成即回收，驱动簿记与规范语义对齐
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
    section: '§4.5 补丁',
    zh: 'slot_id 竞争',
    en: 'Fix slot_id resource race conflict',
    cite: '2eb03376151b · xhci-ring.c 等',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 2eb03376151b 节选逐字，新行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c + xhci.c · commit 2eb03376151b（节选，新行号）',
    lines: [
      {no: '1608', code: '    if (xhci->quirks & XHCI_EP_LIMIT_QUIRK)'},
      {no: '1609', code: '      /* Delete default control endpoint resources */'},
      {no: '1610', code: '      xhci_free_device_endpoint_resources(xhci, virt_dev, true);'},
      {no: '1611', code: '    if (cmd_comp_code == COMP_SUCCESS) {', kind: 'add'},
      {no: '1612', code: '      xhci->dcbaa->dev_context_ptrs[slot_id] = 0;', kind: 'add'},
      {no: '1613', code: '      xhci->devs[slot_id] = NULL;', kind: 'add'},
      {no: '1614', code: '    }', kind: 'add'},
      {no: '1615', code: '  }'},
      {no: '', code: '—— drivers/usb/host/xhci.c（新函数）——'},
      {no: '4138', code: '    return 0;'},
      {no: '4139', code: '  }'},
      {no: '4141', code: 'int xhci_disable_and_free_slot(struct xhci_hcd *xhci, u32 slot_id)', kind: 'add'},
      {no: '4142', code: '{', kind: 'add'},
      {no: '4143', code: '  struct xhci_virt_device *vdev = xhci->devs[slot_id];', kind: 'add'},
      {no: '4146', code: '  ret = xhci_disable_slot(xhci, slot_id);', kind: 'add'},
      {no: '4147', code: '  xhci_free_virt_device(xhci, vdev, slot_id);', kind: 'add'},
      {no: '4149', code: '}', kind: 'add'},
    ],
  });

  /* ===== 幕① 背景+冲突：xHC 立刻复用 slot_id ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '现场（message 原文）："xHC controller may immediately reuse a',
      'slot_id after it\'s disabled, giving it to a new enumerating device',
      'before the xhci driver freed all resources related to the disabled',
      'device."——六步时序：B 的 enable 完成带回 slot_id=1，却在',
      'xhci_alloc_virt_device 里见该槽仍被 A 占用 → 枚举失败；',
      'A 的 xhci_free_virt_device 这时才清 devs[slot_id]（为时已晚）。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('A 拔、B 枚举——B 败在释放之前。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：完成中断即刻清 + 新函数 ===== */
  yield* stage.say('修复：完成中断即刻清两指针。', '② diff');
  yield* panel.highlight(4);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(14);
  yield* waitFor(0.25);
  yield* waitFor(2.4);

  /* ===== 幕③ 规范收尾 ===== */
  const specChip = makeChip(
    view,
    '"The only command that software is allowed to issue for the slot in this state is the Enable Slot Command."——§4.5.3.2 p87：disable 完成即槽可复用，驱动簿记与规范语义对齐。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 17},
  );
  yield* stage.say('完成即回收——与规范 Disabled 语义对齐。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · 2eb03376151b（2025-08）',
    rows: [
      {k: '改动', v: '完成中断清 devs/DCBAA 两指针'},
      {k: '效果', v: 'slot_id 复用不再撞上延迟释放'},
      {k: '配套', v: 'free_virt_device 按 dev 身份校验'},
    ],
    tint: C.hc,
    w: 780,
    rowSize: 21,
  });
  view.add(sum.node);
  yield* stage.say('竞争窗口关闭——slot_id 即拔即收。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
