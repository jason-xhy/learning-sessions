/* lab.js —— V3 动手台三关状态机（DSL interactions：L1/L2/L3 + quiz）
 * 承 V2 X43Lab 形态：独立状态机+setRender 钩子；主线照常可用；判分不写回主线状态；
 * 练习触发同一 movers 库（场景动画通道）；等待 /k 折算封顶 6s（meta.speedModel.labWaitCap）。 */
const X43Lab = (() => {
  let render = null;
  let Engine = null;
  let timer = null;
  let cur = null;
  const badges = { L1: false, L2: false, L3: false };

  function setEngine(e) { Engine = e; }
  function setRender(fn) { render = fn; }
  const rerender = () => { if (render) render(); };
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }
  const waitMs = (baseMs) => Math.min(X43D.labWaitCap * 1000, baseMs / X43D.k); // /k 封顶 6s

  // ---------- L1：按门铃（一键正确路径） ----------
  const L1_FAILS = {};
  for (const inp of X43D.D.interactions.L1.inputs) if (inp.fail) L1_FAILS[inp.id] = inp.fail;
  function startL1() {
    clearTimer();
    cur = { level: "L1", phase: "play", msg: null, msgBad: false, wrong: 0, blockedEver: false };
    Engine.labCamera("labL1");
    X43Scene.setGuide(true); // bell1 呼吸高亮引导
    rerender();
  }
  function l1pick(role) {
    if (!cur || cur.level !== "L1" || cur.phase !== "play") return;
    X43Scene.actions.bellPress({ target: role === 1 ? "bell1" : "bell0" });
    if (role === 1) {
      cur.phase = "done";
      X43Scene.setGuide(false);
      X43Scene.demoEp0Step(); // EP0 环示例卡一格步进（STEP）
      cur.live = "按门铃=告知 xHC：有新工作";
      badges.L1 = true;
    } else if (role === 0) {
      cur.wrong += 1; cur.blockedEver = true;
      cur.msg = L1_FAILS.knob0; cur.msgBad = true; // 做错不推进
    } else {
      cur.wrong += 1; cur.blockedEver = true;
      cur.msg = L1_FAILS.emptySlot; cur.msgBad = true;
    }
    rerender();
  }

  // ---------- L2：组一次控制读（六步，选项高亮+即时纠错） ----------
  const L2 = (() => {
    // 步数据（答案=DSL interactions.L2.steps 逐值；干扰项池 S5 结构化定稿：
    //   每个干扰选项带 hint=错选提示文案（规范依据 pNN/xhci-mem.c 行号全引 S1）——错选时按选项提示，
    //   无 hint 选项回退步级 fail。DSL interactions 干扰项池结构化回填需主会话裁定（scene.dsl.json S5 只读），已在 S5-记录报备。）
    const steps = [
      {
        id: "s1", name: "组请求",
        prompt: "填 GET_DESCRIPTOR(Device) 请求四字段（wIndex=0 固定展示）：",
        groups: [
          { k: "bmRequestType", q: "方向与接收方", opts: [
            { v: "80h", ok: true },
            { v: "00h", hint: "00h=主机到设备（Host-to-Device）——读描述符方向是 Device-to-Host，bmRequestType=80h（p73）" },
            { v: "08h", hint: "08h 不是 bmRequestType——载荷里 8 是 wLength；方向/类型/接收方合成为 bmRequestType=80h（p73）" },
          ] },
          { k: "bRequest", q: "请求号", opts: [
            { v: "6", ok: true },
            { v: "5", hint: "bRequest=5 是 SET_ADDRESS 的请求号；GET_DESCRIPTOR 是 bRequest=6（p73）" },
            { v: "8", hint: "8 是 wLength（读取长度），不是请求号；GET_DESCRIPTOR bRequest=6（p73）" },
          ] },
          { k: "wValue", q: "描述符类型与索引", opts: [
            { v: "0100h", ok: true },
            { v: "0001h", hint: "0001h=Configuration Descriptor（类型 2）；Device Descriptor 是 wValue=0100h（高字节类型 1，p73）" },
            { v: "0300h", hint: "0300h=String Descriptor（类型 3）；Device Descriptor 是 wValue=0100h（p73）" },
          ] },
          { k: "wLength", q: "读取长度", opts: [
            { v: "8", ok: true },
            { v: "64", hint: "64 是驱动给 FS 的初猜 MPS（xhci-mem.c:1125–1128）；本步只读前 8 字节，wLength=8（p72/p73）" },
            { v: "0", hint: "wLength=0 表示无数据段；读前 8 字节须 wLength=8（p73）" },
          ] },
        ],
        fixed: [{ k: "wIndex", v: "0", note: "固定展示" }],
        fail: "p73 现场值——Setup Stage TRB 载荷（S1 §3.2）",
      },
      {
        id: "s2", name: "三 TRB 逐件确认",
        prompt: "控制读三段 TRB 逐字段确认（选错不推进）：",
        groups: [
          { k: "setup.trt", q: "Setup · TRT", opts: [
            { v: "IN Data Stage(3)", ok: true },
            { v: "OUT Data Stage(2)", hint: "TRT=2 是 OUT 方向数据段；GET_DESCRIPTOR 的数据段是 IN——Setup Stage TRT=IN Data Stage(3)（p73）" },
            { v: "无 Data(0)", hint: "TRT=0=无数据段；本控制读带 8 字节数据段，Setup Stage TRT=3（p73）" },
          ] },
          { k: "setup.idt", q: "Setup · IDT", opts: [
            { v: "1", ok: true },
            { v: "0", hint: "IDT=0=数据在内存缓冲；Setup 载荷内联在 TRB 里，IDT=1（p73）" },
          ] },
          { k: "setup.ioc", q: "Setup · IOC", opts: [
            { v: "0", ok: true },
            { v: "1", hint: "Setup 段不是终点——IOC=0；只有 Status 段 IOC=1 才在完成时发事件（p73）" },
          ] },
          { k: "data.dir", q: "Data · DIR", opts: [
            { v: "'1'（IN）", ok: true },
            { v: "'0'（OUT）", hint: "控制读的 Data 段方向=IN（DIR='1'，设备→主机）（p73）；Status 段才是 OUT" },
          ] },
          { k: "data.len", q: "Data · Len", opts: [
            { v: "8", ok: true },
            { v: "0", hint: "Len=0 无数据可传；读前 8 字节 Data Stage Len=8（p73）" },
            { v: "64", hint: "本次读取长度是 8 字节（p72/p73）；64 是 FS 初猜 MPS，别混入 Data Stage Len" },
          ] },
          { k: "status.dir", q: "Status · DIR", opts: [
            { v: "'0'（OUT）", ok: true },
            { v: "'1'（IN）", hint: "控制读 Status 段方向=OUT（DIR='0'）——与 Data 段方向相反（p73）" },
          ] },
          { k: "status.ioc", q: "Status · IOC", opts: [
            { v: "1", ok: true },
            { v: "0", hint: "IOC=0 完成时不发事件——Status 段 IOC=1 才有 Transfer Event 回（p73/p74）" },
          ] },
        ],
        fixed: [{ k: "Data · CH", v: "0" }, { k: "Status · Len/Buffer", v: "0" }],
        fail: "p73 步 ii/iv/vi 原值（S1 §3.2；控制读 Status 段方向=OUT）",
      },
      {
        id: "s3", name: "写环顺序",
        prompt: "把三张 TRB 卡按控制读顺序写入 EP0 传输环（cycle 从当前 PCS=1 起）：",
        kind: "place",
        cards: ["Setup", "Data", "Status"],
        fail: "顺序不对——Setup → Data → Status；新环生产者循环态=1（S1 §4.3，xhci-mem.c:314–329）",
      },
      {
        id: "s4", name: "门铃",
        prompt: "TRB 已写入环，按哪个门铃让 xHC 取走？",
        kind: "choice",
        opts: [
          { v: "DB Target=1（EP0）", ok: true },
          { v: "DB Target=0（命令）", hint: "按的是 EP0 门铃——命令门铃是 DB Target=0（p83）" },
        ],
        fail: "按的是 EP0 门铃——命令门铃是 DB Target=0（p83）",
      },
      {
        id: "s5", name: "等回执",
        prompt: "点「读取回执」，等设备回 8 字节 + Status 段 Transfer Event：",
        kind: "act",
        actLabel: "读取回执",
        waitBase: 2400,
        doneText: "设备回 8 字节（bMaxPacketSize0=8）；事件环出现 Transfer Event · Completion Code=Success（p74）。",
        fail: "Status 段 IOC=1 才有事件回（p73）；Success 判据=S1 §3.2 收尾（p74）",
      },
      {
        id: "s6", name: "取事件+更新 MPS",
        prompt: "按回包更新 EP0 上下文的 MPS：",
        kind: "choice",
        opts: [
          { v: "8", ok: true },
          { v: "64", hint: "64=驱动 Address Device 时按速度的初猜（FS=64，xhci-mem.c:1125–1128）；更新 MPS 须按回包末字节 bMaxPacketSize0=8（p98 Note）" },
          { v: "512", hint: "512 是 SS 设备的默认包长；样例设备回包末字节 bMaxPacketSize0=8（p98 Note，S1 §3.1）" },
        ],
        fail: "p98 Note：回包末字节=bMaxPacketSize0（S1 §3.1）——样例设备=8（规范=读 bMaxPacketSize0 更新，p72/p98）",
      },
    ];
    return steps;
  })();
  function startL2() {
    clearTimer();
    cur = { level: "L2", stepIdx: 0, phase: "play", msg: null, msgBad: false, wrong: 0, blockedEver: false, groups: {}, placed: 0 };
    rerender();
  }
  function l2pick(gk, v) {
    if (!cur || cur.level !== "L2" || cur.phase !== "play") return;
    const st = L2[cur.stepIdx];
    const g = st.groups && st.groups.find((x) => x.k === gk);
    if (!g) return;
    if (cur.groups[gk]) return; // 已选对不重复
    const opt = g.opts.find((o) => o.v === v);
    if (!opt) return;
    if (opt.ok) {
      cur.groups[gk] = true;
      cur.msg = gk + " = " + v + " ✓";
      cur.msgBad = false;
      if (st.groups.every((x) => cur.groups[x.k])) timer = setTimeout(l2advance, 460 / X43D.k);
    } else {
      cur.wrong += 1; cur.blockedEver = true;
      cur.msg = opt.hint || st.fail; cur.msgBad = true; // 错选不推进：优先选项级提示（S5 干扰项池定稿），回退步级 fail
    }
    rerender();
  }
  function l2place(i) {
    if (!cur || cur.level !== "L2" || cur.phase !== "play") return;
    const st = L2[cur.stepIdx];
    if (st.kind !== "place") return;
    if (i === cur.placed) {
      cur.placed += 1;
      cur.msg = st.cards[i] + " 已写入环（cycle=1）";
      cur.msgBad = false;
      if (cur.placed >= st.cards.length) timer = setTimeout(l2advance, 520 / X43D.k);
    } else {
      cur.wrong += 1; cur.blockedEver = true;
      cur.msg = st.fail; cur.msgBad = true;
    }
    rerender();
  }
  function l2choice(i) {
    if (!cur || cur.level !== "L2" || cur.phase !== "play") return;
    const st = L2[cur.stepIdx];
    if (st.kind !== "choice") return;
    const opt = st.opts[i];
    if (opt.ok) {
      cur.msg = "✓ 选对：" + opt.v;
      cur.msgBad = false;
      if (st.id === "s4") X43Scene.actions.bellPress({ target: "bell1" });
      timer = setTimeout(l2advance, 480 / X43D.k);
    } else {
      cur.wrong += 1; cur.blockedEver = true;
      cur.msg = opt.hint || st.fail; cur.msgBad = true; // 选项级提示（S5 干扰项池定稿）优先
    }
    rerender();
  }
  function l2act() {
    if (!cur || cur.level !== "L2" || cur.phase !== "play") return;
    const st = L2[cur.stepIdx];
    if (st.kind !== "act" || cur.waiting) return;
    cur.waiting = true;
    cur.msg = "xHC 调度 EP0 传输：SETUP 令牌 → 设备回 8 字节 → STATUS 令牌…";
    rerender();
    timer = setTimeout(() => {
      cur.waitDone = true;
      cur.msg = st.doneText;
      cur.msgBad = false;
      rerender();
      timer = setTimeout(l2advance, 800 / X43D.k);
    }, waitMs(st.waitBase));
  }
  function l2advance() {
    clearTimer();
    if (!cur || cur.level !== "L2") return;
    cur.stepIdx += 1;
    cur.msg = null; cur.msgBad = false;
    cur.groups = {}; cur.placed = 0; cur.waiting = false; cur.waitDone = false;
    if (cur.stepIdx >= L2.length) {
      cur.phase = "done";
      badges.L2 = true;
    }
    rerender();
  }

  // ---------- L3：值班工程师（无提示·统一判分） ----------
  const L3_CARDS = ["Enable Slot", "BSR=1 使能 EP0", "读 8 字节", "BSR=0 编址"];
  function startL3() {
    if (!badges.L2) { // L2 徽章=L3 入门票
      cur = { level: "L3", phase: "locked", msg: "先拿到 L2 徽章「控制读三段齐 ✓」——L3 的入门票（递进门，§K）", msgBad: true };
      rerender();
      return;
    }
    clearTimer();
    cur = { level: "L3", phase: "play", msg: null, msgBad: false, wrong: 0, blockedEver: false, t1: { ring: null, bell: null, judged: false, ok: false }, t2: { bsr: -1, judged: false, ok: false }, t3: { order: [], judged: false, ok: false } };
    rerender();
  }
  function l3setT1(kind, v) {
    if (!cur || cur.level !== "L3" || cur.phase !== "play" || cur.t1.judged) return;
    cur.t1[kind] = v;
    rerender();
  }
  function l3judgeT1() {
    if (!cur || cur.t1.judged || cur.t1.ring == null || cur.t1.bell == null) return;
    cur.t1.judged = true;
    const ok = cur.t1.ring === "ringCmd" && cur.t1.bell === "DB Target=0";
    cur.t1.ok = ok;
    cur.t1.judgeText = ok
      ? "✓ Enable Slot 是命令——上命令环（唯一，p68），按命令门铃 DB Target=0（p83）。"
      : "✗ " + (cur.t1.ring !== "ringCmd" ? "Enable Slot 是命令——命令环唯一（p68），不上事件环/传输环。" : "命令门铃是 DB Target=0（p83）。");
    if (ok) X43Scene.demoSlotReceipt(); // 结局演示 Slot ID=1 回执（p75）
    l3check();
    rerender();
  }
  function l3pickT2(i) {
    if (!cur || cur.level !== "L3" || cur.phase !== "play" || cur.t2.judged) return;
    cur.t2.judged = true;
    cur.t2.bsr = i;
    cur.t2.ok = true; // 两分支各自结局、不混写——选任一真实分支都算完成（结局分别呈现）
    const t2dsl = X43D.D.interactions.L3.tasks.find((t) => t.id === "T2").options;
    cur.t2.outcome = i === 0
      ? { demo: "bsr0", text: t2dsl.find((o) => o.bsr === "0").outcome } // DSL outcome 逐字
      : { demo: "bsr1", text: t2dsl.find((o) => o.bsr === "1").outcome };
    X43Scene.demoBsr(i); // 动画通道演示本分支结局（不写回主线判分）
    l3check();
    rerender();
  }
  function l3order(i) {
    if (!cur || cur.level !== "L3" || cur.phase !== "play" || cur.t3.judged) return;
    if (cur.t3.order.indexOf(i) >= 0) return;
    cur.t3.order.push(i);
    rerender();
    if (cur.t3.order.length >= 4) l3judgeT3();
  }
  function l3resetT3() {
    if (!cur || cur.t3.judged) return;
    cur.t3.order = [];
    rerender();
  }
  function l3judgeT3() {
    cur.t3.judged = true;
    const ok = cur.t3.order.every((v, i) => v === i); // correctOrder=[0,1,2,3]
    cur.t3.ok = ok;
    cur.t3.judgeText = ok
      ? "✓ 正确序=S1 §6.3（hub.c:5056–5061）：Enable Slot → BSR=1 使能 EP0 → 读 8 字节 → BSR=0 编址。"
      : "✗ 顺序不对。正确序=S1 §6.3（hub.c:5056–5061）：Enable Slot → BSR=1 使能 EP0 → 读 8 字节 → BSR=0 编址——先通信后编址，Evaluate Context 不在枚举链。";
    l3check();
    rerender();
  }
  function l3check() {
    if (cur.t1.judged && cur.t2.judged && cur.t3.judged && cur.t1.ok && cur.t2.ok && cur.t3.ok) {
      cur.phase = "done";
      badges.L3 = true;
    }
  }
  function l3retryT3() {
    if (!cur || cur.level !== "L3") return;
    cur.t3 = { order: [], judged: false, ok: false };
    rerender();
  }

  // ---------- quiz（F11 讲解 tab；题面=S5 定稿稿，见 stages.js QUIZ） ----------
  const quizState = { answered: {}, score: -1 };
  function quizAnswer(qi, oi) {
    quizState.answered[qi] = oi;
    const n = X43Stages.QUIZ.length;
    if (Object.keys(quizState.answered).length >= n) {
      quizState.score = X43Stages.QUIZ.reduce((acc, q, i) => acc + (quizState.answered[i] === q.ans ? 1 : 0), 0);
    }
    rerender();
  }
  function quizRedo() {
    quizState.answered = {};
    quizState.score = -1;
    rerender();
  }

  function start(id) {
    if (id === "L1") startL1();
    else if (id === "L2") startL2();
    else if (id === "L3") startL3();
  }
  function state() {
    if (!cur) return { started: false, badges: { ...badges }, quiz: { ...quizState } };
    return {
      started: true,
      level: cur.level, phase: cur.phase,
      stepIdx: cur.stepIdx || 0, steps: cur.level === "L2" ? L2.length : 0,
      msg: cur.msg || "", msgBad: !!cur.msgBad,
      wrong: cur.wrong || 0, blockedEver: !!cur.blockedEver,
      groups: cur.groups || {}, placed: cur.placed || 0,
      waiting: !!cur.waiting, waitDone: !!cur.waitDone,
      live: cur.live || "",
      t1: cur.t1, t2: cur.t2, t3: cur.t3,
      badges: { ...badges },
      quiz: { ...quizState },
    };
  }
  function reset() {
    clearTimer();
    cur = null;
    X43Scene.setGuide(false);
    rerender();
  }

  return {
    start, state, reset, setRender, setEngine,
    L1: { pick: l1pick },
    L2STEPS: L2, L3_CARDS,
    pick: l2pick, place: l2place, choice: l2choice, act: l2act,
    setT1: l3setT1, judgeT1: l3judgeT1, pickT2: l3pickT2, order: l3order, resetT3: l3resetT3, retryT3: l3retryT3,
    quizAnswer, quizRedo,
  };
})();
