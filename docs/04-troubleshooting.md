# Troubleshooting y FAQs

Soluciones a problemas comunes al usar los scripts de fetch con Playwright.

---

## Índice

1. [Problemas de Instalación](#problemas-de-instalación)
2. [Errores al Ejecutar Scripts](#errores-al-ejecutar-scripts)
3. [Timeouts y Páginas Lentas](#timeouts-y-páginas-lentas)
4. [Detección de Bots y Bloqueos](#detección-de-bots-y-bloqueos)
5. [Problemas con Sliders y Carousels](#problemas-con-sliders-y-carousels)
6. [Errores con PowerShell](#errores-con-powershell)
7. [Outputs Incompletos o Vacíos](#outputs-incompletos-o-vacíos)
8. [Problemas con Claude Code](#problemas-con-claude-code)
9. [Performance y Recursos](#performance-y-recursos)

---

## Problemas de Instalación

### `node: command not found` o `npm: command not found`

**Problema:** La terminal no reconoce los comandos de Node.js.

**Solución:**
1. Instala Node.js desde [nodejs.org](https://nodejs.org/) (versión LTS)
2. Reinicia completamente la terminal o PowerShell
3. Verifica instalación:
   ```powershell
   node -v
   npm -v
   ```

---

### `npx playwright install` falla con error de permisos

**Problema:** Playwright no puede descargar navegadores por falta de permisos.

**Solución Windows:**
```powershell
# Ejecuta PowerShell como Administrador
npx playwright install
```

**Solución Linux/Mac:**
```bash
sudo npx playwright install
```

---

### Playwright instalado pero no encuentra navegadores

**Problema:** El script dice que no encuentra Chromium/Firefox/WebKit.

**Solución:**
1. Verifica que Playwright esté instalado en el proyecto actual:
   ```powershell
   npm list playwright
   ```

2. Reinstala navegadores en la carpeta del proyecto:
   ```powershell
   cd tu-proyecto
   npx playwright install
   ```

3. Si sigue fallando, instala navegadores con system dependencies:
   ```powershell
   npx playwright install --with-deps
   ```

---

### `Cannot find module 'playwright'`

**Problema:** Node no encuentra el módulo de Playwright.

**Solución:**
1. Asegúrate de estar en la carpeta correcta:
   ```powershell
   cd C:\Users\TuUsuario\fetch-playwright
   ```

2. Verifica que exista `node_modules/playwright`:
   ```powershell
   ls node_modules | findstr playwright
   ```

3. Reinstala:
   ```powershell
   pnpm add -D playwright
   ```

---

### Error: `Cannot find module 'playwright-extra'`

**Problema:** Falta la dependencia para el script stealth.

**Solución:**
```powershell
pnpm add playwright-extra @extra/playwright-stealth
```

O con npm:
```powershell
npm i playwright-extra @extra/playwright-stealth
```

---

## Errores al Ejecutar Scripts

### `SyntaxError: Unexpected end of input`

**Problema:** El archivo JavaScript está corrupto o incompleto.

**Solución:**
1. Verifica que el archivo `.js` esté completo
2. Asegúrate de que copiaste TODO el código (no truncado)
3. Verifica que no haya caracteres invisibles
4. Re-descarga o copia el script de nuevo

---

### Error: `Uso: node fetch-*.js <url>`

**Problema:** No pasaste la URL como argumento.

**Solución:**
```powershell
# ❌ Incorrecto
node fetch-static.js

# ✅ Correcto
node fetch-static.js "https://ejemplo.com"
```

---

### Script termina sin error pero no genera archivos

**Problema:** El script corre pero la carpeta `fetch-results` está vacía.

**Solución:**
1. Verifica que tienes permisos de escritura en la carpeta
2. Ejecuta con permisos elevados:
   ```powershell
   # Windows: Abre PowerShell como Administrador
   ```

3. Verifica logs en consola para ver si hubo warnings

4. Prueba escribir manualmente un archivo de prueba:
   ```powershell
   echo "test" > fetch-results\test.txt
   ```

---

## Timeouts y Páginas Lentas

### `TimeoutError: page.goto: Timeout 60000ms exceeded`

**Problema:** La página tarda más de 60 segundos en cargar.

**Solución 1 - Aumentar timeout:**

Edita el script y aumenta el timeout en la línea `page.goto`:

```javascript
// Antes
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

// Después (180 segundos = 3 minutos)
await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
```

**Solución 2 - Cambiar estrategia de espera:**

```javascript
// En lugar de 'networkidle', usa 'load' o 'domcontentloaded'
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
```

**Solución 3 - Añadir espera adicional:**

```javascript
await page.goto(url, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(5000); // Espera 5 segundos adicionales
```

---

### Página carga parcialmente (falta contenido lazy-load)

**Problema:** El HTML capturado no tiene todo el contenido visible en el browser.

**Solución:**

Usa `fetch-dynamic.js` o `fetch-fusion.js` que incluyen scroll automático:

```powershell
node fetch-dynamic.js "https://ejemplo.com"
```

O añade scroll manual en tu script:

```javascript
// Después de page.goto()
await page.evaluate(async () => {
  await new Promise((resolve) => {
    let totalHeight = 0;
    const distance = 400;
    const timer = setInterval(() => {
      window.scrollBy(0, distance);
      totalHeight += distance;
      if(totalHeight >= document.body.scrollHeight){
        clearInterval(timer);
        resolve();
      }
    }, 300);
  });
});
await page.waitForTimeout(2000);
```

---

## Detección de Bots y Bloqueos

### Página muestra "Access Denied" o CAPTCHA

**Problema:** El sitio detecta que eres un bot y te bloquea.

**Solución 1 - Usa fetch-stealth.js:**

```powershell
pnpm add playwright-extra @extra/playwright-stealth
node fetch-stealth.js "https://sitio-protegido.com"
```

**Solución 2 - Cambia User-Agent:**

```javascript
const page = await browser.newPage({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});
```

**Solución 3 - Usa headless: false para depurar:**

```javascript
const browser = await chromium.launch({ headless: false });
// Observa qué pasa en el navegador visible
```

---

### Cloudflare "Checking your browser"

**Problema:** Cloudflare muestra la página de verificación de 5 segundos.

**Solución:**

1. Usa `fetch-stealth.js`
2. Añade espera adicional:
   ```javascript
   await page.goto(url, { waitUntil: 'load', timeout: 120000 });
   await page.waitForTimeout(8000); // Espera a que Cloudflare termine
   ```

3. Si sigue bloqueando, considera usar proxies o servicios especializados

---

### Error: `net::ERR_BLOCKED_BY_CLIENT`

**Problema:** Extensiones o configuraciones de red bloquean la solicitud.

**Solución:**

Lanza el browser con argumentos que deshabilitan ciertas protecciones:

```javascript
const browser = await chromium.launch({
  headless: true,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security'
  ]
});
```

**⚠️ Nota:** Solo usa esto en entornos de desarrollo/testing.

---

## Problemas con Sliders y Carousels

### Script no detecta slides

**Problema:** `fetch-fusion.js` solo captura 1 slide cuando hay varios.

**Solución 1 - Verifica selectores:**

Abre el sitio en DevTools y busca el selector real del slider:

```javascript
// Ejemplo: Si tu slider usa clase diferente
const dots = await page.$$('.swiper-pagination-bullet');  // En lugar de .w-slider-dot
const nextBtn = await page.$('.swiper-button-next');  // En lugar de .w-slider-arrow-right
```

**Solución 2 - Aumenta el slidesToCapture:**

```javascript
const slidesToCapture = Math.max(1, Math.min(10, dots.length || 5)); // En lugar de 6
```

**Solución 3 - Añade delay entre clicks:**

```javascript
for(let i=0; i<slidesToCapture; i++){
  // ... código de click ...
  await page.waitForTimeout(1500); // Aumenta de 900 a 1500ms
  // ... screenshot ...
}
```

---

### Slides capturados están borrosos o en transición

**Problema:** Las capturas muestran animaciones a medias.

**Solución:**

El script `fetch-fusion.js` ya pausa animaciones, pero puedes mejorar la espera:

```javascript
// Después del click
await page.waitForTimeout(900);

// Pausar animaciones
await page.addStyleTag({
  content: '*{ animation-play-state: paused !important; transition: none !important; }'
});

// Esperar más tiempo para que el DOM se estabilice
await page.waitForTimeout(500); // ← Aumenta esto si siguen borrosas

await page.screenshot({ path: '...', fullPage: true });
```

---

## Errores con PowerShell

### `cannot be loaded because running scripts is disabled`

**Problema:** PowerShell bloquea la ejecución de scripts `.ps1`.

**Solución:**

Ejecuta como Administrador:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

Si no tienes permisos de admin, usa el bypass temporal:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-fetch.ps1 -url1 "..." -url2 "..."
```

---

### Error: `UnauthorizedAccess` al ejecutar script

**Problema:** No tienes permisos para ejecutar el script.

**Solución:**

Desbloquea el archivo:

```powershell
Unblock-File .\run-fetch.ps1
```

O ejecuta con bypass:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-fetch.ps1
```

---

## Outputs Incompletos o Vacíos

### `page.html` está vacío o tiene muy poco contenido

**Problema:** El HTML capturado no refleja la página real.

**Causas posibles:**
- Página depende 100% de JavaScript para renderizar
- Error de navegación silencioso
- Redirect no manejado

**Solución:**

1. Verifica en modo no-headless:
   ```javascript
   const browser = await chromium.launch({ headless: false });
   ```

2. Añade más espera:
   ```javascript
   await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
   await page.waitForTimeout(5000); // Espera adicional
   await page.waitForSelector('body', { timeout: 10000 }); // Espera el body
   ```

3. Verifica redirects:
   ```javascript
   console.log('URL final:', page.url());
   ```

---

### `screenshot.png` está en blanco o muestra solo header

**Problema:** La captura no muestra contenido.

**Solución:**

1. Verifica que el viewport sea adecuado:
   ```javascript
   await page.setViewportSize({ width: 1400, height: 900 });
   ```

2. Espera a que elementos clave carguen:
   ```javascript
   await page.waitForSelector('main', { timeout: 10000 });
   await page.waitForSelector('img', { timeout: 5000 }).catch(() => {});
   ```

3. Fuerza scroll antes de capturar:
   ```javascript
   await page.evaluate(() => window.scrollTo(0, 0)); // Vuelve arriba
   await page.waitForTimeout(1000);
   await page.screenshot({ path: '...', fullPage: true });
   ```

---

### `classes_list.txt` vacío

**Problema:** No se detectaron clases CSS.

**Solución:**

1. Verifica que `page.html` tenga contenido
2. Ejecuta `extract-from-html.js` manualmente:
   ```powershell
   node extract-from-html.js .\fetch-results\<timestamp>\page.html
   ```

3. Si sigue vacío, verifica que el HTML tenga atributos `class`:
   ```powershell
   cat .\fetch-results\<timestamp>\page.html | findstr "class="
   ```

---

## Problemas con Claude Code

### Claude Code no puede leer los archivos

**Problema:** Claude Code reporta que no encuentra las rutas.

**Solución:**

1. Usa rutas absolutas (no relativas):
   ```
   ✅ C:\Users\Julio\fetch-playwright\fetch-results\20251030\page.html
   ❌ .\fetch-results\20251030\page.html
   ```

2. Verifica que los archivos existan:
   ```powershell
   Test-Path "C:\Users\Julio\fetch-playwright\fetch-results\20251030\page.html"
   # Debe retornar: True
   ```

3. Si Claude Code corre remoto, sube archivos a S3/Drive y usa URLs

---

### Claude Code genera código con Tailwind v4

**Problema:** El prompt dice v3 pero Claude usa v4.

**Solución:**

Refuerza en el prompt:

```
REGLA CRÍTICA:
- NUNCA uses utilidades de Tailwind v4 (como bg-red, text-balance, etc.)
- SOLO usa Tailwind v3 clásico (bg-red-500, bg-red-600, etc.)
- Si detectas clases v4 en el HTML original, mapéalas a v3
- Documenta el mapeo en un archivo TAILWIND_MAPPING.md
```

---

### Archivos generados no funcionan al ejecutar `pnpm dev`

**Problema:** El proyecto generado por Claude Code tiene errores.

**Solución:**

1. Verifica dependencias:
   ```powershell
   pnpm install
   ```

2. Revisa errores específicos en consola

3. Pide a Claude Code que ejecute build antes de entregar:
   ```
   REGLA: Después de cada fase, ejecuta localmente:
   - pnpm install (si añadiste deps)
   - pnpm build
   - Reporta cualquier error y corrígelo antes de pedir aprobación
   ```

---

## Performance y Recursos

### Script consume mucha memoria

**Problema:** Playwright usa > 2GB de RAM.

**Solución:**

1. Cierra el browser entre ejecuciones:
   ```javascript
   await browser.close();
   ```

2. Limita tamaño de screenshots:
   ```javascript
   await page.screenshot({
     path: '...',
     fullPage: false  // Solo viewport visible
   });
   ```

3. Ejecuta scripts de uno en uno (no paralelo)

---

### Fetch tarda más de 5 minutos

**Problema:** El script es muy lento.

**Solución:**

1. Usa `fetch-static.js` si la página es simple
2. Reduce el número de slides a capturar:
   ```javascript
   const slidesToCapture = Math.max(1, Math.min(3, dots.length)); // En lugar de 6
   ```

3. Deshabilita imágenes (solo para debugging):
   ```javascript
   await page.route('**/*.{png,jpg,jpeg,gif,webp}', route => route.abort());
   ```

---

## Recursos Adicionales

### Obtener Ayuda

- **Playwright Docs:** [playwright.dev](https://playwright.dev/)
- **GitHub Issues:** Reporta bugs específicos
- **Discord/Slack:** Comunidad de Playwright

### Debugging Avanzado

Para ver qué está haciendo Playwright internamente:

```powershell
# Ejecuta con debug activado
$env:DEBUG="pw:api"
node fetch-static.js "https://ejemplo.com"
```

Para ver logs del browser:

```javascript
page.on('console', msg => console.log('BROWSER:', msg.text()));
page.on('pageerror', error => console.log('ERROR:', error));
```

---

## Checklist de Troubleshooting

Cuando algo no funcione, verifica en este orden:

- [ ] Node.js y npm instalados correctamente (`node -v`, `npm -v`)
- [ ] Playwright instalado en el proyecto (`npm list playwright`)
- [ ] Navegadores descargados (`npx playwright install`)
- [ ] Estás en la carpeta correcta del proyecto
- [ ] El script tiene permisos de ejecución
- [ ] La URL es válida y accesible
- [ ] Tienes conexión a internet
- [ ] No hay firewall/antivirus bloqueando Playwright
- [ ] Espacio en disco suficiente (>500MB)
- [ ] PowerShell con execution policy correcta (Windows)

---

**Si ninguna solución funciona**, crea un Issue en el repositorio con:
- Sistema operativo y versión
- Versión de Node.js (`node -v`)
- Versión de Playwright (`npm list playwright`)
- Comando exacto que ejecutaste
- Error completo (captura de pantalla o texto)
- URL que intentaste fetchear (si es pública)

---

[Volver al README](../README.md)
