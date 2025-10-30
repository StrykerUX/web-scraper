// fetch-static.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const url = process.argv[2];
  if (!url) return console.error('Uso: node fetch-static.js <url>');

  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = path.join(process.cwd(),'fetch-results', ts);
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.screenshot({ path: path.join(out,'screenshot_desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(out,'screenshot_mobile.png'), fullPage: true });

  const html = await page.content();
  fs.writeFileSync(path.join(out,'page.html'), html, 'utf8');

  const resources = await page.evaluate(()=>Array.from(document.querySelectorAll('link[href], script[src]')).map(n=>n.href||n.src));
  fs.writeFileSync(path.join(out,'resources.json'), JSON.stringify(resources, null, 2));

  fs.writeFileSync(path.join(out,'fetch_info.txt'), `url: ${url}\nfetched_at: ${new Date().toISOString()}\n`);
  await browser.close();
  console.log('Fetch static completo en:', out);
})();
