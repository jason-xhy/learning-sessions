// build.mjs —— V3 4.3 3D 实验件单文件装配（DSL 驱动：pipeline/scene.dsl.json 注入为 X43_DSL）
// three.js vendored r160 内联变换：唯一 export{...} → const THREE={...}；src 六件拼接（engine/scene/stages/lab/panel/main）；
// 零外部 script/link/字体。node build.mjs 可重复构建（产物字节级一致，无时间戳）。
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = ["engine.js", "scene.js", "stages.js", "lab.js", "panel.js", "main.js"].map((f) => join(HERE, "src", f));
// S6 纹理数据件（生成件，在场时插引擎前定义 X43_TEXDATA；缺席=占位档回退，构建不依赖 Blender）
const TEXGEN = join(HERE, "src", "textures.gen.js");
let texgenBlock = null;
if (existsSync(TEXGEN)) {
  const tsrc = readFileSync(TEXGEN, "utf8");
  const t = tsrc.match(/const X43_TEXDATA\s*=/);
  if (!t) throw new Error("textures.gen.js 形态非法（缺 X43_TEXDATA 定义）");
  if (tsrc.includes("</script")) throw new Error("textures.gen.js 含 </script 字面量");
  texgenBlock = tsrc;
} else {
  console.log("note: src/textures.gen.js 缺席——占位档回退构建");
}
const VENDOR = join(HERE, "vendor", "three.module.min.js");
const DSL_PATH = join(HERE, "pipeline", "scene.dsl.json");

// ---------- DSL 数据件（场景唯一事实源，S4 只读不改） ----------
const dslRaw = readFileSync(DSL_PATH, "utf8");
const DSL = JSON.parse(dslRaw);

// ---------- 构建期 DSL 机检（结构计数 + 引用完整性） ----------
(function dslCheck() {
  const assert = (c, m) => { if (!c) throw new Error("DSL 机检 FAIL: " + m); };
  assert(DSL.sceneGraph.entities.length === 38, "实体数 38 实得 " + DSL.sceneGraph.entities.length);
  assert(DSL.cameras.list.length === 17, "机位数 17 实得 " + DSL.cameras.list.length);
  assert(DSL.timeline.stages.length === 12, "工段数 12 实得 " + DSL.timeline.stages.length);
  assert(DSL.timeline.params.length === 36, "参数行 36 实得 " + DSL.timeline.params.length);
  assert(DSL.sceneGraph.labels.length === 19, "标签数 19 实得 " + DSL.sceneGraph.labels.length);
  assert(DSL.rings.rings.length === 3, "环数 3 实得 " + DSL.rings.rings.length);
  assert(DSL.textureRequests.items.length === 12, "纹理卡 12 实得 " + DSL.textureRequests.items.length);
  assert(DSL.meta.derived.length === 34, "derived 34 实得 " + DSL.meta.derived.length);
  assert(DSL.materials.pbr.length === 12 && DSL.materials.flat.length === 36, "材质计数 pbr12/flat36");
  // 引用完整性：derived 引用可解析
  const derivedIds = new Set(DSL.meta.derived.map((d) => d.id));
  const REF_RE = /^derived:([A-Za-z0-9]+((?:\.[A-Za-z0-9_]+)+)?)/;
  const deep = (v, path) => {
    if (typeof v === "string") {
      if (v.startsWith("derived:")) {
        const m = v.match(REF_RE);
        const id = m ? m[1].split(".")[0] : v.slice(8);
        assert(m && derivedIds.has(id), path + " 引用缺失 derived:" + id);
      }
    } else if (Array.isArray(v)) v.forEach((x, i) => deep(x, path + "[" + i + "]"));
    else if (v && typeof v === "object") for (const k of Object.keys(v)) deep(v[k], path + "." + k);
  };
  deep(DSL, "$");
  // 引用边：材质/机位/参数/标签 host
  const matIds = new Set([...DSL.materials.pbr, ...DSL.materials.flat].map((m) => m.id));
  matIds.add("bandSw"); matIds.add("bandHc"); matIds.add("bandDev"); // 地板区带三色（flat 族暗档）
  for (const e of DSL.sceneGraph.entities) {
    if (typeof e.material === "string" && e.material.startsWith("derived:")) continue;
    if (e.material) assert(matIds.has(e.material), "实体 " + e.id + " 材质边缺失 " + e.material);
  }
  const camIds = new Set(DSL.cameras.list.map((c) => c.id));
  for (const s of DSL.timeline.stages) assert(camIds.has(s.camera), "工段 " + s.id + " 机位边缺失 " + s.camera);
  const paramIds = new Set(DSL.timeline.params.map((p) => p.id));
  for (const s of DSL.timeline.stages) for (const mv of s.moves || []) {
    for (const p of [].concat(mv.param || [], mv.params || [])) {
      if (typeof p === "string" && !p.startsWith("derived:")) assert(paramIds.has(p), "工段 " + s.id + " 参数边缺失 " + p);
    }
  }
  const entityIds = new Set(DSL.sceneGraph.entities.map((e) => e.id));
  const ringIds = new Set(DSL.rings.rings.map((r) => r.id));
  for (const l of DSL.sceneGraph.labels) {
    const ok = entityIds.has(l.host) || ringIds.has(l.host) || l.host === "cable" || l.host === "erdpFlags" || l.host === "dmaBeam" || l.host === "irqFlashLine";
    assert(ok, "标签 " + l.id + " host 边缺失 " + l.host);
  }
})();

