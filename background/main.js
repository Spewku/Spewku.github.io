const canvas = document.getElementById("water");
if (!canvas) throw new Error("water canvas missing");
const ctx = canvas.getContext("2d");
const dpr = Math.min(window.devicePixelRatio || 1, 2);
let width = 0;
let height = 0;
let config = null;
let images = [];
let start = 0;
let last = 0;
let readySent = false;

function resize() {
  width = window.innerWidth * dpr;
  height = window.innerHeight * dpr;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener("resize", resize);

function valueAt(kf, t) {
  if (!kf || !kf.length) return undefined;
  if (kf.length === 1) return kf[0].v;
  if (t <= kf[0].t) return kf[0].v;
  const n = kf.length - 1;
  if (t >= kf[n].t) return kf[n].v;
  for (let i = 0; i < n; i++) {
    const a = kf[i], b = kf[i + 1];
    if (t >= a.t && t <= b.t) {
      const p = (t - a.t) / Math.max(b.t - a.t, 0.0001);
      return a.v + (b.v - a.v) * p;
    }
  }
  return kf[n].v;
}

function frame(ts) {
  requestAnimationFrame(frame);
  if (!config) return;
  if (!start) start = ts;
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;
  const elapsed = (ts - start) / 1000;
  const dur = Math.max(config.duration || 10, 0.1);
  const t = config.loop === false ? Math.min(elapsed, dur) : elapsed % dur;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = config.color || "#000000";
  ctx.fillRect(0, 0, width, height);
  const layers = config.layers || [];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const img = images[li];
    if (L.visible === false || !img || !img.naturalWidth) continue;
    const tracks = L.tracks || {};
    const sx = tracks.x ? (valueAt(tracks.x, t) || 0) : 0;
    const sy = tracks.y ? (valueAt(tracks.y, t) || 0) : 0;
    const sc = (tracks.scale ? (valueAt(tracks.scale, t) || 100) : 100) / 100;
    const rot = ((tracks.rot ? (valueAt(tracks.rot, t) || 0) : 0) * Math.PI) / 180;
    const op = (tracks.op ? valueAt(tracks.op, t) : 100) ?? 100;
    const cover = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const dw = img.naturalWidth * cover * sc;
    const dh = img.naturalHeight * cover * sc;
    ctx.save();
    ctx.translate(width / 2 + (sx / 100) * width, height / 2 + (sy / 100) * height);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, op / 100));
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (!readySent) {
    readySent = true;
    window.dispatchEvent(new Event("waterready"));
  }
}

async function load() {
  try {
    const res = await fetch(new URL("background.json", import.meta.url));
    config = await res.json();
  } catch (e) {
    config = { color: "#000000", layers: [] };
  }
  const layers = config.layers || [];
  images = new Array(layers.length);
  await Promise.all(layers.map((L, i) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[i] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = new URL(L.file, import.meta.url).href;
  })));
  resize();
  requestAnimationFrame(frame);
}

load();
