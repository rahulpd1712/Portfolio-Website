import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

/**
 * Generates public/og-image.png (1200x630) with zero dependencies:
 * a hand-built 5x7 bitmap font, alpha blending, and a minimal PNG
 * encoder (zlib + CRC32). Run: npm run og
 */

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200;
const H = 630;

// 5x7 glyphs: one line per glyph, rows separated by spaces.
const FONT_DATA = `
A .###. #...# #...# ##### #...# #...# #...#
C .###. #...# #.... #.... #.... #...# .###.
D ####. #...# #...# #...# #...# #...# ####.
E ##### #.... #.... ####. #.... #.... #####
F ##### #.... #.... ####. #.... #.... #....
G .###. #...# #.... #.### #...# #...# .###.
H #...# #...# #...# ##### #...# #...# #...#
I ##### ..#.. ..#.. ..#.. ..#.. ..#.. #####
L #.... #.... #.... #.... #.... #.... #####
N #...# ##..# ##..# #.#.# #..## #..## #...#
O .###. #...# #...# #...# #...# #...# .###.
P ####. #...# #...# ####. #.... #.... #....
R ####. #...# #...# ####. #.#.. #..#. #...#
S .#### #.... #.... .###. ....# ....# ####.
T ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
U #...# #...# #...# #...# #...# #...# .###.
W #...# #...# #...# #.#.# #.#.# ##.## #...#
| ..#.. ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
/ ....# ....# ...#. ..#.. .#... #.... #....
{ ...## ..##. ..##. .##.. ..##. ..##. ...##
} ##... .##.. .##.. ..##. .##.. .##.. ##...
< ...## ..##. .##.. ##... .##.. ..##. ...##
> ##... ..##. ...## ....# ...## ..##. ##...
; ..##. ..##. ..... ..##. .##.. #.... #....
# .#.#. ##### .#.#. .#.#. ##### .#.#. .#.#.
( ..##. .##.. .#... .#... .#... .##.. ..##.
) .##.. ..##. ...#. ...#. ...#. ..##. .##..
SP ..... ..... ..... ..... ..... ..... .....
`;

const FONT = {};
FONT_DATA.trim().split('\n').forEach(function (line) {
  const parts = line.split(' ');
  FONT[parts[0]] = parts.slice(1);
});

const BG = [11, 13, 18];
const SURFACE = [20, 24, 33];
const BORDER = [40, 49, 64];
const TEXT = [241, 245, 249];
const MUTED = [161, 170, 184];
const ACCENT = [56, 189, 248];

const buf = Buffer.alloc(W * H * 4);

function fill(rgb, a) {
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    buf[o] = buf[o] * (1 - a) + rgb[0] * a;
    buf[o + 1] = buf[o + 1] * (1 - a) + rgb[1] * a;
    buf[o + 2] = buf[o + 2] * (1 - a) + rgb[2] * a;
    buf[o + 3] = 255;
  }
}

function rect(x, y, w, h, rgb, a) {
  const alpha = a === undefined ? 1 : a;
  for (let yy = Math.max(0, y); yy < Math.min(H, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(W, x + w); xx++) {
      const o = (yy * W + xx) * 4;
      buf[o] = buf[o] * (1 - alpha) + rgb[0] * alpha;
      buf[o + 1] = buf[o + 1] * (1 - alpha) + rgb[1] * alpha;
      buf[o + 2] = buf[o + 2] * (1 - alpha) + rgb[2] * alpha;
      buf[o + 3] = 255;
    }
  }
}

function circle(cx, cy, r, rgb, a) {
  const alpha = a === undefined ? 1 : a;
  const r2 = r * r;
  for (let yy = Math.max(0, cy - r); yy < Math.min(H, cy + r); yy++) {
    for (let xx = Math.max(0, cx - r); xx < Math.min(W, cx + r); xx++) {
      const dx = xx - cx;
      const dy = yy - cy;
      if (dx * dx + dy * dy <= r2) {
        const o = (yy * W + xx) * 4;
        buf[o] = buf[o] * (1 - alpha) + rgb[0] * alpha;
        buf[o + 1] = buf[o + 1] * (1 - alpha) + rgb[1] * alpha;
        buf[o + 2] = buf[o + 2] * (1 - alpha) + rgb[2] * alpha;
        buf[o + 3] = 255;
      }
    }
  }
}

function text(str, x, y, scale, rgb, a) {
  const alpha = a === undefined ? 1 : a;
  let cx = x;
  const upper = str.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    if (ch === ' ') {
      cx += 6 * scale;
      continue;
    }
    const glyph = FONT[ch] || FONT.SP;
    for (let r = 0; r < glyph.length; r++) {
      const row = glyph[r];
      for (let c = 0; c < row.length; c++) {
        if (row[c] === '#') rect(cx + c * scale, y + r * scale, scale, scale, rgb, alpha);
      }
    }
    cx += 6 * scale;
  }
  return cx - x;
}

// ---- composition ------------------------------------------------------------

fill(BG, 1);

// subtle dot grid
for (let y = 30; y < H; y += 40) {
  for (let x = 30; x < W; x += 40) rect(x, y, 2, 2, SURFACE, 1);
}

// accent bar + text block
rect(60, 84, 6, 236, ACCENT, 1);
text('// PORTFOLIO', 84, 88, 3, ACCENT, 1);
text('RAHUL PRASAD', 84, 140, 10, TEXT, 1);
text('CSE STUDENT | ASPIRING SOFTWARE ENGINEER', 84, 248, 3, MUTED, 1);

// glowing accent ball with halo (the intro's signature ball)
const bx = 985;
const by = 330;
for (let r = 110; r >= 16; r -= 2) {
  const t = 1 - r / 110;
  circle(bx, by, r, ACCENT, t * t * 0.5);
}
circle(bx, by, 15, ACCENT, 1);
circle(bx, by, 7, TEXT, 1);

// floating code symbols around the ball
const FLOAT = [
  ['{', 890, 130, 0.85], ['}', 1075, 165, 0.7], ['#', 965, 95, 0.9],
  ['<', 862, 430, 0.75], ['>', 1108, 398, 0.8], [';', 1038, 476, 0.65],
  ['/', 896, 540, 0.6], ['(', 1086, 252, 0.55], [')', 1010, 548, 0.7]
];
FLOAT.forEach(function (item) {
  text(item[0], item[1], item[2], 4, ACCENT, item[3]);
});

// footer rule
rect(84, 576, 1032, 3, BORDER, 1);

// ---- PNG encoding -----------------------------------------------------------

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const stride = W * 4;
const raw = Buffer.alloc((stride + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (stride + 1)] = 0; // filter: none
  buf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = path.join(rootDir, 'public', 'og-image.png');
fs.writeFileSync(out, png);
console.log('wrote ' + out + ' (' + png.length + ' bytes, ' + W + 'x' + H + ')');
