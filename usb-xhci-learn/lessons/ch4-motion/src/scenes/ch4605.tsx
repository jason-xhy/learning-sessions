// §4.6.5 Address Device 编址设备 —— xHCI 1.2b p97-102（R10 批 B；示例 Slot ID=1、地址=0x11 为课程示例值）
// 判据（evidence/spec-46.txt L398-656，判据唯一事实源；与 ch4603 Enable Slot、ch43 §4.3.3/4.3.4 衔接）：
//  - 目的："issued by software to transition a Device Slot from the Enabled to the
//    Default or Addressed state or from the Default to the Addressed state, depending
//    on the state of the Block Set Address Request (BSR) flag." (L400-403, p97)
//  - xHC 三件事："it shall enable the device's Default Control Endpoint, select an
//    address for the USB device, and issue a USB SET_ADDRESS request to the USB
//    device. The SET_ADDRESS request for a USB2 device shall be issued to Address '0'.
//    The SET_ADDRESS request for a USB3 device shall be issued using the Route String."
//                                                          (L404-408, p97)
//  - 成功后："the Default Control Endpoint will be added to the xHCs' endpoint
//    scheduling list, the Default Control Endpoint 0 Context Doorbell shall be enabled,
//    and TRBs can be posted to its endpoint Transfer Ring." (L409-412, p97)
//  - SET_ADDRESS 失败："A USB Transaction Error shall be generated … and the Device
//    Slot shall not transition to the Addressed state."  (L413-415, p97)
//  - 后续："system software can issue USB GET_DESCRIPTOR requests through the Default
//    Control Endpoint …" + 首请求 wLength=8 取 bMaxPacketSize0 更新 Max Packet Size
//    (L422-436, p98)
//  - BSR 语义：BSR='0' → "the xHC shall select a USB Device Address and issue a
//    SET_ADDRESS request"；BSR='1' → "shall not issue a SET_ADDRESS … In either case,
//    all other operations described in this section … are performed. The BSR flag may
//    be used by software to provide compatibility with legacy USB devices which
//    require their Device Descriptor to be read before receiving a SET_ADDRESS
//    request."                                              (L437-445, p98)
//  - 护栏：xHC 检出 DCEP Transfer Ring 上的 SET_ADDRESS → "generate a TRB Error
//    Completion Status for the TD … shall never forward a SET_ADDRESS request on a
//    Default Control Endpoint Transfer Ring to a USB device." (L446-449, p98)
//  - Input Context 合同："The Add Context flags A0 and A1 … shall be set to '1', and
//    all remaining Add Context and Drop Context flags shall all be cleared to '0'."
//    (L456-458, p98)；Slot Context+EP0 Context 须有效（TR Dequeue Pointer / EP Type /
//    Error Count (CErr) / Max Packet Size）；"The MaxPStreams, Max Burst Size, and EP
//    State values shall be cleared to '0'." (L459-482, p98-99)
//  - 发行（L462-499, p99）：DCBAA 表项就位 → 分配 Input Context → TRB（TRB Type /
//    Slot ID / Input Context Pointer / 其余清 '0' / Cycle bit=PCS）→ "Write the Host
//    Controller Doorbell with DB Target = Host Controller Command."
//  - 执行（L505-602, p99-100）：slot 曾被 Enable Slot 使能？（否 → "Completion Code =
//    Slot Not Enabled Error" L596-598）；BSR='1'：Enabled 态 → 拷贝 Input Slot/EP0 →
//    Output，EP State=Running，Slot State=Default，Address='0'，CC=Success；非 Enabled
//    → Context State Error。BSR='0'：Enabled 或 Default 态 → 选地址+构造 SET_ADDRESS
//    （bmRequestType=0 / wValue=Selected Device Address / wIndex=0 / wLength=0）+
//    Route String 取自 Input Slot Context + 下发；成功 → 拷贝+Running+Slot State=
//    Addressed+Address=选中值+Success；失败 → USB Transaction Error；非两态 →
//    Context State Error。
//  - 错误族 Note：地址耗尽 → Resource Error（L621-624, p101）；context 无效 →
//    Parameter Error 且输出上下文不变（L603-606, p100）；失败恢复 → Disable Slot +
//    Enable Slot 重来（L633-636, p101）；TT 后设备 → CLEAR_TT_BUFFER（L642-644, p101）；
//    命令被中止 → 设备状态未知（L628-632, p101）；端点须 Stopped/Idle（L637-641, p101）
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
  makeArrow,
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
      <Txt ref={t1} text={'§4.6.5'} x={0} y={TLy(330)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Address Device'} x={0} y={TLy(470)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'编址设备 · xHCI 规范第 4 章 · p97–102'}
        x={0} y={TLy(590)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1（Enabled 槽）· 选中地址 0x11 —— 课程示例值'}
        x={0} y={TLy(668)} fontFamily={FONT.sans} fontSize={27} fill={C.faint} />
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
    section: '§4.6.5',
    zh: 'Address Device',
    en: 'Address Device Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.5 p97–102',
  });
  yield* lanesIn(stage);

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

  const slot: CardApi = makeCard({
    title: '槽位状态',
    rows: [
      {k: '现态', v: 'Enabled（示例）'},
      {k: 'BSR=1 目标', v: 'Default'},
      {k: 'BSR=0 目标', v: 'Addressed'},
    ],
    tint: C.hc,
    w: 360,
    rowSize: 20,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(230), TLy(275)));
  slot.ref().opacity(1);

  /* ===== ① 目的与状态迁移 ===== */
  const q1 = makeChip(
    view,
    '"… to transition a Device Slot from the Enabled to the Default or Addressed state or from the Default to the Addressed state, depending on the state of the Block Set Address Request (BSR) flag." — §4.6.5 p97',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 17},
  );
  const n1 = makeNote(
    view,
    [
      'xHC 三件事（L404-408）：使能 Default Control Endpoint /',
      '为设备选一个地址 / 向设备发 USB SET_ADDRESS 请求——',
      'USB2 设备发往 Address \'0\'，USB3 设备用 Route String 寻径。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('槽走向哪态，由 TRB 里的 BSR 旗标决定。', '① / 10');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.2);
  n1().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 成功后：DCEP 三件就绪 ===== */
  const c2: CardApi = makeCard({
    title: '成功后（L409-412）',
    rows: [
      {k: '调度', v: 'DCEP 加入端点调度表'},
      {k: '门铃', v: 'DCEP 0 Context Doorbell 使能'},
      {k: '传输', v: 'TRB 可上 DCEP Transfer Ring'},
    ],
    tint: C.dev,
    w: 440,
    rowSize: 20,
  });
  view.add(c2.node);
  const q2 = makeChip(
    view,
    '"Once a successful Address Device Command has completed, system software can issue USB GET_DESCRIPTOR requests through the Default Control Endpoint …" — §4.6.5 p98',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  yield* stage.say('成功后 EP0 全通：调度、门铃、上环。', '② / 10');
  yield* cardIn(c2, new Vector2(TLx(1180), TLy(250)));
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  c2.ref().opacity(0);
  yield* waitFor(0.2);
  c2.ref().remove();
  q2().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ BSR 语义 ===== */
  const n3 = makeNote(
    view,
    [
      'BSR=\'1\'（Block Set Address Request，L437-445）：',
      'xHC 不发 SET_ADDRESS——其余操作照做。为老式设备留的兼容位：',
      '这类设备要求先读到 Device Descriptor 才肯受 SET_ADDRESS。',
      '',
      'BSR=\'0\'：选地址 + 发 SET_ADDRESS，一步到位 Addressed。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('BSR=1：先编址前的「缓一脚」，描述符先读。', '③ / 10');
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ Input Context 装配 ===== */
  const ic: CardApi = makeCard({
    title: 'Input Context（装配）',
    rows: [
      {k: 'A0 (Slot)', v: '1'},
      {k: 'A1 (EP0)', v: '1'},
      {k: '其余 Add/Drop', v: '全 0'},
      {k: 'Slot Context', v: '全字段有效'},
      {k: 'EP0·TR Deq Ptr', v: '有效'},
      {k: 'EP0·EP Type', v: '有效'},
      {k: 'EP0·CErr / MaxPkt', v: '有效'},
      {k: 'EP0·MaxPStreams 等', v: '清 \'0\''},
    ],
    tint: C.driver,
    w: 440,
    rowSize: 18,
  });
  view.add(ic.node);
  ic.ref().position(new Vector2(TLx(480), TLy(270)));
  const q4 = makeChip(
    view,
    '"The Add Context flags A0 and A1 of the Input Control Context … shall be set to \'1\', and all remaining Add Context and Drop Context flags shall all be cleared to \'0\'." — §4.6.5 p98',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver, size: 16},
  );
  const n4 = makeNote(
    view,
    [
      'EP0 Context 须给四个有效值：TR Dequeue Pointer / EP Type /',
      'CErr / Max Packet Size；MaxPStreams、Max Burst Size、EP State',
      '清 \'0\'（L476-482）。其余端点上下文 xHC 一律忽略。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('装配 Input Context：A0+A1，其余全 0。', '④ / 10');
  slot.ref().opacity(0);
  ic.ref().opacity(1);
  q4().opacity(0.95);
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  q4().opacity(0);
  yield* waitFor(0.2);
  n4().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n4().opacity(0);
  ic.ref().opacity(0);
  yield* waitFor(0.25);
  ic.ref().remove();
  slot.ref().opacity(1);

  /* ===== ⑤ 发行算法 ===== */
  const trb: CardApi = makeCard({
    title: 'Address Device TRB',
    rows: [
      {k: 'TRB Type', v: 'Address Device'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Input Ctx Pointer', v: '指向④的 Input Context'},
      {k: '其余字段', v: '清 \'0\''},
      {k: 'Cycle bit', v: '命令环 PCS'},
    ],
    tint: C.driver,
    w: 500,
    rowSize: 19,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(700), TLy(285)));
  yield* stage.say('摆 TRB、敲门铃——流程与前三支同构。', '⑤ / 10');
  yield* cmd.fill(0, 'AddrDev', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  const q5 = makeChip(
    view,
    '"Ensure that the Device Context Base Address Array entry points to a properly sized and initialized Device Context … Insert an Address Device Command on the Command Ring … Write the Host Controller Doorbell with DB Target = Host Controller Command." — §4.6.5 p98-99',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver, size: 16},
  );
  q5().opacity(0.95);
  yield* flash(dcbaa.group, 1);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.6);
  q5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 守卫：slot 曾被 Enable？ ===== */
  const c6: CardApi = makeCard({
    title: '守卫分支',
    rows: [
      {k: '查 DCBAA/槽', v: '曾被 Enable Slot 使能？'},
      {k: '否', v: 'CC=Slot Not Enabled Error'},
      {k: '是', v: '取出 Output Device Context'},
    ],
    tint: C.warn,
    w: 440,
    rowSize: 19,
  });
  view.add(c6.node);
  yield* stage.say('先查槽：没使能过的槽直接报错。', '⑥ / 10');
  yield* cardIn(c6, new Vector2(TLx(1180), TLy(255)));
  yield* waitFor(0.4);
  yield* waitFor(3.0);
  c6.ref().opacity(0);
  yield* waitFor(0.25);
  c6.ref().remove();

  /* ===== ⑦ 执行：BSR=1 分支 ===== */
  const icB: CardApi = makeCard({
    title: 'Input Context',
    rows: [
      {k: 'Slot Context', v: '（整块拷贝）'},
      {k: 'EP0 Context', v: '（整块拷贝）'},
    ],
    tint: C.driver,
    w: 380,
    rowSize: 20,
  });
  view.add(icB.node);
  icB.ref().position(new Vector2(TLx(600), TLy(285)));
  const ocB: CardApi = makeCard({
    title: 'Output Device Context',
    rows: [
      {k: 'EP State (EP0)', v: '→ Running'},
      {k: 'Slot State', v: '→ Default'},
      {k: 'USB Device Address', v: '→ \'0\''},
      {k: 'Completion Code', v: 'Success'},
    ],
    tint: C.hc,
    w: 440,
    rowSize: 20,
  });
  view.add(ocB.node);
  ocB.ref().position(new Vector2(TLx(1180), TLy(285)));
  const cp1 = makeArrow(view, new Vector2(TLx(840), TLy(285)), new Vector2(TLx(950), TLy(285)), {color: C.evt});
  yield* stage.say('BSR=1 · Enabled：整块拷贝，槽落 Default。', '⑦ / 10');
  icB.ref().opacity(1);
  cp1().opacity(0.9);
  yield* flash(cp1, 1);
  ocB.ref().opacity(1);
  yield* waitFor(0.4);
  yield* waitFor(2.8);
  icB.ref().opacity(0);
  ocB.ref().opacity(0);
  cp1().opacity(0);
  yield* waitFor(0.2);
  icB.ref().remove();
  ocB.ref().remove();
  const n7 = makeChip(
    view,
    '非 Enabled 态 → CC=Context State Error（L547-549）。拷贝之外 xHC 补三笔：EP0→Running、Slot State→Default、Address→\'0\'（L527-545）。',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 17},
  );
  n7().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n7().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 执行：BSR=0 分支（SET_ADDRESS 全程） ===== */
  const sa: CardApi = makeCard({
    title: 'SET_ADDRESS 请求（xHC 构造）',
    rows: [
      {k: 'bmRequestType', v: '0'},
      {k: 'wValue', v: '选中的设备地址（0x11 示例）'},
      {k: 'wIndex', v: '0'},
      {k: 'wLength', v: '0'},
      {k: '寻径', v: 'Route String（取自 Input Slot Context）'},
    ],
    tint: C.dev,
    w: 560,
    rowSize: 19,
  });
  view.add(sa.node);
  sa.ref().position(new Vector2(TLx(700), TLy(300)));
  const ocC: CardApi = makeCard({
    title: 'SET_ADDRESS 成功 →',
    rows: [
      {k: '拷贝', v: 'Input Slot/EP0 → Output'},
      {k: 'EP State (EP0)', v: 'Running'},
      {k: 'Slot State', v: '→ Addressed'},
      {k: 'USB Device Address', v: '→ 0x11（xHC 选中）'},
      {k: 'Completion Code', v: 'Success'},
    ],
    tint: C.hc,
    w: 440,
    rowSize: 18,
  });
  view.add(ocC.node);
  ocC.ref().position(new Vector2(TLx(1180), TLy(300)));
  const cp2 = makeArrow(view, new Vector2(TLx(1000), TLy(300)), new Vector2(TLx(1090), TLy(300)), {color: C.dev});
  yield* stage.say('BSR=0 · 选地址下发 SET_ADDRESS，成功落 Addressed。', '⑧ / 10');
  sa.ref().opacity(1);
  yield* waitFor(0.3);
  cp2().opacity(0.9);
  yield* flash(cp2, 1);
  ocC.ref().opacity(1);
  slot.row(0)().text('Addressed ✓');
  yield* flash(slot.ref, 1);
  yield* waitFor(0.4);
  yield* waitFor(3.2);
  sa.ref().opacity(0);
  ocC.ref().opacity(0);
  cp2().opacity(0);
  yield* waitFor(0.2);
  sa.ref().remove();
  ocC.ref().remove();
  const n8 = makeNote(
    view,
    [
      '失败分支（L588-590）：SET_ADDRESS 不成功 → CC=USB Transaction Error，',
      '槽停在 Default，不进 Addressed。非 Enabled/Default 态 → Context State',
      'Error（L592-594）。软件负责 SetAddress() 恢复间隔计时与超时中止（L625-627）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  n8().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ 错误族与恢复动作 ===== */
  const c9: CardApi = makeCard({
    title: '错误族与恢复（Note 群）',
    rows: [
      {k: '地址耗尽', v: 'CC=Resource Error'},
      {k: 'context 无效', v: 'CC=Parameter Error · 输出不动'},
      {k: '失败恢复', v: 'Disable Slot + Enable Slot 重来'},
      {k: 'TT 后设备', v: '须发 CLEAR_TT_BUFFER'},
      {k: '命令被中止', v: '设备状态未知 · 软件须自恢复'},
      {k: '执行前提', v: '全部端点 Stopped 或 Idle'},
    ],
    tint: C.warn,
    w: 440,
    rowSize: 18,
  });
  view.add(c9.node);
  const q9 = makeChip(
    view,
    '"If a USB Transaction Error … may be due to a Stall response … Software should issue a Disable Slot Command for the Device Slot then an Enable Slot Command to recover from this error." — §4.6.5 p101',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn, size: 16},
  );
  yield* stage.say('失败不是终点：Disable+Enable 重来。', '⑨ / 10');
  yield* cardIn(c9, new Vector2(TLx(1180), TLy(285)));
  yield* waitFor(0.4);
  yield* waitFor(3.0);
  c9.ref().opacity(0);
  yield* waitFor(0.2);
  c9.ref().remove();
  q9().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  q9().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑩ 护栏：SET_ADDRESS 禁走 DCEP 环 + 首请求惯例（拆两段分时，避标签带） ===== */
  const n10a = makeNote(
    view,
    [
      '护栏一（L446-449）：xHC 若在 DCEP Transfer Ring 上检出 SET_ADDRESS 请求，',
      '对该 TD 回 TRB Error——SET_ADDRESS 永不通过 DCEP 环转发给设备',
      '（编址只属于本命令，不许走传输通道）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  const n10b = makeNote(
    view,
    [
      '护栏二（L428-436）：成功后的第一个请求应是 GET_DESCRIPTOR 且',
      'wLength=8——末字节 bMaxPacketSize0 定 DCEP 的 Max Packet Size，',
      '软件须把它写回 EP0 Context。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('两条护栏：编址不走传输环；首读定包长。', '⑩ / 10');
  n10a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n10a().opacity(0);
  yield* waitFor(0.2);
  n10b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n10b().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.5 Address Device',
    rows: [
      {k: '用途', v: 'Enabled/Default → Default/Addressed'},
      {k: 'BSR', v: '=1 缓发 SET_ADDRESS（老设备兼容）'},
      {k: 'Input Context', v: 'A0+A1=1 · Slot+EP0 有效'},
      {k: '成功', v: 'EP0 全通 · 槽落 Default/Addressed'},
      {k: '下一支', v: '§4.6.6 Configure Endpoint（本批）'},
    ],
    tint: C.hc,
    w: 920,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  dcbaa.group().opacity(0);
  dTitle().opacity(0);
  slot.ref().opacity(0);
  yield* stage.say('编址完成——EP0 就绪，下一步配置端点。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
