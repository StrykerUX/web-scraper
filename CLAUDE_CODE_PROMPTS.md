# Prompts Maestros para Claude Code

Este documento contiene prompts optimizados para usar con los artifacts de **Cortana** y **Weapon** para generar proyectos completos con Claude Code.

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Flujo de Trabajo](#flujo-de-trabajo)
3. [Mapping de Archivos](#mapping-de-archivos)
4. [Prompt 1: Marketing Site (Astro + React)](#prompt-1-marketing-site-astro--react)
5. [Prompt 2: Platform Site (Next.js + PostgreSQL)](#prompt-2-platform-site-nextjs--postgresql)
6. [Prompt 3: Fusión de 2 Referencias](#prompt-3-fusión-de-2-referencias)
7. [Personalización de Prompts](#personalización-de-prompts)
8. [Tips de Uso](#tips-de-uso)

---

## Introducción

**Cortana** y **Weapon** generan artifacts ricos en datos que puedes usar directamente con Claude Code para replicar sitios web completos.

### ¿Qué es Claude Code?
Claude Code es un asistente de IA que puede generar proyectos web completos a partir de especificaciones y referencias visuales.

### ¿Cuándo usar cada scraper?
- **Cortana**: General purpose, rápido, completo
- **Weapon**: Sitios con sliders/carousels (captura múltiples estados)

---

## Flujo de Trabajo

```
1. Scrapear sitio
   ↓
   node cortana https://ejemplo.com
   ó
   node weapon https://ejemplo.com
   ↓
2. Obtener artifacts
   ↓
   output/ejemplo.com-123/
   ├── 4 screenshots
   ├── 2 HTML files
   ├── 8-9 JSON files
   └── 3-6 slider screenshots (solo Weapon)
   ↓
3. Copiar prompt maestro
   ↓
4. Reemplazar rutas en el prompt
   ↓
5. Pegar en Claude Code
   ↓
6. Proyecto generado 🎉
```

---

## Mapping de Archivos

### Cortana/Weapon Output → Prompt Inputs

| Archivo Generado | Uso en Prompt | Descripción |
|------------------|---------------|-------------|
| `desktop-fullpage.png` | `screenshot_desktop` | Captura completa desktop |
| `mobile-fullpage.png` | `screenshot_mobile` | Captura completa mobile |
| `page-desktop.html` | `page_html` | HTML renderizado desktop |
| `classes.json` | `classes_list` | Clases CSS detectadas |
| `tech-stack.json` | `detected_stack` | Frameworks/librerías detectados |
| `css-variables.json` | `css_variables` | Variables CSS custom properties |
| `resources.json` | `resources` | CSS, JS, imágenes, fuentes |
| `seo-analysis.json` | `seo_data` | Análisis SEO completo |
| `slider-slide-*.png` | `slider_screenshots` | Estados de carruseles (Weapon) |

---

## Prompt 1: Marketing Site (Astro + React)

### Stack Técnico
- Astro 3.6.5 + React 18
- Tailwind CSS v3
- GSAP + Lenis (solo si hay animaciones)
- pnpm

### Cuándo Usar
- Landing pages
- Sitios corporativos
- Portfolios
- Marketing websites

### Prompt Completo

```
INSTRUCCIONES:
Tengo artifacts generados por Cortana/Weapon. Analiza los archivos y crea un proyecto que replique la apariencia y estructura usando:
- Astro 3.6.5 + React 18
- Tailwind CSS v3
- GSAP + Lenis (solo si detectas animaciones)
- pnpm como gestor de paquetes

INPUTS (reemplaza con tus rutas absolutas):
- page_html: <ruta a page-desktop.html>
- screenshot_desktop: <ruta a desktop-fullpage.png>
- screenshot_mobile: <ruta a mobile-fullpage.png>
- classes_list: <ruta a classes.json>
- tech_stack: <ruta a tech-stack.json>
- css_variables: <ruta a css-variables.json>
- resources: <ruta a resources.json>

PASO 0 — ANÁLISIS:
1) Analiza los artifacts y devuelve un JSON llamado `initial_report.json`:
{
 "stack_sugerido": ["Astro","Tailwind v3","React","GSAP?"],
 "detected_frameworks": ["React", "Tailwind CSS"],
 "has_animations": true/false,
 "slider_detected": true/false,
 "confidence_overall": 0.0-1.0
}
2) Pregunta: "¿Apruebas este stack? (SÍ / CAMBIAR)". Espera respuesta.

PASO 1-N — DESARROLLO POR FASES:
- Fase 1: Header + Hero
- Fase 2: Sección Features/Services
- Fase 3: Testimonios / Galería
- Fase 4: CTA / Footer

Para cada fase:
- `phase_spec.json` con estructura y elementos
- Código Astro/TSX + Tailwind
- Checklist visual
- Pregunta: "¿APROBAR / EDITAR?". Espera respuesta.

REGLAS OBLIGATORIAS:
- Usa placeholders para imágenes
- Respeta las clases CSS detectadas en classes.json
- Si hay CSS variables, úsalas en tailwind.config.js
- Ejecuta `pnpm build` para verificar antes de aprobar
- Commits por fase en español

ENTREGA FINAL:
- `site_spec.json` (estructura completa)
- Proyecto funcional con `pnpm dev`
- README con instrucciones
- Solo entregar si confidence >= 0.75

FIN.
```

### Ejemplo de Uso

```bash
# 1. Scrapear
node cortana https://www.anthropic.com

# 2. Anotar la ruta
# output/anthropic.com-1234567890/

# 3. En el prompt, reemplazar:
- page_html: C:\Users\...\output\anthropic.com-1234567890\page-desktop.html
- screenshot_desktop: C:\Users\...\output\anthropic.com-1234567890\desktop-fullpage.png
- screenshot_mobile: C:\Users\...\output\anthropic.com-1234567890\mobile-fullpage.png
# etc.

# 4. Pegar en Claude Code
```

---

## Prompt 2: Platform Site (Next.js + PostgreSQL)

### Stack Técnico
- Next.js 14 App Router + TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js
- Stripe (opcional)
- pnpm

### Cuándo Usar
- Dashboards
- Plataformas SaaS
- Aplicaciones web con auth y DB

### Prompt Completo

```
INSTRUCCIONES:
Tengo artifacts generados por Cortana/Weapon. Crea una plataforma completa usando:
- Next.js 14 App Router con TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js para autenticación
- Stripe para pagos (si aplica)
- React Hook Form + Zod
- pnpm

INPUTS:
- page_html: <ruta a page-desktop.html>
- screenshot_desktop: <ruta a desktop-fullpage.png>
- screenshot_mobile: <ruta a mobile-fullpage.png>
- classes_list: <ruta a classes.json>
- tech_stack: <ruta a tech-stack.json>

PASO 0 — ANÁLISIS:
{
 "stack_sugerido": ["Next.js 14","PostgreSQL","NextAuth"],
 "db_schema_proposal": ["User","Product","Order"],
 "auth_required": true,
 "payment_integration": true/false,
 "confidence_overall": 0.0-1.0
}
Pregunta: "¿Apruebas el schema propuesto? (SÍ / CAMBIAR)"

FASES:
1. Setup proyecto + Prisma schema + Auth
2. Landing page (pública)
3. Dashboard / Panel usuario
4. Features principales (CRUD)
5. Deployment config

REGLAS:
- TypeScript estricto
- Validaciones con Zod
- Middleware de auth en rutas protegidas
- Server Components donde sea posible
- Variables de entorno documentadas (.env.example)

ENTREGA:
- Schema Prisma completo
- README con deployment instructions
- Tests básicos (si confidence >= 0.8)

FIN.
```

---

## Prompt 3: Fusión de 2 Referencias

### Stack Técnico
- Astro 3.6.5 + React 18
- Tailwind CSS v3
- pnpm

### Cuándo Usar
- Combinar lo mejor de 2 sitios
- Tomar header de uno, hero de otro
- Fusionar estilos de múltiples referencias

### Prompt Completo

```
INSTRUCCIONES:
Tengo artifacts de 2 sitios diferentes. Fusiona lo mejor de ambos:
- Astro 3.6.5 + React 18
- Tailwind CSS v3
- pnpm

REFERENCIA 1:
- page_html_1: <ruta a ref1/page-desktop.html>
- screenshot_1: <ruta a ref1/desktop-fullpage.png>
- classes_1: <ruta a ref1/classes.json>
- stack_1: <ruta a ref1/tech-stack.json>

REFERENCIA 2:
- page_html_2: <ruta a ref2/page-desktop.html>
- screenshot_2: <ruta a ref2/desktop-fullpage.png>
- classes_2: <ruta a ref2/classes.json>
- stack_2: <ruta a ref2/tech-stack.json>

FASE 0: ANÁLISIS
Resumen de qué tomarás de cada referencia:
- Header: ¿Ref1 o Ref2?
- Hero: ¿Ref1 o Ref2?
- Features: ¿Ref1, Ref2, o mezcla?
- Footer: ¿Ref1 o Ref2?

Espera aprobación antes de continuar.

FASES:
1. Header + Hero
2. Secciones intermedias
3. Contacto + Footer
4. Consolidación

NOTAS:
- Si hay conflicto visual, propón 2 alternativas (A y B)
- Usa Astro como denominador común
- Combina CSS variables de ambas referencias

FIN.
```

### Ejemplo Dual-Scrape

```bash
# Scrapear ambos sitios
node cortana https://ref1.com
node cortana https://ref2.com

# Anotar ambas rutas
# output/ref1.com-111/
# output/ref2.com-222/

# En el prompt:
REFERENCIA 1:
- page_html_1: C:\...\output\ref1.com-111\page-desktop.html
- screenshot_1: C:\...\output\ref1.com-111\desktop-fullpage.png
...

REFERENCIA 2:
- page_html_2: C:\...\output\ref2.com-222\page-desktop.html
- screenshot_2: C:\...\output\ref2.com-222\desktop-fullpage.png
...
```

---

## Personalización de Prompts

### Cambiar Stack Técnico

Modifica la sección de INSTRUCCIONES:

```
// En lugar de Astro:
INSTRUCCIONES:
Crea un proyecto usando:
- Vite 5 + Vue 3 Composition API
- Tailwind CSS v3
- Pinia para state management
- pnpm
```

### Añadir Validaciones

```
PASO 0 — ANÁLISIS:
...
"accessibility_score": 0.0-1.0,
"performance_budget": "< 100KB initial bundle",
"lighthouse_target": "> 90 todas las métricas",
"wcag_level": "AA"
```

### Modificar Fases

```
FASES:
- Fase 1: Setup base
- Fase 2: Design System (colores, tipografía)
- Fase 3: Header + Navigation
- Fase 4: Hero Section
- Fase 5: Features Grid
- Fase 6: Testimonios
- Fase 7: Pricing
- Fase 8: FAQ
- Fase 9: Footer
```

---

## Tips de Uso

### 1. Rutas Absolutas

✅ **Correcto:**
```
C:\Users\Usuario\Documents\projectscode\play\output\site-123\page-desktop.html
```

❌ **Evitar:**
```
./output/site-123/page-desktop.html
```

### 2. Archivos Opcionales

Si no tienes algún archivo:

```
- css_variables: no disponible
- slider_screenshots: null
```

### 3. Usar Weapon para Sliders

Si el sitio tiene carruseles:

```bash
# Usa Weapon en lugar de Cortana
node weapon https://sitio-con-slider.com

# Luego en el prompt:
- slider_screenshots: <ruta a slider-slide-1.png, slider-slide-2.png, ...>
```

### 4. Iteración

- Pide regenerar fases si no te gusta
- Modifica el prompt mid-flow
- Combina elementos de diferentes prompts

---

## Comparación Cortana vs Weapon

| Feature | Cortana | Weapon |
|---------|---------|--------|
| Velocidad | ⚡ Rápido (~28s) | ⚡ Moderado (~35-45s) |
| Archivos | 14 archivos | 14-21 archivos |
| Slider Capture | ❌ Solo detecta | ✅ Captura 3-6 estados |
| Uso recomendado | General purpose | Sitios con carruseles |

**Recomendación:** Usa Cortana por defecto. Usa Weapon solo si el sitio tiene sliders importantes.

---

## Próximos Pasos

1. Scrapea tu sitio con `node cortana <url>` o `node weapon <url>`
2. Elige el prompt adecuado (Marketing, Platform, o Fusión)
3. Reemplaza las rutas con tus archivos reales
4. Pega en Claude Code
5. Sigue el flujo por fases
6. ¡Proyecto completo! 🎉

---

**Versión:** 1.0
**Última actualización:** 2025-10-31
**Compatible con:** Cortana (todas las versiones), Weapon 1.0+
