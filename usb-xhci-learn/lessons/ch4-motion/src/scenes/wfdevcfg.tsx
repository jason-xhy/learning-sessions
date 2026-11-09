// R11 批 C 全链片：设备配置端到端链 —— Enable Slot → Address Device →
// Configure Endpoint → Evaluate Context 四命令接力（示例 Slot ID=1、USB Address=5、
// 配置 EP 集=EP0+EP1 Bulk OUT+EP2 Bulk IN，均为课程示例值）
// 判据（evidence/spec-46.txt，判据唯一事实源；与 ch4603/ch4605/ch4606/ch4607 衔接）：
//  - §4.6.3 Enable Slot（L212-299）：
//    "The Enable Slot Command is issued by software to obtain an available Device
//    Slot and to transition a Device Slot from the Disabled to the Enabled state."
//                                                                    (L216-217, p94)
//    挂 DCBAA："Upon the successful completion of an Enable Slot Command, system
//    software shall use the Slot ID to link a Device Context data structure to the
//    slot by writing a pointer to the Device Context in the Device Context Base
//    Address Array[Slot ID] location. …"                       (L226-229, p94)
//    发行：TRB Type=Enable Slot (L256) / Cycle bit=命令环 PCS (L264) / 敲 DB0
//    (L266-267)；CCE 可用分支："If a Device Slot is available: Slot ID = ID of the
//    selected Device Slot. Completion Code = Success" (L281-285, p95)；
//    "The algorithm for Device Slot ID selection is xHC implementation dependent."
//                                                                    (L296, p95)
//    注：任务稿所写 L392-395 实为 §4.6.4 Disable Slot 的 DCBAA 清零 Note——
//    「完成后挂 DCBAA」原文在 L226-231，本片按后者引用。
//  - §4.6.5 Address Device（L398-656；任务稿「§4.6.4」应为 §4.6.5，ch4605 同）：
//    目的/BSR："… to transition a Device Slot from the Enabled to the Default or
//    Addressed state or from the Default to the Addressed state, depending on the
//    state of the Block Set Address Request (BSR) flag."       (L400-403, p97)
//    xHC 三件事：使能 DCEP / 选地址 / 发 SET_ADDRESS     (L404-408, p97)
//    EP0 就绪："the Default Control Endpoint will be added to the xHCs' endpoint
//    scheduling list, the Default Control Endpoint 0 Context Doorbell shall be
//    enabled, and TRBs can be posted to its endpoint Transfer Ring."
//                                                                    (L409-412, p97)
//    BSR Note：BSR='0' → 选地址+发 SET_ADDRESS；BSR='1' → 不发，其余照做
//                                                                    (L437-445, p98)
//    Input Context 合同：A0·A1='1' 其余全 '0' (L456-458)；"System software shall
//    initialize Slot Context and Endpoint Context 0 entries of the Input Context.
//    All other Endpoint Contexts … shall be ignored" (L459-461, p98)
//    BSR='0' 成功五笔：Input Slot/EP0 全字段拷贝 (L573-576) / EP0 State=Running
//    (L578-579) / "Set the Slot State in the Output Slot Context to Addressed."
//    (L581) / "Set the USB Device Address field … to the address selected for the
//    USB device by the xHC." (L583-584) / CC=Success (L586)
//    注：Default 态仅 BSR='1' 分支产生（"Set the Slot State … to Default." L541）；
//    Enable Slot 后槽态是 Enabled（L216-217）——本片主线 BSR='0'，收口推进线
//    按证据写 Enabled → Addressed → Configured，BSR=1→Default 作分支一句带过。
//  - §4.6.6 Configure Endpoint（L657-1294）：
//    配置场景："… software shall issue a Configure Endpoint Command to the xHC in
//    conjunction with issuing USB SET_CONFIGURATION request … transition a Device
//    Slot from the Addressed to the Configured state." (L667-672, p102)
//    旗标合同："The Add Context flag A1 and Drop Context flags D0 and D1 … shall
//    be cleared to '0'. Endpoint 0 Context does not apply … A0 shall be set to '1'
//    … System software shall initialize the Endpoint Contexts of the Input Context
//    referenced by Add Context flags." (L732-743, p103)
//    判定：Resources/Bandwidth Available − Required < 0 → Resource/Bandwidth
//    Error；失败全不动 (L818-855, p104-105)
//    Slot State 收束：任一端点 enabled → Configured (L934-942/L1193-1204)
//    成功后："the enabled endpoints will be added to the xHCs' pipe scheduling
//    list, the respective Device Context Doorbells shall be enabled …" (L986-989, p107)
//    发行摘句（L1043-1058, p108）：Input Context 分配 → 命令环插入 → Cycle=PCS
//  - §4.6.7 Evaluate Context（L1295-1429）：
//    用途："The Evaluate Context Command is issued by software to inform the xHC
//    that specific fields in the Device Context data structures have been
//    modified. … for example, the Max Packet Size of the control endpoint may be
//    determined only after software reads the Device Descriptor …" (L1297-1303, p112)
//    合同：Drop 全 '0' 不适用 / Add 点名 / 未引用忽略 (L1318-1325, p112)
//    成功："If Completion Code = Success: For each Endpoint Context designated by
//    a Add Context flag = '1': Update Output Device Context parameters."
//                                                                    (L1393-1397, p113)
//    只影响被点名参数 (L1304-1307)；错误时输出侧不改 (L1420-1421, p114)
import {makeScene2D, Txt} from '@motion-canvas/2d';
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

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  const t4 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'wf · 全链'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'设备配置'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Enable Slot → Address Device → Configure Endpoint → Evaluate Context'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1、USB Address=5（课程示例值）· 规范 §4.3.2-4.3.4+§4.6.3-4.6.7'}
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
  yield* waitFor(0.75);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  t4().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove(); t4().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '全链',
    zh: '设备配置',
    en: 'Enable Slot → Address Device → Configure Endpoint → Evaluate Context',
    cite: '§4.3.2-4.3.4+§4.6.3-4.6.7',
  });
  yield* lanesIn(stage);

  /* 双环 + 门铃 + DCBAA 条（全片道具：DCBAA[1] 随链挂上 Device Context） */
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

  /* 槽位状态卡（常驻主线：② 起 ↔ 收口；幕① 由 DCBAA 卡占位，分时让位） */
  const slot: CardApi = makeCard({
    title: '槽位状态（示例槽 1）',
    rows: [
      {k: 'Slot State', v: '—（无槽）'},
      {k: 'USB Address', v: '—'},
    ],
    tint: C.hc,
    w: 340,
    rowSize: 20,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(230), TLy(300)));

  /* ===== 幕① 空槽时代：DCBAA 里还没有它 ===== */
  const dcard: CardApi = makeCard({
    title: 'DCBAA 现状（示例）',
    rows: [
      {k: 'DCBAA[0]', v: '0（保留）'},
      {k: 'DCBAA[1]', v: '—（空）'},
    ],
    tint: C.hc,
    w: 380,
    rowSize: 20,
  });
  view.add(dcard.node);
  yield* stage.say('设备附上了，xHC 里还没有它的位置——先领槽。', '① / 5');
  yield* cardIn(dcard, new Vector2(TLx(230), TLy(300)));
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  dcard.ref().opacity(0);
  yield* waitFor(0.2);
  dcard.ref().remove();

  /* ===== 幕② Enable Slot（领槽，§4.6.3）===== */
  const trb: CardApi = makeCard({
    title: 'Enable Slot TRB',
    tag: '字段最少',
    rows: [
      {k: 'TRB Type', v: 'Enable Slot'},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 420,
    rowSize: 20,
  });
  view.add(trb.node);
  trb.ref().position(new Vector2(TLx(740), TLy(295)));
  yield* stage.say('第一棒 Enable Slot：领槽——TRB 只有两个字段，全族最简。', '② / 5');
  slot.ref().opacity(1);
  trb.ref().opacity(1);
  yield* waitFor(0.4);
  yield* cmd.fill(0, 'EnSlot', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  dcbaa.value[1]().text('ctx 指针');
  dcbaa.cell[1]().stroke(C.hc);
  yield* flash(dcbaa.group, 1);
  slot.row(0)().text('Enabled ✓');
  yield* flash(slot.ref, 1);
  const q2a = makeChip(
    view,
    '"If a Device Slot is available: Slot ID = ID of the selected Device Slot. Completion Code = Success (refer to Table 6-90)." — §4.6.3 p95',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.evt, size: 16},
  );
  q2a().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q2a().opacity(0);
  yield* waitFor(0.2);
  const q2b = makeChip(
    view,
    '"Upon the successful completion of an Enable Slot Command, system software shall use the Slot ID to link a Device Context data structure to the slot by writing a pointer to the Device Context in the Device Context Base Address Array[Slot ID] location. …" — §4.6.3 p94',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q2b().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q2b().opacity(0);
  yield* waitFor(0.2);

  /* ===== 幕③ Address Device（给地址，§4.6.5）===== */
  const ic3: CardApi = makeCard({
    title: 'Input Context（装配）',
    rows: [
      {k: 'BSR', v: '\'0\'（发 SET_ADDRESS）'},
      {k: 'A0 · A1', v: '1 · 1（其余全 \'0\'）'},
      {k: '内容', v: 'Slot Context + EP0 Context'},
    ],
    tint: C.driver,
    w: 460,
    rowSize: 19,
  });
  view.add(ic3.node);
  ic3.ref().position(new Vector2(TLx(640), TLy(295)));
  yield* stage.say('第二棒 Address Device：BSR=0——xHC 读 Input Context，选地址、发 SET_ADDRESS。', '③ / 5');
  ic3.ref().opacity(1);
  yield* waitFor(0.4);
  yield* cmd.fill(1, 'AddrDev', C.driver);
  yield* cmd.enqTo(2);
  ic3.ref().opacity(0);
  yield* waitFor(0.15);
  ic3.ref().remove();
  yield* bell.ring('0');
  yield* cmd.deqTo(1, 0.4);
  yield* cmd.consume(1);
  yield* cmd.deqTo(2, 0.4);
  yield* evt.fill(1, 'CCE', C.evt);
  yield* evt.enqTo(2);
  yield* evt.deqTo(1, 0.4);
  yield* evt.consume(1);
  yield* evt.deqTo(2, 0.4);
  const oc3: CardApi = makeCard({
    title: 'Output Device Context（xHC 写）',
    rows: [
      {k: 'Slot State', v: '→ Addressed'},
      {k: 'USB Address', v: '→ 5（xHC 选中）'},
      {k: 'EP0（DCEP）', v: 'Running · 入调度表'},
      {k: 'CC', v: 'Success'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(oc3.node);
  oc3.ref().position(new Vector2(TLx(1180), TLy(345)));
  oc3.ref().opacity(1);
  slot.row(0)().text('Addressed ✓');
  slot.row(1)().text('5');
  yield* flash(slot.ref, 1);
  yield* waitFor(1.4);
  oc3.ref().opacity(0);
  yield* waitFor(0.2);
  oc3.ref().remove();
  const q3 = makeChip(
    view,
    '"System software shall initialize Slot Context and Endpoint Context 0 entries of the Input Context. All other Endpoint Contexts in the Input Context shall be ignored by the xHC during the execution of this command." — §4.6.5 p98',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q3().opacity(0);
  yield* waitFor(0.2);

  /* ===== 幕④ Configure Endpoint（通管道，§4.6.6）===== */
  const ic4: CardApi = makeCard({
    title: 'Input Context（装配）',
    rows: [
      {k: 'A0', v: '1（A1/D0/D1=0）'},
      {k: 'Add 位图', v: '点名 EP1 OUT · EP2 IN'},
      {k: 'EP Context', v: 'Bulk 参数逐项初始化'},
    ],
    tint: C.driver,
    w: 460,
    rowSize: 19,
  });
  view.add(ic4.node);
  ic4.ref().position(new Vector2(TLx(640), TLy(295)));
  yield* stage.say('第三棒 Configure Endpoint：点名 EP1/EP2 通管道——失败面见 ch4606 片。', '④ / 5');
  ic4.ref().opacity(1);
  yield* waitFor(0.4);
  yield* cmd.fill(2, 'CfgEP', C.driver);
  yield* cmd.enqTo(3);
  ic4.ref().opacity(0);
  yield* waitFor(0.15);
  ic4.ref().remove();
  yield* bell.ring('0');
  yield* cmd.deqTo(2, 0.4);
  yield* cmd.consume(2);
  yield* cmd.deqTo(3, 0.4);
  const n4 = makeNote(
    view,
    [
      '失败面一句（L818-855）：Resource Error / Bandwidth Error——',
      '先评估后动账，失败零改动；分支细则见 ch4606 片⑥⑦。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  n4().opacity(0.9);
  yield* evt.fill(2, 'CCE', C.evt);
  yield* evt.enqTo(3);
  yield* evt.deqTo(2, 0.4);
  yield* evt.consume(2);
  yield* evt.deqTo(3, 0.4);
  n4().opacity(0);
  yield* waitFor(0.2);
  const oc4: CardApi = makeCard({
    title: 'Output Device Context（xHC 写）',
    rows: [
      {k: 'Slot State', v: '→ Configured'},
      {k: 'EP1 OUT / EP2 IN', v: 'Running · 入调度表'},
      {k: 'Device Context', v: 'EP1/EP2 落账'},
      {k: 'CC', v: 'Success'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 18,
  });
  view.add(oc4.node);
  oc4.ref().position(new Vector2(TLx(1180), TLy(345)));
  oc4.ref().opacity(1);
  slot.row(0)().text('Configured ✓');
  yield* flash(slot.ref, 1);
  yield* waitFor(1.3);
  oc4.ref().opacity(0);
  yield* waitFor(0.2);
  oc4.ref().remove();
  const q4 = makeChip(
    view,
    '"To issue a Configure Endpoint Command system software shall perform the following operations: Allocate and initialize an Input Context data structure for the command. Insert a Configure Endpoint Command on the Command Ring … Cycle bit = Command Ring\u2019s PCS flag." — §4.6.6 p108',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q4().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q4().opacity(0);
  yield* waitFor(0.2);

  /* ===== 幕⑤ Evaluate Context（报变更，§4.6.7）===== */
  const ic5: CardApi = makeCard({
    title: 'Input Context（只装变更）',
    rows: [
      {k: 'Add 旗标', v: 'A0 点名 Slot Context'},
      {k: 'Drop 旗标', v: '全 \'0\'（不适用）'},
      {k: '变更字段', v: 'Max Exit Latency'},
    ],
    tint: C.driver,
    w: 460,
    rowSize: 19,
  });
  view.add(ic5.node);
  ic5.ref().position(new Vector2(TLx(640), TLy(295)));
  yield* stage.say('已配置的设备改了描述符字段，不重走配置——Evaluate Context 把变更报给 xHC。', '⑤ / 5');
  ic5.ref().opacity(1);
  yield* waitFor(0.4);
  yield* cmd.fill(3, 'EvalCtx', C.driver);
  yield* cmd.enqTo(4);
  ic5.ref().opacity(0);
  yield* waitFor(0.15);
  ic5.ref().remove();
  yield* bell.ring('0');
  yield* cmd.deqTo(3, 0.4);
  yield* cmd.consume(3);
  yield* cmd.deqTo(4, 0.4);
  yield* evt.fill(3, 'CCE', C.evt);
  yield* evt.enqTo(4);
  yield* evt.deqTo(3, 0.4);
  yield* evt.consume(3);
  const oc5: CardApi = makeCard({
    title: 'Evaluate Context 之后',
    rows: [
      {k: 'CC=Success', v: '更新 Output 参数'},
      {k: 'Slot State', v: 'Configured（不变）'},
      {k: 'Max Exit Latency', v: '旧 → 新（示例）'},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 18,
  });
  view.add(oc5.node);
  oc5.ref().position(new Vector2(TLx(1180), TLy(345)));
  oc5.ref().opacity(1);
  yield* waitFor(1.3);
  oc5.ref().opacity(0);
  yield* waitFor(0.2);
  oc5.ref().remove();
  const q5 = makeChip(
    view,
    '"The Evaluate Context Command is issued by software to inform the xHC that specific fields in the Device Context data structures have been modified. … for example, the Max Packet Size of the control endpoint may be determined only after software reads the Device Descriptor from the device through the control endpoint." — §4.6.7 p112',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 15},
  );
  q5().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.3);
  q5().opacity(0);
  yield* waitFor(0.2);

  /* ===== 收口：四命令链全景 + 逐命令走读 ===== */
  const sum: CardApi = makeCard({
    title: '全链 · 设备配置',
    rows: [
      {k: '四命令', v: '领槽 → 给地址 → 通管道 → 报变更'},
      {k: 'Slot State', v: 'Enabled → Addressed → Configured'},
      {k: '分支', v: 'BSR=1 走 Default（见 ch4605 片）'},
      {k: '走读', v: '§4.6.3/5/6/7 = ch4603/05/06/07 片'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 19,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  slot.ref().opacity(0);
  dcbaa.group().opacity(0);
  dTitle().opacity(0);
  yield* stage.say('全链走完：领槽→给地址→通管道→报变更——细节回看 ch4603/4605/4606/4607 四支片。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(6.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
