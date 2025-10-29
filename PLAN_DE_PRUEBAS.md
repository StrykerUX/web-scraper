# Plan de Pruebas - Web Scraper con Playwright

## 📋 Descripción General

Este documento establece el plan de pruebas para el script de recolección de datos web (`scraper.js`), que implementa la **Fase 1 del pipeline** descrito en el documento de referencia.

**Objetivo:** Validar que el scraper recolecta correctamente:
- HTML final renderizado (desktop y mobile)
- Screenshots en múltiples viewports
- Lista de clases CSS
- Metadata de la página (imágenes, links, formularios, headings)
- Detección automática de tecnologías

**Versión del Plan:** 1.0
**Fecha de Creación:** 2025-10-21
**Herramientas:** Playwright v1.56.1

---

## 🎯 Objetivos de Prueba

1. ✅ Verificar que el scraper se conecte exitosamente a URLs válidas
2. ✅ Validar que el HTML final se capture correctamente (con contenido dinámico)
3. ✅ Confirmar que los screenshots se generen en ambos viewports (desktop 1920x1080 y mobile 375x667)
4. ✅ Verificar que se extraigan todas las clases CSS utilizadas
5. ✅ Validar la detección automática de frameworks y librerías
6. ✅ Confirmar que los archivos de salida se generen en la estructura correcta
7. ✅ Validar manejo de errores para URLs inválidas o sitios bloqueados
8. ✅ Verificar el cálculo del score de confianza

---

## 🧪 Casos de Prueba

### **TC-001: Scraping Básico de Sitio Estático**

**Descripción:** Validar que el scraper funcione con un sitio web estático simple.

**Precondiciones:**
- Playwright está instalado y los navegadores están disponibles
- Conexión a internet activa
- URL válida de un sitio estático (ej: ejemplo.com)

**Pasos:**
1. Ejecutar: `npm run scrape https://example.com`
2. Esperar a que se complete el proceso
3. Verificar que se creer la carpeta `output/[timestamp]/`
4. Confirmar que se generan los siguientes archivos:
   - `data.json`
   - `summary.json`
   - `classes.json`
   - `page-desktop.html`
   - `page-mobile.html`
   - `screenshot-desktop.png`
   - `screenshot-mobile.png`

**Criterios de Aceptación:**
- [ ] Todos los archivos se generan sin errores
- [ ] Los HTMLs contienen más de 100 caracteres
- [ ] Las imágenes PNG tienen tamaño > 0
- [ ] `data.json` es válido y contiene estructura esperada
- [ ] La duración total < 60 segundos

**Resultado Esperado:**
```
✓ Directorio creado: output/[timestamp]
✓ Screenshot desktop guardado
✓ Screenshot mobile guardado
✓ Datos guardados en: data.json
✓ Resumen guardado: summary.json
✅ Scraping completado exitosamente
```

---

### **TC-002: Extracción de Clases CSS**

**Descripción:** Validar que todas las clases CSS se extraigan correctamente.

**Precondiciones:**
- Completado TC-001
- Acceso al archivo `classes.json` generado

**Pasos:**
1. Abrir `output/[timestamp]/classes.json`
2. Verificar el campo `total`
3. Inspeccionar el array `classes`
4. Validar contra el HTML guardado manualmente:
   ```bash
   grep -o 'class="[^"]*"' page-desktop.html | wc -l
   ```

**Criterios de Aceptación:**
- [ ] `total` > 0 (mínimo 1 clase detectada)
- [ ] Todas las clases son strings válidos
- [ ] No hay clases vacías o duplicadas
- [ ] Clases coinciden con las del HTML

**Validación de Contenido:**
```json
{
  "total": 45,
  "classes": [
    "container",
    "d-flex",
    "justify-content-center",
    ...
  ]
}
```

---

### **TC-003: Detección de Tecnologías**

**Descripción:** Validar que se detecten correctamente frameworks y librerías.

