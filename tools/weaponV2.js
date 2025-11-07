// tools/weaponV2.js (siempre captura: modo 'weapon' - profundo)
const { fetchWithFallback } = require('./fetch-fallback');
const fs = require('fs');
const path = require('path');

async function run(urls) {
  for (const url of urls) {
    console.log(`[WEAPONV2] procesando ${url}`);
    // Forzamos puppeteer en modo weapon para capturas profundas
    const res = await fetchWithFallback(url, {
      timeout: 60000,
      puppetOptions: {
        headless: false
        // proxy: 'http://ip:port',
        // proxyAuth: { username:'user', password:'pass' },
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      },
      mode: 'weapon',
      forceFallback: true,
      alwaysCapture: true
    });

    if (res.method === 'axios') {
      const host = new URL(url).hostname.replace(/[:\/\\]/g,'-');
      const outDir = path.join(process.cwd(), 'output', `${host}-${Date.now()}`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'page-desktop.html'), res.data, 'utf8');
      console.log(`[WEAPONV2] Guardado HTML axios en ${outDir}`);
    } else if (res.method === 'puppeteer') {
      fs.writeFileSync(path.join(res.outputFolder, 'marker.txt'), 'captura hecha por weaponV2', 'utf8');
      console.log(`[WEAPONV2] Capturas generadas en ${res.outputFolder}`);
    } else {
      console.error(`[WEAPONV2] Falló al obtener ${url}:`, res.error || 'unknown');
    }
  }
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Uso: node tools/weaponV2.js <url1> <url2> ...');
  process.exit(1);
}
run(args).catch(e => { console.error(e); process.exit(1); });
