const puppeteer = require('puppeteer');
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

// Function to extract data based on selectors
async function extractData(page, selectors) {
    if (!selectors || Object.keys(selectors).length === 0) {
        return null;
    }

    const data = {};

    for (const [key, selector] of Object.entries(selectors)) {
        try {
            // Check if it's a list selector (returns multiple elements)
            const elements = await page.$$(selector);

            if (elements.length > 1) {
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
            } else if (elements.length === 1) {
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

// Function to capture and save page data for a specific device
async function capturePageData(page, outputDir, deviceType) {
    const prefix = `${deviceType}-`;

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
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take viewport screenshot
    const viewportPath = path.join(outputDir, `${prefix}viewport.png`);
    console.log(`📸 Capturing ${deviceType} viewport screenshot...`);
    await page.screenshot({
        path: viewportPath,
        fullPage: false,
        type: 'png'
    });
    console.log(`✓ ${deviceType} viewport screenshot saved`);

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
            await page.setViewport({
                width: viewport.width,
                height: viewport.height
            });
            await page.setUserAgent(viewport.userAgent);

            console.log(`⏳ Navigating to page (${viewport.width}x${viewport.height})...`);

            // Navigate with network idle wait
            await page.goto(pageConfig.url, {
                waitUntil: ['load', 'domcontentloaded', 'networkidle2'],
                timeout: 90000
            });

            console.log('✓ Page loaded, ensuring all resources are ready...');

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
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Final network idle check
            console.log('⏳ Final network idle check...');
            await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
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
    console.log('\n🎮 CORTANA - Web Intelligence Scanner\n');

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
            console.log('  node cortana <url1> <url2> ...');
            console.log('  or have a scraper-config.json file in the same directory\n');
            console.log('📝 Example:');
            console.log('  node cortana https://example.com https://google.com\n');
            process.exit(1);
        }
    } else {
        console.log(`✓ Processing ${pages.length} URL(s) from command line\n`);
    }

    // Launch browser
    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
        headless: options.headless !== false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
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
    console.log(`  - 2 HTML files (page-desktop.html, page-mobile.html)`);
    console.log(`  - 4 JSON files (data.json, classes.json, css-variables.json, computed-styles.json)`);
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

    console.log('\n✅ Mission complete. Cortana out.\n');
}

// Run the scraper
main().catch(console.error);
