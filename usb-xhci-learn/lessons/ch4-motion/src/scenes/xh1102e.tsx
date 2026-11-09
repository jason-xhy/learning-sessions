// §4.11.2.5 Frame ID + 4.11.2.5.1 Frame ID ESIT Rules + 4.11.2.5.2
// Resynchronization —— xHCI 1.2b p199-201（R12 批 C 中档支；R12-SPEC §3
// 原估巨头档系 TOC 误判 4.11.2 五型各一小节，实际 .2.2 三型合一——本支
// 按 .5/.5.1/.5.2 实际小节边界落中档，偏差记档）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - Frame ID 定义（L555-557, p199）："The Frame ID field of an Isoch TD
//    identifies the target frame that the Interval associated with this
//    Isochronous Transfer Descriptor will start on. The Frame ID is valid
//    only if the Start Isoch ASAP (SIA) field of an Isoch TRB equals ‘0’."
//  - End Frame ID（L558-562）："Software shall not schedule an Isoch TD with
//    a Frame ID value that is greater than the End Frame ID, where: End
//    Frame ID = (Frame Index of the current MFINDEX register value + 895
//    ms.) MOD 2048 The End Frame ID limitation allows the xHC to properly
//    manage Isoch TDs when a Missed Service Error occurs."
//  - MSE 丢 TD Note（L563-569）："When a Missed Service Error occurs, the
//    Isoch TD that was supposed to be transferred during the missed service
//    interval is dropped, and the xHC is expected resynchronize the Isoch
//    pipe by advancing to the next Isoch TD for the next Interval. If the
//    Frame ID of an Isoch TD is used to identify the specific Frame
//    associated with a TRB of an Isoch TD, then the scheduling limit on the
//    Frame ID (that is, the Valid Frame Window) allows the xHC to
//    unambiguously determine if an Isoch TD should be skipped or executed."
//  - Start Frame ID（L570-576）："Software should not schedule an Isoch TD
//    with a Frame ID value that is less than the Start Frame ID, where:
//    Start Frame ID = (Frame Index of the current MFINDEX register value +
//    IST + 1) MOD 2048 where IST shall be rounded up to the nearest frame
//    boundary if it is defined in microframes The Start Frame ID limitation
//    allows the xHC sufficient time to fetch and schedule Isoch TDs."；
//    Note（L583-584）：Frame ID 按 2048 取模（MFINDEX Frame Index 位宽）
//  - CFC=1（L585-599, p199-200）："If the Contiguous Frame ID Capability is
//    supported (CFC = ‘1’), then the xHC shall match the Frame ID in every
//    Isoch TD with SIA = ‘0’ against the Frame Index of the MFINDEX
//    register. This rule ensures resynchronization of Isoch TDs even if
//    some are dropped due to Missed Service Errors or Stopping the
//    endpoint. Note that the xHC may advance through Isoch TDs faster than
//    the Service Interval rate to resynchronize the Isoch data flow."；
//    软件宜全 TD 设 Frame ID（L592-593）；留空窗：软件指定 Frame ID 间隔，
//    xHC 暂停数据流直到匹配（L594-597）；"Contiguous Frame ID Capability
//    support (CFC = ‘1’) is mandatory for all xHCI 1.1 and xHCI 1.2
//    compliant xHCI implementations."（L598-599）
//  - CFC=0（L600-616, p200）："If the Contiguous Frame ID Capability is not
//    supported (CFC = ‘0’), then the xHC may start the Isoch data flow when
//    the MFINDEX Frame Index matches the Frame ID value specified in the
//    first Isoch TD and ignore the Frame ID fields in subsequent Isoch TDs
//    until the data flow is terminated … A Missed Service Error does not
//    terminate an Isoch data flow, therefore … the xHCI will not be able to
//    determine whether the subsequent Isoch TDs are within a Valid Frame
//    Window and properly resynchronize the Isoch data flow."；Note（L610-
//    616）：CFC=0 时软件只在首 TD 设 Frame ID、后续 TD 须 SIA=‘1’；制造空
//    窗须先让环空触发 Overrun/Underrun，再指定起始 Frame ID 并敲门铃
//  - 4.11.2.5.1 ESIT 规则（L617-625, p200）：ESIT≥1ms 时 Frame ID 须落
//    ESIT 边界——"For example, if the Interval of an endpoint is 4 ms. (32
//    microframes) the valid Frame ID values for the endpoint are 0, 4, 8,
//    12, and so on."；TD 在该 Frame 起的 ESIT 内传输（L632-637）："the TD
//    in the example above with the Frame ID value of 4, may be transferred
//    over the USB any time during Frames 4, 5, 6, or 7, where the xHC
//    ensures that the data transfer will not take place before Frame 4
//    begins or after Frame 7 ends."
//  - ESIT<1ms（L638-657, p200）："All Isoch TDs transferred within the same
//    Frame (1 ms.) period shall have the same Frame ID value. So, depending
//    upon the value of the Interval field, up to 8 consecutive Isoch TDs
//    may have the same Frame ID value. For example, if the ESIT of an
//    endpoint is 250 µs. (2 microframes) then groups of 4 consecutive Isoch
//    TD shall have the same Frame ID value 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2,
//    2, and so on."；微帧对齐：首个挂环 TD 在帧首 ESIT 起传，帧号翻转处
//    的 TD 在下一帧首 ESIT 起传（L647-653）；Note（L658-659）：非帧首 ESIT
//    起流规范不支持
//  - 4.11.2.5.2 Resynchronization（L660-674, p200-201）："An Isoch Transfer
//    Ring is “synchronized” when the xHC is able to successfully transfer
//    the data associated with an Isoch TD during the correct ESIT. If the
//    Frame ID value of an Isoch TD is not valid for a target ESIT, then
//    synchronization is lost. … If a Missed Service Error occurs then the
//    xHC is required to advance through a Transfer Ring until it is
//    “resynchronized” or the ring is exhausted. The data associated with
//    Isoch TDs that are skipped over while attempting to resynchronize a
//    pipe is not moved, however a Missed Service Error should be generated
//    for every skipped Isoch TD. The xHC shall not drop Events associated
//    with TRBs as it attempts to resynchronize an Isoch pipe, for example,
//    if IOC = ‘1’ in a Link TRB then it returns Success, if IOC = ‘1’ in an
//    Event Data or Normal TRB then it returns Missed Service Error, etc."
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
  makeCellStrip,
  flash,
  CardApi,
  StageApi,
  RingApi,
  CellStripApi,
} from '../lib/parts';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.11.2.5'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Frame ID · ESIT · Resynchronization'} x={0} y={TLy(490)}
        fontFamily={FONT.sans} fontSize={68} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'帧号定位与等时重同步 · xHCI 规范第 4 章 · p199–201'}
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
    section: '§4.11.2.5',
    zh: 'Frame ID 与重同步',
    en: 'Frame ID · ESIT Rules · Resynchronization · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.2.5 p199–201',
  });
  yield* lanesIn(stage);

  /* 事件环 + 等时环 + 帧号标尺 */
  const evt: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写事件', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  const iso: RingApi = makeRing(view, {
    y: 655, zh: '等时传输环', en: '',
    note: '逐 TD 帧号对表', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const ruler: CellStripApi = makeCellStrip(view, {
    x: TLx(760), y: TLy(560), n: 7, w: 88, h: 56, gap: 8, tint: C.hc,
    labels: ['F0', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6'],
  });
  evt.group().opacity(1);
  iso.group().opacity(1);
  ruler.group().opacity(1);
  yield* waitFor(0.2);
  iso.markLink();
  yield* waitFor(0.25);

  /* ===== ① Frame ID 定义 + 上限 End ===== */
  const q1 = makeChip(
    view,
    '"The Frame ID field of an Isoch TD identifies the target frame that the Interval associated with this Isochronous Transfer Descriptor will start on. The Frame ID is valid only if the Start Isoch ASAP (SIA) field of an Isoch TRB equals ‘0’." — §4.11.2.5 p199',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 15},
  );
  const q1b = makeChip(
    view,
    '"Software shall not schedule an Isoch TD with a Frame ID value that is greater than the End Frame ID, where: End Frame ID = (Frame Index of the current MFINDEX register value + 895 ms.) MOD 2048 The End Frame ID limitation allows the xHC to properly manage Isoch TDs when a Missed Service Error occurs." — §4.11.2.5 p199',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 14},
  );
  yield* stage.say('Frame ID 定起始帧；上限=+895ms MOD 2048。', '① / 7');
  q1().opacity(0.95);
  yield* iso.fill(0, 'Iso FID=4', C.driver);
  yield* iso.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q1().opacity(0);
  yield* waitFor(0.2);
  q1b().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  q1b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 下限 Start Frame ID + 取模口径 ===== */
  const q2 = makeChip(
    view,
    '"Software should not schedule an Isoch TD with a Frame ID value that is less than the Start Frame ID, where: Start Frame ID = (Frame Index of the current MFINDEX register value + IST + 1) MOD 2048 where IST shall be rounded up to the nearest frame boundary if it is defined in microframes The Start Frame ID limitation allows the xHC sufficient time to fetch and schedule Isoch TDs." — §4.11.2.5 p199',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  const n2 = makeNote(
    view,
    [
      '取模口径（Note L583-584）：Frame ID 按 2048 取模——即 MFINDEX',
      '寄存器 Frame Index 部分的位宽（Figure 4-21）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('下限 Start=MFINDEX+IST+1，给足取数时间。', '② / 7');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 有效帧窗 + CFC=1 逐 TD 对表 ===== */
  const n3a = makeNote(
    view,
    [
      'MSE Note（L563-569）：错过的 Isoch TD 被丢弃，xHC 推进到下一',
      'Interval 的下一支 Isoch TD 以重同步。Frame ID 上这个调度窗',
      '（Valid Frame Window）让 xHC 能无歧义判定 TD 该跳过还是执行。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  const q3b = makeChip(
    view,
    '"If the Contiguous Frame ID Capability is supported (CFC = ‘1’), then the xHC shall match the Frame ID in every Isoch TD with SIA = ‘0’ against the Frame Index of the MFINDEX register. This rule ensures resynchronization of Isoch TDs even if some are dropped due to Missed Service Errors or Stopping the endpoint. … Contiguous Frame ID Capability support (CFC = ‘1’) is mandatory for all xHCI 1.1 and xHCI 1.2 compliant xHCI implementations." — §4.11.2.5 p199-200',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 13},
  );
  yield* stage.say('有效帧窗判跳过；CFC=1 逐 TD 对帧号。', '③ / 7');
  n3a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  n3a().opacity(0);
  yield* waitFor(0.2);
  q3b().opacity(0.95);
  yield* iso.fill(1, 'Iso FID=5', C.driver);
  yield* iso.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q3b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ CFC=1 快进重同步与留窗 ===== */
  const n4 = makeNote(
    view,
    [
      '重同步可提速（L589-591）：xHC 可快于服务间隔逐 TD 推进；软件',
      '留空窗=指定 Frame ID 间隔，xHC 暂停数据流直到帧号匹配',
      '（L594-597）；软件宜对全部 TD 设 Frame ID（L592-593）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('重同步可快进；留窗靠帧号间隔实现。', '④ / 7');
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ CFC=0 只认首 TD ===== */
  const n5 = makeNote(
    view,
    [
      'CFC=‘0’（L600-609）：xHC 只在首 TD 帧号匹配时起流，随后忽略',
      '各 TD 的 Frame ID；MSE 不终止数据流→事后无法判定后续 TD 是否',
      '在有效窗内。Note（L610-616）：软件只在首 TD 设帧号、后续全',
      'SIA=‘1’；留空窗须先让环空触发 Overrun/Underrun 再重启。',
    ],
    {x: TLx(1300), y: TLy(310), w: 1040, tint: C.warn},
  );
  yield* stage.say('CFC=0：只认首 TD 帧号，断流须环空重启。', '⑤ / 7');
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 4.11.2.5.1 ESIT≥1ms 边界 ===== */
  const q6 = makeChip(
    view,
    '"For endpoints with an ESIT greater than or equal to 1 ms. … Software shall specify a Frame ID value that begins on an ESIT Boundary. For example, if the Interval of an endpoint is 4 ms. (32 microframes) the valid Frame ID values for the endpoint are 0, 4, 8, 12, and so on. … The xHC shall transfer an Isoch TD during the ESIT that starts on Frame boundary specified by the Frame ID. For example, the TD in the example above with the Frame ID value of 4, may be transferred over the USB any time during Frames 4, 5, 6, or 7, where the xHC ensures that the data transfer will not take place before Frame 4 begins or after Frame 7 ends." — §4.11.2.5.1 p200',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 12},
  );
  yield* stage.say('ESIT≥1ms：帧号须落 ESIT 边界（0/4/8…）。', '⑥ / 7');
  q6().opacity(0.95);
  ruler.value[0]().text('F4');
  yield* flash(ruler.cell[0], 1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ ESIT<1ms 同帧同号 + 重同步收束 ===== */
  const n7a = makeNote(
    view,
    [
      'ESIT<1ms（L640-645）：同一 1ms 帧内全部 TD 同帧号，至多 8 连',
      'TD 同值；ESIT=250µs 时四支一组：0,0,0,0 / 1,1,1,1 / 2,2,2,2。',
      '微帧对齐（L647-657）：帧号翻转处的 TD 在下一帧首 ESIT 起传。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  const n7b = makeNote(
    view,
    [
      '4.11.2.5.2（L661-674）：帧号对不上目标 ESIT=失同步；MSE 后 xHC',
      '推进环直到重同步或环尽，跳过的 TD 数据不动、但每支都应报 MSE。',
      '期间事件不丢：Link TRB IOC=1 报 Success，Event Data/Normal',
      'TRB IOC=1 报 Missed Service Error。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('同帧同号；重同步跳 TD 逐支报 MSE。', '⑦ / 7');
  n7a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n7a().opacity(0);
  yield* waitFor(0.2);
  n7b().opacity(0.9);
  yield* iso.consume(0);
  yield* iso.deqTo(1, 0.4);
  yield* evt.fill(0, 'MSE', C.warn);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.5);
  n7b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.2.5 Frame ID',
    rows: [
      {k: '窗口', v: '[Start=MFINDEX+IST+1, End=+895ms] MOD 2048'},
      {k: 'CFC=1', v: '逐 TD 对帧号 · 可快进重同步 · 1.1/1.2 强制'},
      {k: 'CFC=0', v: '只认首 TD；断流须环空重启'},
      {k: 'ESIT', v: '≥1ms 落边界；<1ms 同帧同号（≤8 连）'},
      {k: '下一支', v: '§4.11.3 Event TRBs（波次 2）'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  iso.group().opacity(0);
  evt.group().opacity(0);
  ruler.group().opacity(0);
  yield* stage.say('帧号讲透——波次 2：事件 TRB 与格式族。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(2.9);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
