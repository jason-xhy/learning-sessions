# gen_textures.py —— S6 Blender 无头纹理工厂（PBR 烘焙：节点树→Cycles bake→PNG）
# 用法：blender -b --python gen_textures.py -- --outdir <dir> [--only tex01,tex03] [--manifest <path>] [--dsl <scene.dsl.json>] [--env-only] [--no-env]
# 依赖：Blender 4.5 LTS（Cycles + bpy.ops.object.bake）；输出 PNG（albedo/emissive 走 sRGB 编码路径，数据图 Non-Color 直写线性值）
# 消费 DSL 分区：textureRequests（尺寸上限校验）；材质区间表内置（S2 §E.7——roughnessMap=绝对值域 [r0,r1]，注入侧标量置 1.0）
# 色彩空间自适应：启动时探针 bake 判定 save 是否做 linear→sRGB 编码（PROBE 行），据此决定 albedo 常量是否先行 linear 化
# 下游：post_tile.py（平铺化）→ check_textures.py（机检）→ pack_textures.mjs（压缩打包 base64）
# 输出：outdir/<texNN>_<kind>.png + manifest.json，stdout 打 BAKE-OK 行

import bpy
import json
import math
import os
import sys

# ---------------- CLI ----------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    if name in argv:
        return argv[argv.index(name) + 1]
    return default
OUTDIR = arg("--outdir") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
ONLY = arg("--only")
MANIFEST = arg("--manifest") or os.path.join(OUTDIR, "manifest.json")
DSL = arg("--dsl")
ENV_ONLY = "--env-only" in argv
NO_ENV = "--no-env" in argv
os.makedirs(OUTDIR, exist_ok=True)

# ---------------- 场景基座 ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.render.bake.margin = 4
scene.render.bake.use_selected_to_active = False
scene.render.bake.normal_space = "TANGENT"

# ---------------- 材质区间表（S2 §E.7；null→S6 保守裁定档） ----------------
ROUGH = {
    "tex01": (0.38, 0.50), "tex02": (0.25, 0.35), "tex03": (0.50, 0.65),
    "tex04": (0.35, 0.45), "tex05": (0.60, 0.75), "tex06": (0.20, 0.30),
    "tex07": (0.34, 0.50), "tex08": (0.70, 0.85), "tex09": (0.30, 0.40),
    "tex10": (0.45, 0.60), "tex11": (0.28, 0.32), "tex12": (0.10, 0.22),
}

# 尺寸表（textureRequests px=长边上限；纵横比按表面对象匹配，见 S6-设计 ①）
SIZES = {
    "tex01": {"albedo": (1024, 1024), "rough": (512, 512), "normal": (512, 512), "ao": (512, 512)},
    "tex02": {"albedo": (512, 512), "rough": (512, 512)},
    "tex03": {"albedo": (1024, 512), "rough": (512, 256), "normal": (512, 256)},
    "tex04": {"albedo": (512, 512), "rough": (512, 512), "normal": (512, 512)},
    "tex05": {"albedo": (256, 256), "rough": (256, 256)},
    "tex06": {"albedo": (256, 256), "rough": (256, 256)},
    "tex07": {"albedo": (1024, 512), "rough": (1024, 512), "ao": (1024, 512)},
    "tex08": {"albedo": (512, 512), "rough": (512, 512)},
    "tex09": {"albedo": (256, 256), "rough": (256, 256), "normal": (256, 256)},
    "tex10": {"albedo": (256, 256), "rough": (256, 256)},
    "tex11": {"albedo": (256, 256), "emissive": (256, 256), "rough": (128, 128)},
    "tex12": {"albedo": (128, 128), "rough": (128, 128)},
}
TILEABLE = {"tex01", "tex02", "tex03", "tex04", "tex05", "tex06", "tex08", "tex09", "tex10", "tex11", "tex12"}
# 逐 map 免滚移（固有周期或径向/渐变特征怕平移）：tex06=波纹+带全部周期；tex09=中心径向磨损不可平移；
# tex11 emissive=竖向渐变不可平移
NO_ROLL_MAPS = {("tex06", "albedo"), ("tex06", "rough"),
                ("tex09", "albedo"), ("tex09", "normal"), ("tex09", "rough"),
                ("tex11", "emissive")}
SAFE = 0.14  # 可平铺纹理的强特征安全区（避开 wrap 渐变带）

def tileable_for(tex, kind):
    return tex in TILEABLE and (tex, kind) not in NO_ROLL_MAPS

def rmid(tex):
    a, b = ROUGH[tex]
    return (a + b) / 2.0

# ---------------- 色彩空间自适应 ----------------
def _srgb_to_linear(c):
    def one(v):
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(one(x) for x in c[:3])

SRGB_CONST = None  # 探针后置位：True=albedo 常量先转 linear（save 会做 sRGB 编码）；False=常量即字节值

def COL(v):
    """albedo/emissive 色常量入口（sRGB 口径书写，探针决定是否 linear 化）"""
    if isinstance(v, (int, float)):
        v = (v, v, v)
    if SRGB_CONST:
        v = _srgb_to_linear(v)
    return (v[0], v[1], v[2], 1.0)

def DATA(v):
    """数据图（rough/ao）常量入口——永不转换"""
    return v

# ---------------- 节点小工具 ----------------
def nt_of(mat):
    return mat.node_tree

def link(nt, a, b):
    return nt.links.new(a, b)

def uv(nt):
    return nt.nodes.new("ShaderNodeTexCoord").outputs["UV"]

