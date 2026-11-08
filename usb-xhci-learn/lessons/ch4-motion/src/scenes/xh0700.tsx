// §4.7 Doorbells 门铃 —— xHCI 1.2b p142-143（R12 批 A；4.7 单节无小节，场景名 xh0700）
// 判据（evidence/spec-47.txt，判据唯一事实源）：
//  - "The xHCI presents an array of up to 256 32-bit Doorbell Registers (refer to
//    section 5.6), which reside in MMIO space and are indexed by Device Slot ID."
//    "The base of the Doorbell Register Array is pointed to by the Doorbell Offset
//    (DBOFF) register in the xHCI Capability Registers (refer to section 5.3.7)."
//                                                                    (L3-6, p142)
//  - "Each Doorbell Register contains a DB Target field, which is used to indicate
//    the reason for a software reference to the register. System software "rings" a
//    doorbell by writing a Doorbell Register with the appropriate value in the DB
//    Target field."                                                  (L7-10, p142)
//  - DB0=HC 专用："there is only one valid value for the DB Target field, 0 (Host
//    Controller Command). The remaining values (1-255) are reserved." (L11-13, p142)
//  - DB1-255=Device Context Doorbells："There is a 1:1 mapping of Device Context
//    Doorbell registers to Device Slots…The DB Target and DB Stream ID fields of a
//    Device Context Doorbell register is used to identify which Transfer Ring of a
//    device has been modified."                                      (L14-20, p142)
//  - "The xHC internally records all Doorbell Register write references…There is no
//    need to "clear" a Doorbell Register." 双环=两次写                (L27-33, p143)
//  - "Doorbell registers return no information when read."            (L34, p143)
//  - 禁写：slot Disabled / DB Target 指向 Disabled 端点（L35-40）；违例→"a Completion
//    Code of Endpoint Not Enabled Error…This transfer Event TRB shall be posted to
//    the Primary Event Ring."                                        (L41-47, p143)
//  - "The xHC shall ignore doorbell references to endpoints in the Halted or Error
//    state."                                                         (L51-54, p143)
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
  makeCellStrip,
  flash,
  CardApi,
  StageApi,
  RingApi,
  CellStripApi,
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
      <Txt ref={t1} text={'§4.7'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Doorbells 门铃'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Doorbell Registers · xHCI 规范第 4 章 · p142–143'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.3);
  t3().opacity(1);
  yield* waitFor(0.3);
  yield* waitFor(0.7);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.7',
    zh: 'Doorbells 门铃',
    en: 'Doorbell Registers · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.7 p142–143',
  });
  yield* lanesIn(stage);

  /* 双环：命令环（DB0 演示）+ 传输环（DB1 演示） */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: 'DB0 · HC 命令', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: 'DB1 · DB Target=EP', tint: C.dev, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); xfer.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  yield* waitFor(0.25);

  /* 门铃阵列条（xHC 泳道左下，同 DCBAA 位型） */
  const dbs: CellStripApi = makeCellStrip(view, {
    x: TLx(180), y: TLy(552), n: 5, w: 100, h: 60, tint: C.hc,
    labels: ['DB0', 'DB1', 'DB2', 'DB3', '…255'],
  });
  const dTitle = makeChip(
    view,
    '门铃阵列 · ≤256×32-bit · MMIO · DBOFF 指基址 · Slot ID 索引',
    {x: TLx(395), y: TLy(606), w: 530, tint: C.hc, size: 15},
  );
  dbs.group().opacity(1);
  dTitle().opacity(0.9);
  dbs.value[0]().text('HC 专用');
  yield* waitFor(0.25);

  /* ===== ① 阵列与索引 ===== */
  const q1 = makeChip(
    view,
    '"The xHCI presents an array of up to 256 32-bit Doorbell Registers (refer to section 5.6), which reside in MMIO space and are indexed by Device Slot ID." — §4.7 p142',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('门铃=一排寄存器：最多 256 个，按槽号索引。', '① / 5');
  q1().opacity(0.95);
  yield* flash(dbs.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② DB Target：写=敲门；DB0 专用 → 命令环推进 ===== */
  const q2 = makeChip(
    view,
    '"System software "rings" a doorbell by writing a Doorbell Register with the appropriate value in the DB Target field." — §4.7 p142',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  const n2 = makeNote(
    view,
    [
      'DB0=主机控制器专用（L11-13）：DB Target 唯一合法值 0',
      '（Host Controller Command），其余 1-255 保留。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('敲门=写 DB Target；DB0 是命令环专用铃。', '② / 5');
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.6);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.4);
  n2().opacity(0);
  yield* waitFor(0.25);
  yield* bell.ring('0');
  yield* cmd.fill(0, 'Cmd', C.driver);
  yield* cmd.enqTo(1);
  yield* waitFor(0.4);
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(1.4);

  /* ===== ③ DB1-255 设备门铃 → 传输环推进 ===== */
  const q3 = makeChip(
    view,
    '"There is a 1:1 mapping of Device Context Doorbell registers to Device Slots…The DB Target and DB Stream ID fields of a Device Context Doorbell register is used to identify which Transfer Ring of a device has been modified." — §4.7 p142',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 18},
  );
  yield* stage.say('DB1-255 一对一绑槽：先上工作，再敲铃。', '③ / 5');
  dbs.cell[1]().stroke(C.dev);
  dbs.value[1]().text('Slot1');
  q3().opacity(0.95);
  yield* xfer.fill(0, 'TD', C.dev);
  yield* xfer.enqTo(1);
  yield* flash(dbs.cell[1], 1);
  dbs.value[1]().text('EP1');
  yield* waitFor(0.4);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* waitFor(1.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 两环=两次写 + 无需清零/读无信息 ===== */
  const n4 = makeNote(
    view,
    [
      'xHC 记录每次门铃写，判定命令环/传输环是否有新工作',
      '（L27-29）——无需"清"门铃。两个环各上工作=写两次',
      '（L29-33）。门铃读回无信息（L34）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('两个环=敲两次铃；门铃不清零、读回无信息。', '④ / 5');
  n4().opacity(0.9);
  yield* xfer.fill(1, 'TD', C.dev);
  yield* xfer.enqTo(2);
  yield* waitFor(0.4);
  yield* waitFor(3.3);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 禁写与违例事件 ===== */
  const q5 = makeChip(
    view,
    '"The xHC shall ignore doorbell references to endpoints in the Halted or Error state." — §4.7 p143',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 18},
  );
  const w5: CardApi = makeCard({
    title: '禁写与违例（L35-47）',
    rows: [
      {k: '禁写一', v: '槽=Disabled'},
      {k: '禁写二', v: 'DB Target 指向 Disabled 端点'},
      {k: '违例回执', v: 'CC=Endpoint Not Enabled Error'},
      {k: '去向', v: 'Primary Event Ring'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(w5.node);
  yield* stage.say('Disabled 不许敲：敲了回 ENEE 事件；Halted/Error 直接忽略。', '⑤ / 5');
  q5().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.9);
  q5().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(w5, new Vector2(TLx(1180), TLy(300)));
  yield* waitFor(0.7);
  w5.ref().opacity(0);
  yield* waitFor(0.15);
  w5.ref().remove();
  const c5: CardApi = makeCard({
    title: 'Transfer Event（违例回执）',
    rows: [
      {k: 'TRB Ptr/Length/ED', v: '清 \'0\''},
      {k: 'Completion Code', v: 'Endpoint Not Enabled Error'},
      {k: 'Slot/Endpoint ID', v: '被敲的槽/端点'},
    ],
    tint: C.evt,
    w: 500,
    rowSize: 18,
  });
  view.add(c5.node);
  yield* cardIn(c5, new Vector2(TLx(1180), TLy(300)));
  yield* flash(bell.ref, 1);
  yield* waitFor(2.0);
  c5.ref().opacity(0);
  yield* waitFor(0.2);
  c5.ref().remove();

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.7 Doorbells',
    rows: [
      {k: '阵列', v: '≤256×32-bit · Slot ID 索引'},
      {k: 'DB0', v: 'HC 专用 · Target=0'},
      {k: 'DB1-255', v: '1:1 槽 · Target+StreamID 定环'},
      {k: '纪律', v: 'Disabled 禁敲 · 读无信息 · 免清零'},
      {k: '下一支', v: '§4.8.1 Endpoint Addressing'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  dbs.group().opacity(0);
  dTitle().opacity(0);
  yield* stage.say('一排铃敲开两代环——下一支：端点编址。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.1);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