**Precondiciones:**
- Sitio objetivo usa tecnologías conocidas (React, Next.js, Tailwind, Bootstrap)
- Completado TC-001

**Pasos:**
1. Ejecutar scraper en un sitio con Next.js y Tailwind (ej: vercel.com, nextjs.org)
2. Abrir `output/[timestamp]/summary.json`
3. Verificar el campo `technologies`

**Criterios de Aceptación:**
- [ ] Campo `technologies` existe en metadata
- [ ] Contiene al menos 1 framework o librería detectado
- [ ] Los valores son strings válidos en minúsculas
- [ ] Coinciden con lo que se ve en el código fuente

**Validación de Contenido:**
```json
{
  "technologies": {
    "frameworks": ["next.js", "react"],
    "cssFrameworks": ["tailwind"],
    "libraries": []
  }
}
```

---

### **TC-004: Extracción de Elementos HTML**

**Descripción:** Validar que se extraigan correctamente imágenes, links, formularios y headings.

**Precondiciones:**
- Completado TC-001
- Sitio objetivo contiene estos elementos

**Pasos:**
1. Abrir `output/[timestamp]/data.json`
2. Verificar secciones: `images`, `links`, `forms`, `headings`
3. Contar elementos en el HTML manualmente:
   ```bash
   grep -c "<img" page-desktop.html
   grep -c "<a href" page-desktop.html
   grep -c "<form" page-desktop.html
   grep -c "<h[1-6]" page-desktop.html
   ```

**Criterios de Aceptación:**
- [ ] `images` contiene objetos con campos: `src`, `alt`, `width`, `height`
- [ ] `links` (máximo 50) contiene: `href`, `text`
- [ ] `forms` contiene: `id`, `name`, `action`, `method`, `inputs`
- [ ] `headings` contiene: `level`, `text`
- [ ] Cantidades son realistas (no vacías para sitios normales)

---

### **TC-005: Screenshots en Diferentes Viewports**

**Descripción:** Validar que se generen screenshots correctamente en ambos viewports.

**Precondiciones:**
- Completado TC-001
- Archivos de screenshot generados

**Pasos:**
1. Abrir `output/[timestamp]/screenshot-desktop.png`
2. Abrir `output/[timestamp]/screenshot-mobile.png`
3. Verificar visualmente:
   - Desktop: ancho correcto (~1920px)
   - Mobile: ancho correcto (~375px)
4. Usar herramienta para verificar dimensiones:
   ```bash
   file screenshot-desktop.png
   file screenshot-mobile.png
   ```

**Criterios de Aceptación:**
- [ ] Ambas imágenes se cargan sin corrupción
- [ ] Desktop es más ancho que mobile (visible)
- [ ] Contenido es legible en ambas
- [ ] Tamaño de archivo desktop > mobile

**Validación Visual:**
- Screenshots deben mostrar el contenido real del sitio, no errores

---

### **TC-006: HTML Final vs HTML Original**

**Descripción:** Validar que el HTML capturado es el versión final (con contenido dinámico).

**Precondiciones:**
- Completado TC-001
- Acceso al sitio original en navegador

**Pasos:**
1. Abrir el sitio original en navegador
2. Guardar HTML con `Ctrl+S` o DevTools → `Save as HTML`
3. Comparar con `page-desktop.html` generado
4. Buscar contenido dinámico específico:
   ```bash
   # Buscar elementos que solo aparecen después de JavaScript
   grep "dinamico" page-desktop.html
   ```

**Criterios de Aceptación:**
- [ ] HTML capturado contiene contenido renderizado (no templates vacíos)
- [ ] Incluye datos que requieren JavaScript
- [ ] No contiene `<script>` sin ejecutar

---

### **TC-007: Cálculo de Confidence Score**

**Descripción:** Validar que el score de confianza se calcule correctamente.

**Precondiciones:**
- Completado TC-001
- Acceso a `summary.json`

