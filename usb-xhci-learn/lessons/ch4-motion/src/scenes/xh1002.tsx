// §4.10.2 Errors 错误族 —— xHCI 1.2b p175-184（R12 批 B 巨头支；九小节主线，
// 表格降密度：Table 4-5/4-6 代表行上屏、全表归 landing）
// 判据（evidence/spec-410.txt，判据唯一事实源）：
//  - 总则："The detection of an error during a USB transfer shall always generate a
//    Transfer Event, irrespective of whether the Interrupt-on-Short Packet (ISP) or
//    Interrupt On Completion (IOC) flags are set in the Transfer TRB. The Completion
//    Code of the Transfer Event shall identify the detected error condition. An error
//    may occur on any TRB of a TD."                             (L281-285, p175)
//  - 环错误→halt："All Transfer Ring error conditions force the state of the
//    associated endpoint to Halted and require system software intervention to
//    recover."（L292-293）；isoch 例外："An isoch endpoint never halts because there
//    is no handshake to report a halt condition. … If an error is detected, the xHC
//    shall continue to process the data associated with the next ESIT of the
//    transfer."（L296-304, p176）
//  - 4.10.2.1 Stall：STALL PID(USB2)/LMP(USB3) 语义（L307-313, p176）；xHC 三件套
//    "When a STALL PID is received from a USB device by the xHC, it shall stop
//    further activity on the associated Transfer Ring by removing it from its Pipe
//    Schedule, set the associated Endpoint State (EP State) field to Halted, and
//    generate a Transfer Event TRB with a Stall Error."（L314-317）；SETUP STALL
//    Note（L318-319）
//  - 两步恢复（L320-346, p176-177）：① "System software shall use a Reset Endpoint
//    Command … to remove the Halted condition in the xHC. After the successful
//    completion of the Reset Endpoint Command, the Endpoint Context is transitioned
//    from the Halted to the Stopped state and the Transfer Ring of the endpoint is
//    reenabled. The next write to the Doorbell of the Endpoint will transition the
//    Endpoint Context from the Stopped to the Running state."（L321-327）；
//    "Software intervention is required to recover the pipe within the USB device."
//    （L344-346）
//  - halt 移除两形态：非 Control（L347-353）"Removal of the halt condition on an
//    interrupt or bulk pipe in a USB device is achieved via software intervention
//    through a separate control pipe."+时机 Note；Isoch 无 Stall Note（L354-355）；
//    Control（L356-360）"Removal of the halt condition on the Control endpoint of a
//    USB device is achieved by the device accepting the next SETUP PID. For Control
//    endpoints, a reset of the USB device shall be required to clear the halt or
//    error condition if the device does not accept the next Setup PID."
//  - 4.10.2.2 TRB Error（L362-376, p177-178）："A TRB Error indicates the TRB field
//    values are out of range or that the xHC has determined that a TRB is incorrectly
//    formed."（L364-365）；Transfer Event 或 Command Completion Event 报（L366-368）；
//    "A Transfer Ring TRB Error should transition an endpoint to the Error state"（L369-371）
//  - 4.10.2.3 USB Transaction Error（L384-428, p178-179）："A transaction error is
//    any error that causes the host controller to not complete a transfer
//    successfully. Table 4-5 lists the events/responses that the xHC can observe as
//    a result of a transaction."（L386-388）；Setup 专属 Bad PID 四情形（L398-405）；
//    Table 4-5 五行（L410-425）：CRC/DPP→CErr→USB Transaction；Timeout→CErr(USB2)/
//    N/A(USB3)→USB Transaction；Bad PID→CErr→USB Transaction；Babble→N/A→Babble
//    Detected Error；Buffer Error→N/A→Data Buffer Error
//  - 4.10.2.4 Babble（L454-474, p179-180）：三形态 "When a device sends more data
//    than the TD Transfer Size bytes (TD Babble), unexpected activity that persists
//    beyond a specified point in a (micro)frame (Frame Babble), or a packet greater
//    than Max Packet Size (Packet Babble), the host controller shall set the Babble
//    Detected Error in the Completion Code field of the TRB, generate an Error
//    Event, and halt the endpoint"（L458-463）；"The Bus Error Counter is not
//    decremented for a Babble Error condition."（L463-464）；Soft Retry 禁 Note
//    （L468-469）；数据可能入 buffer Note（L470-474）
//  - 4.10.2.4.1 USB2（L475-515, p179-180）："A babble condition also exists if IN
//    transaction is in progress at High-speed EOF2 point. This is called a Frame
//    Babble."（L476-477）+Root Hub port disable（L480-481）+"The xHC shall never
//    start an OUT transaction that will babble across a microframe EOF."（L481-482）；
//    Port_Error Note（L496-499）；4.10.2.4.2 USB3（L516-520）："A babble condition
//    also exists if on an IN transaction the DPP exceeds the Max Packet Size."
//  - 4.10.2.5 Data Buffer Error（L521-550, p180-181）："This event indicates that an
//    overrun of incoming data or an underrun of outgoing data has occurred for this
//    Transfer TRB."（L523-524）；"These conditions are not considered transaction
//    errors, and do not affect the Bus Error Count."（L526-527）；IN 不发握手强制重发
//    （L531-534）；OUT 破坏包尾（L535-538）
//  - 4.10.2.6 Host System Errors（L551-625, p181-182）："If a catastrophic error
//    occurs during a host system access involving the Host Controller module the
//    Host System Error (HSE) bit in the USBSTS register shall be set to '1'. … When
//    this error occurs, the Host Controller shall clear the Run/Stop (R/S) bit in
//    the USBCMD register to prevent further execution of the scheduled TDs."
//    （L563-568）；四 Event TRB 问题迹象（L569-580）；HSE fatal vs HCE 可恢复
//    （L597-606）："Host Controller Error (HCE) should be used to report internal xHC
//    error conditions which might be recovered from by software resetting and
//    reinitialization of the xHC."
//  - 4.10.2.7 Bus Error Counter（L626-679, p182-183）："The Bus Error Counter is an
//    internal 2-bit down counter that the xHC maintains. This counter determines the
//    number of consecutive Errors allowed while executing a USB Transaction."
//    （L628-630）；"The xHC initializes this internal Bus Error Counter to the value
//    defined by the Endpoint Context Error Count (CErr) field on the first
//    transmission of a packet and decrements it when an error is detected, if the
//    Bus Error Counter reaches 0, then a hard-error is generated."（L636-639）；
//    Table 4-6 五行（L653-675）：Transaction Error→Yes；Stalled/Babble Detected→No
//    （halt 自动）；No Error→No（成功应重置回 CErr）；Data Buffer Error→No（host
//    问题）；CErr='0' 禁 Note（L677-679）
//  - 4.10.2.8 Isoch 错误处理（L680-730, p183-184）："CErr does not apply to Isoch
//    Data Transactions because retries are not performed on Isoch endpoints. Also an
//    Isoch endpoint shall not halt due to a Data Transaction error, but instead
//    shall advance to the next Isoch TD and attempt to execute it during the next
//    ESIT."（L682-685）；错误必报事件+TRB Pointer/Length 口径（L685-694）；CC 判据
//    （L695-699）；Event Data/Link 解析（L700-722）
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

