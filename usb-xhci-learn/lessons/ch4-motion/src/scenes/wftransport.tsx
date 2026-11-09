// R12 批 B 全链片：wf-传输全链 —— 门铃(§4.7)→Transfer Ring fetch(§4.9.2)→TRB 执行
// (§4.10.1)→Transfer Event 写事件环(§4.10.1/§4.10.3)→IOC 回执驱动收流(§4.10.4)
// 五站跨节叙事（R12-SPEC §6①；R11 批 C wfhaltrst 站-泳道推进形态）
// 判据（evidence/spec-47.txt / spec-49.txt / spec-410.txt，判据唯一事实源）：
//  - 站① 门铃（spec-47 L7-10, p142）："System software "rings" a doorbell by
//    writing a Doorbell Register with the appropriate value in the DB Target
//    field."；上环后敲（L16-19）："System software rings a Device Context Doorbell
//    after it has inserted work on a Transfer Ring (endpoint/Stream) associated
//    with the respective Device Slot. The DB Target and DB Stream ID fields of a
//    Device Context Doorbell register is used to identify which Transfer Ring of a
//    device has been modified."
//  - 站② fetch（spec-49 L200-207, p153）："The consumer maintains a Consumer Cycle
//    State (CCS) flag, which it compares to the Cycle bit in TRBs that it fetches.
//    If the CCS flag is equal to the value of the TRB Cycle bit, then the consumer
//    owns the TRB pointed to by the Dequeue Pointer and may process it."；环空判
//    定（L191-193）："As it fetches TRBs from a Transfer Ring it checks for a Cycle
//    bit transition. If a transition detected, the ring is empty."
//  - 站③ TRB 执行（spec-410 L12-14, p170）："When the data transfer associated with
//    a Transfer TRB is completed, the xHC will evaluate the completion status of
//    the transfer and the Transfer TRB flags to determine whether to generate a
//    Transfer Event TRB for the Transfer TRB."
//  - 站④ 事件入环（spec-410 L9-10, p170）："Transfer Ring completions are queued
//    on Event Rings as Transfer Event TRBs for the host."；事件定位（L56-62,
//    p171）："A Transfer Event TRB identifies the location of the TRB that
//    "generated the event" (the Device ID, Endpoint ID, and address of the source
//    TRB). … The location information also allows the host to update its copy of
//    the Dequeue Pointer for the Transfer Ring that generated the event."；spec-49
//    L186-190, p153："The xHC employs the Event Ring to report the current value of
//    the Dequeue Pointer to system software. Each Transfer Event placed on the
//    Event Ring points to the Transfer TRB that generated it."
//  - 站⑤ IOC 回执收流（spec-410 L15-17, p170）："If upon transfer completion of a
//    TRB the Interrupt On Completion (IOC) flag is set, the xHC shall generate a
//    Transfer Event TRB. Note the generation of an Event TRB always generates an
//    interrupt to the host."；TD 回执（L885-889, p187）："it must set the IOC flag
//    in the last TRB of TD. The event that the IOC in the last TRB generates
//    informs software that last TRB of the TD is complete … and that the space on
//    the Transfer Ring that the TD consumed may be reclaimed."
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
  makeBus,
  flash,
  CardApi,
  StageApi,
  RingApi,
  BusApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'wf · 全链'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'传输全链五站'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Ring Doorbell → Ring fetch → TRB 执行 → Transfer Event → IOC 回执'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'§4.7 + §4.9.2 + §4.10.1/.3/.4 跨节叙事 · 规范 p142-188'}
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
    section: '全链',
    zh: '传输全链五站',
    en: 'Doorbell → fetch → execute → event → IOC receipt',
    cite: '§4.7+§4.9+§4.10 p142–188',
  });
  yield* lanesIn(stage);

  /* 事件环 + 传输环 + 门铃 + 总线 */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); xfer.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  const bus: BusApi = makeBus(view, {x: TLx(1840), y0: TLy(830), y1: TLy(660)});

  /* 站牌（左带，随站推进） */
  const stops: CardApi = makeCard({
    title: '五站站牌',
    rows: [
      {k: '① 门铃', v: '§4.7 上环后敲 DB'},
      {k: '② 取环', v: '§4.9.2 CCS=Cycle 取 TRB'},
      {k: '③ 执行', v: '§4.10.1 完成评估'},
      {k: '④ 入环', v: '事件定位+Deq 副本'},
      {k: '⑤ 回执', v: '§4.10.4 IOC 收流'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(stops.node);
  stops.ref().position(new Vector2(TLx(230), TLy(300)));
  stops.ref().opacity(1);
  yield* waitFor(0.3);

  /* ===== 站① 门铃：上环→敲 DB1 ===== */
  const q1 = makeChip(
    view,
    '"System software rings a Device Context Doorbell after it has inserted work on a Transfer Ring (endpoint/Stream) associated with the respective Device Slot. The DB Target and DB Stream ID fields of a Device Context Doorbell register is used to identify which Transfer Ring of a device has been modified." — §4.7 p142',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  yield* stage.say('站① 门铃：先上 TD 再写 DB Target，告知哪条环变了。', '① / 5');
  q1().opacity(0.95);
  yield* xfer.fill(0, 'N IOC=1', C.driver);
  yield* xfer.fill(1, 'N c1', C.driver);
  yield* xfer.enqTo(2);
  yield* bell.ring('1');
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== 站② fetch：CCS 对 Cycle ===== */
  const q2 = makeChip(
    view,
    '"The consumer maintains a Consumer Cycle State (CCS) flag, which it compares to the Cycle bit in TRBs that it fetches. If the CCS flag is equal to the value of the TRB Cycle bit, then the consumer owns the TRB pointed to by the Dequeue Pointer and may process it." — §4.9.2 p153',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  const n2 = makeNote(
    view,
    [
      '取环三条（L191-207）：fetch 逐 TRB 查 Cycle 转换，转换即环空；',
      'CCS=Cycle 位才拥有该 TRB 可执行；Deq 遇 Link TRB 跳段续取。',
      '门铃通知 xHC 来这条环取新工作。',
    ],
    {x: TLx(1200), y: TLy(310), w: 1180, tint: C.hc},
  );
  yield* stage.say('站② 取环：CCS 对上 Cycle 位，TRB 归 xHC 执行。', '② / 5');
  q2().opacity(0.95);
  yield* xfer.deqTo(0, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== 站③ TRB 执行：完成评估 ===== */
  const q3 = makeChip(
    view,
    '"When the data transfer associated with a Transfer TRB is completed, the xHC will evaluate the completion status of the transfer and the Transfer TRB flags to determine whether to generate a Transfer Event TRB for the Transfer TRB." — §4.10.1 p170',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.dev, size: 16},
  );
  yield* stage.say('站③ 执行：数据搬完，评估状态与标志位。', '③ / 5');
  q3().opacity(0.95);
  yield* xfer.consume(0);
  yield* bus.send('DATA', true, C.dev);
  yield* xfer.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== 站④ 事件入环：定位+Deq 副本回填 ===== */
  const q4 = makeChip(
    view,
    '"Transfer Ring completions are queued on Event Rings as Transfer Event TRBs for the host. … A Transfer Event TRB identifies the location of the TRB that "generated the event" (the Device ID, Endpoint ID, and address of the source TRB). … The location information also allows the host to update its copy of the Dequeue Pointer for the Transfer Ring that generated the event." — §4.10.1 p170-171',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 15},
  );
  const n4 = makeNote(
    view,
    [
      'spec-49 L186-190：每个 Transfer Event 都指向生成它的 Transfer',
      'TRB——软件把事件里的指针值当作 xHC Dequeue Pointer 的最新值，',
      '据此推进自己的 Deq 副本，环空间方能回收复用。',
    ],
    {x: TLx(1200), y: TLy(310), w: 1180, tint: C.evt},
  );
  yield* stage.say('站④ 入环：完成进事件环，指针即 Deq 最新值。', '④ / 5');
  q4().opacity(0.95);
  yield* evt.fill(0, 'TE', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q4().opacity(0);
  yield* waitFor(0.2);
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== 站⑤ IOC 回执驱动收流 ===== */
  const q5 = makeChip(
    view,
    '"If upon transfer completion of a TRB the Interrupt On Completion (IOC) flag is set, the xHC shall generate a Transfer Event TRB. Note the generation of an Event TRB always generates an interrupt to the host." — §4.10.1 p170',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  const n5 = makeNote(
    view,
    [
      '回执收流（§4.10.4 L885-889）：链尾 IOC 的事件=TD 完成凭证——',
      '软件读走事件（evt 消费）、写回 ERDP，传输环空间随之回收。',
      '中断把软件叫来收流，五站闭环，下个 TD 再从站①开始。',
    ],
    {x: TLx(1200), y: TLy(310), w: 1180, tint: C.warn},
  );
  yield* stage.say('站⑤ 回执：IOC 事件+中断叫软件来收流，环空间回收。', '⑤ / 5');
  q5().opacity(0.95);
  yield* xfer.consume(1);
  yield* xfer.deqTo(2, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q5().opacity(0);
  yield* waitFor(0.2);
  n5().opacity(0.9);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口：五站全景 ===== */
  const sum: CardApi = makeCard({
    title: '全链 · 传输五站',
    rows: [
      {k: '①→②', v: 'Ring Doorbell(4.7) → CCS 取环(4.9.2)'},
      {k: '③→④', v: '执行评估(4.10.1) → 事件入环+Deq 副本'},
      {k: '⑤', v: 'IOC 回执(4.10.4) → 收流+环回收'},
      {k: '细讲', v: 'xh0700/xh0902/xh1001-04 各站专片'},
    ],
    tint: C.hc,
    w: 960,
    rowSize: 19,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  stops.ref().opacity(0);
  yield* stage.say('五站闭环：门铃起、回执收——各站专片见 xh 系列。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(4.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
