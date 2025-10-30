# Ejemplo: Replicar Landing Page con Fetch de Página Única

Este ejemplo muestra el flujo completo desde el fetch hasta la generación de código con Claude Code para una landing page de portafolio.

---

## Escenario

**Objetivo:** Replicar la landing page de un portafolio web con animaciones GSAP y scroll fluido.

**URL de referencia:** `https://ejemplo-portfolio.webflow.io`

**Características del sitio:**
- Hero con animación de texto
- Galería de proyectos en grid
- Sección "Sobre mí"
- Formulario de contacto
- Animaciones on-scroll

---

## Paso 1: Analizar el Sitio

Primero, abre el sitio en tu navegador y observa:

✅ **Tiene animaciones complejas?** → Sí (texto animado, parallax)
✅ **Tiene sliders/carousels?** → Sí (galería de proyectos)
✅ **Lazy-load de imágenes?** → Sí
✅ **Detecta bots?** → No

**Decisión:** Usar `fetch-fusion.js` para capturar animaciones y estados del slider.

---

## Paso 2: Ejecutar el Fetch

```powershell
# Navega a tu carpeta de proyecto
cd C:\Users\TuUsuario\fetch-playwright

# Ejecuta fetch-fusion (captura sliders y estados)
node scripts\single-page\fetch-fusion.js "https://ejemplo-portfolio.webflow.io"
```

**Output esperado:**

```
[fetch-fusion] Navegando a: https://ejemplo-portfolio.webflow.io
[fetch-fusion] Esperando networkidle...
[fetch-fusion] Intentando cerrar modal de cookies...
[fetch-fusion] Detectando sliders...
[fetch-fusion] Capturando slide 1/4...
[fetch-fusion] Capturando slide 2/4...
[fetch-fusion] Capturando slide 3/4...
[fetch-fusion] Capturando slide 4/4...
[fetch-fusion] Tomando screenshots finales...
Fetch fusion completo en: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045
```

---

## Paso 3: Verificar Outputs

Navega a la carpeta generada:

```powershell
cd fetch-results\20251030_153045
ls
```

Deberías ver:

```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        30/10/2025  15:30         142856 page.html
-a----        30/10/2025  15:30        1204567 screenshot_desktop.png
-a----        30/10/2025  15:30         856432 screenshot_mobile.png
-a----        30/10/2025  15:30         523891 screenshot_slide_1.png
-a----        30/10/2025  15:30         501234 screenshot_slide_2.png
-a----        30/10/2025  15:30         498765 screenshot_slide_3.png
-a----        30/10/2025  15:30         512345 screenshot_slide_4.png
-a----        30/10/2025  15:30          12453 classes_list.txt
-a----        30/10/2025  15:30           8921 resources.json
-a----        30/10/2025  15:30            234 fetch_info.txt
```

### Verificar Contenido Clave

```powershell
# Ver clases CSS detectadas (primeras 20 líneas)
cat classes_list.txt | Select-Object -First 20

# Ver recursos cargados
cat resources.json | jq .

# Ver info del fetch
cat fetch_info.txt
```

**Ejemplo de `fetch_info.txt`:**

```
url: https://ejemplo-portfolio.webflow.io
fetched_at: 2025-10-30T15:30:45.123Z
slides_captured: 4
```

---

## Paso 4: (Opcional) Extraer Stack Detectado

Si quieres ver qué tecnologías detectó:

```powershell
node scripts\single-page\extract-from-html.js .\page.html
```

Esto genera `detected_stack.json`:

```json
{
  "tailwind": false,
  "gsap": true,
  "lenis": false,
  "webflow": true,
  "react": false,
  "nextjs": false
}
```

**Interpretación:** El sitio usa GSAP y fue construido en Webflow.

---

## Paso 5: Preparar para Claude Code

Copia la **ruta completa** de la carpeta:

```powershell
# En PowerShell
(Get-Item .).FullName

# Output ejemplo:
# C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045
```

---

## Paso 6: Usar Prompt Maestro con Claude Code

1. Abre Claude Code (claude.com/claude-code)

