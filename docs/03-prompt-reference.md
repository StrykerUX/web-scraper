# Prompts Maestros para Claude Code

Este documento contiene todos los prompts maestros listos para usar con Claude Code. Simplemente copia el prompt adecuado, reemplaza los marcadores con tus rutas reales, y pégalo en Claude Code.

---

## Índice

1. [Prompt para Página Única - Marketing Site](#1-prompt-para-página-única---marketing-site)
2. [Prompt para Página Única - Platform](#2-prompt-para-página-única---platform)
3. [Prompt para Fusión de 2 Referencias](#3-prompt-para-fusión-de-2-referencias)
4. [Cómo Personalizar los Prompts](#4-cómo-personalizar-los-prompts)

---

## 1. Prompt para Página Única - Marketing Site

**Usa este prompt cuando:** Tengas los artifacts de **una sola página** (generados por cualquiera de los scripts de [01-single-page-fetch.md](01-single-page-fetch.md)) y quieras crear un **sitio de marketing** (landing page, portafolio, corporativo).

### Stack Técnico
- Astro 3.6.5 + React 18
- GSAP + Lenis (para animaciones)
- Tailwind CSS v3
- SSG (Static Site Generation)
- pnpm

### Prompt Completo

```
INSTRUCCIONES:
Tengo una carpeta con el fetch realizado por Playwright. Analiza los archivos y crea un proyecto que replique la apariencia y estructura usando este stack (usa solo lo necesario):
- Astro 3.6.5 + React 18
- GSAP + Lenis (solo si hay animaciones)
- Tailwind CSS v3
- SSG (Static Site Generation)
- pnpm como gestor de paquetes

INPUTS (proporciona rutas o URLs públicas):
- page_html: <ruta o URL a page.html>
- screenshot_desktop: <ruta o URL a screenshot_desktop.png>
- screenshot_mobile: <ruta o URL a screenshot_mobile.png>
- classes_list (opcional): <ruta o URL a classes_list.txt>
- resources.json (opcional): <ruta o URL a resources.json>

PASO 0 — ANALISIS:
1) Analiza los artifacts y devuelve ONLY un JSON llamado `initial_report.json` con:
{
 "stack_sugerido": ["Astro","Tailwind v3","React?","GSAP?"],
 "rationale": "texto corto justificando la elección",
 "confidence_overall": 0.0
}
2) Pregunta al usuario: "¿Apruebas este stack? (Responde: SÍ / CAMBIAR)". Espera la respuesta antes de continuar.

PASO 1..N — DESARROLLO POR FASES:
- Fase 1: Header + Hero
- Fase 2: Sección principal/Features
- Fase 3: Testimonios / Galería
- Fase 4: CTA / Footer

Para cada fase, devuelve:
- `phase_spec.json` con la estructura y elementos detectados
- Código de la fase (Astro/TSX + Tailwind) como archivos en un ZIP codificado en base64 `phase_zip_base64` (si lo pido)
- Checklist visual para revisión
- Pregunta: "¿APROBAR / EDITAR?". Espera mi respuesta.

REGLAS OBLIGATORIAS:
- No usar utilidades exclusivas de Tailwind v4; si las detectas, mapea y documenta.
- Usa placeholders para imágenes.
- Ejecuta `pnpm build` localmente para verificar el build de la fase antes de pedir aprobación.
- Haz commits por fase con mensajes en español.

ENTREGA FINAL:
- `site_spec.json` (estructura completa) y `project_zip_base64` solo si `confidence_overall >= 0.75`.
- `ci_checks.txt` con comandos pnpm para CI (install, build, test, tailwind build).

FIN.
```

### Cómo Usar

1. Ejecuta uno de los scripts de página única:
   ```powershell
   node fetch-fusion.js "https://ejemplo.com"
   ```

2. Copia el prompt de arriba

3. Reemplaza los marcadores `<...>` con las rutas reales de tu fetch:
   ```
   - page_html: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015\page.html
   - screenshot_desktop: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015\screenshot_desktop.png
   - screenshot_mobile: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015\screenshot_mobile.png
   - classes_list: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015\classes_list.txt
   - resources.json: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015\resources.json
   ```

4. Pega en Claude Code y sigue las instrucciones

---

## 2. Prompt para Página Única - Platform

**Usa este prompt cuando:** Necesites crear una **plataforma web completa** con autenticación, base de datos, pagos, etc. (no solo un sitio estático).

### Stack Técnico
- Next.js 14 App Router con TypeScript
- PostgreSQL + Prisma ORM
- NextAuth.js para autenticación
- Stripe para pagos
- React Hook Form + Zod para validaciones
- pnpm

### Prompt Completo

```
INSTRUCCIONES:
Tengo una carpeta con el fetch realizado por Playwright. Analiza los archivos y crea un proyecto plataforma usando este stack completo:
- Next.js 14 App Router con TypeScript
- PostgreSQL + Prisma ORM para base de datos
- NextAuth.js para autenticación
- Stripe para pagos
- React Hook Form + Zod para validaciones
- pnpm como gestor de paquetes

INPUTS (proporciona rutas o URLs públicas):
- page_html: <ruta o URL a page.html>
- screenshot_desktop: <ruta o URL a screenshot_desktop.png>
- screenshot_mobile: <ruta o URL a screenshot_mobile.png>
- classes_list (opcional): <ruta o URL a classes_list.txt>
- resources.json (opcional): <ruta o URL a resources.json>

PASO 0 — ANALISIS:
1) Analiza los artifacts y devuelve un JSON llamado `initial_report.json` con:
{
 "stack_sugerido": ["Next.js 14","PostgreSQL","NextAuth","Stripe?"],
 "rationale": "texto justificando la elección",
 "db_schema_proposal": ["User","Product","Order"],
 "auth_required": true,
 "confidence_overall": 0.0
}
2) Pregunta: "¿Apruebas este stack y el schema propuesto? (Responde: SÍ / CAMBIAR)". Espera respuesta.

PASO 1..N — DESARROLLO POR FASES:
- Fase 1: Setup proyecto + Prisma schema + Auth
- Fase 2: Landing page (página pública)
- Fase 3: Dashboard / Panel de usuario
- Fase 4: Features principales (CRUD, pagos si aplica)
- Fase 5: Deployment config

Para cada fase:
- `phase_spec.json` con estructura y decisiones
- Código organizado (app/, components/, lib/, prisma/)
- Instrucciones de setup (env vars, migraciones)
- Pregunta: "¿APROBAR / EDITAR?". Espera respuesta.

REGLAS OBLIGATORIAS:
- Usa TypeScript estricto
- Implementa validaciones con Zod en todas las forms
- Configura middleware de autenticación en rutas protegidas
- Usa Server Components donde sea posible
- Haz commits por fase en español

ENTREGA FINAL:
- Schema Prisma completo
- Variables de entorno documentadas (.env.example)
- README con instrucciones de deployment
- Tests básicos (opcional, si confidence >= 0.8)

FIN.
```

### Cómo Usar

Similar al prompt de Marketing Site, pero asegúrate de tener:
- PostgreSQL instalado localmente o acceso a DB remota
- Cuenta de Stripe (si usarás pagos)
- Variables de entorno configuradas

---

## 3. Prompt para Fusión de 2 Referencias

**Usa este prompt cuando:** Tengas artifacts de **2 páginas diferentes** (generados por [fetch-two-pages.js](02-dual-page-fetch.md)) y quieras fusionar lo mejor de ambas.

### Stack Técnico
- Astro 3.6.5 + React 18
- Tailwind CSS v3
- GSAP + Lenis
- pnpm

### Prompt Completo

```
INSTRUCCIONES GENERALES:
Eres un desarrollador senior front-end especializado en Astro 3.6.5 + React 18, con Tailwind CSS, GSAP y Lenis. Trabajarás por fases para fusionar lo mejor de dos páginas de referencia y crear un proyecto base.

RUTA DE ARCHIVOS: <ruta completa a la carpeta fetch-results/YYYYMMDD_HHMMSS/>

Contenido de la carpeta:
- combined_summary.json (en la raíz de la carpeta timestamp)
- ref1_<hostname>/ref1.html, ref1_summary.json, ref1_full.png
- ref2_<hostname>/ref2.html, ref2_summary.json, ref2_full.png
- (Opcional) cliente.json

FASES:
- FASE 0: Análisis (no avances hasta confirmación)
- FASE 1: Header + Hero
- FASE 2: Secciones intermedias (Servicios, Menú, Galería, Testimonios)
- FASE 3: Contacto + Footer
- FASE 4: Consolidación y entrega (README, package.json con pnpm, tailwind.config)

REQUISITOS DE SALIDA (por fase):
- Resumen de decisiones de diseño (qué se toma de cada ref)
- Árbol de archivos
- Código funcional (Header.jsx, Hero.jsx, index.astro, etc.)
- Snippets GSAP + Lenis si se detectan animaciones
- TODOs para datos del cliente

NOTAS:
- Usa PNPM en instrucciones de instalación (pnpm init, pnpm add ...)
- No generar assets binarios; referencia archivos en la ruta dada
- Si hay conflicto visual, propon 2 alternativas (A - cercano a ref1, B - mezcla)

INSTRUCCIÓN DE INICIO (FASE 0):
1) Lee todos los JSON y capturas en la ruta proporcionada
2) Resume en 6-8 líneas qué tomarás de cada referencia
3) Propón el plan de fases detallado (qué incluye cada fase)
4) Espera mi confirmación para iniciar FASE 1

REGLAS OBLIGATORIAS:
- No usar utilidades exclusivas de Tailwind v4
- Usa placeholders para imágenes
- Haz commits por fase con mensajes en español
- Si detectas que una ref usa Next.js y otra Webflow, elige Astro como común denominador

ENTREGA FINAL:
Solo entregar proyecto completo si confidence >= 0.75. Incluir:
- site_spec.json (estructura completa fusionada)
- project_zip_base64 (opcional, si se solicita)
- ci_checks.txt con comandos pnpm

FIN.
```

### Cómo Usar

1. Ejecuta el script de 2 referencias:
   ```powershell
   .\run-fetch.ps1 -url1 "https://ref1.com" -url2 "https://ref2.com"
   ```

2. Anota la ruta de la carpeta generada:
   ```
   C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015
   ```

3. Copia el prompt de arriba

4. Reemplaza `<ruta completa...>` con la ruta real:
   ```
   RUTA DE ARCHIVOS: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_143015
   ```

5. Pega en Claude Code y sigue el flujo por fases

---

## 4. Cómo Personalizar los Prompts

### Cambiar el Stack Técnico

Si quieres usar un stack diferente, modifica la sección de INSTRUCCIONES:

**Ejemplo - Usar Vite + Vue en lugar de Astro:**

```
INSTRUCCIONES:
Tengo una carpeta con el fetch realizado por Playwright. Analiza los archivos y crea un proyecto usando:
- Vite 5 + Vue 3 Composition API
- Tailwind CSS v3
- Pinia para state management
- pnpm como gestor de paquetes
```

### Añadir Restricciones Adicionales

Agrega reglas en la sección REGLAS OBLIGATORIAS:

```
REGLAS OBLIGATORIAS:
- No usar utilidades exclusivas de Tailwind v4
- Usa placeholders para imágenes
- TODO el código debe estar en TypeScript estricto
- Componentes máximo 200 líneas cada uno
- Usa CSS Modules en lugar de Tailwind para componentes complejos
- Implementa lazy loading para todas las imágenes
```

### Modificar el Flujo de Fases

Cambia la sección PASO 1..N según tu necesidad:

```
PASO 1..N — DESARROLLO POR FASES:
- Fase 1: Setup + Estructura base
- Fase 2: Header + Navigation
- Fase 3: Hero Section + CTA
- Fase 4: Features Grid
- Fase 5: Testimonios + Social Proof
- Fase 6: Pricing Section
- Fase 7: FAQ
- Fase 8: Footer + Legal
```

### Añadir Validaciones Específicas

En PASO 0 - ANALISIS, añade validaciones:

```
PASO 0 — ANALISIS:
1) Analiza los artifacts y devuelve un JSON con:
{
 "stack_sugerido": [...],
 "rationale": "...",
 "accessibility_score": 0.0,
 "performance_budget": "< 100KB initial bundle",
 "seo_requirements": ["sitemap.xml", "robots.txt", "meta tags"],
 "confidence_overall": 0.0
}
2) Valida que el proyecto cumplirá con:
   - Lighthouse score > 90 en todas las métricas
   - WCAG 2.1 Level AA
   - Core Web Vitals "Good"
3) Pregunta al usuario: "¿Apruebas?" y espera respuesta.
```

---

## Tips de Uso

### 1. Rutas Absolutas vs Relativas

Claude Code prefiere rutas absolutas. Usa:

✅ **Correcto:**
```
- page_html: C:\Users\Julio\fetch-playwright\fetch-results\20251030_143015\page.html
```

❌ **Evitar:**
```
- page_html: .\fetch-results\20251030_143015\page.html
```

### 2. Archivos Opcionales

Si no tienes algún archivo opcional, simplemente indica `null` o `no disponible`:

```
- page_html: C:\ruta\al\page.html
- screenshot_desktop: C:\ruta\al\screenshot_desktop.png
- screenshot_mobile: no disponible
- classes_list: null
- resources.json: C:\ruta\al\resources.json
```

### 3. URLs Públicas

Si subes tus artifacts a la nube, puedes usar URLs directamente:

```
- page_html: https://mi-bucket.s3.amazonaws.com/fetch-20251030/page.html
- screenshot_desktop: https://mi-bucket.s3.amazonaws.com/fetch-20251030/screenshot.png
```

### 4. Iteración y Refinamiento

No tengas miedo de:
- Pedir que Claude Code regenere una fase si no te gusta
- Modificar el prompt mid-flow para ajustar dirección
- Combinar elementos de diferentes prompts

---

## Próximos Pasos

- **[04-troubleshooting.md](04-troubleshooting.md)** - Solución de problemas comunes
- **[README.md](../README.md)** - Volver al inicio

---

**¡Prompts listos para usar!** Elige el prompt adecuado, personalízalo si es necesario, y empieza a generar código con Claude Code.
