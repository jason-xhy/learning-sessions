/* engine.js —— V3 DSL 解析适配层 X43D（消费 scene.dsl.json；禁绕过 derived 自行发明缺省值）
 * 职责：derived 引用解析 / 实体几何归一 / 材质工厂（S6 纹理注入口）/ timeline 参数表 /
 * 机位表+camAdapt / 标签表 / slot 公式（d01）。 */
const X43D = (() => {
  const D = X43_DSL;

  // ---------- derived 引用解析（"derived:dXX" / "derived:dXX.key.sub"；允许尾随批注如 "derived:d06（…）"） ----------
  const REF_RE = /^derived:([A-Za-z0-9]+((?:\.[A-Za-z0-9_]+)+)?)/;
  function ref(v) {
    if (typeof v !== "string" || !v.startsWith("derived:")) return v;
    const m = v.match(REF_RE);
    if (!m) throw new Error("derived 引用不可解析: " + v);
    const parts = m[1].split(".");
    const d = D.meta.derived.find((x) => x.id === parts[0]);
    if (!d) throw new Error("derived 引用缺失: " + v);
    let out = d.value;
    for (let i = 1; i < parts.length; i++) {
      if (out == null) throw new Error("derived 路径不可解析: " + v);
      out = out[parts[i]];
    }
    if (out === undefined) throw new Error("derived 路径不可解析: " + v);
    return out;
  }
  function deep(v) {
    if (typeof v === "string" && v.startsWith("derived:")) return ref(v);
    if (Array.isArray(v)) return v.map(deep);
    if (v && typeof v === "object") {
      const o = {};
      for (const k of Object.keys(v)) o[k] = deep(v[k]);
      return o;
    }
    return v;
  }

  // ---------- 区间/位置几何归一 ----------
  // bbox {x:[a,b],...} → 中心+尺寸；pos+size / pos+radius 直接取（两种形态不换算，承 S3-说明）
  // 变体：z 给 zCenter（如 d16 状态窗板）→ 板厚取 d18 贴面板厚缺省档；y/z 缺省（如 d21 区带）→ 平贴面
  function fromBBox(b) {
    const cx = (b.x[0] + b.x[1]) / 2;
    const cy = b.y && Array.isArray(b.y) ? (b.y[0] + b.y[1]) / 2 : 0;
    const sy = b.y && Array.isArray(b.y) ? b.y[1] - b.y[0] : 0;
    if (b.z && Array.isArray(b.z)) {
      const cz = (b.z[0] + b.z[1]) / 2;
      return { cx, cy, cz, sx: b.x[1] - b.x[0], sy, sz: b.z[1] - b.z[0] };
    }
    if (b.zCenter != null) {
      const thick = ref("derived:d18");
      return { cx, cy, cz: b.zCenter, sx: b.x[1] - b.x[0], sy, sz: thick, zCenter: true };
    }
    return { cx, cy, cz: 0, sx: b.x[1] - b.x[0], sy, sz: 0 };
  }
  function entityGeo(e) {
    let b = e.bbox != null ? deep(e.bbox) : null;
    if (b && typeof b.x === "object") return fromBBox(b);
    if (b) return { cx: 0, cy: 0, cz: 0, sx: 1, sy: 1, sz: 1, raw: b }; // derived 标量 bbox 兜底
    const pos = deep(e.pos || [0, 0, 0]);
    const size = e.size ? deep(e.size) : null;
    const radius = e.radius != null ? deep(e.radius) : null;
    return {
      cx: pos[0], cy: pos[1], cz: pos[2],
      sx: size ? size[0] : (radius != null ? radius * 2 : 1),
      sy: size ? size[1] : (radius != null ? radius * 2 : 1),
      sz: size ? size[2] : (radius != null ? radius * 2 : 1),
      radius: radius != null ? radius : (size ? Math.min(size[0], size[1]) / 2 : null),
    };
  }

  // ---------- 色彩工具 ----------
  function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function midHex(c) { // 区间中值 hex
    const a = hex2rgb(c[0]), b = hex2rgb(c[1]);
    const m = a.map((v, i) => Math.round((v + b[i]) / 2));
    return "#" + m.map((v) => v.toString(16).padStart(2, "0")).join("");
  }

  // ---------- 材质工厂（flat 直色 / pbr 区间中值 + 程序化纹理占位；userData.texRequest=S6 注入口） ----------
  const flatMap = {};
  for (const f of D.materials.flat) flatMap[f.id] = f.hex;
  // 地板三区带（E.2 暗档，实体 bandSw/Hc/DevPlane 的 material id——属 flat 族直色用法）
  for (const b of ["bandSw", "bandHc", "bandDev"]) flatMap[b] = D.materials.flat.find((f) => f.id === b).hex;
  const pbrMap = {};
  for (const p of D.materials.pbr) pbrMap[p.id] = p;

  // ---------- S6 纹理回灌（X43_TEXDATA 在场时替换/增补占位贴图；缺席=占位档原行为） ----------
  const TEXDATA = (typeof X43_TEXDATA !== "undefined") ? X43_TEXDATA : null;
  let texLoader = null;
  // roughnessMap=绝对 roughness 值域（§E.7 区间），注入时标量置 1.0（乘积=区间值，roughnessNote 语义不变）
  function applyTexData(m, req, opts) {
    const td = TEXDATA && TEXDATA.textures[req];
    if (!td || !td.maps) return false;
    const skip = (opts && opts.skip) || [];
    const loader = texLoader || (texLoader = new THREE.TextureLoader());
    let applied = 0;
    for (const slot of Object.keys(td.maps)) {
      if (skip.indexOf(slot) >= 0) continue;
      const def = td.maps[slot];
      const t = loader.load(def.url, () => { m.needsUpdate = true; });
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      if (slot === "map" || slot === "emissiveMap") t.colorSpace = THREE.SRGBColorSpace;
      if (td.repeat) t.repeat.set(td.repeat[0], td.repeat[1]);
      if (slot === "map") m.map = t;
      else if (slot === "roughnessMap") { m.roughnessMap = t; m.roughness = 1.0; }
      else if (slot === "normalMap") { m.normalMap = t; if (td.normalScale) m.normalScale.set(td.normalScale, td.normalScale); }
      else if (slot === "aoMap") m.aoMap = t;
      else if (slot === "emissiveMap") m.emissiveMap = t;
      applied++;
    }
    if (applied) m.needsUpdate = true;
    return applied > 0;
  }

  // 程序化 canvas 纹理族（占位保底；S6 回灌时替换 map/roughnessMap 即完成）
  const MONO = '"SF Mono","Cascadia Code",Consolas,"PingFang SC","Microsoft YaHei",monospace';
  function cnv(px, py) { const c = document.createElement("canvas"); c.width = px; c.height = py; return c; }
  function texOf(canvas, srgb) {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  }
  function noiseSpots(c, px, py, n, dark, light) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * px, y = Math.random() * py, r = 2 + Math.random() * 22;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const base = Math.random() < 0.55 ? dark : light;
      g.addColorStop(0, `rgba(${base},${(0.05 + Math.random() * 0.16).toFixed(2)})`);
      g.addColorStop(1, `rgba(${base},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  }
  function scratches(c, px, py, n, col) {
    for (let i = 0; i < n; i++) {
      c.strokeStyle = `rgba(${col},${(0.06 + Math.random() * 0.18).toFixed(2)})`;
      c.lineWidth = 0.5 + Math.random() * 1.4;
      const x = Math.random() * px, y = Math.random() * py, a = Math.random() * Math.PI, l = 12 + Math.random() * 90;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
  }
  const texFactory = {
    // tex01 机柜钢板：水平拉丝（高对比）+纵向划痕+边框磨损+污渍斑
    tex01() {
      const c = cnv(512, 512).getContext("2d");
      c.fillStyle = "#98a2ae"; c.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 2) {
        const b = Math.random();
        c.fillStyle = b < 0.14 ? `rgba(52,58,66,${0.10 + Math.random() * 0.16})` : b < 0.3 ? `rgba(255,255,255,${0.06 + Math.random() * 0.12})` : `rgba(255,255,255,${0.02 + Math.random() * 0.05})`;
        c.fillRect(0, y, 512, 1);
      }
      scratches(c, 512, 512, 60, "62,68,76"); // 纵向细划痕
      for (let i = 0; i < 46; i++) { // 边框磨损（curvature 驱动的 edge wear 近似：靠边更密）
        const edge = Math.random() < 0.5;
        const x = edge ? (Math.random() < 0.5 ? Math.random() * 36 : 512 - Math.random() * 36) : Math.random() * 512;
        const y = edge ? Math.random() * 512 : (Math.random() < 0.5 ? Math.random() * 36 : 512 - Math.random() * 36);
        c.fillStyle = `rgba(226,230,236,${0.10 + Math.random() * 0.22})`;
        c.beginPath(); c.arc(x, y, 1.5 + Math.random() * 5, 0, Math.PI * 2); c.fill();
      }
      noiseSpots(c, 512, 512, 170, "44,50,58", "222,228,234");
      return { map: texOf(c.canvas), repeat: [1.6, 1.2] };
    },
    // tex02 轨道钢：纵向划痕
    tex02() {
      const c = cnv(256, 256).getContext("2d");
      c.fillStyle = "#aeb9c6"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 90; i++) {
        const x = Math.random() * 256;
        c.strokeStyle = `rgba(96,106,118,${(0.08 + Math.random() * 0.18).toFixed(2)})`;
        c.lineWidth = 0.6 + Math.random() * 1.2;
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x + (Math.random() - 0.5) * 14, 256); c.stroke();
      }
      return { map: texOf(c.canvas), repeat: [2, 1] };
    },
    // tex03 桌面木：木纹沿 X（高对比带）+ 节疤两处（暗心 ΔL 拉大+三重暗环+亮缘）
    tex03() {
      const px = 512, c = cnv(px, px / 2).getContext("2d");
      const band = c.createLinearGradient(0, 0, 0, 256);
      band.addColorStop(0, "#7d6349"); band.addColorStop(0.5, "#6b523b"); band.addColorStop(1, "#75593f");
      c.fillStyle = band; c.fillRect(0, 0, px, 256);
      for (let i = 0; i < 130; i++) {
        const y0 = Math.random() * 256;
        c.strokeStyle = Math.random() < 0.5 ? `rgba(78,56,36,${(0.16 + Math.random() * 0.30).toFixed(2)})` : `rgba(148,120,88,${(0.10 + Math.random() * 0.24).toFixed(2)})`;
        c.lineWidth = 0.6 + Math.random() * 2.6;
        c.beginPath(); c.moveTo(0, y0);
        let x = 0, y = y0;
        while (x < px) { x += 22 + Math.random() * 38; y = y0 + Math.sin(x * 0.02 + y0) * 3 + (Math.random() - 0.5) * 3; c.lineTo(x, y); }
        c.stroke();
      }
      for (let i = 0; i < 2; i++) { // 节疤两处（暗心 ΔL≥18+三重暗环+下缘亮反光）
        const x0 = 60 + Math.random() * (px - 120), y0 = 50 + Math.random() * 156;
        const g = c.createRadialGradient(x0, y0, 1, x0, y0, 20);
        g.addColorStop(0, "rgba(38,26,16,0.95)");
        g.addColorStop(0.55, "rgba(52,38,24,0.55)");
        g.addColorStop(1, "rgba(52,38,24,0)");
        c.fillStyle = g; c.beginPath(); c.arc(x0, y0, 20, 0, Math.PI * 2); c.fill();
        for (const [r, a] of [[8, 0.55], [13, 0.4], [18, 0.26]]) {
          c.strokeStyle = `rgba(44,32,20,${a})`; c.lineWidth = 1.8;
          c.beginPath(); c.ellipse(x0, y0, r * 1.55, r, 0.3, 0, Math.PI * 2); c.stroke();
        }
        c.strokeStyle = "rgba(168,138,104,0.5)"; c.lineWidth = 1.4; // 下缘亮反光
        c.beginPath(); c.ellipse(x0 + 3, y0 + 9, 13, 6, 0.25, Math.PI * 0.15, Math.PI * 0.85); c.stroke();
      }
      return { map: texOf(c.canvas), repeat: [2, 1] };
    },
    // tex04 设备塑料：细磨砂
    tex04() {
      const c = cnv(256, 256).getContext("2d");
      c.fillStyle = "#9aa5b1"; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2400; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "40,46,54"},${(Math.random() * 0.05).toFixed(3)})`; c.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4); }
      scratches(c, 256, 256, 26, "70,78,88");
      return { map: texOf(c.canvas) };
    },
    // tex05 缆皮：环向细纹
    tex05() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#3c434d"; c.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 5) { c.fillStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.1})`; c.fillRect(x, 0, 1.6, 128); }
      return { map: texOf(c.canvas), repeat: [6, 1] };
    },
    // tex06 插头金属：拉丝
    tex06() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#c9ced6"; c.fillRect(0, 0, 128, 128);
      for (let y = 0; y < 128; y += 2) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; c.fillRect(0, y, 128, 1); }
      return { map: texOf(c.canvas) };
    },
    // tex07 地板环氧：基色+网格线 1.2wu+灯池亮斑（ 世界 56×28 wu 贴图）
    tex07(worldW, worldD) {
      const px = 1024, py = 512, c = cnv(px, py).getContext("2d");
      c.fillStyle = "#1a212b"; c.fillRect(0, 0, px, py);
      const step = 1.2 / worldW * px; // 网格 1.2 wu
      c.strokeStyle = "#2a3646"; c.lineWidth = 1;
      for (let x = 0; x <= px; x += step) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, py); c.stroke(); }
      const stepY = 1.2 / worldD * py;
      for (let y = 0; y <= py; y += stepY) { c.beginPath(); c.moveTo(0, y); c.lineTo(px, y); c.stroke(); }
      // 三处灯池亮斑（机柜顶/吊灯/设备射灯投影——UV 圆域）
      const pools = [[0.48, 0.42, 0.09], [0.2, 0.42, 0.08], [0.78, 0.4, 0.07]];
      for (const [u, v, r] of pools) {
        const g = c.createRadialGradient(u * px, v * py, 2, u * px, v * py, r * px);
        g.addColorStop(0, "rgba(196,208,224,0.17)");
        g.addColorStop(0.6, "rgba(160,170,184,0.07)");
        g.addColorStop(1, "rgba(160,170,184,0)");
        c.fillStyle = g; c.fillRect(u * px - r * px, v * py - r * px, r * px * 2, r * px * 2);
      }
      noiseSpots(c, px, py, 220, "10,14,20", "150,158,170");
      return { map: texOf(c.canvas) };
    },
    // tex08 卡纸面：纤维噪点
    tex08() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#232e3e"; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(255,255,255,${(Math.random() * 0.04).toFixed(3)})`; c.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
      return { map: texOf(c.canvas) };
    },
    // tex09 旋钮铝：滚花直纹
    tex09() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#a6b0bc"; c.fillRect(0, 0, 128, 128);
      for (let x = 0; x < 128; x += 4) {
        c.fillStyle = "rgba(30,36,44,0.28)"; c.fillRect(x, 0, 1.6, 128);
        c.fillStyle = "rgba(255,255,255,0.22)"; c.fillRect(x + 2, 0, 1, 128);
      }
      const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,0.14)"); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      return { map: texOf(c.canvas) };
    },
    // tex10 格架塑料（S2 未给 PBR——程序化缺省）：编号丝印 0..7 由构件层用小屏实现，这里给底色微磨损
    tex10() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#2a3340"; c.fillRect(0, 0, 128, 128);
      noiseSpots(c, 128, 128, 40, "12,16,22", "150,160,172");
      return { map: texOf(c.canvas) };
    },
    // tex11 灯罩
    tex11() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#d8dce2"; c.fillRect(0, 0, 128, 128);
      noiseSpots(c, 128, 128, 30, "120,126,134", "255,255,255");
      return { map: texOf(c.canvas) };
    },
    // tex12 屏面玻璃（S2 未给 PBR——程序化缺省）：抗反射微纹理
    tex12() {
      const c = cnv(128, 128).getContext("2d");
      c.fillStyle = "#0d1319"; c.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 700; i++) { c.fillStyle = `rgba(160,190,230,${(Math.random() * 0.035).toFixed(3)})`; c.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
      return { map: texOf(c.canvas) };
    },
  };
  const texCache = {};
  function progTex(id, args) {
    const key = id + (args ? JSON.stringify(args) : "");
    if (!texCache[key]) texCache[key] = texFactory[id] ? texFactory[id].apply(null, args || []) : null;
    return texCache[key];
  }

  const progMats = {};
  function mat(id) {
    if (progMats[id]) return progMats[id];
    let m;
    const flat = flatMap[id];
    if (flat) {
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(flat), roughness: 0.55, metalness: 0.2 });
      m.userData.flat = flat;
    } else {
      const p = pbrMap[id];
      if (!p) throw new Error("材质缺失: " + id);
      const base = p.basecolor == null ? "#2a3340" : (Array.isArray(p.basecolor) ? midHex(p.basecolor) : p.basecolor);
      const metal = p.metalness == null ? (id === "mScreenGlass" ? 0.1 : 0.05) : p.metalness;
      const rough = p.roughness == null ? (id === "mScreenGlass" ? 0.16 : 0.45) : (p.roughness[0] + p.roughness[1]) / 2;
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(base), metalness: metal, roughness: rough });
      if (p.emissive) { m.emissive = new THREE.Color(base); m.emissiveIntensity = 0.22; }
      // S6 回灌优先；数据缺席时回落程序化占位（保底语义不变）
      if (!(TEXDATA && TEXDATA.textures[p.textureRequest] && applyTexData(m, p.textureRequest))) {
        const t = progTex(p.textureRequest);
        if (t) { m.map = t.map; if (t.repeat) { m.map.repeat.set(t.repeat[0], t.repeat[1]); } }
      }
      m.userData.texRequest = p.textureRequest; // S6 注入口：回灌时替换 map/roughnessMap
    }
    progMats[id] = m;
    return m;
  }

  // ---------- timeline 参数表（meta.speedModel k 贯通） ----------
  const paramMap = {};
  for (const p of D.timeline.params) paramMap[p.id] = p;
  let k = D.meta.speedModel.kDefault; // 当前速度档
  let holdSet = D.panel.controls.holdSlider.default;
  function setK(v) { if (!D.meta.speedModel.k.includes(v)) throw new Error("非法速度档 " + v); k = v; }
  function setHoldSet(v) { holdSet = Math.min(D.panel.controls.holdSlider.max, Math.max(D.panel.controls.holdSlider.min, v)); }
  // 时长参数：/k → base/k；HOLD → max(1.2, HOLD_SET/k)；IRQ_FLASH 字符串档特判（S3-评分⑤ 备注的消费注意项）
  function dur(id) {
    const p = paramMap[id];
    if (!p) throw new Error("参数缺失: " + id);
    if (id === "HOLD") return Math.max(1.2, holdSet / k);
    if (id === "IRQ_FLASH") return p.base / k; // 0.25s×3 次/事件——单闪时长 /k，次数固定 3
    return p.base / k;
  }
  function base(id) { const p = paramMap[id]; if (!p) throw new Error("参数缺失: " + id); return p.base; }
  // 速率参数（×k）：WAVE_SPEED
  function rate(id) { const p = paramMap[id]; if (!p) throw new Error("参数缺失: " + id); return p.base * k; }
  const uiFixed = D.meta.speedModel.uiFixed;
  const labWaitCap = D.meta.speedModel.labWaitCap;

  // ---------- 机位表 + camAdapt（meta.camAdapt） ----------
  const camMap = {};
  for (const c of D.cameras.list) camMap[c.id] = c;
  function cam(id) {
    const c = camMap[id];
    if (!c) throw new Error("机位缺失: " + id);
    return { pos: c.pos.slice(), tgt: c.tgt.slice(), adapt: c.adapt, raw: c };
  }
  function camAdapted(id, widthPx) {
    const c = cam(id);
    if ((widthPx || window.innerWidth) > D.meta.render.narrowBreakpointPx) return c;
    const p = new THREE.Vector3(c.pos[0], c.pos[1], c.pos[2]);
    const t = new THREE.Vector3(c.tgt[0], c.tgt[1], c.tgt[2]);
    const d = p.distanceTo(t);
    if (d < 10) return c;
    if (d >= 30) { // 全景类（meta.camAdapt.panorama）
      const kk = Math.max(1.5, 68 / d);
      const shift = D.meta.camAdapt.panorama.targetWestShift;
      const t2 = t.clone(); t2.x -= shift;
      const p2 = t2.clone().addScaledVector(p.clone().sub(t), kk);
      return { pos: [p2.x, p2.y, p2.z], tgt: [t2.x, t2.y, t2.z], adapt: c.adapt, raw: c };
    }
    const kk = 1.16; // 近景类
    const p2 = t.clone().addScaledVector(p.clone().sub(t), kk);
    return { pos: [p2.x, p2.y, p2.z], tgt: c.tgt.slice(), adapt: c.adapt, raw: c };
  }

  // ---------- 标签表 ----------
  const labelBarColors = ref("derived:d28"); // {zone,part,anchor}
  const labels = D.sceneGraph.labels;
  const compactLabels = D.panel.narrow.compactLabelVisible;

  // ---------- 环几何 ----------
  const ringCommon = D.rings.common;
  function slotPos(i, y) {
    const a = (Math.PI / 180) * 30 * i;
    return [ringCommon.center[0] + ringCommon.radius * Math.cos(a), y, -ringCommon.radius * Math.sin(a)];
  }
  function linkArcApex(y) {
    const a = (Math.PI / 180) * 15;
    return [ringCommon.center[0] + 5.5 * Math.cos(a), y + 0.9, -5.5 * Math.sin(a)];
  }

  const R = {
    D, ref, deep, entityGeo, mat, midHex, hex2rgb, texOf, cnv, MONO, applyTexData, TEXDATA,
    paramMap, base, dur, rate, get k() { return k; }, setK, setHoldSet, get holdSet() { return holdSet; },
    uiFixed, labWaitCap,
    cam, camAdapted, camMap, labels, labelBarColors, compactLabels,
    ringCommon, slotPos, linkArcApex, flatMap,
  };
  return R;
})();