export default makeScene2D(function* (view) {
  view.fill(C.bg);

  /* ===== 片头 ===== */
  const t1 = createRef<Txt>();
  const t2 = createRef<Txt>();
  const t3 = createRef<Txt>();
  view.add(
    <>
      <Txt ref={t1} text={'§4.10.2'} x={0} y={TLy(350)} fontFamily={FONT.mono}
        fontSize={120} fontWeight={800} fill={C.hc} />
      <Txt ref={t2} text={'Errors 错误族'} x={0} y={TLy(490)} fontFamily={FONT.sans}
        fontSize={84} fontWeight={800} fill={C.ink} />
      <Txt ref={t3} text={'九小节错误主线 · Table 4-5 / 4-6 · xHCI 规范第 4 章 · p175–184'}
        x={0} y={TLy(610)} fontFamily={FONT.sans} fontSize={34} fill={C.dim} />
    </>,
  );
  t1().opacity(1);
  t2().opacity(1);
  yield* waitFor(0.35);
  t3().opacity(1);
  yield* waitFor(0.35);
  yield* waitFor(1.0);
  t1().opacity(0);
  t2().opacity(0);
  t3().opacity(0);
  yield* waitFor(0.3);
  t1().remove(); t2().remove(); t3().remove();

  /* ===== 舞台 ===== */
  const stage: StageApi = buildStage(view, {
    section: '§4.10.2',
    zh: 'Errors 错误族',
    en: 'Stall · TRB/Xact/Babble/Buffer · HSE · CErr · Isoch',
    cite: 'xHCI 1.2b §4.10.2 p175–184',
  });
  yield* lanesIn(stage);

  /* 命令环 + 传输环 + 门铃 + EP 状态卡 */
  const cmd: RingApi = makeRing(view, {
    y: 470, zh: '命令环 Command Ring', en: '',
    note: 'Reset EP 恢复路径', tint: C.driver, x0: 760, x1: 1450, n: 10,
  });
  const xfer: RingApi = makeRing(view, {
    y: 655, zh: '传输环 Transfer Ring', en: '',
    note: '错误原地停走', tint: C.warn, x0: 760, x1: 1450, n: 10,
  });
  cmd.group().opacity(1);
  xfer.group().opacity(1);
  yield* waitFor(0.2);
  cmd.markLink(); xfer.markLink();
  const bell = makeBell(view, {x: TLx(1680), y: TLy(565)});
  const ep: CardApi = makeCard({
    title: 'Endpoint Context',
    rows: [
      {k: 'EP State', v: 'Running'},
      {k: 'Pipe Schedule', v: '在排'},
      {k: '恢复', v: '——'},
    ],
    tint: C.hc,
    w: 440,
    rowSize: 20,
  });
  view.add(ep.node);
  ep.ref().position(new Vector2(TLx(230), TLy(300)));
  ep.ref().opacity(1);
  yield* waitFor(0.25);

  /* ===== ① 总则：错误必报 ===== */
  const q1 = makeChip(
    view,
    '"The detection of an error during a USB transfer shall always generate a Transfer Event, irrespective of whether the Interrupt-on-Short Packet (ISP) or Interrupt On Completion (IOC) flags are set in the Transfer TRB. The Completion Code of the Transfer Event shall identify the detected error condition. An error may occur on any TRB of a TD." — §4.10.2 p175',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  yield* stage.say('错误族总则：错误一律报事件，CC 指明错误。', '① / 13');
  q1().opacity(0.95);
  yield* xfer.fill(0, 'TD', C.driver);
  yield* xfer.fill(1, 'err', C.warn);
  yield* xfer.enqTo(2);
  yield* waitFor(0.3);
  yield* waitFor(3.9);
  q1().opacity(0);
  yield* waitFor(0.25);

  /* ===== ② 环错误→Halted + isoch 例外 ===== */
  const q2 = makeChip(
    view,
    '"All Transfer Ring error conditions force the state of the associated endpoint to Halted and require system software intervention to recover." — §4.10.2 p176',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 18},
  );
  const n2 = makeNote(
    view,
    [
      'isoch 例外（L296-304）：没有握手可报 halt，isoch 端点永不',
      'halt——错误以 CC 附在 TRB 上报，xHC 继续处理下一 ESIT 的',
      '数据（USB3 同口径，规范明记）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('传输环错误全族压向 Halted；isoch 永不 halt。', '② / 13');
  q2().opacity(0.95);
  ep.row(0)().text('Halted');
  yield* flash(ep.ref, 1);
  ep.row(1)().text('已移出');
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q2().opacity(0);
  yield* waitFor(0.2);
  n2().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n2().opacity(0);
  yield* waitFor(0.25);

  /* ===== ③ 4.10.2.1 Stall 三件套 ===== */
  const q3 = makeChip(
    view,
    '"When a STALL PID is received from a USB device by the xHC, it shall stop further activity on the associated Transfer Ring by removing it from its Pipe Schedule, set the associated Endpoint State (EP State) field to Halted, and generate a Transfer Event TRB with a Stall Error." — §4.10.2.1 p176',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  const n3 = makeNote(
    view,
    [
      'STALL 语义（L307-313）：设备无法收发数据/控制请求不支持；',
      'SETUP 阶段回 STALL 亦报 Stall Error 并 halt（Note L318-319）。',
      'xHC 自身任何情况下不得回 STALL（L312-313）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('Stall 三件套：摘排、置 Halted、报事件。', '③ / 13');
  q3().opacity(0.95);
  ep.row(2)().text('Stall Error');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q3().opacity(0);
  yield* waitFor(0.2);
  n3().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.6);
  n3().opacity(0);
  yield* waitFor(0.25);

  /* ===== ④ 两步恢复：Reset Endpoint → 门铃 ===== */
  const q4 = makeChip(
    view,
    '"System software shall use a Reset Endpoint Command … to remove the Halted condition in the xHC. After the successful completion of the Reset Endpoint Command, the Endpoint Context is transitioned from the Halted to the Stopped state and the Transfer Ring of the endpoint is reenabled. The next write to the Doorbell of the Endpoint will transition the Endpoint Context from the Stopped to the Running state." — §4.10.2.1 p176',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.driver, size: 15},
  );
  yield* stage.say('第一步 Reset EP：Halted→Stopped，门铃再回 Running。', '④ / 13');
  q4().opacity(0.95);
  yield* cmd.fill(0, 'RstEP', C.driver);
  yield* cmd.enqTo(1);
  yield* bell.ring('0');
  yield* cmd.deqTo(0, 0.4);
  yield* cmd.consume(0);
  yield* cmd.deqTo(1, 0.4);
  ep.row(0)().text('Stopped');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.4);
  yield* bell.ring('1');
  ep.row(0)().text('Running');
  ep.row(1)().text('在排（恢复）');
  yield* flash(ep.ref, 1);
  yield* waitFor(2.0);
  q4().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑤ halt 移除两形态 ===== */
  const n5 = makeNote(
    view,
    [
      '第二步=设备侧恢复（L344-346：软件干预恢复设备内管道）：',
      '非 Control（L347-349）：经独立控制管道发 CLEAR_FEATURE；',
      'Control（L357-360）：设备接受下一个 SETUP PID 即清 halt，',
      '不接受→须复位 USB 设备。isoch 无握手不产生 Stall（L354-355）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.dev},
  );
  yield* stage.say('第二步看端点型：非 Control 走控制管道，Control 靠 SETUP。', '⑤ / 13');
  n5().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.8);
  n5().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑥ 4.10.2.2 TRB Error ===== */
  const q6 = makeChip(
    view,
    '"A TRB Error indicates the TRB field values are out of range or that the xHC has determined that a TRB is incorrectly formed. … This error condition may be reported in a Transfer Event or a Command Completion Event due to an error detected on a Transfer or Command TRB, respectively. … A Transfer Ring TRB Error should transition an endpoint to the Error state" — §4.10.2.2 p177',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 15},
  );
  yield* stage.say('TRB Error=字段越界或畸形：转 Error 态。', '⑥ / 13');
  q6().opacity(0.95);
  ep.row(0)().text('Error');
  ep.row(2)().text('TRB Error');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(3.5);
  q6().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑦ 4.10.2.3 USB Transaction Error + Table 4-5 ===== */
  const n7 = makeNote(
    view,
    [
      '定义（L386-391）：导致主机控制器未能成功完成传输的任何错误。',
      'Setup 专属 Bad PID 四情形（L398-405）：高速 NAK/NSETUP、',
      '低速/全速 complete-split NAK、SS 设备对 SETUP DP 回 NRDY。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  const t45: CardApi = makeCard({
    title: 'Table 4-5 摘（L406-425）',
    rows: [
      {k: 'CRC/DPP Error', v: 'CErr → USB Transaction'},
      {k: 'Timeout', v: 'CErr(USB2) / N/A(USB3)'},
      {k: 'Bad PID (USB2)', v: 'CErr → USB Transaction'},
      {k: 'Babble', v: 'N/A → Babble Detected'},
      {k: 'Buffer Error', v: 'N/A → Data Buffer Error'},
    ],
    tint: C.hc,
    w: 560,
    rowSize: 17,
  });
  view.add(t45.node);
  yield* stage.say('Transaction Error 看 Table 4-5：代表五行上屏。', '⑦ / 13');
  n7().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.7);
  n7().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(t45, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(3.0);
  t45.ref().opacity(0);
  yield* waitFor(0.2);
  t45.ref().remove();

  /* ===== ⑧ 4.10.2.4 Babble 三形态与三件套 ===== */
  const q8 = makeChip(
    view,
    '"When a device sends more data than the TD Transfer Size bytes (TD Babble), unexpected activity that persists beyond a specified point in a (micro)frame (Frame Babble), or a packet greater than Max Packet Size (Packet Babble), the host controller shall set the Babble Detected Error in the Completion Code field of the TRB, generate an Error Event, and halt the endpoint … The Bus Error Counter is not decremented for a Babble Error condition." — §4.10.2.4 p179',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 15},
  );
  yield* stage.say('Babble 三形态：超 TD、拖帧、超包——都 halt。', '⑧ / 13');
  q8().opacity(0.95);
  ep.row(0)().text('Halted');
  ep.row(2)().text('Babble Detected');
  yield* flash(ep.ref, 1);
  yield* waitFor(0.3);
  yield* waitFor(4.1);
  q8().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑨ Babble 的 USB2 / USB3 协议面 ===== */
  const n9 = makeNote(
    view,
    [
      'USB2（L476-482）：高速 EOF2 点仍有 IN 事务=Frame Babble——',
      '报错+halt+禁用 Root Hub 端口；OUT 事务绝不许 babble 跨',
      'microframe EOF。USB3（L516-520）：IN 的 DPP 超 Max Packet',
      'Size 即 babble。超收数据视为已丢，禁 Soft Retry（L468-469）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('USB2 看 EOF2 与端口禁用；USB3 看 DPP 超包。', '⑨ / 13');
  n9().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(4.8);
  n9().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑩ 4.10.2.5 Data Buffer Error ===== */
  const q10 = makeChip(
    view,
    '"This event indicates that an overrun of incoming data or an underrun of outgoing data has occurred for this Transfer TRB. … These conditions are not considered transaction errors, and do not affect the Bus Error Count." — §4.10.2.5 p180',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.hc, size: 17},
  );
  const n10 = makeNote(
    view,
    [
      '主机侧吞吐问题（L525-527）：内存访问赶不上延迟要求。',
      'IN 不发握手（L531-534）→设备原数据重发；OUT 破坏包尾',
      '（L535-538）→不让设备误认好包，仅截断不可接受。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  yield* stage.say('Buffer Error 是主机侧账，不耗设备的重试额度。', '⑩ / 13');
  q10().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.0);
  q10().opacity(0);
  yield* waitFor(0.2);
  n10().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.9);
  n10().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑪ 4.10.2.6 Host System Errors ===== */
  const q11 = makeChip(
    view,
    '"If a catastrophic error occurs during a host system access involving the Host Controller module the Host System Error (HSE) bit in the USBSTS register shall be set to \'1\'. … When this error occurs, the Host Controller shall clear the Run/Stop (R/S) bit in the USBCMD register to prevent further execution of the scheduled TDs." — §4.10.2.6 p181',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.warn, size: 16},
  );
  const n11 = makeNote(
    view,
    [
      '四迹象（L569-581）：中断到了而事件不指有效源 TRB/不指启用',
      '槽/不指启用端点/字段越界不一致。HSE=fatal（系统完整性已失，',
      'L597-603）；HCE 才是可恢复档——软复位+重初始化（L604-606）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.warn},
  );
  yield* stage.say('HSE=灾难级：置位并清 R/S 停摆，区别于可恢复 HCE。', '⑪ / 13');
  q11().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.4);
  q11().opacity(0);
  yield* waitFor(0.2);
  n11().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.0);
  n11().opacity(0);
  yield* waitFor(0.25);

  /* ===== ⑫ 4.10.2.7 Bus Error Counter + Table 4-6 ===== */
  const n12 = makeNote(
    view,
    [
      '2-bit 递减计数器（L628-630）：首传时装 CErr 值，遇错递减，',
      '减到 0=硬错误；成功完成应重置回 CErr（L660-667）。',
      '软件禁令（L677-679）：Full/Low-speed 槽禁把 CErr 编为 0。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.hc},
  );
  const t46: CardApi = makeCard({
    title: 'Table 4-6 摘（L648-675）',
    rows: [
      {k: 'Transaction Error', v: '递减：Yes'},
      {k: 'Stalled', v: 'No（自动 halt）'},
      {k: 'No Error', v: 'No（成功重置回 CErr）'},
      {k: 'Data Buffer Error', v: 'No（主机侧问题）'},
      {k: 'Babble Detected', v: 'No（自动 halt）'},
    ],
    tint: C.hc,
    w: 580,
    rowSize: 17,
  });
  view.add(t46.node);
  yield* stage.say('CErr 计数器五情形：只有 Transaction Error 递减。', '⑫ / 13');
  n12().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(2.8);
  n12().opacity(0);
  yield* waitFor(0.2);
  yield* cardIn(t46, new Vector2(TLx(740), TLy(295)));
  yield* waitFor(3.0);
  t46.ref().opacity(0);
  yield* waitFor(0.2);
  t46.ref().remove();

  /* ===== ⑬ 4.10.2.8 Isoch 错误处理 ===== */
  const q13 = makeChip(
    view,
    '"CErr does not apply to Isoch Data Transactions because retries are not performed on Isoch endpoints. Also an Isoch endpoint shall not halt due to a Data Transaction error, but instead shall advance to the next Isoch TD and attempt to execute it during the next ESIT. An Isoch Data Transaction error shall force the generation of a Transfer Event, irrespective of whether the … (ISP) or … (IOC) flags are set in the Transfer TRB" — §4.10.2.8 p183',
    {x: TLx(1090), y: TLy(265), w: 1300, tint: C.evt, size: 15},
  );
  const n13 = makeNote(
    view,
    [
      '事件字段（L690-694）：TRB Pointer 指检错 TRB、Length 记未传',
      '残量。CC 判据（L695-699）：Timeout/CRC/DPP/Bad PID→USB',
      'Transaction Error；Babble→Babble Error。推进中 Event Data',
      'TRB 首个必解析、后续看 PAE；Link TRB 全解析（L700-722）。',
    ],
    {x: TLx(1300), y: TLy(285), w: 1040, tint: C.evt},
  );
  yield* stage.say('isoch 错误处理：不重试不 halt，跳到下一 TD 下个 ESIT。', '⑬ / 13');
  q13().opacity(0.95);
  yield* waitFor(0.3);
  yield* waitFor(2.5);
  q13().opacity(0);
  yield* waitFor(0.2);
  n13().opacity(0.9);
  yield* waitFor(0.3);
  yield* waitFor(3.2);
  n13().opacity(0);
  yield* waitFor(0.25);

  /* ===== 收口 ===== */
  const sum: CardApi = makeCard({
    title: '§4.10.2 Errors',
    rows: [
      {k: '总则', v: '错误必报事件 · CC 指明 · TD 任意 TRB 可错'},
      {k: 'Stall', v: '三件套 halt · 两步恢复 · 两形态除 halt'},
      {k: '事务错', v: 'Table 4-5 · CErr 计数 · Buffer=主机侧'},
      {k: '系统错', v: 'HSE 置位清 R/S · HCE 可恢复'},
      {k: 'isoch', v: '不重试不 halt · 下一 TD 下一 ESIT'},
    ],
    tint: C.hc,
    w: 1000,
    rowSize: 19,
  });
  view.add(sum.node);
  cmd.group().opacity(0);
  xfer.group().opacity(0);
  bell.ref().opacity(0);
  ep.ref().opacity(0);
  yield* stage.say('九小节错误族走完——下一支：事件族四类。', '完');
  yield* cardIn(sum, new Vector2(TLx(960), TLy(840)));
  yield* waitFor(3.2);
  sum.ref().opacity(0);
  stage.caption().opacity(0);
  yield* waitFor(0.4);
});
