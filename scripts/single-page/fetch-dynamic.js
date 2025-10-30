// fetch-dynamic.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) return console.error('Uso: node fetch-dynamic.js <url>');

  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = path.join(process.cwd(),'fetch-results', ts);
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width:1366, height:768 } });
  const page = await context.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  // esperar animaciones iniciales
  await page.waitForTimeout(3000);

  // forzar lazy-load con scroll
  await page.evaluate(async () => {
    await new Promise((res) => {
      let total=0; const step=400; const t=setInterval(()=>{ window.scrollBy(0,step); total+=step; if(total>=document.body.scrollHeight){clearInterval(t);res();} },300);
    });
  });

  // screenshots
  await page.screenshot({ path: path.join(out,'fullpage-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out,'fullpage-mobile.png'), fullPage: true });

  // guardar HTML
  const html = await page.content();
  fs.writeFileSync(path.join(out,'page.html'), html, 'utf8');

  // recursos
  const resources = await page.evaluate(()=>Array.from(document.querySelectorAll('link[href], script[src], img[src]')).map(n=>({tag:n.tagName, src:n.href||n.src}))).catch(()=>[]);
  fs.writeFileSync(path.join(out,'resources.json'), JSON.stringify(resources, null,2));

  fs.writeFileSync(path.join(out,'fetch_info.txt'), `url: ${url}\nfetched_at: ${new Date().toISOString()}\n`);
  await browser.close();
  console.log('Fetch dynamic completo en:', out);
})();