**Pasos:**
1. Abrir `summary.json`
2. Revisar el campo `confidence`
3. Revisar `statistics`
4. Validar cálculo:
   ```
   Score base: 100
   - Si classes < 10: -20 puntos
   - Si images = 0: -10 puntos
   - Si forms = 0: -5 puntos
   + Si headings > 5: +10 puntos
   + Si links > 10: +10 puntos
   Rango final: 0-100
   ```

**Criterios de Aceptación:**
- [ ] Confidence es número entre 0-100
- [ ] Coincide con la fórmula de cálculo
- [ ] Sitios con mucho contenido: confidence > 80
- [ ] Sitios con poco contenido: confidence 50-80

---

### **TC-008: Manejo de Errores - URL Inválida**

**Descripción:** Validar que el scraper maneja correctamente URLs inválidas.

**Precondiciones:**
- Playwright instalado

**Pasos:**
1. Ejecutar: `npm run scrape "esto-no-es-una-url"`
2. Observar el mensaje de error

**Criterios de Aceptación:**
- [ ] Script muestra error claro: "URL inválida"
- [ ] No crea carpeta de output
- [ ] Exit code es 1
- [ ] Mensaje es informativo

**Resultado Esperado:**
```
❌ URL inválida: esto-no-es-una-url
```

---

### **TC-009: Manejo de Errores - URL No Accesible**

**Descripción:** Validar que el scraper maneja URLs que no responden.

