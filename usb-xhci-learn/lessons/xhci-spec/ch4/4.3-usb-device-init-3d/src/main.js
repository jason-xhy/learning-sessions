/* main.js —— 装配入口：渲染器/相机/自写轨道控件/标签投影/工段状态机/预设/试错路径。
 * 设计档 §3/§4/§5/§9：相机预置机位+缓动飞行，手动接管互斥；双视角同时间轴（steps 时间线）。 */
const X43Main = (() => {
  const T = THREE;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const V3 = (a) => new T.Vector3(a[0], a[1], a[2]);

  let renderer, scene, camera, ctrl, labelHost;
  let camFlight = null, manual = false;
  let stageIdx = -1, applied = -1;
  let preset = X43_PRESETS[0];
  let stageStates = [];
  let runner = null, auto = null; // auto: "tour"|"run"|null
  let labelsOn = true;
  let sceneReady = false;
  const clock = new T.Clock();

  // ---------- 自写轨道控件（左键旋转/滚轮缩放/右键平移） ----------
  function makeControls(dom) {
    const st = { target: new T.Vector3(0, 3.4, 0), sph: new T.Spherical(30, 1.1, 0), mode: 0, px: 0, py: 0 };
    const apply = () => {
      camera.position.setFromSpherical(st.sph).add(st.target);
      camera.lookAt(st.target);
    };
    const sync = () => {
      const off = camera.position.clone().sub(st.target);
      st.sph.setFromVector3(off);
    };
    const userGrab = () => { camFlight = null; manual = true; };
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener("pointerdown", (e) => {
      userGrab();
      st.mode = e.button === 2 ? 2 : 1;
      st.px = e.clientX; st.py = e.clientY;
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
    const stop = () => { st.mode = 0; };
    dom.addEventListener("pointerup", stop);
    dom.addEventListener("pointercancel", stop);
    dom.addEventListener("wheel", (e) => {
      e.preventDefault();
      userGrab();
      st.sph.radius = clamp(st.sph.radius * (1 + e.deltaY * 0.0011), 4.5, 58);
      apply();
    }, { passive: false });
    return { st, apply, sync, userGrab };
  }

  function flyTo(pos, tgt, dur) {
    camFlight = {
      p0: camera.position.clone(), p1: V3(pos),
      t0: ctrl.st.target.clone(), t1: V3(tgt),
      t: 0, dur: dur == null ? 1.2 : dur,
    };
    manual = false;
  }

  // ---------- 标签 overlay ----------
  function buildLabels(labels) {
    labelHost = document.createElement("div");
    labelHost.id = "x43Labels";
    document.getElementById("x43Stage").appendChild(labelHost);
    labels.forEach((l) => {
      const el = document.createElement("div");
      el.className = "x43-lb x43-" + (l.cls || "item");
      el.id = "lb-" + l.id;
      el.textContent = l.text;
      el.dataset.anchor = l.p.join(",");
      labelHost.appendChild(el);
    });
  }
  const _pv = new T.Vector3();
  function updateLabels() {
    if (!labelHost) return;
    const w = window.innerWidth, h = window.innerHeight;
    const compact = w <= 480; // 手机紧凑：只保留区标+教学锚，部件级收起（防左右缘裁切）
    for (const el of labelHost.children) {
      if (!labelsOn || (compact && !el.classList.contains("x43-zone") && !el.classList.contains("x43-plate"))) {
        el.style.display = "none";
        continue;
      }
      const p = el.dataset.anchor.split(",").map(Number);
      _pv.set(p[0], p[1], p[2]).project(camera);
      const behind = _pv.z > 1 || _pv.z < -1;
      if (behind) { el.style.display = "none"; continue; }
      el.style.display = "";
      el.style.left = ((_pv.x * 0.5 + 0.5) * w) + "px";
      el.style.top = ((-_pv.y * 0.5 + 0.5) * h) + "px";
    }
  }

  // ---------- 工段状态机 ----------
  function variantOf(i) {
    const v = X43_VARIANTS[preset.id];
    return v && v[i] ? v[i] : null;
  }
  function stepsOf(i) {
    const vr = variantOf(i);
    return vr && vr.steps ? vr.steps : X43_STAGES[i].steps;
  }
  function cardsOf(i) {
    const vr = variantOf(i);
    return vr && vr.cards ? vr.cards : X43_STAGES[i].cards;
  }
  function runtimeOf(i) {
    const vr = variantOf(i);
    return vr && vr.runtime ? vr.runtime : X43_STAGES[i].runtime;
  }
  function metricsOf(i) {
    const vr = variantOf(i);
    return vr && vr.metrics ? vr.metrics : X43_STAGES[i].metrics;
  }
  function stageList() {
    const skip = new Set(preset.skip || []);
    const arr = [];
    for (let i = 0; i < X43_STAGES.length; i++) if (!skip.has(i)) arr.push(i);
    return arr;
  }

  function applyEnd(i) {
    // 快进：瞬时执行某工段全部动作（不生成飞行动件，只落状态）
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
    for (let k = 0; k < i; k++) applyEnd(k);
    applied = i - 1;
  }

  function stopRunner() {
    runner = null;
    if (auto) { auto = null; X43Panel.setTourBtn(false); }
    X43Panel.setStatus(stageIdx >= 0 && stageStates[stageIdx] && stageStates[stageIdx].done ? "已完成" : "已暂停");
  }

  function goto(i, opts) {
    opts = opts || {};
    const instant = !!opts.instant;
    if (i < 0 || i >= X43_STAGES.length) return;
    if (stageStates[i] && stageStates[i].skip) return;
    stopRunnerSilent();
    if (i <= applied) rewindTo(i);
    else if (i > applied + 1) { for (let k = applied + 1; k < i; k++) applyEnd(k); applied = i - 1; }
    stageIdx = i;
    const st = X43_STAGES[i];
    X43Panel.setStage(st, {
      metrics: metricsOf(i),
      runtime: runtimeOf(i),
      cards: cardsOf(i),
      status: instant ? "已完成" : "进行中",
    });
    X43Panel.setTrapEnabled(i === 5 && !instant && !auto);
    X43Panel.hideAlarm();
    if (instant) {
      applyEnd(i);
      applied = i;
      if (i === X43_STAGES.length - 1) stageStates[i].done = true;
      const cam = st.camera;
      camera.position.set(...cam.pos);
      ctrl.st.target.set(...cam.tgt);
      ctrl.sync(); ctrl.apply();
      camFlight = null;
    } else {
      flyTo(st.camera.pos, st.camera.tgt, 1.2);
      runner = { t: 0, steps: stepsOf(i), fired: 0, stage: i };
    }
    refreshBar();
  }

  function stopRunnerSilent() { runner = null; }

  function refreshBar() {
    X43Panel.renderBar(stageIdx, stageStates, X43_GROUPS);
    X43Panel.renderChips(X43_PRESETS, preset.id);
  }

  function onControl(act) {
    if (act === "step") { stepNext(1); }
    else if (act === "reset") { doReset(); }
    else if (act === "tour") { toggleTour(); }
    else if (act === "run") { runAll(); }
  }

  function stepNext(dir) {
    const list = stageList();
    let pos = list.indexOf(stageIdx);
    if (pos < 0) pos = 0;
    const next = list[clamp(pos + dir, 0, list.length - 1)];
    if (next === stageIdx && dir > 0) { // 已在末段：重放完工段
      goto(next);
      return;
    }
    goto(next);
  }

  function toggleTour() {
    if (auto) { auto = null; X43Panel.setTourBtn(false); X43Panel.setStatus("已暂停"); return; }
    auto = "tour";
    X43Panel.setTourBtn(true);
    if (runner) return; // 已在播：播完自动接下一段
    advanceFrom(stageIdx);
  }

  function runAll() {
    auto = "run";
    X43Panel.setTourBtn(true);
    doReset({ keepAuto: true });
    goto(0);
  }

  function advanceFrom(i) {
    const list = stageList();
    const pos = list.indexOf(i);
    if (pos < 0 || pos >= list.length - 1) {
      auto = null;
      X43Panel.setTourBtn(false);
      X43Panel.setStatus("已完成");
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
    stageStates = X43_STAGES.map((s, i) => ({ id: s.id, title: s.title, skip: (preset.skip || []).includes(i), done: false }));
    X43Panel.hideAlarm();
    goto(0, { instant: true });
    X43Panel.setStatus("已暂停");
  }

  function setPreset(id) {
    const p = X43_PRESETS.find((x) => x.id === id);
    if (!p || p.id === preset.id) return;
    preset = p;
    doReset();
    X43Panel.setRuntime(`预设已切换：${p.name}——${p.id === "fs" ? "12 工段全走" : "跳过工段见底栏置灰"}`);
  }

  // ---------- 试错路径（设计档 §4.5） ----------
  function triggerError() {
    if (stageIdx !== 5) return;
    stopRunner();
    X43Panel.setTrapEnabled(false);
    X43Scene.blankForm();
    X43Panel.setRuntime("试错：输入上下文为空，抢发 Address Device…");
    X43Scene.actions.slip({ label: "Address Device · 输入上下文为空" });
    setTimeout(() => { if (sceneReady) X43Scene.actions.bell0({}); }, 1900);
    setTimeout(() => {
      if (!sceneReady) return;
      X43Scene.actions.alarmEvent({});
      X43Panel.showAlarm("空输入上下文抢发 Address Device——xHC 执行前校验引用上下文失败：命令完成事件回执 Completion Code=Parameter Error（参数错误），输出上下文不变，设备无感知。处置：⟲ 重置设备，回 F5 先把 A0/A1 与 Slot/EP0 填格，再走编址。（判据：xHCI 1.2b §4.6.4 p100——命令执行前应校验上下文有效，无效上下文→Parameter Error）");
      X43Panel.setRuntime("命令完成事件：Completion Code=Parameter Error（参数错误）——输入上下文无效");
      X43Panel.setStatus("已暂停");
    }, 4600);
  }

  // ---------- 每帧 ----------
  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.1);
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
          if (wasAuto) setTimeout(() => { if (auto) advanceFrom(runner ? runner.stage : stageIdx); }, 500);
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
    const msgs = ["正在布置 xHC 启机车间", "载入寄存器面板墙…", "装配事件环传送带…", "接通总线缆与端口排…"];
    let i = 0;
    el.textContent = msgs[0];
    const iv = setInterval(() => {
      i += 1;
      if (i < msgs.length) el.textContent = msgs[i];
      else {
        clearInterval(iv);
        card.classList.add("x43-hidden");
        setTimeout(() => card.remove(), 700);
      }
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
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = T.SRGBColorSpace;
    holder.appendChild(renderer.domElement);
    scene = new T.Scene();
    scene.background = new T.Color(0x0d1116);
    scene.fog = new T.Fog(0x0d1116, 46, 130);
    camera = new T.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 9, 23);
    ctrl = makeControls(renderer.domElement);
    const info = X43Scene.build(T, scene);
    buildLabels(info.labels);
    sceneReady = true;
    window.__x43._scene = scene; // 门诊断用场景引用
    stageStates = X43_STAGES.map((s, i) => ({ id: s.id, title: s.title, skip: false, done: false }));
    X43Panel.init(Engine);
    doReset();
    loadingSeq();
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
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
    jumpGroup(dir) {
      const gi = X43_GROUPS.findIndex((g) => g.stages.includes(stageIdx));
      const ng = clamp(gi + dir, 0, X43_GROUPS.length - 1);
      const first = X43_GROUPS[ng].stages.find((s) => !stageStates[s].skip);
      if (first != null) goto(first);
    },
    triggerError,
    setLabels(v) { labelsOn = v; },
    setParticles(v) { X43Scene.setParticles(v); },
    setCutaway(v) { X43Scene.setCutaway(v); },
    homeCamera() {
      const st = X43_STAGES[clamp(stageIdx, 0, X43_STAGES.length - 1)];
      flyTo(st.camera.pos, st.camera.tgt, 1.2);
    },
  };

  // 门与截图用 API
  window.__x43 = {
    rev: T.REVISION,
    goto,
    preset: () => preset.id,
    setPreset,
    stageIndex: () => stageIdx,
    sceneState: () => JSON.parse(JSON.stringify(X43Scene.state)),
    metrics: () => X43_STAGES[clamp(stageIdx, 0, X43_STAGES.length - 1)].metrics,
    labelRects: () => {
      const out = [];
      if (!labelHost) return out;
      for (const el of labelHost.children) {
        if (el.style.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (r.width < 2) continue;
        out.push({ id: el.id, x: r.x, y: r.y, w: r.width, h: r.height });
      }
      return out;
    },
    setLabels: (v) => Engine.setLabels(v),
    setParticles: (v) => Engine.setParticles(v),
    setCutaway: (v) => Engine.setCutaway(v),
    flyTo: (i) => {
      const st = X43_STAGES[clamp(i, 0, X43_STAGES.length - 1)];
      camera.position.set(...st.camera.pos);
      ctrl.st.target.set(...st.camera.tgt);
      ctrl.sync(); ctrl.apply();
    },
    triggerError,
    playing: () => !!runner,
  };

  return { init };
})();
window.addEventListener("DOMContentLoaded", X43Main.init);
