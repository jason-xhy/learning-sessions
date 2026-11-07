// §4.6.11 Reset Device 复位设备 —— xHCI 1.2b p128-130（R10 批 B；示例 Slot ID=1 为课程示例值）
// 判据（evidence/spec-46.txt L2347-2454，判据唯一事实源）：
//  - 目的："The Reset Device Command is used by software to inform the xHC that the
//    USB Device associated with a Device Slot has been Reset (by either; setting the
//    Root Hub port PR flag if the device is attached to a Root Hub port, or issuing a
//    SetPortFeature(PORT_RESET) request the external hub port upstream of the device)."
//                                                                    (L2349-2353, p128)
//  - 复位操作本身已置的形态："the reset operation sets the Slot State field to the
//    Default state and the USB Device Address field to '0'. The reset operation also
//    disables all endpoints of the slot except for the Default Control Endpoint by
//    setting the Endpoint Context EP State field to Disabled in all enabled Endpoint
//    Contexts."                                            (L2353-2357, p128)
//  - 前提："Software should stop all endpoint activity before issuing a Reset Device
//    Command."                                             (L2357-2358, p128)
//  - xHC 对非 DCEP 五项："Terminate any USB activity (for example, packet transfers)."
//    (L2361) "Disable the endpoints' Doorbell." (L2363) "Drop any pending events not
//    already posted to an Event Ring." (L2365) "Free any bandwidth allocated to the
//    periodic endpoints." (L2367) "Free any internal resources associated with the
//    endpoint."                                            (L2369, p128)
//  - 对 DCEP："the xHC shall terminate any USB activity, abort any pending events not
//    already posted to an Event Ring, and transition the endpoint to the Running
//    state."                                               (L2370-2372, p128)
//  - 未成功复位警告："Undefined behavior may occur if this command is executed and the
//    device associated with it is not successfully reset. For example, if the USB
//    device is not in the Default state, then a subsequent Address Device Command
//    shall fail."                                          (L2372-2375, p128)
//  - 发行（无 Input Context 引用）："TRB Type = Reset Device Command" (L2391) /
//    "Slot ID = The ID of the Device Slot to reset." (L2393) / "Clear all other fields
//    of the command TRB to '0'." (L2395) / "Cycle bit = Command Ring's PCS flag."
//    (L2397)；"Write the Host Controller Doorbell with DB Target = Host Controller
//    Command."                                              (L2399-2400, p129)
//  - 执行："If the Device Slot is in the Addressed or Configured state:" → "Abort any
//    USB transactions to the Device." (L2406) "Set the Slot State field of Slot Context
//    to the Default state." (L2408) "Set the Context Entries field of Slot Context to
//    '1'." (L2410) "Set the USB Device Address field of Slot Context to '0'." (L2412)
//    + 逐端点（除 DCEP）"Set the Endpoint Context EP State field to Disabled."
//    (L2414-2417, p129)
//  - 事件："Insert a Command Completion Event on the Event Ring of Interrupter 0"
//    (L2419-2420)；曾在 Addressed/Configured → "Completion Code = Success" (L2429)，
//    否则 "Completion Code = Context State Error."         (L2431-2433, p129)
//  - Note（软件回收义务）："Software is responsible for recovering any memory data
//    structures (Stream Context Arrays, Transfer Rings, and so forth) owned by disabled
//    Endpoint Contexts the slot when the Reset Device Command is issued."
//                                                          (L2438-2440, p129)
//  - 无 Input Context 的深意："the Reset Device Command TRB (section 6.4.3.10) does not
//    reference an Input Context, so there is no Input Context available to use to set
//    the values of the Output Device Context. After the completion of a Reset Device
//    Command the Slot and Endpoint 0 Contexts shall contain values that allow the xHC
//    to issue requests to the Default Control Endpoint of the USB device that has just
//    been reset."                                          (L2447-2454, p130)
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
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.6.11'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Reset Device'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'复位设备 · xHCI 规范第 4 章 · p128–130'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1（已 Configured 的槽）—— 课程示例值'}
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
    section: '§4.6.11',
    zh: 'Reset Device',
    en: 'Reset Device Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.11 p128–130',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 */
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
  const i0chip = makeChip(
    view,
    '本命令完成事件固定走 Interrupter 0 的事件环（L2419-2420）',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 16},
  );

  /* 槽位上下文卡（Slot Context，命令执行后逐行翻转） */
  const slot: CardApi = makeCard({
    title: 'Slot Context（输出侧）',
    rows: [
      {k: 'Slot State', v: 'Configured'},
      {k: 'Context Entries', v: '4（示例）'},
      {k: 'USB Device Address', v: 'addr≠0'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 21,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(230), TLy(270)));
  slot.ref().opacity(1);

  /* 端点上下文条（EP0=Default Control Endpoint；EP1/EP2 示例为已配置端点）
     —— 左列布局（y570/645），避事件环带 y655 与命令环带 y470 */
  const eps: CellStripApi = makeCellStrip(view, {
    x: TLx(240), y: TLy(570), n: 3, w: 150, h: 60, tint: C.dev,
    labels: ['EP0 DCEP', 'EP1', 'EP2'],
  });
  const eTitle = makeChip(
    view,
    'Endpoint Context 状态（示例：三个端点全在 Running）',
    {x: TLx(250), y: TLy(648), w: 520, tint: C.dev, size: 15},
  );
  eps.group().opacity(1);
  eTitle().opacity(0.9);
  eps.value[0]().text('Running');
  eps.value[1]().text('Running');
  eps.value[2]().text('Running');
  yield* waitFor(0.25);

  /* ===== ① 目的与复位来源（两注记分时，避泳道标签带） ===== */
  const q1 = makeChip(
    view,
    '"The Reset Device Command is used by software to inform the xHC that the USB Device associated with a Device Slot has been Reset (by either; setting the Root Hub port PR flag …, or issuing a SetPortFeature(PORT_RESET) request the external hub port upstream of the device)." — §4.6.11 p128',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 17},
  );
  yield* stage.say('复位来源：根集线器 PR 位 / 外置集线器 PORT_RESET。', '① / 7');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.2);
  const n1b = makeNote(
    view,
    [
      '复位（电气/协议层）已经发生——本命令是软件向 xHC 的「报备」：',
      '复位操作本身已把 Slot State 置 Default、Address 清 \'0\'、',
      '除 DCEP 外全部端点置 Disabled（L2353-2357）——xHC 侧簿记要跟上。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  n1b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n1b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 前提：先停端点活动 ===== */
  const n2 = makeNote(
    view,
    [
      '"Software should stop all endpoint activity before issuing a Reset Device Command."（L2357-2358）',
      '未成功复位的警告（L2372-2375）：设备若没复位成功，本命令照发=未定义行为；',
      '例：设备不在 Default 态时，随后的 Address Device Command 必失败。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  yield* stage.say('前提：先停全部端点活动。', '② / 7');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.8);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Reset Device TRB（无 Input Context）+ 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Reset Device TRB',
    rows: [
      {k: 'TRB Type', v: 'Reset Device'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Input Context', v: '不引用（与 4.6.5/4.6.6 最大差异）'},
      {k: '其余字段', v: '清 \'0\''},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 19,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(285)));
  yield* stage.say('摆 Reset Device TRB：不引用 Input Context。', '③ / 7');
  yield* cmd.fill(0, 'RstDev', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Reset Device Command … Slot ID = The ID of the Device Slot to reset … Clear all other fields of the command TRB to \'0\' … Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.11 p129',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.2);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 处置：非 DCEP 五项 + DCEP 三项 ===== */
  const c4: CardApi = makeCard({
    title: 'xHC 处置（L2359-2372）',
    rows: [
      {k: '非 DCEP·传输', v: '终止 USB 活动'},
      {k: '非 DCEP·门铃', v: '禁用端点门铃'},
      {k: '非 DCEP·事件', v: '弃置未上环挂起事件'},
      {k: '非 DCEP·带宽', v: '释放周期端点带宽'},
      {k: '非 DCEP·资源', v: '释放内部资源'},
      {k: 'DCEP', v: '终止活动+弃挂起事件+转 Running'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  yield* stage.say('非 DCEP 五项清算；DCEP 反而回 Running。', '④ / 7');
  yield* cardIn(c4, new Vector2(TLx(1180), TLy(255)));
  yield* waitFor(0.4);
  yield* waitFor(3.6);
  c4.ref().opacity(0);
  yield* waitFor(0.25);
  c4.ref().remove();

  /* ===== ⑤ 执行算法：槽上下文翻转 + 端点禁用（引文节选 3 行，避泳道标签带） ===== */
  yield* stage.say('槽回 Default；Entries=1；地址清 0；端点全禁。', '⑤ / 7');
  const q5 = makeChip(
    view,
    '"If the Device Slot is in the Addressed or Configured state: … Set the Slot State field of Slot Context to the Default state. Set the Context Entries field of Slot Context to \'1\'. … Set the Endpoint Context EP State field to Disabled." — §4.6.11 p129',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 16},
  );
  q5().opacity(0.95);
  slot.row(0)().text('Default');
  yield* flash(slot.ref, 1);
  yield* waitFor(0.5);
  slot.row(1)().text('\'1\'');
  yield* flash(slot.ref, 1);
  yield* waitFor(0.5);
  slot.row(2)().text('\'0\'');
  yield* flash(slot.ref, 1);
  yield* waitFor(0.5);
  eps.value[1]().text('Disabled');
  eps.cell[1]().stroke(C.edge);
  eps.value[2]().text('Disabled');
  eps.cell[2]().stroke(C.edge);
  yield* flash(eps.group, 1);
  yield* waitFor(3.2);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 完成事件：Interrupter 0 + 双分支 ===== */
  const c6: CardApi = makeCard({
    title: '完成事件 · 双分支',
    rows: [
      {k: '事件环', v: 'Interrupter 0 的 Event Ring'},
      {k: '曾 Addressed/Configured', v: 'CC=Success'},
      {k: '否则', v: 'CC=Context State Error'},
      {k: 'Command TRB Ptr', v: '指向本命令 TRB'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 19,
  });
  view.add(c6.node);
  const q6 = makeChip(
    view,
    '"Insert a Command Completion Event on the Event Ring of Interrupter 0 … If the Device Slot was in the Addressed or Configured state: Completion Code = Success … else … Completion Code = Context State Error." — §4.6.11 p129',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 16},
  );
  yield* stage.say('完成事件固定回 Interrupter 0。', '⑥ / 7');
  yield* cardIn(c6, new Vector2(TLx(1180), TLy(255)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.4);
  yield* waitFor(2.2);
  c6.ref().opacity(0);
  yield* waitFor(0.2);
  c6.ref().remove();
  q6().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q6().opacity(0);
  yield* waitFor(0.2);
  i0chip().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  i0chip().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 软件收尾 + 无 Input Context 的深意（拆两段分时，避泳道标签带） ===== */
  const n7a = makeNote(
    view,
    [
      '软件回收义务（L2438-2440）：被禁端点上下文拥有的内存结构',
      '（Stream Context Array、Transfer Ring 等）由软件负责收回。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  const n7b = makeNote(
    view,
    [
      '无 Input Context 的深意（L2447-2454）：TRB 不引用 Input Context，',
      '所以复位后 Slot/EP0 Context 的值由 xHC 直接落成——它们必须足以',
      '支撑 xHC 向刚复位设备的 DCEP 发请求（详见 6.2.2.4 / 6.2.3.7）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('收尾：回收内存；EP0 就绪待重新枚举。', '⑦ / 7');
  n7a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n7a().opacity(0);
  yield* waitFor(0.2);
  n7b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n7b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.11 Reset Device',
    rows: [
      {k: '用途', v: '报备设备已复位，槽回 Default'},
      {k: '命令 TRB', v: '不引用 Input Context'},
      {k: 'xHC', v: '非 DCEP 五项清算 · DCEP 回 Running'},
      {k: '事件', v: 'Interrupter 0 · CC 双分支'},
      {k: '下一支', v: '§4.6.12 Force Event（批 D）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  eps.group().opacity(0);
  eTitle().opacity(0);
  slot.ref().opacity(0);
  yield* stage.say('槽回 Default，EP0 就绪——重新枚举从这继续。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
