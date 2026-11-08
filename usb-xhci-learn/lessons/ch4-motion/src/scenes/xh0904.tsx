// §4.9.4 Event Ring Management 事件环管理 —— xHCI 1.2b p161-170（R12 批 A 巨头支，
// 含 4.9.4.1 扩容 / 4.9.4.2 缩容 / 4.9.4.3 Primary-Secondary 三个子节）
// 判据（evidence/spec-49.txt，判据唯一事实源）：
//  - 主客反转："A fundamental difference between an Event Ring and a Transfer or
//    Command Ring is that the xHC is the producer and system software is the
//    consumer of Event TRBs."（L695-699, p161）；xHC 可实现多个 Interrupter 各配
//    一环，本节讲单环（L692-694）
//  - PCS/CCS："The xHC maintains an Event Ring Producer Cycle State (PCS) bit,
//    initializing it to '1' and toggling it every time the Event Ring Enqueue
//    Pointer wraps back to the beginning…Software maintains an Event Ring Consumer
//    Cycle State (CCS) bit…If the Cycle bit of the Event TRB pointed to by the
//    Event Ring Dequeue Pointer equals CCS, then the Event TRB is a valid event…If
//    the Event TRB Cycle bit is not equal to CCS, then software stops processing
//    Event TRBs and waits for an interrupt…"（L700-713, p161）
//  - ERDP："System software shall write the Event Ring Dequeue Pointer (ERDP)
//    register to inform the xHC that it has completed the processing of Event TRBs
//    up to and including the Event TRB referenced by the ERDP."（L714-716, p161）；
//    Cycle 失配=环空定位（Note L717-720）；"software shall not write the same value
//    to the ERDP register on two consecutive write operations"（L961-963, p165）；
//    批处理建议："software should maximize the number of Events processed before
//    writing the ERDP, for example, processing a minimum of 4 Events before each
//    ERDP write."（L947-951, p165；满时尤甚 L940-945）
//  - ERST（L721-740, p161-162）：ERST=BaseAddress/Size 对数组；ERSTBA 指 ERST(0)；
//    ERSTSZ 定元素数；计满 ERST.Size 换段、回卷 ERST(0)；图 4-11 三段例
//  - 启动规则（L800-835, p162-163）：ERSTBA 写前=段清 0+填 ERST；写 ERSTSZ+
//    ERDP=ERST(0).BaseAddr；写 ERSTBA→状态机 Start；ERDP 写入=最后处理的 TRB
//    地址（含空环失配情形）；每段 Size ≥16
//  - 图 4-12 状态机（L842-932, p164）：左=EREP 推进（写 EREP+16、TRB Count−−、
//    Count=0 换段、回卷翻 PCS）；右=满检查。Table 4-4 变量（L964-1017, p165-166）
//  - EREP 推进算法（L1018-1056, p166）
//  - 满检查（L1057-1113, p166-167）："the xHC shall consider the Event Ring full
//    when there is still room for one more entry."（满前留一格，Full Error 本身
//    要占位）；TRB Count>1→EREP+16 对 ERDP；=1→NSP 对 ERDP；=0→下一段；
//    满→停 Transfer/Command 环+写 Event Ring Full Error 事件；ERDP 写入才解除
//  - 满的口径（L1114-1140, p167-168）：优雅停环、Isoch 错过服务窗=Missed Service
//    Error、Full Error 无论丢不丢数据都要报；Primary 满全停，Secondary 满可只停
//    目标环，虚拟化下 Secondary 满不得停 Primary/命令环
//  - 4.9.4.1 扩容（L1141-1192, p168-169）：新段+ERST 尾接+写 ERSTSZ；启用判定=
//    新段首 TRB 的 Completion Code 非 0（Valid）——首遍 Cycle 位无效不可用；
//    "ERST entries (Segment Base Address and Size fields) between 0 and ERSTSZ-1
//    are not allowed to be modified by software when HCHalted (HCH) = '0'."
//                                                                    (L1193-1194, p169)
//  - 4.9.4.2 缩容（L1195-1221, p169）：ERSTSZ 递减；以被删段首 TRB 的 Cycle 位
//    判定 xHC 已停用该段
//  - 4.9.4.3 Primary/Secondary（L1228-1255, p170）：MaxIntrs（HCSPARAMS1）定数；
//    0 号=Primary；Secondary 只收 Transfer/Bandwidth Request/Device Notification/
//    Host Controller/Vendor--defined（可选）五类；Transfer TRB Interrupter Target
//    与 Slot Context Interrupter Target 定去向
import {makeScene2D, Rect, Txt} from '@motion-canvas/2d';
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
  makeLampRow,
  flash,
  CardApi,
  StageApi,
  RingApi,
  CellStripApi,
  LampApi,
} from '../lib/parts';

