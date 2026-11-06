// §4.5 Device Slot Management 设备槽管理 —— xHCI 1.2b p81–90
// 判据（evidence/spec-45.txt，464 行切片；n=1 为课程示例值）：
//  - "The xHCI supports up to 255 USB devices, where each USB device is
//    assigned to a Device Slot." + 三件套 "an entry in the Device Context
//    Base Address Array, a Device Context data structure, and a Doorbell
//    Register in the Doorbell Array."                     (L2-5, p81)
//  - "each element in the array is a 64-bit pointer to the base address of a
//    Device Context data structure."                      (L6-8, p81)
//  - 脚注11：总设备数 <256，部分槽保留                  (L13-15, p81)
//  - "The Slot ID is the index that software uses when accessing the Device
//    Context Base Address Array to retrieve a pointer to the Device Context
//    data structure or to access the Doorbell Register associated with a
//    device."                                             (L9-11, p81)
//  - 每槽一枚 32 位门铃寄存器、按 Slot ID 索引           (L70-71, p82)
//  - Fig 4-1：Device Context = 1 Slot Context + 31 Endpoint Context
//    （组织句逐字 L55-57；EP0 双向控制 L25-26；偏移/DCI 列 L32-51）
//  - "When software allocates a Device Context data structure all fields in
//    all entries shall be initialized to ‘0’."            (L58-59, p82)
//  - "Endpoint Context 0 is always associated with the Default Control
//    Endpoint of the device."                             (L68-69, p82)
//  - DCI：范围 0-31、Slot Context DCI=0                   (L90-93, p83)
//  - 公式逐字："DCI = (Endpoint Number * 2) + Direction,"（Direction ‘0’=OUT
//    ‘1’=IN）与 "DCI = (Endpoint Number * 2) + 1."        (L96-102, p83)
//  - Fig 4-2 五态 + 大泡泡注："The Enabled, Default, Addressed, and Configured
//    states may transition to the Disabled state due to a Disable Slot
//    Command, as noted by the large bubble."              (L183-192, p85)
//  - Enabled→Default：BSR=1                              (L311-313, p87)
//  - Enabled→Addressed：BSR=0                            (L314-316, p87)
//  - Addressed→Configured：DC=‘0’；DC=‘1’=No Op（"treated like a No Op
//    Command"）                                           (L368-374, p88)
//  - Reset Device：Addressed→Default（L375-376/L382-383 p88）、Configured→
//    Default（L412-414, p89）
//  - Configured→Addressed：deconfigure Configure Endpoint——DC 位值不上屏
//    （1.2b L410-411 印刷值疑勘误；出处行照引）           (L410-412, p89)
//  - Disabled 态：DCBAA 指针无效、唯一允许 Enable Slot Command
//                                                        (L284-288, p87)
//  - Table 4-1：五态 × DCBAA 指针/USB 地址/Slot State 值 (L207-235, L256-276)
//  - Slot State 值 ‘0’ 在 Disabled/Enabled 复用、xHC 永不真写 Enabled
//                                                        (L319-327, p87)
//  - §4.5.4.1 SET_ADDRESS：BSR=0 时 xHC 自动发并拦截软件自发（"shall not
//    generate a Setup transaction on the USB and shall complete with a TRB
//    Error Completion Code"）                             (L426-433, p89)
//  - §4.5.4.2 SET_CONFIGURATION：Configure Endpoint 命令 + 请求双操作同成
//    （"Undefined results may occur otherwise."）         (L436-439, p89)
//  - §4.5.4.3 SET_INTERFACE 同款双操作；不改 EP 参数时命令非必要
//                                                        (L456-462, p90)
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, waitFor} from '@motion-canvas/core';
import {C, FONT, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeChip,
  makeNote,
  makeCellStrip,
  makeArrow,
  flash,
  CardApi,
  StageApi,
  CellStripApi,
} from '../lib/parts';

type AnyRef = {(): any};

function* fadeOut(refs: AnyRef[], d = 0.2): ThreadGenerator {
  for (const r of refs) r().opacity(0);
  yield* waitFor(d);
  for (const r of refs) {
    try {
      r().remove();
    } catch {
      /* noop */
    }
  }
}

