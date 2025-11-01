const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Viewport configurations
const VIEWPORTS = {
    desktop: {
        width: 1920,
        height: 1080,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    mobile: {
        width: 375,
        height: 812,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
};

// Utility function to ensure directory exists
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

// Function to wait for lazy-loaded images
async function waitForLazyImages(page) {
    await page.evaluate(async () => {
        // Scroll to bottom to trigger lazy loading
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Find all images with lazy loading attributes
        const images = Array.from(document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]'));

        // Force load lazy images
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
            if (img.loading === 'lazy') {
                img.loading = 'eager';
            }
        });

        // Wait for all images to load
        await Promise.all(
            Array.from(document.images)
                .filter(img => !img.complete)
                .map(img => new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                    // Timeout after 10 seconds
                    setTimeout(resolve, 10000);
                }))
        );
    });
}

// Function to wait for fonts to load
async function waitForFonts(page) {
    await page.evaluate(async () => {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }
    });
}

// Function to scroll page to ensure all content loads
async function scrollToBottom(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    // Scroll back to top
                    window.scrollTo(0, 0);
                    resolve();
                }
            }, 100);
        });
    });
}

// Function to dismiss cookie consent banners
async function dismissCookieConsent(page) {
    const cookieSelectors = [
        'text=/aceptar/i',
        'text=/accept/i',
        'text=/acepto/i',
        'button[aria-label*="close" i]',
        'button[aria-label*="dismiss" i]',
        '[id*="cookie" i] button',
        '[class*="cookie" i] button',
        '.cookie-consent button',
        '#cookie-banner button'
    ];

    for (const selector of cookieSelectors) {
        try {
            const element = await page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 })) {
                await element.click({ timeout: 1500 });
                console.log('✓ Cookie consent dismissed');
                await page.waitForTimeout(300);
                return true;
            }
        } catch (e) {
            // Continue to next selector
        }
    }
    return false;
}

// Function to detect sliders/carousels
async function detectSliders(page) {
    return await page.evaluate(() => {
        const sliderSelectors = [
            '.w-slider',
            '.slick-slider',
            '.carousel',
            '.swiper',
            '[class*="slider"]',
            '[class*="carousel"]'
        ];

        for (const selector of sliderSelectors) {
            const slider = document.querySelector(selector);
            if (slider) {
                // Find navigation elements
                const nextBtn = slider.querySelector('button[aria-label*="next" i], .slider-next, .slick-next, .w-slider-arrow-right');
                const dots = Array.from(slider.querySelectorAll('.w-slider-dot, .slick-dots button, .carousel-dot, [class*="dot"]'));

                return {
                    found: true,
                    hasNext: !!nextBtn,
                    dotsCount: dots.length,
                    slidesToCapture: Math.max(1, Math.min(5, dots.length || 3))
                };
            }
        }
        return { found: false };
    });
}

// Function to pause animations for cleaner screenshots
async function pauseAnimations(page) {
    await page.addStyleTag({
        content: `
            *, *::before, *::after {
                animation-play-state: paused !important;
                animation-delay: 0s !important;
                transition: none !important;
            }
        `
    });
    await page.waitForTimeout(150);
}

// Function to resume animations
async function resumeAnimations(page) {
    await page.evaluate(() => {
        const styles = Array.from(document.querySelectorAll('style'));
        styles.forEach(style => {
            if (style.textContent && style.textContent.includes('animation-play-state')) {
                style.remove();
            }
        });
    });
}

// Function to detect tech stack
async function detectStack(page) {
    return await page.evaluate(() => {
        const stack = {
            frameworks: [],
            libraries: [],
            cssFrameworks: [],
            buildTools: []
        };

        // React detection
        if (window.React || document.querySelector('[data-reactroot], [data-reactid]') ||
            document.querySelector('script[src*="react"]')) {
            stack.frameworks.push('React');
        }

        // Vue detection
        if (window.Vue || document.querySelector('[data-v-]') ||
            document.querySelector('script[src*="vue"]')) {
            stack.frameworks.push('Vue');
        }

        // Angular detection
        if (window.angular || window.ng || document.querySelector('[ng-app], [ng-version]')) {
            stack.frameworks.push('Angular');
        }

        // Next.js detection
        if (document.querySelector('#__next') || document.querySelector('script[src*="/_next/"]')) {
            stack.frameworks.push('Next.js');
        }

        // Svelte detection
        if (document.querySelector('script[src*="svelte"]')) {
            stack.frameworks.push('Svelte');
        }

        // GSAP detection
        if (window.gsap || document.querySelector('script[src*="gsap"]')) {
            stack.libraries.push('GSAP');
        }

        // Three.js detection
        if (window.THREE || document.querySelector('canvas[data-engine*="three"]')) {
            stack.libraries.push('Three.js');
        }

        // Lenis smooth scroll
        if (window.Lenis || document.querySelector('script[src*="lenis"]')) {
            stack.libraries.push('Lenis');
        }

        // Tailwind CSS detection
        const hasUtilityClasses = Array.from(document.querySelectorAll('[class]'))
            .some(el => /\b(flex|grid|p-\d+|m-\d+|text-|bg-|hover:)/.test(el.className));
        if (hasUtilityClasses || document.querySelector('script[src*="tailwind"]')) {
            stack.cssFrameworks.push('Tailwind CSS');
        }

        // Bootstrap detection
        if (document.querySelector('[class*="container"]') &&
            document.querySelector('[class*="row"]') &&
            document.querySelector('link[href*="bootstrap"]')) {
            stack.cssFrameworks.push('Bootstrap');
        }

        // Webflow detection
        if (document.querySelector('meta[name="generator"][content*="Webflow"]') ||
            document.querySelector('script[src*="webflow"]')) {
            stack.buildTools.push('Webflow');
        }

        // Framer detection
        if (document.querySelector('[data-framer-name]') ||
            window.location.hostname.includes('framer.app')) {
            stack.buildTools.push('Framer');
        }

        return stack;
    });
}

