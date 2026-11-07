// §4.6.6 Configure Endpoint 配置端点 —— xHCI 1.2b p102-112（R10 批 B；示例 Slot ID=1 为课程示例值）
// 判据（evidence/spec-46.txt L657-1294，判据唯一事实源；与 ch4605 Address Device 衔接）：
//  - 目的："The Configure Endpoint Command is issued by software to enable, disable, or
//    reconfigure endpoints associated with a target configuration." (L659-660, p102)
//  - 三大场景（L665-704, p102）：
//    Configuring："To set a configuration in a device, software shall issue a Configure
//    Endpoint Command to the xHC in conjunction with issuing USB SET_CONFIGURATION
//    request to the device … transition a Device Slot from the Addressed to the
//    Configured state."（L667-672）
//    Deconfiguring："A USB device is 'deconfigured' by issuing a SET_CONFIGURATION
//    request … with configuration '0' … a Configure Endpoint Command with Deconfigure
//    (DC) = '1' … disable all enabled endpoints (except for the Default Control
//    Endpoint) … transition the Device Slot from the Configured to the Addressed
//    state."（L677-686）
//    Alt Interface："in conjunction with issuing USB SET_INTERFACE request … disable,
//    enable, or reconfigure a selected set of endpoints determined by the target
//    Alternate Interface."（L698-702）
//  - DC 捷径："Setting the Deconfigure (DC) flag to '1' … is equivalent to setting
//    Input Context Drop Context flags 2-31 to '1' and Add Context 2-31 flags to '0'.
//    If the DC flag = '1', the Input Context Pointer field shall be ignored by the
//    xHC and the Output Slot Context Context Entries field shall be set to '1'."
//                                                          (L689-693, p102)
//  - Input Context 旗标合同："The Add Context flag A1 and Drop Context flags D0 and D1
//    of the Input Control Context … shall be cleared to '0'. Endpoint 0 Context does
//    not apply to the Configure Endpoint Command … A0 shall be set to '1' … System
//    software shall initialize the Endpoint Contexts of the Input Context referenced
//    by Add Context flags. All Endpoint Context data structures not referenced by an
//    Add Context flag shall be ignored … Endpoint Context flags referenced only by a
//    Drop Context flag does not need to be initialized." (L732-743, p103)
//  - 评估顺序："The Drop Context flags are evaluated before the Add Context flags."
//    (L789)；资源/槽状态在全部评估完才修改（L752-756）；全局 Resources Available +
//    每 bus Bandwidth Available；临时变量 Resource Required / Bandwidth Required 初始
//    '0'（L758-787）；Drop=1 的 Disabled 端点=无操作（L801-816）
//  - 判定（L818-842, p104-105）："Resources Available - Resources Required is less than
//    0 → Resource Error"；"Bandwidth Available - Bandwidth Required is less than 0 →
//    Bandwidth Error"（次域=Secondary Bandwidth Error, L1226-1231）；可满足 → Success；
//    不成功 → 资源/带宽/Slot State/输出 EP Context 全不变（L843-855）
//  - undefined 警栏："xHC behavior is undefined if the Drop Context (D) flag is '0',
//    the Add Context (A) flag is '1', and the Output Endpoint Context is not in the
//    Disabled state (that is, software is trying to add an endpoint without dropping
//    its current resources)."                          (L856-859, p105)
//  - 成功四象限（L868-932, p105-106）：
//    D=0,A=0 → Do nothing，Input EP Context 忽略；
//    D=1,A=0 → 摘出 pipe scheduling list + EP State=Disabled + Input 忽略；
//    D=0,A=1 → 加入 pipe scheduling list + Input→Output 全字段拷贝（Stream Context
//    Array 所有权软件→xHC）+ EP State=Running + 使能 Device Context Doorbell；
//    D=1,A=1 → 释放旧资源带宽+分配新 + 全字段拷贝 + EP State=Running
//  - Slot State 收束（L934-942, p106）：全 Output EP Contexts（DCI 2-31）Disabled →
//    Slot State=Addressed；任一非 Disabled → Configured。执行算法同款："If all
//    Endpoints are Disabled: Set the Slot State … to Addressed. Set the Context
//    Entries field … to '1'. else … Set the Slot State … to Configured. Set the
//    Context Entries field … to the index of the last valid Endpoint Context."
//                                                          (L1193-1204, p110)
//  - Alt Interface 四规则（L943-958, p106-107）：不修改→D=0,A=0；新启用→D=0,A=1（初始化
//    Input EP Context）；禁用→D=1,A=0；参数修改→D=1,A=1
//  - 错误族：Slot State=Disabled → "Slot Not Enabled Error"（L975-976, p107）；
//    Bandwidth Error（L977-978）/ Resource Error（L979-981）；Input EP Context 无效
//    （"the DCI of an Add Context flag = '1' is greater than the value of Context
//    Entries field of the Input Slot Context" → Parameter Error，L1237-1239+
//    L1256-1257, p111）；Slot State 非 Addressed/Configured → Context State Error
//    （L1241-1243）；Max Exit Latency Too Large Error（L1259-1262）
//  - 成功后（L986-989, p107）："the enabled endpoints will be added to the xHCs' pipe
//    scheduling list, the respective Device Context Doorbells shall be enabled, and
//    TRBs can be posted to any enabled endpoint or Stream Transfer Ring."
//  - 双确认门（L965-972, p107）：配置/去配置须 Configure EP 成功 + SET_CONFIGURATION
//    成功，才可在新端点上排传输；Alt Interface 同理走 SET_INTERFACE
//  - Figure 4-3（L1007-1041, p108）：Input Context（Input Control Context A3/A30=1）→
//    Device Context 拷贝示意
//  - 4.6.6.1 ELD（L1270-1294, p111-112）：ELD 由完成事件 Command Completion Parameter
//    字段回报；'0'=不支持 hint；Success → 当前 Max Exit Latency 可再增的 μs 数；
//    Max Exit Latency Too Large Error → 须减的 μs 数；其余完成码字段清 '0'；计算值
//    过小则报 '1'（L1292-1294）
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
      <Txt ref={t1} text={'§4.6.6'} x={0} y={TLy(330)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Configure Endpoint'} x={0} y={TLy(470)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'配置端点 · xHCI 规范第 4 章 · p102–112'}
        x={0} y={TLy(590)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
      <Txt ref={t4} text={'示例：Slot ID=1（Addressed 槽）· 启用 EP1 IN / EP1 OUT —— 课程示例值'}
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
    section: '§4.6.6',
    zh: 'Configure Endpoint',
    en: 'Configure Endpoint Command · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.6.6 p102–112',
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

  const slot: CardApi = makeCard({
    title: '槽位状态',
    rows: [
      {k: '现态', v: 'Addressed（示例）'},
      {k: '配置成功', v: '→ Configured'},
      {k: '去配置（DC=1）', v: '→ Addressed'},
    ],
    tint: C.hc,
    w: 400,
    rowSize: 20,
  });
  view.add(slot.node);
  slot.ref().position(new Vector2(TLx(240), TLy(275)));
  slot.ref().opacity(1);

  /* ===== ① 目的 ===== */
  const q1 = makeChip(
    view,
    '"The Configure Endpoint Command is issued by software to enable, disable, or reconfigure endpoints associated with a target configuration." — §4.6.6 p102',
    {x: TLx(1140), y: TLy(285), w: 1360, tint: C.driver, size: 17},
  );
  yield* stage.say('一个命令，三种动作：启用/禁用/重配端点。', '① / 11');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 三大使用场景 ===== */
  const c2: CardApi = makeCard({
    title: '三大使用场景（L665-704）',
    rows: [
      {k: '配置设备', v: '配 SET_CONFIGURATION · Addressed→Configured'},
      {k: '去配置', v: 'DC=1 + SET_CONFIGURATION(0) · Configured→Addressed'},
      {k: '改交替接口', v: '配 SET_INTERFACE · 禁/启/重配选中端点'},
    ],
    tint: C.driver,
    w: 520,
    rowSize: 19,
  });
  view.add(c2.node);
  const n2 = makeNote(
    view,
    [
      '每个场景都是「xHC 命令 + USB 请求」成对出现——单发一边都不完整。',
      'xHC 不维护 配置↔端点 的对应关系，靠软件用 Add/Drop 旗标',
      '显式指出受影响端点（L711-726）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc},
  );
  yield* stage.say('三场景：配置 / 去配置 / 交替接口。', '② / 11');
  yield* cardIn(c2, new Vector2(TLx(1180), TLy(250)));
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  c2.ref().opacity(0);
  yield* waitFor(0.2);
  c2.ref().remove();
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ DC 旗标捷径（拆两段分时，避泳道标签带） ===== */
  const n3a = makeNote(
    view,
    [
      'DC=\'1\' 捷径（L689-693）：等价于 Drop 2-31 全 1、Add 2-31 全 0——',
      'Input Context Pointer 被 xHC 忽略（不用准备 Input Context），',
      '输出侧 Context Entries 直接落 \'1\'（只剩 EP0）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  const n3b = makeNote(
    view,
    [
      '只有 DCEP 的设备，发 SET_CONFIGURATION(0) 前无需本命令（L694-696）。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('DC=1：一条旗标顶三十二个。', '③ / 11');
  n3a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n3a().opacity(0);
  yield* waitFor(0.2);
  n3b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.2);
  n3b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ Input Context 旗标合同 ===== */
  const ic: CardApi = makeCard({
    title: 'Input Control Context（合同）',
    rows: [
      {k: 'A0 (Slot)', v: '1'},
      {k: 'A1 / D0 / D1', v: '0（EP0 不适用本命令）'},
      {k: '其余 A/D', v: '按受影响端点逐个定'},
      {k: 'Add 引用的 EP', v: 'Input EP Context 必须初始化'},
      {k: '仅 Drop 引用的 EP', v: '无需初始化'},
    ],
    tint: C.driver,
    w: 620,
    rowSize: 19,
  });
  view.add(ic.node);
  const q4 = makeChip(
    view,
    '"The Add Context flag A1 and Drop Context flags D0 and D1 of the Input Control Context … shall be cleared to \'0\'. … A0 shall be set to \'1\' …" — §4.6.6 p103',
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.driver, size: 16},
  );
  yield* stage.say('旗标合同：EP0 出局，A0 必须 1。', '④ / 11');
  slot.ref().opacity(0);
  ic.ref().opacity(1);
  ic.ref().position(new Vector2(TLx(420), TLy(268)));
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  ic.ref().opacity(0);
  yield* waitFor(0.2);
  ic.ref().remove();
  q4().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q4().opacity(0);
  slot.ref().opacity(1);
  yield* waitFor(0.25);

  /* ===== ⑤ 发行：摆 TRB + 敲门铃 ===== */
  const trb: CardApi = makeCard({
    title: 'Configure Endpoint TRB',
    rows: [
      {k: 'TRB Type', v: 'Configure Endpoint'},
      {k: 'Slot ID', v: '1（示例）'},
      {k: 'Input Ctx Pointer', v: '指向④的 Input Context（DC=1 时忽略）'},
      {k: 'DC / BSR 位', v: 'DC=去配置（本例 0）'},
      {k: '其余字段', v: '清 \'0\' · Cycle bit=PCS'},
    ],
    tint: C.driver,
    w: 560,
    rowSize: 18,
  });
  view.add(trb.node);
  yield* cardIn(trb, new Vector2(TLx(740), TLy(285)));
  yield* stage.say('摆 TRB、敲门铃（DB Target=HC Command）。', '⑤ / 11');
  yield* cmd.fill(0, 'CfgEP', C.driver);
  yield* cmd.enqTo(1);
  trb.ref().opacity(0);
  yield* waitFor(0.15);
  trb.ref().remove();
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  yield* waitFor(2.0);

  /* ===== ⑥ 评估：Drop 先于 Add，两个天平 ===== */
  const c6: CardApi = makeCard({
    title: '评估两变量（先 Drop 后 Add）',
    rows: [
      {k: 'Resource Required', v: 'Σ Drop 释放 − Σ Add 需求'},
      {k: 'Bandwidth Required', v: '周期端点同式记账'},
      {k: 'Drop 命中 Disabled', v: '无操作（本无配额）'},
      {k: '全部评完', v: '才动资源与 Slot State'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 19,
  });
  view.add(c6.node);
  const q6 = makeChip(
    view,
    '"The Drop Context flags are evaluated before the Add Context flags." "… a global Resources Available variable … a Bandwidth Available variable … Two temporary variables … Resource Required and Bandwidth Required. Both variables are initialized to \'0\'." — §4.6.6 p103-104',
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.hc, size: 15},
  );
  yield* stage.say('先评估后动账：资源与带宽两本天平。', '⑥ / 11');
  yield* cardIn(c6, new Vector2(TLx(1180), TLy(255)));
  yield* waitFor(0.4);
  yield* waitFor(3.0);
  c6.ref().opacity(0);
  yield* waitFor(0.2);
  c6.ref().remove();
  q6().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 判定与失败不动（拆两段分时，避泳道标签带） ===== */
  const n7a = makeNote(
    view,
    [
      '超额判定（L818-842）：Resources Available − Required < 0 → Resource Error；',
      'Bandwidth Available − Required < 0 → Bandwidth Error（次带宽域=',
      'Secondary Bandwidth Error）。可满足 → Success。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  const n7b = makeNote(
    view,
    [
      '失败的代价为零（L843-855）：资源、带宽、Slot State、输出 EP Context',
      '全部原样不动——先评估后动账的意义就在这。',
      'undefined 警栏（L856-859）：D=0、A=1 而输出端点非 Disabled（想加端点却不清旧账）——行为未定义。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.warn},
  );
  yield* stage.say('装不下就整体回滚，一个字段都不动。', '⑦ / 11');
  n7a().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n7a().opacity(0);
  yield* waitFor(0.2);
  n7b().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.6);
  n7b().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ 成功四象限（视觉核心） ===== */
  const q00: CardApi = makeCard({
    title: 'D=0 · A=0',
    rows: [{k: '动作', v: '无操作（Input 忽略）'}],
    tint: C.faint,
    w: 330,
    rowSize: 19,
  });
  const q10: CardApi = makeCard({
    title: 'D=1 · A=0（禁用）',
    rows: [
      {k: '调度', v: '摘出 pipe 调度表'},
      {k: 'EP State', v: '→ Disabled'},
    ],
    tint: C.warn,
    w: 330,
    rowSize: 19,
  });
  const q01: CardApi = makeCard({
    title: 'D=0 · A=1（启用）',
    rows: [
      {k: '调度', v: '加入 pipe 调度表'},
      {k: '拷贝', v: 'Input→Output 全字段'},
      {k: 'EP State', v: '→ Running · DB 使能'},
    ],
    tint: C.dev,
    w: 330,
    rowSize: 19,
  });
  const q11: CardApi = makeCard({
    title: 'D=1 · A=1（重配）',
    rows: [
      {k: '配额', v: '释放旧 · 分配新'},
      {k: '拷贝', v: 'Input→Output 全字段'},
      {k: 'EP State', v: '→ Running'},
    ],
    tint: C.hc,
    w: 330,
    rowSize: 19,
  });
  view.add(q00.node);
  view.add(q10.node);
  view.add(q01.node);
  view.add(q11.node);
  /* 布局批修：1×4 横排 y270（2×2 会压命令环带）；幕内槽卡暂隐让位 */
  q00.ref().position(new Vector2(TLx(390), TLy(295)));
  q10.ref().position(new Vector2(TLx(770), TLy(295)));
  q01.ref().position(new Vector2(TLx(1150), TLy(295)));
  q11.ref().position(new Vector2(TLx(1530), TLy(295)));
  const n8 = makeChip(
    view,
    '拷贝即所有权移交：Stream Context Array / Transfer Ring 从软件交到 xHC（L892-929）——Figure 4-3 的 Input Context → Device Context 箭头（p108）。',
    {x: TLx(880), y: TLy(560), w: 1440, tint: C.dev, size: 16},
  );
  yield* stage.say('四象限：00 不动 · 10 禁 · 01 启 · 11 换新。', '⑧ / 11');
  slot.ref().opacity(0);
  q00.ref().opacity(1);
  yield* waitFor(0.5);
  q10.ref().opacity(1);
  yield* waitFor(0.5);
  q01.ref().opacity(1);
  yield* flash(q01.ref, 1);
  yield* waitFor(0.5);
  q11.ref().opacity(1);
  yield* waitFor(0.5);
  q00.ref().opacity(0);
  q10.ref().opacity(0);
  q01.ref().opacity(0);
  q11.ref().opacity(0);
  yield* waitFor(0.2);
  q00.ref().remove();
  q10.ref().remove();
  q01.ref().remove();
  q11.ref().remove();
  n8().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(3.4);
  n8().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ Slot State 收束 + Context Entries ===== */
  const c9: CardApi = makeCard({
    title: 'Slot State 收束（L934-942 / L1193-1204）',
    rows: [
      {k: '全 DCI 2-31 Disabled', v: 'Slot State=Addressed'},
      {k: '…且', v: 'Context Entries=\'1\''},
      {k: '任一端点 enabled', v: 'Slot State=Configured'},
      {k: '…且', v: 'Entries=最后有效上下文索引'},
    ],
    tint: C.hc,
    w: 460,
    rowSize: 19,
  });
  view.add(c9.node);
  yield* stage.say('收束：全禁回 Addressed，有活端点则 Configured。', '⑨ / 11');
  slot.ref().opacity(1);
  yield* cardIn(c9, new Vector2(TLx(1180), TLy(255)));
  slot.row(0)().text('Configured ✓');
  yield* flash(slot.ref, 1);
  yield* waitFor(0.4);
  yield* waitFor(3.8);
  c9.ref().opacity(0);
  yield* waitFor(0.25);
  c9.ref().remove();

  /* ===== ⑩ Alt Interface 四规则 + 错误族 ===== */
  const c10: CardApi = makeCard({
    title: 'Alt Interface 四规则（L943-958）',
    rows: [
      {k: '端点不受影响', v: 'D=0 · A=0'},
      {k: '新启用', v: 'D=0 · A=1（须初始化）'},
      {k: '禁用', v: 'D=1 · A=0'},
      {k: '参数修改', v: 'D=1 · A=1'},
    ],
    tint: C.driver,
    w: 480,
    rowSize: 19,
  });
  view.add(c10.node);
  slot.ref().opacity(0);
  c10.ref().position(new Vector2(TLx(560), TLy(300)));
  const c10b: CardApi = makeCard({
    title: '错误族（L975-981 / L1237-1243）',
    rows: [
      {k: 'Slot State=Disabled', v: 'Slot Not Enabled Error'},
      {k: '带宽不够', v: 'Bandwidth Error'},
      {k: '资源不够', v: 'Resource Error'},
      {k: 'Add DCI > Entries', v: 'Parameter Error'},
      {k: '槽非 Addr/Cfg', v: 'Context State Error'},
      {k: '退出延迟超限', v: 'Max Exit Latency Too Large'},
    ],
    tint: C.warn,
    w: 460,
    rowSize: 18,
  });
  view.add(c10b.node);
  c10b.ref().position(new Vector2(TLx(1180), TLy(310)));
  yield* stage.say('交替接口拼旗标；错误六连看清。', '⑩ / 11');
  c10.ref().opacity(1);
  c10b.ref().opacity(1);
  yield* waitFor(0.4);
  yield* waitFor(4.4);
  c10.ref().opacity(0);
  c10b.ref().opacity(0);
  yield* waitFor(0.25);
  c10.ref().remove();
  c10b.ref().remove();

  /* ===== ⑪ 完成事件 + 双确认门 + ELD ===== */
  const c11: CardApi = makeCard({
    title: '完成事件与 ELD（4.6.6.1）',
    rows: [
      {k: '事件', v: 'CCE：CC=Success / 错误码'},
      {k: 'ELD=0', v: '不支持 hint'},
      {k: 'ELD·Success', v: 'Max Exit Latency 可增 μs 数'},
      {k: 'ELD·MELTL 错', v: '须减 μs 数'},
      {k: '其余 CC', v: 'Param 字段清 \'0\''},
    ],
    tint: C.evt,
    w: 460,
    rowSize: 18,
  });
  view.add(c11.node);
  const n11 = makeNote(
    view,
    [
      '双确认门（L965-972）：命令成功 + SET_CONFIGURATION（或 SET_INTERFACE）',
      '都成功，才可在新启用端点/流环上排传输——缺一不可。',
      '成功后（L986-989）：端点入调度表、DCB 使能、TRB 可上环。',
    ],
    {x: TLx(1200), y: TLy(285), w: 1180, tint: C.driver},
  );
  yield* stage.say('完成事件带 ELD 余量；排传输要双确认。', '⑪ / 11');
  yield* evt.fill(0, 'CCE', C.evt);
  yield* evt.enqTo(1);
  yield* cardIn(c11, new Vector2(TLx(1180), TLy(300)));
  yield* evt.deqTo(0, 0.4);
  yield* evt.consume(0);
  yield* evt.deqTo(1, 0.4);
  yield* waitFor(0.4);
  yield* waitFor(2.6);
  c11.ref().opacity(0);
  yield* waitFor(0.2);
  c11.ref().remove();
  n11().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n11().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.6.6 Configure Endpoint',
    rows: [
      {k: '用途', v: '启用/禁用/重配端点（三场景）'},
      {k: '旗标', v: 'Drop 先 Add 后 · 四象限处置'},
      {k: '天平', v: '资源/带宽先评估，失败零改动'},
      {k: '收束', v: 'Configured ↔ Addressed'},
      {k: '补丁片', v: 'ch4606p · Context Entries 计算修复（本批）'},
    ],
    tint: C.hc,
    w: 980,
    rowSize: 20,
  });
  view.add(sum.node);
  bell.ref().opacity(0);
  slot.ref().opacity(0);
  yield* stage.say('配置端点完成——设备进入工作形态。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.6);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
