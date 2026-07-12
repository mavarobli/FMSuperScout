// Genereert icon.ico (256/64/32/16) uit een programmatisch getekend FMSuperScout-embleem.
// Puur Node, geen dependencies: tekent supersampled, encodeert PNG en verpakt als ICO.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GREEN_TOP = [63, 191, 116], GREEN_BOT = [44, 155, 86], WHITE = [255, 255, 255];

// Teken het embleem op een SS×size canvas (RGBA), daarna downsamplen.
function drawBase(N) {
  const px = new Float32Array(N * N * 4);
  const set = (x, y, r, g, b, a) => { const i = (y * N + x) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a; };
  const S = N; // schaalfactor t.o.v. 64-grid
  const u = v => v / 64 * S;
  const rr = u(15);                       // hoekradius
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // afgeronde vierkant-achtergrond (met rand-marge 2/64)
      const m = u(2);
      const inX = Math.min(Math.max(x, m + rr), S - m - rr);
      const inY = Math.min(Math.max(y, m + rr), S - m - rr);
      const dCorner = Math.hypot(x - inX, y - inY);
      const inside = (x >= m && x <= S - m && y >= m && y <= S - m) && dCorner <= rr;
      if (!inside) { set(x, y, 0, 0, 0, 0); continue; }
      const tg = y / N;
      let r = GREEN_TOP[0] + (GREEN_BOT[0] - GREEN_TOP[0]) * tg;
      let g = GREEN_TOP[1] + (GREEN_BOT[1] - GREEN_TOP[1]) * tg;
      let b = GREEN_TOP[2] + (GREEN_BOT[2] - GREEN_TOP[2]) * tg;
      // subtiele veldlijnen
      const cx = u(32), cy = u(32);
      if (Math.abs(y - cy) < u(0.7) && x > u(10) && x < u(54)) { r = mix(r, 255, .16); g = mix(g, 255, .16); b = mix(b, 255, .16); }
      const dc = Math.hypot(x - cx, y - cy);
      if (Math.abs(dc - u(9)) < u(0.7)) { r = mix(r, 255, .16); g = mix(g, 255, .16); b = mix(b, 255, .16); }
      // vergrootglas: ring rond (28,27) r=12.5 dik 4.4; lens gevuld r=5.2; steel
      const lx = u(28), ly = u(27);
      const dl = Math.hypot(x - lx, y - ly);
      if (Math.abs(dl - u(12.5)) < u(2.2)) { [r, g, b] = WHITE; }         // ring
      else if (dl < u(5.2)) { r = mix(255, r, .08); g = mix(255, g, .08); b = mix(255, b, .08); } // lens
      // steel: geroteerde balk van (37.5,36.5) richting rechtsonder
      const hx = x - u(37.5), hy = y - u(36.5);
      const rot = (hx + hy) / Math.SQRT2, perp = (hy - hx) / Math.SQRT2;
      if (rot > 0 && rot < u(15.5) && Math.abs(perp) < u(3.1)) { [r, g, b] = WHITE; }
      set(x, y, r, g, b, 255);
    }
  }
  return px;
}
const mix = (a, b, t) => a + (b - a) * t;

// Downsample (box filter) van SS×N naar size×size → Uint8 RGBA.
function render(size, ss = 4) {
  const N = size * ss;
  const base = drawBase(N);
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < ss; dy++) for (let dx = 0; dx < ss; dx++) {
      const i = ((y * ss + dy) * N + (x * ss + dx)) * 4;
      const al = base[i + 3] / 255;
      r += base[i] * al; g += base[i + 1] * al; b += base[i + 2] * al; a += base[i + 3];
    }
    const n = ss * ss, aa = a / n;
    const o = (y * size + x) * 4;
    const alpha = aa / 255 || 1e-6;
    out[o] = Math.round(r / n / alpha); out[o + 1] = Math.round(g / n / alpha);
    out[o + 2] = Math.round(b / n / alpha); out[o + 3] = Math.round(aa);
  }
  return out;
}

// PNG-encoder (truecolor+alpha).
function crc32(buf) { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'latin1');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function toPng(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ICO-container met PNG-frames.
function toIco(frames) {
  const n = frames.length;
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(n, 4);
  const dir = Buffer.alloc(16 * n);
  let offset = 6 + 16 * n;
  const datas = [];
  frames.forEach((f, i) => {
    dir[i * 16] = f.size >= 256 ? 0 : f.size;
    dir[i * 16 + 1] = f.size >= 256 ? 0 : f.size;
    dir.writeUInt16LE(1, i * 16 + 4); dir.writeUInt16LE(32, i * 16 + 6);
    dir.writeUInt32LE(f.png.length, i * 16 + 8);
    dir.writeUInt32LE(offset, i * 16 + 12);
    offset += f.png.length; datas.push(f.png);
  });
  return Buffer.concat([head, dir, ...datas]);
}

const sizes = [256, 64, 48, 32, 16];
const frames = sizes.map(s => ({ size: s, png: toPng(render(s), s) }));
const out = path.join(__dirname, 'icon.ico');
fs.writeFileSync(out, toIco(frames));
console.log('icon.ico geschreven:', fs.statSync(out).size, 'bytes,', sizes.length, 'formaten');
// ook een 256-PNG voor documentatie/store
fs.writeFileSync(path.join(__dirname, 'icon-256.png'), frames[0].png);
