// lamp_plate_probe.mjs —— S5 单点调优探针（一次性，留 dev/）：灯排首灯球 vs 灯排牌注 屏幕间隙测量
// 用途：复评残留「F4/F7/F10 灯排牌头 Enabled 被首灯球裁」——量化 4 机位的屏幕间距并对牌注 dy 上移扫描，
//       供选定位移后再用 label_probe + 目验收口。用法：node dev/lamp_plate_probe.mjs
import { resolvePaths, loadDSL, runDrive } from "../pipeline/tools/lib.mjs";

const opts = { width: "1440", height: "900" };
const { page, drive } = resolvePaths(opts);

const js = `(async () => {
  const CAMS = ["F3", "F4", "F7", "F10"];
  const camToStage = { F3: 3, F4: 4, F7: 7, F10: 10 };
  const camera = window.__x43.camera();
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const V = (x, y, z) => new (Object.getPrototypeOf(camera.position).constructor)(x, y, z);
  const proj = (v) => { const q = v.project(camera); return [(q.x * 0.5 + 0.5) * window.innerWidth, (-q.y * 0.5 + 0.5) * window.innerHeight, q.z]; };
  const out = [];
  for (const camId of CAMS) {
    window.__x43.goto(camToStage[camId], { instant: true });
    await frame();
    const w = window.innerWidth, h = window.innerHeight;
    // 灯排牌注（lampPlate）：按 scene.js 定位参数重建世界矩形（4.6×0.28 中心 (0, d5.y-0.66+dy, 2.74)）
    // 首灯球：d05 centersX[0]=-2.08, y=8.4, z=2.4, r=0.3（DSL derived:d05）
    const ballC = V(-2.08, 8.4, 2.4);
    const [bx, by] = proj(ballC.clone());
    const bd = ballC.clone().applyMatrix4(camera.matrixWorldInverse).z; // 视深（负）
    const pxPerWu = (h / 2) / (Math.tan((camera.fov * Math.PI) / 360) * -bd);
    const brPx = 0.3 * pxPerWu;
    const rows = [];
    for (let dy = -0.20; dy <= 0.601; dy += 0.05) {
      const cy = 8.4 - 0.66 + dy;
      const corners = [[-2.3, cy - 0.14, 2.74], [2.3, cy - 0.14, 2.74], [2.3, cy + 0.14, 2.74], [-2.3, cy + 0.14, 2.74]];
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, behind = false;
      for (const c of corners) {
        const [sx, sy, zz] = proj(V(c[0], c[1], c[2]));
        if (zz > 1 || zz < -1) behind = true;
        minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
      }
      if (behind) { rows.push("dy=" + dy.toFixed(2) + " BEHIND"); continue; }
      // 间隙（屏幕 y 向下）：plate 顶 minY 应在球底 (by+brPx) 之下为正间隙
      const gap = Math.round(minY - (by + brPx));
      // x 向交叠（球心 x±r vs 牌 x 范围）
      const xOverlap = (bx + brPx > minX && bx - brPx < maxX) ? Math.round(Math.min(bx + brPx, maxX) - Math.max(bx - brPx, minX)) : 0;
      // 与格架牌（dcbaa plate 2.6×0.3 中心 (-2.9,7.5,2.66)）屏幕交叠（3D 牌×3D 牌）
      const dcorners = [[-4.2, 7.35, 2.66], [-1.6, 7.35, 2.66], [-1.6, 7.65, 2.66], [-4.2, 7.65, 2.66]];
      let dminX = 1e9, dminY = 1e9, dmaxX = -1e9, dmaxY = -1e9;
      for (const c of dcorners) {
        const [sx, sy] = proj(V(c[0], c[1], c[2]));
        dminX = Math.min(dminX, sx); dmaxX = Math.max(dmaxX, sx); dminY = Math.min(dminY, sy); dmaxY = Math.max(dmaxY, sy);
      }
      const ix = Math.max(0, Math.min(maxX, dmaxX) - Math.max(minX, dminX));
      const iy = Math.max(0, Math.min(maxY, dmaxY) - Math.max(minY, dminY));
      const inter = ix * iy;
      const ov = inter ? (inter / Math.min((maxX - minX) * (maxY - minY), (dmaxX - dminX) * (dmaxY - dminY))) : 0;
      rows.push("dy=" + dy.toFixed(2) + " gapPx=" + gap + " xOv=" + xOverlap + " gridOv=" + ov.toFixed(2));
    }
    out.push("== " + camId + " ballScreen=(" + Math.round(bx) + "," + Math.round(by) + ") r=" + Math.round(brPx) + "px\\n  " + rows.join("\\n  "));
  }
  return out.join("\\n");
})()`;

const { code, out } = await runDrive(drive, page, [["wait", 3000], ["eval", js]], { width: 1440, height: 900 });
process.stdout.write(out);
const body = out.replace(/^eval: "/m, "").replace(/"$/m, "").replace(/\\n/g, "\n");
console.log(body);
process.exit(code === 0 ? 0 : 1);
