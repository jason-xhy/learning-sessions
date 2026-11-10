// label_probe.mjs —— 3D 标签不叠探针（V3：机位清单=DSL cameras 分区 + 邻居扩检=sceneGraph.labels[].neighbors）
// 用法：node pipeline/tools/label_probe.mjs [--width 1440] [--height 900] [--dsl …] [--page …] [--drive …]
// 判据（承 V2 + S2 §I.1 条 2 扩检立法）：
//   (a) 每机位可见标签 bbox 两两求交，overlap>0.15 = 0 对；
//   (b) 每标签对 DSL neighbors 解析到的几何 AABB（__x43.entityBoxes() 实测 Box3）投影屏幕求交 >0.15 报清单
//       （host 自身跳过——标签指向宿主属正常形态；无法解析为几何的 prose 邻居跳过并计数，工具输出 skipped 数）。
// 被消费分区：cameras.list（机位）、sceneGraph.labels（锚点/host/neighbors）、timeline.stages（机位↔工段映射）。
// 下游复用：S5 精修标签调位、S6 回灌后复检。
import { parseArgs, resolvePaths, loadDSL, runDrive } from "./lib.mjs";

const opts = parseArgs(process.argv, { width: "1440", height: "900" });
const { dslPath, page, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const W = Number(opts.width), H = Number(opts.height);

// 机位→工段映射（timeline.stages[].camera）
const camToStage = {};
DSL.timeline.stages.forEach((s, i) => { camToStage[s.camera] = i; });
const NEIGHBORS = DSL.sceneGraph.labels.map((l) => ({ id: l.id, host: l.host, neighbors: l.neighbors }));

const js = `(async () => {
  const CAMS = ${JSON.stringify(DSL.cameras.list.map((c) => c.id))};
  const camToStage = ${JSON.stringify(camToStage)};
  const NEIGHBORS = ${JSON.stringify(NEIGHBORS)};
  const camera = window.__x43.camera();
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = [];
  const labelOverlap = (A, B) => {
    const ix = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
    const iy = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
    const inter = ix * iy;
    if (!inter) return 0;
    return inter / Math.min(A.w * A.h, B.w * B.h);
  };
  let skippedTotal = 0;
  for (const camId of CAMS) {
    if (camToStage[camId] !== undefined) window.__x43.goto(camToStage[camId], { instant: true });
    else window.__x43.cam(camId, { instant: true });
    await frame();
    const w3 = window.innerWidth, h3 = window.innerHeight;
    const clip = (r) => {
      const x = Math.max(r.x, 0), y = Math.max(r.y, 0);
      const rr = Math.min(r.x + r.w, w3), bb = Math.min(r.y + r.h, h3);
      return rr > x && bb > y ? { ...r, x, y, w: rr - x, h: bb - y } : null; // 视口外不计数（保留 id 等字段）
    };
    const rectsRaw = window.__x43.labelRects();
    const rects = rectsRaw.map(clip).filter(Boolean);
    const bad = [];
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const r = labelOverlap(rects[a], rects[b]);
      if (r > 0.15) bad.push(rects[a].id + "×" + rects[b].id + "=" + r.toFixed(2));
    }
    // —— 3D 内牌注采集（评分点破盲区：HTML 探针看不到场景内 canvas 牌注）——
    const plates = [];
    window.__x43._scene.traverse((o) => {
      if (o.isMesh && o.userData && o.userData.plate3d && o.material && o.material.map) {
        o.updateWorldMatrix(true, false);
        const corners = [];
        let behind = false;
        const w2 = window.innerWidth, h2 = window.innerHeight;
        const hw = o.geometry.parameters.width / 2, hh = o.geometry.parameters.height / 2;
        const camInv = camera.matrixWorldInverse;
        for (const [lx, ly] of [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]) {
          const world = new (Object.getPrototypeOf(camera.position).constructor)(lx, ly, 0).applyMatrix4(o.matrixWorld);
          const view = world.clone().applyMatrix4(camInv);
          if (view.z > -1.0) { behind = true; break; } // 相机空间 -z 朝前：≥-1=背面/近面（1wu 内），跳过
          const v = world.project(camera);
          corners.push([(v.x * 0.5 + 0.5) * w2, (-v.y * 0.5 + 0.5) * h2]);
        }
        if (behind || !corners.length) return;
        const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
        const pw = Math.max(...xs) - Math.min(...xs), ph = Math.max(...ys) - Math.min(...ys);
        if (pw < 12 || ph < 8 || pw * ph < 220) return; // 掠射小面（近边缘视角几乎不可读）不计
        const clipped = clip({ x: Math.min(...xs), y: Math.min(...ys), w: pw, h: ph });
        if (clipped) plates.push({ text: o.userData.plate3d, ...clipped });
      }
    });
    // (c) 3D 牌注 vs HTML 标签（复用上方 labelOverlap）
    for (const pl of plates) for (const r of rects) {
      const r2 = labelOverlap(pl, r);
      if (r2 > 0.15) bad.push("3D牌[" + pl.text + "]×" + r.id + "=" + r2.toFixed(2));
    }
    // (d) 3D 牌注两两
    for (let a = 0; a < plates.length; a++) for (let b = a + 1; b < plates.length; b++) {
      const r2 = labelOverlap(plates[a], plates[b]);
      if (r2 > 0.15) bad.push("3D牌[" + plates[a].text + "]×3D牌[" + plates[b].text + "]=" + r2.toFixed(2));
    }
    // —— 邻居扩检（§I.1 条 2）：标签 rect vs 邻居几何 AABB 屏幕投影 ——
    const boxes = window.__x43.entityBoxes();
    const v = (x, y, z) => { const p = camera.projectionMatrix ? null : null; const q = new (Object.getPrototypeOf(camera.position).constructor)(x, y, z); q.project(camera); return q; };
    for (const L of NEIGHBORS) {
      const rect = rects.find((r) => r.id === "lb-" + L.id);
      if (!rect) continue;
      for (const nb of (L.neighbors || [])) {
        const key = String(nb).split(/[{\\s（]/)[0];
        const box = boxes[key];
        if (!box || key === L.host) { if (!box) skippedTotal++; continue; }
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        let behind = false;
        const w = window.innerWidth, h = window.innerHeight;
        for (const cx of [box.min.x, box.max.x]) for (const cy of [box.min.y, box.max.y]) for (const cz of [box.min.z, box.max.z]) {
          const q = v(cx, cy, cz);
          if (q.z > 1 || q.z < -1) behind = true;
          const sx = (q.x * 0.5 + 0.5) * w, sy = (-q.y * 0.5 + 0.5) * h;
          if (sx < minX) minX = sx; if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy; if (sy > maxY) maxY = sy;
        }
        if (behind || maxX < 0 || minX > w) continue;
        const r = labelOverlap(rect, { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) });
        if (r > 0.15) bad.push(L.id + "∋" + key + "=" + r.toFixed(2));
      }
    }
    out.push(camId + ": " + (bad.length ? "OVERLAP " + bad.join(" ") : "ok") + " [" + rects.length + " labels]");
  }
  return out.join("\\n") + "\\nNEIGHBOR-SKIPPED " + skippedTotal;
})()`;

const { code, out } = await runDrive(drive, page, [["wait", 3000], ["eval", js]], { width: W, height: H });
process.stdout.write(out);
const body = out.replace(/^eval: "/m, "").replace(/"$/m, "").replace(/\\n/g, "\n");
console.log(body);
const bad = body.split("\n").filter((l) => l.includes("OVERLAP"));
console.log(bad.length ? `LABELPROBE-FAIL (${bad.length} cameras)` : "LABELPROBE-PASS");
process.exit(bad.length || code !== 0 ? 1 : 0);
