// §4.4 Device Detach 设备拔除 —— xHCI 1.2b p81
// 判据（evidence/spec-44.txt，9 行全量；示例=根端口 1 设备 · Slot ID=1 为课程示例值）：
//  - "When the device is detached from a Root Hub port, the PORTSC Current
//    Connection Status (CCS) bit shall be cleared to ‘0’ and the Connect Status
//    Change (CSC) bit shall be set to ‘1’."                    (L2-4, p81)
//  - "If a ‘0’ to ‘1’ transition of PSCEG (4.19.2), the xHC shall report the
//    change through a Port Status Change Event."               (L4-5, p81)
//  - "After the detection of a detach, system software shall disable the Device
//    Slot associated with the port by issuing a Disable Slot Command for the
//    affected slot."                                           (L5-8, p81)
//  - "Refer to section 4.6.4 for a description of the Disable Slot
//    command."                                                 (L7-8, p81)
//  - 回扣 §4.5.3.2（p87）：槽转 Disabled 后 DCBAA 指针无效、唯一允许
//    Enable Slot（spec-45.txt L284-288）；"Slot ID 可回收"为课程表述
//    （由 Disable Slot 完成即槽可重新分配推得）
import {makeScene2D, Rect, Txt, Circle, Line} from '@motion-canvas/2d';
import {createRef, Vector2, all, waitFor} from '@motion-canvas/core';
import {C, FONT, G, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeBell,
  makeChip,
  makeNote,
  makeLampRow,
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
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'设备拔除'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Device Detach · xHCI 规范第 4 章 · p81'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：根端口 1 上的设备 · Slot ID=1 —— 均为课程示例值'}
        x={0} y={TLy(690)} fontFamily={FONT.sans} fontSize={27} fill={C.faint} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.3);
  t3().opacity(1);
  yield* waitFor(0.3);
  t4().opacity(1);
  yield* waitFor(0.3);
  yield* waitFor(0.6);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  t4().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove(); t4().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.4',
    zh: '设备拔除',
    en: 'Device Detach · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.4 p81',
  });
  yield* lanesIn(stage);

  /* 两条环（xHC 泳道上下缘；无传输环——拔除不碰管道） */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '系统内存 · 驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: '系统内存 · xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); evt.markLink();

  /* PORTSC 灯排（中带右：CCS/CSC 本节主角，PSCEG 陪跑） */
  const psc = makeLampRow(view, {
    x: TLx(770), y: TLy(566), labels: ['CCS', 'CSC', 'PSCEG'], w: 170,
  });
  for (const l of psc) l.ref().opacity(1);
  yield* waitFor(0.15);
  yield* all(psc[0].on(C.ok), psc[0].set('1'));
  yield* psc[1].set('0');
  yield* psc[2].set('0');

  /* DCBAA 缩略条（中带左；表项=系统内存 · 软件装载）——条与标题条整体上提，
     让开事件环左侧标签带（设计坐标 x≈385-595, y≈631-687） */
  const dcbaa: CellStripApi = makeCellStrip(view, {
    x: TLx(180), y: TLy(552), n: 5, w: 100, h: 60, tint: C.hc,
    labels: ['0', '1', '2', '3', '…'],
  });
  const dTitle = makeChip(
    view,
    'DCBAA · 255 项（表项=64 位指针）',
    {x: TLx(395), y: TLy(606), w: 530, tint: C.hc, size: 15},
  );
  dcbaa.group().opacity(1);
  dTitle().opacity(0.9);
  dcbaa.cell[1]().stroke(C.hc);
  dcbaa.value[1]().text('ctx 指针');

  /* 设备盒 + 根端口卡 + 连接线（设备泳道） */
  const devBox = createRef<Rect>();
  const devState = createRef<Txt>();
  view.add(
    <Rect ref={devBox} position={[TLx(400), TLy(G.laneDevY + 100)]} width={330} radius={12}
      fill={C.panelHi} stroke={C.dev} lineWidth={2} padding={[14, 16]} layout direction={'column'} gap={8} opacity={0}>
      <Rect layout gap={10} alignItems={'center'}>
        <Circle size={14} fill={C.dev} />
        <Txt text={'USB 设备（示例）'} fontFamily={FONT.sans} fontSize={22}
          fontWeight={700} fill={C.dev} />
      </Rect>
      <Rect layout gap={10}>
        <Txt text={'设备状态'} fontFamily={FONT.sans} fontSize={20} fill={C.dim} />
        <Txt ref={devState} text={'Configured'} fontFamily={FONT.mono} fontSize={20} fill={C.ink} />
      </Rect>
    </Rect>,
  );
  const wire = createRef<Line>();
  view.add(
    <Line
      ref={wire}
      points={[[TLx(568), TLy(G.laneDevY + 100)], [TLx(1002), TLy(G.laneDevY + 100)]]}
      stroke={C.dev}
      lineWidth={4}
      opacity={0}
    />,
  );
  const port = makeChip(
    view,
    '根端口 1 · Root Hub Port 1（示例）',
    {x: TLx(1200), y: TLy(G.laneDevY + 100), w: 380, tint: C.dev, size: 19},
  );

  /* 设备槽状态卡（驱动泳道左） */
  const slot: CardApi = makeCard({
    title: '设备槽',
    rows: [
      {k: 'Slot ID', v: '1（示例）'},
      {k: '状态', v: 'Configured'},
    ],
    tint: C.hc,
    w: 300,
    rowSize: 20,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(250), TLy(290)));

  devBox().opacity(1);
  wire().opacity(0.9);
  port().opacity(0.95);
  slot.ref().opacity(1);
  yield* waitFor(0.6);

  /* ===== ① 拔线 ===== */
  yield* stage.say('拔线：CCS 清 0、CSC 置 1。', '① / 4');
  wire().opacity(0);
  yield* devBox().position(new Vector2(TLx(1580), TLy(G.laneDevY + 150)), 0.7);
  devBox().opacity(0.45);
  devState().text('已断开');
  yield* all(psc[0].off(), psc[0].set('0'));
  yield* all(psc[1].on(C.warn), psc[1].set('1'));
  yield* flash(port, 1);
  const q1 = makeChip(
    view,
    '"When the device is detached from a Root Hub port, the PORTSC Current Connection Status (CCS) bit shall be cleared to ‘0’ and the Connect Status Change (CSC) bit shall be set to ‘1’." — §4.4 p81',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q1().opacity(0);
  yield* waitFor(0.3);

  /* ===== ② PSCEG → Port Status Change Event ===== */
  yield* stage.say('PSCEG 0→1：端口状态变化事件上环。', '② / 4');
  yield* all(psc[2].on(C.warn), psc[2].set('1'));
  yield* evt.fill(0, 'PSCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0);
  yield* evt.consume(0);
  yield* evt.deqTo(1);
  const q2 = makeChip(
    view,
    '"If a ‘0’ to ‘1’ transition of PSCEG (4.19.2), the xHC shall report the change through a Port Status Change Event." — §4.4 p81',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 18},
  );
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q2().opacity(0);
  yield* waitFor(0.3);

  /* ===== ③ 规范义务 → Disable Slot Command ===== */
  const quote = makeNote(
    view,
    [
      '"After the detection of a detach, system software shall disable the Device Slot associated with the port by issuing a Disable Slot Command for the affected slot."',
      '—— §4.4 p81（规范义务，逐字）',
    ],
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver},
  );
  yield* stage.say('义务：检出拔除 → 发 Disable Slot。', '③ / 4');
  quote().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  quote().opacity(0);
  yield* waitFor(0.3);
  const cmdCard: CardApi = makeCard({
    title: 'Command TRB',
    tag: '示例：Disable Slot',
    rows: [
      {k: 'TRB Type', v: 'Disable Slot'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Cycle bit', v: '1'},
    ],
    tint: C.driver,
    w: 380,
  });
  view.add(cmdCard.node);
  yield* cardIn(cmdCard, new Vector2(TLx(590), TLy(290)));
  yield* cmdCard.ref().position(cmd.cell(0), 0.5);
  yield* cmd.fill(0, 'DisSlot', C.driver);
  cmdCard.ref().opacity(0);
  yield* cmd.enqTo(1);
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  yield* waitFor(0.15);
  yield* bell.ring('0');
  yield* stage.say('Disable Slot 上环，敲门铃 0（§4.1 同款）。', '③ / 4');
  yield* waitFor(2.8);
  yield* cmd.deqTo(0);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1);

  /* ===== ④ 完成事件 → 槽回收 ===== */
  yield* stage.say('完成事件回话：DCBAA[1] 清空，槽转 Disabled。', '④ / 4');
  yield* evt.fill(1, 'CCE', C.evt);
  yield* evt.enqTo(2);
  dcbaa.value[1]().text('0 / 空');
  dcbaa.cell[1]().stroke(C.edge);
  yield* flash(dcbaa.group, 1);
  slot.ref().opacity(0);
  yield* waitFor(0.15);
  slot.row(1)().text('Disabled');
  slot.ref().opacity(1);
  yield* waitFor(0.2);
  const q3 = makeChip(
    view,
    '槽转 Disabled：DCBAA 指针无效，此态唯一允许的命令是 Enable Slot（§4.5.3.2 p87）——Slot ID 随即可回收（课程表述）。',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 19},
  );
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* evt.deqTo(1);
  yield* evt.consume(1);
  yield* evt.deqTo(2);
  yield* waitFor(2.2);
  q3().opacity(0);
  yield* waitFor(0.3);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.4 拔除序列',
    rows: [
      {k: '① 拔线', v: 'CCS 1→0 · CSC 0→1'},
      {k: '② 事件', v: 'PSCEG 0→1 → Port Status Change Event'},
      {k: '③ 命令', v: 'Disable Slot Command（命令环 + 门铃 0）'},
      {k: '④ 回收', v: 'DCBAA 清空 · 槽 Disabled · 只许 Enable Slot'},
    ],
    tint: C.hc,
    w: 800,
    rowSize: 21,
  });
  view.add(sum.node);
  const q4 = makeChip(
    view,
    '"Refer to section 4.6.4 for a description of the Disable Slot command." — §4.4 p81',
    {x: TLx(1080), y: TLy(265), w: 1280, tint: C.dim, size: 19},
  );
  port().opacity(0);
  devBox().opacity(0);
  bell.ref().opacity(0);
  yield* waitFor(0.25);
  yield* stage.say('拔除闭环走完——细节见 §4.6.4。', '完');
  q4().opacity(0.95);
  yield* waitFor(0.3);
  yield* cardIn(sum, new Vector2(TLx(960), TLy(850)));
  yield* waitFor(3.0);
  q4().opacity(0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
