# Ejemplo: Fusión de 2 Referencias con Fetch Dual

Este ejemplo muestra el flujo completo para fetchear 2 páginas diferentes y fusionar lo mejor de ambas usando Claude Code.

---

## Escenario

**Objetivo:** Crear un sitio para un restaurante combinando elementos de 2 referencias diferentes.

**Referencias:**
- **Ref 1:** `https://foody-onepage.webflow.io/` (diseño moderno, enfoque delivery)
- **Ref 2:** `https://restaurante-gourmet.webflow.io/` (elegante, enfoque fine dining)

**Lo que queremos tomar:**
- Hero de Ref 1 (moderno, impactante)
- Sección "About" de Ref 2 (storytelling elegante)
- Menu grid de Ref 1 (limpio y organizado)
- Galería de Ref 2 (fotos de alta calidad)
- Formulario de contacto de Ref 1 (simple y efectivo)

---

## Paso 1: Ejecutar el Fetch de 2 Referencias

```powershell
# Navega a tu carpeta de proyecto
cd C:\Users\TuUsuario\fetch-playwright

# Ejecuta el script con wrapper PowerShell
.\scripts\dual-page\run-fetch.ps1 -url1 "https://foody-onepage.webflow.io/" -url2 "https://restaurante-gourmet.webflow.io/"
```

**Output esperado:**

```
Ejecutando fetch de dos páginas...
1) https://foody-onepage.webflow.io/
2) https://restaurante-gourmet.webflow.io/
[ref1] Navegando a: https://foody-onepage.webflow.io/
[ref1] Completado: summary -> ...ref1_summary.json
[ref2] Navegando a: https://restaurante-gourmet.webflow.io/
[ref2] Completado: summary -> ...ref2_summary.json
✅ Combined saved to C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_154530\combined_summary.json
Proceso completado. Revisa la carpeta fetch-results\20251030_154530\ref1_* y ref2_*
```

---

## Paso 2: Verificar Estructura Generada

```powershell
cd fetch-results\20251030_154530
tree /F
```

**Estructura esperada:**

```
20251030_154530/
├── combined_summary.json
├── ref1_foody-onepage-webflow-io/
│   ├── ref1.html
│   ├── ref1_summary.json
│   └── ref1_full.png
└── ref2_restaurante-gourmet-webflow-io/
    ├── ref2.html
    ├── ref2_summary.json
    └── ref2_full.png
```

---

## Paso 3: Revisar `combined_summary.json`

```powershell
cat combined_summary.json | jq .
```

**Extracto del JSON:**

```json
{
  "timestamp": "20251030_154530",
  "url1": "https://foody-onepage.webflow.io/",
  "url2": "https://restaurante-gourmet.webflow.io/",
  "title1": "Foody - Fresh Food Fast",
  "title2": "Restaurante Gourmet - Fine Dining",
  "topHeadings1": [
    {"tag":"h1","text":"Order Fresh Food Online","classes":"hero-title"},
    {"tag":"h2","text":"Popular Dishes","classes":"menu-heading"}
  ],
  "topHeadings2": [
    {"tag":"h1","text":"Experience Culinary Excellence","classes":"hero-main"},
    {"tag":"h2","text":"Our Story","classes":"about-title"}
  ],
  "recommendedComponents": ["header","footer","hero","gallery","contact_form"]
}
```

### Análisis Visual de Screenshots

Abre las imágenes para comparar:

```powershell
explorer ref1_foody-onepage-webflow-io\ref1_full.png
explorer ref2_restaurante-gourmet-webflow-io\ref2_full.png
```

**Observaciones:**
- ✅ Ref 1: Hero vibrante con CTA claro, colores llamativos
- ✅ Ref 2: Hero elegante con imagen de fondo, tipografía serif
- ✅ Ref 1: Menu en grid simple con iconos
- ✅ Ref 2: Galería tipo masonry, fotos profesionales

---

## Paso 4: (Opcional) Añadir Datos del Cliente

Crea `cliente.json` con información específica:

```powershell
Copy-Item templates\cliente.json.example .\cliente.json
notepad cliente.json
```

**Edita con datos reales:**

```json
{
  "nombre": "Restaurante El Buen Sabor",
  "industria": "Restaurante / Gastronomía",
  "colores_marca": {
    "primario": "#FF6B35",
    "secundario": "#004E89"
  },
  "cta_principal": "Reservar Mesa",
  "secciones_requeridas": ["hero", "menu", "galeria", "testimonios", "contacto"]
}
```

### Re-ejecutar con clientData

```powershell
.\scripts\dual-page\run-fetch.ps1 -url1 "https://foody-onepage.webflow.io/" -url2 "https://restaurante-gourmet.webflow.io/" -clientData ".\cliente.json"
```

Ahora `combined_summary.json` incluirá `clientData`.

---

## Paso 5: Preparar Ruta para Claude Code

