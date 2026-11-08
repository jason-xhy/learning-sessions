// §4.8.3 Endpoint Context State 端点上下文状态 —— xHCI 1.2b p146-149（R12 批 A）
// 判据（evidence/spec-48.txt，判据唯一事实源）：
//  - 五态图："The current state of an Endpoint Context is identified by its
//    respective Endpoint State (EP State) field. Figure 4-5 defines the Endpoint
//    States."（Running/Halted/Stopped/Error/Disabled，L159-168, p146）
//  - 迁移 1-4（L170-186, p146-147）：Address Device→DCEP Disabled→Running；
//    Configure Endpoint(A='1',D='0')→非 DCEP Disabled→Running；Configure(A='0',
//    D='1')/Reset Device→任意态→Disabled（DCEP 例外：Stopped→Running 或驻留
//    Stopped）；Disable Slot→槽内全部端点（含 DCEP）任意态→Disabled
//  - 迁移 6/7（L190-195, p147）：Configure(A='1',D='1')→非 DCEP Stopped→Running；
//    Stopped 态下 Set TR Dequeue Pointer 可在敲门铃前改起始 TRB
//  - Halt 族（L201-209, p147）："A Halt condition, for example, a Stall Error,
//    Invalid Stream Type Error, Invalid Stream ID Error, Babble Detected Error,
//    Event Lost Error, USB Transaction Error, or a Split Transaction Error detected
//    on a USB pipe shall cause a Running Endpoint to transition to the Halted
//    state. A Reset Endpoint Command shall be used to clear the Halt condition on
//    the endpoint and transition the endpoint to the Stopped state."；Stop Endpoint
//    于 Halted 态=无效+Context State Error
//  - DCEP STALL Note（L210-215, p147）：任一阶段 STALL→Halted；Reset Endpoint→
//    Stopped；"The Default Control Endpoint shall return to the Running state when
//    the Doorbell is rung for the next Setup Stage TD sent to the endpoint."
//  - Error 态（L225-230, p147）："A TRB Error condition should cause a Running
//    Endpoint to transition to the Error state. A Set TR Dequeue Pointer Command
//    shall be used to transition the endpoint to the Stopped state."；Stop Endpoint
//    同样无效+Context State Error
//  - Running 子态（L237-240, p148）："an endpoint in the Running state may be Busy
//    (actively processing TRBs on its Transfer Ring) or Idle (the endpoint is not
//    processing TRBs and waiting for a doorbell ring) sub-state, that is, an
//    endpoint does not exit the Running state if it exhausts its Transfer Ring."
//  - Stopped 态（L244-267, p148）：所有权交还软件（"allowing software to add,
//    delete, or modify any TD on the ring"）；"An endpoint in the Stopped state
//    shall not generate Transfer Events."；敲门→Running 且 EP State 字段
//    "shall be updated by the xHC to running before any Transfer Events are
//    generated"；Configure Endpoint 亦可（但不影响 DCEP）
//  - 软件镜像法（L288-320, p148-149）：EP State 可能滞后——软件维护内部变量，
//    四时机：命令完成事件更新 / TRB Error→Error / Stall/USB Transaction Error→
//    Halted / 敲门铃 Stopped→Running 时更新为 Running
//  降密度口径：Halt 族与 TRB Error 的规范原文判据存本注释，片内以口播+状态卡承载。
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
  makeLampRow,
  flash,
  CardApi,
  StageApi,
  RingApi,
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
      <Txt ref={t1} text={'§4.8.3'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Endpoint Context State'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={76} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'端点状态机 · xHCI 规范第 4 章 · p146–149'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.3);
  t3().opacity(1);
  yield* waitFor(0.25);
  yield* waitFor(0.5);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.8.3',
    zh: 'Endpoint Context State',
    en: 'Endpoint State Diagram · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.8.3 p146–149',
  });
  yield* lanesIn(stage);

  /* 五态灯排（图 4-5 语义重建）+ 传输环 + 门铃 */
  const lamps: LampApi[] = makeLampRow(view, {
    x: TLx(560), y: TLy(380), labels: ['Disabled', 'Stopped', 'Running', 'Halted', 'Error'],
    w: 200,
  });
  for (const l of lamps) l.ref().opacity(1);
  const gTitle = makeChip(
    view,
    'Figure 4-5 · Endpoint States（EP State 字段标识现态）',
    {x: TLx(1030), y: TLy(428), w: 620, tint: C.hc, size: 15},
  );
  gTitle().opacity(0.9);
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: 'Stopped 时所有权归软件', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  xfer.group().opacity(1);
  xfer.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  bell.ref().opacity(1);
  yield* waitFor(0.25);

  /* 现态卡（左带） */
  const cur: CardApi = makeCard({
    title: 'EP State 现态',
    rows: [
      {k: '现态', v: 'Disabled'},
      {k: '触发', v: '——'},
    ],
    tint: C.hc,
    w: 320,
    rowSize: 19,
  });
  view.add(cur.node);
  cur.ref().position(new Vector2(TLx(230), TLy(280)));
  cur.ref().opacity(1);

  function markState(i: number, color: string): void {
    for (let k = 0; k < lamps.length; k++) {
      lamps[k].dot().fill(k === i ? color : C.faint);
    }
  }

  /* ===== ① 五态总览 ===== */
  const q1 = makeChip(
    view,
    '"The current state of an Endpoint Context is identified by its respective Endpoint State (EP State) field. Figure 4-5 defines the Endpoint States." — §4.8.3 p146',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 18},
  );
  yield* stage.say('五态总览：EP State 字段标识端点现态。', '① / 8');
  q1().opacity(0.95);
  markState(0, C.warn);
  yield* flash(lamps[0].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 入口三命令（Address/Configure/Disable Slot） ===== */
  const n2 = makeNote(
    view,
    [
      '其余入口（L172-186）：Configure Endpoint(A=1,D=0) 让非 DCEP',
      '端点 Disabled→Running；Configure(A=0,D=1) 与 Reset Device',
      '把端点送回 Disabled（DCEP 例外：Stopped→Running 或驻留）；',
      'Disable Slot 则槽内全部端点（含 DCEP）一律回 Disabled。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('入口看三命令：点名 EP0、Configure 添满、Disable 连根拔。', '② / 8');
  cur.row(0)().text('Running（EP0）');
  cur.row(1)().text('Address Device');
  markState(2, C.ok);
  yield* flash(lamps[2].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(1.2);
  cur.row(0)().text('Disabled');
  cur.row(1)().text('Disable Slot');
  markState(0, C.warn);
  yield* flash(lamps[0].ref, 1);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ Running 的 Busy/Idle 子态 ===== */
  const q3 = makeChip(
    view,
    '"an endpoint in the Running state may be Busy (actively processing TRBs on its Transfer Ring) or Idle (the endpoint is not processing TRBs and waiting for a doorbell ring) sub-state." — §4.8.3 p148',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.ok, size: 17},
  );
  yield* stage.say('Running 内分 Busy 与 Idle：环空了也不退出。', '③ / 8');
  q3().opacity(0.95);
  cur.row(0)().text('Running');
  cur.row(1)().text('Busy / Idle 子态');
  markState(2, C.ok);
  yield* flash(lamps[2].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ Halt 族与复位（Stop EP 无效） ===== */
  const n4 = makeNote(
    view,
    [
      'Stop Endpoint 打在 Halted/Error 态上=无效（L206-209/227-230）：',
      '照发 Command Completion Event，Completion Code=Context State',
      'Error。DCEP 的 STALL 同走 Halted→Reset Endpoint→Stopped，',
      '下一支 Setup Stage TD 敲门铃才回 Running（L210-215）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('Halt 族压进 Halted、复位落 Stopped；停环命令无效。', '④ / 8');
  cur.row(0)().text('Halted');
  cur.row(1)().text('Stall 等 Halt 条件');
  markState(3, C.warn);
  yield* flash(lamps[3].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  cur.row(0)().text('Stopped');
  cur.row(1)().text('Reset Endpoint');
  markState(1, C.ok);
  yield* flash(lamps[1].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(1.0);
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ Error 态 ===== */
  yield* stage.say('TRB Error 进 Error：只有 Set TR Deq Ptr 拉回 Stopped。', '⑤ / 8');
  cur.row(0)().text('Error');
  cur.row(1)().text('TRB Error');
  markState(4, C.warn);
  yield* flash(lamps[4].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  cur.row(0)().text('Stopped');
  cur.row(1)().text('Set TR Dequeue Pointer');
  markState(1, C.ok);
  yield* flash(lamps[1].ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(1.4);

  /* ===== ⑥ Stopped：所有权交还 ===== */
  const n6 = makeNote(
    view,
    [
      'Stopped 态（L244-267）：xHC 交出环所有权——软件可加、删、',
      '改任何 TD；Stopped 态不产生 Transfer Event；敲门铃或',
      'Configure Endpoint 皆可回 Running（但 Configure 不影响 DCEP）。',
      '回 Running 时 EP State 字段先更新、Transfer Event 后发。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('Stopped：环所有权交还软件，TD 可增删改。', '⑥ / 8');
  yield* xfer.fill(1, 'TD edit', C.driver);
  yield* flash(xfer.group, 1);
  yield* waitFor(0.15);
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.0);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 敲门铃回 Running ===== */
  yield* stage.say('敲门回 Running：EP State 先行更新，事件后发。', '⑦ / 8');
  yield* bell.ring('1');
  cur.row(0)().text('Running');
  cur.row(1)().text('Doorbell ring');
  markState(2, C.ok);
  yield* flash(lamps[2].ref, 1);
  yield* waitFor(0.4);
  yield* xfer.deqTo(0, 0.4);
  yield* xfer.consume(0);
  yield* xfer.deqTo(1, 0.4);
  yield* waitFor(2.1);

  /* ===== ⑧ 软件镜像法 ===== */
  const n8 = makeNote(
    view,
    [
      'EP State 可能滞后（L288-320）——软件自记内部台账，四时机：',
      '① 命令完成事件到达→按事件更新；② Transfer Event 报 TRB',
      'Error→Error；③ 报 Stall/USB Transaction Error→Halted；',
      '④ 敲门铃送 Stopped→Running 时→自记 Running。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('状态以事件与门铃为准自记台账，别全信 EP State。', '⑧ / 8');
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.8.3 Endpoint Context State',
    rows: [
      {k: '五态', v: 'Disabled/Stopped/Running/Halted/Error'},
      {k: '入口', v: 'Address/Configure→Running · Disable→灭'},
      {k: '故障', v: 'Halt 族→Halted · TRB Error→Error'},
      {k: '恢复', v: 'Reset/Set TR DP→Stopped · 敲铃→Running'},
      {k: '台账', v: '软件四时机自记 EP State'},
      {k: '下一支', v: '§4.9.1 Transfer Descriptors'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 19,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  xfer.group().opacity(0);
  gTitle().opacity(0);
  cur.ref().opacity(0);
  for (const l of lamps) l.ref().opacity(0);
  yield* stage.say('端点一生五态走完——下一支进 TRB 环。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(2.8);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
