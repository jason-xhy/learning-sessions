// §4.11.2 Transfer TRBs 导语 + 4.11.2.1 Normal TRB —— xHCI 1.2b p190-191
// （R12 批 C 小档支）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - TD 定义："A Work Item on a Transfer Ring is called a Transfer
//    Descriptor (TD) and is comprised of one or more Transfer TRB data
//    structures. This section describes the transfer related TRBs. System
//    software is the producer of all Transfer TRBs and the xHC is the
//    consumer."（L94-98, p190）
//  - 完成事件条件："Upon completion of a Transfer TRB one of 4 conditions
//    shall cause an associated Transfer Event to be generated on the Event
//    Ring: 1. The Interrupt On Completion (IOC) flag is set. 2. A Short
//    Packet has been received and the Interrupt-on Short Packet (ISP) flag
//    is set. 3. An error occurred while executing a Transfer TRB. In each
//    case, the Completion code will indicate either Success or the cause of
//    the Transfer Event generation."（L99-109, p190；规范原文明记"4
//    conditions"、切片列明三条枚举）
//  - IOC 惯例："The IOC flag will typically only be set (‘1’) in the last
//    TRB of Transaction Descriptor (TD) to minimize Event TRB generation and
//    system interrupts."（L110-111, p190）
//  - 环数："Each Endpoint Context defines one Transfer Ring if the
//    MaxPStreams field = '0' or multiple Transfer Rings if the MaxPStreams
//    field > '0'. Table 6-91 defines the TRB Types found on a Transfer Ring.
//    Table 6-92 defines the allowable Transfer Ring TRB Types as function of
//    endpoint type."（L112-115, p190；两表全表归 landing 分析卡，不逐行进片）
//  - 完成判定唯一通道 Note："Software shall only utilize Transfer Events
//    to determine TRB completions. Software shall not infer TRB completions
//    based on Frame ID, MFINDEX, or other information."（L116-118, p190）
//  - Normal TRB 用途："A Normal TRB is used in several ways; exclusively on
//    Bulk and Interrupt Transfer Rings for normal and Scatter/Gather
//    operations, to define additional data buffers for Scatter/Gather
//    operations in Isoch and for Data stage TDs. The direction of a data
//    transfer associated with a Normal TRB depends on the direction defined by
//    the Endpoint Context that it is associated with, or the preceding Data
//    Stage TRB in the TRB Ring associated with a Control endpoint."
//    （L122-127, p190-191：方向由端点上下文或控制端点上前序 Data Stage
//    TRB 定义——"depends on the direction defined by"）
//  - Chain 位："The Chain bit (CH field in Figure 6-8) may be set to ‘1’ in
//    Normal, Data Stage, Status Stage, and Isoch TRBs to form multi-TRB
//    Transfer Descriptors. Chaining allows scatter/gather operations.
//    Chaining can be used by system software to concatenate Pages of virtual
//    memory, or to concatenate byte aligned data."（L128-131, p191）
import {makeScene2D, Txt} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeChip,
  makeNote,
  flash,
  CardApi,
  StageApi,
  RingApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.11.2 / §4.11.2.1'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={96} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Transfer TRBs · Normal TRB'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'传输 TRB 总则与 Normal 型 · xHCI 规范第 4 章 · p190–191'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(0.6);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.11.2',
    zh: 'Transfer TRBs',
    en: '传输 TRB 总则 · Normal TRB · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.2 p190–191',
  });
  yield* lanesIn(stage);

  /* 事件环 + 传输环 */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写完成事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '软件写 Transfer TRB', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  evt.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  evt.markLink(); xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① TD 定义与生产消费 ===== */
  const q1 = makeChip(
    view,
    '"A Work Item on a Transfer Ring is called a Transfer Descriptor (TD) and is comprised of one or more Transfer TRB data structures. … System software is the producer of all Transfer TRBs and the xHC is the consumer." — §4.11.2 p190',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  yield* stage.say('传输环工作项=TD：一至多支 Transfer TRB。', '① / 6');
  q1().opacity(0.95);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.1);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 完成事件三条件 ===== */
  const q2 = makeChip(
    view,
    '"Upon completion of a Transfer TRB one of 4 conditions shall cause an associated Transfer Event to be generated on the Event Ring: 1. The Interrupt On Completion (IOC) flag is set. 2. A Short Packet has been received and the Interrupt-on Short Packet (ISP) flag is set. 3. An error occurred while executing a Transfer TRB. In each case, the Completion code will indicate either Success or the cause of the Transfer Event generation." — §4.11.2 p190',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 14},
  );
  yield* stage.say('完成即对表：IOC、短包+ISP、错误三条件。', '② / 6');
  q2().opacity(0.95);
  yield* xfer.fill(0, 'N IOC=1', C.driver);
  yield* xfer.enqTo(1);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* evt.fill(0, 'TE', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(1.7);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ IOC 惯例 + MaxPStreams 环数 ===== */
  const q3 = makeChip(
    view,
    '"The IOC flag will typically only be set (‘1’) in the last TRB of Transaction Descriptor (TD) to minimize Event TRB generation and system interrupts." — §4.11.2 p190',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  const n3 = makeNote(
    view,
    [
      '环数（L112-115）：MaxPStreams=‘0’ 时每端点上下文一条传输环，',
      '>‘0’ 时多条（Streams，§4.12）。环上合法 TRB 型查 Table 6-91/6-92',
      '（全表归 landing 分析卡，不逐行进片）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('IOC 惯设 TD 末位；流端点带多条环。', '③ / 6');
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.4);
  q3().opacity(0);
  yield* waitFor(0.2);
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 完成判定唯一通道 ===== */
  const q4 = makeChip(
    view,
    '"Note: Software shall only utilize Transfer Events to determine TRB completions. Software shall not infer TRB completions based on Frame ID, MFINDEX, or other information." — §4.11.2 Note p190',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  yield* stage.say('完成判定只认 Transfer Event 一条通道。', '④ / 6');
  q4().opacity(0.95);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(2.1);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Normal TRB 用途与方向 ===== */
  const q5 = makeChip(
    view,
    '"A Normal TRB is used in several ways; exclusively on Bulk and Interrupt Transfer Rings for normal and Scatter/Gather operations, to define additional data buffers for Scatter/Gather operations in Isoch and for Data stage TDs. The direction of a data transfer associated with a Normal TRB depends on the direction defined by the Endpoint Context that it is associated with, or the preceding Data Stage TRB … associated with a Control endpoint." — §4.11.2.1 p190-191',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 14},
  );
  yield* stage.say('Normal TRB：Bulk/Interrupt 主力+散聚补位。', '⑤ / 6');
  q5().opacity(0.95);
  yield* xfer.fill(1, 'N', C.driver);
  yield* xfer.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ Chain 位串链 ===== */
  const q6 = makeChip(
    view,
    '"The Chain bit (CH field in Figure 6-8) may be set to ‘1’ in Normal, Data Stage, Status Stage, and Isoch TRBs to form multi-TRB Transfer Descriptors. Chaining allows scatter/gather operations. Chaining can be used by system software to concatenate Pages of virtual memory, or to concatenate byte aligned data." — §4.11.2.1 p191',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 14},
  );
  yield* stage.say('Chain 位串多 TRB 成 TD：拼页/拼字节。', '⑥ / 6');
  q6().opacity(0.95);
  yield* xfer.fill(2, 'N CH=1', C.driver);
  yield* xfer.fill(3, 'N CH=1', C.driver);
  yield* xfer.fill(4, 'N IOC', C.dev);
  yield* xfer.enqTo(5);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.2 Transfer TRBs',
    rows: [
      {k: 'TD', v: '工作项=一至多支 Transfer TRB'},
      {k: '事件条件', v: 'IOC / 短包+ISP / 错误（CC 指明因由）'},
      {k: '判定通道', v: '只认 Transfer Event，禁 MFINDEX 推断'},
      {k: 'Normal', v: 'Bulk/Interrupt 专用+散聚；方向随端点/前序'},
      {k: '下一支', v: '§4.11.2.2 控制三阶段 TRB'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  evt.group().opacity(0);
  yield* stage.say('总则讲透——下一支：控制三阶段。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(2.7);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
