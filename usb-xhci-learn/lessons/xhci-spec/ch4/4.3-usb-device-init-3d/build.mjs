// build.mjs —— 4.3 3D 实验件单文件装配（设计档 §6）
// three.js vendored r160 内联变换：唯一 export{...} → const THREE={...}；src 五件拼接；
// 零外部 script/link/字体。node build.mjs 可重复构建（产物字节级一致，无时间戳）。
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = ["stages.js", "scene.js", "panel.js", "main.js"].map((f) => join(HERE, "src", f));
const VENDOR = join(HERE, "vendor", "three.module.min.js");

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
  "PlaneGeometry", "TorusGeometry", "TubeGeometry", "Mesh", "Group", "MeshStandardMaterial",
  "AmbientLight", "HemisphereLight", "DirectionalLight", "PointLight", "Vector3", "Color",
  "Fog", "GridHelper", "Clock", "Spherical", "PCFSoftShadowMap", "ACESFilmicToneMapping",
  "CatmullRomCurve3", "REVISION",
];
const missing = REQUIRED.filter((n) => !names.has(n));
if (missing.length) throw new Error(`THREE 导出缺关键符号: ${missing.join(",")}`);
const threeMapped = `${threeSrc.slice(0, exStart)}const THREE={${pairs.map(([ex, inn]) => `${ex}:${inn}`).join(",")}};${threeSrc.slice(exEnd + 1)}`;

// ---------- src 拼接 ----------
const parts = [threeMapped];
for (const f of SRC) parts.push(`\n/* ===== ${f.split("/").pop()} ===== */\n` + readFileSync(f, "utf8"));
const js = parts.join("\n");
if (js.includes("</script")) throw new Error("JS 内含 </script 字面量，装配会截断");
// 语法自检（仅解析不执行）
const { writeFileSync: wtmp, mkdtempSync, rmSync } = await import("node:fs");
const { tmpdir } = await import("node:os");
const tmp = mkdtempSync(join(tmpdir(), "x43build-"));
const tmpFile = join(tmp, "bundle.mjs");
wtmp(tmpFile, js);
const { execFileSync } = await import("node:child_process");
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
console.log(`wrote index.html ${(html.length / 1024).toFixed(0)} KB · THREE exports ${pairs.length} · sha256 ${sha.slice(0, 16)}…`);
