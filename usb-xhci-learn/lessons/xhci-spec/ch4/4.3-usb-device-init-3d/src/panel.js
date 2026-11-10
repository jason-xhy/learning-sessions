/* panel.js —— V3 知识面板（4 tab：讲解/字段与引文/动手台/显示）+ 底部工段条
 * 活指标四项常驻 tab 头上方 + RuntimeStatus 活文案行（DSL panel.live）；
 * 内容全部由编译产物（X43Stages）与 engine 驱动渲染，不持场景状态。 */
const X43Panel = (() => {
  let E; // engine
  const $ = (id) => document.getElementById(id);

  const TPL = `
  <aside class="x43-panel" id="x43Panel" aria-label="知识面板">
    <div class="x43-phead">
      <div class="x43-phead-t">
        <span class="x43-phead-k">知识面板</span>
        <h2 id="x43StageTitle">F0 · 全景</h2>
      </div>
      <button class="x43-ptoggle" id="x43PanelToggle" aria-label="收起面板">▾</button>
    </div>
    <div class="x43-pbody" id="x43PanelBody">
      <dl class="x43-metrics" id="x43Metrics"></dl>
      <div class="x43-tabs" role="tablist" id="x43Tabs">
        <button class="x43-tab on" data-tab="exp" role="tab" aria-selected="true">讲解</button>
        <button class="x43-tab" data-tab="fields" role="tab" aria-selected="false">字段与引文</button>
        <button class="x43-tab" data-tab="lab" role="tab" aria-selected="false">动手台</button>
        <button class="x43-tab" data-tab="video" role="tab" aria-selected="false">演示视频</button>
        <button class="x43-tab" data-tab="disp" role="tab" aria-selected="false">显示</button>
      </div>
      <div class="x43-pane" id="x43Pane-exp">
        <p class="x43-runtime" id="x43Runtime"></p>
        <div class="x43-alarm" id="x43Alarm" hidden>
          <p id="x43AlarmText"></p>
          <button id="x43AlarmReset">⟲ 复位设备</button>
        </div>
        <div class="x43-stagehead">
          <span class="x43-badge" id="x43Badge">F0</span>
          <span class="x43-stagename" id="x43StageName"></span>
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
            <button id="x43Trap" title="教学性试错：未填输入上下文抢发 Address Device（F5 场景）">试错：不填上下文直接编址</button>
          </div>
        </div>
        <details class="x43-fold" id="xFoldQuiz" open>
          <summary>完工自测（5 题 · ≥4 题通过可重做）</summary>
          <div id="x43Quiz"></div>
        </details>
      </div>
      <div class="x43-pane" id="x43Pane-fields" hidden>
        <div class="x43-fsec"><h4>规范字段卡</h4><div id="x43Fields"></div></div>
        <div class="x43-fsec"><h4>规范原文对照（六条）</h4><div id="x43Quotes"></div></div>
        <div class="x43-fsec"><h4>流程原理</h4><div id="x43Prin"></div></div>
        <div class="x43-fsec"><h4>数字口径统一表</h4><div id="x43Numeric"></div></div>
      </div>
      <div class="x43-pane" id="x43Pane-lab" hidden>
        <div id="x43Lab"></div>
      </div>
      <div class="x43-pane" id="x43Pane-video" hidden>
        <p class="x43-runtime" id="x43VideoIntro"></p>
        <div class="x43-fsec"><h4>全集清单</h4><div id="x43Videos"></div></div>
        <p class="x43-fnote">mp4 为旁文件（不内嵌，PIPELINE §4 口径）：单文件自包含不受影响；离线分发需把 media/ 目录与 index.html 同放。</p>
      </div>
      <div class="x43-pane" id="x43Pane-disp" hidden>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptCut" checked> 剖视机柜（剖口朝镜头）</label></div>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptLbl" checked> 3D 标签</label></div>
        <div class="x43-optrow"><label><input type="checkbox" id="x43OptPart" checked> 票据/光束/方波信号</label></div>
        <div class="x43-optrow"><button id="x43OptCam">回到工位（复位预置机位）</button></div>
        <div class="x43-optrow x43-spedrow">
          <span class="x43-spedk">动画速度（观看层 t=base/k，方波 ×k；UI 固定 0.25s；默认 0.5× 宁慢勿快）</span>
          <div class="x43-chips" id="x43Speed"></div>
        </div>
        <div class="x43-optrow x43-spedrow">
          <span class="x43-spedk">流转卡停留 HOLD_SET（实际=max(1.2, HOLD_SET/k)）：<output id="x43HoldOut">2.0</output>s</span>
          <input type="range" id="x43Hold" min="1.5" max="4" step="0.1" value="2">
        </div>
        <p class="x43-narrownote">≤480px 窄屏：面板初始折叠+半高贴底；紧凑标签只显区标+铭牌（zone-sw/zone-hc/zone-dev/plate）。</p>
      </div>
    </div>
  </aside>`;

  const BAR_TPL = `
  <footer class="x43-bar" aria-label="工段切换条">
    <button class="x43-arrow" id="x43PrevGrp" aria-label="上一组">◀</button>
    <div class="x43-groups" id="x43Groups"></div>
    <button class="x43-arrow" id="x43NextGrp" aria-label="下一组">▶</button>
  </footer>`;

  // ---------- S7 演示视频清单（media/ 旁文件；mb/s = crf20 终版实测回填值，禁手写虚值） ----------
  const VIDEO_SIZES = {
    intro: [0.1, 4.0], F0: [0.4, 12.2], F1: [0.7, 12.4], F2: [0.6, 8.9], F3: [0.7, 9.9],
    F4: [0.8, 11.4], F5: [0.7, 11.8], F6: [0.9, 14.4], F7: [1.2, 16.1], F8: [0.7, 10.8],
    F9: [0.6, 11.1], F10: [0.8, 10.4], F11: [0.8, 12.4], outro: [0.1, 6.0],
  };
  function renderVideos() {
    const el = $("x43Videos");
    if (!el) return;
    const intro = $("x43VideoIntro");
    if (intro) intro.textContent = "教学演示视频（全集 14 段 · 1280×720 · 1× 节奏）：逐工段=章节卡+画面+底部解说词；点击链接在新窗打开。";
    const rows = [];
    const push = (file, label, key) => {
      const v = VIDEO_SIZES[key];
      rows.push(`<div class="x43-vrow"><a href="${file}" target="_blank" rel="noopener">▶ ${label}</a><span class="x43-vmeta">${v ? v[0].toFixed(1) + "MB · " + v[1].toFixed(1) + "s" : "—"}</span></div>`);
    };
    push("media/S07-intro.mp4", "片头卡 · 课程导览", "intro");
    const stages = X43D.D.timeline.stages;
    for (const st of stages) {
      push(`media/S07-${st.id}.mp4`, `${st.id} · ${st.title}${st.page ? "（" + st.page + "）" : ""}`, st.id);
    }
    push("media/S07-outro.mp4", "片尾卡 · 自测与动手台引导", "outro");
    el.innerHTML = rows.join("");
  }

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
    el.innerHTML = (cards || []).map((c) => `<section class="x43-card${c.anchorCard ? " anchor" : ""}"><h3>${c.h3}</h3><p>${c.p}</p></section>`).join("");
  }
  function renderChips(presets, activeId) {
    const el = $("x43Chips");
    el.innerHTML = presets.map((p) => `<button class="x43-chip${p.id === activeId ? " on" : ""}" data-preset="${p.id}" aria-pressed="${p.id === activeId}" title="${p.tag}">${p.name}</button>`).join("");
  }
  function renderSpeed(speeds, activeV) {
    const el = $("x43Speed");
    if (!el) return;
    el.innerHTML = speeds.map((s) => `<button class="x43-chip${String(s.v) === String(activeV) ? " on" : ""}" data-speed="${s.v}" aria-pressed="${String(s.v) === String(activeV)}">${s.label}</button>`).join("");
  }
  function renderStatic() {
    $("x43Fields").innerHTML = X43Stages.FIELD_CARDS.map((f) => {
      const head = f.header ? `<tr>${f.header.map((h) => `<th>${h}</th>`).join("")}</tr>` : "";
      return `<section class="x43-field"><h3>${f.h3}</h3><table>${head}${(f.rows || []).map((r) => `<tr>${r.map((c, i) => i === 0 && !f.header ? `<th>${c}</th>` : `<td>${c}</td>`).join("")}</tr>`).join("")}</table><p class="x43-fnote">${f.note} · ${f.src}</p></section>`;
    }).join("");
    $("x43Quotes").innerHTML = X43Stages.QUOTES.map((q) =>
      `<div class="x43-q"><div class="en">${q.en}</div><div class="zh">${q.zh}</div><div class="src">${q.src}</div></div>`).join("");
    $("x43Prin").innerHTML = X43Stages.PRINCIPLES.map((c) => `<section class="x43-card"><h3>${c.h3}</h3><p>${c.p}</p></section>`).join("");
    $("x43Numeric").innerHTML = `<table class="x43-num">${X43Stages.NUMERIC_TABLE.map((r) => `<tr><th>${r.field}</th><td>${r.values}</td></tr>`).join("")}</table><p class="x43-fnote">出处：S1 §8.2 数字口径统一表</p>`;
    renderQuiz();
  }
  function renderQuiz() {
    const el = $("x43Quiz");
    const qs = X43Stages.QUIZ;
    const st = X43Lab.state();
    el.innerHTML = qs.map((q, i) => {
      const picked = st.quiz.answered[i];
      const opts = q.opts.map((o, j) => {
        let cls = "x43-qp";
        let dis = "";
        if (picked != null) {
          dis = "disabled";
          if (j === q.ans) cls += " ok";
          else if (j === picked) cls += " bad";
        }
        return `<button class="${cls}" data-q="${i}" data-o="${j}" ${dis}>${"ABC"[j]}. ${o}</button>`;
      }).join("");
      const showWhy = picked != null;
      return `<section class="x43-quizq" data-qi="${i}"><p class="x43-qt">${i + 1}. ${q.q}</p><div class="x43-qopts">${opts}</div><p class="x43-qwhy" ${showWhy ? "" : "hidden"}>${q.why}</p></section>`;
    }).join("") +
    (st.quiz.score >= 0
      ? `<div class="x43-quizscore${st.quiz.score >= 4 ? " pass" : ""}">${st.quiz.score >= 4
          ? `✓ 通过 ${st.quiz.score}/${qs.length}（≥4/5）——可「重做」巩固`
          : `本回 ${st.quiz.score}/${qs.length}——未到 4/5，按「重做」再试一遍`}</div><div class="x43-labfoot"><button class="x43-chip" id="x43QuizRedo">⟲ 重做</button></div>`
      : `<p class="x43-fnote">答完全部 ${qs.length} 题出分；≥4/5 通过，可重做。</p>`);
  }
  function bindQuiz() {
    $("x43Quiz").addEventListener("click", (ev) => {
      const redo = ev.target.closest("#x43QuizRedo");
      if (redo) { X43Lab.quizRedo(); return; }
      const b = ev.target.closest(".x43-qp");
      if (!b || b.disabled) return;
      X43Lab.quizAnswer(Number(b.dataset.q), Number(b.dataset.o));
      renderQuiz(); // 作答后立即重渲（出分/重做按钮）
    });
  }

  // ---------- 动手台渲染（三关+徽章架） ----------
  function renderLab() {
    const host = $("x43Lab");
    if (!host) return;
    const st = X43Lab.state();
    const rack = `<div class="x43-badrack">徽章架：<span class="x43-bad${st.badges.L1 ? " got" : ""}">门铃上手 ✓</span><span class="x43-bad${st.badges.L2 ? " got" : ""}">控制读三段齐 ✓</span><span class="x43-bad${st.badges.L3 ? " got" : ""}">值班工程师 ✓</span></div>`;
    if (!st.started || st.phase === "locked") {
      const lockNote = st.phase === "locked" ? `<p class="x43-labmsg" data-bad="1">${st.msg}</p>` : "";
      host.innerHTML = `
        <p class="x43-labintro">在「动手台」以驱动身份亲手操作——三关递进：提示逐关撤除。练习独立运行，不影响主线工段播放；判分不写回主线。等待时长按 1/k 折算封顶 6s。</p>
        ${rack}${lockNote}
        <div class="x43-labchips">
          <button class="x43-chip" data-labstart="L1">第 1 关 · 按门铃（一键正确）</button>
          <button class="x43-chip" data-labstart="L2">第 2 关 · 组一次控制读（带提示装配）</button>
          <button class="x43-chip" data-labstart="L3">第 3 关 · 值班工程师（无提示·L2 徽章为入门票）</button>
        </div>`;
      return;
    }
    let body = "";
    if (st.level === "L1") {
      body = st.phase === "done"
        ? `<div class="x43-labbadge">✓ 门铃上手</div><p class="x43-labsum">${st.live || "按门铃=告知 xHC：有新工作"}——按门铃即开工：xHC 收到门铃才去环上取工作。</p>
           <div class="x43-labfoot"><button class="x43-chip" data-labstart="L1">↻ 再来一遍</button><button class="x43-chip" data-labstart="L2">去第 2 关</button></div>`
        : `<p class="x43-labp">EP0 门铃（1 号旋钮）正在呼吸高亮——点场景里的旋钮，或点下方按钮（双入口同义）：</p>
           <div class="x43-labopts big">
             <button class="x43-labopt" data-l1pick="1">按下 EP0 门铃（bell1 · DB Target=1）</button>
             <button class="x43-labopt" data-l1pick="0">按下命令门铃（bell0 · DB Target=0）</button>
             <button class="x43-labopt" data-l1pick="empty">点一个空槽门铃（2–7 号）</button>
           </div>`;
    } else if (st.level === "L2") {
      if (st.phase === "done") {
        body = `<div class="x43-labbadge">✓ 控制读三段齐</div>
          <p class="x43-labsum">GET_DESCRIPTOR 六步走通：组请求（80h/6/0100h/8）→ 三 TRB 确认 → 写环（Setup→Data→Status，cycle=1）→ 按 DB Target=1 → 等回执（Success）→ 更新 MPS=8。这枚徽章是第 3 关的入门票。</p>
          <div class="x43-labfoot"><button class="x43-chip" data-labstart="L2">↻ 再来一遍</button><button class="x43-chip" data-labstart="L3">去第 3 关</button></div>`;
      } else {
        const cur2 = X43Lab.L2STEPS[st.stepIdx];
        const dots = X43Lab.L2STEPS.map((_, i) => `<span class="x43-dot${i < st.stepIdx ? " done" : ""}${i === st.stepIdx ? " on" : ""}"></span>`).join("");
        let stepBody = "";
        if (cur2.groups) {
          stepBody = (cur2.fixed || []).map((f) => `<div class="x43-labfix">${f.k} = <strong>${f.v}</strong><small>${f.note || ""}</small></div>`).join("") +
            cur2.groups.map((g) => {
              const okd = !!st.groups[g.k];
              return `<div class="x43-labg"><span class="k">${g.k}<small>${g.q}</small></span><div class="x43-labopts">${g.opts.map((o) => `<button class="x43-labopt${o.ok && okd ? " ok" : ""}" data-l2pick="${g.k}||${o.v}" ${okd ? "disabled" : ""}>${o.v}</button>`).join("")}</div></div>`;
            }).join("");
        } else if (cur2.kind === "place") {
          stepBody = `<div class="x43-labcards">${cur2.cards.map((c, i) => `<button class="x43-labcard${i < st.placed ? " placed" : ""}" data-l2place="${i}" ${i < st.placed ? "disabled" : ""}>${c}</button>`).join("")}</div>
            <div class="x43-labring"><span class="x43-labringk">EP0 传输环 · cycle 从当前 PCS=1 起</span><div class="x43-labslots">${cur2.cards.map((_, i) => i < st.placed ? `<span class="x43-labslot fill">TRB<br>cycle=1</span>` : `<span class="x43-labslot"></span>`).join("")}</div></div>`;
        } else if (cur2.kind === "choice") {
          stepBody = `<div class="x43-labopts big">${cur2.opts.map((o, i) => `<button class="x43-labopt" data-l2choice="${i}">${o.v}</button>`).join("")}</div>`;
        } else if (cur2.kind === "act") {
          stepBody = st.waitDone
            ? `<p class="x43-labwait done">✓ ${cur2.doneText}</p>`
            : `<button class="x43-chip" data-l2act="1">读取回执</button>${st.waiting ? `<p class="x43-labwait">xHC 调度中…<span class="x43-labspin"></span></p>` : ""}`;
        }
        body = `<div class="x43-labhead"><span class="x43-labname">第 2 关 · 组一次控制读</span><span class="x43-labstep">第 ${st.stepIdx + 1}/${X43Lab.L2STEPS.length} 步 · ${cur2.name}</span></div>
          <div class="x43-labdots">${dots}</div><p class="x43-labp">${cur2.prompt}</p>${stepBody}
          <p class="x43-labhint">模式：选项高亮+即时纠错，错选不推进。</p>`;
      }
    } else if (st.level === "L3") {
      if (st.phase === "done") {
        body = `<div class="x43-labbadge">✓ 值班工程师</div>
          <p class="x43-labsum">三任务全对：T1 Enable Slot（命令环+DB Target=0）· T2 BSR 双分支各自结局 · T3 Linux 实路径四卡排序（S1 §6.3）。</p>
          <div class="x43-labfoot"><button class="x43-chip" data-labstart="L3">↻ 再来一遍</button></div>`;
      } else {
        const t1 = st.t1, t2 = st.t2, t3 = st.t3;
        const ringOpts = [["ringCmd", "命令环（唯一）"], ["ringEvt", "事件环"], ["ringEp0", "EP0 传输环"]]
          .map(([v, label]) => `<button class="x43-labopt${t1.ring === v ? " picked" : ""}" data-l3t1ring="${v}" ${t1.judged ? "disabled" : ""}>${label}</button>`).join("");
        const bellOpts = [["DB Target=0", "门铃 0 · DB Target=0"], ["DB Target=1", "门铃 1 · DB Target=1（EP0）"]]
          .map(([v, label]) => `<button class="x43-labopt${t1.bell === v ? " picked" : ""}" data-l3t1bell="${v}" ${t1.judged ? "disabled" : ""}>${label}</button>`).join("");
        const t2opts = [["BSR=0 · 直通（xHC 代发 SET_ADDRESS）", "BSR=1 · 旁路（先通信）"]]
          .map(() => "").join("");
        const t3slots = X43Lab.L3_CARDS.map((c, i) => `<button class="x43-labcard${t3.order.indexOf(i) >= 0 ? " placed" : ""}" data-l3order="${i}" ${t3.judged ? "disabled" : ""}>${c}${t3.order.indexOf(i) >= 0 ? `（第 ${t3.order.indexOf(i) + 1} 步）` : ""}</button>`).join("");
        body = `
          <div class="x43-labhead"><span class="x43-labname">第 3 关 · 值班工程师</span><span class="x43-labstep">无提示 · 提交后统一判分</span></div>
          <p class="x43-labp">T1 · Enable Slot 怎么发？<small>（上哪条环 + 按哪个门铃，选完提交）</small></p>
          <div class="x43-labg"><span class="k">环</span><div class="x43-labopts">${ringOpts}</div></div>
          <div class="x43-labg"><span class="k">门铃</span><div class="x43-labopts">${bellOpts}</div>
            ${t1.judged ? `<div class="x43-labmsg" data-bad="${t1.ok ? 0 : 1}">${t1.judgeText}</div>` : `<div class="x43-labopts"><button class="x43-chip" data-l3judge1="1" ${t1.ring == null || t1.bell == null ? "disabled" : ""}>提交 T1</button></div>`}
          </div>
          <p class="x43-labp">T2 · BSR 双分支——两条都是真实分支，任选其一演示结局：</p>
          <div class="x43-labopts big">
            <button class="x43-labopt" data-l3t2="0" ${t2.judged ? "disabled" : ""}>BSR=0 · 直通</button>
            <button class="x43-labopt" data-l3t2="1" ${t2.judged ? "disabled" : ""}>BSR=1 · 旁路</button>
          </div>
          ${t2.judged ? `<div class="x43-labmsg" data-bad="0">${t2.outcome.text}</div>` : ""}
          <p class="x43-labp">T3 · Linux 实路径挑战关——按驱动真实顺序排四张动作卡：</p>
          <div class="x43-labcards">${t3slots}</div>
          ${t3.judged ? `<div class="x43-labmsg" data-bad="${t3.ok ? 0 : 1}">${t3.judgeText}</div>
            <div class="x43-labmsg" data-bad="0">对照卡（与全速主线三点差异）：BSR=1 先通信 · BSR=0 后编址 · 不重写 MPS（Evaluate Context 不在枚举链）。${t3.ok ? "" : `<button class="x43-chip" data-l3retry3="1">↻ 再排一次</button>`}</div>`
          : `<div class="x43-labopts"><button class="x43-chip" data-l3reset3="1" ${t3.order.length ? "" : "disabled"}>重排</button></div>`}
          <div class="x43-labfoot"><button class="x43-chip" data-labstart="L3">↻ 重开本关</button></div>
          <p class="x43-labhint">规则：无高亮、无前置提示；三任务全对=徽章「值班工程师 ✓」。</p>`;
      }
    }
    const msgHtml = st.msg
      ? `<div class="x43-labmsg" id="x43LabMsg" data-bad="${st.msgBad ? 1 : 0}">${st.msg}</div>`
      : `<div class="x43-labmsg" id="x43LabMsg" data-bad="0" hidden></div>`;
    host.innerHTML = `${rack}${body}${msgHtml}`;
  }

  function bindLab() {
    const host = $("x43Lab");
    host.addEventListener("click", (ev) => {
      const b = ev.target.closest("button");
      if (!b) return;
      if (b.dataset.labstart) { X43Lab.start(b.dataset.labstart); return; }
      if (b.dataset.l1pick !== undefined) { X43Lab.L1.pick(b.dataset.l1pick === "empty" ? 2 : Number(b.dataset.l1pick)); return; }
      if (b.dataset.l2pick) { const [gk, v] = b.dataset.l2pick.split("||"); X43Lab.pick(gk, v); return; }
      if (b.dataset.l2place !== undefined) { X43Lab.place(Number(b.dataset.l2place)); return; }
      if (b.dataset.l2choice !== undefined) { X43Lab.choice(Number(b.dataset.l2choice)); return; }
      if (b.dataset.l2act) { X43Lab.act(); return; }
      if (b.dataset.l3t1ring) { X43Lab.setT1("ring", b.dataset.l3t1ring); return; }
      if (b.dataset.l3t1bell) { X43Lab.setT1("bell", b.dataset.l3t1bell); return; }
      if (b.dataset.l3judge1) { X43Lab.judgeT1(); return; }
      if (b.dataset.l3t2 !== undefined) { X43Lab.pickT2(Number(b.dataset.l3t2)); return; }
      if (b.dataset.l3order !== undefined) { X43Lab.order(Number(b.dataset.l3order)); return; }
      if (b.dataset.l3reset3) { X43Lab.resetT3(); return; }
      if (b.dataset.l3retry3) { X43Lab.retryT3(); return; }
    });
  }

  function renderBar(curIdx, stageStates, groups) {
    const el = $("x43Groups");
    el.innerHTML = groups.map((g) => {
      const btns = g.stages.map((si) => {
        const st = stageStates[si];
        const skip = st.skip ? " skip" : "";
        const on = si === curIdx ? " on" : "";
        const done = st.done ? " done" : "";
        return `<button class="x43-sbtn${on}${done}${skip}" data-stage="${si}" ${st.skip ? "disabled" : ""}><span>${st.id}</span><strong>${st.title}</strong></button>`;
      }).join("");
      const active = g.stages.includes(curIdx) ? " grp-on" : "";
      return `<div class="x43-grp${active}"><span class="x43-grpname">${g.name}</span><div class="x43-grpbtns">${btns}</div></div>`;
    }).join("");
  }

  function switchTab(name) {
    const valid = ["exp", "fields", "lab", "video", "disp"];
    if (!valid.includes(name)) return;
    for (const t of valid) {
      const btn = document.querySelector(`.x43-tab[data-tab="${t}"]`);
      const pane = $("x43Pane-" + t);
      if (!btn || !pane) continue;
      const on = t === name;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-selected", String(on));
      pane.hidden = !on;
    }
    if (name === "lab") renderLab();
    if (name === "exp") renderQuiz();
  }

  function init(engine) {
    E = engine;
    document.getElementById("x43PanelHost").innerHTML = TPL;
    document.getElementById("x43BarHost").innerHTML = BAR_TPL;
    renderStatic();
    renderVideos();
    bindQuiz();
    bindLab();
    X43Lab.setRender(() => { renderLab(); });
    X43Lab.setEngine(engine);
    renderLab();
    const fold = (v) => {
      $("x43PanelBody").style.display = v ? "none" : "";
      $("x43PanelToggle").textContent = v ? "▸" : "▾";
    };
    $("x43PanelToggle").addEventListener("click", () => fold($("x43PanelBody").style.display !== "none"));
    if (window.innerWidth <= X43D.D.meta.render.narrowBreakpointPx) fold(true);
    $("x43Tabs").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-tab]");
      if (b) switchTab(b.dataset.tab);
    });
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
    $("x43Speed").addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-speed]");
      if (b) E.setSpeed(Number(b.dataset.speed));
    });
    $("x43Hold").addEventListener("input", (ev) => {
      const v = Number(ev.target.value);
      $("x43HoldOut").textContent = v.toFixed(1);
      E.setHoldSet(v);
    });
  }

  function setStage(st, opts) {
    opts = opts || {};
    $("x43StageTitle").textContent = `${st.id} · ${st.title}`;
    $("x43Badge").textContent = st.id;
    $("x43StageName").textContent = st.title + (st.page ? `（${st.page}）` : "");
    if (opts.status !== undefined) $("x43StageStatus").textContent = opts.status;
    renderMetrics(opts.metrics || st.metrics);
    if (opts.runtime !== undefined) $("x43Runtime").textContent = opts.runtime;
    renderCards(opts.cards || st.cards);
  }
  function setStatus(t) { $("x43StageStatus").textContent = t; }
  function setRuntime(t) { $("x43Runtime").textContent = t; }
  function showAlarm(text) { $("x43Alarm").hidden = false; $("x43AlarmText").textContent = text; }
  function hideAlarm() { $("x43Alarm").hidden = true; }
  function setTrapEnabled(on) { $("x43Trap").disabled = !on; }
  function setTourBtn(on) {
    $("x43BtnTour").textContent = on ? "暂停巡游" : "自动巡游";
    $("x43BtnTour").setAttribute("aria-pressed", String(on));
  }

  return { init, setStage, setStatus, setRuntime, showAlarm, hideAlarm, setTrapEnabled, setTourBtn, renderBar, renderChips, renderSpeed, switchTab, renderQuiz, renderLab };
})();