// ---------- three.js 内联变换 ----------
const threeSrc = readFileSync(VENDOR, "utf8");
const exStart = threeSrc.indexOf("export{");
if (exStart < 0) throw new Error("three.module.min.js: export{ 未找到");
const exEnd = threeSrc.indexOf("}", exStart);
if (exEnd < 0) throw new Error("three.module.min.js: export 闭合缺失");
if (threeSrc.indexOf("export{", exStart + 1) >= 0) throw new Error("three.module.min.js: 存在多个 export 语句");
const body = threeSrc.slice(exStart + 7, exEnd);
const entries = body.split(",").map((e) => e.trim()).filter(Boolean);
const pairs = entries.map((e) => {
  const m = e.match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
  if (!m) throw new Error(`export 条目不可解析: ${e}`);
  return [m[2] || m[1], m[1]]; // [导出名, 内部名]
});
const names = new Set(pairs.map((p) => p[0]));
const REQUIRED = [
  "Scene", "PerspectiveCamera", "WebGLRenderer", "MeshStandardMaterial", "MeshBasicMaterial",
  "CanvasTexture", "SRGBColorSpace", "BoxGeometry", "CylinderGeometry", "SphereGeometry",
  "PlaneGeometry", "TorusGeometry", "TubeGeometry", "Mesh", "Group",
  "AmbientLight", "HemisphereLight", "DirectionalLight", "PointLight", "Vector3", "Color",
  "Fog", "GridHelper", "Clock", "Spherical", "PCFSoftShadowMap", "ACESFilmicToneMapping",
  "CatmullRomCurve3", "ConeGeometry", "RepeatWrapping", "REVISION", "Box3", "Raycaster",
  "FogExp2", "CurvePath", "LineCurve3",
];
const missing = REQUIRED.filter((n) => !names.has(n));
if (missing.length) throw new Error(`THREE 导出缺关键符号: ${missing.join(",")}`);
const threeMapped = `${threeSrc.slice(0, exStart)}const THREE={${pairs.map(([ex, inn]) => `${ex}:${inn}`).join(",")}};${threeSrc.slice(exEnd + 1)}`;

// ---------- src 拼接（DSL 注入在最前；textures.gen.js 次之（引擎前定义 X43_TEXDATA）） ----------
const dslBlock = "/* ===== scene.dsl.json（S3 数据件内联，构建期机检已过） ===== */\nconst X43_DSL = " + JSON.stringify(DSL) + ";\n";
const parts = [threeMapped, dslBlock];
if (texgenBlock) parts.push("\n/* ===== textures.gen.js（S6 生成件：X43_TEXDATA） ===== */\n" + texgenBlock);
for (const f of SRC) parts.push(`\n/* ===== ${f.split("/").pop()} ===== */\n` + readFileSync(f, "utf8"));
const js = parts.join("\n");
if (js.includes("</script")) throw new Error("JS 内含 </script 字面量，装配会截断");
// 语法自检（仅解析不执行）
const tmp = mkdtempSync(join(tmpdir(), "x43build-"));
const tmpFile = join(tmp, "bundle.mjs");
writeFileSync(tmpFile, js);
try {
  execFileSync(process.execPath, ["--check", tmpFile], { stdio: "pipe" });
} catch (e) {
  rmSync(tmp, { recursive: true, force: true });
  throw new Error("拼接 JS 语法检查失败: " + e.stderr);
}
rmSync(tmp, { recursive: true, force: true });

// ---------- CSS ----------
const css = readFileSync(join(HERE, "src", "style.css"), "utf8");

// ---------- 模板装配 ----------
const html = [
  '<!doctype html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>§4.3 USB 设备初始化 · 3D 交互课件 · xHCI 规范对照学习</title>',
  '<style>', css, '</style>',
  '</head>',
  '<body>',
  '<div id="x43Stage" role="application" aria-label="xHC 启机车间三维场景：左区 xHCI 驱动文书台，中区 xHC 总控台剖视机柜，右区 USB 设备试验盒。拖动旋转，滚轮缩放，右键平移。"></div>',
  '<header id="x43Head">',
  '<p class="eyebrow">xHCI 规范对照学习 · §4.3</p>',
  '<h1>USB 设备初始化 · xHC 启机车间</h1>',
  '<p class="sub">一台全速（FS）设备插入 USB2 根端口 1，从插入到配置完工的登记全程——三方一台：驱动发令、xHC 执行、设备只见 USB 请求。</p>',
  '<p class="specref">xHCI 1.2b §4.3 USB Device Initialization · p71–80</p>',
  '<button id="x43Fs" title="全屏（课堂投屏大光标）">⛶ 全屏</button>',
  '</header>',
  '<div id="x43PanelHost"></div>',
  '<div id="x43BarHost"></div>',
  '<div id="x43Loading"><div class="x43-loadcard"><strong>正在布置 xHC 启机车间</strong><span id="x43LoadMsg">…</span></div></div>',
  '<script type="module">', js, '</script>',
  '</body>',
  '</html>',
].join("\n");

const OUT = join(HERE, "index.html");
writeFileSync(OUT, html);
const sha = createHash("sha256").update(html).digest("hex");
console.log(`wrote index.html ${(html.length / 1024).toFixed(0)} KB · DSL ${dslRaw.length} B · THREE exports ${pairs.length} · sha256 ${sha.slice(0, 16)}…`);