```powershell
# Obtener ruta completa
(Get-Item fetch-results\20251030_154530).FullName

# Output:
# C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_154530
```

---

## Paso 6: Usar Prompt Maestro de Fusión

1. Abre Claude Code

2. Copia el [Prompt Maestro para Fusión de 2 Referencias](../docs/03-prompt-reference.md#3-prompt-para-fusión-de-2-referencias)

3. Reemplaza el marcador:

```
RUTA DE ARCHIVOS: C:\Users\TuUsuario\fetch-playwright\fetch-results\20251030_154530
```

4. Pega el prompt completo en Claude Code

---

## Paso 7: FASE 0 - Análisis Inicial

Claude Code analiza ambas referencias y responde:

### Resumen del Análisis

```
He analizado ambas referencias y aquí está mi evaluación:

REFERENCIA 1 (Foody):
- Diseño moderno y limpio con enfoque en delivery
- Hero con CTA prominente y colores vibrantes (#FF6B35, #FDB913)
- Menu en grid con iconos vectoriales
- Sección de "How it Works" con pasos numerados
- Footer simple con redes sociales

REFERENCIA 2 (Restaurante Gourmet):
- Diseño elegante y sofisticado
- Hero cinematográfico con imagen de alta calidad
- Sección "Our Story" con storytelling extenso
- Galería tipo masonry con lightbox
- Tipografía serif (Playfair Display)
- Footer con mapa integrado

DECISIÓN DE FUSIÓN:
- Tomaré el Hero moderno de Ref 1 pero con imagen elegante de Ref 2
- Menu grid de Ref 1 (más limpio)
- Sección "About" de Ref 2 (mejor storytelling)
- Galería de Ref 2 (fotos profesionales)
- Footer de Ref 2 (más completo con mapa)
- Colores: Primario de Ref 1 (#FF6B35), secundario de Ref 2 (#004E89)

RATIONALE: Combinando la modernidad y usabilidad de Ref 1 con la elegancia y profundidad de Ref 2, lograremos un sitio que sea profesional, accesible y visualmente impactante.
```

### Plan de Fases

```markdown
FASE 1: Header + Hero
- Header sticky tipo Ref 1 (simple)
- Hero full-height con imagen de Ref 2 + CTA de Ref 1

FASE 2: Secciones Intermedias
- Sección "About" de Ref 2 (layout imagen + texto)
- Menu grid de Ref 1 (4 columnas en desktop)
- Galería tipo Ref 2 (masonry con lightbox)

FASE 3: Contacto + Footer
- Formulario simple de Ref 1
- Footer de Ref 2 con mapa, horario, redes sociales

FASE 4: Consolidación
- Animaciones GSAP (scroll reveals)
- Smooth scrolling con Lenis
- Optimizaciones de performance
```

**Pregunta de Claude Code:** "¿Confirmas este plan para iniciar FASE 1?"

**Tu respuesta:** `SÍ`

---

## Paso 8: FASE 1 - Header + Hero

### Código Generado

**`src/components/Header.jsx`**

```jsx
export default function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md shadow-sm">
      <nav className="container mx-auto px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo - tomado de cliente.json */}
          <div className="text-2xl font-bold text-gray-900">
            El Buen Sabor
          </div>

          {/* Nav - estructura de Ref 1, simplificado */}
          <ul className="hidden md:flex gap-8 text-sm font-medium">
            <li><a href="#menu" className="hover:text-orange-600 transition">Menú</a></li>
            <li><a href="#about" className="hover:text-orange-600 transition">Nosotros</a></li>
            <li><a href="#gallery" className="hover:text-orange-600 transition">Galería</a></li>
            <li><a href="#contact" className="hover:text-orange-600 transition">Contacto</a></li>
          </ul>

          {/* CTA - estilo de Ref 1 */}
          <a
            href="#reservar"
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-full font-medium transition"
          >
            Reservar Mesa
          </a>
        </div>
      </nav>
    </header>
  );
}
```

**`src/components/Hero.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Hero() {
  const titleRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    // Animación de entrada (inspired by Ref 1)
    const tl = gsap.timeline();
    tl.from(titleRef.current, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    }).from(ctaRef.current, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out'
    }, '-=0.5');
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center">
      {/* Background image - estilo Ref 2 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-restaurant-interior)',
          filter: 'brightness(0.7)'
        }}
      />

      {/* Content - estructura de Ref 1, tipografía de Ref 2 */}
      <div className="relative z-10 text-center text-white px-6">
        <h1
          ref={titleRef}
          className="text-5xl lg:text-7xl font-serif font-bold mb-6"
        >
          Experience Culinary<br />Excellence
        </h1>
        <p className="text-xl lg:text-2xl mb-8 max-w-2xl mx-auto">
          Authentic Mexican fusion cuisine in the heart of the city
        </p>
        <button
          ref={ctaRef}
          className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-full text-lg font-semibold transition-all transform hover:scale-105"
        >
          Reservar Mesa
        </button>
      </div>
    </section>
  );
}
```

### Decisiones de Diseño Documentadas

```markdown
## FASE 1 - Decisiones

### Header
- **Tomado de:** Ref 1 (estructura simple)
- **Modificado:** Agregado backdrop-blur de Ref 2 para elegancia
- **Justificación:** Balance entre simplicidad y sofisticación

### Hero
- **Layout:** Full-height de ambas refs
- **Background:** Imagen cinematográfica (Ref 2)
- **CTA:** Estilo moderno y prominente (Ref 1)
- **Tipografía:** Serif para headline (Ref 2), sans-serif para body (Ref 1)
- **Animación:** GSAP fade-in con slide-up
```

**Pregunta de Claude Code:** "¿APROBAR FASE 1 / EDITAR?"

**Tu respuesta:** `APROBAR`

---

## Paso 9: FASE 2 - Secciones Intermedias

*(Claude Code genera About, Menu, Gallery con la misma lógica de fusión)*

**Highlights:**
- Sección About usa el layout de 2 columnas de Ref 2
- Menu grid toma la estructura de Ref 1 pero con tipografía de Ref 2
- Galería implementa masonry de Ref 2 con lightbox

---

## Paso 10: FASE 3 & 4 - Finalización

Claude Code completa el proyecto con:
- Formulario de contacto (Ref 1)
- Footer completo (Ref 2)
- Animaciones on-scroll
- Optimizaciones de performance

---

## Paso 11: Entrega Final

### `site_spec.json`

```json
{
  "proyecto": "El Buen Sabor - Fusión de 2 Referencias",
  "referencias": {
    "ref1": {
      "url": "https://foody-onepage.webflow.io/",
      "elementos_tomados": ["header_estructura", "menu_grid", "cta_style", "formulario"]
    },
    "ref2": {
      "url": "https://restaurante-gourmet.webflow.io/",
      "elementos_tomados": ["hero_background", "about_layout", "galeria", "footer", "tipografia"]
    }
  },
  "stack": ["Astro 3.6.5", "React 18", "Tailwind v3", "GSAP", "Lenis"],
  "componentes": 10,
  "confianza": 0.82,
  "notas": "Fusión exitosa manteniendo coherencia visual. Se priorizó modernidad de Ref 1 con elegancia de Ref 2."
}
```

---

## Paso 12: Ejecutar Proyecto

```powershell
# Setup
mkdir el-buen-sabor && cd el-buen-sabor
# (Copiar archivos generados por Claude Code)

pnpm install
pnpm dev
```

**Abre:** `http://localhost:4321`

---

## Resultados

✅ Hero impactante con imagen elegante + CTA moderno
✅ About section con storytelling de Ref 2
✅ Menu limpio y organizado de Ref 1
✅ Galería profesional tipo masonry de Ref 2
✅ Formulario simple de Ref 1
✅ Footer completo de Ref 2
✅ Animaciones fluidas con GSAP
✅ Responsive en todos los breakpoints

---

## Comparación Visual

| Elemento | Ref 1 | Ref 2 | Fusión Final |
|----------|-------|-------|--------------|
| **Hero** | CTA prominente, colores vibrantes | Imagen cinematográfica, elegante | Imagen de fondo + CTA moderno |
| **Menu** | Grid limpio, iconos | Lista elegante, sin iconos | Grid con fotos de platillos |
| **About** | Breve, centrado | Extenso, 2 columnas | Layout 2 columnas, texto conciso |
| **Gallery** | Simple grid | Masonry con lightbox | Masonry con lightbox |
| **Footer** | Minimalista | Completo con mapa | Completo con mapa simplificado |

---

## Tips para Fusionar Referencias

1. **Identifica fortalezas claras** de cada referencia antes de empezar
2. **Mantén coherencia visual** (no mezcles estilos opuestos sin justificación)
3. **Prioriza UX sobre estética** cuando haya conflicto
4. **Documenta decisiones** para futuros cambios
5. **Prueba en múltiples dispositivos** (la fusión puede romper responsive)

---

## Troubleshooting

### Estilos mezclados se ven inconsistentes

**Causa:** Combinar tipografías o colores muy diferentes.

**Solución:** Define una paleta unificada en `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#FF6B35',   // De Ref 1
        secondary: '#004E89', // De Ref 2
        accent: '#F7F7F7'     // Neutral
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],    // De Ref 2
        sans: ['Inter', 'sans-serif']            // De Ref 1
      }
    }
  }
}
```

---

## Próximos Pasos

- Reemplazar placeholders con contenido real del cliente
- Conectar formulario a backend (EmailJS, Netlify Forms, etc.)
- Añadir CMS (Sanity, Contentful) si el cliente necesita editar contenido
- Deploy a producción

---

[Volver a Documentación](../docs/02-dual-page-fetch.md)
