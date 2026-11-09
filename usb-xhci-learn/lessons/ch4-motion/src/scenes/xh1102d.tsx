// §4.11.2.4 TD Size —— xHCI 1.2b p198-199（R12 批 C 小档支：公式链+算例）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - 定义（L505-509, p198）："The TD Size field of a TRB defines a number
//    of packets that remain to be transferred for a TD after processing all
//    Max Packet Sized packets in the current TRB and all previous TRBs.
//    This field may be used by the xHC to estimate the size of a TD without
//    requiring it to read ahead TRBs to the end of the TD. The TD Size field
//    shall be initialized by software in Transfer TRBs, with a value
//    calculated for a TRB using the following method:"
//  - TD Packet Count（L511-514）："TD Packet Count defines the number of
//    packets that must be transferred to complete a TD. TD Packet count =
//    ROUNDUP( TD Transfer Size / Max Packet Size ) where, ROUNDUP (x) rounds
//    fractional x up, away from 0 (zero), to the nearest integer value."
//  - 变量定义（L516-518）："x is the number of Transfer TRBs in a TD. n is
//    the index of a Transfer TRB in a TD, where n = 1 for the first Transfer
//    TRB of a TD."
//  - 逐 TRB 记账（L519-528）："TRB Transfer Length Sum (n) is the sum of the
//    TRB Transfer Length fields in TRBs 1 through n. Packets Transferred
//    (n) defines the number of Max Packet Sized packets that have been
//    transferred for the TD, up to and including the data described by TRB
//    (n). Packets Transferred (n) = ROUNDDOWN( TRB Transfer Length Sum (n) /
//    Max Packet Size ) TRB Residue (n) defines the number of bytes remaining
//    in TRB (n)'s buffer after processing all Max Packet Sized packets in
//    the current TRB and all previous TRBs of a TD. TRB Residue (n) = TRB
//    Transfer Length Sum (n) - (Max Packet Size * Packets Transferred (n) )"
//  - 语义+末位置 0（L529-533, p198-199）："For all Transfer TRBs except the
//    last in a TD, TD Size identifies the number of packets that still need
//    to be scheduled to complete this TD after sending TRB Residue (n) + the
//    data for TRBs n+1 through x. The value of the TD Size in the last
//    Transfer TRB of a TD (TD Size (x)) shall be cleared to ‘0’ to
//    explicitly indicate that it is the last Transfer TRB of the TD."
//  - 5 位封顶（L539-546, p199）："Since the TD Size field is only 5 bits, its
//    value shall be forced to 31 if the number of packets to be scheduled
//    is greater than 31. For all Transfer TRBs of a TD except the last
//    (n = 1 through x-1): TD Size (n) = IF ( TD Packet Count - Packets
//    Transferred (n) > 31, then 31, else TD Packet Count - Packets
//    Transferred (n) ) For the last Transfer TRB of a TD: TD Size (x) = 0."
//  - 短包 Note（L547-549）："If the TRB Residue for the last Transfer TRB
//    (TRB Residue (x)) is greater than 0, then a terminating Short Packet
//    shall be generated for the TD. Also note that the TRB Residue value is
//    always less than Max Packet Size."
//  - ETE Note（L550-551）："If ETE = ‘1’, then the TD Size is not available
//    in Isoch TRBs. Refer to section 6.4.1.3."
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
      <Txt ref={t1} text={'§4.11.2.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'TD Size'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'TD Size 剩余包数记账 · xHCI 规范第 4 章 · p198–199'}
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
    section: '§4.11.2.4',
    zh: 'TD Size',
    en: 'TD Size 剩余包数记账 · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.2.4 p198–199',
  });
  yield* lanesIn(stage);

  /* 传输环（三 TRB 算例载体） */
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '算例 TD：三支 TRB', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① 定义与用途 ===== */
  const q1 = makeChip(
    view,
    '"The TD Size field of a TRB defines a number of packets that remain to be transferred for a TD after processing all Max Packet Sized packets in the current TRB and all previous TRBs. This field may be used by the xHC to estimate the size of a TD without requiring it to read ahead TRBs to the end of the TD." — §4.11.2.4 p198',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 14},
  );
  yield* stage.say('TD Size=剩余待调度包数，xHC 免读全 TD。', '① / 5');
  q1().opacity(0.95);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(2.9);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 包数公式 + 逐 TRB 记账 ===== */
  const q2a = makeChip(
    view,
    '"TD Packet Count defines the number of packets that must be transferred to complete a TD. TD Packet count = ROUNDUP( TD Transfer Size / Max Packet Size ) where, ROUNDUP (x) rounds fractional x up, away from 0 (zero), to the nearest integer value." — §4.11.2.4 p198',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 15},
  );
  const q2b = makeChip(
    view,
    '"Packets Transferred (n) = ROUNDDOWN( TRB Transfer Length Sum (n) / Max Packet Size ) … TRB Residue (n) = TRB Transfer Length Sum (n) - (Max Packet Size * Packets Transferred (n) )" — §4.11.2.4 p198',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  const n2 = makeNote(
    view,
    [
      '记账量（L516-528）：x=TD 内 TRB 数；n=TRB 序号（首支 n=1）；',
      'Length Sum(n)=TRB 1..n 的 Length 之和；Residue 恒小于最大包。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('包数=ROUNDUP；逐支记账 PT 与 Residue。', '② / 5');
  q2a().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  q2a().opacity(0);
  yield* waitFor(0.2);
  q2b().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  q2b().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 末位置 0 + 5 位封顶 ===== */
  const q3a = makeChip(
    view,
    '"The value of the TD Size in the last Transfer TRB of a TD (TD Size (x)) shall be cleared to ‘0’ to explicitly indicate that it is the last Transfer TRB of the TD." — §4.11.2.4 p198-199',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 16},
  );
  const q3b = makeChip(
    view,
    '"Since the TD Size field is only 5 bits, its value shall be forced to 31 if the number of packets to be scheduled is greater than 31. For all Transfer TRBs of a TD except the last (n = 1 through x-1): TD Size (n) = IF ( TD Packet Count - Packets Transferred (n) > 31, then 31, else TD Packet Count - Packets Transferred (n) )" — §4.11.2.4 p199',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 14},
  );
  yield* stage.say('末位 TD Size=0；超 31 封顶 31。', '③ / 5');
  q3a().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.1);
  q3a().opacity(0);
  yield* waitFor(0.2);
  q3b().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q3b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 短包与 ETE 注记 ===== */
  const n4 = makeNote(
    view,
    [
      'Note（L547-549）：末位 Residue>0 → TD 收尾生成 Short Packet；',
      'Residue 恒小于最大包。ETE=‘1’ 时 Isoch TRB 无 TD Size 字段',
      '（L550-551，§6.4.1.3）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('末位余量>0 即收尾短包；Isoch 有例外。', '④ / 5');
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.1);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 算例走读 ===== */
  const ex: CardApi = makeCard({
    title: '算例：MaxPacket=1024 · 总量 5120B（TDPC=5）',
    rows: [
      {k: 'TRB1 len=2048', v: 'PT=2 · TDSize=3'},
      {k: 'TRB2 len=2048', v: 'PT=4 · TDSize=1'},
      {k: 'TRB3 len=1024', v: 'PT=5 · TDSize=0（末位）'},
    ],
    tint: C.dev,
    w: 560,
    rowSize: 17,
  });
  view.add(ex.node);
  yield* stage.say('算例：三 TRB 5120B，逐支算 PT 与 TDSize。', '⑤ / 5');
  yield* xfer.fill(0, 'len 2048', C.driver);
  yield* xfer.fill(1, 'len 2048', C.driver);
  yield* xfer.fill(2, 'len 1024', C.dev);
  yield* xfer.enqTo(3);
  yield* cardIn(ex, new Vector2(TLx(740), TLy(295)));
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  ex.ref().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.2.4 TD Size',
    rows: [
      {k: '定义', v: '处理完本 TRB 后 TD 还剩的包数'},
      {k: '公式', v: 'TDSize(n)=TDPC−PT(n)，超 31 封顶 31'},
      {k: '末位', v: 'TDSize(x)=0 显式收口；Residue>0 短包'},
      {k: '例外', v: 'ETE=‘1’ 时 Isoch TRB 无此字段'},
      {k: '下一支', v: '§4.11.2.5 Frame ID'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  yield* stage.say('记账讲透——下一支：Frame ID 与重同步。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
