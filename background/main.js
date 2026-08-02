const canvas = document.getElementById("water");
const ctx = canvas.getContext("2d");

const SRC = "/background/water.jpg";
const TINT = canvas.dataset.tint || null;

const SPEED = 30;
const MAX_TILT = (25 * Math.PI) / 180;
const PERIOD = 16;
const V_BUFFER = 1.15;
const CROP = 1;

let img = new Image();
img.src = SRC;

let width = 0;
let height = 0;
let dpr = 1;
let tile = 0;
let offsetX = 0;
let start = 0;
let last = 0;
let readySent = false;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth * dpr;
  height = window.innerHeight * dpr;
  canvas.width = width;
  canvas.height = height;
  tile = height * V_BUFFER;
}

window.addEventListener("resize", resize);

function frame(ts) {
  requestAnimationFrame(frame);
  if (!img.complete || img.naturalWidth === 0) return;

  if (!start) start = ts;
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.05);
  last = ts;

  const elapsed = (ts - start) / 1000;
  const angle = MAX_TILT * Math.sin((elapsed / PERIOD) * 2 * Math.PI);
  offsetX = (offsetX + SPEED * dpr * dt) % tile;

  const c = Math.cos(angle);
  const s = Math.sin(angle);

  ctx.fillStyle = "#05141f";
  ctx.fillRect(0, 0, width, height);

  const hw = width / 2;
  const hh = height / 2;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [dx, dy] of [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh]]) {
    const rx = dx * c + dy * s;
    const ry = -dx * s + dy * c;
    if (rx < minX) minX = rx;
    if (rx > maxX) maxX = rx;
    if (ry < minY) minY = ry;
    if (ry > maxY) maxY = ry;
  }

  const sw = img.naturalWidth - CROP * 2;
  const sh = img.naturalHeight - CROP * 2;

  const j0 = Math.floor((minX + offsetX) / tile) - 1;
  const j1 = Math.ceil((maxX + offsetX) / tile) + 1;
  const i0 = Math.floor(minY / tile) - 1;
  const i1 = Math.ceil(maxY / tile) + 1;

  ctx.save();
  ctx.translate(hw, hh);
  ctx.rotate(angle);
  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const x = j * tile - offsetX;
      const y = i * tile;
      ctx.drawImage(img, CROP, CROP, sw, sh, x - tile / 2, y - tile / 2, tile, tile);
    }
  }
  ctx.restore();

  if (TINT) {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = TINT;
    ctx.fillRect(0, 0, width, height);
  }

  if (!readySent) {
    readySent = true;
    window.dispatchEvent(new Event("waterready"));
  }
}

img.onload = () => {
  resize();
  requestAnimationFrame(frame);
};

resize();
