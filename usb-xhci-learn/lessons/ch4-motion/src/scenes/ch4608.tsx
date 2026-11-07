// §4.6.8 Reset Endpoint 复位端点 —— xHCI 1.2b p114-118（R10 批 C；示例 Slot ID=1 / Endpoint ID=2 为课程示例值）
// 判据（evidence/spec-46.txt L1434-1663，判据唯一事实源）：
//  - 目的："The Reset Endpoint Command is issued by software to recover from a halted
//    condition on an endpoint." (L1436-1437, p114)
//  - halted 后四件套："When a Transfer Ring or Stream is halted; the associated endpoint
//    is removed from the xHC's Pipe Schedule, the Doorbell Register for that pipe is
//    disabled, the state of the associated Endpoint Context is set to Halted, and any
//    subsequent packets received for the endpoint will be silently dropped."
//                                                          (L1441-1444, p114)
//  - 非 Halted 拒绝："If the endpoint is not in the Halted state when an Reset Endpoint
//    Command is executed: The xHC shall reject the command and generate a Command
//    Completion Event with the Completion Code set to Context State Error."
//                                                          (L1450-1453, p114)
//  - TSP='0' 分支："Reset the Data Toggle for USB2 devices or the Sequence Number for
//    USB3 devices." (L1459) "Reset any USB2 split transaction state associated with the
//    endpoint." (L1461) "Invalidate any xHC TDs that may be cached, forcing xHC to fetch
//    Transfer TRBs from memory when the pipe transitions from the Stopped to Running
//    state."                                               (L1463-1464, p114)
//  - TSP='1' 分支："The USB2 Data Toggle or the USB3 Sequence Number for the pipe shall
//    be preserved. Maintain any USB2 split transaction state associated with the endpoint.
//    The endpoint shall continue execution by retrying the last transaction the next time
//    the doorbell is rung…"                                (L1474-1479, p115)
//  - 收尾三件："Set the Endpoint Context EP State field to Stopped." (L1481) "Enable the
//    Doorbell Register for the pipe." (L1483) "Generate a Command Completion Event with
//    the Completion Code set to Success." (L1485)；"After the command completes, the
//    Transfer Ring will be reinstated on the xHC's Pipe Schedule the next time its
//    doorbell is rung."                                    (L1486-1487, p115)
//  - reset-a-pipe 全序列 Note（L1503-1525, p115）：Reset Endpoint（TSP='0'）→ TT 后
//    Control/Bulk：CLEAR_TT_BUFFER → 非 Control：ENDPOINT_HALT → Set TR Dequeue
//    Pointer（清端点状态+指向起点 TRB）→ Ring Doorbell
//  - 发行（L1537-1554, p116）："TRB Type = Reset Endpoint Command" (L1542) / "Transfer
//    State Preserve (TSP) = Desired Transfer State result." (L1544) / "Endpoint ID = ID of
//    the target endpoint." (L1546) / "Slot ID = ID of the target Device Slot." (L1548) /
//    "Cycle bit = Command Ring's PCS flag." (L1552) / "Write the Host Controller Doorbell
//    with DB Target = Host Controller Command (DB Stream ID = '0')."  (L1554, p116)
//  - 完成事件（L1555-1598, p116）：槽使能且 Slot State 三态内 → "If the Endpoint State
//    (EP State) field is set to Halted: Set the Endpoint State (EP State) field to Stopped.
//    … Enable the Doorbell register for the endpoint. Completion Code = Success"
//    (L1572-1582)；非 Halted → Context State Error (L1584-1586)；槽态不在三态 →
//    Context State Error (L1588-1590)；槽未使能 → Slot Not Enabled Error (L1592-1594)
//  - 仅限 Halted Note："The Reset Endpoint Command may only be issued to endpoints in
//    the Halted state. If software wishes to reset the Data Toggle or Sequence Number of
//    an endpoint that isn't in the Halted state, then software may issue a Configure
//    Endpoint Command with the Drop and Add bits set for the target endpoint…"
//                                                          (L1620-1624, p117)
//  - Soft Retry（4.6.8.1, L1626-1650, p117）："A Soft Retry may effectively be used to
//    recover from a USB Transaction Error that was due to a temporary error condition (for
//    example, electrical interference caused by a cell phone transmitting too close to a
//    USB cable)." (L1627-1631) 两步："1. Issue a Reset Endpoint Command with the TSP flag
//    set to '1'. This causes the endpoint to advance from the Halted to the Stopped state,
//    but does not change the state of the Data Toggle or Sequence Number, and allows the
//    xHC to continue the retry process another CErr times. 2. Ring the doorbell for the
//    endpoint to initiate up to another CErr retries." (L1640-1645)；禁忌：Isoch 禁用
//    Soft Retry（L1649-1650）；TT 后（Parent Hub Slot ID > '0'）禁用（L1657-1659）；
//    软件须限次防死循环（L1662-1663）
import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeBell,
  makeChip,
  makeNote,
  flash,
  CardApi,
  StageApi,
  RingApi,
} from '../lib/parts';

