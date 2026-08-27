/* Pixel-statistics analysis: verifies the cinematic composition targets
   without human eyes — dark navy frame, blue dominance, bright iris
   annulus around a dark pupil, dark corners. */
import { PNG } from 'pngjs';
import fs from 'node:fs';

const file = process.argv[2];
const png = PNG.sync.read(fs.readFileSync(file));
const { width: W, height: H, data } = png;

const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

let rSum = 0, gSum = 0, bSum = 0, lSum = 0;
let darkPixels = 0;

const region = (x0, y0, x1, y1) => {
  let l = 0, n = 0, r = 0, g = 0, b = 0;
  for (let y = Math.floor(y0); y < y1; y += 2) {
    for (let x = Math.floor(x0); x < x1; x += 2) {
      const i = (y * W + x) * 4;
      l += lum(i); r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  return { l: l / n, r: r / n, g: g / n, b: b / n, n };
};

for (let y = 0; y < H; y += 2) {
  for (let x = 0; x < W; x += 2) {
    const i = (y * W + x) * 4;
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2];
    lSum += lum(i);
    if (lum(i) < 10) darkPixels++;
  }
}
const total = (Math.ceil(W / 2) * Math.ceil(H / 2));
const cx = W / 2, cy = H / 2;

/* locate the true pupil: darkest 12x12 box within ±48px of screen center
   (the camera drifts and aims subtly, so the pupil is rarely dead-center) */
let bestX = cx, bestY = cy, bestL = Infinity;
for (let oy = -48; oy <= 48; oy += 4) {
  for (let ox = -48; ox <= 48; ox += 4) {
    const reg = region(cx + ox - 6, cy + oy - 6, cx + ox + 6, cy + oy + 6);
    if (reg.l < bestL) { bestL = reg.l; bestX = cx + ox; bestY = cy + oy; }
  }
}
console.log(`pupil located at ${bestX.toFixed(0)},${bestY.toFixed(0)} (offset ${((bestX - cx)).toFixed(0)},${((bestY - cy)).toFixed(0)})`);

const pupil = region(bestX - 8, bestY - 8, bestX + 8, bestY + 8);

// annulus sampled INSIDE the iris disc, centered on the located pupil
const annulusPoints = [];
{
  const pxPerUnit = H / (2 * Math.tan((45 / 2) * (Math.PI / 180)) * 7.6);
  const rr = 1.02 * pxPerUnit * 0.72;
  for (let a = 0; a < 360; a += 2) {
    const x = Math.round(bestX + Math.cos((a * Math.PI) / 180) * rr);
    const y = Math.round(bestY + Math.sin((a * Math.PI) / 180) * rr);
    if (x > 0 && x < W && y > 0 && y < H) {
      const i = (y * W + x) * 4;
      annulusPoints.push(lum(i));
    }
  }
}
const annulus = annulusPoints.reduce((a, b) => a + b, 0) / annulusPoints.length;

const corners = [
  region(0, 0, W * 0.16, H * 0.2),
  region(W * 0.84, 0, W, H * 0.2),
  region(0, H * 0.8, W * 0.16, H),
  region(W * 0.84, H * 0.8, W, H),
];
const cornerLum = corners.reduce((a, c) => a + c.l, 0) / 4;

const mid = region(W * 0.4, H * 0.35, W * 0.6, H * 0.65);

console.log(`file            ${file}`);
console.log(`mean RGB        ${((rSum / total) | 0)}, ${((gSum / total) | 0)}, ${((bSum / total) | 0)}`);
console.log(`mean luminance  ${(lSum / total).toFixed(2)} / 255`);
console.log(`dark (<10)      ${((100 * darkPixels) / total).toFixed(1)} %`);
console.log(`pupil lum       ${pupil.l.toFixed(2)}  (want: very dark)`);
console.log(`iris annulus    ${annulus.toFixed(2)}  (want: >> pupil & corners)`);
console.log(`corner lum      ${cornerLum.toFixed(2)}  (want: very dark)`);
console.log(`center box      ${mid.l.toFixed(2)}`);
console.log(`blue/red ratio  ${(bSum / Math.max(rSum, 1)).toFixed(2)}  (BLUE want: > 2)`);
console.log(`red/blue ratio  ${(rSum / Math.max(bSum, 1)).toFixed(2)}  (RED want: > 2)`);
console.log(`annulus/pupil   ${(annulus / Math.max(pupil.l, 0.5)).toFixed(1)}x  (want: > 6)`);
console.log(`annulus/corner  ${(annulus / Math.max(cornerLum, 0.5)).toFixed(1)}x  (want: > 4)`);
