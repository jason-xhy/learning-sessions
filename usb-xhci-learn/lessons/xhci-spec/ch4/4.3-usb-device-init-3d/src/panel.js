/* panel.js —— 右侧知识面板 + 底部工段条（设计档 §4/§5，heeli 结构映射）
 * 全部由 engine 驱动重渲；不持有场景状态。 */
const X43Panel = (() => {
  let E; // engine
  const $ = (id) => document.getElementById(id);

  const TPL = `
  <aside class="x43-panel" id="x43Panel" aria-label="知识面板">
    <div class="x43-phead">
      <div class="x43-phead-t">
        <span class="x43-phead-k">知识面板</span>
        <h2 id="x43StageTitle">总览</h2>
      </div>
      <button class="x43-ptoggle" id="x43PanelToggle" aria-label="收起面板">▾</button>
    </div>
    <div class="x43-pbody" id="x43PanelBody">
      <dl class="x43-metrics" id="x43Metrics"></dl>
      <p class="x43-runtime" id="x43Runtime"></p>
      <div class="x43-alarm" id="x43Alarm" hidden>
        <p id="x43AlarmText"></p>
        <button id="x43AlarmReset">⟲ 重置设备</button>
      </div>
      <div class="x43-stagehead">
        <span class="x43-badge" id="x43Badge">F0</span>
        <span class="x43-stagename" id="x43StageName">总览</span>
        <span class="x43-status" id="x43StageStatus">已暂停</span>
      </div>
      <div class="x43-cards" id="x43Cards"></div>
      <div class="x43-ctl" role="toolbar" aria-label="播放控制">
        <button data-act="step" id="x43BtnStep" title="下一工段">单步 ▶</button>
        <button data-act="tour" id="x43BtnTour">自动巡游</button>
        <button data-act="run" id="x43BtnRun" title="F0 → F11 全自动">全线联动运行</button>
        <button data-act="reset">⟲ 复位</button>
      </div>
      <div class="x43-sec">
        <h4>分支预设</h4>
        <div class="x43-chips" id="x43Chips"></div>
        <div class="x43-tryerr">
          <button id="x43Trap" title="教学性试错：未填输入上下文抢发 Address Device">试错：不填上下文直接编址</button>
        </div>
      </div>
      <details class="x43-fold" id="xFoldDisp">
        <summary>显示选项</summary>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptCut" checked> 剖视机柜（剖口朝镜头）</label></div>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptLbl" checked> 3D 标签</label></div>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptPart" checked> 票据与传送带粒子</label></div>
        <div class="x43-optrow"><button id="x43OptCam">回到工位（复位预置机位）</button></div>
      </details>
      <details class="x43-fold" id="xFoldPrin">
        <summary>流程原理</summary>
        <div id="x43Prin"></div>
      </details>
      <details class="x43-fold" id="xFoldQuote">
        <summary>规范原文对照（六条）</summary>
        <div id="x43Quotes"></div>
      </details>
      <details class="x43-fold" id="xFieldCard">
        <summary>规范字段卡</summary>
        <div id="x43Fields"></div>
      </details>
      <details class="x43-fold" id="xFoldQuiz">
        <summary>完工自测（4 题）</summary>
        <div id="x43Quiz"></div>
      </details>
    </div>
  </aside>`;

  const BAR_TPL = `
  <footer class="x43-bar" aria-label="工段切换条">
    <button class="x43-arrow" id="x43PrevGrp" aria-label="上一组">◀</button>
    <div class="x43-groups" id="x43Groups"></div>
    <button class="x43-arrow" id="x43NextGrp" aria-label="下一组">▶</button>
  </footer>`;

  function metricRow(k, v, hot, note) {
    return `<div class="x43-m${hot ? " hot" : ""}"><dt>${k}</dt><dd>${v}${note ? `<small>${note}</small>` : ""}</dd></div>`;
  }

  function renderMetrics(m) {
    const el = $("x43Metrics");
    if (!el || !m) return;
    const hot = m.hot || [];
    el.innerHTML =
      metricRow("设备状态", m.dev, hot.includes("dev"), m.devNote) +
      metricRow("槽状态", m.slot, hot.includes("slot"), m.slotNote) +
      metricRow("PLS", m.pls, hot.includes("pls")) +
      metricRow("回执 n", String(m.receipts), hot.includes("receipts"));
  }

  function renderCards(cards) {
    const el = $("x43Cards");
    el.innerHTML = (cards || []).map((c) => `<section class="x43-card"><h3>${c.h3}</h3><p>${c.p}</p></section>`).join("");
  }

  function renderChips(presets, activeId) {
    const el = $("x43Chips");
    el.innerHTML = presets.map((p) => `<button class="x43-chip${p.id === activeId ? " on" : ""}" data-preset="${p.id}" aria-pressed="${p.id === activeId}">${p.name}</button>`).join("");
  }

  function renderStatic(engine) {
    $("x43Prin").innerHTML = X43_PRINCIPLES.map((c) => `<section class="x43-card"><h3>${c.h3}</h3><p>${c.p}</p></section>`).join("");
    $("x43Quotes").innerHTML = X43_QUOTES.map((q) =>
      `<div class="x43-q"><div class="en">${q.en}</div><div class="zh">${q.zh}</div><div class="src">${q.src}</div></div>`).join("");
    $("x43Fields").innerHTML = X43_FIELDCARDS.map((f) =>
      `<section class="x43-field"><h3>${f.h3}</h3><table>${f.rows.map((r) => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join("")}</table><p class="x43-fnote">${f.note} · ${f.src}</p></section>`).join("");
    renderQuiz(engine);
  }

  function renderQuiz(engine) {
    const el = $("x43Quiz");
    el.innerHTML = X43_QUIZ.map((q, i) => {
      const opts = q.opts.map((o, j) => `<button class="x43-qp" data-q="${i}" data-o="${j}">${"ABC"[j]}. ${o}</button>`).join("");
      return `<section class="x43-quizq" data-qi="${i}"><p class="x43-qt">${i + 1}. ${q.q}</p><div class="x43-qopts">${opts}</div><p class="x43-qwhy" hidden>${q.why}</p><button class="x43-qredo" hidden>重做</button></section>`;
    }).join("");
  }

  function bindQuiz() {
    const el = $("x43Quiz");
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      const sec = b.closest(".x43-quizq");
      const qi = Number(b.dataset.q);
      const q = X43_QUIZ[qi];
      if (b.classList.contains("x43-qredo")) {
        sec.querySelectorAll(".x43-qp").forEach((x) => { x.disabled = false; x.classList.remove("ok", "bad"); });
        sec.querySelector(".x43-qwhy").hidden = true;
        sec.querySelector(".x43-qredo").hidden = true;
        return;
      }
      const oi = Number(b.dataset.o);
      sec.querySelectorAll(".x43-qp").forEach((x, j) => {
        x.disabled = true;
        if (j === q.ans) x.classList.add("ok");
        else if (j === oi) x.classList.add("bad");
      });
      sec.querySelector(".x43-qwhy").hidden = false;
      sec.querySelector(".x43-qredo").hidden = false;
    });
  }

  function renderBar(cur, stageStates, groups) {
    const el = $("x43Groups");
    el.innerHTML = groups.map((g) => {
      const btns = g.stages.map((si) => {
        const st = stageStates[si];
        const skip = st.skip ? " skip" : "";
        const on = si === cur ? " on" : "";
        const done = st.done ? " done" : "";
        return `<button class="x43-sbtn${on}${done}${skip}" data-stage="${si}" ${st.skip ? "disabled" : ""}><span>${st.id}</span><strong>${st.title}</strong></button>`;
      }).join("");
      const active = g.stages.includes(cur) ? " grp-on" : "";
      return `<div class="x43-grp${active}"><span class="x43-grpname">${g.name}</span><div class="x43-grpbtns">${btns}</div></div>`;
    }).join("");
  }

  function init(engine) {
    E = engine;
    const host = document.getElementById("x43PanelHost");
    host.innerHTML = TPL;
    const barHost = document.getElementById("x43BarHost");
    barHost.innerHTML = BAR_TPL;
    renderStatic(engine);
    bindQuiz();
    // 面板折叠（窄屏默认收起，保 3D 视口）
    const fold = (v) => {
      $("x43PanelBody").style.display = v ? "none" : "";
      $("x43PanelToggle").textContent = v ? "▸" : "▾";
    };
    $("x43PanelToggle").addEventListener("click", () => {
      fold($("x43PanelBody").style.display !== "none");
    });
    if (window.innerWidth <= 480) fold(true);
    // 控件
    document.querySelector(".x43-ctl").addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-act]");
      if (b) E.onControl(b.dataset.act);
    });
    $("x43Chips").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-preset]");
      if (b) E.setPreset(b.dataset.preset);
    });
    $("x43Trap").addEventListener("click", () => E.triggerError());
    $("x43AlarmReset").addEventListener("click", () => E.onControl("reset"));
    $("x43PrevGrp").addEventListener("click", () => E.jumpGroup(-1));
    $("x43NextGrp").addEventListener("click", () => E.jumpGroup(1));
    $("x43Groups").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-stage]");
      if (b) E.goto(Number(b.dataset.stage));
    });
    $("x43OptCut").addEventListener("change", (ev) => E.setCutaway(ev.target.checked));
    $("x43OptLbl").addEventListener("change", (ev) => E.setLabels(ev.target.checked));
    $("x43OptPart").addEventListener("change", (ev) => E.setParticles(ev.target.checked));
    $("x43OptCam").addEventListener("click", () => E.homeCamera());
  }

  function setStage(st, opts) {
    opts = opts || {};
    $("x43StageTitle").textContent = `${st.id} · ${st.title}`;
    $("x43Badge").textContent = st.id;
    $("x43StageName").textContent = st.title;
    if (opts.status !== undefined) $("x43StageStatus").textContent = opts.status;
    renderMetrics(opts.metrics || st.metrics);
    if (opts.runtime !== undefined) $("x43Runtime").textContent = opts.runtime;
    renderCards(opts.cards || st.cards);
  }

  function setStatus(t) { $("x43StageStatus").textContent = t; }
  function setRuntime(t) { $("x43Runtime").textContent = t; }
  function setMetrics(m) { renderMetrics(m); }
  function showAlarm(text) {
    $("x43Alarm").hidden = false;
    $("x43AlarmText").textContent = text;
  }
  function hideAlarm() { $("x43Alarm").hidden = true; }
  function setTrapEnabled(on) { $("x43Trap").disabled = !on; }
  function setTourBtn(on) {
    $("x43BtnTour").textContent = on ? "暂停巡游" : "自动巡游";
    $("x43BtnTour").setAttribute("aria-pressed", String(on));
  }

  return { init, setStage, setStatus, setRuntime, setMetrics, showAlarm, hideAlarm, setTrapEnabled, setTourBtn, renderBar, renderChips };
})();
