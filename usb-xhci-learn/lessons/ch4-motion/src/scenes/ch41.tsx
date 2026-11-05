// §4.1 命令操作 Command Operation —— xHCI 1.2b p68
// 判据（evidence/spec-41.txt）：
//  - "There is only one Command Ring that is used for issuing xHC specific
//    commands or commands related to Device Slots."            (p68)
//  - 命令发出方式：命令 TRB 上命令环 → 写门铃寄存器 0 的 DB Target=0
//    （Host Controller Command）                                 (p68)
//  - "All commands result in the generation of a Command Completion
//    Event TRB on the Event Ring."                              (p68)
//  - CRCR 定义于 Operational 寄存器空间（§5.4.5 引用）           (p68)
//  - 中断可选：xHC 可由软件轮询事件环管理（§4.2 p69 脚注 7）
import {makeScene2D, Rect, Txt, Circle} from '@motion-canvas/2d';
import {createRef, Vector2, all, waitFor} from '@motion-canvas/core';
import {C, FONT, G, TLx, TLy} from '../lib/theme';
import {
  buildStage,
  lanesIn,
  makeCard,
  cardIn,
  makeRing,
  makeBell,
  makeChip,
  makeNote,
  makeArrow,
  makeCodePanel,
  flash,
  CardApi,
  StageApi,
  RingApi,
  CodePanelApi,
} from '../lib/parts';
import excerpts from '../../drafts/code-excerpts.json';

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt
        ref={t1}
        text={'§4.1'}
        x={0}
        y={TLy(380)}
        fontFamily={FONT.mono}
        fontSize={120}
        fontWeight={800}
        fill={C.hc}
      />
      <Txt
        ref={t2}
        text={'命令操作'}
        x={0}
        y={TLy(520)}
        fontFamily={FONT.sans}
        fontSize={88}
        fontWeight={800}
        fill={C.ink}
      />
      <Txt
        ref={t3}
        text={'Command Operation · xHCI 规范第 4 章 · p68'}
        x={0}
        y={TLy(640)}
        fontFamily={FONT.sans}
        fontSize={34}
        fill={C.dim}
      />
    </>,
  );
  yield* all(t1().opacity(1, 0.6), t2().opacity(1, 0.6));
  yield* t3().opacity(1, 0.6);
  yield* waitFor(5.3);
  yield* all(
    t1().opacity(0, 0.4),
    t2().opacity(0, 0.4),
    t3().opacity(0, 0.4),
  );
  t1().remove();
  t2().remove();
  t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.1',
    zh: '命令操作',
    en: 'Command Operation · 规范第 4 章 操作模型',
    cite: 'xHCI 1.2b §4.1 p68',
  });
  yield* lanesIn(stage);

  // 设备泳道常驻注记：命令不上总线
  const devNote = makeNote(
    view,
    [
      '本节命令不经过总线——命令是软件与 xHC 之间的管理通道。',
      '个别命令（如 Address Device）会让 xHC 在总线上代发 USB 请求：',
      '那是执行效果，设备看到的是 USB 请求，不是命令。（§4.3 展开）',
    ],
    {x: TLx(1210), y: TLy(G.laneDevY + 104), w: 850, tint: C.dev},
  );
  yield* devNote().opacity(0.85, 0.5);

  yield* stage.say(
    'xHCI 驱动发给 xHC 的所有命令，共用同一条通道（右侧：真实内核调用栈）。本节用一个例子走完它的完整流程。',
  );

  /* ===== 两条环 ===== */
  const cmd = makeRing(view, {
    y: G.cmdRingY,
    zh: '命令环 Command Ring',
    en: '',
    note: '系统内存 · 驱动写入 / xHC 读取',
    tint: C.driver,
  });
  const evt = makeRing(view, {
    y: G.evtRingY,
    zh: '事件环 Event Ring',
    en: '',
    note: '系统内存 · xHC 写入 / 驱动读取',
    tint: C.evt,
  });
  /* 代码栈面板（cmd 组，行内容逐字来自 drafts/code-excerpts.json）：
     右列 y 169..224 是驱动泳道标签带，面板落其下 240..415 净带 */
  const panel: CodePanelApi = makeCodePanel(view, {
    x: TLx(1660), y: TLy(327), w: 420, maxVisible: 3,
    title: 'Linux xhci 驱动 · drivers/usb/host/xhci-ring.c',
    lines: (excerpts as any).cmd.map((e: any) => ({line: e.line, code: e.code})),
  });
  yield* all(
    cmd.group().opacity(1, 0.5),
    evt.group().opacity(1, 0.5),
    panel.ref().opacity(1, 0.5),
  );
  cmd.markLink();
  evt.markLink();

  /* 断言一：唯一命令环 */
  const q1 = makeChip(
    view,
    '"There is only one Command Ring that is used for issuing xHC specific commands or commands related to Device Slots." — §4.1 p68',
    {x: 0, y: TLy(234), w: 1560, tint: C.driver, size: 19},
  );
  yield* q1().opacity(1, 0.4);
  yield* flash(cmd.group, 2);
  yield* stage.say(
    '整个 xHC 只有一条命令环——xHC 专属命令、设备槽相关命令，全部走它。',
    '断言 1/3',
  );
  yield* waitFor(11.5);
  yield* q1().opacity(0, 0.3);

  /* ===== ① 组命令 TRB ===== */
  const deskPos = new Vector2(TLx(430), TLy(G.laneDriverY + 122));
  const cmdCard = makeCard({
    title: 'Command TRB',
    tag: '示例：Enable Slot',
    rows: [
      {k: 'TRB Type', v: 'Enable Slot'},
      {k: 'Cycle bit', v: '1'},
      {k: '其余字段', v: '随命令而定'},
    ],
    tint: C.driver,
  });
  view.add(cmdCard.node);
  yield* cardIn(cmdCard, deskPos);
  yield* panel.highlight(0);
  yield* stage.say(
    '示例命令用 Enable Slot（TRB=传输请求块）。驱动把命令 TRB 放上命令环。',
    '① / 7',
  );
  yield* waitFor(7.5);
  yield* panel.highlight(3);

  const homePos = cmdCard.ref().position();
  yield* cmdCard.ref().position(cmd.cell(0), 0.7);
  yield* cmd.fill(0, 'Enable Slot', C.driver);
  cmdCard.ref().opacity(0);
  cmdCard.ref().position(homePos);
  yield* cmd.enqTo(1);

  /* ===== ② 敲门铃 ===== */
  const bell = makeBell(view, {x: TLx(790), y: TLy(548)});
  const a1 = makeArrow(
    view,
    new Vector2(TLx(410), TLy(G.laneDriverY + 172)),
    new Vector2(TLx(630), TLy(520)),
    {color: C.driver},
  );
  yield* all(bell.ref().opacity(1, 0.4), a1().opacity(0.9, 0.4));
  yield* panel.highlight(4);
  yield* stage.say(
    '然后敲命令门铃：写门铃寄存器 0，DB Target=0（Host Controller Command，门铃寄存器组见 §5.6）。',
    '② / 7',
  );
  yield* bell.ring('0');
  yield* waitFor(8.3);

  /* ===== ③ 取命令 ===== */
  const crcr = makeChip(
    view,
    'CRCR · Command Ring Control Register（Operational 寄存器 · §5.4.5）',
    {x: TLx(1170), y: TLy(545), w: 330, tint: C.hc, size: 18},
  );
  yield* crcr().opacity(1, 0.4);
  yield* stage.say('xHC 按 CRCR 记录的出环指针，从命令环取走命令 TRB。', '③ / 7');
  yield* cmd.deqTo(0);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1);
  yield* waitFor(6.2);

  /* ===== ④ 执行 ===== */
  const exec = createRef<Rect>();
  const execDot = createRef<Circle>();
  view.add(
    <Rect
      ref={exec}
      position={[TLx(1600), TLy(545)]}
      radius={12}
      fill={C.panelHi}
      stroke={C.hc}
      lineWidth={2}
      padding={[12, 18]}
      layout
      gap={10}
      opacity={0}
    >
      <Circle ref={execDot} size={14} fill={C.faint} />
      <Txt
        text={'执行命令'}
        fontFamily={FONT.sans}
        fontSize={24}
        fontWeight={700}
        fill={C.hc}
      />
    </Rect>,
  );
  yield* exec().opacity(1, 0.4);
  yield* stage.say(
    'xHC 执行命令。Enable Slot 的效果是分配一个设备槽——结果不直接返回，随完成事件回话。',
    '④ / 7',
  );
  for (let i = 0; i < 3; i++) {
    yield* execDot().fill(C.hc, 0.18);
    yield* execDot().fill(C.faint, 0.18);
  }
  execDot().fill(C.ok);

  /* ===== ⑤ 完成事件上事件环 ===== */
  const evtCard = makeCard({
    title: 'Completion Event TRB',
    rows: [
      {k: 'TRB Type', v: 'Command Completion'},
      {k: 'Command TRB 指针', v: '指向该命令'},
      {k: 'Slot ID', v: '1（示例值）'},
    ],
    tint: C.evt,
    w: 430,
  });
  view.add(evtCard.node);
  yield* exec().opacity(0, 0.25);
  yield* cardIn(evtCard, new Vector2(TLx(1555), TLy(545)));
  yield* panel.highlight(6);
  const q2 = makeChip(
    view,
    '"All commands result in the generation of a Command Completion Event TRB on the Event Ring." — §4.1 p68',
    {x: 0, y: TLy(724), w: 1560, tint: C.evt, size: 19},
  );
  yield* q2().opacity(1, 0.3);
  yield* stage.say(
    '所有命令都以命令完成事件收尾：xHC 把 Command Completion Event TRB 写到事件环。',
    '⑤ / 7',
  );
  yield* waitFor(6.2);
  yield* evtCard.ref().position(evt.cell(0), 0.7);
  yield* evt.fill(0, 'CCE', C.evt);
  yield* panel.highlight(7);
  evtCard.ref().opacity(0);
  yield* evt.enqTo(1);
  yield* waitFor(4.3);
  yield* q2().opacity(0, 0.3);

  /* ===== ⑥ 唤起软件 ===== */
  const irq = makeArrow(
    view,
    new Vector2(TLx(1420), TLy(500)),
    new Vector2(TLx(1000), TLy(326)),
    {color: C.hc, dash: true},
  );
  const irqLbl = makeChip(
    view,
    'MSI-X 中断唤起软件——中断可选：xHC 可由软件轮询事件环管理（§4.2 p69 脚注 7）',
    {x: TLx(980), y: TLy(300), w: 720, tint: C.hc, size: 18},
  );
  yield* all(irq().opacity(0.9, 0.4), irqLbl().opacity(1, 0.4));
  yield* stage.say('中断唤起软件。中断不是唯一手段——软件也可以轮询事件环。', '⑥ / 7');
  yield* waitFor(8.3);

  /* ===== ⑦ 读事件环收回执 ===== */
  const recv = makeCard({
    title: 'Command Completion Event',
    rows: [
      {k: 'Slot ID', v: '1'},
      {k: '意义', v: '设备槽 1 已分配'},
    ],
    tint: C.evt,
    w: 380,
  });
  view.add(recv.node);
  yield* evt.deqTo(0);
  yield* cardIn(recv, new Vector2(TLx(1600), TLy(545)));
  yield* panel.highlight(9);
  yield* evt.consume(0);
  yield* evt.deqTo(1);
  yield* stage.say(
    '驱动读事件环收回执：这条 Enable Slot 的完成事件里，带着 xHC 分配的 Slot ID。',
    '⑦ / 7',
  );
  yield* waitFor(12.6);

  yield* stage.say('命令模型三步走完：上环 → 敲门铃 → 等完成事件。');

  /* ===== 快放回放 ===== */
  yield* stage.say('快放回放一遍完整闭环。', '回放');
  const cap = [
    '① 命令 TRB 上环',
    '② 门铃 0 · DB Target=0',
    '③ CRCR 取命令',
    '④ xHC 执行',
    '⑤ 完成事件上事件环',
    '⑥ 中断/轮询唤起',
    '⑦ 收回执',
  ];
  let rb = 2; // cmd cell index
  let re_ = 1; // evt cell index
  const replayCard = makeCard({
    title: 'Command TRB',
    tag: '示例：No Op',
    rows: [
      {k: 'TRB Type', v: 'No Op'},
      {k: 'Cycle bit', v: '1'},
    ],
    tint: C.driver,
  });
  view.add(replayCard.node);
  // 回放段 exec 挪右下空袋（原位 1600,545 已被 ⑦ 收执卡 recv 长驻占用）
  exec().position(new Vector2(TLx(1750), TLy(640)));
  yield* exec().opacity(1, 0.25);
  for (let i = 0; i < cap.length; i++) {
    stage.caption().text(cap[i]);
    stage.step().text(`回放 ${i + 1}/7`);
    if (i === 0) {
      replayCard.ref().position(deskPos);
      yield* replayCard.ref().opacity(1, 0.2);
      yield* panel.highlight(3);
      yield* replayCard.ref().position(cmd.cell(rb), 0.5);
      yield* cmd.fill(rb, 'No Op', C.driver);
      replayCard.ref().opacity(0);
      yield* cmd.enqTo(rb + 1);
    } else if (i === 1) {
      yield* bell.ring('0');
      yield* panel.highlight(4);
    } else if (i === 2) {
      yield* cmd.deqTo(rb);
      yield* cmd.consume(rb);
      yield* cmd.deqTo(rb + 1);
    } else if (i === 3) {
      yield* execDot().fill(C.hc, 0.15);
      yield* execDot().fill(C.ok, 0.15);
    } else if (i === 4) {
      yield* evt.fill(re_, 'CCE', C.evt);
      yield* evt.enqTo(re_ + 1);
      yield* panel.highlight(6);
    } else if (i === 5) {
      yield* flash(irq, 2);
    } else {
      yield* evt.deqTo(re_);
      yield* evt.consume(re_);
      yield* evt.deqTo(re_ + 1);
      yield* panel.highlight(9);
    }
    yield* waitFor(2.9);
  }

  /* ===== 总结 ===== */
  const sum = makeCard({
    title: '§4.1 命令模型',
    rows: [
      {k: '通道', v: '唯一命令环 + 事件环回话'},
      {k: '门铃', v: 'Doorbell 0 · DB Target=0'},
      {k: '回执', v: 'Command Completion Event'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 24,
  });
  view.add(sum.node);
  // 总结卡清场：中带常驻件淡出，总结卡放设备泳道（devNote 同时淡出）
  yield* all(
    bell.ref().opacity(0, 0.3),
    crcr().opacity(0, 0.3),
    exec().opacity(0, 0.3),
    irq().opacity(0, 0.3),
    irqLbl().opacity(0, 0.3),
    a1().opacity(0, 0.3),
    devNote().opacity(0, 0.3),
  );
  yield* stage.say(
    '下一节看控制器上电后如何初始化（§4.2）。对照：Linux 内核 d9008e061539 xhci 驱动。',
    '完',
  );
  yield* cardIn(sum, new Vector2(TLx(960), TLy(844)));
  yield* waitFor(14.0);
  yield* all(sum.ref().opacity(0, 0.5), stage.caption().opacity(0, 0.5));
});
