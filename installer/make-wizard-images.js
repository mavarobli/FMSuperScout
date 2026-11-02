// Genereert de Inno Setup-wizardafbeeldingen in app-stijl (donker + accentgroen).
// Puur Node, geen dependencies: supersampled getekend en als 24-bit BMP geschreven
// (Inno accepteert alleen BMP). Kleuren = app/style.css.
'use strict';
const fs = require('fs');
const path = require('path');

// App-kleuren (style.css)
const BG_TOP = [0x11, 0x13, 0x30];      // --bg
const BG_BOT = [0x1f, 0x23, 0x52];      // --bg3
const ACCENT = [0x5b, 0x46, 0xb8];      // --accent (gedempt violet)
const TEXT = [0xe9, 0xeb, 0xfa];
// Embleem-groen (zelfde als icon.ico)

const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];

// ---- het app-embleem (zelfde tekening als make-icon.js), op (ox,oy) met grootte E ----
function emblem(x, y, ox, oy, E) {
  const lx = x - ox, ly = y - oy;
  if (lx < 0 || ly < 0 || lx >= E || ly >= E) return null;
  const u = v => v / 64 * E;
  const rr = u(16), m = u(2);
  const inX = Math.min(Math.max(lx, m + rr), E - m - rr);
  const inY = Math.min(Math.max(ly, m + rr), E - m - rr);
  if (Math.hypot(lx - inX, ly - inY) > rr || lx < m || lx > E - m || ly < m || ly > E - m) return null;
  // Middencirkel (logo B), zelfde verloop als app/logo.svg.
  let c = mix3([0x6e, 0x59, 0xcc], [0x3f, 0x2f, 0x8f], (lx + ly) / (2 * E));
  const cx = u(32), cy = u(32), d = Math.hypot(lx - cx, ly - cy);
  if (Math.abs(ly - cy) < u(1)) c = mix3(c, [255, 255, 255], 0.28);
  if (Math.abs(d - u(14)) < u(2.5) || d < u(4.5)) c = [255, 255, 255];
  return c;
}

// ---- zijbanner (welkomst-/afsluitpagina): donkere gradient + veldlijnen + embleem ----
function drawSide(W, H) {
  return (x, y) => {
    let c = mix3(BG_TOP, BG_BOT, y / H);
    // subtiel veld onderin: middenlijn + middencirkel (zoals een pitch van boven)
    const fy = H * 0.72, fr = W * 0.34;
    if (Math.abs(y - fy) < H * 0.0022 + 0.6) c = mix3(c, TEXT, 0.07);
    const dc = Math.hypot(x - W / 2, y - fy);
    if (Math.abs(dc - fr) < 1.1) c = mix3(c, TEXT, 0.09);
    if (dc < 2.2) c = mix3(c, TEXT, 0.10);
    // accentstreep onderaan (app-stijl)
    if (y > H - Math.max(3, H * 0.012)) c = mix3(ACCENT, BG_BOT, 0.15);
    // embleem in het bovenste derde deel
    const E = Math.round(W * 0.55);
    const e = emblem(x, y, (W - E) / 2, H * 0.16, E);
    if (e) c = e;
    return c;
  };
}

// ---- klein headerbeeld (rechtsboven op de binnenpagina's): embleem op wit ----
function drawSmall(W, H) {
  return (x, y) => {
    const E = Math.min(W, H) - 6;
    const e = emblem(x, y, (W - E) / 2, (H - E) / 2, E);
    return e || [255, 255, 255];
  };
}

// ---- supersampled renderen naar 24-bit BMP (bottom-up, BGR, rijen gepad op 4) ----
function renderBmp(file, W, H, drawFn, ss = 3) {
  const fn = drawFn(W * ss, H * ss);
  const rowLen = Math.ceil(W * 3 / 4) * 4;
  const data = Buffer.alloc(rowLen * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0;
      for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) {
        const c = fn(x * ss + dx, y * ss + dy);
        r += c[0]; g += c[1]; b += c[2];
      }
      const n = ss * ss, o = (H - 1 - y) * rowLen + x * 3;
      data[o] = Math.round(b / n); data[o + 1] = Math.round(g / n); data[o + 2] = Math.round(r / n);
    }
  }
  const head = Buffer.alloc(54);
  head.write('BM', 0, 'latin1');
  head.writeUInt32LE(54 + data.length, 2); head.writeUInt32LE(54, 10);
  head.writeUInt32LE(40, 14); head.writeInt32LE(W, 18); head.writeInt32LE(H, 22);
  head.writeUInt16LE(1, 26); head.writeUInt16LE(24, 28); head.writeUInt32LE(data.length, 34);
  fs.writeFileSync(path.join(__dirname, file), Buffer.concat([head, data]));
  console.log(`${file}: ${W}x${H}`);
}

// Basis + 2x-varianten; Inno kiest per DPI de best passende uit de lijst.
renderBmp('wizard-side.bmp', 164, 314, drawSide);
renderBmp('wizard-side-2x.bmp', 328, 628, drawSide);
renderBmp('wizard-small.bmp', 55, 58, drawSmall);
renderBmp('wizard-small-2x.bmp', 110, 116, drawSmall);