// Function to extract all resources
async function extractResources(page) {
    return await page.evaluate(() => {
        const resources = {
            stylesheets: [],
            scripts: [],
            images: [],
            fonts: []
        };

        // Stylesheets
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            resources.stylesheets.push({
                url: link.href,
                media: link.media || 'all'
            });
        });

        // Scripts
        document.querySelectorAll('script[src]').forEach(script => {
            resources.scripts.push({
                url: script.src,
                type: script.type || 'text/javascript',
                async: script.async,
                defer: script.defer
            });
        });

        // Images
        document.querySelectorAll('img[src]').forEach(img => {
            resources.images.push({
                url: img.currentSrc || img.src,
                alt: img.alt || null,
                loading: img.loading || 'eager',
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        });

        // Fonts
        const fontFaceRules = [];
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                Array.from(sheet.cssRules || []).forEach(rule => {
                    if (rule instanceof CSSFontFaceRule) {
                        const fontFamily = rule.style.fontFamily?.replace(/['"]/g, '');
                        const src = rule.style.src;
                        if (fontFamily && src) {
                            fontFaceRules.push({ fontFamily, src });
                        }
                    }
                });
            } catch (e) {
                // CORS restrictions
            }
        });
        resources.fonts = fontFaceRules;

        return resources;
    });
}