def sep_u(nt, uvsock):
    n = nt.nodes.new("ShaderNodeSeparateXYZ")
    link(nt, uvsock, n.inputs[0])
    return n.outputs["X"]

def sep_v(nt, uvsock):
    n = nt.nodes.new("ShaderNodeSeparateXYZ")
    link(nt, uvsock, n.inputs[0])
    return n.outputs["Y"]

def combine(nt, x, y):
    n = nt.nodes.new("ShaderNodeCombineXYZ")
    link(nt, x, n.inputs["X"])
    link(nt, y, n.inputs["Y"])
    return n.outputs[0]

def vmath(nt, op, a, b=None):
    n = nt.nodes.new("ShaderNodeVectorMath")
    n.operation = op
    link(nt, a, n.inputs[0])
    if b is not None:
        link(nt, b, n.inputs[1])
    return n

def vlen(nt, vec):
    return vmath(nt, "LENGTH", vec).outputs["Value"]

def noise_fac(nt, vec, scale, detail=6.0, rough_in=0.5, dist=0.0):
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.noise_dimensions = "3D"
    if vec is not None:
        link(nt, vec, n.inputs["Vector"])
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough_in
    n.inputs["Distortion"].default_value = dist
    return n.outputs["Fac"]

def wave(nt, vec, direction="X", scale=5.0, dist=0.0, detail=2.0, dscale=1.0):
    n = nt.nodes.new("ShaderNodeTexWave")
    n.wave_type = "BANDS"
    n.bands_direction = direction
    n.wave_profile = "SIN"
    if vec is not None:
        link(nt, vec, n.inputs["Vector"])
    n.inputs["Scale"].default_value = scale
    n.inputs["Distortion"].default_value = dist
    n.inputs["Detail"].default_value = detail
    n.inputs["Detail Scale"].default_value = dscale
    return n

def ramp(nt, fac, stops):
    """彩色 ramp：stops [(pos, (r,g,b) sRGB 口径)] → Color 输出"""
    n = nt.nodes.new("ShaderNodeValToRGB")
    el = n.color_ramp.elements
    while len(el) > 1:
        el.remove(el[-1])
    el[0].position = stops[0][0]
    el[0].color = COL(stops[0][1])
    for pos, col in stops[1:]:
        e = el.new(pos)
        e.color = COL(col)
    link(nt, fac, n.inputs["Fac"])
    return n.outputs["Color"]

def ramp_f(nt, fac, stops):
    """数据 ramp：stops [(pos, 0..1 灰度)] → 输出（数据图口径，永不转换）"""
    n = nt.nodes.new("ShaderNodeValToRGB")
    el = n.color_ramp.elements
    while len(el) > 1:
        el.remove(el[-1])
    el[0].position = stops[0][0]
    el[0].color = (stops[0][1], stops[0][1], stops[0][1], 1.0)
    for pos, v in stops[1:]:
        e = el.new(pos)
        e.color = (v, v, v, 1.0)
    link(nt, fac, n.inputs["Fac"])
    return n.outputs["Color"]

def set_in(nt, sock, val):
    if isinstance(val, (tuple, list)):
        if len(val) == 3:
            sock.default_value = (val[0], val[1], val[2], 1.0)
        else:
            sock.default_value = val
    elif isinstance(val, (int, float)):
        if sock.type == "RGBA":
            sock.default_value = (float(val),) * 4
        elif sock.type == "VECTOR":
            sock.default_value = (float(val),) * 3
        else:
            sock.default_value = float(val)
    else:
        link(nt, val, sock)

def mixc(nt, fac, c1, c2, blend="MIX"):
    """legacy MixRGB：c1/c2 为常量（COL 口径元组）或 socket"""
    n = nt.nodes.new("ShaderNodeMixRGB")
    n.blend_type = blend
    set_in(nt, n.inputs["Fac"], fac)
    set_in(nt, n.inputs["Color1"], c1)
    set_in(nt, n.inputs["Color2"], c2)
    return n.outputs["Color"]

