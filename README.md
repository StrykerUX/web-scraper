# 🎮 CORTANA - WEB INTELLIGENCE SCANNER

Tu asistente de reconocimiento web. Captura, analiza y documenta sitios web con precisión.

## 🚀 Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/StrykerUX/web-scraper.git
cd web-scraper

# 2. Instalar dependencias
npm install

# 3. Listo para usar
node cortana https://example.com
```

## ⚡ Uso Rápido

### Comando Básico - Cortana
```bash
node cortana <url1> <url2> <url3> ...
```

### Comando Avanzado - Weapon 🔫
Para sitios con sliders/carousels (captura múltiples estados):
```bash
node weapon <url1> <url2> <url3> ...
```

### Ejemplos

```bash
# Escanear un solo sitio (Cortana)
node cortana https://www.anthropic.com/

# Escanear múltiples sitios (Cortana)
node cortana https://www.anthropic.com/ https://linear.app/

# Escanear sitio con slider (Weapon)
node weapon https://www.apple.com/

# Escanear 3 sitios en una sola sesión
node cortana https://vercel.com/ https://github.com/ https://stripe.com/
```

### ¿Cortana o Weapon?

| Característica | Cortana | Weapon |
|----------------|---------|--------|
| Velocidad | ⚡ Rápido (~28s) | ⚡ Moderado (~35-45s) |
| Slider Detection | ✅ Detecta | ✅ Detecta |
| Slider Capture | ❌ No captura | ✅ Captura 3-6 estados |
| Archivos generados | 14 | 14-21 |
| Uso recomendado | General purpose | Sitios con carruseles |

**Recomendación:** Usa Cortana por defecto. Usa Weapon solo si necesitas capturar múltiples estados de sliders.

### Modo Configuración (Avanzado)
Si prefieres configurar URLs en un archivo:

```bash
# Edita scraper-config.json con tus URLs
node cortana
```

## 📊 Qué Captura Cortana

### 🖼️ Screenshots (4 por sitio)
- **desktop-fullpage.png** - Página completa desktop (1920x1080)
- **desktop-viewport.png** - Vista inicial desktop
- **mobile-fullpage.png** - Página completa mobile (375x812)
- **mobile-viewport.png** - Vista inicial mobile (iPhone)

### 📄 HTML Completo (2 archivos)
- **page-desktop.html** - Código fuente desktop
- **page-mobile.html** - Código fuente mobile

### 🎨 Análisis CSS (3 archivos JSON)
- **classes.json** - Todas las clases CSS del sitio
- **css-variables.json** - Todas las variables CSS custom properties
- **computed-styles.json** - Estilos renderizados reales

### 📋 Datos Extraídos
- **data.json** - Metadata, títulos, descripciones, enlaces
- **seo-analysis.json** - Score SEO, issues, recomendaciones

## 📁 Estructura de Salida

```
output/
└── anthropic.com-1761788377435/
    ├── desktop-fullpage.png
    ├── desktop-viewport.png
    ├── mobile-fullpage.png
    ├── mobile-viewport.png
    ├── page-desktop.html
    ├── page-mobile.html
    ├── data.json
    ├── classes.json
    ├── css-variables.json
    ├── computed-styles.json
    └── seo-analysis.json