type AnyRef = {(): any};

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.8'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Reset Endpoint'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'复位端点 · xHCI 规范第 4 章 · p114–118'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1、Endpoint ID=2（Halted 端点）—— 课程示例值'}
        x={0} y={TLy(690)} fontFamily={FONT.sans} fontSize={27} fill={C.faint} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.3);
  t4().opacity(1);
  yield* waitFor(0.3);
  yield* waitFor(0.8);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  t4().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove(); t4().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.6.8',
    zh: 'Reset Endpoint',
    en: 'Reset Endpoint Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.8 p114–118',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); evt.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});

  /* 端点上下文卡（输出侧；本命令的翻转对象） */
  const ep: CardApi = makeCard({
    title: 'Endpoint Context（输出侧）',
    rows: [
      {k: 'EP State', v: 'Halted'},
      {k: 'Doorbell', v: '已禁用'},
      {k: 'Pipe Schedule', v: '已移出'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 21,
  });
  view.add(ep.node);
  ep.ref().position(new Vector2(TLx(230), TLy(270)));
  ep.ref().opacity(1);

  /* ===== ① 目的与 halted 四件套 ===== */
  const q1 = makeChip(
    view,
    '"The Reset Endpoint Command is issued by software to recover from a halted condition on an endpoint. … the associated endpoint is removed from the xHC\'s Pipe Schedule, the Doorbell Register for that pipe is disabled, the state of the associated Endpoint Context is set to Halted, and any subsequent packets received for the endpoint will be silently dropped." — §4.6.8 p114',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('复位端点：把 halted 的管道救回来。', '① / 7');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 前提分支：非 Halted 拒绝 + TSP 两分支 ===== */
  const c2: CardApi = makeCard({
    title: '前提分支（L1450-1485）',
    rows: [
      {k: '非 Halted', v: 'Context State Error'},
      {k: 'TSP=\'0\'', v: '清 Toggle/SeqNum'},
      {k: 'TSP=\'0\'', v: '失效缓存 TD'},
      {k: 'TSP=\'1\'', v: '保留+软重试'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(c2.node);
  yield* stage.say('只有 Halted 才受理；TSP 决定账本清不清。', '② / 7');
  yield* cardIn(c2, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(2.8);
  c2.ref().opacity(0);
  yield* waitFor(0.2);
  c2.ref().remove();
  const q2 = makeChip(
    view,
    '"If the Transfer State Preserve (TSP) flag is \'0\': Reset the Data Toggle for USB2 devices or the Sequence Number for USB3 devices. … Invalidate any xHC TDs that may be cached, forcing xHC to fetch Transfer TRBs from memory …" — §4.6.8 p114',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  q2().opacity(0.95);
  yield* waitFor(3.2);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Reset Endpoint TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Reset EP TRB',
    rows: [
      {k: 'TRB Type', v: 'Reset Endpoint'},
      {k: 'TSP', v: '\'0\'（\'1\'=SoftRetry）'},
      {k: 'Endpoint ID', v: '2（示例）'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Reset Endpoint TRB：TSP 是本命令的性格开关。', '③ / 7');
  yield* cmd.fill(0, 'RstEP', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"Insert a Reset Endpoint Command TRB on the Command Ring … TRB Type = Reset Endpoint Command … Transfer State Preserve (TSP) = Desired Transfer State result. Endpoint ID = ID of the target endpoint. Slot ID = ID of the target Device Slot. … Write the Host Controller Doorbell with DB Target = Host Controller Command (DB Stream ID = \'0\')." — §4.6.8 p116',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 完成事件：Halted→Stopped 三件套 ===== */
  const q4 = makeChip(
    view,
    '"If the Endpoint State (EP State) field is set to Halted: Set the Endpoint State (EP State) field to Stopped. If the Transfer State Preserve (TSP) flag is cleared to \'0\': Set the USB2 Data Toggle or the USB3 Sequence Number for the pipe to \'0\'. Enable the Doorbell register for the endpoint. Completion Code = Success" — §4.6.8 p116',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  yield* stage.say('Halted→Stopped；门铃使能；CC=Success。', '④ / 7');
  ep.row(0)().text('Stopped');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.5);
  ep.row(1)().text('已使能');
  yield* flash(ep.ref, 1);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.4);
  q4().opacity(0.95);
  yield* waitFor(3.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ reset-a-pipe 全序列（与 ch4610 衔接；5 行拆两段分时） ===== */
  const n5a = makeNote(
    view,
    [
      '规范的「复位一根管道」全序列（L1503-1522）：',
      '① Reset Endpoint（TSP=\'0\'）② TT 后 Control/Bulk：CLEAR_TT_BUFFER',
      '③ 非 Control 端点：ENDPOINT_HALT（清设备侧 stall）',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('复位一根管道要五步——本命令只是第一步。', '⑤ / 7');
  n5a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  n5a().opacity(0);
  yield* waitFor(0.2);
  const n5b = makeNote(
    view,
    [
      '④ Set TR Dequeue Pointer（清端点状态+指向起点 TRB）',
      '⑤ Ring Doorbell——第 ④ 步正是下一支命令（§4.6.10）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  n5b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  n5b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ Soft Retry（4.6.8.1）：TSP='1' 的两步用法 ===== */
  const c6: CardApi = makeCard({
    title: 'Soft Retry（§4.6.8.1）',
    rows: [
      {k: '场景', v: '临时性 Trx Error'},
      {k: '两步', v: 'TSP=\'1\'→门铃'},
      {k: '收益', v: '再得 CErr 次重试'},
      {k: '禁忌', v: 'Isoch · TT 后 · 限次'},
    ],
    tint: C.driver,
    w: 460,
    rowSize: 18,
  });
  view.add(c6.node);
  yield* stage.say('Soft Retry：TSP=\'1\'，让 xHC 再试 CErr 次。', '⑥ / 7');
  yield* cardIn(c6, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(2.8);
  c6.ref().opacity(0);
  yield* waitFor(0.2);
  c6.ref().remove();
  const q6 = makeChip(
    view,
    '"Issue a Reset Endpoint Command with the TSP flag set to \'1\'. This causes the endpoint to advance from the Halted to the Stopped state, but does not change the state of the Data Toggle or Sequence Number, and allows the xHC to continue the retry process another CErr times. … Ring the doorbell for the endpoint…" — §4.6.8.1 p117',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q6().opacity(0.95);
  yield* waitFor(3.2);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.8 Reset Endpoint',
    rows: [
      {k: '用途', v: '从 halted 恢复（仅限 Halted 态）'},
      {k: 'TSP=\'0\'', v: '清账本+失效缓存 → 完全重置'},
      {k: 'TSP=\'1\'', v: '保账本 → Soft Retry'},
      {k: '事件', v: 'EP→Stopped · 门铃使能 · Success'},
      {k: '下一支', v: '§4.6.9 Stop Endpoint（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  ep.ref().opacity(0);
  yield* stage.say('管道救回 Stopped——完全重置或软重试，二选一。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
