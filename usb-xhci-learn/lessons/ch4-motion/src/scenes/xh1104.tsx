// §4.11.4 Command TRBs（格式族轻片）—— xHCI 1.2b p202-206（R12 批 C 小档支）
// 定位（R12-SPEC §0 重叠面处置）：命令 TRB 布局已在 §4.6 十八小节各卡讲透——
// 本片只讲格式族公共口径（类型编号总表+清零口径+完成事件+PCS），.4.1-.4.17
// 逐命令互链 §4.6 各卡不重讲。判据（evidence/spec-411.txt；行号=切片内行号）：
//  - 清零公共口径（L737-738）："The Parameter, Status and Length TRB
//    components shall be cleared to ‘0’ by system software unless otherwise
//    noted by a specific command."
//  - Type 字段（L739-741）："The TRB Type field of the Control component
//    shall indicate the Command Type. Table 6-91 defines the available
//    Command TRBs, that is, TRB Types allowed on a Command Ring."
//  - 完成事件（L742-743）："For every command, the xHC notifies system
//    software of its completion by placing a Command Completion Event TRB on
//    the Event ring."
//  - Cycle=PCS（L744-745）："When a Command TRB is initialized on the Command
//    ring, the Cycle bit will be set to the value of the Command Ring’s
//    Producer Cycle State (PCS) flag."
//  - Endpoint/Stream Context（L746-749）："If an endpoint defines Streams,
//    then commands that affect Endpoint Contexts may also affect the
//    associated Stream Contexts. In cases where both contexts may be
//    affected, the combined contexts are referred to as the
//    “Endpoint/Stream” Context."
//  - Input Context Note（L752-753）："Note: The Address Device, Configure
//    Endpoint, and Evaluate Context Commands utilize an Input Context data
//    structure."
//  - .4.1 No Op（L756-758）："The No Op Command TRB provides a simple means
//    for verifying the operation of the basic TRB Ring mechanisms offered by
//    the xHC, or to report the current value of the Command Ring Dequeue
//    Pointer."；.4.2 Enable Slot（L763-765）："The Enable Slot Command TRB
//    causes the xHC to select an available Device Slot and return the ID of
//    the selected slot to the host in a Command Completion Event."；
//    .4.3 Disable Slot（L771-773）："The Disable Slot Command TRB releases any
//    bandwidth assigned to the disabled slot, frees any internal xHC
//    resources assigned to the slot, and sets the Slot State field of the
//    associated Slot Context to Disabled."
//  - .4.4 Address Device（L784-786）："The Address Device Command TRB
//    transitions the selected Slot Context from the Default to the Addressed
//    state. It also causes the xHC to select an address for the USB device
//    and issue a SET_ADDRESS request to the USB device."
//  - .4.7 Reset Endpoint（L817-819）："This command may be used to restart a
//    Halted endpoint."；.4.8 Stop Endpoint（L830-832）："…stop the packet
//    stream of an individual endpoint and transfer ownership of all the TDs
//    on the associated Transfer Ring to software."
//  - 可选族条件句（L866-867）："If the BW Negotiation Capability (BNC) bit in
//    the HCCPARAMS1 register is ‘1’, then the xHC shall support this
//    command."（.4.11/.4.12/.4.13/.4.14/.4.16/.4.17 标 Optional Normative）
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
      <Txt ref={t1} text={'§4.11.4'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Command TRBs'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'命令 TRB 格式族 · xHCI 规范第 4 章 · p202–206'}
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
    section: '§4.11.4',
    zh: 'Command TRBs',
    en: '命令 TRB 格式族（轻片）· 规范第 4 章',
    cite: 'xHCI 1.2b §4.11.4 p202–206',
  });
  yield* lanesIn(stage);

  /* 命令环 + 事件环 */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: '软件发行命令', tint: C.hc, x0: 760, x1: 1450, n: 10,
  });
  const evt: RingApi = makeRing(view, {
    y: 655, zh: '事件环 Event Ring', en: '',
    note: '命令完成回执', tint: C.evt, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  evt.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink();
  yield* waitFor(0.25);

  /* ===== ① 清零口径 + Type 字段 ===== */
  const q1 = makeChip(
    view,
    '"The Parameter, Status and Length TRB components shall be cleared to ‘0’ by system software unless otherwise noted by a specific command. The TRB Type field of the Control component shall indicate the Command Type. Table 6-91 defines the available Command TRBs, that is, TRB Types allowed on a Command Ring." — §4.11.4 p202',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 14},
  );
  yield* stage.say('公共口径：三组件清零；Type 字段即命令编号。', '① / 6');
  q1().opacity(0.95);
  yield* cmd.fill(0, 'CMD', C.hc);
  yield* cmd.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 完成事件 + Cycle=PCS ===== */
  const q2 = makeChip(
    view,
    '"For every command, the xHC notifies system software of its completion by placing a Command Completion Event TRB on the Event ring. When a Command TRB is initialized on the Command ring, the Cycle bit will be set to the value of the Command Ring’s Producer Cycle State (PCS) flag." — §4.11.4 p202',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 15},
  );
  yield* stage.say('每命令必有完成事件；C 位取命令环 PCS。', '② / 6');
  q2().opacity(0.95);
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* evt.fill(0, 'CmdCmplEvt', C.evt);
  yield* evt.enqTo(1);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ Endpoint/Stream Context + Input Context Note ===== */
  const q3 = makeChip(
    view,
    '"If an endpoint defines Streams, then commands that affect Endpoint Contexts may also affect the associated Stream Contexts. In cases where both contexts may be affected, the combined contexts are referred to as the “Endpoint/Stream” Context." — §4.11.4 p202',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 15},
  );
  const n3 = makeNote(
    view,
    [
      'Note（L752-753）：Address Device / Configure Endpoint / Evaluate',
      'Context 三命令走 Input Context 数据结构（其余命令不携带）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('Streams 端点：命令作用 Endpoint/Stream 合体上下文。', '③ / 6');
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(1.9);
  q3().opacity(0);
  yield* waitFor(0.2);
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 十七命令分组速览（互链 §4.6） ===== */
  const t4: CardApi = makeCard({
    title: 'Command TRB 家族（Table 6-91 · 互链 §4.6）',
    rows: [
      {k: '槽位族', v: 'No Op·Enable/Disable Slot·Address·Reset Dev'},
      {k: '端点族', v: 'Config/Evaluate·Reset/Stop·Set TR Deq'},
      {k: '可选族', v: 'Force Event·带宽×2·延迟·Header·Ext-Prop×2'},
      {k: '逐命令', v: '布局与语义归 §4.6.2-4.6.18 各卡（不重讲）'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(t4.node);
  const n4 = makeNote(
    view,
    [
      '格式事实（L766-767）：Enable Slot 与 No Op 同格式（§6.4.3.1）——',
      '多数命令仅 Type 编号与少量字段不同；总表归 landing 分析卡。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('十七命令三族分组——细节互链 4.6 命令卡。', '④ / 6');
  yield* cardIn(t4, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(0.3);
  yield* waitFor(1.4);
  t4.ref().opacity(0);
  yield* waitFor(0.2);
  t4.ref().remove();
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.4);
  n4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ 代表命令三连走读 ===== */
  const q5a = makeChip(
    view,
    '"The Enable Slot Command TRB causes the xHC to select an available Device Slot and return the ID of the selected slot to the host in a Command Completion Event." — §4.11.4.2 p202',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 16},
  );
  const q5b = makeChip(
    view,
    '"The Address Device Command TRB transitions the selected Slot Context from the Default to the Addressed state. It also causes the xHC to select an address for the USB device and issue a SET_ADDRESS request to the USB device." — §4.11.4.4 p203',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.dev, size: 16},
  );
  const n5 = makeNote(
    view,
    [
      '另两枚（原文走读）：Disable Slot 释放带宽/资源并置 Slot State=',
      'Disabled（L771-773）；Stop Endpoint 停包流并把 TD 所有权交还',
      '软件（L830-832）；Reset Endpoint 可重启 Halted 端点（L817-819）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver},
  );
  yield* stage.say('代表三连：Enable Slot / Address Device / 端点族。', '⑤ / 6');
  q5a().opacity(0.95);
  yield* cmd.fill(1, 'EnSlot', C.driver);
  yield* cmd.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(1.2);
  q5a().opacity(0);
  yield* waitFor(0.2);
  q5b().opacity(0.95);
  yield* cmd.fill(2, 'AddrDev', C.dev);
  yield* cmd.enqTo(3);
  yield* waitFor(0.3);
  yield* waitFor(1.2);
  q5b().opacity(0);
  yield* waitFor(0.2);
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 可选族支持条件 ===== */
  const q6 = makeChip(
    view,
    '"If the BW Negotiation Capability (BNC) bit in the HCCPARAMS1 register is ‘1’, then the xHC shall support this command." — §4.11.4.12 p205',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  const n6 = makeNote(
    view,
    [
      '可选族标注（切片原文）：.4.11 Force Event/.4.12 带宽/.4.13 延迟/',
      '.4.14 端口带宽/.4.16-17 扩展属性 均标 Optional Normative——',
      '支持与否由能力位（BNC/LTC 等）声明，软件先查再发行。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('可选族：能力位声明在先，软件查后再用。', '⑥ / 6');
  q6().opacity(0.95);
  yield* flash(cmd.group, 1);
  yield* waitFor(0.3);
  yield* waitFor(1.4);
  q6().opacity(0);
  yield* waitFor(0.2);
  n6().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(1.8);
  n6().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.11.4 Command TRBs（格式族轻片）',
    rows: [
      {k: '公共口径', v: 'Parameter/Status/Length 清零 · Type=命令编号'},
      {k: '回执', v: '每命令一枚 Command Completion Event · C 位=PCS'},
      {k: '上下文', v: 'Streams 端点=Endpoint/Stream Context · 三命令带 Input'},
      {k: '互链', v: '十七命令布局语义归 §4.6 各卡 · 可选族看能力位'},
      {k: '下一支', v: '§4.11.5 Link / Event Data TRB'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  cmd.group().opacity(0);
  evt.group().opacity(0);
  yield* stage.say('格式公共面讲透——下一支：Link 与 Event Data。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.5);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