```

**Total: 11 archivos por sitio**

## 💾 Ejemplo de Archivos Generados

### data.json
```json
{
  "metadata": {
    "title": "Home \\ Anthropic",
    "url": "https://www.anthropic.com/",
    "documentHeight": 4334,
    "captureDate": "2025-10-30T01:32:08.872Z",
    "loadTime": 26265
  },
  "data": {
    "title": "AI research and products...",
    "description": "Anthropic is an AI safety...",
    "headings": ["Claude Sonnet 4.5", "..."]
  },
  "screenshots": {
    "desktop": {
      "fullPagePath": ".../desktop-fullpage.png",
      "viewportPath": ".../desktop-viewport.png"
    },
    "mobile": {
      "fullPagePath": ".../mobile-fullpage.png",
      "viewportPath": ".../mobile-viewport.png"
    }
  }
}
```

### classes.json
```json
[
  "animate-space",
  "btn_main_wrap",
  "card",
  "footer_contain",
  "nav_link",
  ...
]
```

### css-variables.json
```json
{
  "--swatch--clay": "#d97757",
  "--site--max-width": "min(100rem, 100vw)",
  "--size--2rem": "clamp(1.75rem, 1.67vw, 2rem)",
  ...
}
```

### computed-styles.json
```json
{
  "body": {
    "backgroundColor": "rgb(250, 249, 245)",
    "color": "rgb(20, 20, 19)",
    "fontFamily": "\"ABC Favorit\", sans-serif",
    "fontSize": "18px",
    "lineHeight": "27px"
  },
  "main": {
    "maxWidth": "...",
    "padding": "..."
  }
}
```

### seo-analysis.json
```json
{
  "score": 85,
  "grade": "Good",
  "issues": [
    "2 images missing alt text",
    "Meta description too long"
  ],
  "recommendations": [
    "Add alt text to all images",
    "Shorten meta description to 120-155 characters"
  ],
  "details": {
    "metaTags": { "title": "...", "description": "..." },
    "headings": { "h1Count": 1, "h2Count": 5 },
    "images": { "total": 23, "withoutAlt": 2 },
    "mobile": { "isMobileOptimized": true }
  }
}
```

## ⚙️ Características Técnicas

### 🔒 Carga Garantizada
Cortana asegura que TODO esté cargado antes de capturar:
- ✅ Network Idle (sin requests pendientes)
- ✅ Fonts cargadas (`document.fonts.ready`)
- ✅ Lazy loading detectado y forzado
- ✅ Scroll completo automático
- ✅ 3 segundos adicionales de espera
- ✅ 3 reintentos automáticos si falla

### 📱 Viewports Configurados
- **Desktop:** 1920x1080 + Chrome user agent
- **Mobile:** 375x812 (iPhone) + Safari user agent

### ⏱️ Performance
- **1 sitio:** ~26 segundos (10 archivos)
- **2 sitios:** ~53 segundos (20 archivos)
- **3 sitios:** ~80 segundos (30 archivos)

## 🎯 Casos de Uso

### 1. Design-to-Code
```bash
# Captura sitio para replicar
node cortana https://ejemplo.com/

# Usa los archivos HTML y CSS para análisis
# classes.json te da los nombres de clases
# css-variables.json te da el design system
```

### 2. Análisis Competitivo
```bash
# Captura múltiples competidores
node cortana https://competidor1.com/ https://competidor2.com/ https://competidor3.com/

# Compara estructuras HTML y CSS entre sitios
```

### 3. Responsive Testing
```bash
# Una ejecución captura ambas versiones
node cortana https://tusitio.com/

# Compara page-desktop.html vs page-mobile.html
# Compara screenshots side-by-side
```

### 4. Design System Extraction
```bash
node cortana https://ejemplo.com/

# Analiza:
# - css-variables.json (colores, spacing, etc.)
# - classes.json (naming conventions)
# - computed-styles.json (valores reales renderizados)
```

## 🔧 Configuración Avanzada

### scraper-config.json
Para uso recurrente de las mismas URLs:

```json
{
  "pages": [
    {
      "name": "mi-sitio",
      "url": "https://ejemplo.com",
      "viewport": {
        "width": 1920,
        "height": 1080
      },
      "waitTime": 3000,
      "selectors": {
        "title": "h1",
        "description": "meta[name='description']",
        "headings": "h2"
      }
    }
  ],
  "options": {
    "headless": true,
    "maxRetries": 3,
    "screenshotFormat": "png"
  }
}
```

Luego ejecuta sin argumentos:
```bash
node cortana
```

## 📊 Resumen de Ejecución

Al finalizar, Cortana muestra un resumen:

```
============================================================
SCRAPING SUMMARY
============================================================
Total time: 26.86s
Pages processed: 1
Successful: 1
Failed: 0

