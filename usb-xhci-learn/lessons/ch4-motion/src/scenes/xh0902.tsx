// §4.9.2 Transfer Ring Management 传输环管理 —— xHCI 1.2b p152-160（R12 批 A 巨头支）
// 判据（evidence/spec-49.txt，判据唯一事实源）：
//  - 双指针："The producer (host) places items in a Transfer Ring at the Enqueue
//    Pointer, and the consumer (xHC) removes items from the Transfer Ring at the
//    Dequeue Pointer."（L153-156, p152-153）；"Software uses and maintains private
//    copies of the Enqueue and Dequeue Pointers for each Transfer Ring…written to
//    the Endpoint/Stream Context TR Dequeue Pointer field, when a Transfer Ring is
//    initially set up."（L166-172, p153）
//  - Cycle 定位："The Cycle bit field in a TRB identifies the location of the
//    Enqueue Pointer in a Transfer Ring, eliminating the need to define a physical
//    Enqueue Pointer register."（L163-165, p153）
//  - PCS/CCS："The producer maintains a Producer Cycle State (PCS) flag which
//    identifies the value that it shall write to the TRB Cycle bit. The consumer
//    maintains a Consumer Cycle State (CCS) flag…If the CCS flag is equal to the
//    value of the TRB Cycle bit, then the consumer owns the TRB…and may process
//    it."（L200-207, p153）
//  - 空满判定：xHC fetch 遇 Cycle 转换=空（L191-193）；软件推进将撞 Deq=满、
//    等 Transfer Events（L194-199）；Deq 副本经 Transfer Event TRB Pointer 回填
//    （L186-190）
//  - 所有权（Note，L276-280, p154）："All TRBs between the Dequeue Pointer and the
//    Enqueue Pointer-1 are owned by the Consumer and may not be modified by the
//    Producer."
//  - Link TRB 与 Toggle Cycle（L262-275, p154）：段尾 Link 回指段首；"If the
//    Producer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the
//    state of its PCS flag. If the Consumer encounters…toggle…CCS flag."；Link 使
//    环可跨页、动态伸缩
//  - 4.9.2.1 分段环（L296-354, p155）：Ring Segment=连续内存块；"The last TRB in a
//    Ring Segment is always a Link TRB."；图 4-7 例=256+244=500（498 可用），
//    TC 只在段 1 的 Link
//  - 4.9.2.2 指针推进（L361-383, p156）：Deq+16 遇 Link 跳段；"Software is
//    responsible for advancing the Enqueue pointer. It does this by toggling the
//    Cycle bit each pass through the ring as it writes TRBs."；满判定须计 Link
//  - 图 4-8 算法（L390-407, p157）：初始化 PCS=1 → 写 TRB（Cycle=PCS、Enq+=16）→
//    Link? → Enq=段指针 → TC=1? → PCS 翻转
//  - 推进规则组（L413-448, p157-158）：全环 Cycle 清 0；PCS=CCS=1；CCS 初值=DCS
//    （传输环）/RCS（命令环）/事件环恒 '1'；Cycle 生产者写、消费者只读；
//    Enq/Deq 遇 Link→跳 Ring Segment Pointer、TC=1 时翻各自旗
//  - 4.9.2.3 扩环（L453-632, p158-160）：只许改生产者自有的 Link TRB；新段 C 初始化
//    四步（全 0/末位=Link/Seg Ptr→B 首/TC=1）+ A 段 Link 改指 C（TC=1）；Cycle 一致
//    两案：新段全清 0+改 TC 旗，或新段 Cycle 全置 '1'
//  - 中途改 Link（Note，L524-531, p159）：非执行 TD 中间 TRB→停环改后重启；
//    是中间 TRB→停环+Set TR Dequeue Pointer 冲缓存
//  - 4.9.2.4 缩环（L633-643, p160）：选边界 Link；映射掉中间段或指段内 TRB；
//    TC 管理保 Enqueue 定义一致
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
      <Txt ref={t1} text={'§4.9.2'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Transfer Ring Management'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={70} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'传输环管理 · xHCI 规范第 4 章 · p152–160'}
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
    section: '§4.9.2',
    zh: 'Transfer Ring Management',
    en: 'Enqueue/Dequeue · Cycle bit · Link TRB · 规范第 4 章',
    cite: 'xHCI 1.2b §4.9.2 p152–160',
  });
  yield* lanesIn(stage);

  /* 两段传输环（段 A/段 B）+ PCS/CCS 灯排 */
  const segA: RingApi = makeRing(view, {
    y: 470, zh: '传输环 · 段 A', en: '',
    note: '生产者写 / 消费者取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const segB: RingApi = makeRing(view, {
    y: 655, zh: '传输环 · 段 B', en: '',
    note: 'Link TC=1', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  segA.group().opacity(1);
  segB.group().opacity(1);
  yield* waitFor(0.2);
  segA.markLink(); segB.markLink();
  const flags: LampApi[] = makeLampRow(view, {
    x: TLx(620), y: TLy(380), labels: ['PCS', 'CCS'], w: 210,
  });
  yield* waitFor(0.25);

  /* ===== ① 双指针双副本 ===== */
  const q1 = makeChip(
    view,
    '"The producer (host) places items in a Transfer Ring at the Enqueue Pointer, and the consumer (xHC) removes items from the Transfer Ring at the Dequeue Pointer." — §4.9.2 p152-153',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('生产者软件握 Enq，消费者 xHC 握 Deq，各留副本。', '① / 12');
  q1().opacity(0.95);
  yield* segA.fill(0, 'N c1', C.driver);
  yield* segA.fill(1, 'N c1', C.driver);
  yield* segA.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② Cycle 定 Enq 位 + PCS/CCS ===== */
  const q2 = makeChip(
    view,
    '"The Cycle bit field in a TRB identifies the location of the Enqueue Pointer in a Transfer Ring, eliminating the need to define a physical Enqueue Pointer register." — §4.9.2 p153',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('物理上没有 Enq 寄存器：Cycle 转换就是位置标记。', '② / 12');
  for (const f of flags) f.ref().opacity(1);
  flags[0].val().text('1');
  flags[1].val().text('1');
  yield* flash(flags[0].ref, 1);
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 空与满 ===== */
  const n3 = makeNote(
    view,
    [
      '空（L191-193）：xHC 取格遇 Cycle 位转换=环空。',
      '满（L194-199）：软件推进将撞上 Deq=环满，停下等事件；',
      'Deq 副本用 Transfer Event 的 TRB Pointer 回填（L186-190）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('xHC 取到 Cycle 转换=环空；软件推进将撞 Deq=环满。', '③ / 12');
  n3().opacity(0.9);
  yield* segA.deqTo(0, 0.4);
  yield* segA.consume(0);
  yield* segA.deqTo(1, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 所有权 ===== */
  const q4 = makeChip(
    view,
    '"All TRBs between the Dequeue Pointer and the Enqueue Pointer-1 are owned by the Consumer and may not be modified by the Producer." — §4.9.2 p154',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 18},
  );
  yield* stage.say('Deq 到 Enq 之间归消费者，互不改对方的格。', '④ / 12');
  q4().opacity(0.95);
  yield* flash(segA.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Link TRB 与 Toggle Cycle（回绕演示） ===== */
  const q5 = makeChip(
    view,
    '"If the Producer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its PCS flag. If the Consumer encounters a Toggle Cycle flag set in a Link TRB it shall toggle the state of its CCS flag." — §4.9.2 p154',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 17},
  );
  yield* stage.say('段尾 Link 回指段首：TC=1 时双方翻旗。', '⑤ / 12');
  q5().opacity(0.95);
  yield* segA.fill(2, 'N c1', C.driver);
  yield* segA.fill(3, 'N c1', C.driver);
  yield* segA.enqTo(4);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  q5().opacity(0);
  yield* waitFor(0.2);
  yield* segA.enqTo(9, 0.5);
  yield* flash(flags[0].ref, 1);
  flags[0].val().text('0');
  yield* segA.fill(0, 'N c0', C.driver);
  yield* segA.enqTo(1);
  yield* waitFor(1.2);

  /* ===== ⑥ 4.9.2.1 分段环 ===== */
  const n6 = makeNote(
    view,
    [
      'Ring Segment=一块连续内存（L302-304）；段尾必是 Link TRB',
      '（L307-308）。图 4-7 例：段 0=256 TRB + 段 1=244 TRB=500 格',
      '（498 可用）；Toggle Cycle 只在段 1 的 Link 上置位（L354）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('段=连续内存块；段尾必 Link；两段 500 格。', '⑥ / 12');
  n6().opacity(0.9);
  yield* flash(segB.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 4.9.2.2 指针推进 ===== */
  const q7 = makeChip(
    view,
    '"Software is responsible for advancing the Enqueue pointer. It does this by toggling the Cycle bit each pass through the ring as it writes TRBs." — §4.9.2.2 p156',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('Deq 每格 +16，遇 Link 跳段；Enq 软件翻 Cycle。', '⑦ / 12');
  q7().opacity(0.95);
  yield* segA.deqTo(2, 0.4);
  yield* segA.consume(1);
  yield* segA.deqTo(3, 0.4);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 图 4-8 推进算法走读 ===== */
  const n8a = makeNote(
    view,
    [
      '图 4-8 Enqueue 推进算法（L390-407）前三步：',
      '① 初始化：PCS=1；② 写 TRB？→Cycle=PCS、Enq+=16；',
      '③ Enq 落在 Link TRB？→是则跳 Ring Segment Pointer。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  const n8b = makeNote(
    view,
    [
      '后两步：④ Link 带 Toggle Cycle=1？→是则 PCS=−PCS',
      '（生产者侧）；消费者同构：Deq 遇 Link 跳段、TC=1 翻 CCS',
      '（L442-448）。PCS/CCS 不是寄存器，是双方内部旗（L409-412）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('推进算法五步走：写格、进针、验 Link、验 TC、翻旗。', '⑧ / 12');
  n8a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n8a().opacity(0);
  yield* waitFor(0.2);
  n8b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n8b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ 初始化规则组 ===== */
  const n9 = makeNote(
    view,
    [
      '建环规则（L413-448）：全部 TRB 的 Cycle 清 \'0\'；PCS=CCS=1。',
      'CCS 初值来源：传输环=Endpoint Context 的 DCS；命令环=CRCR',
      '的 RCS；事件环恒 \'1\'。Cycle 由生产者写、消费者只读。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('建环：全部 Cycle 清 0，PCS=CCS=1；初值看 DCS/RCS。', '⑨ / 12');
  n9().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n9().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑩ 4.9.2.3 扩环（段 C 接入） ===== */
  const segC: CellStripApi = makeCellStrip(view, {
    x: TLx(240), y: TLy(830), n: 4, w: 100, h: 56, tint: C.dev,
    labels: ['TRB', 'TRB', 'TRB', 'Link'],
  });
  const cTitle = makeChip(
    view,
    '新段 C · 软件分配清零 · Link→段 B 首',
    {x: TLx(445), y: TLy(890), w: 530, tint: C.dev, size: 15},
  );
  const n10a = makeNote(
    view,
    [
      '扩环（L453-632）：先分配清零新段 C——全 TRB 置 \'0\'、',
      '末位设 Link TRB、Seg Ptr 指向段 B 首格、TC=1；',
      '再把段 A 的 Link 改指段 C 首格（TC=1）。只许改',
      '生产者自有的 Link TRB（L459-460）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  const n10b = makeNote(
    view,
    [
      'Cycle 一致性两案（L621-632）：① 新段全清 \'0\' 并改指向',
      '新段的 TC 旗（图 4-10 即此案）；② 新段 Cycle 全置 \'1\'。',
      '二选一，保证 Enqueue Pointer 位置定义不自相矛盾。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('扩环只动自己的 Link：新段 C 四步接入。', '⑩ / 12');
  segC.group().opacity(1);
  cTitle().opacity(0.9);
  segC.value[3]().text('TC=1');
  n10a().opacity(0.9);
  yield* flash(segC.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n10a().opacity(0);
  yield* waitFor(0.2);
  n10b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n10b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑪ 中途改 Link 护栏 ===== */
  const n11 = makeNote(
    view,
    [
      '护栏（L524-531）：Link 非自有且非执行中 TD 的中间 TRB',
      '→可停环改后重启；是中间 TRB→停环后必须补一发',
      'Set TR Dequeue Pointer，让 xHC 冲掉缓存 TRB 再重启。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('改非自有 Link 先停环；是执行中 TRB 还要冲缓存。', '⑪ / 12');
  n11().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n11().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑫ 4.9.2.4 缩环 ===== */
  const n12 = makeNote(
    view,
    [
      '缩环（L633-643）：选定边界 Link TRB；改其 Ring Segment',
      'Pointer 映射掉中间段、或指到末段内某个 TRB；',
      '用各段 Link 的 TC 位保住 Enqueue 定义一致。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('缩环：挑边界 Link 映射掉中间段，TC 保一致。', '⑫ / 12');
  n12().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n12().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.9.2 Transfer Ring Management',
    rows: [
      {k: '双指针', v: 'Enq=软件 / Deq=xHC · 各持副本'},
      {k: 'Cycle', v: '写=PCS · 读比=CCS · 转换即边界'},
      {k: 'Link', v: '段尾回指 · TC=1 双方翻旗 · 可跨页'},
      {k: '扩缩', v: '只动自有 Link · Cycle 一致两案'},
      {k: '下一支', v: '§4.9.3 Command Ring Management'},
    ],
    tint: C.hc,
    w: 960,
    rowSize: 20,
  });
  view.add(sum.node);
  segA.group().opacity(0);
  segB.group().opacity(0);
  segC.group().opacity(0);
  cTitle().opacity(0);
  for (const f of flags) f.ref().opacity(0);
  yield* stage.say('传输环管理讲透——下一支：命令环的同与不同。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
