/* tools/fetch-fallback.js (corregido: reemplazado waitForTimeout por sleep) */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(StealthPlugin);

// devices helper (fallback a puppeteer si es necesario)
let devices;
try {
  devices = require('puppeteer').devices;
} catch (e) {
  devices = {};
}

function makeOutputFolder(url) {
  const u = new URL(url);
  const host = u.hostname.replace(/[:\/\\]/g, '-');
  const ts = Date.now();
  const base = path.join(process.cwd(), 'output', 'sala', `${host}-${ts}`);
  fs.mkdirSync(base, { recursive: true });
  return base;
}

async function tryAxios(url, timeout = 30000) {
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': url
      },
      timeout,
      maxRedirects: 5,
      validateStatus: () => true
    });
    return { ok: true, status: res.status, headers: res.headers, data: res.data };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function writeJSON(file, obj) {
  try { fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); } catch (e) {}
}

/* sleep util (compatible con cualquier versión) */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Desktop viewport + fullpage */
async function captureDesktop(page, output, namePrefix = 'desktop') {
  await page.setViewport({ width: 1366, height: 768 });
  const vpPath = path.join(output, `${namePrefix}-viewport.png`);
  await page.screenshot({ path: vpPath, fullPage: false });
  const fullPath = path.join(output, `${namePrefix}-fullpage.png`);
  await page.screenshot({ path: fullPath, fullPage: true });
  return { vpPath, fullPath };
}

/** Mobile emulation (iPhone X if available) */
async function captureMobile(page, output, namePrefix = 'mobile') {
  try {
    const device = (devices && devices['iPhone X']) ? devices['iPhone X'] : null;
    if (device) {
      await page.emulate(device);
    } else {
      await page.setViewport({ width: 375, height: 812, isMobile: true });
    }
    const mobilePath = path.join(output, `${namePrefix}.png`);
    await page.screenshot({ path: mobilePath, fullPage: false });
    // revert viewport to desktop afterwards
    await page.setViewport({ width: 1366, height: 768 });
    return { mobilePath };
  } catch (e) {
    return {};
  }
}

/** Scroll and capture frames (for dynamic pages) */
async function captureScrollFrames(page, output, prefix = 'scroll-frame', maxFrames = 6) {
  const frames = [];
  try {
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight || document.documentElement.scrollHeight);
    const viewHeight = (await page.viewport()).height || 800;
    const steps = Math.max(1, Math.min(maxFrames, Math.ceil(bodyHeight / viewHeight)));
    let y = 0;
    const step = Math.max(Math.floor((bodyHeight - viewHeight) / Math.max(1, steps - 1)), Math.floor(viewHeight * 0.75));
    for (let i = 0; i < steps && y < bodyHeight; i++) {
      await page.evaluate(_y => window.scrollTo({ top: _y, behavior: 'instant' }), y);
      await sleep(700 + Math.random() * 800);
      const p = path.join(output, `${prefix}-${i + 1}.png`);
      await page.screenshot({ path: p, fullPage: false });
      frames.push(p);
      y += step;
    }
    const full = path.join(output, `${prefix}-full.png`);
    await page.screenshot({ path: full, fullPage: true });
    frames.push(full);
    await page.evaluate(() => window.scrollTo(0, 0));
  } catch (e) {}
  return frames;
}

/** Try to detect a common carousel and click next a few times */
async function tryInteractCarousel(page, output) {
  const selectors = ['.slick-next', '.swiper-button-next', '[data-carousel] .next', '.owl-next', '.carousel-control-next'];
  const interactions = [];
  try {
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) {
        for (let i = 0; i < 5; i++) {
          try {
            await el.click();
            await sleep(600 + Math.random() * 800);
            const p = path.join(output, `carousel-${sel.replace(/[^a-z0-9]/gi,'')}-${i + 1}.png`);
            await page.screenshot({ path: p, fullPage: false });
            interactions.push(p);
          } catch (e) { break; }
        }
        if (interactions.length) break;
      }
    }
  } catch (e) {}
  return interactions;
}

/** Puppeteer fallback with modes */
async function tryPuppeteer(url, opts = {}) {
  const output = makeOutputFolder(url);
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled'
  ];
  if (opts.proxy) args.push(`--proxy-server=${opts.proxy}`);

  const launchOpts = {
    headless: opts.headless === undefined ? false : !!opts.headless,
    args,
    defaultViewport: { width: opts.width || 1366, height: opts.height || 768 }
  };
  if (opts.executablePath) launchOpts.executablePath = opts.executablePath;

  const browser = await puppeteer.launch(launchOpts);
  try {
    const page = await browser.newPage();
    await page.setUserAgent(opts.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    await page.setExtraHTTPHeaders({ 'accept-language': 'es-ES,es;q=0.9,en;q=0.8' });
    if (opts.proxyAuth && opts.proxyAuth.username) {
      await page.authenticate({ username: opts.proxyAuth.username, password: opts.proxyAuth.password || '' });
    }
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const resp = await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeout || 60000 }).catch(() => null);
    const status = resp ? resp.status() : null;
    await sleep(opts.postLoadWait || 1000);

    // save html / cookies / headers
    const html = await page.content();
    fs.writeFileSync(path.join(output, 'page.html'), html, 'utf8');
    const cookies = await page.cookies();
    writeJSON(path.join(output, 'cookies.json'), cookies);
    if (resp) writeJSON(path.join(output, 'response-headers.json'), resp.headers());

    // always capture desktop
    await captureDesktop(page, output, 'desktop');

    // capture mobile (iPhone X emulation if available)
    await captureMobile(page, output, 'mobile');

    // mode-specific behavior
    const mode = (opts.mode || 'cortana').toLowerCase();
    if (mode === 'weapon') {
      // weapon: deeper capture for dynamic pages
      await sleep(1500 + Math.random() * 2000);
      const carouselShots = await tryInteractCarousel(page, output);
      const frames = await captureScrollFrames(page, output, 'scroll-frame', 8);
      // mobile after interactions
      await captureMobile(page, output, 'mobile-after-interact');
      writeJSON(path.join(output, 'weapon-meta.json'), { carouselShots, frames });
    } else {
      // cortana: short wait only
      await sleep(500 + Math.random() * 500);
    }

    await browser.close();
    return { ok: true, status, outputFolder: output };
  } catch (err) {
    try { await browser.close(); } catch (e) {}
    return { ok: false, error: err.message || String(err) };
  }
}

async function fetchWithFallback(url, opts = {}) {
  // opts: { forceFallback, timeout, puppetOptions: {...}, mode: 'cortana'|'weapon' }
  const puppetOptions = opts.puppetOptions || {};
  puppetOptions.mode = opts.mode || 'cortana';

  // Run axios first but we will still run puppeteer if forceFallback==true
  if (!opts.forceFallback) {
    const r = await tryAxios(url, opts.timeout || 30000);
    if (r.ok && r.status === 200 && !opts.alwaysCapture) {
      // return axios HTML when explicitly requested to skip heavy capture
      return { method: 'axios', status: r.status, data: r.data };
    }
    // otherwise continue to puppeteer
  }

  const puppetRes = await tryPuppeteer(url, puppetOptions);
  if (puppetRes.ok) {
    return { method: 'puppeteer', status: puppetRes.status, outputFolder: puppetRes.outputFolder };
  } else {
    return { method: 'failed', error: puppetRes.error };
  }
}

module.exports = { fetchWithFallback };
