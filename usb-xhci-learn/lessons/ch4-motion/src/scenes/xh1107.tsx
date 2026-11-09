// §4.11.7 TD Usage Rules + 4.11.7.1 TD Fragments —— xHCI 1.2b p212-218
//（R12 批 C 巨头档：规则链+三图语义重建+尾 Note）
// 判据（evidence/spec-411.txt，判据唯一事实源；行号=切片内行号）：
//  - TD 构成（L1210-1215）："A Transfer Descriptor (TD) may be composed of 1
//    or more TRBs. The TRB Chain flag is used identify the TRBs of a TD,
//    where the Chain flag is set in all the TRBs of a TD except the last. In
//    the simplest case, a TD consists of a single TRB. Larger transfers may
//    require TDs that are comprised of many TRBs. If a TD crosses a TRB Ring
//    Segment boundary it may include one or more Link TRBs."
//  - IOC（L1222-1224）："Setting the TRB Interrupt on Completion (IOC) flag
//    allows the completion of a TRB to generate an event. An IOC flag may be
//    set in the TRBs of a TD identified in section 4.11.7.1."
//  - Transfer TRB Note（L1225-1226）："A “Transfer TRB” is any TRB defined in
//    section 6.4.1. Link and Event Data TRBs are not “Transfer TRBs”."
//  - IN 端点选项 4（L1230-1239）："Set the Interrupt-on Short Packet (ISP)
//    flag in all TRBs of a TD, and set the IOC flag in the last TRB. This
//    action shall cause the xHC to generate a Transfer Event if a Short
//    Packet condition is detected while executing any TRB in the TD, or
//    generate a Transfer Event if the device completely fills the buffer. To
//    determine the number of bytes actually transferred, software shall add
//    the TRB Transfer Length fields of all TRBs up to and including the TRB
//    that generated the Transfer Event, and subtract the Transfer Event TRB
//    Transfer Length field."
//  - IN 端点选项 5（L1240-1255）："Terminate the TD with an Event Data TRB
//    that has its IOC flag set, and not set the ISP or IOC flag in any
//    Transfer TRB of the TD. … The TRB Transfer Length field of the Event
//    Data Transfer Event identifies the number of bytes actually
//    transferred, from the beginning of the TD or since the last Event Data
//    Transfer Event. The TRB Transfer Length field of the Event Data
//    Transfer Event may define up to a 16,777,215 byte transfer. More than
//    one Event Data TRB may be defined within a TD. If Event Data TRBs are
//    defined within a TD, then the IOC or ISP flags shall not be set in any
//    Transfer TRB of a TD. that is, the use of Event Data Transfer Events
//    and normal Transfer Events to report a TD completion are mutually
//    exclusive."
//  - Event Data TD Note（L1256-1258）："Software may insert an Event Data TD
//    immediately following a TD to provide additional information related to
//    the previous TD. An Event Data TD is a TD that consists of just one
//    Event Data TRB."
//  - IDT（L1259-1260）："If the IDT flag is set in one TRB of a TD, then it
//    shall be the only Transfer TRB of the TD. An Event Data TRB may be
//    included in the TD."
//  - Interrupter Target（L1261-1265）："Software shall specify the same
//    Interrupter Target value in all TRBs of a TD. If an invalid Interrupter
//    Target value is defined in a TRB, the behavior of the xHC is undefined
//    if the TRB generates a Transfer Event. If virtualization is supported,
//    an xHC implementation shall ensure that this “undefined behavior” does
//    not affect another function (PF0 or VFx)."
//  - TD Size 有效（L1266-1267）："The Transfer TRB TD Size field shall be
//    valid in all Transfer TRBs that define it. Refer to section 4.11.2.4."
//  - 禁忌清单（L1274-1282）："Software shall not define a No Op Transfer TRB
//    within a multi-TRB TD, that is, software shall never set the Chain bit
//    of a No Op TRB to '1' and a No Op TRB shall always be preceded by a TRB
//    whose Chain bit is also set to '0'. Software shall not define a Link
//    TRB as the first TRB of a multi-TRB TD. Software shall not define a
//    Link TRB as the last TRB of a multi-TRB TD. One or more Link TDs may
//    precede or follow a TD. A Link TD is a TD that consists of just one
//    Link TRB. Software shall not define consecutive Link TRBs within a TD,
//    that is, software shall not set the Chain bit of consecutive Link TRBs
//    to '1'. Undefined xHC behavior may occur if the requirements defined in
//    this section are not met."
//  - 事件定期更新（L1285-1291）："Besides reporting an error or the
//    completion of a TD, Events may also be used by software to periodically
//    update the current value of the Dequeue Pointer, to indicate the
//    crossing of a Transfer Ring Segment boundary so it can add or remove a
//    segment, etc., so the xHC shall generate an Event every time it
//    encounters an IOC flag equal to ‘1’, irrespective of any error events
//    that may be forced for earlier TRBs in a TD that did not have their IOC
//    flag set."
//  - 周期 IOC 例（L1293-1295）："For example, software may periodically set
//    IOC flags in TRBs of a large TD so that it may update its Dequeue
//    Pointer and reuse the TRBs that have been consumed by the xHC (rather
//    than having to expand the Transfer Ring)."
//  - 中间事件+错误覆盖（L1296-1300）："Unless an error is encountered, all
//    the intermediate events shall report Success. If any event generated by
//    a TD reports an error, then that Completion Code overrides any
//    Successful Completion Codes that other TRBs associated with the TD may
//    have asserted, whether they come before or after the error Event."
//  - 错误≠完成 Note（L1301-1304）："Software shall not interpret an error
//    Event as indicating that the TD that it is associated with is
//    “complete” … unless the TRB Pointer field of the error Transfer Event
//    references the last TRB of the TD."
//  - Fragment 动机（L1307-1327）："The xHCI architecture allows TRBs to
//    reference buffers of any length; however hardware works most
//    efficiently when it is dealing with regularly sized buffers, for
//    example, Max Packet Size or Max Burst Size. … TD Fragments are designed
//    to: Maximize burst opportunities for the xHC by ensuring that when
//    software adds TRBs to a Transfer Ring, it does so in burst friendly
//    units. Simplify Event generation by limiting the frequency and
//    locations in a TD where the IOC flag may be set."
//  - MBP（L1328-1329）："The Max Burst Payload (MBP) is the number of bytes
//    moved by a maximum sized burst, that is, (Max Burst Size + 1) * Max
//    Packet Size bytes."
//  - 尺寸规则（L1330-1345）："A TD is comprised of one or more TD Fragments.
//    If the TD Transfer Size is an even multiple of the MBP then all TD
//    Fragments shall define exact multiples of MBP data bytes. If not, then
//    the only last TD Fragment shall define less than MBP data (or the
//    Residue) bytes. Each TD Fragment is comprised of one or more TRBs. The
//    first TRB of a TD Fragment is written last, ensuring that all the other
//    TRBs of the TD Fragment are complete and reference valid buffers in
//    host memory. … A TD Fragment may reference more than MBP bytes; if it
//    is the last or only TD Fragment of a TD, or if it references an
//    integral multiple of MBP bytes. A TD Fragment may reference less than
//    MBP bytes, if it is the last or only TD Fragment of a TD. Software is
//    allowed to construct a single TD Fragment that is an integral multiple
//    of MPB bytes, or that defines a complete TD."
//  - 结构规则（L1346-1365）："The first TRB of a TD Fragment shall always be
//    a Transfer TRB. A TD Fragment should not span Transfer Ring Segments.
//    … A TRB Packet Boundary in a TD immediately precedes a Transfer TRB in
//    which the first byte of the buffer referenced by a Transfer TRB is the
//    also the first byte of a USB packet. The first TRB of a TD Fragment
//    shall be the first TRB of a TD or immediately follow a TRB Packet
//    Boundary. The last TRB of a TD Fragment immediately precedes a TRB
//    Packet Boundary or is the last TRB of a TD."
//  - IOC 单设（L1366-1374）："The IOC flag may be set in only one TRB of a TD
//    Fragment, with the following conditions: The IOC flag may be set in a
//    Transfer TRB that immediately precedes a TRB Packet Boundary or the
//    last Transfer TRB of a TD Fragment. The IOC flag may be set in a
//    non-Transfer TRB (for example, a Link TRB, Event Data TRB, etc.) that
//    resides between two Transfer TRBs that form a TRB Packet Boundary, or
//    follow the last Transfer TRB of a TD."
//  - Figure 4-16 语义重建（L1409-1422）："The example of Figure 4-16
//    illustrates a TD that consists of two TD Fragments. TD Fragment 1 ends
//    on boundary that is also a multiple of Max Packet Size bytes, while TD
//    Fragment 2 ends at the end of the TD. Both TD Fragments end on a TRB
//    Packet Boundary (red lines). An additional TRB Packet Boundary is
//    defined in each TD Fragment, that is, between TRBs 2 and 3 in TD
//    Fragment 1 and between TRBs 5 and 6 in TD Fragment 2. Following the
//    rules described above, the IOC flag may be set only once in a TD
//    Fragment, that is, in Transfer TRB 2, Transfer TRB 4, or the Link TRB
//    of TD Fragment 1, and in Transfer TRB 5, Transfer TRB 7, or the Event
//    Data TRB of TD Fragment 2. The IOC flag cannot be set in Transfer TRBs
//    1, 3 or 6 because they do not immediately precede a TRB Packet
//    Boundary. The TD Fragment rules above also ensure that the last
//    Transfer TRB of a TD Fragment shall describe a data buffer that ends on
//    a Max Packet Size boundary (Transfer TRB 4) or terminates the TD
//    (Transfer TRB 7)."
//  - Figure 4-17 语义重建（L1593-1614）："In Figure 4-17 the TDs in all the
//    examples describe the same Virtual Buffer, which is 31KB in size,
//    begins at a 3KB offset into the first physical Page, and spans 9 Pages.
//    Example 1 illustrates the TD Fragments that would be generated for an
//    endpoint with a Max Packet Size = 1KB and a Max Burst Size of 16
//    packets. The first TD Fragment describes MBP (16K) bytes of buffer
//    space. The second TD Fragment describes the TD Fragment Residue of the
//    TD, or 15K bytes of buffer space. Note that two TRBs (5 and 6) are used
//    to split 5th physical memory Page on a MBP boundary. Example 2
//    illustrates a case where the single TD Fragment fully describes the TD,
//    or 31K bytes of buffer space. … Examples 3 and 4 illustrates TD
//    Fragments that may be generated for an endpoint with a Max Packet Size
//    = 1KB and a Max Burst Size of 8 packets. Each of the first three TD
//    Fragments in Example 3 describe MBP (8K) bytes of buffer space, and the
//    last TD Fragment describes the Residue of the TD, or 7K bytes of buffer
//    space. In Example 4 software has decided to use TD Fragment 2 to
//    describe 2 x MBP bytes of buffer space. In every case, software shall
//    write the first TRB of a respective TD Fragment last. For instance the
//    write order in Example 4 would be TRBs: 2->3->1, 5->6->7->8->4, and
//    10->11->9."
//  - 单页拆分（L1623-1628）："in each example of Figure 4-17, the data
//    associated with a single page is split between two TRBs to enforce a TD
//    Fragment boundary, for example, in example 1, the 4KB page on the
//    boundary between TD Fragment 1 and 2 is defined by TRB 5 (3 KB) and TRB
//    6 (1KB) …"
//  - Isoch Note（L1629-1632）："Only fully formed TDs may be scheduled on
//    Isoch endpoints, for example, write the first TRB of a multi-TRB TD
//    last, irrespective of the number of TD Fragments that comprise it …"
//  - Figure 4-18（L1677-1695）："the example defines a TD that transfers
//    30.5 KB of data, where the packet size (Max Packet Size) = 1 KB, the
//    Burst Size = 16 KB, and the initial offset of the data in the first
//    4 KB page is 3.75KB (3840B). An important aspect of this example is
//    that due to the initial offset (3.75KB), page boundaries do not land on
//    packet boundaries (as they do in Figure 4-17). … In Figure 4-18 the IOC
//    flag only may be set in TRBs 5 and 10. In TRB 5 because TRBs 5 and 6
//    split the data in the page that they reference to force a break on a
//    Burst Size boundary, hence the buffer described by TRB 5 ends on a
//    packet, boundary. The IOC flag may be set in TRB 10 because it is the
//    last packet of a TD, which forces a packet boundary. Note that the Link
//    TRB does not land on a packet boundary relative to the start of TD
//    Fragment 1, so its IOC flag may not be set. … In Figure 4-17 all TRBs
//    define buffers that end on Packet boundaries; hence an IOC flag may be
//    set in any TRB of a TD Fragment, but only once per TD."
//  - 尾 Note（L1702-1707）："The TD Fragment rules, that define which TRBs of
//    a TD that an IOC flag may be set in, apply to Isoch TDs, however a
//    partially formed TD shall not be posted to an Isoch endpoint. Only
//    fully formed TDs may be posted to Isoch endpoints, for example,
//    software shall write the first TRB of a multi-TRB TD last, irrespective
//    of its size."
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
      <Txt ref={t1} text={'§4.11.7'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'TD Usage Rules'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'TD 使用规则与 TD Fragments · xHCI 规范第 4 章 · p212–218'}
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
    section: '§4.11.7',
    zh: 'TD Usage Rules',
    en: 'TD 使用规则与 TD Fragments · 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.7 p212–218',
  });
  yield* lanesIn(stage);

  /* 传输环（TD 链走读） */
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: 'TD=链式 TRB 组', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  xfer.markLink();
  yield* waitFor(0.25);

  /* ===== ① TD 构成与 Chain 标记 ===== */
  const q1 = makeChip(
    view,
    '"A Transfer Descriptor (TD) may be composed of 1 or more TRBs. The TRB Chain flag is used identify the TRBs of a TD, where the Chain flag is set in all the TRBs of a TD except the last. In the simplest case, a TD consists of a single TRB. Larger transfers may require TDs that are comprised of many TRBs. If a TD crosses a TRB Ring Segment boundary it may include one or more Link TRBs." — §4.11.7 p212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  yield* stage.say('TD=1..n 支 TRB；除末支外全置 Chain。', '① / 16');
  q1().opacity(0.95);
  yield* xfer.fill(0, 'TRB·CH', C.driver);
  yield* xfer.fill(1, 'TRB·CH', C.driver);
  yield* xfer.fill(2, 'TRB', C.dev);
  yield* xfer.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② IOC 与 Transfer TRB 边界 ===== */
  const q2 = makeChip(
    view,
    '"Setting the TRB Interrupt on Completion (IOC) flag allows the completion of a TRB to generate an event. An IOC flag may be set in the TRBs of a TD identified in section 4.11.7.1." — §4.11.7 p212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 16},
  );
  const n2 = makeNote(
    view,
    [
      'Note（L1225-1226）：Transfer TRB=§6.4.1 定义的那些；Link 与',
      'Event Data TRB 不算 Transfer TRB——IOC 可设位置马上讲。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('IOC 让 TRB 完成即出事件；可设位受 Fragment 约束。', '② / 16');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.9);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ IN 端点选项 4：ISP 全设+末位 IOC ===== */
  const q3 = makeChip(
    view,
    '"Set the Interrupt-on Short Packet (ISP) flag in all TRBs of a TD, and set the IOC flag in the last TRB. This action shall cause the xHC to generate a Transfer Event if a Short Packet condition is detected while executing any TRB in the TD, or generate a Transfer Event if the device completely fills the buffer. To determine the number of bytes actually transferred, software shall add the TRB Transfer Length fields of all TRBs up to and including the TRB that generated the Transfer Event, and subtract the Transfer Event TRB Transfer Length field." — §4.11.7 p212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  yield* stage.say('选项 4：全 TD 设 ISP+末位 IOC，软件自己算实传量。', '③ / 16');
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ IN 端点选项 5：Event Data 收尾+互斥 ===== */
  const q4 = makeChip(
    view,
    '"Terminate the TD with an Event Data TRB that has its IOC flag set, and not set the ISP or IOC flag in any Transfer TRB of the TD. … The TRB Transfer Length field of the Event Data Transfer Event identifies the number of bytes actually transferred, from the beginning of the TD or since the last Event Data Transfer Event. … More than one Event Data TRB may be defined within a TD. If Event Data TRBs are defined within a TD, then the IOC or ISP flags shall not be set in any Transfer TRB of a TD. that is, the use of Event Data Transfer Events and normal Transfer Events to report a TD completion are mutually exclusive." — §4.11.7 p212',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 12},
  );
  yield* stage.say('选项 5：Event Data 收尾报实传量；两选项互斥。', '④ / 16');
  q4().opacity(0.95);
  yield* xfer.fill(3, 'EventData·IOC', C.evt);
  yield* xfer.enqTo(4);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Event Data TD / IDT / Interrupter Target / TD Size ===== */
  const n5 = makeNote(
    view,
    [
      'Event Data TD Note（L1256-1258）：TD 后可跟单枚 Event Data TD 附',
      '加信息。IDT（L1259-1260）：TD 内设 IDT 的 TRB 须是唯一 Transfer',
      'TRB。Interrupter Target（L1261-1265）：全 TD 同值，非法值+虚拟',
      '化时不得殃及它函数。TD Size（L1266-1267）恒有效（§4.11.2.4）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('杂项规则四连：附注 TD/IDT/中断器目标/TD Size。', '⑤ / 16');
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.5);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 禁忌清单 ===== */
  const t6: CardApi = makeCard({
    title: '软件不得定义（L1274-1282）',
    rows: [
      {k: 'No Op', v: '禁入多 TRB TD（CH 恒 0 · 前驱 CH 亦 0）'},
      {k: 'Link 位', v: '禁作多 TRB TD 首支/末支'},
      {k: '连续 Link', v: 'TD 内禁连续 Link TRB 链'},
      {k: 'Link TD', v: '单枚 Link TD 可夹在 TD 前后'},
      {k: '后果', v: '违者 xHC 行为未定义'},
    ],
    tint: C.warn,
    w: 560,
    rowSize: 17,
  });
  view.add(t6.node);
  const n6 = makeNote(
    view,
    [
      '违规即 Undefined xHC behavior（L1283-1284）——禁忌清单是硬边界，',
      '不是建议。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('四禁一后果：No Op/Link 首尾/连续 Link。', '⑥ / 16');
  yield* cardIn(t6, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  t6.ref().opacity(0);
  yield* waitFor(0.2);
  t6.ref().remove();
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.7);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 事件定期更新 Deq ===== */
  const n7 = makeNote(
    view,
    [
      '事件三用（L1285-1291）：报错/报完成之外，还可定期刷新 Dequeue',
      'Pointer、标记跨段时机以便增删段——xHC 逢 IOC=1 必出事件，不受',
      '先前 TRB 被迫错误事件影响。例（L1293-1295）：大 TD 周期设 IOC',
      '即可回收已消费 TRB，免扩环。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('IOC 还有记账用途：周期刷新 Deq、回收 TRB。', '⑦ / 16');
  n7().opacity(0.9);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* xfer.consume(1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 中间事件 Success / 错误覆盖 / 错误≠完成 ===== */
  const n8a = makeNote(
    view,
    [
      '中间事件（L1296-1300）：无错时全部报 Success；任一事件报错则',
      '该 CC 覆盖 TD 其余 TRB 已断言的成功码——不论先后。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  const n8b = makeNote(
    view,
    [
      'Note（L1301-1304）：错误事件≠TD 完成——只有错误 Transfer Event',
      '的 TRB Pointer 指 TD 末支时，所有权才算全部交还软件。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('错误覆盖一切成功码；但错误≠完成。', '⑧ / 16');
  n8a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  n8a().opacity(0);
  yield* waitFor(0.2);
  n8b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  n8b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ TD Fragments 动机 ===== */
  const q9 = makeChip(
    view,
    '"The xHCI architecture allows TRBs to reference buffers of any length; however hardware works most efficiently when it is dealing with regularly sized buffers, for example, Max Packet Size or Max Burst Size. … TD Fragments are designed to: … Maximize burst opportunities for the xHC by ensuring that when software adds TRBs to a Transfer Ring, it does so in burst friendly units. … Simplify Event generation by limiting the frequency and locations in a TD where the IOC flag may be set." — §4.11.7.1 p213-214',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 13},
  );
  yield* stage.say('Fragment 双目标：burst 友好+IOC 限位。', '⑨ / 16');
  q9().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.3);
  q9().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑩ MBP 与尺寸规则 ===== */
  const q10 = makeChip(
    view,
    '"The Max Burst Payload (MBP) is the number of bytes moved by a maximum sized burst, that is, (Max Burst Size + 1) * Max Packet Size bytes. A TD is comprised of one or more TD Fragments. If the TD Transfer Size is an even multiple of the MBP then all TD Fragments shall define exact multiples of MBP data bytes. If not, then the only last TD Fragment shall define less than MBP data (or the Residue) bytes." — §4.11.7.1 p214',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  const f10: CardApi = makeCard({
    title: 'Fragment 尺寸记账（MBP）',
    rows: [
      {k: 'MBP', v: '(MaxBurst+1) × MaxPacket 字节'},
      {k: '整倍时', v: '全部 Fragment=MBP 整数倍'},
      {k: '否则', v: '仅末 Fragment<MBP（Residue）'},
      {k: '超限', v: '末/独 Fragment 或 MBP 整倍可 >MBP'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(f10.node);
  const n10 = makeNote(
    view,
    [
      '首 TRB 最后写（L1334-1336）：Fragment 首支 TRB 最后落笔，保证',
      '其余 TRB 已完整且指向有效缓冲；单 Fragment 可整倍 MBP 或全 TD。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('MBP=(MaxBurst+1)×MaxPacket；Residue 只许垫底。', '⑩ / 16');
  q10().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  q10().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(f10, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(1.5);
  f10.ref().opacity(0);
  yield* waitFor(0.2);
  f10.ref().remove();
  n10().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n10().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑪ 结构规则与 Packet Boundary ===== */
  const q11 = makeChip(
    view,
    '"The first TRB of a TD Fragment shall always be a Transfer TRB. … A TD Fragment should not span Transfer Ring Segments. … A TRB Packet Boundary in a TD immediately precedes a Transfer TRB in which the first byte of the buffer referenced by a Transfer TRB is the also the first byte of a USB packet. … The first TRB of a TD Fragment shall be the first TRB of a TD or immediately follow a TRB Packet Boundary. … The last TRB of a TD Fragment immediately precedes a TRB Packet Boundary or is the last TRB of a TD." — §4.11.7.1 p214',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 13},
  );
  yield* stage.say('Fragment 首支恒 Transfer TRB；首尾都贴 Packet Boundary。', '⑪ / 16');
  q11().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.5);
  q11().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑫ IOC 单设规则 ===== */
  const q12 = makeChip(
    view,
    '"The IOC flag may be set in only one TRB of a TD Fragment, with the following conditions: … The IOC flag may be set in a Transfer TRB that immediately precedes a TRB Packet Boundary or the last Transfer TRB of a TD Fragment. … The IOC flag may be set in a non-Transfer TRB (for example, a Link TRB, Event Data TRB, etc.) that resides between two Transfer TRBs that form a TRB Packet Boundary, or follow the last Transfer TRB of a TD." — §4.11.7.1 p214',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 13},
  );
  yield* stage.say('每 Fragment 至多一枚 IOC：Transfer TRB 贴边界/非 TRB 垫尾。', '⑫ / 16');
  q12().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.5);
  q12().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑬ Figure 4-16 语义重建 ===== */
  const f13a: CardApi = makeCard({
    title: 'Figure 4-16 · TD Fragment 1（TRB1-4+Link）',
    rows: [
      {k: '边界', v: 'TRB2|3 一处 · TRB4 末=F 边界（整 MPS 倍）'},
      {k: 'IOC 可设', v: 'TRB2 / TRB4 / Link（三选一）'},
      {k: 'TRB1/3', v: '不紧邻 Packet Boundary→不可设'},
    ],
    tint: C.driver,
    w: 620,
    rowSize: 17,
  });
  view.add(f13a.node);
  const f13b: CardApi = makeCard({
    title: 'Figure 4-16 · TD Fragment 2（TRB5-7+EventData）',
    rows: [
      {k: '边界', v: 'TRB5|6 一处 · TRB7 末=TD 终点'},
      {k: 'IOC 可设', v: 'TRB5 / TRB7 / EventData（三选一）'},
      {k: 'TRB6', v: '不紧邻 Packet Boundary→不可设'},
    ],
    tint: C.dev,
    w: 620,
    rowSize: 17,
  });
  view.add(f13b.node);
  yield* stage.say('图 4-16 走读：两 Fragment 各自的边界与 IOC 候选。', '⑬ / 16');
  yield* cardIn(f13a, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  f13a.ref().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(f13b, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  f13b.ref().opacity(0);
  yield* waitFor(0.2);
  f13a.ref().remove();
  f13b.ref().remove();

  /* ===== ⑭ Figure 4-17 四例语义重建 ===== */
  const t14: CardApi = makeCard({
    title: 'Figure 4-17 · 31KB 缓冲（3KB 偏移跨 9 页）',
    rows: [
      {k: '例1', v: 'MBP=16K：F1=16K + F2=Residue 15K'},
      {k: '例2', v: '单 Fragment 描述全 TD 31K'},
      {k: '例3', v: 'MBP=8K：三枚 8K + 末枚 7K'},
      {k: '例4', v: '同例3 但 F2=2×MBP（整倍可选）'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(t14.node);
  const n14 = makeNote(
    view,
    [
      '写序（L1612-1614）：首 TRB 最后写——例4 写序 2->3->1、',
      '5->6->7->8->4、10->11->9；TRB5/6 拆同一 4KB 页强制 MBP 边界',
      '（例1 同型，TRB5=3K+TRB6=1K，L1623-1628）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('四例同缓冲不同切法；首 TRB 永远最后写。', '⑭ / 16');
  yield* cardIn(t14, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(1.9);
  t14.ref().opacity(0);
  yield* waitFor(0.2);
  t14.ref().remove();
  n14().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  n14().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑮ 单页拆分与 Isoch 全成形 ===== */
  const n15 = makeNote(
    view,
    [
      'Isoch Note（L1629-1632）：Fragment IOC 规则同样适用，但等时端点',
      '只收全成形 TD——多 TRB TD 无论含几枚 Fragment，首 TRB 一律最后',
      '写完才许上环。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('等时端点只收全成形 TD——首 TRB 最后写。', '⑮ / 16');
  n15().opacity(0.9);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n15().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑯ Figure 4-18 非对齐+尾 Note ===== */
  const q16 = makeChip(
    view,
    '"An important aspect of this example is that due to the initial offset (3.75KB), page boundaries do not land on packet boundaries (as they do in Figure 4-17). … In Figure 4-18 the IOC flag only may be set in TRBs 5 and 10. … Note that the Link TRB does not land on a packet boundary relative to the start of TD Fragment 1, so its IOC flag may not be set. … In Figure 4-17 all TRBs define buffers that end on Packet boundaries; hence an IOC flag may be set in any TRB of a TD Fragment, but only once per TD." — §4.11.7.1 p217',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 13},
  );
  const n16 = makeNote(
    view,
    [
      '例面（L1677-1680）：30.5KB · MPS=1KB · Burst=16KB · 首页偏移',
      '3.75KB——页界错开包界，Link TRB 不再是 IOC 候选。尾 Note',
      '（L1702-1707）：Fragment IOC 规则适用于等时 TD，部分成形 TD 禁',
      '上等时端点；首 TRB 最后写、不限 TD 大小。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('非对齐例：IOC 只剩 TRB5/TRB10；等时只收全成形。', '⑯ / 16');
  q16().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  q16().opacity(0);
  yield* waitFor(0.2);
  n16().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.5);
  n16().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.7 TD Usage Rules / Fragments',
    rows: [
      {k: '构成', v: 'TD=1..n TRB · CH 全设除末支 · 四禁一后果'},
      {k: '回执', v: '选项4 ISP+末IOC ↔ 选项5 EventData（互斥）'},
      {k: 'Fragment', v: 'MBP=(MaxBurst+1)×MPS · Residue 垫底 · 首TRB 末写'},
      {k: 'IOC', v: '每 Fragment 一枚 · 贴 Packet Boundary · 错误覆盖成功码'},
      {k: '等时', v: '只收全成形 TD · 尾 Note 重申首 TRB 末写'},
      {k: '下一支', v: '§4.11 全节收官（补丁片×2）'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 19,
  });
  view.add(sum.node);
  xfer.group().opacity(0);
  yield* stage.say('§4.11 主线收官——补丁两支补数字面。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