2. Copia el [Prompt Maestro para Marketing Site](../docs/03-prompt-reference.md#1-prompt-para-página-única---marketing-site)

3. Reemplaza los marcadores con tus rutas:

```
INPUTS:
- page_html: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045\page.html
- screenshot_desktop: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045\screenshot_desktop.png
- screenshot_mobile: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045\screenshot_mobile.png
- classes_list: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045\classes_list.txt
- resources.json: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_153045\resources.json
```

4. Pega el prompt completo en Claude Code

---

## Paso 7: Fase 0 - Análisis

Claude Code responderá con `initial_report.json`:

```json
{
  "stack_sugerido": ["Astro 3.6.5", "React 18", "Tailwind v3", "GSAP", "Lenis"],
  "rationale": "El sitio usa GSAP para animaciones complejas y fue construido en Webflow con mucho énfasis en diseño visual y animaciones on-scroll. Astro + React permite replicar componentes interactivos manteniendo performance. GSAP es necesario para animaciones. Lenis para smooth scrolling.",
  "confidence_overall": 0.85
}
```

**Pregunta de Claude Code:** "¿Apruebas este stack? (Responde: SÍ / CAMBIAR)"

**Tu respuesta:** `SÍ`

---

## Paso 8: Fase 1 - Header + Hero

Claude Code genera:

### `phase_spec.json`

```json
{
  "fase": 1,
  "componentes": ["Header.jsx", "Hero.jsx", "index.astro"],
  "decisiones": {
    "header": "Sticky header con logo y nav. Animación de aparición al scroll up.",
    "hero": "Hero full-height con texto animado (GSAP SplitText) y CTA. Background con parallax sutil."
  },
  "dependencias_nuevas": ["gsap", "lenis", "@studio-freight/lenis"]
}
```

### Código Generado

**`src/components/Header.jsx`**

```jsx
import { useEffect } from 'react';
import gsap from 'gsap';
import './Header.css';

export default function Header() {
  useEffect(() => {
    // Animación de header al hacer scroll
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll && currentScroll > 100) {
        gsap.to('.header', { y: -100, duration: 0.3 });
      } else {
        gsap.to('.header', { y: 0, duration: 0.3 });
      }
      lastScroll = currentScroll;
    });
  }, []);

  return (
    <header className="header fixed top-0 w-full z-50 bg-white/90 backdrop-blur-sm">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="logo text-2xl font-bold">Portfolio</div>
        <ul className="flex gap-8">
          <li><a href="#work" className="hover:text-blue-600 transition">Work</a></li>
          <li><a href="#about" className="hover:text-blue-600 transition">About</a></li>
          <li><a href="#contact" className="hover:text-blue-600 transition">Contact</a></li>
        </ul>
      </nav>
    </header>
  );
}
```

*(Código de Hero.jsx e index.astro también generado)*

**Checklist Visual:**

- [x] Header sticky con backdrop blur
- [x] Logo y navegación responsive
- [x] Animación al scroll up/down
- [x] Hero full-height
- [x] Texto animado con GSAP
- [x] CTA visible

**Pregunta de Claude Code:** "¿APROBAR / EDITAR?"

**Tu respuesta:** `APROBAR`

---

## Paso 9: Fases Siguientes

Claude Code continúa con:

- **Fase 2:** Galería de proyectos (grid con hover effects)
- **Fase 3:** Sección "About" con imagen + texto
- **Fase 4:** Formulario de contacto + Footer

Cada fase espera tu aprobación antes de continuar.

---

## Paso 10: Entrega Final

Después de aprobar todas las fases, Claude Code entrega:

### `site_spec.json`

```json
{
  "proyecto": "Portfolio Landing Page",
  "stack": ["Astro 3.6.5", "React 18", "Tailwind v3", "GSAP", "Lenis"],
  "componentes_totales": 8,
  "paginas": 1,
  "confianza": 0.85,
  "optimizaciones_aplicadas": [
    "Lazy loading de imágenes",
    "Code splitting de React components",
    "Tailwind purge CSS",
    "Compresión de assets"
  ]
}
```

### `ci_checks.txt`

```bash
# Instalación
pnpm install

# Build
pnpm build

# Test (si hay)
pnpm test

# Tailwind build
npx tailwindcss -i ./src/styles/global.css -o ./dist/styles.css --minify
```

---

## Paso 11: Ejecutar Proyecto Localmente

```powershell
# Crear carpeta de proyecto
mkdir portfolio-landing && cd portfolio-landing

# Copiar archivos generados por Claude Code
# (descomprimir project_zip_base64 si fue generado)

# Instalar dependencias
pnpm install

# Dev server
pnpm dev

# Abrir en browser: http://localhost:4321
```

---

## Resultados Esperados

✅ Landing page funcional con estructura idéntica a la referencia
✅ Animaciones GSAP implementadas
✅ Responsive design (desktop + mobile)
✅ Sliders capturados y replicados
✅ Performance optimizado (Lighthouse > 90)

---

## Troubleshooting

### Animaciones no funcionan

**Causa:** GSAP no está inicializado correctamente.

**Solución:**

```jsx
// En Hero.jsx o componente con animación
useEffect(() => {
  gsap.registerPlugin(ScrollTrigger); // Si usas ScrollTrigger
  // Tu código de animación aquí
}, []);
```

### Imagenes no cargan

**Causa:** Rutas incorrectas o assets no copiados.

**Solución:**

Coloca placeholders de momento:

```jsx
<img src="https://placehold.co/1920x1080" alt="Placeholder" />
```

---

## Próximos Pasos

- Reemplazar placeholders con imágenes reales del cliente
- Ajustar colores según branding
- Conectar formulario de contacto a backend
- Deploy a Vercel/Netlify

---

[Volver a Documentación](../docs/01-single-page-fetch.md)