/* 状态机泡泡（本地件）：圆环+居中标签 */
function bubble(
  view: any,
  o: {x: number; y: number; label: string; tint: string},
): {g: AnyRef; ring: AnyRef} {
  const g = createRef<Rect>();
  const ring = createRef<Circle>();
  view.add(
    <Rect ref={g} position={[o.x, o.y]} opacity={0}>
      <Circle ref={ring} size={132} stroke={o.tint} lineWidth={3} fill={'#101823'} />
      <Txt text={o.label} fontFamily={FONT.sans} fontSize={26} fontWeight={700} fill={o.tint} />
    </Rect>,
  );
  return {g, ring};
}

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.5'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'设备槽管理'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={88} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'Device Slot Management · xHCI 规范第 4 章 · p81–90'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.4);
  t3().opacity(1);
  yield* waitFor(0.4);
  yield* waitFor(1.6);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.4);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.5',
    zh: '设备槽管理',
    en: 'Device Slot Management · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.5 p81–90',
  });
  yield* lanesIn(stage);

  /* ===== ① 255 槽鸟瞰：DCBAA 条 + 三件套卡 + 64 位指针 + 脚注 ===== */
  const dcbaa: CellStripApi = makeCellStrip(view, {
    x: TLx(330), y: TLy(470), n: 8, w: 130, h: 64, tint: C.hc,
    labels: ['0', '1', '2', '3', '…', '253', '254', '255'],
  });
  const dTitle = makeChip(
    view,
    'DCBAA · 255 项 · 每项=64 位指针 → Device Context 基址',
    {x: TLx(250), y: TLy(545), w: 360, tint: C.hc, size: 15},
  );
  const trio: CardApi = makeCard({
    title: 'Device Slot 三件套',
    rows: [
      {k: '①', v: 'DCBAA 表项（64 位指针）'},
      {k: '②', v: 'Device Context'},
      {k: '③', v: '门铃寄存器（32 位）'},
    ],
    tint: C.hc,
    w: 400,
    rowSize: 20,
  });
  view.add(trio.node);
  trio.ref().position(new Vector2(TLx(1650), TLy(560)));
  const foot = makeNote(
    view,
    [
      '脚注11：支持设备总数 <256——',
      '部分槽被 xHC 保留（如 VF），不都可用于枚举。',
    ],
    {x: TLx(400), y: TLy(860), w: 520, tint: C.dim},
  );
  const q1 = makeChip(
    view,
    '"The xHCI supports up to 255 USB devices … Each xHC Device Slot is comprised of 3 major components: an entry in the Device Context Base Address Array, a Device Context data structure, and a Doorbell Register in the Doorbell Array." — §4.5 p81',
    {x: TLx(960), y: TLy(265), w: 1560, tint: C.hc, size: 18},
  );
  dcbaa.group().opacity(1);
  dTitle().opacity(0.9);
  dcbaa.value[0]().text('保留');
  dcbaa.cell[1]().stroke(C.hc);
  dcbaa.value[1]().text('ctx 指针');
  trio.ref().opacity(1);
  foot().opacity(0.85);
  yield* waitFor(0.4);
  yield* stage.say('槽=三件套；DCBAA 每项=64 位指针。', '① / 6');
  q1().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② Slot ID 索引 ===== */
  const bells: CellStripApi = makeCellStrip(view, {
    x: TLx(330), y: TLy(640), n: 5, w: 130, h: 64, tint: C.hc,
    labels: ['0', '1', '2', '…', '255'],
  });
  const bTitle = makeChip(
    view,
    '门铃阵列 · 每槽一枚 32 位门铃寄存器',
    {x: TLx(1000), y: TLy(705), w: 720, tint: C.hc, size: 16},
  );
  const slotId = makeChip(
    view,
    'Slot ID = n（示例 n=1）',
    {x: TLx(470), y: TLy(300), w: 340, tint: C.driver, size: 20},
  );
  const a1 = makeArrow(
    view,
    new Vector2(TLx(470), TLy(335)),
    new Vector2(TLx(470), TLy(428)),
    {color: C.driver},
  );
  const a2 = makeArrow(
    view,
    new Vector2(TLx(470), TLy(508)),
    new Vector2(TLx(480), TLy(600)),
    {color: C.driver},
  );
  const q3 = makeChip(
    view,
    '"The Slot ID is the index that software uses when accessing the Device Context Base Address Array to retrieve a pointer to the Device Context data structure or to access the Doorbell Register associated with a device." — §4.5 p81',
    {x: TLx(1100), y: TLy(265), w: 1360, tint: C.driver, size: 18},
  );
  bells.group().opacity(1);
  bTitle().opacity(0.9);
  bells.value[0]().text('HC 命令');
  bells.cell[1]().stroke(C.hc);
  bells.value[1]().text('DB 寄存器');
  slotId().opacity(0.95);
  a1().opacity(0.9);
  a2().opacity(0.9);
  yield* waitFor(0.3);
  yield* stage.say('同一个 Slot ID：查 DCBAA[n]、敲门铃。', '② / 6');
  q3().opacity(0.95);
  yield* waitFor(0.3);
  yield* flash(dcbaa.cell[1], 1);
  yield* flash(bells.cell[1], 1);
  yield* waitFor(3.6);
  q3().opacity(0);
  yield* waitFor(0.25);

  /* 清场：鸟瞰件全撤 */
  yield* fadeOut([dcbaa.group, dTitle, trio.ref, foot, bells.group, bTitle, slotId, a1, a2]);

  /* ===== ③ Device Context 解剖（Fig 4-1 简化重绘） ===== */
  const rowsDef: [string, string, string][] = [
    ['000h', 'Slot Context', 'DCI 0'],
    ['020h', 'EP0 双向控制', 'DCI 1'],
    ['040h', 'EP1 OUT', 'DCI 2'],
    ['060h', 'EP1 IN', 'DCI 3'],
    ['…', '……', '…'],
    ['3C0h', 'EP15 OUT', 'DCI 30'],
    ['3E0h', 'EP15 IN', 'DCI 31'],
    ['400h', 'Reserved', 'Page Size-1'],
  ];
  const colG = createRef<Rect>();
  const colCells: AnyRef[] = [];
  view.add(
    <Rect ref={colG} position={[TLx(410), TLy(545)]} width={330} opacity={0}>
      <Rect position={[0, -170]} width={330} radius={10} fill={C.panelHi} stroke={C.edge} lineWidth={1.5} padding={[8, 10]}>
        <Txt text={'Device Context · Fig 4-1 简化'} fontFamily={FONT.mono} fontSize={18}
          fontWeight={700} fill={C.ink} />
      </Rect>
      {rowsDef.map((r, i) => {
        const cr = createRef<Rect>();
        colCells.push(cr);
        return (
          <Rect
            ref={cr}
            position={[0, -116 + i * 40]}
            width={326}
            height={36}
            radius={7}
            fill={i === 1 ? '#20304a' : C.chip}
            stroke={i === 1 ? C.driver : C.edge}
            lineWidth={i === 1 ? 1.8 : 1}
          >
            <Txt position={[-118, 0]} text={r[0]} fontFamily={FONT.mono} fontSize={16} fill={C.faint} />
            <Txt position={[6, 0]} text={r[1]} fontFamily={FONT.sans} fontSize={17}
              fill={i === 1 ? C.driver : C.dim} />
            <Txt position={[124, 0]} text={r[2]} fontFamily={FONT.mono} fontSize={15} fill={C.dim} />
          </Rect>
        );
      })}
    </Rect>,
  );
  const q4 = makeChip(
    view,
    '"The Device Context is organized as an array of 32 context data structures, consisting of 1 Slot Context and 31 Endpoint Context data structures." — §4.5 p82',
    {x: TLx(1250), y: TLy(240), w: 1300, tint: C.hc, size: 18},
  );
  const q5 = makeChip(
    view,
    '"When software allocates a Device Context data structure all fields in all entries shall be initialized to ‘0’." — §4.5 p82',
    {x: TLx(1250), y: TLy(395), w: 1300, tint: C.driver, size: 18},
  );
  const q6 = makeNote(
    view,
    [
      '"Endpoint Context 0 is always associated with the Default Control Endpoint of the device."（L68-69）',
      'EP0=双向控制端点（Bidirectional, Control EP，Fig 4-1 L25-26）。',
    ],
    {x: TLx(1250), y: TLy(550), w: 1250, tint: C.driver},
  );
  colG().opacity(1);
  yield* waitFor(0.3);
  yield* stage.say('1 Slot + 31 EP；分配时全 0；EP0 恒双向。', '③ / 6');
  q4().opacity(0.95);
  q5().opacity(0.95);
  q6().opacity(0.85);
  yield* waitFor(0.3);
  yield* waitFor(4.6);
  q4().opacity(0);
  q5().opacity(0);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ DCI 公式 + 算例 ===== */
  const formula: CardApi = makeCard({
    title: 'DCI 公式（§4.5.1 逐字）',
    rows: [
      {k: 'Isoch/Int/Bulk', v: 'DCI = (Endpoint Number * 2) + Direction,'},
      {k: 'Direction', v: '‘0’ = OUT · ‘1’ = IN'},
      {k: 'Control', v: 'DCI = (Endpoint Number * 2) + 1.'},
    ],
    tint: C.driver,
    w: 900,
    rowSize: 19,
  });
  view.add(formula.node);
  const qr = makeChip(
    view,
    '"The range of DCI values is 0 to 31." "The DCI of the Slot Context is 0." — §4.5.1 p83',
    {x: TLx(1010), y: TLy(475), w: 900, tint: C.dim, size: 18},
  );
  const exs = [
    makeChip(view, 'EP1 · OUT · bulk → (1×2)+0 = 2', {x: TLx(1700), y: TLy(230), w: 340, tint: C.evt, size: 18}),
    makeChip(view, 'EP2 · IN · control → (2×2)+1 = 5', {x: TLx(1700), y: TLy(315), w: 340, tint: C.evt, size: 18}),
    makeChip(view, 'EP0 · control → (0×2)+1 = 1', {x: TLx(1700), y: TLy(400), w: 340, tint: C.evt, size: 18}),
  ];
  yield* cardIn(formula, new Vector2(TLx(1010), TLy(285)));
  yield* stage.say('公式两条+算例三连：2、5、1。', '④ / 6');
  qr().opacity(0.95);
  yield* waitFor(0.2);
  exs[0]().opacity(0.95);
  yield* waitFor(0.2);
  exs[1]().opacity(0.95);
  yield* waitFor(0.2);
  exs[2]().opacity(0.95);
  yield* flash(colCells[1], 1);
  yield* waitFor(3.9);
  yield* fadeOut([formula.ref, qr, exs[0], exs[1], exs[2], colG]);

  /* ===== ⑤ 槽位状态机（Fig 4-2 重绘）：主线 ===== */
  const bDis = bubble(view, {x: TLx(330), y: TLy(560), label: 'Disabled', tint: C.dim});
  const bEnb = bubble(view, {x: TLx(700), y: TLy(560), label: 'Enabled', tint: C.hc});
  const bDef = bubble(view, {x: TLx(960), y: TLy(320), label: 'Default', tint: C.evt});
  const bAdd = bubble(view, {x: TLx(1230), y: TLy(560), label: 'Addressed', tint: C.driver});
  const bCfg = bubble(view, {x: TLx(1610), y: TLy(560), label: 'Configured', tint: C.dev});
  const m1 = makeArrow(view, new Vector2(TLx(396), TLy(560)), new Vector2(TLx(634), TLy(560)), {color: C.hc});
  const m2 = makeArrow(view, new Vector2(TLx(766), TLy(560)), new Vector2(TLx(1164), TLy(560)), {color: C.driver});
  const m3 = makeArrow(view, new Vector2(TLx(1296), TLy(560)), new Vector2(TLx(1544), TLy(560)), {color: C.dev});
  const l1 = makeChip(view, 'Enable Slot', {x: TLx(515), y: TLy(645), w: 190, tint: C.hc, size: 16});
  const l2 = makeChip(view, 'Address Device · BSR=0', {x: TLx(965), y: TLy(645), w: 290, tint: C.driver, size: 16});
  const l3 = makeChip(view, 'Configure Endpoint · DC=0', {x: TLx(1420), y: TLy(645), w: 300, tint: C.dev, size: 16});
  const token = createRef<Circle>();
  view.add(<Circle ref={token} size={20} fill={C.warn} position={[TLx(330), TLy(470)]} opacity={0} />);
  for (const b of [bDis, bEnb, bDef, bAdd, bCfg]) b.g().opacity(1);
  m1().opacity(0.9); m2().opacity(0.9); m3().opacity(0.9);
  l1().opacity(0.9); l2().opacity(0.9); l3().opacity(0.9);
  token().opacity(1);
  yield* waitFor(0.4);
  yield* stage.say('主线：Enable Slot→Enabled→Addressed→Configured。', '⑤ / 6');
  yield* token().position(new Vector2(TLx(700), TLy(470)), 0.5);
  yield* waitFor(0.25);
  yield* token().position(new Vector2(TLx(1230), TLy(470)), 0.6);
  yield* waitFor(0.25);
  yield* token().position(new Vector2(TLx(1610), TLy(470)), 0.6);
  yield* waitFor(3.9);

  /* 侧路与回退（含 No Op 注记） */
  const s1 = makeArrow(view, new Vector2(TLx(700), TLy(494)), new Vector2(TLx(920), TLy(386)), {color: C.evt, dash: true});
  const s2 = makeArrow(view, new Vector2(TLx(1230), TLy(494)), new Vector2(TLx(1010), TLy(386)), {color: C.evt, dash: true});
  const s3 = makeArrow(view, new Vector2(TLx(1520), TLy(505)), new Vector2(TLx(1280), TLy(505)), {color: C.warn, dash: true});
  const sl1 = makeChip(view, 'BSR=1 → Default', {x: TLx(760), y: TLy(368), w: 220, tint: C.evt, size: 16});
  const sl2 = makeChip(view, 'Reset Device：Addressed/Configured → Default', {x: TLx(1240), y: TLy(370), w: 420, tint: C.evt, size: 16});
  const sl3 = makeChip(view, '去配置 → Addressed', {x: TLx(1410), y: TLy(470), w: 250, tint: C.warn, size: 16});
  const noop = makeChip(
    view,
    'Addressed 态：Configure Endpoint · DC=‘1’ = 视作 No Op（"treated like a No Op Command" §4.5.3.5 p88）',
    {x: TLx(1230), y: TLy(700), w: 760, tint: C.dim, size: 17},
  );
  yield* stage.say('侧路：BSR=1、Reset Device、去配置。', '⑤ / 6');
  s1().opacity(0.9); s2().opacity(0.9); s3().opacity(0.9);
  sl1().opacity(0.9); sl2().opacity(0.9); sl3().opacity(0.9);
  noop().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.0);

  /* Disable Slot 大泡泡 */
  const dis1 = makeChip(
    view,
    'Disable Slot Command：Enabled / Default / Addressed / Configured 任一态 → Disabled（"…as noted by the large bubble" Fig 4-2 p85）',
    {x: TLx(960), y: TLy(745), w: 1560, tint: C.dim, size: 17},
  );
  const dis2 = makeChip(
    view,
    '"The only command that software is allowed to issue for the slot in this state is the Enable Slot Command." — §4.5.3.2 p87',
    {x: TLx(960), y: TLy(835), w: 1560, tint: C.dim, size: 17},
  );
  yield* stage.say('Disable Slot：任四态 → Disabled。', '⑥ / 6');
  dis1().opacity(0.95);
  dis2().opacity(0.95);
  bDis.ring().stroke(C.warn);
  bDis.ring().lineWidth(5);
  yield* waitFor(0.3);
  yield* flash(bDis.g, 2);
  yield* waitFor(3.8);

  /* ===== ⑦ Table 4-1 精简卡 ===== */
  yield* fadeOut([bDis.g, bEnb.g, bDef.g, bAdd.g, bCfg.g, m1, m2, m3, l1, l2, l3,
    s1, s2, s3, sl1, sl2, sl3, noop, token, dis1, dis2]);
  const tbl: CardApi = makeCard({
    title: 'Table 4-1 · Device Slot State Code Definitions',
    rows: [
      {k: 'Disabled', v: '指针 无效 · 地址 N/A · 值 Disabled'},
      {k: 'Enabled', v: '指针 无效 · 地址 0 · 值 Disabled（0 复用）'},
      {k: 'Default', v: '指针 有效 · 地址 0 · 值 Default'},
      {k: 'Addressed', v: '指针 有效 · 地址 Assigned · 值 Addressed'},
      {k: 'Configured', v: '指针 有效 · 地址 Assigned · 值 Configured'},
    ],
    tint: C.evt,
    w: 1020,
    rowSize: 20,
  });
  view.add(tbl.node);
  const tq = makeChip(
    view,
    '"the Slot State field value ‘0’ is overloaded for the Disabled and Enabled states"…"there never is a case where the xHCI would actually set the Slot State field to Enabled" — §4.5.3.3 p87 Note',
    {x: TLx(960), y: TLy(265), w: 1560, tint: C.dim, size: 17},
  );
  yield* cardIn(tbl, new Vector2(TLx(960), TLy(560)));
  yield* stage.say('Table 4-1：指针/地址/Slot State 值。', '⑦ / 6');
  tq().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(4.4);
  tq().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑧ §4.5.4 USB 请求映射 ===== */
  tbl.ref().opacity(0);
  yield* waitFor(0.2);
  tbl.ref().remove();
  const mTitle = makeChip(
    view,
    '§4.5.4 USB Standard Device Request → xHCI Command Mapping',
    {x: TLx(960), y: TLy(230), w: 1000, tint: C.hc, size: 19},
  );
  const mq1 = makeNote(
    view,
    [
      'SET_ADDRESS（§4.5.4.1 p89）："During the execution of the Address Device Command with BSR = ‘0’, the xHC shall automatically issue a SET_ADDRESS request … and block any SET_ADDRESS Requests issued by software."',
      '软件自发的 SET_ADDRESS Setup TD：不上总线，以 TRB Error Completion Code 完成。',
    ],
    {x: TLx(760), y: TLy(400), w: 1080, tint: C.driver},
  );
  yield* stage.say('SET_ADDRESS：xHC 自动发+拦截。', '⑧ / 6');
  mTitle().opacity(0.95);
  mq1().opacity(0.85);
  yield* waitFor(0.3);
  yield* waitFor(4.2);
  mq1().opacity(0);
  yield* waitFor(0.2);
  const mq2 = makeNote(
    view,
    [
      'SET_CONFIGURATION（§4.5.4.2 p89）："system software shall complete a successful Configure Endpoint command to the xHC and a successful SET_CONFIGURATION request to a device. Undefined results may occur otherwise."',
      'SET_INTERFACE（§4.5.4.3 p90）同款双操作。',
    ],
    {x: TLx(760), y: TLy(420), w: 1080, tint: C.dev},
  );
  const mq3 = makeNote(
    view,
    [
      '"A Configure Endpoint Command is not necessary if a SET_INTERFACE request does not change any Endpoint Context parameters."（§4.5.4.3 p90，SET_CONFIGURATION 同款注记 L445-446）',
    ],
    {x: TLx(760), y: TLy(640), w: 1080, tint: C.dim},
  );
  yield* stage.say('配置两请求：命令+请求双操作同成。', '⑧ / 6');
  mq2().opacity(0.85);
  mq3().opacity(0.85);
  yield* waitFor(0.3);
  yield* waitFor(4.4);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.5 设备槽管理',
    rows: [
      {k: '三件套', v: 'DCBAA 表项 + Device Context + 门铃'},
      {k: 'DCI', v: '(EP 号 × 2) + 方向；控制端点 +1'},
      {k: '状态机', v: 'Disabled→Enabled→Addressed→Configured'},
      {k: '映射', v: 'USB 标准请求 ↔ xHCI 命令（§4.5.4）'},
    ],
    tint: C.hc,
    w: 940,
    rowSize: 21,
  });
  view.add(sum.node);
  mTitle().opacity(0);
  mq2().opacity(0);
  mq3().opacity(0);
  yield* waitFor(0.25);
  yield* stage.say('槽管理走完——下一节 §4.6。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(4.0);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
