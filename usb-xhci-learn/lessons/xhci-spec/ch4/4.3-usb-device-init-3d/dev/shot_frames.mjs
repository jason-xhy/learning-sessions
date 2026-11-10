// shot_frames.mjs —— S5 迭代用目标帧抓拍（一次性，留 dev/）：指定机位/工段快速出图供目验，不替代 shots.mjs 门。
// 用法：node dev/shot_frames.mjs <前缀> <camId|stage:F3,...>
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { resolvePaths, loadDSL, runDrive } from "../pipeline/tools/lib.mjs";

const [P, list] = process.argv.slice(2);
const { page, drive, out } = resolvePaths({});
mkdirSync(out, { recursive: true });
const DSL = loadDSL(join(out, "..", "pipeline", "scene.dsl.json"));
const stageIdx = (id) => DSL.timeline.stages.findIndex((s) => s.id === id);

const actions = [["wait", 3200]];
for (const item of list.split(",")) {
  if (item.startsWith("stage:")) {
    const sid = item.slice(6);
    actions.push(["eval", `window.__x43.setPreset('fullspeed'); window.__x43.goto(${stageIdx(sid)}); 'play-${sid}'`]);
    actions.push(["wait", item === "stage:F3" ? 5600 : 6500]); // F3=四信号齐后中段；其余≈中段
  } else {
    const cam = DSL.cameras.list.find((c) => c.id === item);
    if (cam && cam.stage && stageIdx(String(cam.stage).replace("F", "")) >= 0 && /^F\d/.test(String(cam.stage))) {
      actions.push(["eval", `window.__x43.goto(${stageIdx(String(cam.stage).replace("F", ""))},{instant:true}); 'cam-${cam.id}'`]);
    } else {
      actions.push(["eval", `window.__x43.cam('${item}',{instant:true}); 'cam-${item}'`]);
    }
    actions.push(["wait", 300]);
  }
  actions.push(["shot", join(out, `${P}-${item.replace("stage:", "")}.png`)]);
}
const { code, out: outTxt } = await runDrive(drive, page, actions, { width: 1440, height: 900 });
const vc = outTxt.split("\n").filter((l) => l.includes("console.error") || l.includes("console.warning") || l.includes("exception:"));
console.log(vc.length ? "CONSOLE-DIRTY: " + vc.join(" ; ") : "CONSOLE-CLEAN");
process.exit(vc.length || code !== 0 ? 1 : 0);
