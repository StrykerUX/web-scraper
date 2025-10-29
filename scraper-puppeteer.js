const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

/**
 * Script de recolección de datos web - Fase 1 del pipeline
 * Versión alternativa con Puppeteer (funciona mejor en WSL2)
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
   * Extrae información de la página usando Cheerio
   */
  extractPageInfo(html) {
    const $ = cheerio.load(html);

    const classes = new Set();
    const ids = new Set();
    const images = [];
    const links = [];
    const forms = [];
    const headings = [];

    // Extraer clases CSS
    $('*').each((_, el) => {
      const classAttr = $(el).attr('class');
      if (classAttr) {
        classAttr.split(/\s+/).forEach(cls => {
          if (cls && cls.trim()) classes.add(cls.trim());
        });
      }
      const idAttr = $(el).attr('id');
      if (idAttr) ids.add(idAttr);
    });

    // Imágenes
    $('img').each((_, el) => {
      images.push({
        src: $(el).attr('src'),
        alt: $(el).attr('alt') || '',
        width: $(el).attr('width') || '',
        height: $(el).attr('height') || '',
      });
    });

    // Enlaces
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 100);
      if (href) {
        links.push({ href, text });
      }
    });

    // Formularios
    $('form').each((_, form) => {
      const $form = $(form);
      const inputs = [];

      $form.find('input, textarea, select').each((_, input) => {
        const $input = $(input);
        inputs.push({
          type: $input.attr('type') || $input.prop('tagName').toLowerCase(),
          name: $input.attr('name') || '',
          id: $input.attr('id') || '',
        });
      });

      forms.push({
        id: $form.attr('id') || '',
        name: $form.attr('name') || '',
        action: $form.attr('action') || '',
        method: $form.attr('method') || 'get',
        inputs,
      });
    });

    // Headings
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $el = $(el);
      headings.push({
        level: el.name.toLowerCase(),
        text: $el.text().trim().substring(0, 200),
      });
    });

    return {
      classes: Array.from(classes),
      ids: Array.from(ids),
      images: images.slice(0, 100),
      links: links.slice(0, 50),
      forms,
      headings,
    };
  }

  /**
   * Detecta frameworks y librerías en el HTML
   */
  detectTechnologies(html) {
    const technologies = {
      frameworks: [],
      cssFrameworks: [],
      libraries: [],
    };

    const detections = {
      react: ['__react', 'ReactDOM', '_next'],
      'next.js': ['/_next/', '__NEXT', 'next/'],
      vue: ['__vue', '__VUE__', 'Vue'],
      angular: ['ng-', 'angular'],
      svelte: ['svelte'],
      tailwind: ['@tailwind', 'tailwindcss'],
      bootstrap: ['bootstrap.css', 'bootstrap.js', 'data-bs-'],
    };

    for (const [tech, patterns] of Object.entries(detections)) {
      const found = patterns.some(p => html.includes(p));
      if (found) {
        if (tech === 'tailwind' || tech === 'bootstrap') {
          if (!technologies.cssFrameworks.includes(tech)) {
            technologies.cssFrameworks.push(tech);
          }
        } else {
          if (!technologies.frameworks.includes(tech)) {
            technologies.frameworks.push(tech);
          }
        }
      }
    }

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

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      // ========== VIEWPORT DESKTOP ==========
      console.log('\n📱 Capturando versión DESKTOP (1920x1080)...');
      let page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      );

      await page.goto(this.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const desktopHTML = await page.content();
      const desktopInfo = this.extractPageInfo(desktopHTML);

      // Screenshot desktop
      const desktopScreenshot = path.join(this.outputDir, 'screenshot-desktop.png');
      await page.screenshot({ path: desktopScreenshot, fullPage: true });
      console.log(`✓ Screenshot desktop guardado (1920x1080)`);

      this.data.html.desktop = desktopHTML;
      this.data.screenshots.desktop = 'screenshot-desktop.png';
      this.data.images = desktopInfo.images;
      this.data.links = desktopInfo.links;
      this.data.forms = desktopInfo.forms;
      this.data.headings = desktopInfo.headings;
      this.data.css.classes.push(...desktopInfo.classes);

      await page.close();

      // ========== VIEWPORT MOBILE ==========
      console.log('📱 Capturando versión MOBILE (375x667)...');
      page = await browser.newPage();
      await page.setViewport({ width: 375, height: 667 });
      await page.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      );

      await page.goto(this.url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      const mobileHTML = await page.content();
      const mobileInfo = this.extractPageInfo(mobileHTML);

      // Screenshot mobile
      const mobileScreenshot = path.join(this.outputDir, 'screenshot-mobile.png');
      await page.screenshot({ path: mobileScreenshot, fullPage: true });
      console.log(`✓ Screenshot mobile guardado (375x667)`);

      this.data.html.mobile = mobileHTML;
      this.data.screenshots.mobile = 'screenshot-mobile.png';
      this.data.css.classes.push(...mobileInfo.classes);

      // ========== DETECCIÓN DE TECNOLOGÍAS ==========
      console.log('\n🔍 Detectando tecnologías...');
      const technologies = this.detectTechnologies(desktopHTML);
      this.data.metadata.technologies = technologies;
      console.log(`✓ Tecnologías detectadas:`, technologies);

      await page.close();
      await browser.close();

      // ========== PROCESAR RESULTADOS ==========
      console.log('\n📊 Procesando datos...');

      // Deduplicar clases
      this.data.css.classes = Array.from(new Set(this.data.css.classes)).sort();

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

    if (this.data.css.classes.length < 10) score -= 20;
    if (this.data.images.length === 0) score -= 10;
    if (this.data.forms.length === 0) score -= 5;

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
    fs.writeFileSync(jsonPath, JSON.stringify(this.data, null, 2));
    console.log(`✓ Datos guardados en: data.json (${this.data.css.classes.length} clases CSS)`);

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

    // Guardar resumen
    const summary = {
      url: this.data.metadata.url,
      scrapedAt: this.data.metadata.scrapedAt,
      technologies: this.data.metadata.technologies,
      confidence: this.data.confidence,
      statistics: {
        totalClasses: this.data.css.classes.length,
        totalImages: this.data.images.length,
        totalLinks: this.data.links.length,
        totalForms: this.data.forms.length,
        totalHeadings: this.data.headings.length,
      },
      files: {
        data: 'data.json',
        htmlDesktop: 'page-desktop.html',
        htmlMobile: 'page-mobile.html',
        classes: 'classes.json',
        screenshotDesktop: 'screenshot-desktop.png',
        screenshotMobile: 'screenshot-mobile.png',
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
    console.error('❌ Uso: node scraper-puppeteer.js <URL>');
    console.error('Ejemplo: node scraper-puppeteer.js https://example.com');
    process.exit(1);
  }

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
    console.error('Error fatal:', error.message);
    process.exit(1);
  }
}

main();
