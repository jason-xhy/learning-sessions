/* main.js —— V3 装配入口：渲染器/相机（17 预置机位+camAdapt）/自写轨道控件/标签投影（19 锚点+左色条三档）/
 * 工段运行时（编译步序+预设变体）/速度模型（meta.speedModel 贯通）/自动巡游/试错/门 API window.__x43。 */
const X43Main = (() => {
  const T = THREE;
  const D = X43D;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const V3 = (a) => new T.Vector3(a[0], a[1], a[2]);

  let renderer, scene, camera, ctrl, labelHost;
  let camFlight = null, manual = false;
  let stageIdx = -1, applied = -1;
  let preset = X43Stages.PRESETS[0];
  let stageStates = [];
  let runner = null, auto = null;
  let labelsOn = true;
  let sceneReady = false;
  let corridorCheck = null;
  let tourStartWall = 0;
  const clock = new T.Clock();

  function setSpeed(v) {
    D.setK(v);
    X43Panel.renderSpeed(X43Stages.SPEEDS, D.k);
  }
  function setHoldSet(v) { D.setHoldSet(v); }

  // ---------- 自写轨道控件（左键旋转/滚轮缩放/右键平移）+ 门铃点选（L1 双入口） ----------
  function makeControls(dom) {
    const st = { target: new T.Vector3(0.5, 3, 0), sph: new T.Spherical(30, 1.1, 0.2), mode: 0, px: 0, py: 0 };
    const apply = () => {
      camera.position.setFromSpherical(st.sph).add(st.target);
      camera.lookAt(st.target);
    };
    const sync = () => {
      const off = camera.position.clone().sub(st.target);
      st.sph.setFromVector3(off);
    };
    const userGrab = () => { camFlight = null; manual = true; };
    let downX = 0, downY = 0, downT = 0;
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("pointerdown", (e) => {
      userGrab();
      st.mode = e.button === 2 ? 2 : 1;
      st.px = e.clientX; st.py = e.clientY;
      downX = e.clientX; downY = e.clientY; downT = Date.now();
      try { dom.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    });
    dom.addEventListener("pointermove", (e) => {
      if (!st.mode) return;
      const dx = e.clientX - st.px, dy = e.clientY - st.py;
      st.px = e.clientX; st.py = e.clientY;
      if (st.mode === 1) {
        st.sph.theta -= dx * 0.0052;
        st.sph.phi = clamp(st.sph.phi - dy * 0.0052, 0.12, 1.52);
      } else {
        const dist = st.sph.radius * 0.0012;
        const right = new T.Vector3().setFromMatrixColumn(camera.matrix, 0);
        const up = new T.Vector3().setFromMatrixColumn(camera.matrix, 1);
        st.target.addScaledVector(right, -dx * dist);
        st.target.addScaledVector(up, dy * dist);
      }
      apply();
    });
    const stop = (e) => {
      if (st.mode === 1 && Date.now() - downT < 350 && Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
        // 视为点选：门铃旋钮 raycast（动手台 L1 双入口之场景侧）
        const ndc = new T.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
        const role = X43Scene.pickKnob(ndc, camera);
        if (role != null) {
          const s = X43Lab.state();
          if (s.started && s.level === "L1" && s.phase === "play") X43Lab.L1.pick(role);
        }
      }
      st.mode = 0;
    };
    dom.addEventListener("pointerup", stop);
    dom.addEventListener("pointercancel", () => { st.mode = 0; });
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      userGrab();
      st.sph.radius = clamp(st.sph.radius * (1 + e.deltaY * 0.0011), 4.5, 62);
      apply();
    }, { passive: false });
    return { st, apply, sync, userGrab };
  }

  function flyDur(adapt) {
    return adapt === "closeup" ? D.D.cameras.defaults.nearFlyBase : D.dur("FLY");
  }
  function flyToPreset(id, opts) {
    const c = D.camAdapted(id);
    if (opts && opts.instant) {
      camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
      ctrl.st.target.set(c.tgt[0], c.tgt[1], c.tgt[2]);
      ctrl.sync(); ctrl.apply();
      camFlight = null;
      return;
    }
    camFlight = {
      p0: camera.position.clone(), p1: V3(c.pos),
      t0: ctrl.st.target.clone(), t1: V3(c.tgt),
      t: 0, dur: flyDur(c.adapt),
    };
    manual = false;
  }

  // ---------- 标签 overlay（19 锚点；左色条三档 d28；erdp 动态随旗；紧凑模式 panel.narrow） ----------
  const BAR_COLORS = D.labelBarColors; // {zone,part,anchor}
  function buildLabels() {
    labelHost = document.createElement("div");
    labelHost.id = "x43Labels";
    document.getElementById("x43Stage").appendChild(labelHost);
    for (const l of X43Scene.labelAnchors()) {
      const el = document.createElement("div");
      el.className = "x43-lb x43-" + l.barClass + (l.barClass === "zone" ? " x43-zone" : "");
      el.id = "lb-" + l.id;
      el.textContent = l.text;
      el.dataset.anchor = Array.isArray(l.anchor) ? l.anchor.join(",") : "dynamic";
      el.dataset.host = l.host;
      el.dataset.bar = BAR_COLORS[l.barClass] || BAR_COLORS.part;
      el.style.borderLeftColor = BAR_COLORS[l.barClass] || BAR_COLORS.part;
      // 绘制偏移（S4 表现层消叠：DSL 锚点不动，只挪浮签绘制位——label_probe 核对）
      const OFFS = { "lbl-fs-gate": [0, 0], "lbl-rings-ep0": [0, -28], "plate": [0, 12], "zone-dev": [0, -8], "lbl-rings-evt": [0, -4] };
      if (OFFS[l.id]) el.dataset.off = OFFS[l.id].join(",");
      labelHost.appendChild(el);
    }
  }
  const _pv = new T.Vector3();
  function updateLabels() {
    if (!labelHost) return;
    const w = window.innerWidth, h = window.innerHeight;
    const compact = w <= D.D.meta.render.narrowBreakpointPx;
    const compactSet = new Set(D.compactLabels);
    const devIn = X43Scene.state.devIn;
    const devHosts = new Set(["deviceShell", "namePlate", "cable"]);
    for (const el of labelHost.children) {
      const host = el.dataset.host;
      if (!labelsOn || (compact && !compactSet.has(el.id.replace("lb-", "")))) { el.style.display = "none"; continue; }
      if (devHosts.has(host) && !devIn) { el.style.display = "none"; continue; }
      if (el.id === "lb-lbl-fs-gate" && !X43Scene.fsGateLit()) { el.style.display = "none"; continue; } // FS 闸口牌随亮起出现（F7+）
      let p;
      if (el.dataset.anchor === "dynamic") p = X43Scene.erdpFlagPos();
      else p = el.dataset.anchor.split(",").map(Number);
      _pv.set(p[0], p[1], p[2]).project(camera);
      const behind = _pv.z > 1 || _pv.z < -1;
      if (behind) { el.style.display = "none"; continue; }
      el.style.display = "";
      let ox = 0, oy = 0;
      if (el.dataset.off) { const o = el.dataset.off.split(",").map(Number); ox = o[0]; oy = o[1]; }
      el.style.transform = `translate(calc(-50% + ${ox}px), calc(-130% + ${oy}px))`;
      let px = (_pv.x * 0.5 + 0.5) * w;
      const py = (-_pv.y * 0.5 + 0.5) * h;
      if (compact) px = clamp(px, 44, w - 44); // 窄屏钳位：防左右缘微裁（V2 P2 形态承续）
      el.style.left = px + "px";
      el.style.top = py + "px";
    }
  }

  // ---------- 工段运行时 ----------
  function skipOf(i) { return (preset.skip || []).includes(i); }
  function stepsOf(i) {
    return X43Stages.variantStepsFor(preset.id, stageIdOf(i)) || X43Stages.compileSteps(stageIdOf(i));
  }
  function stageIdOf(i) { return "F" + i; }
  function stageListOf() {
    const arr = [];
    for (let i = 0; i < X43Stages.stageCount; i++) if (!skipOf(i)) arr.push(i);
    return arr;
  }
  function metricsOf(i) {
    const m = X43Stages.METRICS[stageIdOf(i)];
    return JSON.parse(JSON.stringify(m));
  }
  function cardsOf(i) {
    const base = X43Stages.stageCards(stageIdOf(i));
    const br = D.D.timeline.branches;
    const pid = preset.id;
    if (pid === "fullspeed" && (i === 7 || i === 8) && br.contrastCards["fullspeed.f7.f8"]) {
      const cc = br.contrastCards["fullspeed.f7.f8"];
      base.push({ h3: cc.title, p: cc.points.map((p) => "· " + p).join("<br>") + "<br><span class='x43-anchor'>[" + cc.s1 + "]</span>" });
    }
    if (pid === "linux" && i === 6 && br.contrastCards["linux.f6.f7"]) {
      base.push({ h3: br.contrastCards["linux.f6.f7"].title, p: "回看规范建议路径：F6 用 BSR=0（xHC 代发 SET_ADDRESS，槽 Enabled→Addressed）；本预设按 Linux 实路径演（BSR=1 无 SET_ADDRESS 票据），两卡永不合成。" });
    }
    if (pid === "linux" && i === 7 && br.contrastCards["linux.f6.f7"]) {
      base.push({ h3: br.contrastCards["linux.f6.f7"].title, p: "回看：全速主线本工段在 Addressed 态通信；Linux 实路径在 Default 态读 8 字节（hub.c:5056–5061）。" });
    }
    if (pid === "linux" && i === 8) {
      base.push({ h3: "注记卡 · Linux F8", p: (br.overrides.linux.f8.note || "") + "（S1 §6.3/§7.2 条 4）——" + (br.contrastCards["linux.f8"] ? br.contrastCards["linux.f8"].text : "") });
    }
    if (pid === "bsr1" && i === 6) {
      base.push({ h3: "BSR=1 legacy 预设", p: "只演单分支结局（槽 Default、禁止 SET_ADDRESS——p76–77），不冒充 Linux 完整路径；完整两步流见「Linux 实路径」预设。" });
    }
    if (i === 2) {
      // F2 分工口径（主会话裁定 2026-11-10：F2=桌面组+柜面全景观看位，USB2 屏读数由 F3 特写承载）——文案层落地，不动机位
      base.push({ h3: "机位口径", p: "本帧=桌面组与柜面全景观看位：读线/写线闪与复位按钮阻尼下压在此看全景；USB2 屏的 CCS/PR/PLS 读数由 F3 特写承载，本帧屏面呈侧角作语境。" });
    }
    if (pid === "usb3" && i === 1) {
      base.push({ h3: "USB3 预设变体", p: "无 Disabled 帧：Polling→Enabled 自动（PED=1/PR=0/PLS=0，S1 §2.1）——本帧不演软件复位。" });
    }
    const st = D.D.timeline.stages[i];
    if (st.tryError) {
      base.push({ h3: "试错入口", p: st.tryError.action + " → " + st.tryError.result + " <span class='x43-anchor'>[" + st.tryError.s1 + "]</span>" });
    }
    return base;
  }

  function applyEnd(i) {
    X43Scene.setInstant(true);
    for (const s of stepsOf(i)) {
      const [t, fn, arg] = s;
      if (fn === "say" || fn === "done") continue;
      const f = X43Scene.actions[fn];
      if (f) f(arg || {});
    }
    X43Scene.setInstant(false);
  }
  function rewindTo(i) {
    X43Scene.reset();
    applied = -1;
    for (let k = 0; k < i; k++) if (!skipOf(k)) applyEnd(k);
    applied = i - 1;
  }
  function stopRunner() {
    runner = null;
    if (auto) { auto = null; X43Panel.setTourBtn(false); }
    X43Panel.setStatus(stageIdx >= 0 && stageStates[stageIdx] && stageStates[stageIdx].done ? "已完成" : "已暂停");
  }
  function stopRunnerSilent() { runner = null; }

  function goto(i, opts) {
    opts = opts || {};
    const instant = !!opts.instant;
    if (i < 0 || i >= X43Stages.stageCount) return;
    if (stageStates[i] && stageStates[i].skip) return;
    stopRunnerSilent();
    if (i <= applied) rewindTo(i);
    else if (i > applied + 1) { for (let k = applied + 1; k < i; k++) if (!skipOf(k)) applyEnd(k); applied = i - 1; }
    stageIdx = i;
    const sid = stageIdOf(i);
    const st = D.D.timeline.stages[i];
    X43Panel.setStage({ id: sid, title: st.title, page: st.page, metrics: metricsOf(i) }, {
      runtime: X43Stages.RUNTIME[sid],
      cards: cardsOf(i),
      status: instant ? "已完成" : "进行中",
    });
    X43Panel.setTrapEnabled(i === 5 && !instant && !auto);
    X43Panel.hideAlarm();
    if (instant) {
      applyEnd(i);
      applied = i;
      if (i === X43Stages.stageCount - 1) stageStates[i].done = true;
      flyToPreset(st.camera, { instant: true });
    } else {
      X43Scene.setRingCruise(false); // 活动工段：环步进走 STEP（IDLE_STEP 仅 F0/F11 巡航态）
      flyToPreset(st.camera, {});
      runner = { t: 0, steps: stepsOf(i), fired: 0, stage: i };
    }
    refreshBar();
  }

  function refreshBar() {
    X43Panel.renderBar(stageIdx, stageStates, X43Stages.GROUPS);
    X43Panel.renderChips(X43Stages.PRESETS, preset.id);
  }
  function onControl(act) {
    if (act === "step") stepNext(1);
    else if (act === "reset") doReset();
    else if (act === "tour") toggleTour();
    else if (act === "run") runAll();
  }
  function stepNext(dir) {
    const list = stageListOf();
    let pos = list.indexOf(stageIdx);
    if (pos < 0) pos = 0;
    const next = list[clamp(pos + dir, 0, list.length - 1)];
    goto(next);
  }
  function toggleTour() {
    if (auto) { auto = null; X43Panel.setTourBtn(false); X43Panel.setStatus("已暂停"); return; }
    auto = "tour";
    tourStartWall = performance.now();
    X43Panel.setTourBtn(true);
    if (runner) return;
    advanceFrom(stageIdx);
  }
  function runAll() {
    auto = "run";
    tourStartWall = performance.now();
    X43Panel.setTourBtn(true);
    doReset({ keepAuto: true });
    goto(0);
  }
  function advanceFrom(i) {
    const list = stageListOf();
    const pos = list.indexOf(i);
    if (pos < 0 || pos >= list.length - 1) {
      auto = null;
      X43Panel.setTourBtn(false);
      X43Panel.setStatus("已完成");
      window.__x43TourDone = { wallMs: performance.now() - tourStartWall, k: D.k };
      return;
    }
    goto(list[pos + 1]);
  }
  function doReset(opts) {
    opts = opts || {};
    if (!opts.keepAuto) { auto = null; X43Panel.setTourBtn(false); }
    runner = null;
    X43Scene.reset();
    applied = -1;
    stageIdx = -1;
    stageStates = D.D.timeline.stages.map((s, i) => ({ id: "F" + i, title: s.title, skip: skipOf(i), done: false }));
    X43Panel.hideAlarm();
    goto(0, { instant: true });
    X43Panel.setStatus("已暂停");
  }
  function setPreset(id) {
    const p = X43Stages.PRESETS.find((x) => x.id === id);
    if (!p || p.id === preset.id) return;
    preset = p;
    X43Lab.reset();
    doReset();
    X43Panel.setRuntime(`预设已切换：${p.name}${p.tag ? "（" + p.tag + "）" : ""}——${p.skip.length ? "置灰工段见底栏" : "12 工段全走"}`);
  }

  // ---------- 试错路径（F5：空输入上下文抢发 Address Device → Parameter Error 红牌） ----------
  function triggerError() {
    if (stageIdx !== 5) return;
    stopRunner();
    X43Panel.setTrapEnabled(false);
    X43Scene.actions.blankForm();
    X43Panel.setRuntime("试错：输入上下文为空，抢发 Address Device…");
    X43Scene.actions.slip({ label: "Address Device · 输入上下文为空" });
    setTimeout(() => { if (sceneReady) X43Scene.actions.bellPress({ target: "bell0" }); }, 1900 / D.k);
    setTimeout(() => {
      if (!sceneReady) return;
      X43Scene.actions.evCard({ label: "命令完成事件 · Parameter Error", toDesk: true, from: "xHC 命令校验失败", to: "事件环 → 驱动读取" });
      X43Panel.showAlarm("空输入上下文抢发 Address Device——xHC 执行前校验引用上下文失败：命令完成事件回执 Completion Code=Parameter Error（参数错误），输出上下文不变，设备无感知。处置：⟲ 复位设备，回 F5 先把 A0/A1 与 Slot/EP0 填格，再走编址。（判据：xHCI 1.2b p100——命令执行前应校验上下文有效，无效上下文→Parameter Error；S1 §7.2 条 10）");
      X43Panel.setRuntime("命令完成事件：Completion Code=Parameter Error（参数错误）——输入上下文无效；输出上下文卡不动（p100）");
      X43Panel.setStatus("已暂停");
    }, 4600 / D.k);
  }

  // ---------- F0 完整性自检（cameras.f0Check：必入画 7 项+右缘余量） ----------
  function f0check() {
    const panelEl = document.querySelector(".x43-panel");
    let visibleRight = window.innerWidth;
    if (panelEl && panelEl.offsetParent !== null) visibleRight = panelEl.getBoundingClientRect().left - 8;
    const w = window.innerWidth, h = window.innerHeight;
    const pts = {
      "区标-文书台": [-15, 6.2, 0],
      "区标-总控台": [1, 10.2, 2.6],
      "区标-试验盒": [15.4, 5.2, 0],
      "格架": [-2.9, 6.4, 2.5],
      "槽态灯排": [0, 8.4, 2.5],
      "读数屏-USB2": [1.8, 6.8, 2.5],
      "读数屏-USB3": [4.6, 6.8, 2.5],
      "门铃排": [-1.4, 1.7, 2.5],
      "BSR 旋钮": [6.7, 2.2, 2.5],
      "环-命令北": [0.5, 10.0, -4.74],
      "环-EP0 北": [0.5, 11.8, -4.74],
      "环-事件北": [0.5, 13.6, -4.74],
      "门架西柱": [-4.3, 13.8, -4.0],
      "端口排": [7.85, 3.6, 0.65],
      "试验盒": [15.4, 2.5, 0],
      "四态灯": [15.4, 3.9, 1.55],
      "铭牌": [15.4, 4.15, 1.55],
      "缆中段": [10.4, 0.75, 1.15],
      "地板灯池": [1, 0.2, 0],
    };
    const checks = [];
    let allOk = true;
    const devExcluded = !X43Scene.state.devIn; // F0 设备画外属预期（cameras.f0Check 协议）——设备族点降级为 panorama 模式
    const devPts = new Set(["区标-试验盒", "试验盒", "四态灯", "铭牌", "缆中段"]);
    for (const [id, p] of Object.entries(pts)) {
      _pv.set(p[0], p[1], p[2]).project(camera);
      const x = (_pv.x * 0.5 + 0.5) * w, y = (-_pv.y * 0.5 + 0.5) * h;
      const ok = _pv.z < 1 && x >= -40 && x <= visibleRight && y >= -20 && y <= h + 20;
      const counted = ok || !(devExcluded && devPts.has(id));
      checks.push({ id, ok, counted, x: Math.round(x), y: Math.round(y) });
      if (counted && !ok) allOk = false;
    }
    // 右缘余量：铭牌右缘 16.6（d27：15.4+2.4/2）与 15.6 两点投影距=1wu 的 px 数（设备在画时才算）
    _pv.set(16.6, 4.15, 1.5).project(camera);
    const xRight = (_pv.x * 0.5 + 0.5) * w;
    _pv.set(15.6, 4.15, 1.5).project(camera);
    const xLeft = (_pv.x * 0.5 + 0.5) * w;
    const pxPerWu = Math.abs(xRight - xLeft);
    const marginWu = (visibleRight - xRight) / Math.max(pxPerWu, 1e-6);
    const marginOk = devExcluded ? true : marginWu >= 1.0;
    return { pass: allOk && marginOk, mode: devExcluded ? "panorama(设备画外)" : "full", visibleRight: Math.round(visibleRight), marginWu: Math.round(marginWu * 100) / 100, pxPerWu: Math.round(pxPerWu), checks };
  }

  // ---------- 几何 AABB 导出（标签邻居扩检用） ----------
  function entityBoxes() {
    const out = {};
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const id = o.userData.entityId;
      if (!id) return;
      if (!out[id]) out[id] = new T.Box3().setFromObject(o);
      else out[id].union(new T.Box3().setFromObject(o));
    });
    return out;
  }

  // ---------- 每帧 ----------
  function tick() {
    requestAnimationFrame(tick);
    const dtRaw = Math.min(clock.getDelta(), 0.1);
    const dt = dtRaw * D.k; // 速度模型：观看层 t=base/k（全部动画时长统一走 k）
    const el = clock.elapsedTime;
    if (camFlight) {
      camFlight.t += dt / camFlight.dur;
      const k = ease(clamp(camFlight.t, 0, 1));
      camera.position.lerpVectors(camFlight.p0, camFlight.p1, k);
      ctrl.st.target.lerpVectors(camFlight.t0, camFlight.t1, k);
      ctrl.sync();
      if (camFlight.t >= 1) camFlight = null;
    }
    if (runner) {
      runner.t += dt;
      const steps = runner.steps;
      while (runner.fired < steps.length && steps[runner.fired][0] <= runner.t) {
        const [t, fn, arg] = steps[runner.fired++];
        if (fn === "say") X43Panel.setRuntime(arg.t);
        else if (fn === "done") {
          stageStates[runner.stage].done = true;
          X43Panel.setStatus("已完成");
          X43Panel.setTrapEnabled(false);
          const wasAuto = auto;
          runner = null;
          if (wasAuto) setTimeout(() => { if (auto) advanceFrom(runner ? runner.stage : stageIdx); }, D.dur("STAGE_GAP") * 1000);
          break;
        } else {
          const f = X43Scene.actions[fn];
          if (f) f(arg || {});
        }
      }
    }
    X43Scene.update(dt, el);
    ctrl.apply();
    updateLabels();
    renderer.render(scene, camera);
  }

  // ---------- 装载 ----------
  function loadingSeq() {
    const el = document.getElementById("x43LoadMsg");
    const card = document.getElementById("x43Loading");
    const msgs = ["正在布置 xHC 启机车间", "载入 DSL 数据件（scene.dsl.json v1.0.0）…", "架设三环环形轨道（命令/事件/EP0 传输）…", "接通 USB 实体缆与空中走廊…"];
    let i = 0;
    el.textContent = msgs[0];
    const iv = setInterval(() => {
      i += 1;
      if (i < msgs.length) el.textContent = msgs[i];
      else { clearInterval(iv); card.classList.add("x43-hidden"); setTimeout(() => card.remove(), 700); }
    }, 340);
  }

  function init() {
    const holder = document.getElementById("x43Stage");
    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = T.SRGBColorSpace;
    holder.appendChild(renderer.domElement);
    scene = new T.Scene();
    scene.background = new T.Color(D.D.meta.render.background[0]);
    scene.fog = new T.FogExp2(new T.Color(D.D.meta.render.fog.color).getHex(), D.D.meta.render.fog.density);
    const fovOf = () => window.innerWidth <= D.D.meta.render.narrowBreakpointPx ? D.D.meta.render.fovNarrow : D.D.meta.render.fov;
    camera = new T.PerspectiveCamera(fovOf(), window.innerWidth / window.innerHeight, 0.1, 220);
    camera.updateProjectionMatrix();
    const c0 = D.camAdapted("F0");
    camera.position.set(c0.pos[0], c0.pos[1], c0.pos[2]);
    ctrl = makeControls(renderer.domElement);
    ctrl.st.target.set(c0.tgt[0], c0.tgt[1], c0.tgt[2]);
    ctrl.sync(); ctrl.apply();
    const info = X43Scene.build(T, scene);
    corridorCheck = info.corridorCheck;
    X43Scene.setCameraRef(camera);
    // S6 环境贴图（R2 闭环）：金属材质 envMap（不设 scene.background/fog，deep-dark 基调不变）
    if (typeof X43_TEXDATA !== "undefined" && X43_TEXDATA && X43_TEXDATA.env) {
      new T.TextureLoader().load(X43_TEXDATA.env.url, (tex) => {
        tex.mapping = T.EquirectangularReflectionMapping;
        tex.colorSpace = T.SRGBColorSpace;
        const pm = new T.PMREMGenerator(renderer);
        const rt = pm.fromEquirectangular(tex);
        tex.dispose(); pm.dispose();
        scene.traverse((o) => {
          if (o.isMesh && o.material && o.material.isMeshStandardMaterial && !o.material.envMap
              && (o.material.metalness || 0) >= 0.4) {
            o.material.envMap = rt.texture;
            o.material.envMapIntensity = (o.material.metalness || 0) >= 0.8 ? 0.5 : 0.15;
            o.material.needsUpdate = true;
          }
        });
      });
    }
    buildLabels();
    sceneReady = true;
    window.__x43._scene = scene;
    stageStates = D.D.timeline.stages.map((s, i) => ({ id: "F" + i, title: s.title, skip: false, done: false }));
    X43Panel.init(Engine);
    X43Lab.setEngine(Engine);
    setSpeed(D.D.meta.speedModel.kDefault);
    doReset();
    loadingSeq();
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.fov = fovOf();
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener("keydown", (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); stepNext(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepNext(-1); }
    });
    const fsBtn = document.getElementById("x43Fs");
    if (fsBtn) fsBtn.addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    });
    tick();
  }

  const Engine = {
    onControl,
    setPreset,
    goto,
    setSpeed,
    setHoldSet,
    labCamera(id) { flyToPreset(id, {}); },
    jumpGroup(dir) {
      const gi = X43Stages.GROUPS.findIndex((g) => g.stages.includes(stageIdx));
      const ng = clamp(gi + dir, 0, X43Stages.GROUPS.length - 1);
      const first = X43Stages.GROUPS[ng].stages.find((s) => !stageStates[s].skip);
      if (first != null) goto(first);
    },
    triggerError,
    setLabels(v) { labelsOn = v; },
    setParticles(v) { X43Scene.setParticles(v); },
    setCutaway(v) { X43Scene.setCutaway(v); },
    homeCamera() {
      const st = D.D.timeline.stages[clamp(stageIdx, 0, X43Stages.stageCount - 1)];
      flyToPreset(st.camera, {});
    },
  };

  // 门与截图用 API
  window.__x43 = {
    rev: T.REVISION,
    dslVersion: D.D.meta.dsl.version,
    camera: () => camera, // 探针用相机引用（label_probe 邻居投影）
    quizData: () => X43Stages.QUIZ, // lab_check quiz 槽位驱动（S5 定稿题面）
    moversDebug: () => X43Scene.moversDebug(), // 门诊断：在途 movers 清单
    goto,
    preset: () => preset.id,
    setPreset,
    setSpeed,
    speed: () => D.k,
    cam: (id, opts) => flyToPreset(id, opts),
    camList: () => D.D.cameras.list.map((c) => c.id),
    setCam(pos, tgt) {
      camera.position.set(pos[0], pos[1], pos[2]);
      ctrl.st.target.set(tgt[0], tgt[1], tgt[2]);
      ctrl.sync(); ctrl.apply();
      camFlight = null;
    },
    tab: (name) => X43Panel.switchTab(name),
    lab: X43Lab,
    badges: () => ({ ...X43Lab.state().badges }),
    stageIndex: () => stageIdx,
    stageSteps: (i) => stepsOf(clamp(i, 0, X43Stages.stageCount - 1)).map((s) => [s[0], s[1]]), // 门工具用：编译步序 [t,fn]（stage_timing 节奏审计）
    sceneState: () => JSON.parse(JSON.stringify(X43Scene.state)),
    corridorCheck: () => corridorCheck,
    f0check,
    entityBoxes,
    metrics: () => metricsOf(clamp(stageIdx, 0, X43Stages.stageCount - 1)),
    labelRects: () => {
      const out = [];
      if (!labelHost) return out;
      for (const el of labelHost.children) {
        if (el.style.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        out.push({ id: el.id, host: el.dataset.host, x: r.x, y: r.y, w: r.width, h: r.height });
      }
      return out;
    },
    labelAnchors: () => X43Scene.labelAnchors(),
    setLabels: (v) => Engine.setLabels(v),
    setParticles: (v) => Engine.setParticles(v),
    setCutaway: (v) => Engine.setCutaway(v),
    flyTo: (i) => {
      const st = D.D.timeline.stages[clamp(i, 0, X43Stages.stageCount - 1)];
      flyToPreset(st.camera, { instant: true });
    },
    triggerError,
    playing: () => !!runner,
    holdSet: (v) => setHoldSet(v),
  };

  return { init };
})();
window.addEventListener("DOMContentLoaded", X43Main.init);
