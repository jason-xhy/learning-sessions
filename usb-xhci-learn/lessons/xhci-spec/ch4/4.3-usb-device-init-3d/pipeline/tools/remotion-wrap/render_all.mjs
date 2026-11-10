// render_all.mjs —— S7 渲染器：bundle → 逐 composition renderMedia → media/ + 体积账
// 用法：node render_all.mjs [--crf 26] [--only S07-F00,…] [--smoke] [--concurrency 默认]
//   --smoke  只渲 S07-intro 的前 24 帧（1s）——M0 工具链冒烟
// 依赖：Remotion 自带 ffmpeg/compositor（无系统 ffmpeg 依赖）；帧序列 publicDir=../frames（s7_record.mjs 产出）
// 被消费分区：stages.json（工段表=录制 manifest 生成）、subtitles.json（字幕表）、sizes.json（HTML 入口大小标注回填源）
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "../lib.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const opts = parseArgs(process.argv, { crf: "26", only: "", out: "" });
const LESSON = resolve(HERE, "..", "..", "..");
const MEDIA = opts.out ? resolve(opts.out) : join(LESSON, "media");
const FRAMES = join(HERE, "frames");
const CRF = Number(opts.crf);

mkdirSync(MEDIA, { recursive: true });

const bundleSite = await bundle({
  entryPoint: join(HERE, "src", "index.js"),
  publicDir: FRAMES,
  onProgress: () => {},
});

const ALL = ["S07-intro", ...JSON.parse(readFileSync(join(HERE, "stages.json"), "utf8")).map((s) => "S07-" + s.id), "S07-outro"];
const ONLY = opts.only ? String(opts.only).split(",").map((s) => s.trim()) : ALL;
const ids = ALL.filter((id) => ONLY.includes(id) || ONLY.includes(id.replace("S07-", "")));
if (!ids.length) {
  console.error("no composition matched --only=" + opts.only + " (known: " + ALL.join(",") + ")");
  process.exit(2);
}

const rows = [];
for (const id of ids) {
  const comp = await selectComposition({ serveUrl: bundleSite, id });
  const outFile = join(MEDIA, id + ".mp4");
  const t0 = Date.now();
  await renderMedia({
    composition: comp,
    serveUrl: bundleSite,
    codec: "h264",
    outputLocation: outFile,
    inputProps: {},
    crf: CRF,
    x264Preset: "medium",
    frameRange: opts.smoke ? [0, 23] : undefined,
    onProgress: () => {},
  });
  const bytes = statSync(outFile).size;
  const dur = comp.durationInFrames / comp.fps;
  rows.push({ id, frames: comp.durationInFrames, fps: comp.fps, seconds: dur, bytes, crf: CRF, renderMs: Date.now() - t0 });
  console.log(`RENDER ${id} ${comp.width}x${comp.height} ${dur.toFixed(1)}s ${(bytes / 1024 / 1024).toFixed(2)}MB crf=${CRF} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

const totalBytes = rows.reduce((a, r) => a + r.bytes, 0);
const totalSec = rows.reduce((a, r) => a + r.seconds, 0);
console.log(`SIZE total=${(totalBytes / 1024 / 1024).toFixed(2)}MB segments=${rows.length} durSum=${totalSec.toFixed(1)}s avgBitrate=${((totalBytes * 8) / totalSec / 1e6).toFixed(2)}Mbps`);
const verdict = totalBytes <= 30 * 1024 * 1024 ? "SIZE-PASS(≤30MB)" : "SIZE-OVER(>30MB)";
console.log(onlyAll(rows) ? `RENDER-ALL ${verdict}` : `RENDER-PARTIAL ${verdict}`);

function onlyAll(rs) {
  return rs.length === ALL.length;
}
// 体积账落盘（HTML 入口回填 sizes.json 用）——与既有 sizes.json 合并（--only 部分渲染不丢段），__totalMB 按全表重算
let sizes = {};
const sizesPath = join(HERE, "sizes.json");
try { sizes = JSON.parse(readFileSync(sizesPath, "utf8")); } catch {}
for (const r of rows) {
  sizes[r.id.replace("S07-", "")] = { mb: Number((r.bytes / 1024 / 1024).toFixed(1)), kb: Math.round(r.bytes / 1024), seconds: Number(r.seconds.toFixed(1)) };
}
const allKb = Object.entries(sizes).filter(([k]) => k !== "__totalMB").reduce((a, [, v]) => a + (v.kb || 0), 0);
sizes.__totalMB = Number((allKb / 1024).toFixed(1));
writeFileSync(sizesPath, JSON.stringify(sizes, null, 1) + "\n");
console.log("sha " + createHash("sha256").update(String(totalBytes)).digest("hex").slice(0, 8));
