// §4.11.2.3 Isoch TRB —— xHCI 1.2b p196-198（R12 批 C 中档支）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - TD 构成："An Isoch Transfer Descriptor (TD) shall consist of an Isoch
//    TRB chained to zero or more Normal TRBs. The direction of a data
//    transfer associated with an Isoch Transfer Ring (and the Isoch TD that
//    it defines) depends on the direction defined by the Endpoint Context
//    that it is associated with. Refer to the EP Type field definition in
//    Table 6-9 for the direction encoding."（L395-400, p195-196）
//  - 带宽契约（L401-416, p196）："The USB Endpoint Descriptor bInterval and
//    wMaxPacketSize, and USB SuperSpeed Endpoint Companion Descriptor
//    bMaxBurst and bmAttributes:Mult parameters define the bandwidth
//    requirements of an isochronous pipe. These parameters specify a
//    Quality of Service contract between the device and the host. This
//    contract ensures that during an Interval, up to Max ESIT Payload bytes
//    may be transferred … The xHCI defines more generic versions of these
//    parameters in the Endpoint Context; Interval, Max Packet Size, Max
//    Burst Size, and Mult fields. System software is responsible for
//    converting the endpoint type and speed dependent values … to the
//    generic values utilized by the xHCI."
//  - 单 Interval（L417-421, p196）："An Isoch TD defines an isochronous data
//    transfer that will occur during a single Interval. An Isoch TD consists
//    of one or more TRBs, where the first TRB of TD is always an Isoch TRB.
//    If the data associated with an Isoch TD is not contiguous or larger
//    than 64K bytes, then additional Normal TRBs may be chained to the
//    initial Isoch TRB, forming a multi-TRB Isoch TD."
//  - 消费节奏（L422-425, p196）："The xHC shall consume one Isoch TD each
//    Interval on an Isoch Transfer Ring. To ensure streaming data, system
//    software is required to place at least one Isoch TD on the Transfer
//    Ring each Interval, prior to the Isochronous Scheduling Threshold
//    (refer to IST, section 4.14.2.1)."
//  - OUT 空环（L426-430, p196）："For Isoch OUT endpoints, if the associated
//    Transfer Ring is empty, then no Isoch transfers shall be scheduled over
//    the USB during the intervening Intervals, the endpoint shall be removed
//    from the xHC’s Pipe Schedule, and a Ring Underrun Event shall be
//    generated for the EPs’ Transfer Ring to flag the condition."
//  - IN 空环（L431-437, p196）："For Isoch IN endpoints, if the Transfer Ring
//    is empty, then any Isoch data that may have been transferred during the
//    intervening Interval(s) shall be lost, the endpoint shall be removed
//    from the xHC’s Pipe Schedule, and a Ring Overrun Event shall be
//    generated … In either case, the endpoint shall remain in the Running
//    state. The xHC shall remove the endpoint from the Isoch Pipe Schedule
//    and restart the Isochronous transfers the next time the endpoint’s
//    doorbell is rung."；Note（L438-439）：只在首个检出空环的 Interval 生成
//    一次；L448-449："An Isoch Transfer Ring will be reinstated on the xHC’s
//    Pipe Schedule the next time its doorbell is rung."
//  - MSE（L450-455, p196）："If the xHC is unable meet an Isochronous
//    deadline, a Missed Service Error Event shall be generated for the
//    endpoint."；Note（L452-453）：Event Ring 满等情形可不逐期限生成；
//    "The Ring Underrun, Ring Overrun, and Missed Service Error Events
//    shall utilize a Transfer Event TRB format."
//  - Frame ID/SIA（L456-464, p196）："The Isoch TRB Frame ID field may be
//    used to specify the Service Interval Boundary that an Isoch transfer
//    may start on. If the Start Isoch ASAP (SIA) flag is cleared to ‘0’ …
//    the xHC shall schedule the Isoch TD within one Service Interval of the
//    next match of the Frame ID field with the Frame Index portion (bits
//    13:3) of the Microframe Index (MFINDEX) register. … The range of
//    possible values for the Frame ID field are 0 to 2047 … If the Start
//    Isoch ASAP (SIA) flag is set to ‘1’ … the Frame ID field is ignored
//    and the Isoch TD is scheduled as soon as possible."
//  - Service Interval 对齐（L465-469, p196）："Service Interval Boundaries
//    are aligned. That is, if Interval = ‘1’, then the Service Interval is
//    2 microframes long and begins when the low order bit of the MFINDEX
//    register = 0. If Interval = ‘2’, then the Service Interval is 4
//    microframes long and begins when the low order two bits of the MFINDEX
//    register = 0, and so on."
//  - TBC/TLBPC（L470-495, p196-197）："The Isoch TRB Transfer Burst Count
//    (TBC) and Transfer Last Burst Packet Count (TLBPC) fields may be used
//    by the xHC to identify the exact number of packets that will comprise
//    an Isoch TD without having to read in the complete TD. The xHC may use
//    this information to better manage its periodic schedules."；ETC/ETE
//    （L474-478）；公式 TBC = ROUNDUP ( TDPC / ( Max Burst Size + 1 ) ) - 1
//    （L482）；TLBPC（L486-495）：IsochBurstResiduePackets = TDPC MODULUS
//    ( Max Burst Size + 1 )，TLBPC = IF (IsochBurstResiduePackets == 0)
//    THEN Max Burst Size ELSE IsochBurstResiduePackets - 1
//  - Notes（L497-502, p197）："The ETC shall not be enabled by an xHC
//    implementation if the Large ESIT Payload Capability (LEC = ‘1’) is not
//    supported."；"If LEC = ‘1’ and ETC = ‘0’, then the largest Isoch
//    Transfer that the TBC and TLBPC fields can describe is 64 KB. If the
//    Max ESIT Payload indicates a value greater than 64 KB, then the TBC and
//    TLBPC fields shall be used as a hint, rather than to compute an
//    explicit Isoch TD packet count."
import {makeScene2D, Txt} from '@motion-canvas/2d';
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
  makeCellStrip,
  flash,
  CardApi,
  StageApi,
  RingApi,
  CellStripApi,
  BellApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.11.2.3'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Isoch TRB'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'等时传输 TRB · xHCI 规范第 4 章 · p196–198'}
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
    section: '§4.11.2.3',
    zh: 'Isoch TRB',
    en: '等时传输 TRB · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.2.3 p196–198',
  });
  yield* lanesIn(stage);

  /* 事件环 + 等时传输环 + Interval 标尺 + 门铃 */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const iso: RingApi = makeRing(view, {
    y: 655, zh: '等时传输环', en: '',
    note: '每 Interval 一支 Isoch TD', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const ruler: CellStripApi = makeCellStrip(view, {
    x: TLx(760), y: TLy(560), n: 7, w: 88, h: 56, gap: 8, tint: C.hc,
    labels: ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6'],
  });
  const bell: BellApi = makeBell(view, {x: TLx(1680), y: TLy(565)});
  evt.group().opacity(1);
  iso.group().opacity(1);
  ruler.group().opacity(1);
  yield* waitFor(0.2);
  iso.markLink();
  yield* waitFor(0.25);

  /* ===== ① Isoch TD 构成 ===== */
  const q1 = makeChip(
    view,
    '"An Isoch Transfer Descriptor (TD) shall consist of an Isoch TRB chained to zero or more Normal TRBs. The direction of a data transfer associated with an Isoch Transfer Ring (and the Isoch TD that it defines) depends on the direction defined by the Endpoint Context that it is associated with." — §4.11.2.3 p195-196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 14},
  );
  yield* stage.say('Isoch TD=Isoch TRB 链 0..n 支 Normal。', '① / 9');
  q1().opacity(0.95);
  yield* iso.fill(0, 'Iso', C.driver);
  yield* iso.fill(1, 'N', C.driver);
  yield* iso.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(2.1);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 带宽契约 ===== */
  const q2 = makeChip(
    view,
    '"These parameters specify a Quality of Service contract between the device and the host. This contract ensures that during an Interval, up to Max ESIT Payload bytes may be transferred between the host and the device. … The xHCI defines more generic versions of these parameters in the Endpoint Context; Interval, Max Packet Size, Max Burst Size, and Mult fields. System software is responsible for converting the endpoint type and speed dependent values … to the generic values utilized by the xHCI." — §4.11.2.3 p196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 13},
  );
  yield* stage.say('描述符四参=QoS 契约，软件换算后写入。', '② / 9');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.3);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 单 Interval + 消费节奏 ===== */
  const q3 = makeChip(
    view,
    '"An Isoch TD defines an isochronous data transfer that will occur during a single Interval. … If the data associated with an Isoch TD is not contiguous or larger than 64K bytes, then additional Normal TRBs may be chained to the initial Isoch TRB, forming a multi-TRB Isoch TD. The xHC shall consume one Isoch TD each Interval on an Isoch Transfer Ring. To ensure streaming data, system software is required to place at least one Isoch TD on the Transfer Ring each Interval, prior to the Isochronous Scheduling Threshold (refer to IST, section 4.14.2.1)." — §4.11.2.3 p196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  yield* stage.say('一个 TD 只活一个 Interval；须赶在 IST 前挂环。', '③ / 9');
  q3().opacity(0.95);
  yield* iso.deqTo(0, 0.4);
  yield* iso.consume(0);
  yield* iso.deqTo(1, 0.4);
  ruler.value[0]().text('TD0');
  yield* flash(ruler.cell[0], 1);
  yield* iso.fill(2, 'Iso', C.driver);
  yield* iso.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ OUT/IN 空环双事件 ===== */
  const q4 = makeChip(
    view,
    '"For Isoch OUT endpoints, if the associated Transfer Ring is empty, then no Isoch transfers shall be scheduled over the USB during the intervening Intervals, the endpoint shall be removed from the xHC’s Pipe Schedule, and a Ring Underrun Event shall be generated … For Isoch IN endpoints, if the Transfer Ring is empty, then any Isoch data that may have been transferred during the intervening Interval(s) shall be lost … and a Ring Overrun Event shall be generated … In either case, the endpoint shall remain in the Running state." — §4.11.2.3 p196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 12},
  );
  yield* stage.say('OUT 空环报 Underrun；IN 空环报 Overrun。', '④ / 9');
  q4().opacity(0.95);
  yield* iso.consume(1);
  yield* iso.deqTo(2, 0.4);
  yield* iso.consume(2);
  yield* iso.deqTo(3, 0.4);
  yield* evt.fill(0, 'Underrun', C.warn);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(1.3);
  yield* evt.fill(1, 'Overrun', C.warn);
  yield* evt.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(1.3);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 门铃复启 ===== */
  const n5 = makeNote(
    view,
    [
      '两事件只报首个空环 Interval（Note L438-439）；端点保持 Running，',
      '移出 Pipe Schedule；复启=下次敲该端点门铃（L435-437/L448-449），',
      '环重回 Pipe Schedule 继续等时流。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('复启=下次敲门铃，环重回调度表。', '⑤ / 9');
  bell.ref().opacity(1);
  n5().opacity(0.9);
  yield* bell.ring('1');
  yield* iso.fill(3, 'Iso', C.driver);
  yield* iso.enqTo(4);
  yield* waitFor(0.3);
  yield* waitFor(1.7);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ MSE + 三事件格式 ===== */
  const q6 = makeChip(
    view,
    '"If the xHC is unable meet an Isochronous deadline, a Missed Service Error Event shall be generated for the endpoint. … The Ring Underrun, Ring Overrun, and Missed Service Error Events shall utilize a Transfer Event TRB format." — §4.11.2.3 p196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 15},
  );
  yield* stage.say('赶不上期限=MSE；三事件都走事件环。', '⑥ / 9');
  q6().opacity(0.95);
  yield* evt.fill(2, 'MSE', C.warn);
  yield* evt.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ Frame ID 与 SIA ===== */
  const q7 = makeChip(
    view,
    '"The Isoch TRB Frame ID field may be used to specify the Service Interval Boundary that an Isoch transfer may start on. If the Start Isoch ASAP (SIA) flag is cleared to ‘0’ in the Isoch TRB, the xHC shall schedule the Isoch TD within one Service Interval of the next match of the Frame ID field with the Frame Index portion (bits 13:3) of the Microframe Index (MFINDEX) register. … The range of possible values for the Frame ID field are 0 to 2047 … If the Start Isoch ASAP (SIA) flag is set to ‘1’ in the Isoch TRB, the Frame ID field is ignored and the Isoch TD is scheduled as soon as possible." — §4.11.2.3 p196',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 12},
  );
  yield* stage.say('Frame ID 定起点（SIA=0）；SIA=1 则尽快。', '⑦ / 9');
  q7().opacity(0.95);
  ruler.value[1]().text('FID');
  yield* flash(ruler.cell[1], 1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ Service Interval 对齐 ===== */
  const n8 = makeNote(
    view,
    [
      '边界对齐（L465-469）：Interval=‘1’ → 服务间隔 2 微帧，MFINDEX',
      '低位=0 时起；Interval=‘2’ → 4 微帧，低两位=0 时起；依此类推。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('服务间隔按 MFINDEX 低位对齐。', '⑧ / 9');
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ TBC/TLBPC 公式与 ETC/LEC ===== */
  const f9: CardApi = makeCard({
    title: 'TBC / TLBPC（L482-495）',
    rows: [
      {k: 'TBC', v: 'ROUNDUP(TDPC/(MaxBurst+1))−1'},
      {k: 'TLBPC', v: '余 0→MaxBurst；否则 余−1'},
      {k: 'ETC+ETE=1', v: 'TBC 上限 32（TD Size 弃用）'},
      {k: '否则', v: 'TBC 上限 3（TD Size 有效）'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(f9.node);
  const n9 = makeNote(
    view,
    [
      '用途（L470-473）：xHC 不必读完整 TD 即知确切包数，利于周期',
      '调度管理。Note（L497-502）：LEC 不支持则禁开 ETC；LEC=1 且',
      'ETC=0 时上限 64KB，超限则两字段仅作提示不作计数。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('TBC/TLBPC 预告包数，公式软件侧算好。', '⑨ / 9');
  yield* cardIn(f9, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(1.5);
  f9.ref().opacity(0);
  yield* waitFor(0.2);
  f9.ref().remove();
  n9().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n9().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.2.3 Isoch TRB',
    rows: [
      {k: '构成', v: 'Isoch TRB 链 0..n Normal（首 TRB 恒 Isoch）'},
      {k: '节奏', v: '每 Interval 消费一个 TD · IST 前挂环'},
      {k: '空环', v: 'OUT=Underrun / IN=Overrun · 保持 Running'},
      {k: '调度', v: 'Frame ID×MFINDEX 或 SIA · TBC/TLBPC 预告'},
      {k: '下一支', v: '§4.11.2.4 TD Size'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  iso.group().opacity(0);
  evt.group().opacity(0);
  ruler.group().opacity(0);
  bell.ref().opacity(0);
  yield* stage.say('等时讲透——下一支：TD Size 记账。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(2.8);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
