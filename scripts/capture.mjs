/* Headless capture: loads THE ENTITY with software WebGL (SwiftShader),
   collects console errors, and captures frames for pixel analysis. */
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const outDir = new URL('./shots/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const warnings = [];
page.on('console', (msg) => {
  const text = msg.text();
  if (msg.type() === 'error') errors.push(text.slice(0, 20000));
  else if (msg.type() === 'warning') warnings.push(text.slice(0, 300));
});
page.on('pageerror', (err) => errors.push(String(err).slice(0, 20000)));
page.on('pageerror', (err) => errors.push(String(err).slice(0, 600)));

const STATE = (process.env.STATE || 'blue').toLowerCase();
const url = `${BASE}/?quality=${process.env.QUALITY || 'low'}&state=${STATE}`;
console.log('goto', url);
await page.goto(url, { waitUntil: 'load', timeout: 60000 });

// wait for the WebGL canvas
await page.waitForSelector('canvas', { timeout: 30000 });
console.log('canvas found');

// park the virtual cursor off-center (a viewer's cursor exists somewhere)
await page.mouse.move(320, 520);

// let the intro finish and systems build
const waitMs = parseInt(process.env.WAIT || '14000', 10);
await page.waitForTimeout(waitMs);
try {
  await page.screenshot({ path: new URL('frame-idle.png', outDir).pathname, timeout: 120000 });
  console.log('shot: frame-idle.png');
} catch (e) {
  console.log('screenshot failed:', String(e).slice(0, 120));
}

// interact: move cursor toward the pupil
await page.mouse.move(760, 330);
await page.mouse.move(660, 350, { steps: 10 });
await page.mouse.move(645, 362, { steps: 5 });
await page.waitForTimeout(2500);
try {
  await page.screenshot({ path: new URL('frame-focus.png', outDir).pathname, timeout: 120000 });
  console.log('shot: frame-focus.png');
} catch {
  console.log('screenshot failed (focus)');
}

// click near the iris to trigger a shockwave
await page.mouse.move(700, 300, { steps: 4 });
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(900);
try {
  await page.screenshot({ path: new URL('frame-pulse.png', outDir).pathname, timeout: 120000 });
  console.log('shot: frame-pulse.png');
} catch {
  console.log('screenshot failed (pulse)');
}

// phase-accurate transition sequence, robust to slow (software) rendering.
// the app exposes window.__entity = { mix, behavior, t, target }
if (process.env.TRANSITION === '1') {
  const waitPhase = async (fn, label, timeout = 180000) => {
    try {
      await page.waitForFunction(fn, null, { timeout, polling: 200 });
      return true;
    } catch {
      console.log('phase wait timeout:', label);
      return false;
    }
  };
  const snap = async (name) => {
    try {
      await page.screenshot({ path: new URL(name, outDir).pathname, timeout: 120000 });
      console.log('shot:', name);
    } catch {
      console.log('screenshot failed:', name);
    }
  };

  // ---------- BLUE -> RED ----------
  await page.keyboard.press('r');
  await waitPhase(() => window.__entity && window.__entity.t > 0.35 && window.__entity.t < 0.6, 'b2r mid');
  await snap('frame-b2r-mid.png');
  await waitPhase(() => window.__entity && window.__entity.t >= 1 && window.__entity.mix > 0.95, 'red settled');
  await snap('frame-red.png');

  // ---------- RED -> BLUE (keyboard) ----------
  await page.keyboard.press('b');
  // early: energy drained, palette still red
  await waitPhase(() => window.__entity && window.__entity.t > 0.3 && window.__entity.t < 0.5, 'r2b early');
  await snap('frame-r2b-early.png');
  // late: palette turning, pulse just fired
  await waitPhase(() => window.__entity && window.__entity.t > 0.72 && window.__entity.t < 0.88, 'r2b shift');
  await snap('frame-r2b-shift.png');
  // settled
  await waitPhase(() => window.__entity && window.__entity.t >= 1 && window.__entity.mix < 0.05, 'blue settled');
  await snap('frame-blue-settled.png');

  // ---------- sanity: UI control path still switches (no reload) ----------
  try {
    await page.locator('.state-switch button:nth-child(3)').click({ timeout: 8000 });
    console.log('clicked RED control');
  } catch (e) {
    console.log('control click failed:', String(e).slice(0, 100));
  }
  const okRed = await waitPhase(() => window.__entity && window.__entity.target === 'RED', 'control -> RED', 30000);
  console.log('control path verified:', okRed);
}

// webgl sanity
const glinfo = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2');
  if (!gl) return 'NO WEBGL2';
  return gl.getParameter(gl.VERSION) + ' | ' + gl.getParameter(gl.RENDERER);
});
console.log('WebGL:', glinfo);

console.log('\n--- console errors:', errors.length);
fs.writeFileSync(new URL('./shots/console-errors.log', import.meta.url).pathname, errors.join('\n\n=====\n\n'));
console.log('full errors written to shots/console-errors.log');

await browser.close();
process.exit(errors.length > 0 ? 2 : 0);
