# Fetch de Página Única con Playwright

Esta guía contiene **4 scripts especializados** para fetchear una sola página web con diferentes estrategias, más un **script extractor** para procesar HTML ya guardado.

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Comparación de Scripts](#comparación-de-scripts)
3. [Script A: fetch-static.js](#script-a-fetch-staticjs)
4. [Script B: fetch-dynamic.js](#script-b-fetch-dynamicjs)
5. [Script C: fetch-fusion.js](#script-c-fetch-fusionjs)
6. [Script D: fetch-stealth.js](#script-d-fetch-stealthjs)
7. [Script E: extract-from-html.js](#script-e-extract-from-htmljs)
8. [Preparar Artifacts para Claude Code](#preparar-artifacts-para-claude-code)
9. [Flujo Completo Recomendado](#flujo-completo-recomendado)

---

## Resumen Ejecutivo

Tienes **4 scripts** diseñados para distintas necesidades de fetch con Playwright:

- **`fetch-static.js`** → Rápido y ligero, para páginas estáticas
- **`fetch-dynamic.js`** → Para páginas con animaciones y render dinámico (Webflow, React, GSAP)
- **`fetch-fusion.js`** → Script universal que combina estrategias y captura slides/estados
- **`fetch-stealth.js`** → Modo stealth/anti-bloqueo para sitios con detección de bots

Además está **`extract-from-html.js`** para procesar `page.html` ya guardado y generar metadata.

Al final de este documento encontrarás cómo preparar los artifacts para usarlos con Claude Code. Para los prompts maestros completos, consulta [03-prompt-reference.md](03-prompt-reference.md).

---

## Comparación de Scripts

Elige el script adecuado según el tipo de sitio:

| Script | Velocidad | Casos de Uso | Detección Anti-bot | Captura Slides | Outputs |
|--------|-----------|--------------|-------------------|----------------|---------|
| `fetch-static.js` | ⚡⚡⚡ Muy rápido | Landing pages estáticas, blogs sin JS complejo | ❌ Básica | ❌ No | HTML, 2 screenshots, JSON |
| `fetch-dynamic.js` | ⚡⚡ Moderado | SPAs, React, Webflow con animaciones GSAP | ❌ Básica | ⚠️ Limitado | HTML, 2 screenshots, JSON |
| `fetch-fusion.js` | ⚡ Lento | Universal, cuando no sabes el tipo o necesitas capturar sliders | ⚠️ Media | ✅ Sí (hasta 6) | HTML, múltiples screenshots, classes.txt, JSON |
| `fetch-stealth.js` | ⚡ Muy lento | Sitios con Cloudflare, CAPTCHAs o protecciones avanzadas | ✅ Alta | ❌ No | HTML, screenshot, JSON |
| `extract-from-html.js` | ⚡⚡⚡ Instantáneo | Ya tienes HTML guardado, solo necesitas metadata | N/A | N/A | classes.txt, detected_stack.json |

### ¿Cuál Script Usar?

- ✅ **Usa `fetch-static`** si: La página no tiene animaciones ni JavaScript complejo
- ✅ **Usa `fetch-dynamic`** si: Hay animaciones GSAP, scroll parallax, o lazy-load de imágenes
- ✅ **Usa `fetch-fusion`** si: No estás seguro del tipo, o necesitas capturar múltiples estados de sliders/carousels
- ✅ **Usa `fetch-stealth`** si: El sitio te bloquea, muestra CAPTCHAs, o usa Cloudflare
- ✅ **Usa `extract-from-html`** si: Ya tienes el HTML guardado y solo necesitas extraer metadata

---

## Script A: fetch-static.js

### Propósito
Capturar sitios mayormente estáticos (poca o ninguna lógica cliente). Rápido y eficiente.

### Código Completo

Guarda este código como `scripts/single-page/fetch-static.js`:

```javascript
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
```

### Cómo Usar

```powershell
node fetch-static.js "https://ejemplo.com"
```

### Outputs Generados

```
fetch-results/
└── 2025-10-30T14-30-15-123Z/
    ├── page.html                  # HTML renderizado
    ├── screenshot_desktop.png     # Captura desktop (1366x768)
    ├── screenshot_mobile.png      # Captura mobile (390x844)
    ├── resources.json             # Lista de recursos (CSS, JS)
    └── fetch_info.txt             # Metadatos del fetch
```

### Ventajas y Desventajas

**✅ Ventajas:**
- Muy rápido (~10-20 segundos por página)
- Consume menos recursos (memoria y CPU)
- Ideal para procesar múltiples sitios en batch
- Perfecto para landings simples y blogs estáticos

**❌ Desventajas:**
- No captura bien estados de animación
- No detecta sliders o carousels
- Puede perder contenido lazy-loaded
- No interactúa con la página

---

## Script B: fetch-dynamic.js

### Propósito
Capturar páginas que renderizan en cliente (React, Webflow, GSAP), con interacción mínima y espera de animaciones.

### Código Completo

Guarda este código como `scripts/single-page/fetch-dynamic.js`:

```javascript
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
```

### Cómo Usar

```powershell
node fetch-dynamic.js "https://ejemplo-con-animaciones.com"
```

### Outputs Generados

```
fetch-results/
└── 2025-10-30T14-35-20-456Z/
    ├── page.html
    ├── fullpage-desktop.png
    ├── fullpage-mobile.png
    ├── resources.json
    └── fetch_info.txt
```

### Ventajas y Desventajas

**✅ Ventajas:**
- Captura el DOM posterior a la ejecución de JavaScript
- Fuerza lazy-load con scroll automático
- Útil para SPAs (Single Page Applications)
- Detecta animaciones GSAP y efectos de scroll

**❌ Desventajas:**
- Más lento que `fetch-static` (~30-45 segundos)
- No maneja bloqueos anti-bot avanzados
- No captura múltiples estados de sliders
- Puede timeout en páginas muy pesadas

---

## Script C: fetch-fusion.js

### Propósito
Script universal que combina técnicas stealth básicas + captura de slides/estados. Ideal si no sabes si la web es estática o dinámica.

### Código Completo

Guarda este código como `scripts/single-page/fetch-fusion.js`:

```javascript
// fetch-fusion.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function delay(ms){return new Promise(r=>setTimeout(r, ms));}

(async () => {
  const url = process.argv[2]; if(!url) return console.error('Uso: node fetch-fusion.js <url>');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = path.join(process.cwd(),'fetch-results', ts); fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width:1366, height:768 } });
  const page = await context.newPage();

  await page.goto(url, { waitUntil:'networkidle', timeout:90000 });
  await page.waitForTimeout(800);

  // intentar aceptar cookies
  const cookieSelectors = ['text=/aceptar/i','text=/accept/i','button[aria-label=close]'];
  for(const sel of cookieSelectors){ try{ const el=await page.$(sel); if(el){ await el.click({timeout:1500}).catch(()=>{}); await page.waitForTimeout(300); break;} }catch(e){} }

  // interacción básica
  await page.mouse.move(300,300,{steps:12}); await page.waitForTimeout(400);

  // scroll lazy load
  await page.evaluate(async ()=>{ await new Promise((res)=>{ let total=0; const step=400; const t=setInterval(()=>{ window.scrollBy(0,step); total+=step; if(total>=document.body.scrollHeight){ clearInterval(t); res(); } },250); }); });
  await page.waitForTimeout(800);

  // detectar slider
  const nextBtn = await page.$('button[aria-label="next"], .w-slider-arrow-right, .slider-next, .slick-next');
  const dots = await page.$$('.w-slider-dot, .slick-dots button, .carousel-dot');
  const slidesToCapture = Math.max(1, Math.min(6, dots.length || 3));

  for(let i=0;i<slidesToCapture;i++){
    if(dots.length && dots[i]){ await dots[i].click().catch(()=>{}); }
    else if(nextBtn){ await nextBtn.click().catch(()=>{}); }
    else{ await page.mouse.wheel(0,300).catch(()=>{}); }
    await page.waitForTimeout(900);
    await page.addStyleTag({ content:'*{ animation-play-state: paused !important; transition: none !important; }' });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `screenshot_slide_${i+1}.png`), fullPage: true });
    await page.evaluate(()=>{ Array.from(document.querySelectorAll('style')).filter(s=>s.innerText.includes('animation-play-state')).forEach(s=>s.remove()); }).catch(()=>{});
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: path.join(out,'screenshot_desktop.png'), fullPage: true });
  await page.setViewportSize({ width:390, height:844 }); await delay(800);
  await page.screenshot({ path: path.join(out,'screenshot_mobile.png'), fullPage: true });

  const html = await page.content(); fs.writeFileSync(path.join(out,'page.html'), html, 'utf8');
  const classes = await page.evaluate(()=>Array.from(document.querySelectorAll('[class]')).flatMap(el=>el.className.split(/\s+/)).filter(Boolean));
  fs.writeFileSync(path.join(out,'classes_list.txt'), Array.from(new Set(classes)).join('\n'),'utf8');
  const resources = await page.evaluate(()=>Array.from(document.querySelectorAll('link[href], script[src]')).map(n=>({tag:n.tagName, url:n.href||n.src}))); fs.writeFileSync(path.join(out,'resources.json'), JSON.stringify(resources,null,2),'utf8');
  fs.writeFileSync(path.join(out,'fetch_info.txt'), `url: ${url}\nfetched_at: ${new Date().toISOString()}\nslides_captured: ${slidesToCapture}\n`,'utf8');

  await context.close().catch(()=>{}); await browser.close().catch(()=>{});
  console.log('Fetch fusion completo en:', out);
})();
```

### Cómo Usar

```powershell
node fetch-fusion.js "https://ejemplo.com"
```

### Outputs Generados

```
fetch-results/
└── 2025-10-30T14-40-35-789Z/
    ├── page.html
    ├── screenshot_desktop.png
    ├── screenshot_mobile.png
    ├── screenshot_slide_1.png     # Estados de slider
    ├── screenshot_slide_2.png
    ├── screenshot_slide_3.png
    ├── classes_list.txt           # Todas las clases CSS detectadas
    ├── resources.json
    └── fetch_info.txt
```

### Ventajas y Desventajas

**✅ Ventajas:**
- Script más completo y versátil
- Captura múltiples estados de sliders/carousels
- Intenta cerrar modales de cookies automáticamente
- Extrae lista completa de clases CSS (útil para Tailwind)
- Simula interacción humana básica

**❌ Desventajas:**
- Más lento (~60-90 segundos por página)
- Puede sobrecargar si hay muchas slides
- Heurística de detección de sliders no es 100% precisa
- Consume más recursos

---

## Script D: fetch-stealth.js

### Propósito
Evadir bloqueos, detección simple de bots y obtener contenido cuando un sitio protege o bloquea Playwright por fingerprinting.

### Instalación Adicional

Este script requiere dependencias extra:

```powershell
pnpm add playwright-extra @extra/playwright-stealth
```

### Código Completo

Guarda este código como `scripts/single-page/fetch-stealth.js`:

```javascript
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
```

### Cómo Usar

```powershell
node fetch-stealth.js "https://sitio-que-bloquea.com"
```

### Outputs Generados

```
fetch-results/
└── stealth-2025-10-30T14-45-50-012Z/
    ├── page.html
    ├── screenshot.png
    └── resources.json
```

### Ventajas y Desventajas

**✅ Ventajas:**
- Mayor probabilidad de pasar verificaciones anti-bot
- Útil para sitios con Cloudflare o protecciones similares
- Simula comportamiento humano más realista
- Plugin stealth modifica fingerprints del navegador

**❌ Desventajas:**
- Más lento que todos los otros scripts (~90-120 segundos)
- Requiere dependencias adicionales
- No es 100% infalible contra todas las protecciones
- Algunos sitios siguen bloqueando incluso con stealth

---

## Script E: extract-from-html.js

### Propósito
Si ya tienes `page.html` no necesitas volver a navegar. Este script extrae clases, detecta tecnologías y crea metadatos útiles para el prompt.

### Código Completo

Guarda este código como `scripts/single-page/extract-from-html.js`:

```javascript
// extract-from-html.js
const fs = require('fs');
const path = require('path');
const input = process.argv[2]; if(!input) return console.error('Uso: node extract-from-html.js <ruta a page.html>');
const html = fs.readFileSync(input,'utf8'); const dir = path.dirname(input);
// extraer clases
const classRegex = /class\s*=\s*["']([^"']+)["']/gi; const classes = new Set(); let m;
while((m=classRegex.exec(html))!==null){ m[1].split(/\s+/).map(s=>s.trim()).filter(Boolean).forEach(c=>classes.add(c)); }
fs.writeFileSync(path.join(dir,'classes_list.txt'), Array.from(classes).join('\n'),'utf8');
// detectar stack
const lower = html.toLowerCase(); const detected = { tailwind:false, gsap:false, lenis:false, webflow:false, react:false, nextjs:false };
if(lower.includes('tailwind') || /class=["'][^"']*(?:p-|m-|text-|bg-|flex|grid|gap-)/.test(lower)){ detected.tailwind=true; }
if(lower.includes('gsap')) detected.gsap=true; if(lower.includes('lenis')) detected.lenis=true; if(lower.includes('webflow')) detected.webflow=true; if(lower.includes('react')) detected.react=true; if(lower.includes('/_next/')) detected.nextjs=true;
fs.writeFileSync(path.join(dir,'detected_stack.json'), JSON.stringify(detected,null,2),'utf8');
let url=''; const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i); if(canonical && canonical[1]) url=canonical[1];
fs.writeFileSync(path.join(dir,'fetch_info.txt'), `source_html: ${path.basename(input)}\nurl_detected: ${url}\nfetched_at: ${new Date().toISOString()}\n`,'utf8');
console.log('Extracción completada en:', dir);
```

### Cómo Usar

```powershell
node extract-from-html.js .\fetch-results\<timestamp>\page.html
```

### Outputs Generados

```
fetch-results/
└── 2025-10-30T14-50-00-123Z/
    ├── page.html                  # (Ya existía)
    ├── classes_list.txt           # ← Nuevo
    ├── detected_stack.json        # ← Nuevo
    └── fetch_info.txt             # ← Nuevo
```

**Ejemplo de `detected_stack.json`:**
```json
{
  "tailwind": true,
  "gsap": true,
  "lenis": false,
  "webflow": true,
  "react": false,
  "nextjs": false
}
```

### Ventajas y Desventajas

**✅ Ventajas:**
- Instantáneo (no requiere navegación)
- Útil si ya tienes HTML de otra fuente
- Detecta frameworks y librerías automáticamente
- Extrae todas las clases CSS (importante para Tailwind)

**❌ Desventajas:**
- No genera screenshots
- Requiere que el HTML ya esté guardado
- Detección heurística (no 100% precisa)
- No captura recursos externos

---

## Preparar Artifacts para Claude Code

Siempre que puedas, entrega a Claude Code los siguientes archivos:

### Archivos Esenciales

1. **`page.html`** (imprescindible)
   - HTML final renderizado post-JavaScript
   - Permite al LLM ver el DOM real

2. **Screenshots** (altamente recomendado)
   - `screenshot_desktop.png` o `fullpage-desktop.png`
   - `screenshot_mobile.png` o `fullpage-mobile.png`
   - Referencias visuales para layout y diseño

3. **`classes_list.txt`** (recomendado)
   - Lista de todas las clases CSS
   - Ayuda a detectar Tailwind y mapear utilidades v4→v3
   - Generado por `fetch-fusion.js` o `extract-from-html.js`

4. **`resources.json`** (recomendado)
   - Lista de CSS, JS, imágenes
   - Ayuda a detectar frameworks y versiones

5. **`detected_stack.json`** (opcional)
   - Heurística resumida del stack técnico
   - Generado por `extract-from-html.js`

6. **`fetch_info.txt`** (opcional)
   - Metadatos (URL, fecha, slides capturados)

### Por Qué Son Importantes

Con estos archivos, el LLM puede:
- ✅ Decidir qué partes del stack usar
- ✅ Detectar utilidades incompatibles (Tailwind v4)
- ✅ Generar código con mayor precisión
- ✅ Mantener la estructura visual original
- ✅ Identificar componentes reutilizables

---

## Flujo Completo Recomendado

### End-to-End Workflow

1. **Ejecutar el script apropiado** según el tipo de sitio
   ```powershell
   node fetch-fusion.js "https://ejemplo.com"
   ```

2. **(Opcional) Ejecutar extractor** si el script no generó metadata
   ```powershell
   node extract-from-html.js .\fetch-results\<timestamp>\page.html
   ```

3. **Verificar outputs** en la carpeta `fetch-results/<timestamp>/`
   - ✅ `page.html` existe
   - ✅ Screenshots generados
   - ✅ JSON files creados

4. **Subir carpeta** a ubicación accesible (si Claude Code corre remoto)
   - S3 / Google Drive / GitHub
   - O pasar ruta local si corre en tu máquina

5. **Pegar prompt maestro** en Claude Code con rutas
   - Ver [03-prompt-reference.md](03-prompt-reference.md) para prompts completos

6. **Revisar análisis inicial** y aprobar stack propuesto

7. **Iterar por fases:**
   - Header + Hero
   - Secciones principales
   - Contacto + Footer

8. **Decodificar y ejecutar** proyecto generado
   ```powershell
   pnpm install
   pnpm build
   pnpm dev
   ```

---

## Comandos Útiles

### Ejecutar Scripts

```powershell
# Script estático (rápido)
node fetch-static.js "https://ejemplo.com"

# Script dinámico (animaciones)
node fetch-dynamic.js "https://ejemplo.com"

# Script fusion (universal)
node fetch-fusion.js "https://ejemplo.com"

# Script stealth (anti-bloqueo)
node fetch-stealth.js "https://ejemplo.com"

# Extractor (desde HTML guardado)
node extract-from-html.js .\fetch-results\<timestamp>\page.html
```

### Ver Resultados

```powershell
# Listar carpetas de resultados
ls fetch-results

# Abrir carpeta más reciente
explorer (Get-ChildItem fetch-results | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

# Ver clases extraídas
cat fetch-results\<timestamp>\classes_list.txt

# Ver stack detectado
cat fetch-results\<timestamp>\detected_stack.json
```

---

## Próximos Pasos

- **[02-dual-page-fetch.md](02-dual-page-fetch.md)** - Si necesitas fetchear y fusionar 2 referencias
- **[03-prompt-reference.md](03-prompt-reference.md)** - Prompts maestros completos para Claude Code
- **[04-troubleshooting.md](04-troubleshooting.md)** - Solución de problemas comunes

---

**¡Scripts listos para usar!** Elige el script adecuado según tu caso de uso y genera los artifacts para Claude Code.
