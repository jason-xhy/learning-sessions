// shots.mjs —— V3 全套截图门（DSL cameras 分区驱动机位清单）
// 用法：node pipeline/tools/shots.mjs [--prefix v3g] [--width 1440] [--height 900] [--dsl …] [--page …] [--out …] [--drive …]
// 产出：out/<prefix>-cam-<机位id>.png ×|cameras.list|（17 预置）+ 互动三关 + 试错 + quiz 槽位 + 390px×2 + F0 右缘裁剪人验图。
// 被消费分区：cameras（机位清单/pos/tgt）、timeline.stages（工段序）、panel.tabs（quiz 槽位）、cameras.f0Check（裁剪协议）。
// 下游复用：S5 精修复拍、S6 纹理回灌复拍、S7 取分镜帧。
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { parseArgs, resolvePaths, loadDSL, runDrive, consoleVerdict } from "./lib.mjs";

const opts = parseArgs(process.argv, { prefix: "v3g", width: "1440", height: "900" });
const { dslPath, page, out, drive } = resolvePaths(opts);
const DSL = loadDSL(dslPath);
const P = String(opts.prefix);
mkdirSync(out, { recursive: true });

const W = Number(opts.width), H = Number(opts.height);
const stageIdx = (id) => DSL.timeline.stages.findIndex((s) => s.id === id);
const shot = (file, sel = "body", scale = 1) => ["shot", join(out, file), sel, scale];
const camShot = (id) => shot(`${P}-cam-${id}.png`);

// 两阶段：先探面板左缘（canvas 视区右界），供 F0 右缘裁剪 region shot 用
const vrProbe = await runDrive(drive, page, [["wait", 3000], ["eval", `(() => { const p = document.querySelector('.x43-panel').getBoundingClientRect(); return JSON.stringify({vr: Math.round(p.left - 8)}); })()`]], { width: W, height: H });
let VR = 1016;
try {
  const vm = vrProbe.out.split("\n").find((l) => l.startsWith('eval: "{"'));
  VR = JSON.parse(JSON.parse(vm.slice(6))).vr || 1016;
} catch {}
const cropW = Math.max(200, Math.round(VR / 3));

