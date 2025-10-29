# Web Scraper con Playwright - Fase 1

Herramienta de recolección automática de datos web para extraer HTML, screenshots, CSS y metadata de sitios.

## 🚀 Instalación

Ya completada. Los archivos necesarios están en su lugar.

### Verificar Instalación
```bash
npm --version      # Node.js debe estar instalado
npx playwright --version  # Debe mostrar v1.56.1 o similar
```

## 📖 Uso Rápido

### Ejecutar Scraper
```bash
npm run scrape https://example.com
```

### Ejemplos de URLs para Probar
```bash
# Sitio estático simple
npm run scrape https://example.com

# Sitio con React/Next.js
npm run scrape https://nextjs.org

# Blog/News
npm run scrape https://github.com

# E-commerce
npm run scrape https://www.amazon.com
```

## 📁 Estructura del Proyecto

```
play/
├── scraper.js                 # Script principal de scraping
├── package.json               # Dependencias y scripts
├── package-lock.json          # Lock de versiones
├── PLAN_DE_PRUEBAS.md        # Plan completo de testing
├── README.md                  # Este archivo
└── output/                    # Carpeta de resultados (se crea automáticamente)
    └── 2025-10-21T14-30-45-123/  # Timestamp de ejecución
        ├── data.json          # Todos los datos extraídos (JSON)
        ├── summary.json       # Resumen y metadatos
        ├── classes.json       # Lista de clases CSS
        ├── page-desktop.html  # HTML completo (versión desktop)
        ├── page-mobile.html   # HTML completo (versión mobile)
        ├── screenshot-desktop.png  # Captura 1920x1080
        └── screenshot-mobile.png   # Captura 375x667
```

## 📊 Salida del Scraper

### archivo `summary.json` (Resumen Rápido)
```json
{
  "url": "https://example.com",
  "scrapedAt": "2025-10-21T14:30:45.123Z",
  "technologies": {
    "frameworks": ["react"],
    "cssFrameworks": ["tailwind"],
    "libraries": []
  },
  "confidence": 92,
  "statistics": {
    "totalClasses": 156,
    "totalImages": 23,
    "totalLinks": 45,
    "totalForms": 2,
    "totalHeadings": 8
  },
  "files": { ... }
}
```

### archivo `data.json` (Datos Completos)
Contiene:
- **html.desktop** / **html.mobile** - HTML completo renderizado
- **css.classes** - Array de todas las clases CSS
- **images** - Lista de imágenes con src, alt, dimensiones
- **links** - Lista de enlaces (máx 50)
- **forms** - Estructura de formularios
- **headings** - Títulos/encabezados
- **metadata** - URL, timestamp, tecnologías detectadas
- **confidence** - Score 0-100 de qué tan completo es el scrape

### archivo `classes.json`
```json
{
  "total": 156,
  "classes": [
    "container",
    "flex",
    "justify-center",
    "text-lg",
    "bg-slate-900",
    ...
  ]
}
```

## 🧪 Pruebas

Ver documento completo: [`PLAN_DE_PRUEBAS.md`](./PLAN_DE_PRUEBAS.md)

### Test Rápido
```bash
# Probar con example.com (sitio simple)
npm run scrape https://example.com

# Verificar que se creó la carpeta output/
ls -la output/

# Ver el resumen
cat output/*/summary.json | jq .
```

### Validar Salida
```bash
# Contar clases CSS extraídas
jq '.css.classes | length' output/*/data.json

# Ver tecnologías detectadas
jq '.metadata.technologies' output/*/data.json

# Listar archivos generados
ls -lh output/*/
```

## ⚙️ Configuración

### Viewport Predeterminado
- **Desktop:** 1920x1080 (usuario con monitor grande)
- **Mobile:** 375x667 (iPhone SE)

Para cambiar, editar `scraper.js` líneas ~140 y ~170.

### Timeout
Predeterminado: **30 segundos** por página