**Precondiciones:**
- URL que definitivamente no existe (ej: https://definitivamente-no-existe-12345.com)

**Pasos:**
1. Ejecutar: `npm run scrape https://definitivamente-no-existe-12345.com`
2. Esperar respuesta

**Criterios de Aceptación:**
- [ ] Script muestra error descriptivo
- [ ] Menciona timeout o conexión fallida
- [ ] No crea archivos corruptos
- [ ] Exit code es 1

**Resultado Esperado:**
```
❌ Error durante el scraping: [timeout/connection error message]
```

---

### **TC-010: Sin Argumentos**

**Descripción:** Validar comportamiento cuando no se proporciona URL.

**Precondiciones:**
- Script disponible

**Pasos:**
1. Ejecutar: `npm run scrape`
2. Sin argumentos

**Criterios de Aceptación:**
- [ ] Muestra instrucciones de uso
- [ ] Ejemplo incluido
- [ ] Exit code es 1

**Resultado Esperado:**
```
❌ Uso: node scraper.js <URL>
Ejemplo: node scraper.js https://example.com
```

---

### **TC-011: Múltiples Ejecuciones Simultáneas**

**Descripción:** Validar que múltiples instancias no causen conflictos.

**Precondiciones:**
- 2+ URLs disponibles
- Suficientes recursos

**Pasos:**
1. Ejecutar en terminal 1: `npm run scrape https://example.com &`
2. Ejecutar en terminal 2: `npm run scrape https://google.com &`
3. Esperar a que ambas terminen
4. Verificar archivos en `output/`

**Criterios de Aceptación:**
- [ ] Ambas ejecuciones completadas sin error
- [ ] Carpetas separadas en `output/` (timestamps diferentes)
- [ ] No hay corrupción de archivos

---

### **TC-012: Estructura de Carpetas y Archivos**

**Descripción:** Validar que la estructura de salida sea consistente.

**Precondiciones:**
- Completado TC-001

**Pasos:**
1. Ejecutar: `tree output/` o `ls -la output/[timestamp]/`
2. Verificar estructura

**Criterios de Aceptación:**
- [ ] Carpeta timestamp tiene formato correcto: `YYYY-MM-DDTHH-MM-SS-mmm`
- [ ] Contiene exactamente 7 archivos
- [ ] Todos los archivos nombrados correctamente
- [ ] No hay archivos extras

**Estructura Esperada:**
```
output/
└── 2025-10-21T14-30-45-123/
    ├── data.json
    ├── summary.json
    ├── classes.json
    ├── page-desktop.html
    ├── page-mobile.html
    ├── screenshot-desktop.png
    └── screenshot-mobile.png
```

---

## 📊 Checklist de Ejecución

Antes de considerar el scraper como "listo para producción", completar:

### Pruebas Funcionales
- [ ] TC-001: Scraping básico
- [ ] TC-002: Extracción de clases CSS
- [ ] TC-003: Detección de tecnologías
- [ ] TC-004: Extracción de elementos HTML
- [ ] TC-005: Screenshots en viewports
- [ ] TC-006: HTML final vs original
- [ ] TC-007: Cálculo de confidence
- [ ] TC-008: URL inválida
- [ ] TC-009: URL no accesible
- [ ] TC-010: Sin argumentos
- [ ] TC-011: Múltiples ejecuciones
- [ ] TC-012: Estructura de archivos

### Pruebas de Rendimiento
- [ ] Scraping < 60 segundos (sitio típico)
- [ ] Uso de memoria < 500MB
- [ ] Navegadores se cierran correctamente

### Validación de Código
- [ ] No hay console.log() de debug (solo console.log con emojis informativos)
- [ ] Manejo de errores en todos los await
- [ ] Variables nombradas claramente
- [ ] Comentarios en funciones principales

### Documentación
- [ ] README.md con instrucciones
- [ ] Ejemplos de salida incluidos
- [ ] Comentarios en el código

---

## 🧪 Matriz de Pruebas por Tipo de Sitio

| Tipo de Sitio | TC Aplicables | Notas |
|---|---|---|
| Sitio Estático HTML | TC-001, TC-002, TC-005, TC-012 | Más simple, todo renderizado server-side |
| SPA (React/Vue) | TC-001, TC-003, TC-004, TC-006 | Requiere wait networkidle |
| E-commerce | TC-001, TC-004, TC-005 | Suele tener muchos formularios y imágenes |
| Blog/News | TC-001, TC-002, TC-004 | Muchos headings y links |
| API/Dashboard | TC-008, TC-009 | Posibles requerimientos de auth |

---

## 🚀 Criterios de Aceptación Global

El scraper está **LISTO** cuando:

✅ **Mínimo 11 de 12 TCs pasadas**
✅ **Todas las pruebas de error (TC-008, TC-009, TC-010) pasadas**
✅ **Estructura de salida consistente**
✅ **Rendimiento < 60 segundos**
✅ **Documentación completa**

---

## 📝 Notas de Implementación

### Observaciones Importantes
1. **Wappalyzer Deprecado:** El paquete está deprecado. Alternativas: implementar detección manual o usar librería alternativa en futuro
2. **Dependencias del Sistema:** En Linux necesita `libasound2t64` - ya mostrado en instalación
3. **Timeout:** Configurado a 30 segundos por defecto, ajustar si sitios son lentos
4. **User-Agent:** Configurado para evitar bloqueos anti-bot básicos

### Limitaciones Conocidas
- No maneja sitios que requieren autenticación (auth será feature futura)
- Clases CSS limitadas a DOM visible (no CSS-in-JS runtime)
- Max 50 links extraídos para evitar saturación
- No detecta versiones específicas de librerías (solo si están presentes)

---

## 🔄 Próximas Fases

Este plan cubre **Fase 1: Recolección Fiel de Datos**

Fases futuras:
- **Fase 2:** Generación del código (Prompt a Claude Code)
- **Fase 3:** Control de calidad automático (QA Tests, Linters)

---

## 📞 Contacto y Soporte

Si un test falla:
1. Revisar logs completos del script
2. Verificar conexión a internet
3. Confirmar que URL es válida y accesible
4. Revisar estructura esperada en este documento

---

**Versión:** 1.0
**Última Actualización:** 2025-10-21
**Estado:** ✅ Activo y Validado
