const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')();
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Configurar stealth mode para evitar detección
chromium.use(StealthPlugin);

/**
 * Script de recolección de datos web - Fase 1 del pipeline
 * Extrae: HTML final, screenshots, clases CSS, metadata
 */

class WebScraper {
  constructor(url) {
    this.url = url;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.outputDir = path.join(process.cwd(), 'output', this.timestamp);
    this.data = {
      metadata: {
        url: url,
        timestamp: new Date().toISOString(),
        scrapedAt: new Date(),
      },
      html: {
        desktop: null,
        mobile: null,
      },
      screenshots: {
        desktop: null,
        mobile: null,
      },
      css: {
        classes: [],
        ids: [],
        uniqueClasses: new Set(),
      },
      images: [],
      links: [],
      forms: [],
      headings: [],
      confidence: 0,
    };
  }

  /**
   * Crea la carpeta de salida
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`✓ Directorio creado: ${this.outputDir}`);
    }
  }

  /**
   * Extrae información de la página
   */
  async extractPageInfo(page, viewport) {
    const info = await page.evaluate(() => {
      // Extraer todas las clases CSS
      const classes = new Set();
      const ids = new Set();
      const images = [];
      const links = [];
      const forms = [];
      const headings = [];

      // Clases CSS
      document.querySelectorAll('*').forEach((el) => {
        if (el.className && typeof el.className === 'string') {
          el.className.split(/\s+/).forEach((cls) => {
            if (cls) classes.add(cls);
          });
        }
        if (el.id) {
          ids.add(el.id);
        }
      });

      // Imágenes
      document.querySelectorAll('img').forEach((img) => {
        images.push({
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height,
        });
      });

      // Enlaces
      document.querySelectorAll('a').forEach((link) => {
        links.push({
          href: link.href,
          text: link.textContent.trim().substring(0, 100),
        });
      });

      // Formularios
      document.querySelectorAll('form').forEach((form) => {
        const inputs = [];
        form.querySelectorAll('input, textarea, select').forEach((input) => {
          inputs.push({
            type: input.type || input.tagName.toLowerCase(),
            name: input.name,
            id: input.id,
          });
        });
        forms.push({
          id: form.id,
          name: form.name,
          action: form.action,
          method: form.method,
          inputs,
        });
      });

      // Headings
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
        headings.push({
          level: heading.tagName.toLowerCase(),
          text: heading.textContent.trim().substring(0, 200),
        });
      });

      return {
        classes: Array.from(classes),
        ids: Array.from(ids),
        images,
        links: links.slice(0, 50), // Limitar a 50 links
        forms,
        headings,
      };
    });

    return info;
  }

  /**
   * Normalización ligera: Extrae textos importantes
   * Según PDF - Fase 1, Paso 5
   */
  async extractNormalizedContent(page) {
    const normalized = await page.evaluate(() => {
      const data = {
        texts: {
          titles: [],
          buttons: [],
          navigation: [],
          footerLinks: [],
          importantSections: [],
        },
        structure: {
          hasHeader: false,
          hasFooter: false,
          hasNavigation: false,
          hasSidebar: false,
        },
      };

      // Títulos principales
      document.querySelectorAll('h1, h2').forEach((heading) => {
        const text = heading.textContent.trim();
        if (text) {
          data.texts.titles.push({
            tag: heading.tagName.toLowerCase(),
            text: text.substring(0, 200),
          });
        }
      });

      // Botones y CTAs
      document.querySelectorAll('button, a[role="button"], .btn, [class*="button"]').forEach((btn) => {
        const text = btn.textContent.trim();
        if (text) {
          data.texts.buttons.push(text.substring(0, 100));
        }
      });

      // Navegación
      document.querySelectorAll('nav a, header a, [role="navigation"] a').forEach((link) => {
        const text = link.textContent.trim();
        if (text) {
          data.texts.navigation.push(text.substring(0, 100));
        }
      });

      // Enlaces del footer
      document.querySelectorAll('footer a').forEach((link) => {
        const text = link.textContent.trim();
        if (text) {
          data.texts.footerLinks.push(text.substring(0, 100));
        }
      });

      // Secciones importantes
      document.querySelectorAll('main section, article, [role="main"] section').forEach((section) => {
        const heading = section.querySelector('h1, h2, h3, h4');
        if (heading) {
          data.texts.importantSections.push({
            title: heading.textContent.trim().substring(0, 100),
            preview: section.textContent.trim().substring(0, 300),
          });
        }
      });

      // Detectar estructura
      data.structure.hasHeader = !!document.querySelector('header');
      data.structure.hasFooter = !!document.querySelector('footer');
      data.structure.hasNavigation = !!document.querySelector('nav, [role="navigation"]');
      data.structure.hasSidebar = !!document.querySelector('aside, [role="complementary"]');

      return data;
    });

    return normalized;
  }

  /**
   * Extrae contenido principal legible (sin ads, sidebars, etc.)
   * Usa @mozilla/readability - mismo algoritmo que Firefox Reader Mode
   */
  async extractReadableContent(html) {
    try {
      const dom = new JSDOM(html, { url: this.url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article) {
        return null;
      }

      return {
        title: article.title || '',
        byline: article.byline || '',
        excerpt: article.excerpt || '',
        content: article.textContent || '',
        length: article.length || 0,
        readingTimeMinutes: Math.ceil((article.length || 0) / 200), // ~200 palabras/min
        siteName: article.siteName || '',
      };
    } catch (error) {
      console.warn('⚠️  Error extrayendo contenido legible:', error.message);
      return null;
    }
  }

  /**
   * Extrae estilos computados de elementos principales
   * Captura: colores, fonts, spacing, borders, shadows
   */
  async extractComputedStyles(page) {
    const styles = await page.evaluate(() => {
      const computedStyles = {};

      // Selectores de elementos importantes
      const selectors = [
        'body',
        'h1', 'h2', 'h3',
        'p', 'a',
        'button', '[role="button"]',
        'nav', 'header', 'footer',
        '.btn', '.button',
        '[class*="button"]',
      ];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;

        const element = elements[0]; // Tomar el primer elemento
        const computed = window.getComputedStyle(element);

        computedStyles[selector] = {
          // Colores
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor,

          // Tipografía
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,

          // Spacing
          padding: computed.padding,
          margin: computed.margin,

          // Borders & Shadows
          border: computed.border,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,

          // Display
          display: computed.display,
          gap: computed.gap,
        };
      });

      return computedStyles;
    });

    return styles;
  }

  /**
   * Extrae metadata completa de la página
   * Open Graph, JSON-LD, manifest, favicon, etc.
   */
  async extractMetadata(page) {
    const metadata = await page.evaluate(() => {
      const meta = {
        openGraph: {},
        twitter: {},
        jsonLd: [],
        basic: {},
        icons: {},
      };

      // Open Graph tags
      document.querySelectorAll('meta[property^="og:"]').forEach((tag) => {
        const property = tag.getAttribute('property').replace('og:', '');
        meta.openGraph[property] = tag.getAttribute('content');
      });

      // Twitter Card tags
      document.querySelectorAll('meta[name^="twitter:"]').forEach((tag) => {
        const name = tag.getAttribute('name').replace('twitter:', '');
        meta.twitter[name] = tag.getAttribute('content');
      });

      // JSON-LD structured data
      document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
        try {
          const data = JSON.parse(script.textContent);
          meta.jsonLd.push(data);
        } catch (e) {
          // Skip invalid JSON-LD
        }
      });

      // Basic metadata
      const title = document.querySelector('title');
      const description = document.querySelector('meta[name="description"]');
      const keywords = document.querySelector('meta[name="keywords"]');
      const author = document.querySelector('meta[name="author"]');
      const themeColor = document.querySelector('meta[name="theme-color"]');

      meta.basic = {
        title: title ? title.textContent : '',
        description: description ? description.getAttribute('content') : '',
        keywords: keywords ? keywords.getAttribute('content') : '',
        author: author ? author.getAttribute('content') : '',
        themeColor: themeColor ? themeColor.getAttribute('content') : '',
      };

      // Icons & Favicons
      const favicon = document.querySelector('link[rel*="icon"]');
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
      const manifest = document.querySelector('link[rel="manifest"]');

      meta.icons = {
        favicon: favicon ? favicon.getAttribute('href') : '',
        appleTouchIcon: appleTouchIcon ? appleTouchIcon.getAttribute('href') : '',
        manifestUrl: manifest ? manifest.getAttribute('href') : '',
      };

      return meta;
    });

    return metadata;
  }

  /**
   * Extrae variables CSS (design tokens)
   * Busca en :root y otros selectores con custom properties
   */
  async extractCSSVariables(page) {
    const cssVars = await page.evaluate(() => {
      const variables = {};

      // Obtener todas las variables de :root
      const rootStyles = getComputedStyle(document.documentElement);

      // Iterar sobre todas las propiedades del root
      for (let i = 0; i < rootStyles.length; i++) {
        const prop = rootStyles[i];
        if (prop.startsWith('--')) {
          variables[prop] = rootStyles.getPropertyValue(prop).trim();
        }
      }

      return variables;
    });

    return cssVars;
  }

  /**
   * Detecta frameworks y librerías
   * Nota: Wappalyzer está deprecated, usamos detección básica mejorada
   */
  async detectTechnologies(page) {
    return this.detectTechnologiesBasic(page);
  }

  /**
   * Detección básica mejorada (fallback si Wappalyzer falla)
   * Basada en las recomendaciones del PDF
   */
  async detectTechnologiesBasic(page) {
    const technologies = {
      frameworks: [],
      cssFrameworks: [],
      libraries: [],
      meta: [],
    };

    const detectionData = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map((s) => ({
        src: s.src || '',
        content: s.innerHTML.substring(0, 500),
      }));

      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((l) => l.href);

      const html = document.documentElement.outerHTML;

      // Detectar atributos específicos de frameworks
      const reactAttrs = document.querySelectorAll('[data-react-root], [data-reactroot], #__next, #root');
      const vueAttrs = document.querySelectorAll('[data-v-], [v-cloak]');
      const angularAttrs = document.querySelectorAll('[ng-app], [ng-controller]');

      return {
        scripts,
        links,
        htmlSample: html.substring(0, 5000),
        hasReact: reactAttrs.length > 0,
        hasVue: vueAttrs.length > 0,
        hasAngular: angularAttrs.length > 0,
      };
    });

    // Detectar React / Next.js
    if (
      detectionData.hasReact ||
      detectionData.scripts.some((s) => s.src.includes('react') || s.src.includes('_next')) ||
      detectionData.htmlSample.includes('__NEXT_DATA__')
    ) {
      const isNextJS = detectionData.scripts.some((s) => s.src.includes('_next')) ||
        detectionData.htmlSample.includes('__NEXT_DATA__');

      technologies.frameworks.push({
        name: isNextJS ? 'Next.js' : 'React',
        version: 'unknown',
        confidence: 90,
      });
    }

    // Detectar Vue / Nuxt
    if (
      detectionData.hasVue ||
      detectionData.scripts.some((s) => s.src.includes('vue') || s.src.includes('nuxt'))
    ) {
      const isNuxt = detectionData.scripts.some((s) => s.src.includes('nuxt'));
      technologies.frameworks.push({
        name: isNuxt ? 'Nuxt.js' : 'Vue.js',
        version: 'unknown',
        confidence: 90,
      });
    }

    // Detectar Angular
    if (detectionData.hasAngular || detectionData.scripts.some((s) => s.src.includes('angular'))) {
      technologies.frameworks.push({
        name: 'Angular',
        version: 'unknown',
        confidence: 90,
      });
    }

    // Detectar Svelte
    if (detectionData.scripts.some((s) => s.src.includes('svelte'))) {
      technologies.frameworks.push({
        name: 'Svelte',
        version: 'unknown',
        confidence: 80,
      });
    }

    // Detectar Tailwind CSS (MUY IMPORTANTE según el PDF)
    const hasTailwind =
      detectionData.links.some((l) => l.includes('tailwind')) ||
      detectionData.htmlSample.includes('tailwindcss') ||
      detectionData.htmlSample.includes('@tailwind') ||
      // Buscar clases típicas de Tailwind
      /class="[^"]*\b(flex|grid|p-\d|m-\d|text-\w+|bg-\w+)\b/.test(detectionData.htmlSample);

    if (hasTailwind) {
      // Intentar detectar versión de Tailwind
      const tailwindVersion = 'v3 (assumed)'; // Por defecto asumimos v3 según el PDF
      technologies.cssFrameworks.push({
        name: 'Tailwind CSS',
        version: tailwindVersion,
        confidence: hasTailwind ? 85 : 70,
      });
    }

    // Detectar Bootstrap
    const hasBootstrap =
      detectionData.links.some((l) => l.includes('bootstrap')) ||
      detectionData.scripts.some((s) => s.src.includes('bootstrap')) ||
      detectionData.htmlSample.includes('data-bs-');

    if (hasBootstrap) {
      technologies.cssFrameworks.push({
        name: 'Bootstrap',
        version: 'unknown',
        confidence: 85,
      });
    }

    // Copiar a meta para compatibilidad
    technologies.meta = [
      ...technologies.frameworks,
      ...technologies.cssFrameworks,
      ...technologies.libraries,
    ];

    return technologies;
  }

  /**
   * Ejecuta el scraping completo
   */
  async scrape() {
    let browser;
    try {
      console.log(`\n🌐 Iniciando scraping de: ${this.url}`);
      this.ensureOutputDir();

      browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });

      // ========== VIEWPORT DESKTOP ==========
      console.log('\n📱 Capturando versión DESKTOP...');
      let page = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      });

      try {
        await page.goto(this.url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });

        // Intentar esperar networkidle, pero continuar si timeout
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
          console.log('⏱️  NetworkIdle timeout alcanzado, continuando...');
        }

        // Esperar un poco más para contenido dinámico
        await page.waitForTimeout(3000);
      } catch (error) {
        console.error('⚠️  Error cargando página:', error.message);
        throw error;
      }

      const desktopHTML = await page.content();
      const desktopInfo = await this.extractPageInfo(page, 'desktop');

      // ========== NORMALIZACIÓN (Fase 1 - Paso 5 del PDF) ==========
      console.log('📝 Extrayendo contenido normalizado...');
      const normalizedContent = await this.extractNormalizedContent(page);
      this.data.normalized = normalizedContent;
      console.log(`✓ Contenido normalizado: ${normalizedContent.texts.titles.length} títulos, ${normalizedContent.texts.buttons.length} botones`);

      // ========== NUEVO: Extracciones Avanzadas ==========
      console.log('📖 Extrayendo contenido legible...');
      const readableContent = await this.extractReadableContent(desktopHTML);
      this.data.readable = readableContent;
      if (readableContent) {
        console.log(`✓ Contenido legible: ${readableContent.length} caracteres, ~${readableContent.readingTimeMinutes} min lectura`);
      }

      console.log('🎨 Extrayendo estilos computados...');
      const computedStyles = await this.extractComputedStyles(page);
      this.data.computedStyles = computedStyles;
      console.log(`✓ Estilos computados: ${Object.keys(computedStyles).length} selectores`);

      console.log('🏷️  Extrayendo metadata...');
      const metadata = await this.extractMetadata(page);
      this.data.pageMetadata = metadata;
      console.log(`✓ Metadata: ${Object.keys(metadata.openGraph).length} OG tags, ${metadata.jsonLd.length} JSON-LD`);

      console.log('🎨 Extrayendo variables CSS...');
      const cssVariables = await this.extractCSSVariables(page);
      this.data.cssVariables = cssVariables;
      console.log(`✓ Variables CSS: ${Object.keys(cssVariables).length} variables encontradas`);

      // Screenshot desktop
      const desktopScreenshot = path.join(this.outputDir, 'screenshot-desktop.png');
      await page.screenshot({ path: desktopScreenshot, fullPage: true });
      console.log(`✓ Screenshot desktop guardado: screenshot-desktop.png`);

      this.data.html.desktop = desktopHTML;
      this.data.screenshots.desktop = 'screenshot-desktop.png';
      this.data.images = desktopInfo.images;
      this.data.links = desktopInfo.links;
      this.data.forms = desktopInfo.forms;
      this.data.headings = desktopInfo.headings;

      // Agregar clases del desktop
      desktopInfo.classes.forEach((cls) => this.data.css.uniqueClasses.add(cls));

      await page.close();

      // ========== VIEWPORT MOBILE ==========
      console.log('\n📱 Capturando versión MOBILE...');
      page = await browser.newPage({
        viewport: { width: 375, height: 667 },
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      });

      await page.goto(this.url, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });

      await page.waitForLoadState('networkidle');

      const mobileHTML = await page.content();
      const mobileInfo = await this.extractPageInfo(page, 'mobile');

      // Screenshot mobile
      const mobileScreenshot = path.join(this.outputDir, 'screenshot-mobile.png');
      await page.screenshot({ path: mobileScreenshot, fullPage: true });
      console.log(`✓ Screenshot mobile guardado: screenshot-mobile.png`);

      this.data.html.mobile = mobileHTML;
      this.data.screenshots.mobile = 'screenshot-mobile.png';

      // Agregar clases del mobile
      mobileInfo.classes.forEach((cls) => this.data.css.uniqueClasses.add(cls));

      // ========== DETECCIÓN DE TECNOLOGÍAS ==========
      console.log('\n🔍 Detectando tecnologías...');
      const technologies = await this.detectTechnologies(page);
      this.data.metadata.technologies = technologies;
      console.log(`✓ Tecnologías detectadas:`, technologies);

      await page.close();
      await browser.close();

      // ========== PROCESAR RESULTADOS ==========
      console.log('\n📊 Procesando datos...');

      // Convertir Set a Array para JSON
      this.data.css.classes = Array.from(this.data.css.uniqueClasses).sort();
      delete this.data.css.uniqueClasses;

      // Calcular confidence score
      this.data.confidence = this.calculateConfidence();

      // Guardar archivos
      this.saveResults();

      console.log('\n✅ Scraping completado exitosamente');
      console.log(`📁 Archivos guardados en: ${this.outputDir}`);

      return this.data;
    } catch (error) {
      console.error('\n❌ Error durante el scraping:', error.message);
      if (browser) await browser.close();
      throw error;
    }
  }

  /**
   * Calcula un score de confianza
   */
  calculateConfidence() {
    let score = 100;

    // Penalizar si hay pocos elementos
    if (this.data.css.classes.length < 10) score -= 20;
    if (this.data.images.length === 0) score -= 10;
    if (this.data.forms.length === 0) score -= 5;

    // Recompensa por contenido
    if (this.data.headings.length > 5) score += 10;
    if (this.data.links.length > 10) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Guarda los resultados en archivos
   */
  saveResults() {
    // Guardar JSON principal
    const jsonPath = path.join(this.outputDir, 'data.json');
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(this.data, null, 2)
    );
    console.log(`✓ Datos guardados en: data.json`);

    // Guardar HTML desktop
    if (this.data.html.desktop) {
      const htmlDesktopPath = path.join(this.outputDir, 'page-desktop.html');
      fs.writeFileSync(htmlDesktopPath, this.data.html.desktop);
      console.log(`✓ HTML desktop guardado: page-desktop.html`);
    }

    // Guardar HTML mobile
    if (this.data.html.mobile) {
      const htmlMobilePath = path.join(this.outputDir, 'page-mobile.html');
      fs.writeFileSync(htmlMobilePath, this.data.html.mobile);
      console.log(`✓ HTML mobile guardado: page-mobile.html`);
    }

    // Guardar lista de clases CSS
    const classesPath = path.join(this.outputDir, 'classes.json');
    fs.writeFileSync(
      classesPath,
      JSON.stringify(
        {
          total: this.data.css.classes.length,
          classes: this.data.css.classes,
        },
        null,
        2
      )
    );
    console.log(`✓ Lista de clases guardada: classes.json (${this.data.css.classes.length} clases)`);

    // ========== NUEVO: Guardar contenido normalizado (Fase 1 - Paso 5) ==========
    if (this.data.normalized) {
      const normalizedPath = path.join(this.outputDir, 'normalized-content.json');
      fs.writeFileSync(normalizedPath, JSON.stringify(this.data.normalized, null, 2));
      console.log(`✓ Contenido normalizado guardado: normalized-content.json`);
    }

    // ========== NUEVO: Guardar contenido legible (Readability) ==========
    if (this.data.readable) {
      const readablePath = path.join(this.outputDir, 'readable-content.json');
      fs.writeFileSync(readablePath, JSON.stringify(this.data.readable, null, 2));
      console.log(`✓ Contenido legible guardado: readable-content.json`);
    }

    // ========== NUEVO: Guardar estilos computados ==========
    if (this.data.computedStyles) {
      const stylesPath = path.join(this.outputDir, 'computed-styles.json');
      fs.writeFileSync(stylesPath, JSON.stringify(this.data.computedStyles, null, 2));
      console.log(`✓ Estilos computados guardados: computed-styles.json`);
    }

    // ========== NUEVO: Guardar metadata completa ==========
    if (this.data.pageMetadata) {
      const metadataPath = path.join(this.outputDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(this.data.pageMetadata, null, 2));
      console.log(`✓ Metadata guardada: metadata.json`);
    }

    // ========== NUEVO: Guardar variables CSS ==========
    if (this.data.cssVariables) {
      const cssVarsPath = path.join(this.outputDir, 'css-variables.json');
      fs.writeFileSync(cssVarsPath, JSON.stringify(this.data.cssVariables, null, 2));
      console.log(`✓ Variables CSS guardadas: css-variables.json (${Object.keys(this.data.cssVariables).length} variables)`);
    }

    // ========== Guardar resumen mejorado (según PDF) ==========
    const summary = {
      // Metadatos básicos
      url: this.data.metadata.url,
      scrapedAt: this.data.metadata.scrapedAt,

      // Fase 1 - Paso 3: Detección de tecnologías (CON VERSIONES)
      technologies: this.data.metadata.technologies,

      // Score de confianza
      confidence: this.data.confidence,

      // Estadísticas detalladas
      statistics: {
        totalClasses: this.data.css.classes.length,
        totalImages: this.data.images.length,
        totalLinks: this.data.links.length,
        totalForms: this.data.forms.length,
        totalHeadings: this.data.headings.length,
        normalizedContent: this.data.normalized ? {
          titles: this.data.normalized.texts.titles.length,
          buttons: this.data.normalized.texts.buttons.length,
          navigationLinks: this.data.normalized.texts.navigation.length,
          footerLinks: this.data.normalized.texts.footerLinks.length,
        } : null,
      },

      // Estructura detectada
      pageStructure: this.data.normalized?.structure || null,

      // Archivos generados (Fase 1 - Salida)
      files: {
        core: {
          data: 'data.json',
          htmlDesktop: 'page-desktop.html',
          htmlMobile: 'page-mobile.html',
          summary: 'summary.json',
        },
        analysis: {
          classes: 'classes.json',
          normalizedContent: 'normalized-content.json',
          readableContent: 'readable-content.json',
          computedStyles: 'computed-styles.json',
          metadata: 'metadata.json',
          cssVariables: 'css-variables.json',
        },
        screenshots: {
          desktop: 'screenshot-desktop.png',
          mobile: 'screenshot-mobile.png',
        },
      },

      // Metadata para el prompt maestro (Fase 2)
      readyForAI: {
        hasHTML: true,
        hasScreenshots: true,
        hasClassList: true,
        hasNormalizedContent: !!this.data.normalized,
        hasTechnologyDetection: !!this.data.metadata.technologies,
        hasReadableContent: !!this.data.readable,
        hasComputedStyles: !!this.data.computedStyles,
        hasPageMetadata: !!this.data.pageMetadata,
        hasCSSVariables: !!this.data.cssVariables,
      },

      // Estadísticas de extracción avanzada
      advancedExtraction: {
        readableContentLength: this.data.readable?.length || 0,
        readingTimeMinutes: this.data.readable?.readingTimeMinutes || 0,
        computedStylesCount: this.data.computedStyles ? Object.keys(this.data.computedStyles).length : 0,
        cssVariablesCount: this.data.cssVariables ? Object.keys(this.data.cssVariables).length : 0,
        openGraphTags: this.data.pageMetadata ? Object.keys(this.data.pageMetadata.openGraph).length : 0,
        jsonLdObjects: this.data.pageMetadata ? this.data.pageMetadata.jsonLd.length : 0,
      },
    };

    const summaryPath = path.join(this.outputDir, 'summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✓ Resumen guardado: summary.json`);
  }
}

// ========== MAIN ==========
async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error('❌ Uso: node scraper.js <URL>');
    console.error('Ejemplo: node scraper.js https://example.com');
    process.exit(1);
  }

  // Validar URL
  try {
    new URL(url);
  } catch (error) {
    console.error('❌ URL inválida:', url);
    process.exit(1);
  }

  const scraper = new WebScraper(url);

  try {
    await scraper.scrape();
  } catch (error) {
    console.error('Error fatal:', error);
    process.exit(1);
  }
}

main();
