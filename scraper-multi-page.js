const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

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

// Main scraping function for a single page
async function scrapePage(browser, pageConfig, options) {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Starting scrape for: ${pageConfig.name}`);
    console.log(`URL: ${pageConfig.url}`);
    console.log(`${'='.repeat(60)}\n`);

    const page = await browser.newPage();

    try {
        // Set viewport
        await page.setViewport(pageConfig.viewport);

        // Set user agent if provided
        if (options.userAgent) {
            await page.setUserAgent(options.userAgent);
        }

        console.log('⏳ Navigating to page...');

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

        // Additional wait time specified in config
        if (pageConfig.waitTime) {
            console.log(`⏳ Additional wait time: ${pageConfig.waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, pageConfig.waitTime));
        }

        // Final network idle check
        console.log('⏳ Final network idle check...');
        await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {
            console.log('⚠ Network not completely idle, continuing anyway...');
        });

        console.log('✓ All resources loaded, starting capture...\n');

        // Create output directory
        const outputDir = path.join(__dirname, 'output', pageConfig.name);
        await ensureDir(outputDir);

        // Take full page screenshot
        const fullPagePath = path.join(outputDir, 'fullpage.png');
        console.log('📸 Capturing full page screenshot...');
        await page.screenshot({
            path: fullPagePath,
            fullPage: true,
            type: options.screenshotFormat || 'png'
        });
        console.log(`✓ Full page screenshot saved: ${fullPagePath}`);

        // Scroll back to top for viewport screenshot
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 500));

        // Take viewport screenshot
        const viewportPath = path.join(outputDir, 'viewport.png');
        console.log('📸 Capturing viewport screenshot...');
        await page.screenshot({
            path: viewportPath,
            fullPage: false,
            type: options.screenshotFormat || 'png'
        });
        console.log(`✓ Viewport screenshot saved: ${viewportPath}`);

        // Extract data if selectors provided
        let extractedData = null;
        if (pageConfig.selectors && Object.keys(pageConfig.selectors).length > 0) {
            console.log('\n📊 Extracting data...');
            extractedData = await extractData(page, pageConfig.selectors);
            console.log(`✓ Data extracted (${Object.keys(extractedData).length} fields)`);
        }

        // Get page metadata
        const metadata = await page.evaluate(() => ({
            title: document.title,
            url: window.location.href,
            viewport: {
                width: window.innerWidth,
                height: window.innerHeight
            },
            documentHeight: document.body.scrollHeight
        }));

        // Save data to JSON
        const dataPath = path.join(outputDir, 'data.json');
        const outputData = {
            metadata: {
                ...metadata,
                captureDate: new Date().toISOString(),
                loadTime: Date.now() - startTime
            },
            data: extractedData
        };

        await fs.writeFile(dataPath, JSON.stringify(outputData, null, 2));
        console.log(`✓ Data saved: ${dataPath}`);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n✅ Successfully scraped ${pageConfig.name} in ${totalTime}s`);

        return { success: true, time: totalTime };

    } catch (error) {
        console.error(`\n❌ Error scraping ${pageConfig.name}:`, error.message);
        return { success: false, error: error.message };
    } finally {
        await page.close();
    }
}

// Main function
async function main() {
    const startTime = Date.now();
    console.log('\n🚀 Multi-Page Web Scraper Starting...\n');

    // Load configuration
    let config;
    try {
        const configPath = path.join(__dirname, 'scraper-config.json');
        const configFile = await fs.readFile(configPath, 'utf-8');
        config = JSON.parse(configFile);
        console.log(`✓ Configuration loaded: ${config.pages.length} page(s) to scrape\n`);
    } catch (error) {
        console.error('❌ Error loading configuration:', error.message);
        process.exit(1);
    }

    // Launch browser
    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
        headless: config.options.headless !== false,
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
    for (let i = 0; i < config.pages.length; i++) {
        const pageConfig = config.pages[i];
        let attempts = 0;
        let result = null;

        // Retry logic
        while (attempts < config.options.maxRetries && (!result || !result.success)) {
            if (attempts > 0) {
                console.log(`\n🔄 Retry ${attempts}/${config.options.maxRetries - 1} for ${pageConfig.name}...\n`);
            }

            result = await scrapePage(browser, pageConfig, config.options);
            attempts++;

            if (!result.success && attempts < config.options.maxRetries) {
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

    console.log('\n🎉 Scraping completed!\n');
}

// Run the scraper
main().catch(console.error);