// Function to capture slider/carousel states (WEAPON EXCLUSIVE)
async function captureSliderStates(page, outputDir, sliderInfo) {
    const screenshots = [];

    try {
        // Scroll back to top to find slider
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // Find next button and dots
        const nextButtonSelectors = [
            'button[aria-label*="next" i]',
            '.slider-next',
            '.slick-next',
            '.w-slider-arrow-right',
            '[class*="next"]',
            '[class*="arrow-right"]'
        ];

        const dotsSelectors = [
            '.w-slider-dot',
            '.slick-dots button',
            '.carousel-dot',
            '[class*="dot"]',
            '[class*="pagination"] button'
        ];

        let nextButton = null;
        let dots = [];

        // Try to find next button
        for (const selector of nextButtonSelectors) {
            try {
                const btn = page.locator(selector).first();
                if (await btn.isVisible({ timeout: 2000 })) {
                    nextButton = btn;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        // Try to find dots
        for (const selector of dotsSelectors) {
            try {
                const dotElements = await page.locator(selector).all();
                if (dotElements.length > 0) {
                    dots = dotElements;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        const slidesToCapture = Math.min(sliderInfo.slidesToCapture || 3, 6);
        console.log(`   Capturing ${slidesToCapture} slider states...`);

        for (let i = 0; i < slidesToCapture; i++) {
            // Navigate to slide
            if (dots.length > i) {
                // Use dots if available
                try {
                    await dots[i].click({ timeout: 1500 });
                    console.log(`   ✓ Clicked dot ${i + 1}`);
                } catch (e) {
                    console.log(`   ⚠ Could not click dot ${i + 1}, using next button`);
                    if (nextButton && i > 0) {
                        await nextButton.click({ timeout: 1500 }).catch(() => {});
                    }
                }
            } else if (nextButton && i > 0) {
                // Use next button
                try {
                    await nextButton.click({ timeout: 1500 });
                    console.log(`   ✓ Clicked next button (state ${i + 1})`);
                } catch (e) {
                    console.log(`   ⚠ Could not click next button for state ${i + 1}`);
                }
            }

            // Wait for transition
            await page.waitForTimeout(900);

            // Pause animations
            await pauseAnimations(page);

            // Take screenshot
            const screenshotPath = path.join(outputDir, `slider-slide-${i + 1}.png`);
            await page.screenshot({
                path: screenshotPath,
                fullPage: false,
                type: 'png'
            });

            screenshots.push({
                slideNumber: i + 1,
                path: screenshotPath,
                fileName: `slider-slide-${i + 1}.png`
            });

            console.log(`   📸 Slide ${i + 1} captured`);

            // Resume animations
            await resumeAnimations(page);

            await page.waitForTimeout(250);
        }

        console.log(`✓ Captured ${screenshots.length} slider screenshots`);
        return screenshots;

    } catch (error) {
        console.error(`⚠ Error capturing slider states: ${error.message}`);
        return screenshots; // Return whatever we captured
    }
}

// Function to extract data based on selectors
async function extractData(page, selectors) {
    if (!selectors || Object.keys(selectors).length === 0) {
        return null;
    }

    const data = {};

    for (const [key, selector] of Object.entries(selectors)) {
        try {
            // Check if it's a list selector (returns multiple elements)
            const elementsCount = await page.locator(selector).count();

            if (elementsCount > 1) {
                // Multiple elements - extract array
                data[key] = await page.evaluate((sel) => {
                    return Array.from(document.querySelectorAll(sel)).map(el => {
                        // Get text content or href for links
                        if (el.tagName === 'A') {
                            return {
                                text: el.textContent.trim(),
                                href: el.href
                            };
                        }
                        return el.textContent.trim();
                    });
                }, selector);
            } else if (elementsCount === 1) {
                // Single element
                data[key] = await page.evaluate((sel) => {
                    const el = document.querySelector(sel);
                    if (!el) return null;

                    // Handle meta tags
                    if (el.tagName === 'META') {
                        return el.getAttribute('content');
                    }

                    // Handle links
                    if (el.tagName === 'A') {
                        return {
                            text: el.textContent.trim(),
                            href: el.href
                        };
                    }

                    return el.textContent.trim();
                }, selector);
            } else {
                data[key] = null;
            }
        } catch (error) {
            console.error(`Error extracting data for selector "${selector}":`, error.message);
            data[key] = null;
        }
    }

    return data;
}

// Function to extract CSS information
async function extractCSSInfo(page) {
    return await page.evaluate(() => {
        // Extract all unique classes
        const allElements = document.querySelectorAll('*');
        const classes = new Set();
        allElements.forEach(el => {
            if (el.className && typeof el.className === 'string') {
                el.className.split(' ').forEach(cls => {
                    if (cls.trim()) classes.add(cls.trim());
                });
            }
        });

        // Extract CSS variables from :root
        const rootStyles = getComputedStyle(document.documentElement);
        const cssVariables = {};
        for (let i = 0; i < rootStyles.length; i++) {
            const prop = rootStyles[i];
            if (prop.startsWith('--')) {
                cssVariables[prop] = rootStyles.getPropertyValue(prop).trim();
            }
        }

        // Extract computed styles from body and main elements
        const bodyStyles = getComputedStyle(document.body);
        const mainElement = document.querySelector('main') || document.body;
        const mainStyles = getComputedStyle(mainElement);

        const computedStyles = {
            body: {
                backgroundColor: bodyStyles.backgroundColor,
                color: bodyStyles.color,
                fontFamily: bodyStyles.fontFamily,
                fontSize: bodyStyles.fontSize,
                lineHeight: bodyStyles.lineHeight
            },
            main: {
                backgroundColor: mainStyles.backgroundColor,
                color: mainStyles.color,
                fontFamily: mainStyles.fontFamily,
                fontSize: mainStyles.fontSize,
                lineHeight: mainStyles.lineHeight,
                maxWidth: mainStyles.maxWidth,
                padding: mainStyles.padding,
                margin: mainStyles.margin
            }
        };

        return {
            classes: Array.from(classes).sort(),
            cssVariables,
            computedStyles
        };
    });
}

// Function to analyze SEO
async function analyzeSEO(page) {
    return await page.evaluate(() => {
        const analysis = {
            metaTags: {},
            headings: {},
            images: {},
            links: {},
            mobile: {},
            schema: {},
            performance: {}
        };

        // Meta Tags Analysis
        const title = document.querySelector('title');
        const metaDesc = document.querySelector('meta[name="description"]');
        const canonical = document.querySelector('link[rel="canonical"]');
        const ogTitle = document.querySelector('meta[property="og:title"]');
        const ogDesc = document.querySelector('meta[property="og:description"]');
        const ogImage = document.querySelector('meta[property="og:image"]');
        const twitterCard = document.querySelector('meta[name="twitter:card"]');
        const viewport = document.querySelector('meta[name="viewport"]');

        analysis.metaTags = {
            title: title ? title.textContent : null,
            titleLength: title ? title.textContent.length : 0,
            description: metaDesc ? metaDesc.getAttribute('content') : null,
            descriptionLength: metaDesc ? metaDesc.getAttribute('content').length : 0,
            canonical: canonical ? canonical.getAttribute('href') : null,
            hasOpenGraph: !!(ogTitle || ogDesc || ogImage),
            openGraph: {
                title: ogTitle ? ogTitle.getAttribute('content') : null,
                description: ogDesc ? ogDesc.getAttribute('content') : null,
                image: ogImage ? ogImage.getAttribute('content') : null
            },
            hasTwitterCard: !!twitterCard,
            twitterCard: twitterCard ? twitterCard.getAttribute('content') : null,
            favicon: document.querySelector('link[rel*="icon"]') ? true : false
        };

        // Headings Analysis
        const h1s = document.querySelectorAll('h1');
        const h2s = document.querySelectorAll('h2');
        const h3s = document.querySelectorAll('h3');
        const h4s = document.querySelectorAll('h4');
        const h5s = document.querySelectorAll('h5');
        const h6s = document.querySelectorAll('h6');

        analysis.headings = {
            h1Count: h1s.length,
            h1Text: Array.from(h1s).map(h => h.textContent.trim()),
            h2Count: h2s.length,
            h3Count: h3s.length,
            h4Count: h4s.length,
            h5Count: h5s.length,
            h6Count: h6s.length,
            totalHeadings: h1s.length + h2s.length + h3s.length + h4s.length + h5s.length + h6s.length,
            hasProperH1: h1s.length === 1
        };

        // Images Analysis
        const allImages = document.querySelectorAll('img');
        const imagesWithoutAlt = Array.from(allImages).filter(img => !img.alt || img.alt.trim() === '');
        const modernFormats = Array.from(allImages).filter(img =>
            img.src.includes('.webp') || img.src.includes('.avif')
        );

        analysis.images = {
            total: allImages.length,
            withoutAlt: imagesWithoutAlt.length,
            withAlt: allImages.length - imagesWithoutAlt.length,
            modernFormats: modernFormats.length,
            altCoverage: allImages.length > 0 ?
                Math.round(((allImages.length - imagesWithoutAlt.length) / allImages.length) * 100) : 100
        };

        // Links Analysis
        const allLinks = document.querySelectorAll('a[href]');
        const internalLinks = Array.from(allLinks).filter(link => {
            const href = link.getAttribute('href');
            return href && (href.startsWith('/') || href.includes(window.location.hostname));
        });
        const externalLinks = allLinks.length - internalLinks.length;
        const linksWithoutText = Array.from(allLinks).filter(link =>
            !link.textContent.trim() && !link.getAttribute('aria-label')
        );

        analysis.links = {
            total: allLinks.length,
            internal: internalLinks.length,
            external: externalLinks,
            withoutText: linksWithoutText.length,
            hasDescriptiveText: linksWithoutText.length === 0
        };

        // Mobile-Friendly Analysis
        analysis.mobile = {
            hasViewport: !!viewport,
            viewportContent: viewport ? viewport.getAttribute('content') : null,
            isMobileOptimized: viewport && viewport.getAttribute('content').includes('width=device-width')
        };

        // Schema Markup Analysis
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        const schemaTypes = [];
        jsonLdScripts.forEach(script => {
            try {
                const data = JSON.parse(script.textContent);
                if (data['@type']) {
                    schemaTypes.push(data['@type']);
                }
            } catch (e) {}
        });

        analysis.schema = {
            hasStructuredData: jsonLdScripts.length > 0,
            count: jsonLdScripts.length,
            types: schemaTypes
        };

        // Performance Analysis
        analysis.performance = {
            totalImages: allImages.length,
            totalLinks: allLinks.length,
            totalScripts: document.querySelectorAll('script').length,
            totalStylesheets: document.querySelectorAll('link[rel="stylesheet"]').length,
            documentSize: document.documentElement.innerHTML.length,
            hasLazyLoading: Array.from(allImages).some(img => img.loading === 'lazy')
        };

        return analysis;
    });
}

// Function to calculate SEO score and generate recommendations
function calculateSEOScore(seoData, metadata) {
    let score = 0;
    const issues = [];
    const recommendations = [];

    // Title (15 points)
    if (seoData.metaTags.title) {
        if (seoData.metaTags.titleLength >= 30 && seoData.metaTags.titleLength <= 60) {
            score += 15;
        } else if (seoData.metaTags.titleLength > 0) {
            score += 8;
            if (seoData.metaTags.titleLength < 30) {
                issues.push('Title tag is too short (< 30 chars)');
                recommendations.push('Expand title tag to 30-60 characters');
            } else {
                issues.push('Title tag is too long (> 60 chars)');
                recommendations.push('Shorten title tag to 30-60 characters');
            }
        }
    } else {
        issues.push('Missing title tag');
        recommendations.push('Add a descriptive title tag (30-60 chars)');
    }

    // Meta Description (15 points)
    if (seoData.metaTags.description) {
        if (seoData.metaTags.descriptionLength >= 120 && seoData.metaTags.descriptionLength <= 155) {
            score += 15;
        } else if (seoData.metaTags.descriptionLength > 0) {
            score += 8;
            if (seoData.metaTags.descriptionLength < 120) {
                issues.push('Meta description is too short (< 120 chars)');
                recommendations.push('Expand meta description to 120-155 characters');
            } else {
                issues.push('Meta description is too long (> 155 chars)');
                recommendations.push('Shorten meta description to 120-155 characters');
            }
        }
    } else {
        issues.push('Missing meta description');
        recommendations.push('Add a meta description (120-155 chars)');
    }

    // Headings (15 points)
    if (seoData.headings.hasProperH1) {
        score += 10;
    } else if (seoData.headings.h1Count === 0) {
        issues.push('Missing H1 heading');
        recommendations.push('Add exactly one H1 heading to the page');
    } else {
        issues.push(`Multiple H1 headings found (${seoData.headings.h1Count})`);
        recommendations.push('Use only one H1 heading per page');
    }

    if (seoData.headings.h2Count > 0) {
        score += 5;
    } else {
        issues.push('No H2 headings found');
        recommendations.push('Add H2 headings to structure your content');
    }

    // Images Alt Text (15 points)
    if (seoData.images.total === 0) {
        score += 15; // No images is fine
    } else if (seoData.images.withoutAlt === 0) {
        score += 15;
    } else {
        const percentage = (seoData.images.withAlt / seoData.images.total) * 15;
        score += Math.round(percentage);
        issues.push(`${seoData.images.withoutAlt} images missing alt text`);
        recommendations.push('Add descriptive alt text to all images');
    }

    // Mobile-Friendly (10 points)
    if (seoData.mobile.isMobileOptimized) {
        score += 10;
    } else if (seoData.mobile.hasViewport) {
        score += 5;
        issues.push('Viewport not properly configured for mobile');
        recommendations.push('Add width=device-width to viewport meta tag');
    } else {
        issues.push('Missing viewport meta tag');
        recommendations.push('Add viewport meta tag for mobile optimization');
    }

    // Open Graph (10 points)
    if (seoData.metaTags.hasOpenGraph) {
        score += 10;
    } else {
        issues.push('Missing Open Graph tags');
        recommendations.push('Add Open Graph tags for social sharing');
    }

    // Canonical URL (5 points)
    if (seoData.metaTags.canonical) {
        score += 5;
    } else {
        issues.push('Missing canonical URL');
        recommendations.push('Add canonical URL to avoid duplicate content issues');
    }

    // Structured Data (10 points)
    if (seoData.schema.hasStructuredData) {
        score += 10;
    } else {
        issues.push('No structured data (schema markup) found');
        recommendations.push('Add JSON-LD structured data for rich snippets');
    }

    // Performance (5 points)
    if (metadata.loadTime < 3000) {
        score += 5;
    } else if (metadata.loadTime < 5000) {
        score += 3;
    } else {
        issues.push('Page load time is slow');
        recommendations.push('Optimize page load time to under 3 seconds');
    }

    // Determine grade
    let grade;
    if (score >= 90) grade = 'Excellent';
    else if (score >= 75) grade = 'Good';
    else if (score >= 50) grade = 'Needs Improvement';
    else grade = 'Poor';

    return {
        score: Math.min(100, score),
        grade,
        issues,
        recommendations
    };
}

// Function to capture and save page data for a specific device
async function capturePageData(page, outputDir, deviceType) {
    const prefix = `${deviceType}-`;

    // Pause animations for cleaner screenshots
    console.log('⏸️  Pausing animations...');
    await pauseAnimations(page);

    // Take full page screenshot
    const fullPagePath = path.join(outputDir, `${prefix}fullpage.png`);
    console.log(`📸 Capturing ${deviceType} full page screenshot...`);
    await page.screenshot({
        path: fullPagePath,
        fullPage: true,
        type: 'png'
    });
    console.log(`✓ ${deviceType} full page screenshot saved`);

    // Scroll back to top for viewport screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // Take viewport screenshot
    const viewportPath = path.join(outputDir, `${prefix}viewport.png`);
    console.log(`📸 Capturing ${deviceType} viewport screenshot...`);
    await page.screenshot({
        path: viewportPath,
        fullPage: false,
        type: 'png'
    });
    console.log(`✓ ${deviceType} viewport screenshot saved`);

    // Resume animations
    await resumeAnimations(page);

    // Save HTML
    const htmlPath = path.join(outputDir, `page-${deviceType}.html`);
    console.log(`💾 Saving ${deviceType} HTML...`);
    const html = await page.content();
    await fs.writeFile(htmlPath, html);
    console.log(`✓ ${deviceType} HTML saved`);

    return {
        fullPagePath,
        viewportPath,
        htmlPath
    };
}

// Main scraping function for a single page
async function scrapePage(browser, pageConfig, options) {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting scrape for: ${pageConfig.name}`);
    console.log(`URL: ${pageConfig.url}`);
    console.log(`${'='.repeat(60)}\n`);

    // Create output directory
    const outputDir = path.join(__dirname, 'output', pageConfig.name);
    await ensureDir(outputDir);

    const results = {
        desktop: null,
        mobile: null,
        data: null,
        metadata: null,
        cssInfo: null
    };

    // Scrape for both desktop and mobile
    for (const [deviceType, viewport] of Object.entries(VIEWPORTS)) {
        console.log(`\n📱 Processing ${deviceType.toUpperCase()} version...\n`);

        const page = await browser.newPage();

        try {
            // Set viewport and user agent
            await page.setViewportSize({
                width: viewport.width,
                height: viewport.height
            });
            await page.setExtraHTTPHeaders({
                'User-Agent': viewport.userAgent
            });

            console.log(`⏳ Navigating to page (${viewport.width}x${viewport.height})...`);

            // Navigate with network idle wait (Playwright uses 'networkidle' instead of 'networkidle2')
            await page.goto(pageConfig.url, {
                waitUntil: 'networkidle',
                timeout: 90000
            });

            console.log('✓ Page loaded, ensuring all resources are ready...');

            // Try to dismiss cookie consent (only for desktop)
            if (deviceType === 'desktop') {
                console.log('🍪 Checking for cookie consent banners...');
                await dismissCookieConsent(page);
            }

            // Wait for fonts
            console.log('⏳ Waiting for fonts...');
            await waitForFonts(page);
            console.log('✓ Fonts loaded');

            // Scroll to bottom to trigger any lazy loading
            console.log('⏳ Scrolling page to trigger lazy loading...');
            await scrollToBottom(page);
            console.log('✓ Page scrolled');

            // Wait for lazy images
            console.log('⏳ Waiting for lazy-loaded images...');
            await waitForLazyImages(page);
            console.log('✓ Images loaded');

            // Additional wait time
            const waitTime = pageConfig.waitTime || 3000;
            console.log(`⏳ Additional wait time: ${waitTime}ms...`);
            await page.waitForTimeout(waitTime);

            // Final network idle check (Playwright has built-in waitForLoadState)
            console.log('⏳ Final network idle check...');
            await page.waitForLoadState('networkidle').catch(() => {
                console.log('⚠ Network not completely idle, continuing anyway...');
            });

            console.log('✓ All resources loaded, starting capture...\n');

            // Capture screenshots and HTML
            const captureData = await capturePageData(page, outputDir, deviceType);
            results[deviceType] = captureData;

            // Extract data (only once for desktop)
            if (deviceType === 'desktop' && pageConfig.selectors) {
                console.log('\n📊 Extracting data...');
                results.data = await extractData(page, pageConfig.selectors);
                if (results.data) {
                    console.log(`✓ Data extracted (${Object.keys(results.data).length} fields)`);
                }
            }

            // Extract CSS info (only once for desktop)
            if (deviceType === 'desktop') {
                console.log('\n🎨 Extracting CSS information...');
                results.cssInfo = await extractCSSInfo(page);
                console.log(`✓ CSS info extracted (${results.cssInfo.classes.length} classes, ${Object.keys(results.cssInfo.cssVariables).length} variables)`);

                // Extract SEO analysis (only once for desktop)
                console.log('\n🔍 Analyzing SEO...');
                results.seoData = await analyzeSEO(page);
                console.log('✓ SEO analysis completed');

                // Detect tech stack (only once for desktop)
                console.log('\n🔧 Detecting tech stack...');
                results.stack = await detectStack(page);
                const stackSummary = [
                    ...results.stack.frameworks,
                    ...results.stack.libraries,
                    ...results.stack.cssFrameworks,
                    ...results.stack.buildTools
                ];
                if (stackSummary.length > 0) {
                    console.log(`✓ Stack detected: ${stackSummary.join(', ')}`);
                } else {
                    console.log('✓ No common frameworks detected');
                }

                // Extract resources (only once for desktop)
                console.log('\n📦 Extracting resources...');
                results.resources = await extractResources(page);
                console.log(`✓ Resources extracted (${results.resources.stylesheets.length} CSS, ${results.resources.scripts.length} JS, ${results.resources.images.length} images, ${results.resources.fonts.length} fonts)`);

                // Detect sliders (only once for desktop)
                console.log('\n🎠 Detecting sliders/carousels...');
                results.sliderInfo = await detectSliders(page);
                if (results.sliderInfo.found) {
                    console.log(`✓ Slider detected (${results.sliderInfo.slidesToCapture} states available)`);

                    // WEAPON EXCLUSIVE: Capture slider states
                    console.log('\n📸 Capturing slider states (WEAPON EXCLUSIVE)...');
                    results.sliderScreenshots = await captureSliderStates(page, outputDir, results.sliderInfo);
                } else {
                    console.log('✓ No sliders detected');
                }
            }

            // Get page metadata (only once for desktop)
            if (deviceType === 'desktop') {
                results.metadata = await page.evaluate(() => ({
                    title: document.title,
                    url: window.location.href,
                    documentHeight: document.body.scrollHeight
                }));
            }

        } catch (error) {
            console.error(`\n❌ Error scraping ${deviceType} version:`, error.message);
            results[deviceType] = { error: error.message };
        } finally {
            await page.close();
        }
    }

    // Save all JSON files
    console.log('\n💾 Saving analysis files...');

    // Main data.json
    const dataPath = path.join(outputDir, 'data.json');
    const outputData = {
        metadata: {
            ...results.metadata,
            captureDate: new Date().toISOString(),
            loadTime: Date.now() - startTime
        },
        data: results.data,
        screenshots: {
            desktop: results.desktop,
            mobile: results.mobile
        }
    };
    await fs.writeFile(dataPath, JSON.stringify(outputData, null, 2));
    console.log('✓ data.json saved');

    // classes.json
    if (results.cssInfo && results.cssInfo.classes) {
        const classesPath = path.join(outputDir, 'classes.json');
        await fs.writeFile(classesPath, JSON.stringify(results.cssInfo.classes, null, 2));
        console.log('✓ classes.json saved');
    }

    // css-variables.json
    if (results.cssInfo && results.cssInfo.cssVariables) {
        const cssVarsPath = path.join(outputDir, 'css-variables.json');
        await fs.writeFile(cssVarsPath, JSON.stringify(results.cssInfo.cssVariables, null, 2));
        console.log('✓ css-variables.json saved');
    }

    // computed-styles.json
    if (results.cssInfo && results.cssInfo.computedStyles) {
        const computedStylesPath = path.join(outputDir, 'computed-styles.json');
        await fs.writeFile(computedStylesPath, JSON.stringify(results.cssInfo.computedStyles, null, 2));
        console.log('✓ computed-styles.json saved');
    }

    // seo-analysis.json
    if (results.seoData) {
        const seoScoring = calculateSEOScore(results.seoData, {
            ...results.metadata,
            loadTime: Date.now() - startTime
        });

        const seoAnalysis = {
            score: seoScoring.score,
            grade: seoScoring.grade,
            issues: seoScoring.issues,
            recommendations: seoScoring.recommendations,
            details: results.seoData
        };

        const seoPath = path.join(outputDir, 'seo-analysis.json');
        await fs.writeFile(seoPath, JSON.stringify(seoAnalysis, null, 2));
        console.log(`✓ seo-analysis.json saved (Score: ${seoScoring.score}/100 - ${seoScoring.grade})`);
    }

    // tech-stack.json
    if (results.stack) {
        const stackPath = path.join(outputDir, 'tech-stack.json');
        await fs.writeFile(stackPath, JSON.stringify(results.stack, null, 2));
        const totalDetected = [
            ...results.stack.frameworks,
            ...results.stack.libraries,
            ...results.stack.cssFrameworks,
            ...results.stack.buildTools
        ].length;
        console.log(`✓ tech-stack.json saved (${totalDetected} technologies detected)`);
    }

    // resources.json
    if (results.resources) {
        const resourcesPath = path.join(outputDir, 'resources.json');
        await fs.writeFile(resourcesPath, JSON.stringify(results.resources, null, 2));
        console.log(`✓ resources.json saved (${results.resources.stylesheets.length + results.resources.scripts.length + results.resources.images.length} resources)`);
    }

    // slider-info.json (only if slider detected)
    if (results.sliderInfo && results.sliderInfo.found) {
        const sliderPath = path.join(outputDir, 'slider-info.json');
        await fs.writeFile(sliderPath, JSON.stringify(results.sliderInfo, null, 2));
        console.log(`✓ slider-info.json saved`);
    }

    // slider-screenshots.json (WEAPON EXCLUSIVE - only if captured)
    if (results.sliderScreenshots && results.sliderScreenshots.length > 0) {
        const sliderScreenshotsPath = path.join(outputDir, 'slider-screenshots.json');
        await fs.writeFile(sliderScreenshotsPath, JSON.stringify(results.sliderScreenshots, null, 2));
        console.log(`✓ slider-screenshots.json saved (${results.sliderScreenshots.length} slides captured)`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Successfully scraped ${pageConfig.name} in ${totalTime}s`);

    return { success: true, time: totalTime };
}

// Function to generate page name from URL
function getPageNameFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/^www\./, '');
        const timestamp = Date.now();
        return `${hostname}-${timestamp}`;
    } catch (error) {
        return `page-${Date.now()}`;
    }
}

// Function to parse command line arguments
function parseCommandLineArgs() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        return null; // Use config file
    }

    // Filter out any flags and only keep URLs
    const urls = args.filter(arg => {
        try {
            new URL(arg);
            return true;
        } catch {
            return false;
        }
    });

    if (urls.length === 0) {
        return null;
    }

    // Create page configs from URLs
    return urls.map(url => ({
        name: getPageNameFromUrl(url),
        url: url,
        waitTime: 3000,
        selectors: {
            title: 'h1',
            description: 'meta[name="description"]',
            headings: 'h2'
        }
    }));
}