type AnyRef = {(): any};

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.9.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Event Ring Management'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={74} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'事件环管理 · xHCI 规范第 4 章 · p161–170（含 4.9.4.1-.3）'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(1.0);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.9.4',
    zh: 'Event Ring Management',
    en: 'ERST · ERDP/EREP · ER Full · 规范第 4 章',
    cite: 'xHCI 1.2b §4.9.4 p161–170',
  });
  yield* lanesIn(stage);

  /* 事件环（主角）+ ERST 段表 + 寄存器/旗标灯排 */
  const er: RingApi = makeRing(view, {
    y: 470, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写 / 软件取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  er.group().opacity(1);
  er.markLink();
  yield* waitFor(0.2);
  const erst: CellStripApi = makeCellStrip(view, {
    x: TLx(820), y: TLy(655), n: 3, w: 170, h: 60, tint: C.hc,
    labels: ['ERST(0)', 'ERST(1)', 'ERST(2)'],
  });
  const eTitle = makeChip(
    view,
    'ERST · 段表（Base/Size 对）· ERSTSZ 计数 · 回卷 ERST(0)',
    {x: TLx(1000), y: TLy(722), w: 660, tint: C.hc, size: 15},
  );
  erst.group().opacity(1);
  eTitle().opacity(0.9);
  yield* waitFor(0.25);
  const regs: LampApi[] = makeLampRow(view, {
    x: TLx(420), y: TLy(380), labels: ['PCS', 'CCS', 'ERSTSZ', 'ERSTBA', 'ERDP'],
    w: 200,
  });
  for (const r of regs) r.ref().opacity(1);
  regs[2].val().text('3');
  yield* waitFor(0.25);

  /* ===== ① 主客反转 ===== */
  const q1 = makeChip(
    view,
    '"A fundamental difference between an Event Ring and a Transfer or Command Ring is that the xHC is the producer and system software is the consumer of Event TRBs." — §4.9.4 p161',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 18},
  );
  yield* stage.say('事件环反着来：xHC 是生产者，软件是消费者。', '① / 11');
  q1().opacity(0.95);
  yield* flash(er.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② PCS/CCS 取事件 ===== */
  const q2 = makeChip(
    view,
    '"If the Cycle bit of the Event TRB pointed to by the Event Ring Dequeue Pointer equals CCS, then the Event TRB is a valid event, software processes it and advances the Event Ring Dequeue Pointer." — §4.9.4 p161',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 17},
  );
  yield* stage.say('Cycle 对上 CCS 才收货；对不上就停手等中断。', '② / 11');
  regs[0].val().text('1');
  regs[1].val().text('1');
  q2().opacity(0.95);
  yield* er.fill(0, 'Ev c1', C.evt);
  yield* er.fill(1, 'Ev c1', C.evt);
  yield* er.enqTo(2);
  yield* er.deqTo(0, 0.4);
  yield* er.consume(0);
  yield* er.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ ERDP 签收 ===== */
  const n3a = makeNote(
    view,
    [
      '写 ERDP=签收（L714-716）：告知 xHC 已处理到 ERDP 所指',
      'TRB（含判空时把失配 TRB 地址写回，L717-720）。两条纪律：',
      'ERDP 恒前进，禁同值连写（L961-963）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  const n3b = makeNote(
    view,
    [
      '批处理建议（L940-951）：尽量多处理几条再写一次 ERDP',
      '——建议每次至少攒 4 条；事件环已满时更须如此，否则',
      '环被 Event Ring Full Error 事件回填、工作无法推进。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('写 ERDP 等于签收：处理到哪，指针指到哪。', '③ / 11');
  regs[4].val().text('→Ev0');
  n3a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n3a().opacity(0);
  yield* waitFor(0.2);
  regs[4].val().text('→Ev1');
  yield* flash(regs[4].ref, 1);
  n3b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  n3b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ ERST 分段 ===== */
  const q4 = makeChip(
    view,
    '"The ERST consists of an array of Base Address/Size pairs (ERST.BaseAddress and ERST.Size), each defining a single Event Ring segment." — §4.9.4 p161',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('段表 ERST：一对 Base/Size 管一段，逐段消费再回卷。', '④ / 11');
  q4().opacity(0.95);
  erst.value[0]().text('Seg0 · n');
  erst.value[1]().text('Seg1 · m');
  yield* flash(erst.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 启动规则组 ===== */
  const n5 = makeNote(
    view,
    [
      '启动四拍（L800-835）：① 事件环各段清 \'0\'、② 填好 ERST',
      '表项（Base/Size）、③ 写 ERSTSZ 与 ERDP=ERST(0).BaseAddr、',
      '④ 写 ERSTBA（写入即入 Start 态）。每段 Size 至少 16。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('启动四拍：清段、填表、写 ERSTSZ+ERDP、写 ERSTBA。', '⑤ / 11');
  n5().opacity(0.9);
  yield* flash(regs[3].ref, 1);
  regs[3].val().text('→ERST');
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 图 4-12：EREP 推进 ===== */
  const n6 = makeNote(
    view,
    [
      '图 4-12 左侧 EREP 推进（L1018-1056）：有事件先查满→',
      '写 Event TRB @EREP、EREP+=16、TRB Count−−；Count 归 0',
      '取下一段（ERSTE.BaseAddr/Size 重装）；ERST Count 追平',
      'ERSTSZ 即回卷：Count=0、PCS 翻转（L858-864）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('有事件先查满，再写格、减计数；段尽换下一段。', '⑥ / 11');
  n6().opacity(0.9);
  yield* er.fill(2, 'Ev c1', C.evt);
  yield* er.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ ER 满检查 ===== */
  const n7 = makeNote(
    view,
    [
      '满检查（L1057-1113）：满前留一格——Full Error 事件自己也',
      '要占位。三分支：TRB Count>1→EREP+16 对 ERDP；=1→下一段',
      '基址 NSP 对 ERDP；=0→推进到下一段再看。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('满前留一格：Full Error 自己也要占位。', '⑦ / 11');
  n7().opacity(0.9);
  yield* flash(regs[0].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 满的处置 ===== */
  const q8 = makeChip(
    view,
    '"If the NSP equals the ERDP, then the Event Ring is full. The xHC stops processing the Transfer and Command Rings, writes an Event Ring Full Error Event to the EREP…" — §4.9.4 p167',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 17},
  );
  yield* stage.say('满即停传命令环：写 Full Error 事件，等 ERDP 解锁。', '⑧ / 11');
  q8().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q8().opacity(0);
  yield* waitFor(0.2);
  const n8 = makeNote(
    view,
    [
      '口径（L1114-1140）：Primary 满全停；Secondary 满可只停',
      '目标环，虚拟化下不得停 Primary/命令环。持续满会错过',
      '周期端点服务窗——Isoch 丢数据以 Missed Service Error 报；',
      'Full Error 无论丢不丢数据都必须上报（环配置不足）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ 4.9.4.1 扩容（注记拆两段分时） ===== */
  const n9a = makeNote(
    view,
    [
      '扩容（L1141-1155）：分配清零新段 → ERST 表尾接上新条目',
      '（Base/Size）→ 写新 ERSTSZ（例：ERSTSZ=2→3 加段 2）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  const n9b = makeNote(
    view,
    [
      '启用判定（L1148-1151）：新段首 TRB 的 Completion Code',
      '非 0（Valid）——首遍 Cycle 位无效不可用，首遍后恢复可信；',
      'HCH=\'0\' 时既有表项 0..ERSTSZ-1 禁改（L1193-1194）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  yield* stage.say('扩容：新段接在表尾，ERSTSZ 加一；首遍看 CC 非 0。', '⑨ / 11');
  erst.value[2]().text('Seg2 · new');
  yield* flash(erst.cell[2], 1);
  regs[2].val().text('4');
  n9a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n9a().opacity(0);
  yield* waitFor(0.2);
  n9b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n9b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑩ 4.9.4.2 缩容 ===== */
  const n10 = makeNote(
    view,
    [
      '缩容（L1195-1221）：ERSTSZ 递减即可。xHC 是否已停用被删',
      '段，看被删段首 TRB 的 Cycle 位与预期是否相符；不符再',
      '查段 0 首格，区分"已停用"与"环空"。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  yield* stage.say('缩容：ERSTSZ 减一；被删段首格 Cycle 判停用。', '⑩ / 11');
  erst.value[2]().text('删');
  regs[2].val().text('3');
  n10().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  n10().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑪ 4.9.4.3 Primary / Secondary（注记拆两段分时） ===== */
  const n11a = makeNote(
    view,
    [
      'Primary/Secondary（L1228-1236）：Interrupter 数由',
      'HCSPARAMS1 的 MaxIntrs 定；0 号=Primary，其余=Secondary。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  const n11b = makeNote(
    view,
    [
      'Secondary 只收五类（L1237-1248）：Transfer / Bandwidth',
      'Request / Device Notification / Host Controller /',
      '厂商自定义（可选）；去向看 Interrupter Target（L1249-1255）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('0 号中断器=Primary；其余 Secondary 只收五类事件。', '⑪ / 11');
  n11a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  n11a().opacity(0);
  yield* waitFor(0.2);
  n11b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n11b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.9.4 Event Ring Management',
    rows: [
      {k: '主客', v: 'xHC 生产 / 软件消费 · PCS/CCS 相认'},
      {k: 'ERDP', v: '签收恒前进 · 攒批再写（≥4）'},
      {k: '段表', v: 'ERST Base/Size · 启动四拍 · Size≥16'},
      {k: '满', v: '留一格报 Full Error · 停环等 ERDP'},
      {k: '扩缩', v: '表尾加减 ERSTSZ · 首遍看 CC/Cycle'},
      {k: '下一批', v: '§4.10 Host Controller TRB Handling'},
    ],
    tint: C.hc,
    w: 1000,
    rowSize: 19,
  });
  view.add(sum.node);
  er.group().opacity(0);
  erst.group().opacity(0);
  eTitle().opacity(0);
  for (const r of regs) r.ref().opacity(0);
  yield* stage.say('事件环收口，TRB 环一章完结——下一批 4.10。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