Files per page:
  - 4 screenshots (desktop-fullpage, desktop-viewport, mobile-fullpage, mobile-viewport)
  - 2 HTML files (page-desktop.html, page-mobile.html)
  - 4 JSON files (data.json, classes.json, css-variables.json, computed-styles.json)
============================================================

✅ anthropic.com-1761788377435 - https://www.anthropic.com/
   Time: 26.17s

✅ Mission complete. Cortana out.
```

## ❌ Solución de Problemas

### Error: "No URLs provided"
```bash
# ❌ Incorrecto
node cortana

# ✅ Correcto
node cortana https://ejemplo.com
```

### Error: "Navigation timeout"
El sitio es muy lento o tiene protección anti-bot.
- Intenta con otro sitio primero para verificar que Cortana funcione
- Algunos sitios bloquean bots (normal)

### Error: "puppeteer not found"
```bash
npm install
```

### Screenshots salen incompletos
Esto NO debería pasar con Cortana. Si pasa:
- Reporta el issue con la URL problemática
- Cortana tiene múltiples estrategias de carga garantizada

### Carpeta output/ vacía
Revisa los errores en consola. Cortana muestra mensajes detallados de cada paso.

## 🛡️ Consideraciones Legales

⚠️ **Uso Responsable:**
- Respeta `robots.txt`
- No uses para copiar contenido protegido sin permiso
- No hagas scraping masivo (cientos de URLs)
- Usa para análisis, aprendizaje, o con autorización

ℹ️ **Privacidad:**
- Todos los datos se guardan localmente en `/output/`
- No se envía nada a servidores externos
- Tú controlas todos los archivos generados

## 💡 Tips Pro

### Ver clases CSS más usadas
```bash
jq '.' output/*/classes.json | head -20
```

### Contar variables CSS
```bash
jq 'length' output/*/css-variables.json
```

### Extraer solo colores de variables CSS
```bash
jq 'to_entries | map(select(.value | contains("#")))' output/*/css-variables.json
```

### Comparar mobile vs desktop HTML
```bash
wc -l output/*/page-*.html
diff output/*/page-desktop.html output/*/page-mobile.html
```

## 🤖 Usar con Claude Code

Los artifacts generados por Cortana/Weapon están optimizados para usar con Claude Code y generar proyectos completos automáticamente.

**📖 Ver:** [CLAUDE_CODE_PROMPTS.md](CLAUDE_CODE_PROMPTS.md)

### Flujo rápido:
1. Scrapea: `node cortana https://ejemplo.com`
2. Copia un prompt maestro de CLAUDE_CODE_PROMPTS.md
3. Reemplaza rutas con tus artifacts
4. Pega en Claude Code
5. Proyecto generado! 🎉

**Prompts disponibles:**
- Marketing Site (Astro + React + Tailwind)
- Platform Site (Next.js + PostgreSQL + Auth)
- Fusión de 2 Referencias

## 🚀 Próximas Características

- [x] SEO analysis
- [x] Tech stack detection
- [x] Slider multi-capture (Weapon)
- [x] Claude Code prompts
- [ ] PDF export
- [ ] Lighthouse scores
- [ ] Accessibility audit
- [ ] Performance metrics
- [ ] Screenshot comparison diff

## 📚 Referencias

- **Repositorio:** [github.com/StrykerUX/web-scraper](https://github.com/StrykerUX/web-scraper)
- **Puppeteer Docs:** [pptr.dev](https://pptr.dev)

## 🎮 Sobre Cortana

Cortana es tu asistente de inteligencia web. Escanea, captura y documenta sitios web de forma automática y confiable.

---

**Versión:** 2.0
**Estado:** ✅ Production Ready
**Última actualización:** 2025-10-30
**By:** StrykerUX Team