Para sitios lentos, cambiar en `scraper.js` línea ~165:
```javascript
// Cambiar de:
timeout: 30000,
// A:
timeout: 60000, // 60 segundos
```

### User-Agent
Por defecto emula navegadores reales para evitar bloqueos.

Editar en `scraper.js` líneas ~142 (desktop) y ~172 (mobile).

## 🔍 Detección de Tecnologías

El script detecta automáticamente:
- **Frameworks:** React, Vue, Angular, Svelte, Next.js, Nuxt
- **CSS:** Tailwind, Bootstrap
- **Método:** Analiza URLs de scripts y contenido HTML

Para ampliar detecciones, editar función `detectTechnologies()` en `scraper.js`.

## ❌ Solución de Problemas

### Error: "Playwright not installed"
```bash
npm install
npx playwright install
```

### Error: "Browser launch failed"
**En Linux**, instalar dependencias:
```bash
npx playwright install-deps
# O manualmente:
sudo apt-get install libasound2t64
```

### Error: "Timeout waiting for..."
- Sitio es muy lento (aumentar timeout)
- Requiere autenticación (no soportado aún)
- URL bloqueada (usa anti-bot)

**Solución:** Aumentar timeout en configuración o usar URL diferente.

### Error: "Invalid URL"
```bash
# Incorrecto:
npm run scrape example.com

# Correcto:
npm run scrape https://example.com
npm run scrape http://example.com
```

### La carpeta `output/` está vacía
Revisar si hubo errores en los logs. El script imprime mensajes detallados.

## 📈 Siguientes Pasos (Fase 2 y 3)

Una vez tengas los datos extraídos en `data.json`:

1. **Fase 2:** Pasar los datos a Claude Code para generar código
   - Usar el JSON como entrada al prompt
   - Especificar framework destino (Next.js, React, etc.)

2. **Fase 3:** QA automático
   - Comparar screenshots original vs generado
   - Validar CSS con linters
   - Ejecutar tests

## 📝 Notas Importantes

- ⚠️ **Respeto Legal:** No usar para copiar contenido protegido sin permiso
- ⚠️ **Anti-bot:** Algunos sitios bloquean scrapers. Respetar `robots.txt`
- ⚠️ **Rate Limiting:** No hacer cientos de requests simultáneos
- ℹ️ **Confidencialidad:** Los datos se guardan localmente en `output/`

## 🛠️ Personalización

### Agregar Más Metadatos
Editar `extractPageInfo()` en `scraper.js` para extraer:
- Meta tags
- Open Graph (og:)
- JSON-LD structured data
- CSS custom properties (variables)

### Cambiar Formato de Salida
Por defecto: JSON. Posibles extensiones:
- CSV (para clases CSS)
- ZIP (comprimir todo)
- Base64 (para pasar a Claude)

## 💡 Tips

1. **Verificar salida HTML:**
   ```bash
   file output/*/page-desktop.html
   wc -l output/*/page-desktop.html
   ```

2. **Ver clases CSS únicas:**
   ```bash
   jq '.css.classes[:20]' output/*/data.json  # Primeras 20
   ```

3. **Contar elementos:**
   ```bash
   jq '.images | length' output/*/data.json
   jq '.links | length' output/*/data.json
   ```

4. **Verificar confidence:**
   ```bash
   jq '.confidence' output/*/summary.json
   ```

## 📚 Referencias

- [Playwright Documentation](https://playwright.dev)
- [Plan de Pruebas Completo](./PLAN_DE_PRUEBAS.md)
- [Documento de Propuesta Original](../Sugerencia%20de%20herramientas%20extra.pdf)

## 📞 Soporte

Si algo no funciona:
1. Revisar [`PLAN_DE_PRUEBAS.md`](./PLAN_DE_PRUEBAS.md) para tu caso de uso
2. Ejecutar con una URL conocida (example.com)
3. Revisar los logs completos en consola
4. Verificar conectividad a internet

---

**Versión:** 1.0
**Creado:** 2025-10-21
**Estado:** ✅ Listo para usar
