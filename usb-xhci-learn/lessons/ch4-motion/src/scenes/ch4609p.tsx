// §4.6.9 补丁分帧 —— xhci: handle stop endpoint command completion with endpoint in running state
// 判据（全部现场 `git -C /Volumes/KernelSrc/linux show 1174d44906d5` 取原文，
// 全文落 drafts/patch-47.txt，50 行；面板行=diff 内容逐字，制表符按 2 空格显示）：
//  - commit 1174d44906d517ddb4f98bbe58a44d4554d0ef90（短形 1174d44906d5）
//    Mathias Nyman <mathias.nyman@linux.intel.com>, 2021-01-29,
//    drivers/usb/host/xhci-ring.c（1 文件 +13/-0，两 hunk：@@ -983,6 +983,7 @@ /
//    @@ -1029,6 +1030,18 @@，均落 xhci_handle_cmd_stop_ep）
//  - message 关键句（原文逐字）：
//    "Handle race where a stop endpoint command fails with "context state error"
//     as hardware hasn't actually started the ring yet after a previous urb
//     cancellation completed and restarted the endpoint."
//    "Flushing the doorbell write that restart the endpoint reduced these cases,
//     but didn't completely resolve them."
//    "Check if the ring is running in the stop endpoint completion handler, and
//     issue a new stop endpoint command in this case."
//  - 修复核心（diff 原文）：xhci_handle_cmd_stop_ep 完成处理的 EP_STATE_RUNNING
//    case——补 `return;` 止住 halted case 串入，新增「环已在跑=上一轮停止竞态败
//    给了重启」分支：原地分配命令（GFP_ATOMIC）、重挂 stop_cmd_timer、重发
//    Stop Endpoint 命令、重敲命令环门铃
//  - 基线在场（对读段 xhci-ring.c L1194-1319）：竞态分支存活至今（后续
//    42b758137601 "Limit Stop Endpoint retries" 加了 100ms 重试上限与 fallthrough，
//    形态微调，语义同源）；热行=race 注释/命令分配/重发命令三处
//  - 规范锚点 evidence/spec-46.txt（§4.6.9 竞态 Note，p122 L1881-1887）：
//    "A possible race condition may occur if software, thinking an endpoint is in the
//     Running state, issues a Stop Endpoint Command however at the same time the xHC
//     asynchronously transitions the endpoint to the Halted or Error state. In this
//     case, a Context State Error may be generated for the command completion."——
//    补丁修的正是这条 Note 的反向形态（EP 实际在 Running、命令却报
//    Context State Error），以及"inspecting the EP State"的驱动侧落地
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
    section: '§4.6.9 补丁',
    zh: '停止竞态假失败',
    en: 'handle stop endpoint command completion with endpoint in running state',
    cite: '1174d44906d5 · xhci-ring.c',
  });
  yield* lanesIn(stage);

  /* diff 面板（中带主位；行内容 = git show 1174d44906d5 节选逐字） */
  const panel: DiffPanelApi = makeDiffPanel(view, {
    x: 0, y: TLy(500), w: 1240, maxVisible: 5,
    title: 'drivers/usb/host/xhci-ring.c · commit 1174d44906d5（节选：EP_STATE_RUNNING 竞态补发）',
    lines: [
      {no: '', code: '—— @@ -983,6 +983,7 @@（新局部变量）——'},
      {no: '', code: '  struct xhci_ep_ctx *ep_ctx;'},
      {no: '', code: '  struct xhci_td *td = NULL;'},
      {no: '986', code: '  struct xhci_command *command;', kind: 'add'},
      {no: '', code: '—— @@ -1029,6 +1030,18 @@（完成处理 case 区）——'},
      {no: '1030', code: '    /* reset ep, reset handler cleans up cancelled tds */'},
      {no: '1031', code: '    xhci_handle_halted_endpoint(xhci, ep, 0, td, reset_type);'},
      {no: '1032', code: '    xhci_stop_watchdog_timer_in_irq(xhci, ep);'},
      {no: '1033', code: '    return;', kind: 'add'},
      {no: '', code: '  case EP_STATE_RUNNING:'},
      {no: '1035', code: '    /* Race, HW handled stop ep cmd before ep was running */', kind: 'add'},
      {no: '1036', code: '    command = xhci_alloc_command(xhci, false, GFP_ATOMIC);', kind: 'add'},
      {no: '1037', code: '    if (!command)', kind: 'add'},
      {no: '1038', code: '      xhci_stop_watchdog_timer_in_irq(xhci, ep);', kind: 'add'},
      {no: '1040', code: '    mod_timer(&ep->stop_cmd_timer,', kind: 'add'},
      {no: '1041', code: '          jiffies + XHCI_STOP_EP_CMD_TIMEOUT * HZ);', kind: 'add'},
      {no: '1042', code: '    xhci_queue_stop_endpoint(xhci, command, slot_id, ep_index, 0);', kind: 'add'},
      {no: '1043', code: '    xhci_ring_cmd_db(xhci);', kind: 'add'},
      {no: '', code: '    return;'},
    ],
  });

  /* ===== 幕① 背景+问题：URB 取消重启竞态 → 假 Context State Error ===== */
  panel.ref().opacity(1);
  yield* waitFor(0.4);
  yield* panel.highlight(3);
  const bgNote = makeNote(
    view,
    [
      '背景（message 原文）：上一轮 URB 取消完成并重启端点后，硬件可能还没真正',
      '开始跑环——此时软件再发 Stop Endpoint，完成码报 "context state error"（假失败）；',
      '重启用的门铃写已做 flush，降低了概率但没根除。',
      '修法：完成处理里检查环是否已在跑——在跑就原地把 Stop Endpoint 命令重发一遍。',
    ],
    {x: TLx(700), y: TLy(265), w: 1100, tint: C.warn},
  );
  yield* stage.say('取消重启竞态：报错是假的，环根本还没停。', '① 冲突');
  bgNote().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  bgNote().opacity(0);
  yield* waitFor(0.25);

  /* ===== 幕② diff 走读：race 分支补发 ===== */
  yield* stage.say('修复：race 注释行起，原地重发命令。', '② diff');
  yield* panel.highlight(10);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  yield* panel.highlight(17);
  yield* waitFor(0.25);
  yield* waitFor(2.4);
  const logicChip = makeChip(
    view,
    '竞态分支：环在跑=假 Context State Error——原地重发命令+重挂 timer+止住 halted case 串入。',
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
    '"…a Context State Error may be generated for the command completion."——§4.6.9 p122 竞态 Note：本补丁=该 Note 的驱动侧实修（反向形态：环实际 Running）；修复块至今存活于基线对读段。',
    {x: TLx(960), y: TLy(872), w: 1720, tint: C.hc, size: 16},
  );
  yield* stage.say('竞态 Note 有了内核直译。', '③ 收尾');
  specChip().opacity(0.95);
  yield* flash(panel.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  specChip().opacity(0);
  yield* waitFor(0.3);

  const sum = makeCard({
    title: '补丁 · 1174d44906d5（2021-01）',
    rows: [
      {k: '改动', v: '完成处理 EP_STATE_RUNNING case（+13/-0）'},
      {k: '动作', v: '重挂 timer+原地重发 Stop Endpoint'},
      {k: '堵漏', v: '假 Context State Error 自愈'},
      {k: '对齐', v: '竞态 Note 的驱动侧实修'},
    ],
    tint: C.hc,
    w: 860,
    rowSize: 20,
  });
  view.add(sum.node);
  yield* stage.say('停止竞态自愈——假失败当场重发。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
