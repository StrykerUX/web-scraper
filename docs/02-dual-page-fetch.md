# Fetch de 2 Referencias con Playwright

Esta guía contiene el script para fetchear **2 páginas web simultáneamente** y fusionar lo mejor de ambas usando Claude Code.

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Flujo Visual](#flujo-visual)
3. [Script Principal: fetch-two-pages.js](#script-principal-fetch-two-pagesjs)
4. [Wrapper PowerShell: run-fetch.ps1](#wrapper-powershell-run-fetchps1)
5. [Funcionamiento del Script](#funcionamiento-del-script)
6. [Formato de Salida](#formato-de-salida)
7. [Ventajas y Desventajas](#ventajas-y-desventajas)
8. [Preparar para Claude Code](#preparar-para-claude-code)

---

## Resumen Ejecutivo

Este flujo te permite dar 2 URLs y obtener automáticamente:

- HTML renderizado (post-JS) de cada página
- Capturas full-page (PNG) de cada página
- Un `*_summary.json` por página con metadatos (headings, imágenes, forms, secciones detectadas, etc.)
- Un `combined_summary.json` con extractos de ambas páginas y recomendaciones de componentes
- Todo organizado en carpeta con timestamp: `fetch-results/<timestamp>/ref1_<host>/`, `ref2_<host>/`

### ¿Cuándo Usar Este Script?

- ✅ Quieres **fusionar** lo mejor de dos sitios web
- ✅ Tienes una referencia principal + una referencia alternativa
- ✅ Necesitas comparar estructuras de dos sitios similares
- ✅ Quieres que Claude Code decida qué componentes tomar de cada referencia

---

## Flujo Visual

```
   Input: 2 URLs
      ↓
┌─────────────────────┐
│  Crear carpeta      │
│  timestamp/         │
└─────────┬───────────┘
          ↓
    ┌─────┴─────┐
    ↓           ↓
┌───────┐   ┌───────┐
│ ref1/ │   │ ref2/ │
│ fetch │   │ fetch │
└───┬───┘   └───┬───┘
    │           │
    ├─ .html    ├─ .html
    ├─ .png     ├─ .png
    └─ .json    └─ .json
          ↓
┌─────────────────────┐
│ combined_summary    │
│ (heurísticas)       │
│ + componentes       │
└─────────────────────┘
```

---

## Script Principal: fetch-two-pages.js

### Código Completo

Guarda este archivo en `scripts/dual-page/fetch-two-pages.js`:

```javascript
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
```

### Cómo Usar

```powershell
node fetch-two-pages.js "https://url1.com" "https://url2.com"
```

Con datos del cliente (opcional):

```powershell
node fetch-two-pages.js "https://url1.com" "https://url2.com" --clientData ./cliente.json
```

---

## Wrapper PowerShell: run-fetch.ps1

Este wrapper facilita la ejecución del script en PowerShell.

### Código Completo

Guarda este archivo en `scripts/dual-page/run-fetch.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)][string]$url1,
    [Parameter(Mandatory=$true)][string]$url2,
    [string]$clientData = ""
)

Write-Host "Ejecutando fetch de dos páginas..."
Write-Host "1) $url1"
Write-Host "2) $url2"
if ($clientData -ne "") { Write-Host "ClientData:" $clientData }

$nodeCmd = "node .\fetch-two-pages.js `"$url1`" `"$url2`""
if ($clientData -ne "") { $nodeCmd = $nodeCmd + " --clientData `"$clientData`"" }

Invoke-Expression $nodeCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "El script JS terminó con código de error $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "Proceso completado. Revisa la carpeta fetch-results\<timestamp>\ref1_* y ref2_*" -ForegroundColor Green
```

### Cómo Usar

```powershell
.\run-fetch.ps1 -url1 "https://url1.com" -url2 "https://url2.com"
```

Con datos del cliente:

```powershell
.\run-fetch.ps1 -url1 "https://url1.com" -url2 "https://url2.com" -clientData ".\cliente.json"
```

---

## Funcionamiento del Script

### Entrada
- 2 URLs obligatorias
- `--clientData` (opcional) para datos personalizados del cliente

### Proceso

1. **Carpetas:** Crea `fetch-results/YYYYMMDD_HHMMSS/ref{1,2}_<hostname>/`
2. **Navegación:** Usa Chromium headless con `waitUntil: 'networkidle'`
3. **Captura:** HTML post-JS + screenshot full-page + metadatos
4. **Metadatos extraídos por página:**
   - Meta tags (SEO, OG, Twitter)
   - Headings (h1-h4) con texto y clases
   - Imágenes (src, alt, dimensiones naturales)
   - Forms y sus inputs (detecta formularios de contacto)
   - Nav links (reconstruye navegación)
   - Secciones heurísticas (main/section/header/footer con área calculada)
5. **Salida:** `ref*_summary.json` + `combined_summary.json` con componentes recomendados

### Heurísticas Aplicadas

El script aplica lógica simple para recomendar componentes:

| Componente | Condición |
|------------|-----------|
| `header` | Siempre incluido |
| `footer` | Siempre incluido |
| `hero` | Siempre incluido |
| `gallery` | Si >3 imágenes en alguna ref |
| `contact_form` | Si existe `<form>` en alguna ref |

---

## Formato de Salida

### Estructura de Carpetas

```
fetch-results/
└── 20251030_143015/
    ├── ref1_foody-onepage-webflow-io/
    │   ├── ref1.html
    │   ├── ref1_summary.json
    │   └── ref1_full.png
    │
    ├── ref2_restaurante-template-webflow-io/
    │   ├── ref2.html
    │   ├── ref2_summary.json
    │   └── ref2_full.png
    │
    └── combined_summary.json
```

### Ejemplo de combined_summary.json

```json
{
  "timestamp": "20251030_143015",
  "runFolder": "fetch-results/20251030_143015",
  "date": "2025-10-30T14:30:15.234Z",
  "url1": "https://foody-onepage.webflow.io/",
  "url2": "https://restaurante-template.webflow.io/",
  "title1": "Foody - Delicious Food Delivered",
  "title2": "Restaurante Gourmet - Menu & Reservations",
  "topHeadings1": [
    {"tag":"h1","text":"Fresh Food, Fast Delivery","classes":"hero-title"},
    {"tag":"h2","text":"Our Menu","classes":"section-heading"}
  ],
  "topHeadings2": [
    {"tag":"h1","text":"Experience Fine Dining","classes":"hero-main"},
    {"tag":"h2","text":"Chef's Specials","classes":"menu-title"}
  ],
  "imgs1": [
    {"src":"https://cdn.webflow.io/.../hero-burger.jpg","alt":"Gourmet Burger","w":1920,"h":1080}
  ],
  "imgs2": [
    {"src":"https://cdn.webflow.io/.../restaurant-interior.jpg","alt":"Restaurant Interior","w":1600,"h":900}
  ],
  "sections1": [
    {"tag":"section","id":"hero","heading":"Fresh Food, Fast Delivery","classes":"hero-section","area":2073600}
  ],
  "sections2": [
    {"tag":"section","id":"hero","heading":"Experience Fine Dining","classes":"hero-main","area":1843200}
  ],
  "clientData": null,
  "recommendedComponents": ["header","footer","hero","gallery","contact_form"]
}
```

---

## Ventajas y Desventajas

### ✅ Ventajas

- **Automatización completa:** Con 2 URLs obtienes todo el material listo para Claude Code
- **Reproducible y organizado:** Cada ejecución en carpeta timestamp separada
- **Buen punto de partida:** Los artifacts permiten reconstruir estructura y assets
- **Flexible:** Admite `clientData` opcional para personalizar
- **Comparación fácil:** Claude Code puede analizar ambas refs y decidir qué usar

### ❌ Desventajas

- **No reconstruye CSS:** Descarga HTML y capturas, pero no transforma CSS a Tailwind
- **Heurísticas simples:** Detección de componentes es aproximada, no perfecta
- **Posible bloqueo:** Algunas webs pueden bloquear Playwright (usar stealth si es necesario)
- **Dependencia de timing:** Si contenido carga muy tarde, puede requerir aumentar timeouts

---

## Preparar para Claude Code

Una vez que el script termine, tendrás una carpeta con todo lo necesario para usar con Claude Code.

### Archivos a Entregar

1. **Carpeta completa** con timestamp
   - Contiene ambas referencias + combined_summary.json

2. **Ruta accesible** (local o remota)
   - Si Claude Code corre en tu máquina: ruta local
   - Si corre remoto: subir a S3/GDrive/GitHub

### Siguiente Paso

Continúa con los prompts maestros para usar estos artifacts:
- [03-prompt-reference.md](03-prompt-reference.md) - Prompt maestro para fusión de 2 referencias

---

## Comandos Útiles

### Ejecutar Fetch

```powershell
# Método 1: Directo con Node
node scripts/dual-page/fetch-two-pages.js "https://url1.com" "https://url2.com"

# Método 2: Con wrapper PowerShell
.\scripts\dual-page\run-fetch.ps1 -url1 "https://url1.com" -url2 "https://url2.com"

# Con datos del cliente
.\scripts\dual-page\run-fetch.ps1 -url1 "https://url1.com" -url2 "https://url2.com" -clientData ".\cliente.json"
```

### Ver Resultados

```powershell
# Listar carpetas de resultados
ls fetch-results

# Abrir carpeta más reciente
explorer (Get-ChildItem fetch-results | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

# Ver combined_summary
cat fetch-results\<timestamp>\combined_summary.json

# Ver summary de ref1
cat fetch-results\<timestamp>\ref1_*\ref1_summary.json
```

---

## Próximos Pasos

- **[03-prompt-reference.md](03-prompt-reference.md)** - Prompts maestros para fusionar las referencias con Claude Code
- **[04-troubleshooting.md](04-troubleshooting.md)** - Solución de problemas comunes

---

**¡Script listo para usar!** Ejecuta el fetch y continúa con el prompt maestro de fusión.
