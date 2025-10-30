# Web Scraping con Playwright + Claude Code

Herramientas profesionales para extraer y replicar sitios web usando Playwright, con integración directa para generar código con Claude Code.

---

## 🚀 Quick Start

### 1. Instalación

```powershell
# Crear proyecto
mkdir fetch-playwright && cd fetch-playwright
pnpm init -y

# Instalar Playwright
pnpm add -D playwright
npx playwright install
```

### 2. Ejecutar Fetch

```powershell
# Página única (simple y rápida)
node scripts/single-page/fetch-static.js "https://ejemplo.com"

# Página con animaciones
node scripts/single-page/fetch-dynamic.js "https://ejemplo.com"

# Dos páginas para fusionar
node scripts/dual-page/fetch-two-pages.js "https://ref1.com" "https://ref2.com"
```

### 3. Usar con Claude Code

Copia la ruta de los artifacts generados, pega el [prompt maestro](docs/03-prompt-reference.md) en Claude Code, y genera tu proyecto.

---

## 📚 Documentación Completa

| Documento | Descripción |
|-----------|-------------|
| **[00-installation.md](docs/00-installation.md)** | Instalación de Node, Playwright y pnpm |
| **[01-single-page-fetch.md](docs/01-single-page-fetch.md)** | 4 scripts para fetchear una página (estático, dinámico, fusion, stealth) |
| **[02-dual-page-fetch.md](docs/02-dual-page-fetch.md)** | Script para fetchear y fusionar 2 referencias |
| **[03-prompt-reference.md](docs/03-prompt-reference.md)** | Prompts maestros listos para Claude Code |
| **[04-troubleshooting.md](docs/04-troubleshooting.md)** | Solución de problemas comunes |

---

## 🎯 ¿Qué Script Usar?

### Página Única

| Script | Velocidad | Uso Ideal |
|--------|-----------|-----------|
| `fetch-static.js` | ⚡⚡⚡ | Landing pages estáticas, blogs sin JS complejo |
| `fetch-dynamic.js` | ⚡⚡ | SPAs, sitios con animaciones GSAP, lazy-load |
| `fetch-fusion.js` | ⚡ | Universal, captura sliders/carousels automáticamente |
| `fetch-stealth.js` | ⚡ | Sitios con Cloudflare, detección anti-bot |

### Dos Páginas

| Script | Uso Ideal |
|--------|-----------|
| `fetch-two-pages.js` | Fusionar lo mejor de 2 referencias diferentes |