// Main function
async function main() {
    const startTime = Date.now();
    console.log('\n🔫 WEAPON - Advanced Web Intelligence Scanner\n');
    console.log('   Enhanced with Slider Multi-Capture\n');

    // Try to get pages from command line arguments first
    let pages = parseCommandLineArgs();
    let options = {
        headless: true,
        maxRetries: 3,
        screenshotFormat: 'png',
        screenshotQuality: 90
    };

    if (!pages) {
        // Load configuration from file
        try {
            const configPath = path.join(__dirname, 'scraper-config.json');
            const configFile = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configFile);
            pages = config.pages;
            options = { ...options, ...config.options };
            console.log(`✓ Configuration loaded from file: ${pages.length} page(s) to scrape\n`);
        } catch (error) {
            console.error('❌ Error: No URLs provided and could not load configuration file.');
            console.log('\n💡 Usage:');
            console.log('  node weapon <url1> <url2> ...');
            console.log('  or have a scraper-config.json file in the same directory\n');
            console.log('📝 Example:');
            console.log('  node weapon https://example.com https://google.com\n');
            process.exit(1);
        }
    } else {
        console.log(`✓ Processing ${pages.length} URL(s) from command line\n`);
    }

    // Launch browser (Playwright)
    console.log('🌐 Launching browser...');
    const browser = await chromium.launch({
        headless: options.headless !== false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    console.log('✓ Browser launched\n');

    const results = [];

    // Process each page
    for (let i = 0; i < pages.length; i++) {
        const pageConfig = pages[i];
        let attempts = 0;
        let result = null;

        // Retry logic
        while (attempts < options.maxRetries && (!result || !result.success)) {
            if (attempts > 0) {
                console.log(`\n🔄 Retry ${attempts}/${options.maxRetries - 1} for ${pageConfig.name}...\n`);
            }

            result = await scrapePage(browser, pageConfig, options);
            attempts++;

            if (!result.success && attempts < options.maxRetries) {
                console.log(`⏳ Waiting 5 seconds before retry...\n`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        results.push({
            name: pageConfig.name,
            url: pageConfig.url,
            ...result
        });
    }

    await browser.close();
    console.log('\n✓ Browser closed');

    // Print summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(60)}`);
    console.log('SCRAPING SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`Total time: ${totalTime}s`);
    console.log(`Pages processed: ${results.length}`);
    console.log(`Successful: ${results.filter(r => r.success).length}`);
    console.log(`Failed: ${results.filter(r => !r.success).length}`);
    console.log(`\nFiles per page:`);
    console.log(`  - 4 screenshots (desktop-fullpage, desktop-viewport, mobile-fullpage, mobile-viewport)`);
    console.log(`  - 3-6 slider screenshots* (slider-slide-1.png, slider-slide-2.png, etc.)`);
    console.log(`  - 2 HTML files (page-desktop.html, page-mobile.html)`);
    console.log(`  - 8-9 JSON files (data, classes, css-variables, computed-styles, seo-analysis, tech-stack, resources, slider-info*, slider-screenshots*)`);
    console.log(`    * slider files only if carousel/slider detected`);
    console.log(`    Total: 14-21 files per site (depending on sliders)`);
    console.log(`${'='.repeat(60)}\n`);

    results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.name} - ${result.url}`);
        if (result.error) {
            console.log(`   Error: ${result.error}`);
        } else if (result.time) {
            console.log(`   Time: ${result.time}s`);
        }
    });

    console.log('\n✅ Mission complete. Weapon secured.\n');
}

// Run the scraper
main().catch(console.error);
