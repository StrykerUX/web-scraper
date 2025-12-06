// tools/cortanaV2.js (siempre captura: modo 'cortana')
const { fetchWithFallback } = require('./fetch-fallback');
const fs = require('fs');
const path = require('path');

async function run(urls) {
  for (const url of urls) {
    console.log(`[CORTANAv2] procesando ${url}`);
    // Guardar HTML con axios y luego ejecutar Puppeteer para capturas (modo 'cortana')
    const res = await fetchWithFallback(url, {
      timeout: 30000,
      puppetOptions: {
        headless: false
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      },
      mode: 'cortana',
      forceFallback: true,    // forzamos puppeteer
      alwaysCapture: true     // opcional para asegurar captura aunque axios devuelva 200
    });

    if (res.method === 'axios') {
      // en caso raro de retorno axios puro (no debería pasar con force), guardamos html
      const host = new URL(url).hostname.replace(/[:\/\\]/g,'-');
      const outDir = path.join(process.cwd(), 'output', `${host}-${Date.now()}`);
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'page-desktop.html'), res.data, 'utf8');
      console.log(`[CORTANAv2] Guardado HTML axios en ${outDir}`);
    } else if (res.method === 'puppeteer') {
      fs.writeFileSync(path.join(res.outputFolder, 'marker.txt'), 'captura hecha por cortanaV2', 'utf8');
      console.log(`[CORTANAv2] Capturas generadas en ${res.outputFolder}`);
    } else {
      console.error(`[CORTANAv2] Falló al obtener ${url}:`, res.error || 'unknown');
    }
  }
}

const args = process.argv.slice(2);
if (!args.length) {
  console.error('Uso: node tools/cortanaV2.js <url1> <url2> ...');
  process.exit(1);
}
run(args).catch(e => { console.error(e); process.exit(1); });