def mth(nt, op, a, b=None, c=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    set_in(nt, n.inputs[0], a)
    if b is not None:
        set_in(nt, n.inputs[1], b)
    if c is not None:
        n.use_clamp = False
        set_in(nt, n.inputs[2], c)
    return n.outputs["Value"]

def softband(nt, x, e0, e1):
    """clamp((x-e0)/(e1-e0))：e0→0，e1→1"""
    d = mth(nt, "SUBTRACT", x, e0)
    s = mth(nt, "DIVIDE", d, (e1 - e0))
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = "MULTIPLY"
    n.use_clamp = True
    set_in(nt, n.inputs[0], s)
    set_in(nt, n.inputs[1], 1.0)
    return n.outputs["Value"]

def bump(nt, height, strength, distance=0.05):
    n = nt.nodes.new("ShaderNodeBump")
    n.inputs["Strength"].default_value = strength
    n.inputs["Distance"].default_value = distance
    link(nt, height, n.inputs["Height"])
    return n.outputs["Normal"]

def principled_with_bump(nt, normal_socket):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    if normal_socket is not None:
        link(nt, normal_socket, p.inputs["Normal"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    link(nt, p.outputs[0], out.inputs["Surface"])
    return out

# ---------------- bake 基座 ----------------
def new_plane(name):
    bpy.ops.mesh.primitive_plane_add(size=2, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name
    return obj

def new_mat(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    return mat, nt

def setup(name):
    """plane + material + 指派（bake 读活动对象的材质节点树，指派必须先行）"""
    obj = new_plane(name)
    mat, nt = new_mat(name)
    obj.data.materials.append(mat)
    return obj, mat, nt

def make_img(name, w, h, srgb):
    img = bpy.data.images.new(name, w, h, alpha=False, float_buffer=True)
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    return img

def attach_target(nt, img):
    tn = nt.nodes.new("ShaderNodeTexImage")
    tn.image = img
    tn.extension = "REPEAT"
    tn.select = True
    nt.nodes.active = tn
    return tn

def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def save_png(img, path):
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()

def bake_emit(obj, mat, socket, w, h, path, srgb=False, label=""):
    nt = nt_of(mat)
    outs = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"]
    out = outs[0] if outs else nt.nodes.new("ShaderNodeOutputMaterial")
    for l in list(out.inputs["Surface"].links):
        nt.links.remove(l)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    link(nt, socket, em.inputs["Color"])
    link(nt, em.outputs[0], out.inputs["Surface"])
    img = make_img(os.path.basename(path), w, h, srgb)
    attach_target(nt, img)
    select_only(obj)
    bpy.ops.object.bake(type="EMIT")
    save_png(img, path)
    print("BAKE-OK %s %dx%d" % (label, w, h))

def bake_normal(obj, mat, w, h, path, label=""):
    nt = nt_of(mat)
    img = make_img(os.path.basename(path), w, h, False)
    attach_target(nt, img)
    select_only(obj)
    bpy.ops.object.bake(type="NORMAL")
    save_png(img, path)
    print("BAKE-OK %s %dx%d" % (label, w, h))

def path_for(tex, kind):
    return os.path.join(OUTDIR, "%s_%s.png" % (tex, kind))

# ---------------- 点特征工具 ----------------
def uv_dist(nt, uvsock, px, py):
    d = combine(nt, mth(nt, "SUBTRACT", sep_u(nt, uvsock), px),
                     mth(nt, "SUBTRACT", sep_v(nt, uvsock), py))
    return vlen(nt, d)

def blob_mask(nt, uvsock, px, py, r, soft=0.03):
    """定点软圆 mask：中心 1 → r 处 0"""
    L = uv_dist(nt, uvsock, px, py)
    inner = softband(nt, L, r - soft, r)
    return mth(nt, "SUBTRACT", 1.0, inner)

def knot_group(nt, uvsock, px, py, r_core, freq):
    """节疤组件：(暗环 mask, 暗心 mask)——环=1-|sin(L*freq)| 窄带"""
    L = uv_dist(nt, uvsock, px, py)
    sn = mth(nt, "SINE", mth(nt, "MULTIPLY", L, freq))
    inv = mth(nt, "SUBTRACT", 1.0, mth(nt, "ABSOLUTE", sn))
    ring = mth(nt, "GREATER_THAN", inv, 0.8)
    core = blob_mask(nt, uvsock, px, py, r_core, soft=0.012)
    return ring, core

def rect_mask(nt, su, sv, u0, u1, v0, v1, soft=0.03):
    mx1 = softband(nt, su, u0 - soft, u0 + soft)
    mx2 = mth(nt, "SUBTRACT", 1.0, softband(nt, su, u1 - soft, u1 + soft))
    my1 = softband(nt, sv, v0 - soft, v0 + soft)
    my2 = mth(nt, "SUBTRACT", 1.0, softband(nt, sv, v1 - soft, v1 + soft))
    return mth(nt, "MULTIPLY", mth(nt, "MULTIPLY", mx1, mx2), mth(nt, "MULTIPLY", my1, my2))

# ---------------- 色彩空间探针（启动一次） ----------------
def probe_colorspace():
    global SRGB_CONST
    obj, mat, nt = setup("probe")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (0.5, 0.5, 0.5, 1.0)  # linear 0.5
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    link(nt, em.outputs[0], out.inputs["Surface"])
    p_srgb = os.path.join(OUTDIR, "_probe_srgb.png")
    img = make_img("probeA", 16, 16, True)
    attach_target(nt, img)
    select_only(obj)
    bpy.ops.object.bake(type="EMIT")
    save_png(img, p_srgb)
    # 读回字节值（load 后 pixels 为该图声明色彩空间原始量化值的线性还原——不可靠，改为直接统计保存缓冲）
    # 直接策略：比较保存缓冲像素（保存前 buffer 即写入文件的量化源）
    vals = list(img.pixels[:32])
    mean_srgb_declared = sum(vals) / len(vals)
    print("PROBE buffer-when-srgb-declared=%.4f" % mean_srgb_declared)
    # 0.5 linear 经 sRGB 编码 ≈ 0.735；若 buffer 被声明色彩空间预编码则 ≈0.735，否则 ≈0.5
    SRGB_CONST = mean_srgb_declared > 0.62
    print("PROBE SRGB_CONST=%s（save 编码路径=%s）" % (
        SRGB_CONST, "linear→sRGB 编码于 bake 写入" if SRGB_CONST else "原始直写（常量即字节值）"))
    bpy.data.images.remove(img)
    bpy.data.objects.remove(obj, do_unlink=True)

# ---------------- 逐项配方 ----------------
manifest = {"textures": {}, "env": None, "meta": {}}

def tex01():
    tex = "tex01"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    su, sv = sep_u(nt, U), sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)

    # —— normal 最先烘（EMIT 改接会顶掉 Principled 输出）；拉丝=水平细线（Wave Y→横条纹）
    brush = wave(nt, U, "Y", scale=220.0)
    pbump = bump(nt, brush.outputs["Fac"], 0.15, distance=0.012)
    principled_with_bump(nt, pbump)
    spec = SIZES[tex]
    bake_normal(obj, mat, *spec["normal"], path_for(tex, "normal"), label=tex + "_normal")

    # —— albedo：拉丝细线 + 宽幅明暗 + 污渍 + 指纹 + 螺丝点阵 + 边框磨损
    brush_l = ramp_f(nt, brush.outputs["Fac"], [(0.0, 1.0), (0.14, 0.0), (1.0, 0.0)])
    wide = noise_fac(nt, U, 16.0, detail=4)
    base = COL((0.596, 0.635, 0.682))  # #98a2ae（占位档色族）
    albedo = mixc(nt, brush_l, base, COL((0.502, 0.545, 0.60)))
    tone = ramp_f(nt, wide, [(0.0, 0.93), (0.5, 1.0), (1.0, 1.06)])
    albedo = mixc(nt, 1.0, albedo, tone, blend="MULTIPLY")
    grime = softband(nt, wide, 0.55, 0.75)
    albedo = mixc(nt, mth(nt, "MULTIPLY", grime, 0.12), albedo, COL((0.30, 0.33, 0.38)))
    fp = None
    for (fx, fy, fr) in [(0.30, 0.72, 0.06), (0.63, 0.30, 0.05), (0.80, 0.60, 0.042)]:
        m = blob_mask(nt, U, fx, fy, fr, soft=0.022)
        m = mth(nt, "MULTIPLY", m, 0.22)
        fp = m if fp is None else mth(nt, "MAXIMUM", fp, m)
    albedo = mixc(nt, fp, albedo, COL((0.475, 0.50, 0.545)))
    sx_ = mth(nt, "GREATER_THAN", mth(nt, "ABSOLUTE", mth(nt, "SINE", mth(nt, "MULTIPLY", su, math.pi * 4))), 0.982)
    sy_ = mth(nt, "GREATER_THAN", mth(nt, "ABSOLUTE", mth(nt, "SINE", mth(nt, "MULTIPLY", sv, math.pi * 4))), 0.982)
    screw = mth(nt, "MULTIPLY", sx_, sy_)
    albedo = mixc(nt, mth(nt, "MULTIPLY", screw, 0.55), albedo, COL((0.30, 0.33, 0.38)))
    eb = softband(nt, mth(nt, "SUBTRACT", 0.08, su), 0.0, 0.05)
    eb2 = softband(nt, mth(nt, "SUBTRACT", su, 0.92), 0.0, 0.05)
    e3 = softband(nt, mth(nt, "SUBTRACT", 0.08, sv), 0.0, 0.05)
    e4 = softband(nt, mth(nt, "SUBTRACT", sv, 0.92), 0.0, 0.05)
    wear = mth(nt, "MAXIMUM", mth(nt, "MAXIMUM", eb, eb2), mth(nt, "MAXIMUM", e3, e4))
    wear = mth(nt, "MULTIPLY", wear, softband(nt, wide, 0.45, 0.70))
    albedo = mixc(nt, mth(nt, "MULTIPLY", wear, 0.3), albedo, COL((0.74, 0.78, 0.82)))
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")

    # —— rough（绝对值域）
    rbase = ramp_f(nt, wide, [(0.0, r0 + 0.005), (0.5, mid), (1.0, r1 - 0.005)])
    rough = mixc(nt, mth(nt, "MULTIPLY", wear, 0.8), rbase, DATA(r0 + 0.01))
    rough = mixc(nt, mth(nt, "MULTIPLY", fp, 1.4), rough, DATA(r0 + 0.03))
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")

    # —— ao
    ao = mixc(nt, mth(nt, "MULTIPLY", wear, 0.6), (1.0, 1.0, 1.0), DATA(0.62))
    ao = mixc(nt, mth(nt, "MULTIPLY", screw, 0.5), ao, DATA(0.80))
    bake_emit(obj, mat, ao, *spec["ao"], path_for(tex, "ao"), label=tex + "_ao")
    return tex

def tex02():
    tex = "tex02"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    sv = sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.12, 7.0, 1.0)
    link(nt, U, mp.inputs["Vector"])
    streak = noise_fac(nt, mp.outputs["Vector"], 8.0, detail=4)
    streak_l = ramp_f(nt, streak, [(0.35, 0.0), (0.62, 1.0), (1.0, 0.6)])
    base = COL((0.682, 0.725, 0.776))  # #aeb9c6 占位族
    albedo = mixc(nt, mth(nt, "MULTIPLY", streak_l, 0.22), base, COL((0.42, 0.47, 0.55)))
    vor = nt.nodes.new("ShaderNodeTexVoronoi")
    vor.feature = "F1"
    link(nt, U, vor.inputs["Vector"])
    vor.inputs["Scale"].default_value = 3.2
    vor.inputs["Randomness"].default_value = 1.0
    rust = ramp_f(nt, vor.outputs["Distance"], [(0.0, 1.0), (0.10, 0.85), (0.22, 0.0)])
    rust = mth(nt, "MULTIPLY", rust, softband(nt, noise_fac(nt, U, 18.0), 0.30, 0.60))
    albedo = mixc(nt, mth(nt, "MULTIPLY", rust, 0.75), albedo, COL((0.72, 0.47, 0.27)))
    topw = softband(nt, sv, 0.80, 0.92)
    albedo = mixc(nt, mth(nt, "MULTIPLY", topw, 0.30), albedo, COL((0.82, 0.85, 0.88)))
    rbase = ramp_f(nt, noise_fac(nt, U, 10.0), [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", rust, 0.9), rbase, DATA(0.52))
    rough = mixc(nt, mth(nt, "MULTIPLY", topw, 0.8), rough, DATA(r0 + 0.01))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex03():
    tex = "tex03"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    sv = sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)

    grain = wave(nt, U, "Y", scale=10.0, dist=1.2, detail=3)
    fine = wave(nt, U, "Y", scale=56.0, dist=0.6, detail=2)
    # —— normal 先烘（木纹 + 节疤环雕刻，环定位在节疤盘内；节疤避开滚移中缝带 0.48–0.52，
    #     且滚移后落点须进 deskCloseup 画幅中心：桌面 x≈-13.75/-13.04 → pre-roll (0.66,0.75)/(0.80,0.85)）
    ring1, core1 = knot_group(nt, U, 0.66, 0.75, 0.045, 45.0)
    keep1 = blob_mask(nt, U, 0.66, 0.75, 0.14, soft=0.035)
    ring1 = mth(nt, "MULTIPLY", ring1, keep1)
    core1 = mth(nt, "MULTIPLY", core1, keep1)
    hgt = mth(nt, "SUBTRACT", grain.outputs["Fac"], mth(nt, "MULTIPLY", mth(nt, "MAXIMUM", ring1, core1), 0.35))
    principled_with_bump(nt, bump(nt, hgt, 0.28, distance=0.02))
    spec = SIZES[tex]
    bake_normal(obj, mat, *spec["normal"], path_for(tex, "normal"), label=tex + "_normal")

    # —— albedo
    grain_c = ramp(nt, grain.outputs["Fac"], [
        (0.0, (0.26, 0.18, 0.114)), (0.28, (0.40, 0.30, 0.21)),
        (0.52, (0.60, 0.472, 0.345)), (0.75, (0.40, 0.30, 0.21)), (1.0, (0.26, 0.18, 0.114))])
    albedo = mixc(nt, 0.35, grain_c, ramp(nt, fine.outputs["Fac"], [
        (0.0, (0.42, 0.322, 0.231)), (1.0, (0.322, 0.239, 0.165))]))
    for (kx, ky, rc, freq, span, ring_col) in [(0.66, 0.75, 0.045, 45.0, 0.14, (0.20, 0.133, 0.071)),
                                                (0.80, 0.85, 0.03, 60.0, 0.095, (0.243, 0.165, 0.086))]:
        ring, core = knot_group(nt, U, kx, ky, rc, freq)
        keep = blob_mask(nt, U, kx, ky, span, soft=0.035)
        ring = mth(nt, "MULTIPLY", ring, keep)
        core = mth(nt, "MULTIPLY", core, keep)
        halo = blob_mask(nt, U, kx, ky, rc + 0.018, soft=0.016)
        halo = mth(nt, "MULTIPLY", halo, keep)
        halo = mth(nt, "MULTIPLY", halo, mth(nt, "SUBTRACT", 1.0, core))
        albedo = mixc(nt, mth(nt, "MULTIPLY", ring, 0.8), albedo, COL(ring_col))
        albedo = mixc(nt, mth(nt, "MULTIPLY", halo, 0.7), albedo, COL((0.71, 0.549, 0.376)))
        albedo = mixc(nt, core, albedo, COL((0.086, 0.055, 0.031)))
        below = softband(nt, mth(nt, "SUBTRACT", ky, sv), 0.0, 0.014)
        arc = mth(nt, "MULTIPLY", mth(nt, "MULTIPLY", ring, below), 0.7)
        albedo = mixc(nt, arc, albedo, COL((0.66, 0.545, 0.40)))
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")

    # —— rough：木纹调制 + 抛光斑（mid−0.10；滚移后落桌面常用区 x≈-14/z≈0.9）
    polish = blob_mask(nt, U, 0.61, 0.795, 0.12, soft=0.05)
    rbase = ramp_f(nt, grain.outputs["Fac"], [(0.0, r0 + 0.01), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", polish, 0.85), rbase, DATA(mid - 0.10))
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex04():
    tex = "tex04"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    fine = noise_fac(nt, U, 60.0, detail=2)
    principled_with_bump(nt, bump(nt, fine, 0.35, distance=0.015))
    spec = SIZES[tex]
    bake_normal(obj, mat, *spec["normal"], path_for(tex, "normal"), label=tex + "_normal")
    base = mixc(nt, mth(nt, "MULTIPLY", fine, 0.10), COL((0.604, 0.647, 0.694)), COL((0.545, 0.588, 0.635)))
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(32))
    mp.inputs["Scale"].default_value = (0.10, 9.0, 1.0)
    link(nt, U, mp.inputs["Vector"])
    scr = noise_fac(nt, mp.outputs["Vector"], 6.0, detail=3)
    scr_l = ramp_f(nt, scr, [(0.46, 0.0), (0.53, 1.0), (0.72, 0.25)])
    albedo = mixc(nt, mth(nt, "MULTIPLY", scr_l, 0.30), base, COL((0.44, 0.48, 0.53)))
    corners = None
    for (cx_, cy_) in [(SAFE, SAFE), (1 - SAFE, SAFE), (SAFE, 1 - SAFE), (1 - SAFE, 1 - SAFE)]:
        m = blob_mask(nt, U, cx_, cy_, 0.10, soft=0.06)
        corners = m if corners is None else mth(nt, "MAXIMUM", corners, m)
    albedo = mixc(nt, mth(nt, "MULTIPLY", corners, 0.35), albedo, COL((0.68, 0.72, 0.76)))
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    rbase = ramp_f(nt, noise_fac(nt, U, 60.0), [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", corners, 0.7), rbase, DATA(r0 + 0.02))
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex05():
    tex = "tex05"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    lines = wave(nt, U, "X", scale=80.0)
    line_l = ramp_f(nt, lines.outputs["Fac"], [(0.0, 1.0), (0.2, 0.0), (1.0, 0.0)])
    base = COL((0.235, 0.263, 0.302))  # #3c434d
    albedo = mixc(nt, mth(nt, "MULTIPLY", line_l, 0.30), base, COL((0.196, 0.22, 0.259)))
    dust = noise_fac(nt, U, 30.0, detail=4)
    albedo = mixc(nt, mth(nt, "MULTIPLY", softband(nt, dust, 0.55, 0.9), 0.12), albedo, COL((0.29, 0.33, 0.38)))
    rough = ramp_f(nt, noise_fac(nt, U, 60.0), [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", line_l, 0.4), rough, DATA(r0 + 0.02))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex06():
    tex = "tex06"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    sv = sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    brush = wave(nt, U, "Y", scale=64.0)
    brush_l = ramp_f(nt, brush.outputs["Fac"], [(0.0, 1.0), (0.18, 0.0), (1.0, 0.0)])
    base = COL((0.788, 0.808, 0.839))  # #c9ced6
    albedo = mixc(nt, mth(nt, "MULTIPLY", brush_l, 0.20), base, COL((0.72, 0.745, 0.78)))
    band = mth(nt, "MULTIPLY", softband(nt, sv, 0.30, 0.40), mth(nt, "SUBTRACT", 1.0, softband(nt, sv, 0.60, 0.70)))
    albedo = mixc(nt, mth(nt, "MULTIPLY", band, 0.35), albedo, COL((0.851, 0.871, 0.894)))
    rbase = ramp_f(nt, brush.outputs["Fac"], [(0.0, r0 + 0.01), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", band, 0.9), rbase, DATA(r0 + 0.015))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex07():
    tex = "tex07"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    su, sv = sep_u(nt, U), sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    cloud = noise_fac(nt, U, 1.5, detail=4)
    base = ramp(nt, cloud, [(0.0, (0.086, 0.11, 0.145)), (0.5, (0.102, 0.129, 0.169)), (1.0, (0.118, 0.145, 0.188))])
    gx = mth(nt, "ABSOLUTE", mth(nt, "SINE", mth(nt, "MULTIPLY", su, math.pi * (56.0 / 1.2))))
    gy = mth(nt, "ABSOLUTE", mth(nt, "SINE", mth(nt, "MULTIPLY", sv, math.pi * (28.0 / 1.2))))
    grid = mth(nt, "MAXIMUM", softband(nt, mth(nt, "SUBTRACT", 0.18, gx), 0.0, 0.18),
               softband(nt, mth(nt, "SUBTRACT", 0.18, gy), 0.0, 0.18))
    albedo = mixc(nt, mth(nt, "MULTIPLY", grid, 0.75), base, COL((0.165, 0.212, 0.275)))
    pools = None
    for (pu, pv, pr) in [(0.44, 0.5, 0.088), (0.2, 0.5, 0.078), (0.72, 0.5, 0.070)]:
        m = blob_mask(nt, U, pu, pv, pr, soft=0.05)
        pools = m if pools is None else mth(nt, "MAXIMUM", pools, m)
    albedo = mixc(nt, mth(nt, "MULTIPLY", pools, 0.12), albedo, COL((0.16, 0.185, 0.22)))
    rbase = ramp_f(nt, cloud, [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", pools, 0.85), rbase, DATA(0.30))
    ao_cab = rect_mask(nt, su, sv, 0.366, 0.598, 0.343, 0.514, soft=0.025)
    ao_desk = rect_mask(nt, su, sv, 0.116, 0.295, 0.35, 0.51, soft=0.025)
    ao_dev = rect_mask(nt, su, sv, 0.707, 0.771, 0.375, 0.482, soft=0.025)
    sh = mth(nt, "MAXIMUM", mth(nt, "MAXIMUM", ao_cab, ao_desk), ao_dev)
    ao = mixc(nt, mth(nt, "MULTIPLY", sh, 0.35), (1.0, 1.0, 1.0), DATA(0.70))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    bake_emit(obj, mat, ao, *spec["ao"], path_for(tex, "ao"), label=tex + "_ao")
    return tex

def tex08():
    tex = "tex08"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    fib = noise_fac(nt, U, 120.0, detail=3)
    base = ramp(nt, fib, [(0.0, (0.118, 0.153, 0.208)), (0.5, (0.137, 0.18, 0.243)), (1.0, (0.165, 0.208, 0.275))])
    rough = ramp_f(nt, noise_fac(nt, U, 80.0), [(0.0, r0), (0.5, mid), (1.0, r1)])
    spec = SIZES[tex]
    bake_emit(obj, mat, base, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex09():
    tex = "tex09"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    knurl = wave(nt, U, "X", scale=48.0)
    principled_with_bump(nt, bump(nt, knurl.outputs["Fac"], 0.30, distance=0.015))
    spec = SIZES[tex]
    bake_normal(obj, mat, *spec["normal"], path_for(tex, "normal"), label=tex + "_normal")
    kn = ramp_f(nt, knurl.outputs["Fac"], [(0.0, 1.0), (0.25, 0.0), (1.0, 0.0)])
    base = COL((0.651, 0.69, 0.737))  # #a6b0bc
    albedo = mixc(nt, mth(nt, "MULTIPLY", kn, 0.35), base, COL((0.557, 0.60, 0.651)))
    center = blob_mask(nt, U, 0.5, 0.5, 0.26, soft=0.10)
    albedo = mixc(nt, mth(nt, "MULTIPLY", center, 0.30), albedo, COL((0.72, 0.76, 0.80)))
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    rbase = ramp_f(nt, knurl.outputs["Fac"], [(0.0, r0 + 0.01), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", center, 0.8), rbase, DATA(r0 + 0.02))
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex10():
    tex = "tex10"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    sv = sep_v(nt, U)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    wear = noise_fac(nt, U, 40.0, detail=5)
    base = ramp(nt, wear, [(0.0, (0.145, 0.184, 0.235)), (0.5, (0.165, 0.20, 0.251)), (1.0, (0.20, 0.235, 0.286))])
    band = mth(nt, "SUBTRACT", 1.0, softband(nt, sv, 0.0, 0.18))
    albedo = mixc(nt, mth(nt, "MULTIPLY", band, 0.22), base, COL((0.239, 0.271, 0.318)))
    rough = ramp_f(nt, wear, [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", band, 0.5), rough, DATA(r1))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex11():
    tex = "tex11"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    sv = sep_v(nt, U)
    r0, r1 = ROUGH[tex]
    dust = noise_fac(nt, U, 50.0, detail=4)
    base = COL((0.847, 0.863, 0.886))  # #d8dce2
    albedo = mixc(nt, mth(nt, "MULTIPLY", softband(nt, dust, 0.6, 0.95), 0.15), base, COL((0.76, 0.78, 0.80)))
    # 灯口红晕（竖向渐变；口缘=v=0（three.js SphereGeometry v=0=底缘）→暖端在 pos 0）
    emissive = ramp(nt, sv, [(0.0, (1.0, 0.851, 0.549)), (0.2, (0.91, 0.757, 0.518)),
                              (0.55, (0.71, 0.69, 0.62)), (1.0, (0.392, 0.427, 0.478))])
    rough = ramp_f(nt, dust, [(0.0, r0), (1.0, r1)])
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, emissive, *spec["emissive"], path_for(tex, "emissive"), srgb=True, label=tex + "_emissive")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

def tex12():
    tex = "tex12"
    obj, mat, nt = setup(tex)
    U = uv(nt)
    r0, r1 = ROUGH[tex]; mid = rmid(tex)
    micro = noise_fac(nt, U, 64.0, detail=2)
    base = ramp(nt, micro, [(0.0, (0.043, 0.063, 0.09)), (0.5, (0.051, 0.075, 0.099)), (1.0, (0.075, 0.098, 0.137))])
    fpL = uv_dist(nt, U, 0.62, 0.55)
    wnp = noise_fac(nt, U, 25.0, detail=3)
    rid = mth(nt, "SINE", mth(nt, "MULTIPLY_ADD", fpL, 45.0, mth(nt, "MULTIPLY", wnp, 1.5)))
    rid_m = mth(nt, "ABSOLUTE", rid)
    fp = mth(nt, "MULTIPLY", mth(nt, "SUBTRACT", 1.0, softband(nt, fpL, 0.03, 0.20)),
             softband(nt, mth(nt, "SUBTRACT", 1.0, rid_m), 0.0, 0.4))
    albedo = mixc(nt, mth(nt, "MULTIPLY", fp, 0.20), base, COL((0.11, 0.145, 0.20)))
    rbase = ramp_f(nt, micro, [(0.0, r0), (0.5, mid), (1.0, r1)])
    rough = mixc(nt, mth(nt, "MULTIPLY", fp, 0.6), rbase, DATA(mid + 0.02))
    spec = SIZES[tex]
    bake_emit(obj, mat, albedo, *spec["albedo"], path_for(tex, "albedo"), srgb=True, label=tex + "_albedo")
    bake_emit(obj, mat, rough, *spec["rough"], path_for(tex, "rough"), label=tex + "_rough")
    return tex

RECIPES = {"tex01": tex01, "tex02": tex02, "tex03": tex03, "tex04": tex04,
           "tex05": tex05, "tex06": tex06, "tex07": tex07, "tex08": tex08,
           "tex09": tex09, "tex10": tex10, "tex11": tex11, "tex12": tex12}

# ---------------- DSL 尺寸上限校验 ----------------
def check_sizes():
    if not DSL:
        return
    with open(DSL, "r", encoding="utf-8") as f:
        dsl = json.load(f)
    reqs = {it["id"]: it for it in dsl["textureRequests"]["items"]}
    for tex, maps in SIZES.items():
        req = reqs[tex]
        for m in req["maps"]:
            kind = "albedo" if m["type"] == "albedo" else m["type"]
            if kind in maps and max(maps[kind]) > m["px"]:
                raise SystemExit("SIZE-OVER %s %s: %d > px%d" % (tex, kind, max(maps[kind]), m["px"]))
    print("SIZE-CHECK-OK（对 textureRequests 上限）")

# ---------------- env 环境贴图（全景渲染） ----------------
def build_env():
    """纯世界节点环境（全景相机只渲染 world）：渐变+三盏暖灯 halo+两道冷窗——射线方向点积计算，零几何体"""
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    w = bpy.data.worlds.new("envWorld")
    scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    outn = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = 1.0
    texco = nt.nodes.new("ShaderNodeTexCoord")
    direction = texco.outputs["Generated"]  # world 语境=射线方向
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    link(nt, direction, sep.inputs[0])
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.35
    mr.inputs["From Max"].default_value = 0.75
    link(nt, sep.outputs["Z"], mr.inputs["Value"])
    grad = nt.nodes.new("ShaderNodeValToRGB")
    el = grad.color_ramp.elements
    el[0].position = 0.0
    el[0].color = (0.043, 0.055, 0.075, 1.0)
    e1 = el.new(0.42); e1.color = (0.055, 0.071, 0.098, 1.0)
    e2 = el.new(0.50); e2.color = (0.078, 0.106, 0.145, 1.0)
    e3 = el.new(0.60); e3.color = (0.058, 0.078, 0.11, 1.0)
    el[1].position = 1.0
    el[1].color = (0.031, 0.041, 0.058, 1.0)
    link(nt, mr.outputs["Result"], grad.inputs["Fac"])
    bgcol = grad.outputs["Color"]

    def glow(bgcol_socket, dir_xyz, stops, col):
        """方向 halo：dot(ray,dir)→ramp 衰减→ADD 混入背景色（c1 + c2×fac）"""
        dc = nt.nodes.new("ShaderNodeCombineXYZ")
        n = math.sqrt(sum(c * c for c in dir_xyz))
        dc.inputs["X"].default_value = dir_xyz[0] / n
        dc.inputs["Y"].default_value = dir_xyz[1] / n
        dc.inputs["Z"].default_value = dir_xyz[2] / n
        dotn = nt.nodes.new("ShaderNodeVectorMath")
        dotn.operation = "DOT_PRODUCT"
        link(nt, direction, dotn.inputs[0])
        link(nt, dc.outputs[0], dotn.inputs[1])
        fall = ramp_f(nt, dotn.outputs["Value"], stops)
        mixn = nt.nodes.new("ShaderNodeMixRGB")
        mixn.blend_type = "ADD"
        set_in(nt, mixn.inputs["Color1"], bgcol_socket)
        set_in(nt, mixn.inputs["Color2"], col)
        link(nt, fall, mixn.inputs["Fac"])
        return mixn.outputs["Color"]

    # 三盏暖灯（相机 (0.5,0,7) 视角方向）+ 两道冷窗；强度预乘进色（ADD 可超 1，HDR→save 编码）
    lamps = [((-15.5, 0.0, 6.5), [(0.955, 0.0), (0.985, 0.4), (0.9985, 1.0)], (2.2, 1.75, 0.92)),
             ((0.5, 0.0, 10.0), [(0.955, 0.0), (0.985, 0.4), (0.9985, 1.0)], (2.2, 1.75, 0.92)),
             ((14.9, 0.0, -2.4), [(0.955, 0.0), (0.985, 0.4), (0.9985, 1.0)], (1.6, 1.27, 0.67)),
             ((-22.0, 16.0, 1.0), [(0.86, 0.0), (0.95, 0.5)], (0.30, 0.36, 0.47)),
             ((22.0, 16.0, 1.0), [(0.86, 0.0), (0.95, 0.5)], (0.30, 0.36, 0.47))]
    cur = bgcol
    for d, stops, col in lamps:
        cur = glow(cur, d, stops, col)
    link(nt, cur, bg.inputs["Color"])
    link(nt, bg.outputs[0], outn.inputs["Surface"])

    cam = bpy.data.cameras.new("envCam")
    cam.type = "PANO"
    cam.panorama_type = "EQUIRECTANGULAR"
    cam_obj = bpy.data.objects.new("envCam", cam)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (0.5, 0.0, 7.0)
    scene.camera = cam_obj
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 512
    scene.cycles.samples = 4
    scene.cycles.use_denoising = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = os.path.join(OUTDIR, "env_equirect.png")
    bpy.ops.render.render(write_still=True)
    print("BAKE-OK env 1024x512")
    return os.path.join(OUTDIR, "env_equirect.png")

# ---------------- 主流程 ----------------
check_sizes()
probe_colorspace()
todo = [t.strip() for t in ONLY.split(",")] if ONLY else list(RECIPES.keys())
if ENV_ONLY:
    todo = []
# manifest 合并：--only 时保留既有条目（防覆写丢其他纹理的元数据）
if ONLY and os.path.exists(MANIFEST):
    try:
        with open(MANIFEST, "r", encoding="utf-8") as f:
            old = json.load(f)
        if isinstance(old.get("textures"), dict):
            manifest["textures"].update({k: v for k, v in old["textures"].items() if k not in todo})
        manifest["env"] = old.get("env")
    except (json.JSONDecodeError, AttributeError):
        pass
for tex in todo:
    if tex not in RECIPES:
        raise SystemExit("UNKNOWN-TEX " + tex)
    manifest["textures"][tex] = {
        kind: {"file": os.path.basename(path_for(tex, kind)), "w": wh[0], "h": wh[1],
               "tileable": tileable_for(tex, kind), "srgb": kind in ("albedo", "emissive")}
        for kind, wh in SIZES[tex].items()
    }
    RECIPES[tex]()
if not NO_ENV:
    envp = build_env()
    manifest["env"] = {"file": os.path.basename(envp), "w": 1024, "h": 512, "tileable": False, "srgb": True}
manifest["meta"] = {"blender": bpy.app.version_string, "srgb_const": bool(SRGB_CONST),
                    "rough_table": {k: list(v) for k, v in ROUGH.items()}}
with open(MANIFEST, "w", encoding="utf-8") as f:
    json.dump(manifest, f, ensure_ascii=False, indent=1)
print("GEN-DONE %d tex + %s | manifest=%s" % (len(manifest["textures"]), "env" if manifest["env"] else "no-env", MANIFEST))
