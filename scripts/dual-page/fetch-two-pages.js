#!/usr/bin/env node
// fetch-two-pages.js (versión con carpetas timestamp por ejecución)
// Uso: node fetch-two-pages.js "https://url1" "https://url2" [--clientData ./cliente.json]
// Requiere: pnpm add -D playwright

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function nowTimestamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const min = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}

async function fetchAndSummarize(browser, url, id, outDir) {
  const page = await browser.newPage({ userAgent: 'fetcher-bot/1.0' });
  try {
    console.log(`[${id}] Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  } catch(e) {
    console.warn(`[${id}] Error al cargar página: ${e.message}`);
  }

  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForTimeout(1000);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const screenshotPath = path.join(outDir, `${id}_full.png`);
  try { await page.screenshot({ path: screenshotPath, fullPage: true }); }
  catch(e){ console.warn(`[${id}] No pudo tomar screenshot: ${e.message}`); }

  const htmlPath = path.join(outDir, `${id}.html`);
  const content = await page.content();
  fs.writeFileSync(htmlPath, content, 'utf8');

  const summary = await page.evaluate(() => {
    const metas = Array.from(document.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name') || m.getAttribute('property') || null,
      content: m.getAttribute('content') || null
    })).filter(x=>x.content);

    const headings = [];
    for (let i=1;i<=4;i++) {
      headings.push(...Array.from(document.querySelectorAll('h'+i)).map(h=>({
        tag:'h'+i, text: h.innerText.trim().slice(0,200), classes: h.className
      })));
    }

    const imgs = Array.from(document.images).map(i=>({
      src: i.currentSrc || i.src, alt: i.alt || null,
      w: i.naturalWidth || null, h: i.naturalHeight || null
    }));

    const forms = Array.from(document.forms).map(f=>({
      id:f.id||null, action:f.action||null, method:f.method||null,
      inputs: Array.from(f.querySelectorAll('input,textarea,select,button'))
        .map(i=>({type:i.type||i.tagName, name: i.name||i.id||null, placeholder: i.placeholder||null}))
    }));

    const navs = Array.from(document.querySelectorAll('nav a')).map(a=>({
      text: a.innerText.trim().slice(0,120), href: a.href, classes: a.className
    }));

    const sections = Array.from(document.querySelectorAll('main, section, [role="main"], header, footer'))
      .map(el => {
        const h = el.querySelector('h1,h2,h3');
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : {width:0,height:0};
        return {
          tag: el.tagName.toLowerCase(), id: el.id||null,
          heading: h ? h.innerText.trim().slice(0,200) : null,
          classes: el.className, area: Math.round(rect.width*rect.height)
        };
      }).sort((a,b)=>b.area-a.area).slice(0,12);

    return { url: location.href, title: document.title, metas, headings, imgs: imgs.slice(0,100), forms, navs, sections };
  });

  const summaryPath = path.join(outDir, `${id}_summary.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(Object.assign({}, summary, { screenshot: screenshotPath, htmlFile: htmlPath }), null, 2), 'utf8');

  await page.close();
  console.log(`[${id}] Completado: summary -> ${summaryPath}`);
  return { summaryPath, summary };
}

(async ()=>{
  const argv = process.argv.slice(2);
  let clientDataPath = null;
  if (argv.includes('--clientData')) {
    const i = argv.indexOf('--clientData');
    clientDataPath = argv[i+1] || null;
    argv.splice(i, 2);
  }
  if (argv.length < 2) {
    console.error("Uso: node fetch-two-pages.js <url1> <url2> [--clientData ./cliente.json]");
    process.exit(1);
  }
  const [url1, url2] = argv;

  const baseOutRoot = path.join(process.cwd(),'fetch-results');
  if (!fs.existsSync(baseOutRoot)) fs.mkdirSync(baseOutRoot, { recursive: true });

  const ts = nowTimestamp();
  const runFolder = path.join(baseOutRoot, ts);
  const hostnameSafe = (u) => {
    try { const h = new URL(u).hostname.replace(/[:<>"\/\\|?*\s]/g,'-'); return h; } catch(e) { return 'host'; }
  };
  const ref1Folder = path.join(runFolder, `ref1_${hostnameSafe(url1)}`);
  const ref2Folder = path.join(runFolder, `ref2_${hostnameSafe(url2)}`);

  fs.mkdirSync(ref1Folder, { recursive: true });
  fs.mkdirSync(ref2Folder, { recursive: true });

  let clientData = null;
  if (clientDataPath && fs.existsSync(clientDataPath)) {
    try { clientData = JSON.parse(fs.readFileSync(clientDataPath,'utf8')); console.log("Client data cargada:", clientDataPath); }
    catch(e){ console.warn("No pude leer clientData:", e.message); }
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const r1 = await fetchAndSummarize(browser, url1, 'ref1', ref1Folder);
    const r2 = await fetchAndSummarize(browser, url2, 'ref2', ref2Folder);

    const combined = {
      timestamp: ts,
      runFolder: path.relative(process.cwd(), runFolder),
      date: new Date().toISOString(),
      url1: r1.summary.url,
      url2: r2.summary.url,
      title1: r1.summary.title,
      title2: r2.summary.title,
      topHeadings1: r1.summary.headings.slice(0,8),
      topHeadings2: r2.summary.headings.slice(0,8),
      imgs1: r1.summary.imgs.slice(0,12),
      imgs2: r2.summary.imgs.slice(0,12),
      sections1: r1.summary.sections,
      sections2: r2.summary.sections,
      clientData: clientData || null,
      recommendedComponents: []
    };

    const comps = new Set(['header', 'footer', 'hero']);
    if ((r1.summary.imgs?.length > 3) || (r2.summary.imgs?.length > 3)) comps.add('gallery');
    if ((r1.summary.forms?.length > 0) || (r2.summary.forms?.length > 0)) comps.add('contact_form');
    combined.recommendedComponents = Array.from(comps);

    const combinedPath = path.join(runFolder,'combined_summary.json');
    fs.writeFileSync(combinedPath, JSON.stringify(combined, null, 2), 'utf8');
    console.log("✅ Combined saved to", combinedPath);
    await browser.close();
    process.exit(0);
  } catch(e) {
    console.error("Error general:", e);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
