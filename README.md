# 🎮 CORTANA - Web Intelligence Scanner v2.5

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
| Velocidad | ⚡ Rápido (~28s) | ⚡ Moderado (~45s) |
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
