// label_overlap.mjs —— 3D 标签不叠探针（设计档 §7 门特化；V2：13 机位 + 三环专属机位）
// 对全景 + 12 工段机位 + 三环机位逐台取 HTML overlay 标签 bbox，两两求交；overlap>0.15 报清单。
// 用法：node dev/label_overlap.mjs [宽度] [高度]（默认 1440x900）
import { spawn } from "node:child_process";

const W = process.argv[2] || "1440";
const H = process.argv[3] || "900";
const HERE = new URL("..", import.meta.url).pathname;
const page = HERE + "index.html";
const DRIVE = "/Users/jason/.zcode/skills/anatomy/scripts/drive.mjs";

const RINGS_CAM = { pos: [2.0, 16.5, 13.5], tgt: [1.6, 11.8, 0] };
const CAMS = [["overview", null], ...Array.from({ length: 12 }, (_, i) => [`f${String(i).padStart(2, "0")}`, i]), ["rings", 0, RINGS_CAM]];
const js = `(async () => {
  const CAMS = ${JSON.stringify(CAMS)};
  const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const out = [];
  for (const [name, idx, cam] of CAMS) {
    if (idx === null) window.__x43.flyTo(0);
    else {
      window.__x43.goto(idx, { instant: true });
      if (cam) window.__x43.setCam(cam.pos, cam.tgt);
    }
    await frame(); // 等标签投影跟随场景状态（V2：设备侧标签随滑入显隐）
    const rects = window.__x43.labelRects();
    const bad = [];
    for (let a = 0; a < rects.length; a++) for (let b = a + 1; b < rects.length; b++) {
      const A = rects[a], B = rects[b];
      const ix = Math.max(0, Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x));
      const iy = Math.max(0, Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y));
      const inter = ix * iy;
      if (!inter) continue;
      const ratio = inter / Math.min(A.w * A.h, B.w * B.h);
      if (ratio > 0.15) bad.push(A.id + "×" + B.id + "=" + ratio.toFixed(2));
    }
    out.push(name + ": " + (bad.length ? "OVERLAP " + bad.join(" ") : "ok") + " [" + rects.length + " labels]");
  }
  return out.join("\\n");
})()`;

const child = spawn(process.execPath, [DRIVE, page, JSON.stringify([["wait", 2200], ["eval", js]]) , "--width", W, "--height", H], { stdio: ["inherit", "pipe", "inherit"] });
let out = "";
child.stdout.on("data", (d) => { out += d.toString(); });
child.on("exit", (c) => {
  const body = out.replace(/^eval: "/m, "").replace(/"$/m, "").replace(/\\n/g, "\n");
  console.log(body);
  const bad = body.split("\n").filter((l) => l.includes("OVERLAP"));
  console.log(bad.length ? `LABELPROBE-FAIL (${bad.length} cameras)` : "LABELPROBE-PASS");
  process.exit(bad.length ? 1 : 0);
});
