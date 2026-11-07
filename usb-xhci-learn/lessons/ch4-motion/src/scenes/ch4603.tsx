// §4.6.3 Enable Slot 使能槽位 —— xHCI 1.2b p94-95（R10 批 A；示例 Slot ID=1 为课程示例值）
// 判据（evidence/spec-46.txt，判据唯一事实源；与 ch45 §4.5 状态机衔接）：
//  - "The Enable Slot Command is issued by software to obtain an available Device
//    Slot and to transition a Device Slot from the Disabled to the Enabled state."
//                                                                    (L216-217, p94)
//  - "When an Enable Slot Command is processed by the xHC, it will look for an
//    available Device Slot. If a slot is available, the ID of a selected slot will
//    be returned in the Slot ID field of a successful Command Completion Event on
//    the Event Ring. If a Device Slot is not available, the Slot ID field shall be
//    cleared to ‘0’ and a No Slots Available Error shall be returned…" (L220-225, p94)
//  - "Upon the successful completion of an Enable Slot Command, system software
//    shall use the Slot ID to link a Device Context data structure to the slot by
//    writing a pointer to the Device Context in the Device Context Base Address
//    Array[Slot ID] location. Undefined operation may occur if the Context Base
//    Address Array entry is not updated prior to issuing a Command for the slot,
//    or ringing the Default Control Endpoint (0) doorbell."  (L226-231, p94)
//  - 有效性要求：Input Control Context / Slot Context / Endpoint Context 须
//    “valid”（§6.2.2 / §6.2.3.1 指路）                        (L232-249, p94-95)
//  - 软件侧："TRB Type = Enable Slot command (refer to Table 6-91)." (L256)
//    "Slot Type = value specified by the Protocol Slot Type field of the associated
//    xHCI Supported Protocol Capability structure (refer to Table 7-9)." (L258-260)
//    "Clear all other fields of the command TRB to ‘0’." (L262)
//    "Cycle bit = Command Ring’s PCS flag." (L264)；"Write the Host Controller
//    Doorbell with DB Target = Host Controller Command."             (L266-267)
//  - xHC 侧：完成事件分支——可用 "Slot ID = ID of the selected Device Slot." +
//    "Completion Code = Success (refer to Table 6-90)."；不可用 "Slot ID = ‘0’." +
//    "Completion Code = No Slots Available."                 (L279-291, p95)
//  - "The algorithm for Device Slot ID selection is xHC implementation dependent."
//                                                                    (L296, p95)
//  - Note："If this command is aborted … the Slot ID field should be considered by
//    software to be invalid (for example, no slot was allocated)." (L297-299, p95)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
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
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.3'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Enable Slot'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'使能槽位 · xHCI 规范第 4 章 · p94–95'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1 —— 课程示例值（实际由 xHC 自选）'}
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
    section: '§4.6.3',
    zh: 'Enable Slot',
    en: 'Enable Slot Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.3 p94–95',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 + DCBAA 条（本节主角道具） */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '驱动写入 / xHC 读取', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: 'xHC 写入 / 驱动读取', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); evt.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  const dcbaa: CellStripApi = makeCellStrip(view, {
    x: TLx(180), y: TLy(552), n: 5, w: 100, h: 60, tint: C.hc,
    labels: ['0', '1', '2', '3', '…'],
  });
  const dTitle = makeChip(
    view,
    'DCBAA · Slot ID 格 · 每项 64 位指针',
    {x: TLx(395), y: TLy(606), w: 530, tint: C.hc, size: 15},
  );
  dcbaa.group().opacity(1);
  dTitle().opacity(0.9);
  yield* waitFor(0.25);

  /* 槽位状态卡（常驻，§4.5 状态机回扣） */
  const slot: CardApi = makeCard({
    title: '槽位状态',
    rows: [
      {k: '现态', v: 'Disabled'},
      {k: '目标', v: 'Enabled'},
    ],
    tint: C.hc,
    w: 300,
    rowSize: 20,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(230), TLy(280)));

  /* ===== ① 目的 ===== */
  const q1 = makeChip(
    view,
    '"The Enable Slot Command is issued by software to obtain an available Device Slot and to transition a Device Slot from the Disabled to the Enabled state." — §4.6.3 p94',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('目的：拿一个可用槽，Disabled→Enabled。', '① / 6');
  slot.ref().opacity(1);
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.5);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 软件侧：摆 Enable Slot TRB ===== */
  const trb: CardApi = makeCard({
    title: 'Enable Slot TRB',
    rows: [
      {k: 'TRB Type', v: 'Enable Slot'},
      {k: 'Slot Type', v: '协议槽型（Table 7-9）'},
      {k: '其余字段', v: '清 0'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 380,
    rowSize: 19,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(590), TLy(290)));
  yield* stage.say('摆 Enable Slot TRB：Slot Type 按协议能力。', '② / 6');
  yield* cmd.fill(0, 'EnSlot', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q2 = makeChip(
    view,
    '"TRB Type = Enable Slot command (refer to Table 6-91)." "Slot Type = value specified by the Protocol Slot Type field of the associated xHCI Supported Protocol Capability structure (refer to Table 7-9)." — §4.6.3 p94',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  q2().opacity(0.95);
  yield* waitFor(2.75);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 敲门铃 ===== */
  yield* stage.say('写门铃：HC 命令目标。', '③ / 6');
  yield* bell.ring('0');
  yield* waitFor(1.5);
  yield* cmd.deqTo(0, 0.4);
  yield* waitFor(0.2);

  /* ===== ④ xHC 自选槽：双分支 ===== */
  const c4: CardApi = makeCard({
    title: '自选槽 · 双分支',
    rows: [
      {k: '可用', v: 'Slot ID=n · CC=Success'},
      {k: '不可用', v: 'Slot ID=0 · No Slots Available'},
      {k: '算法', v: 'xHC 实现自定'},
    ],
    tint: C.evt,
    w: 560,
    rowSize: 19,
  });
  view.add(c4.node);
  const q4 = makeChip(
    view,
    '"If a Device Slot is not available, the Slot ID field shall be cleared to ‘0’ and a No Slots Available Error shall be returned in the Command Completion Event." — §4.6.3 p94',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 18},
  );
  yield* stage.say('xHC 自选槽：可用给 ID，不可用报错。', '④ / 6');
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* cardIn(c4, new Vector2(TLx(1250), TLy(270)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  flash(dcbaa.cell[1], 1);
  dcbaa.cell[1]().stroke(C.hc);
  dcbaa.value[1]().text('Slot ID=1');
  yield* waitFor(1.2);
  c4.ref().opacity(0);
  yield* waitFor(0.15);
  c4.ref().remove();
  q4().opacity(0.95);
  yield* waitFor(2.4);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 软件跟进：DCBAA[Slot ID] ← 指针 ===== */
  const q5 = makeChip(
    view,
    '"…system software shall use the Slot ID to link a Device Context data structure to the slot by writing a pointer to the Device Context in the Device Context Base Address Array[Slot ID] location." — §4.6.3 p94',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  const n5 = makeChip(
    view,
    '先写后用：发本槽命令 / 敲 EP0 门铃前未写 DCBAA 表项 = 未定义操作（L229-231）',
    {x: TLx(1090), y: TLy(348), w: 1300, tint: C.warn, size: 17},
  );
  yield* stage.say('拿 Slot ID 写 DCBAA[n]——挂上指针。', '⑤ / 6');
  q5().opacity(0.95);
  yield* waitFor(0.3);
  dcbaa.value[1]().text('ctx 指针');
  yield* flash(dcbaa.group, 1);
  n5().opacity(0.95);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q5().opacity(0);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 有效性指路 + 状态回扣 ===== */
  const n6 = makeChip(
    view,
    'Input Context 须 valid：Input Control / Slot / Endpoint Context——细则 §6.2.2 · §6.2.3.1（L232-249）',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('槽已 Enabled——§4.5 状态机第一级达成。', '⑥ / 6');
  n6().opacity(0.95);
  slot.ref().opacity(0);
  yield* waitFor(0.15);
  slot.row(1)().text('Enabled ✓');
  slot.ref().opacity(1);
  yield* waitFor(0.2);
  yield* flash(slot.ref, 1);
  yield* waitFor(2.75);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.3 Enable Slot',
    rows: [
      {k: '命令侧', v: 'Type=Enable Slot · Slot Type'},
      {k: '事件侧', v: 'Slot ID xHC 自选 · CC=Success'},
      {k: '跟进', v: 'DCBAA[Slot ID] ← 指针'},
      {k: '下一支', v: '§4.6.4 Disable Slot'},
    ],
    tint: C.hc,
    w: 900,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  dcbaa.group().opacity(0);
  dTitle().opacity(0);
  slot.ref().opacity(0);
  yield* stage.say('槽会开了——下一支：Disable Slot。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
