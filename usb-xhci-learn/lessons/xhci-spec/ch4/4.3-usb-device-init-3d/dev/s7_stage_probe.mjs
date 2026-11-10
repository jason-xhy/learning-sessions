// s7_stage_probe.mjs —— S7 一次性探针：逐工段 tend（末步基准时刻）+ say 步时刻表 + 完整工段元数据
// 产出 remotion-wrap/stages.json（录制/合成两用）+ dev/s7_stage_probe.json（say 时刻→字幕锚）
// 用法：node dev/s7_stage_probe.mjs [--dsl …] [--page …] [--drive …] [--out stages.json路径]
import { writeFileSync } from "node:fs";
import { parseArgs, resolvePaths, loadDSL, runDrive } from "../pipeline/tools/lib.mjs";

const opts = parseArgs(process.argv, { out: "" });
const { page, dslPath, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);

const actions = [["wait", 3400], ["eval", "window.__x43 ? 'api-ok dsl=' + window.__x43.dslVersion : 'NO-API'"]];
for (let i = 0; i < DSL.timeline.stages.length; i++) {
  actions.push(["eval", `window.__x43.goto(${i},{instant:true}); 'g${i}'`]);
  actions.push(["eval", `JSON.stringify((() => { const ss = window.__x43.stageSteps(${i}); return { i:${i}, tend: ss[ss.length-1][0], n: ss.length, says: ss.map((s,si)=>[si,s[0],s[1]]).filter(x=>x[2]==='say').map(x=>x[1]), fns: ss.map(x=>x[1]) }; })())`]);
}
const { code, out } = await runDrive(drive, page, actions, { width: 1440, height: 900 });
process.stdout.write(out.split("\n").filter((l) => l.includes("console.error") || l.includes("exception:")).join("\n") + "\n");
if (code !== 0) { console.error("PROBE drive exit " + code); process.exit(1); }

const stages = [];
const evalLines = out.split("\n").filter((l) => l.startsWith('eval: "{'));
const byIdx = new Map();
for (const line of evalLines) {
  try {
    const p = JSON.parse(JSON.parse(line.slice(6)));
    if (typeof p.i === "number") byIdx.set(p.i, p);
  } catch {}
}
for (let i = 0; i < DSL.timeline.stages.length; i++) {
  const p = byIdx.get(i);
  if (!p) { console.error("PROBE missing stage " + i + " (eval lines=" + evalLines.length + ")"); process.exit(1); }
  const st = DSL.timeline.stages[i];
  stages.push({ id: st.id, title: st.title, page: st.page || null, camera: st.camera, tend: p.tend, nSteps: p.n, says: p.says });
}
// 页码锚：F0 无页码（DSL page=null）→ 章节卡显示 §4.3 总锚
const payload = stages.map((s) => ({ id: s.id, title: s.title, page: s.page, camera: s.camera, seconds: Math.max(s.tend, 1.2), tend: s.tend, says: s.says }));
const outPath = opts.out || "pipeline/tools/remotion-wrap/stages.json";
writeFileSync(outPath, JSON.stringify(payload, null, 1) + "\n");
writeFileSync("dev/s7_stage_probe.json", JSON.stringify(stages, null, 1) + "\n");
for (const s of payload) console.log(`${s.id} tend=${s.tend}s says=[${s.says.join(",")}] title=${s.title}`);
console.log("PROBE-OK stages=" + payload.length + " -> " + outPath);
