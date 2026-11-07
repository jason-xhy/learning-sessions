// §4.6.6 补丁分帧 —— usb: xhci: Correct last context entry calculation for Configure Endpoint
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show d6759133e981` 取原文，
// 全文落 drafts/patch-46.txt，144 行；面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit d6759133e9815ef807b17dc752aff8c3771b7444（短形 d6759133e981）
//    Julius Werner <jwerner@chromium.org>, 2014-06-24,
//    drivers/usb/host/xhci.c（51 行：+18/-33）
//  - message 关键句（原文逐字）：
//    "The current XHCI driver recalculates the Context Entries field in the
//     Slot Context on every add_endpoint() and drop_endpoint() call. In the
//     case of drop_endpoint(), it seems to assume that the add_flags will
//     always contain every endpoint for the new configuration, which is not
//     necessarily correct …"
//    "… when all endpoints are dropped, the Context Entries field can be set
//     to 0 (which is invalid and may cause a Parameter Error) or -1 (which is
//     interpreted as 31 and causes the driver to keep using the old,
//     incorrect value)."
//    "The only surefire way to set this field right is to also take all
//     existing endpoints into account, and to force the value to 1 (meaning
//     only EP0 is active) if no other endpoint is found. This patch implements
//     that as a single step in the final check_bandwidth() call and removes
//     the intermediary calculations from add_endpoint() and drop_endpoint()."
//  - 修复核心（diff 原文，xhci.c）：删 add_endpoint/drop_endpoint 内增量
//    last_ctx 维护（drop 旧 1637-1645 / add 旧 1762-1769）；check_bandwidth 新增
//    终点重算循环（新 2723-2734）：i 自 31 下探，找「ring 存活且未 Drop」或「Add
//    置位」的第一个端点；i==1 兜底——LAST_CTX(1) 即「只剩 EP0」
//  - 规范锚点 evidence/spec-46.txt（§4.6.6 执行算法，p110 L1193-1204）：
//    "If all Endpoints are Disabled: Set the Slot State … to Addressed.
//     Set the Context Entries field … to '1'. else … Set the Context Entries
//     field … to the index of the last valid Endpoint Context"——修复循环的
//    i==1 分支与 else 分支正是这两行的内核直译；p111 L1256-1257 Parameter Error
//    判据（"the DCI of an Add Context flag = '1' is greater than the value of
//    Context Entries field"）即坏值 0 的直接代价
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
    section: '§4.6.6 补丁',
    zh: 'Context Entries 算错',
    en: 'Correct last context entry calculation for Configure Endpoint',
    cite: 'd6759133e981 · xhci.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show d6759133e981 节选逐字，add=新行号 del=旧行号） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci.c · commit d6759133e981（节选：删两处增量维护 + 终点重算）',
    lines: [
      {no: '', code: '—— xhci_drop_endpoint()（旧 1637-1644，整块删除）——'},
      {no: '1637', code: '  last_ctx = xhci_last_valid_endpoint(le32_to_cpu(ctrl_ctx->add_flags));', kind: 'del'},
      {no: '1638', code: '  slot_ctx = xhci_get_slot_ctx(xhci, in_ctx);', kind: 'del'},
      {no: '1639', code: '  /* Update the last valid endpoint context, if we deleted the last one */', kind: 'del'},
      {no: '1640', code: '  if ((le32_to_cpu(slot_ctx->dev_info) & LAST_CTX_MASK) >', kind: 'del'},
      {no: '1641', code: '      LAST_CTX(last_ctx)) {', kind: 'del'},
      {no: '1642', code: '    slot_ctx->dev_info &= cpu_to_le32(~LAST_CTX_MASK);', kind: 'del'},
      {no: '1643', code: '    slot_ctx->dev_info |= cpu_to_le32(LAST_CTX(last_ctx));', kind: 'del'},
      {no: '1644', code: '  }', kind: 'del'},
      {no: '', code: '—— xhci_add_endpoint()（旧 1762-1769，同款增量块一并删除）——'},
      {no: '1762', code: '  slot_ctx = xhci_get_slot_ctx(xhci, in_ctx);', kind: 'del'},
      {no: '1763', code: '  /* Update the last valid endpoint context, if we just added one past */', kind: 'del'},
      {no: '', code: '—— xhci_check_bandwidth()（新 2723-2734，终点一步重算）——'},
      {no: '2723', code: '  /* Fix up Context Entries field. Minimum value is EP0 == BIT(1). */', kind: 'add'},
      {no: '2724', code: '  slot_ctx = xhci_get_slot_ctx(xhci, virt_dev->in_ctx);'},
      {no: '2725', code: '  for (i = 31; i >= 1; i--) {', kind: 'add'},
      {no: '2726', code: '    __le32 le32 = cpu_to_le32(BIT(i));', kind: 'add'},
      {no: '2727', code: '', kind: 'add'},
      {no: '2728', code: '    if ((virt_dev->eps[i-1].ring && !(ctrl_ctx->drop_flags & le32))', kind: 'add'},
      {no: '2729', code: '        || (ctrl_ctx->add_flags & le32) || i == 1) {', kind: 'add'},
      {no: '2730', code: '      slot_ctx->dev_info &= cpu_to_le32(~LAST_CTX_MASK);', kind: 'add'},
      {no: '2731', code: '      slot_ctx->dev_info |= cpu_to_le32(LAST_CTX(i));', kind: 'add'},
      {no: '2732', code: '      break;', kind: 'add'},
      {no: '2733', code: '    }', kind: 'add'},
      {no: '2734', code: '  }', kind: 'add'},
    ],
  });

  /* ===== 幕① 背景+问题：增量维护算出两个坏值 ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(0);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文）：内核在每次 add_endpoint()/drop_endpoint() 里',
      '「增量」重算 Slot Context 的 Context Entries 字段——drop 分支假定',
      'add_flags 含新配置的全部端点（实际只含新增端点），且 EP0_FLAG 在',
      '设备生命周期里并非恒置——全 drop 时该字段被算成 0（非法，',
      '触发 Parameter Error）或 -1（按 31 解读，沿用旧错值不改）。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('增量记账两处假设都靠不住。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：删增量 + 终点重算 ===== */
  yield* stage.say('修复：终点一步算，i==1 兜底。', '② diff');
  yield* panel.highlight(12);
  yield* waitFor(0.25);
  yield* waitFor(2.6);
  yield* panel.highlight(16);
  yield* waitFor(0.25);
  yield* waitFor(2.6);
  const logicChip = makeChip(
    view,
    '循环判据：端点 ring 存活且未被 Drop（存量），或 Add 旗标置位（增量）——i 自 31 下探取第一个命中；全不命中则 i==1：LAST_CTX(1)=只剩 EP0。',
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
    '"If all Endpoints are Disabled: … Set the Context Entries field … to \'1\'. else … Set the Context Entries field … to the index of the last valid Endpoint Context"——§4.6.6 p110：修复循环的 i==1 兜底与 else 分支正是这两行的内核直译；坏值 0 的代价即 p111 Parameter Error 判据（Add 的 DCI > Context Entries）。',
    {x: TLx(960), y: TLy(850), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('增量账本退役——终点一次算清。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · d6759133e981（2014-06）',
    rows: [
      {k: '改动', v: '删两处增量 last_ctx 维护（-33）'},
      {k: '新增', v: 'check_bandwidth 终点重算循环（+11）'},
      {k: '对齐', v: 'i==1 兜底 == 规范 Entries=\'1\' 分支'},
      {k: '堵漏', v: '全 drop 不再算出 0 / -1'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('Context Entries 与规范语义对齐。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