**Guía detallada:** [01-single-page-fetch.md](docs/01-single-page-fetch.md#comparación-de-scripts)

---

## 📦 Outputs Generados

Cada script genera una carpeta en `fetch-results/` con:

- ✅ **page.html** - HTML renderizado post-JavaScript
- ✅ **screenshot_*.png** - Capturas full-page (desktop y mobile)
- ✅ **resources.json** - Lista de CSS, JS, imágenes detectadas
- ✅ **classes_list.txt** - Todas las clases CSS (para Tailwind)
- ✅ **fetch_info.txt** - Metadatos del fetch
- ✅ **detected_stack.json** - Stack técnico detectado (opcional)

Estos artifacts están listos para usar con Claude Code.

---

## 🛠️ Tech Stack Soportado

Los prompts maestros generan código para:

### Marketing Sites
- **Astro 3.6.5** + React 18
- **Tailwind CSS v3**
- **GSAP + Lenis** (animaciones)
- **pnpm**

### Plataformas Completas
- **Next.js 14** App Router + TypeScript
- **PostgreSQL + Prisma ORM**
- **NextAuth.js** (autenticación)
- **Stripe** (pagos)
- **pnpm**

**Personalización:** [Cómo cambiar el stack](docs/03-prompt-reference.md#4-cómo-personalizar-los-prompts)

---

## 🔄 Flujo Completo

```
┌─────────────────────┐
│  1. Ejecutar Script │
│     Playwright      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  2. Artifacts       │
│  (HTML + imgs +     │
│   JSON + metadata)  │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  3. Claude Code     │
│  (con prompt        │
│   maestro)          │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  4. Código Generado │
│  (Astro/Next.js +   │
│   componentes)      │
└─────────────────────┘
```

---

## 📋 Ejemplos

### Ejemplo 1: Landing Page Estática

```powershell
# Fetch
node scripts/single-page/fetch-static.js "https://ejemplo.com"

# Resultado: fetch-results/2025-10-30T14-30-15-123Z/
# - page.html, screenshots, resources.json
```

Ver [ejemplo completo](examples/single-page-example.md)

### Ejemplo 2: Sitio con Animaciones GSAP

```powershell
# Fetch
node scripts/single-page/fetch-fusion.js "https://sitio-con-animaciones.com"

# Incluye captura de múltiples slides y clases CSS
```

### Ejemplo 3: Fusión de 2 Referencias

```powershell
# Fetch
.\scripts\dual-page\run-fetch.ps1 -url1 "https://ref1.com" -url2 "https://ref2.com"

# Genera combined_summary.json con recomendaciones
```

Ver [ejemplo completo](examples/dual-page-example.md)

---

## ⚡ Características

- ✅ **4 estrategias de fetch** adaptadas a diferentes tipos de sitios
- ✅ **Captura automática de sliders** y estados múltiples
- ✅ **Detección de stack técnico** (Tailwind, GSAP, React, etc.)
- ✅ **Screenshots responsive** (desktop + mobile)
- ✅ **Extracción de clases CSS** para mapping de Tailwind
- ✅ **Modo stealth** para evadir detección de bots
- ✅ **Fusión inteligente** de 2 referencias
- ✅ **Prompts optimizados** para Claude Code

---

## 🧰 Comandos Útiles

```powershell
# Ver carpetas de resultados
ls fetch-results

# Abrir carpeta más reciente
explorer (Get-ChildItem fetch-results | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

# Ver clases CSS extraídas
cat fetch-results\<timestamp>\classes_list.txt

# Ver stack detectado
cat fetch-results\<timestamp>\detected_stack.json | jq .

# Ejecutar extractor standalone
node scripts/single-page/extract-from-html.js .\fetch-results\<timestamp>\page.html
```

---

## 🐛 Troubleshooting

Problemas comunes y soluciones:

| Problema | Solución Rápida |
|----------|----------------|
| `node: command not found` | Instala Node.js desde [nodejs.org](https://nodejs.org/) |
| Playwright no encuentra navegadores | `npx playwright install` |
| Timeouts al cargar páginas | Aumenta timeout en el script |
| Sitio bloquea el fetch | Usa `fetch-stealth.js` |
| PowerShell bloquea scripts | `Set-ExecutionPolicy RemoteSigned` |

**Guía completa:** [04-troubleshooting.md](docs/04-troubleshooting.md)

---

## 📁 Estructura del Proyecto

```
web-scraping-playwright/
├── README.md                   # Este archivo
├── docs/                       # Documentación completa
│   ├── 00-installation.md
│   ├── 01-single-page-fetch.md
│   ├── 02-dual-page-fetch.md
│   ├── 03-prompt-reference.md
│   └── 04-troubleshooting.md
├── scripts/
│   ├── single-page/           # Scripts para 1 página
│   │   ├── fetch-static.js
│   │   ├── fetch-dynamic.js
│   │   ├── fetch-fusion.js
│   │   ├── fetch-stealth.js
│   │   └── extract-from-html.js
│   └── dual-page/             # Scripts para 2 páginas
│       ├── fetch-two-pages.js
│       └── run-fetch.ps1
├── examples/                  # Ejemplos de uso
│   ├── single-page-example.md
│   └── dual-page-example.md
└── templates/                 # Templates
    ├── cliente.json.example
    └── combined_summary.json.example
```

---

## 🚧 Roadmap

- [ ] Script para batch processing (múltiples URLs)
- [ ] Integración con Puppeteer como alternativa
- [ ] Dashboard web para visualizar resultados
- [ ] Export directo a Figma
- [ ] Detección automática de componentes reutilizables
- [ ] Support para sitios SPA con routing complejo

---

## 🤝 Contribuir

¿Encontraste un bug o tienes una mejora? ¡Contribuciones son bienvenidas!

1. Fork el repositorio
2. Crea una branch (`git checkout -b feature/mejora-increible`)
3. Commit tus cambios (`git commit -m 'feat: añadir mejora increíble'`)
4. Push a la branch (`git push origin feature/mejora-increible`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - Libre para uso personal y comercial.

---

## 🔗 Enlaces Útiles

- **Playwright Docs:** [playwright.dev](https://playwright.dev/)
- **Astro Docs:** [docs.astro.build](https://docs.astro.build/)
- **Tailwind CSS:** [tailwindcss.com](https://tailwindcss.com/)
- **Claude Code:** [claude.com/claude-code](https://claude.com/claude-code)

---

## 📞 Soporte

- **Documentación:** Lee [04-troubleshooting.md](docs/04-troubleshooting.md)
- **Issues:** Reporta bugs en GitHub Issues
- **Preguntas:** Usa GitHub Discussions

---

**¡Comienza ahora!** → [Guía de Instalación](docs/00-installation.md)
