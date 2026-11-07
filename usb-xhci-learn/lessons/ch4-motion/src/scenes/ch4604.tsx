// §4.6.4 Disable Slot 停用槽位 —— xHCI 1.2b p96-97（R10 批 A；示例 Slot ID=1 为课程示例值）
// 判据（evidence/spec-46.txt，判据唯一事实源；与 ch44 §4.4 拔除义务、ch45 §4.5 状态机衔接）：
//  - "The Disable Slot Command is issued by software to force a Device Slot to the
//    Disabled state. A typical use would be to free a Device Slot when a USB device
//    is disconnected."                                               (L308-310, p96)
//  - xHC 处置五项："Disable the Doorbell register for the slot" (L313)；
//    "Free any bandwidth allocated to the periodic endpoints of the device" (L315)；
//    "Terminate any slot related USB activity (for example, packet transfers)" (L317)；
//    "Free any internal resources associated with the slot" (L319)；
//    "Internally flag the slot as “available” for subsequent reassignment by an
//    Enable Slot Command. that is, the Device Context Base Address Array entry for
//    the slot is no longer considered valid by the xHC and software can free the
//    Device Context, Transfer Ring, Stream Context Array, etc."  (L321-325, p96)
//  - "A Command Completion Event is always returned for a Disable Slot Command."
//                                                                    (L326, p96)
//  - 前提 Note（否则未定义行为）："Any active endpoints associated with the slot
//    shall be in the Stopped state or Idle in the Running state, and any
//    outstanding Transfer Events shall have been received."；"Any commands targeted
//    at the slot that is being disabled shall be complete, that is, any outstanding
//    Command Completion Events for the slot have been received." (L330-339, p96)
//  - 软件侧："TRB Type = Disable Slot Command (refer to Table 6-91)." (L346)
//    "Slot ID = ID of the Device Slot to be disabled." (L348)
//    "Clear all other fields of the command TRB to ‘0’." (L350)
//    "Cycle bit = Command Ring’s PCS flag." (L352)；"Write the Host Controller
//    Doorbell with DB Target = Host Controller Command."             (L354-355)
//  - xHC 侧："Slot ID = The value of the command’s Slot ID." (L373)；曾 Enable→
//    "Any xHC resources assigned to the Device Slot are freed and the Device Slot
//    is made available for reassignment." + "The Slot State of the associated Slot
//    Context is set to Disabled." + "Completion Code = Success (refer to Table
//    6-90)."；否则 "Completion Code = Slot Not Enabled Error." (L375-387, p97)
//  - Note："After software receives the Command Completion TRB for a Disable Slot
//    Command it shall clear the respective DCBAA entry to ‘0’. This action allows
//    the xHC to identify valid vs. invalid Device Slots after a Restore State
//    operation."                                                     (L392-395, p97)
//  - Note："Any pending events not already posted to an Event Ring may be aborted
//    when this command is executed."                                 (L396-397, p97)
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
      <Txt ref={t1} text={'§4.6.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Disable Slot'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'停用槽位 · xHCI 规范第 4 章 · p96–97'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1（已 Enabled 的槽）—— 课程示例值'}
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
    section: '§4.6.4',
    zh: 'Disable Slot',
    en: 'Disable Slot Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.4 p96–97',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 + DCBAA 条（表项 1 在用——本节要拆的就是它） */
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
  dcbaa.cell[1]().stroke(C.hc);
  dcbaa.value[1]().text('ctx 指针');
  yield* waitFor(0.25);

  /* 槽位状态卡（常驻，§4.5 状态机回扣） */
  const slot: CardApi = makeCard({
    title: '槽位状态',
    rows: [
      {k: '现态', v: 'Enabled（示例）'},
      {k: '目标', v: 'Disabled'},
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
    '"The Disable Slot Command is issued by software to force a Device Slot to the Disabled state. A typical use would be to free a Device Slot when a USB device is disconnected." — §4.6.4 p96',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  yield* stage.say('目的：强制槽回 Disabled，释放资源。', '① / 6');
  slot.ref().opacity(1);
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 前提（Note，否则未定义行为） ===== */
  const n2 = makeNote(
    view,
    [
      '前提 Note——不满足则未定义行为（L330-339）：',
      '① 活动端点处于 Stopped 或 Idle-in-Running；在飞 Transfer Event 已收完。',
      '② 发往本槽的命令已完结：本槽在途的完成事件已收完。',
    ],
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn},
  );
  yield* stage.say('前提：端点停摆、在飞事件收干净。', '② / 6');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.3);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Disable Slot TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Disable Slot TRB',
    rows: [
      {k: 'TRB Type', v: 'Disable Slot'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 380,
    rowSize: 20,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(590), TLy(290)));
  yield* stage.say('摆 Disable Slot TRB（Slot ID=1），敲 HC 门铃。', '③ / 6');
  yield* cmd.fill(0, 'DisSlot', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"Slot ID = ID of the Device Slot to be disabled." "Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.4 p96',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 18},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.0);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 处置五项 ===== */
  const c4: CardApi = makeCard({
    title: 'xHC 处置五项（L313-325）',
    rows: [
      {k: '门铃', v: '禁用本槽门铃寄存器'},
      {k: '带宽', v: '放周期端点带宽'},
      {k: '传输', v: '断在飞 USB 传输'},
      {k: '资源', v: '放内部资源'},
      {k: '槽', v: '标记 “available” 可重用'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 19,
  });
  view.add(c4.node);
  const ch4 = makeChip(
    view,
    'DCBAA 表项随之失效：软件可释放 Device Context / Transfer Ring / Stream Context Array 等',
    {x: TLx(1090), y: TLy(400), w: 1300, tint: C.hc, size: 17},
  );
  yield* stage.say('处置五项：门铃/带宽/传输/资源/槽可重用。', '④ / 6');
  yield* cardIn(c4, new Vector2(TLx(1050), TLy(250)));
  ch4().opacity(0.95);
  dcbaa.value[1]().text('失效');
  dcbaa.cell[1]().stroke(C.edge);
  yield* flash(dcbaa.group, 1);
  yield* waitFor(3.0);
  ch4().opacity(0);
  c4.ref().opacity(0);
  yield* waitFor(0.25);
  c4.ref().remove();

  /* ===== ⑤ 完成事件必回 ===== */
  const c5: CardApi = makeCard({
    title: '完成事件 · 双分支',
    rows: [
      {k: 'Slot ID', v: '照抄命令 TRB'},
      {k: '曾 Enable', v: '资源释放 · CC=Success'},
      {k: 'Slot State', v: '→ Disabled'},
      {k: '未 Enable', v: 'Slot Not Enabled Error'},
    ],
    tint: C.evt,
    w: 500,
    rowSize: 19,
  });
  view.add(c5.node);
  const q5 = makeChip(
    view,
    '"A Command Completion Event is always returned for a Disable Slot Command." — §4.6.4 p96',
    {x: TLx(1090), y: TLy(390), w: 1300, tint: C.evt, size: 18},
  );
  yield* stage.say('完成事件必回：Slot ID 照抄，CC=Success。', '⑤ / 6');
  yield* cardIn(c5, new Vector2(TLx(1250), TLy(255)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  q5().opacity(0.95);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(2.6);
  q5().opacity(0);
  c5.ref().opacity(0);
  yield* waitFor(0.25);
  c5.ref().remove();

  /* ===== ⑥ 软件收尾：DCBAA 清 0 ===== */
  const n6 = makeNote(
    view,
    [
      '"After software receives the Command Completion TRB for a Disable Slot Command it shall clear the respective DCBAA entry to ‘0’."（L392-395）',
      'Restore State 后，xHC 靠表项是否为 0 辨别有效/无效槽。',
      'Note：执行本命令时，未上事件环的挂起事件可被弃置（L396-397）。',
    ],
    {x: TLx(1000), y: TLy(265), w: 1000, tint: C.driver},
  );
  yield* stage.say('收尾：DCBAA[n] 清 0。', '⑥ / 6');
  n6().opacity(0.9);
  dcbaa.value[1]().text('0 / 空');
  yield* flash(dcbaa.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.1);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.4 Disable Slot',
    rows: [
      {k: '用途', v: '强制 Disabled（拔设备释放槽）'},
      {k: '前提', v: '端点停摆 · 在飞事件收完'},
      {k: 'xHC', v: '五项处置 + 槽标可重用'},
      {k: '下一支', v: '§4.6.5 Address Device（批 B）'},
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
  yield* stage.say('槽回 Disabled，等待下次 Enable Slot。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
