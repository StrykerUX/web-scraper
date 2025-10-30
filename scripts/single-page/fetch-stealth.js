// fetch-stealth.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-extra');
const stealth = require('@extra/playwright-stealth');
chromium.use(stealth());

(async ()=>{
  const url = process.argv[2]; if(!url) return console.error('Uso: node fetch-stealth.js <url>');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = path.join(process.cwd(),'fetch-results', `stealth-${ts}`); fs.mkdirSync(out,{recursive:true});

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil:'networkidle', timeout:120000 });

  // interacción humana simulada
  for(let i=0;i<3;i++){ await page.mouse.move(200+i*10,200+i*5,{steps:8}); await page.waitForTimeout(600); }

  const html = await page.content(); fs.writeFileSync(path.join(out,'page.html'), html,'utf8');
  await page.screenshot({ path: path.join(out,'screenshot.png'), fullPage: true });

  const resources = await page.evaluate(()=>{ return { css: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l=>l.href), scripts: Array.from(document.querySelectorAll('script[src]')).map(s=>s.src) }; });
  fs.writeFileSync(path.join(out,'resources.json'), JSON.stringify(resources,null,2),'utf8');

  await browser.close(); console.log('Fetch stealth completo en:', out);
})();