const actions = [
  ["wait", 3200],
  ["eval", "window.__x43 ? 'api-ok dsl=' + window.__x43.dslVersion : 'NO-API'"],
];
// —— 17 预置机位（cameras.list 全量；stage 类先 goto instant 落状态再就位机位） ——
for (const cam of DSL.cameras.list) {
  if (cam.stage && /^\d|^F\d/.test(String(cam.stage)) && stageIdx(String(cam.stage).replace("F", "")) >= 0) {
    const i = stageIdx(String(cam.stage));
    actions.push(["eval", `window.__x43.goto(${i},{instant:true}); 'cam-${cam.id}'`]);
  } else if (DSL.timeline.stages.some((s) => s.camera === cam.id)) {
    const i = DSL.timeline.stages.findIndex((s) => s.camera === cam.id);
    actions.push(["eval", `window.__x43.goto(${i},{instant:true}); 'cam-${cam.id}'`]);
  } else {
    actions.push(["eval", `window.__x43.cam('${cam.id}',{instant:true}); 'cam-${cam.id}'`]);
  }
  actions.push(["wait", 260]);
  actions.push(...[camShot(cam.id)]);
}
// F0 右缘裁剪人验图（cameras.f0Check.protocol：canvas 视区右 1/3，非整页）
actions.push(["eval", `window.__x43.goto(0,{instant:true}); 'f0-for-rightcrop'`]);
actions.push(["wait", 300]);
actions.push(["shot", join(out, `${P}-cam-F0-rightcrop.png`), "body", 1, [VR - cropW, 0, cropW, H]]);
// F0 完整性机检（cameras.f0Check：必入画+右缘余量；F0 全景模式+11 完整模式）
actions.push(["eval", `window.__x43.goto(0,{instant:true}); JSON.stringify(window.__x43.f0check())`]);
actions.push(["eval", `window.__x43.goto(11,{instant:true}); JSON.stringify(window.__x43.f0check())`]);
// —— F3 动画中段（四信号点亮态：signalQuad 后 PRC/PED 亮·PR 熄·PLS=U0——复评残留补证；k=0.5 下 5.6s≈四信号齐后、回执卡飞行中段） ——
actions.push(["eval", `window.__x43.setPreset('fullspeed'); window.__x43.goto(3); 'play-f3'`]);
actions.push(["wait", 5600]);
actions.push(...[shot(`${P}-f3-mid.png`)]);
// —— F4 动画中段（命令环 TRB+DMA 光束+回执链） ——
actions.push(["eval", `window.__x43.goto(4); 'play-f4'`]);
actions.push(["wait", 6500]);
actions.push(...[shot(`${P}-f4-mid.png`)]);
// —— 走廊取证（corridorProof：卡入走廊中段再摆机位〔承 V2 轮询法〕） ——
actions.push(["eval", `window.__x43.goto(1); 'play-f1'`]);
actions.push(["until", `(()=>{let ok=false;window.__x43._scene.traverse(o=>{if(o.userData&&o.userData.flow&&o.position.x<-6.5&&o.position.x>-12&&o.position.y>8)ok=true;});return ok;})()`, 40000]);
actions.push(["eval", `window.__x43.cam('corridorProof',{instant:true}); 'corridor-cam'`]);
actions.push(["wait", 400]);
actions.push(...[shot(`${P}-corridor-proof.png`)]);
// —— 互动三关各 ≥1（真实入口：面板 lab tab 点选） ——
actions.push(["eval", `window.__x43.tab('lab'); 'lab'`]);
actions.push(["click", '[data-labstart="L1"]', 0.5, 0.5]);
actions.push(["wait", 900]);
actions.push(...[shot(`${P}-lab-L1.png`, ".x43-panel")]);
actions.push(["eval", `window.__x43.lab.L1.pick(0); 'l1-wrong'`]);
actions.push(["wait", 300]);
actions.push(...[shot(`${P}-lab-L1-fail.png`, ".x43-panel")]);
actions.push(["eval", `window.__x43.lab.L1.pick(1); 'l1-done'`]);
actions.push(["wait", 400]);
actions.push(["click", '[data-labstart="L2"]', 0.5, 0.5]);
actions.push(["wait", 500]);
actions.push(...[shot(`${P}-lab-L2.png`, ".x43-panel")]);
actions.push(["eval", `window.__x43.lab.start('L3'); 'l3-locked-view'`]);
actions.push(["wait", 300]);
actions.push(...[shot(`${P}-lab-L3.png`, ".x43-panel")]);
// —— quiz 槽位（F11 讲解 tab） ——
actions.push(["eval", `window.__x43.tab('exp'); window.__x43.goto(11,{instant:true}); 'quiz-at'`]);
actions.push(["wait", 400]);
actions.push(["scroll", "#xFoldQuiz"]);
actions.push(["wait", 250]);
actions.push(...[shot(`${P}-quiz-slot.png`, ".x43-panel")]);
// —— 试错路径（F5） ——
// S5 取证修复（复评 P2 第二轮登记）：红牌 #x43Alarm 在面板顶部 in-flow——先滚 Trap 可见位点击，红牌出现后
// 再回滚到顶（scrollTop=0）、断言 #x43Alarm in-view 才拍（旧次序 scrollTop=0 被 scroll #x43Trap 抵消=红牌滚出画面）。
actions.push(["eval", `window.__x43.goto(5); 'f5'`]);
actions.push(["wait", 800]);
actions.push(["scroll", "#x43Trap"]);
actions.push(["wait", 200]);
actions.push(["click", "#x43Trap", 0.5, 0.5]);
actions.push(["wait", 10500]);
actions.push(["eval", `(() => { const b = document.getElementById('x43PanelBody'); b.scrollTop = 0; const a = document.getElementById('x43Alarm'); const r = a.getBoundingClientRect(); const inView = !a.hidden && r.top >= 0 && r.bottom <= window.innerHeight && r.width > 40; return 'alarm-inview=' + inView + ' top=' + Math.round(r.top) + ' bottom=' + Math.round(r.bottom); })()`]);
actions.push(["wait", 300]);
actions.push(...[shot(`${P}-tryerror.png`)]);
// —— tab 两张（字段/显示） ——
actions.push(["eval", `window.__x43.tab('fields'); 'tab-fields'`]);
actions.push(["wait", 350]);
actions.push(...[shot(`${P}-tab-fields.png`, ".x43-panel")]);
actions.push(["eval", `window.__x43.tab('disp'); 'tab-disp'`]);
actions.push(["wait", 350]);
actions.push(...[shot(`${P}-tab-disp.png`, ".x43-panel")]);

const phone = [
  ["wait", 3200],
  ...[shot(`${P}-phone390.png`)],
  ["eval", `window.__x43.goto(1,{instant:true}); 'f1'`],
  ["wait", 500],
  ...[shot(`${P}-phone390-f1.png`)],
];

const { code, out: outTxt } = await runDrive(drive, page, actions, { width: W, height: H });
process.stdout.write(outTxt);
const vc = consoleVerdict(outTxt);
// f0check 结果断言
const f0s = outTxt.split("\n").filter((l) => l.startsWith('eval: "{') && l.includes('pass')).map((l) => { try { return JSON.parse(JSON.parse(l.slice(6))); } catch { return null; } }).filter(Boolean);
const f0Panorama = f0s[0], f0Full = f0s[1];
const f0Ok = f0Panorama && f0Panorama.pass && f0Full && f0Full.pass;

const phone2 = await runDrive(drive, page, phone, { width: 390, height: 844 });
process.stdout.write(phone2.out);
const vcPhone = consoleVerdict(phone2.out);



console.log(`SHOTS ${vc.clean ? "CONSOLE-CLEAN" : "CONSOLE-DIRTY: " + vc.bad.join(" ; ")}`);
console.log(`SHOTS-F0CHECK ${f0Ok ? "PASS" : "FAIL"} panorama=${f0Panorama && f0Panorama.pass} full=${f0Full && f0Full.pass} marginFull=${f0Full && f0Full.marginWu}`);
const tryInView = outTxt.includes("alarm-inview=true"); // S5 取证门：tryerror 红牌 in-view 断言
console.log(`SHOTS-TRYERROR ${tryInView ? "ALARM-INVIEW-PASS" : "ALARM-INVIEW-FAIL"}`);
console.log(`SHOTS-PHONE ${vcPhone.clean ? "CONSOLE-CLEAN" : "CONSOLE-DIRTY: " + vcPhone.bad.join(" ; ")}`);
process.exit(code === 0 && vc.clean && vcPhone.clean && f0Ok && tryInView ? 0 : 1);
