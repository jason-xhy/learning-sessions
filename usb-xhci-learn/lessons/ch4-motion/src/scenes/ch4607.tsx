// §4.6.7 Evaluate Context 评估上下文 —— xHCI 1.2b p112-114（R10 批 C；示例 Slot ID=1 为课程示例值）
// 判据（evidence/spec-46.txt L1295-1429，判据唯一事实源）：
//  - 目的："The Evaluate Context Command is issued by software to inform the xHC that
//    specific fields in the Device Context data structures have been modified." (L1296-1298, p112)
//    参数事后才知的典型例："the Max Packet Size of the control endpoint may be determined
//    only after software reads the Device Descriptor from the device through the control
//    endpoint. The Device Descriptor shall be read to determine whether a device is a hub
//    or not, etc."                                     (L1299-1303, p112)
//  - 只影响 Add 点名的参数："When an Evaluate Context Command is processed by the xHC it
//    shall only affect the parameters identified by the respective context. Refer to the
//    Evaluate Context Command Usage sub-sections in section 4.5.2 and 6.2.2.3 for more
//    information on the specific context fields that are affected."  (L1304-1307, p112)
//  - 槽态前提："If the Slot State is Disabled when an Evaluate Context Command is received,
//    the xHC shall generate a Slot Not Enabled Error Event on the Event Ring. Upon
//    successful completion of an Evaluate Context Command, the xHC shall begin executing
//    with the updated context parameters."             (L1314-1317, p112)
//  - Input Context 合同："The Evaluate Context Command utilizes the Input Context data
//    structure defined in section 6.2.5 to define which Contexts are to be evaluated. The
//    state of the Add Context flags depends on the specific endpoints affected by the
//    command. All Drop Context flags of the Input Control Context shall be cleared to '0'
//    (these flags do not apply to the Evaluate Context Command). System software shall
//    initialize Contexts of the Input Context affected by the command. All Contexts not
//    referenced by an Add Context flag in the Input Context are ignored by the xHC."
//                                                          (L1318-1325, p112)
//  - 发行（L1326-1355, p112-113）："TRB Type = Evaluate Context Command (refer to Table
//    6-91)" (L1339) / "The Add Context flags shall be initialized to indicate the IDs of
//    the Contexts affected by the command." (L1341-1342) / "Set all Drop Context flags
//    to '0'." (L1345) / "Slot ID = ID of the target Device Slot." (L1347) / "Input Context
//    Pointer = The base address of the Input Context data structure." (L1349) / "Clear all
//    other fields of the command TRB to '0'." (L1351) / "Cycle bit = Command Ring's PCS
//    flag." (L1353) / "Write the Host Controller Doorbell with DB Target = Host Controller
//    Command."                                              (L1355, p113)
//  - 执行（L1356-1409, p113）："Insert a Command Completion Event on the Event Ring."
//    (L1359) / "If the Output Slot State is equal to Default, Addressed or Configured:"
//    (L1374) → "For each Context designated by an Add Context flag = '1': Evaluate the
//    parameter settings defined by the selected Contexts." (L1376-1378) / "If the Context
//    parameters are not valid: Completion Code = Parameter Error." (L1380-1382) /
//    "If the Max Exit Latency is non-zero: Calculate the Isoch Scheduling Delay. If the
//    Max Exit Latency + Isoch Scheduling Delay does not allow an Isoch endpoint to be
//    scheduled: Completion Code = Max Exit Latency Too Large Error." (L1384-1391) /
//    "If Completion Code = Success: For each Endpoint Context designated by a Add Context
//    flag = '1': Update Output Device Context parameters." (L1393-1397)；输出槽态不在
//    Default/Addressed/Configured → "Completion Code = Context State Error" (L1399-1401)；
//    槽从未使能 → "Completion Code = Slot Not Enabled Error"      (L1403-1405, p113)
//  - DCI 守卫："The xHC shall consider an Endpoint Context invalid if the DCI of an Add
//    Context flag = '1' is greater than the value of Context Entries." (L1417-1418, p114)
//  - 错误原子性 Note："The Output Slot/Endpoint Context parameters shall not be changed
//    if any error is detected by this command."        (L1420-1421, p114)
//  - MEL Isoch 保护 Note："When an Evaluate Context Command modifies the value of Max Exit
//    Latency, the xHC shall not drop the data of any Isoch TDs of any endpoints associated
//    with the Device Slot targeted by the command."    (L1423-1425, p114)
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
  flash,
  CardApi,
  StageApi,
  RingApi,
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
      <Txt ref={t1} text={'§4.6.7'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Evaluate Context'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'评估上下文 · xHCI 规范第 4 章 · p112–114'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1（Addressed 槽，Add 旗标点名 EP1/EP2）—— 课程示例值'}
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
    section: '§4.6.7',
    zh: 'Evaluate Context',
    en: 'Evaluate Context Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.7 p112–114',
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

  /* 槽位上下文卡（输出侧；本命令可翻的字段：Max Exit Latency 等被 Add 点名的参数） */
  const slot: CardApi = makeCard({
    title: 'Slot Context（输出侧）',
    rows: [
      {k: 'Slot State', v: 'Addressed'},
      {k: 'Max Exit Latency', v: '旧值'},
      {k: 'Context Entries', v: '4（示例）'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 21,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(230), TLy(270)));
  slot.ref().opacity(1);

  /* ===== ① 目的与时机 ===== */
  const q1 = makeChip(
    view,
    '"The Evaluate Context Command is issued by software to inform the xHC that specific fields in the Device Context data structures have been modified. … the Max Packet Size of the control endpoint may be determined only after software reads the Device Descriptor from the device through the control endpoint." — §4.6.7 p112',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('评估上下文：把事后才知的参数报给 xHC。', '① / 7');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② Input Context 合同：Add 点名 / Drop 不适用 / 未引用忽略 ===== */
  const n2 = makeNote(
    view,
    [
      'Input Context 合同（L1318-1325）：Add Context 旗标点名「要评估的 Context」；',
      '全部 Drop Context 旗标清 \'0\'——对本命令一概不适用；',
      '未被 Add 旗标引用的 Context，xHC 全部忽略——参数只准 Add 点名者动。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('Add 旗标点名评估对象；Drop 旗标一概不适用。', '② / 7');
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 软件侧：摆 Evaluate Context TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'EvalCtx TRB',
    rows: [
      {k: 'TRB Type', v: 'Evaluate Context'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Input Context Ptr', v: '基址'},
      {k: 'Add flags', v: 'A1+A2 · Drop=全\'0\''},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(295)));
  yield* stage.say('摆 Evaluate Context TRB：Add 点名 + Input Context 指针。', '③ / 7');
  yield* cmd.fill(0, 'EvalCtx', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q3 = makeChip(
    view,
    '"TRB Type = Evaluate Context Command … The Add Context flags shall be initialized to indicate the IDs of the Contexts affected by the command. … Set all Drop Context flags to \'0\'. … Slot ID = ID of the target Device Slot. Input Context Pointer = The base address of the Input Context data structure. … Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.7 p112-113',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q3().opacity(0.95);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.4);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ xHC 执行：槽态三分支 + 逐 Add 评估 ===== */
  const c4: CardApi = makeCard({
    title: '执行分支（L1356-1405）',
    rows: [
      {k: '受理槽态', v: '三态内'},
      {k: '逐 Add 评估', v: '无效→Parameter Error'},
      {k: 'MEL+Isoch 排不下', v: 'Too Large Error'},
      {k: '槽态外/未使能', v: '两族 Error'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(c4.node);
  yield* stage.say('槽在位才评估；参数无效=Parameter Error。', '④ / 7');
  yield* cardIn(c4, new Vector2(TLx(1180), TLy(345)));
  yield* waitFor(2.8);
  c4.ref().opacity(0);
  yield* waitFor(0.2);
  c4.ref().remove();
  const q4 = makeChip(
    view,
    '"If the Output Slot State is equal to Default, Addressed or Configured: For each Context designated by an Add Context flag = \'1\': Evaluate the parameter settings defined by the selected Contexts. If the Context parameters are not valid: Completion Code = Parameter Error. If the Max Exit Latency is non-zero: Calculate the Isoch Scheduling Delay. …" — §4.6.7 p113',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  q4().opacity(0.95);
  yield* waitFor(3.2);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 完成事件：Success 才更新输出侧 ===== */
  const c5: CardApi = makeCard({
    title: '完成事件 · 更新义务',
    rows: [
      {k: 'CC=Success', v: '逐 Add 端点更新 Output'},
      {k: '任一错误', v: '输出侧一字节不改'},
      {k: 'MEL 改动', v: 'Isoch TD 数据不弃'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 19,
  });
  view.add(c5.node);
  const q5 = makeChip(
    view,
    '"Insert a Command Completion Event on the Event Ring. … Completion Code = Success … If Completion Code = Success: For each Endpoint Context designated by a Add Context flag = \'1\': Update Output Device Context parameters." — §4.6.7 p113',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 16},
  );
  yield* stage.say('CC=Success 才更新输出上下文。', '⑤ / 7');
  yield* cardIn(c5, new Vector2(TLx(1180), TLy(345)));
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  c5.ref().opacity(0);
  yield* waitFor(0.2);
  c5.ref().remove();
  q5().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 槽字段翻转 + 双护栏 ===== */
  yield* stage.say('MEL 换新值；DCI 超界与错误不翻转让护栏兜底。', '⑥ / 7');
  slot.row(1)().text('新值');
  yield* flash(slot.ref, 1);
  const q6 = makeChip(
    view,
    '"The xHC shall consider an Endpoint Context invalid if the DCI of an Add Context flag = \'1\' is greater than the value of Context Entries. … The Output Slot/Endpoint Context parameters shall not be changed if any error is detected by this command." — §4.6.7 p114',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  q6().opacity(0.95);
  yield* waitFor(3.8);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.7 Evaluate Context',
    rows: [
      {k: '用途', v: '报备上下文参数事后更新'},
      {k: '评估对象', v: 'Add 旗标点名（Drop 不适用）'},
      {k: '执行', v: '槽三态内逐 Add 评估参数'},
      {k: '事件', v: 'CC=Success 才更新输出侧'},
      {k: '下一支', v: '§4.6.8 Reset Endpoint（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  slot.ref().opacity(0);
  yield* stage.say('参数更新落地——数据面拓扑不变。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.4);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
