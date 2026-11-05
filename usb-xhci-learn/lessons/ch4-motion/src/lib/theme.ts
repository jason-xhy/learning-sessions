// 设计令牌 —— xHCI 第4章课件（视频 1920x1080 @30fps）
// 三方配色沿用既验收色相族：驱动蓝 / xHC 金 / 设备绿
export const C = {
  bg: '#0b0f15',
  panel: '#111823',
  panelHi: '#18222f',
  edge: '#2a3849',
  edgeHi: '#3b4d63',
  ink: '#eaf1f8',
  dim: '#9db0c4',
  faint: '#5f7186',
  driver: '#7c9ff0',
  driverDeep: '#2d5fb3',
  hc: '#d9a860',
  hcDeep: '#8a5f14',
  dev: '#86bd7a',
  devDeep: '#2f7a3d',
  evt: '#7fd0b2', // 事件回执流（青绿）
  warn: '#e07a5f',
  ok: '#86bd7a',
  chip: '#0e141d',
};

export const FONT = {
  sans: '"PingFang SC", "Hiragino Sans GB", sans-serif',
  mono: '"Menlo", "SF Mono", monospace',
};

// 舞台几何（横向三泳道 + xHC 泳道上下缘的两条环带）
export const G = {
  W: 1920,
  H: 1080,
  laneX0: 120,
  laneX1: 1800,
  laneDriverY: 158,
  laneDriverH: 214,
  laneHcY: 402,
  laneHcH: 312,
  laneDevY: 744,
  laneDevH: 200,
  // 命令环带（xHC 泳道上缘）/ 事件环带（xHC 泳道下缘）
  ringX0: 430,
  ringX1: 1490,
  cmdRingY: 442,
  evtRingY: 646,
  ringCell: 58,
  ringGap: 10,
  captionY: 990,
};

// motion-canvas 原点在画布中心（y 向下为正）。G 里的几何按左上原点 0..1920/0..1080
// 设计，使用处一律经 TL 变换；泳道/环带内部的相对坐标不受影响。
export const TLx = (x: number) => x - 960;
export const TLy = (y: number) => y - 540;

export type Party = 'driver' | 'hc' | 'dev';

export const PARTY = {
  driver: {zh: 'xHCI 驱动', en: 'system software', color: C.driver, deep: C.driverDeep},
  hc: {zh: 'xHC 控制器', en: 'host controller', color: C.hc, deep: C.hcDeep},
  dev: {zh: '设备', en: 'USB device', color: C.dev, deep: C.devDeep},
} as const;
