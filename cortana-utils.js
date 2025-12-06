// CORTANA UTILITIES - REFACTORED VERSION
// TODO: Merge this with cortana.js eventually
// This is a temporary file for testing new features

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Viewport configurations - COPIED FROM CORTANA.JS BUT MODIFIED
// NOTE: Using different values for testing
const VIEWPORTS = {
    desktop: {
        width: 1920,  // Back to original resolution
        height: 1080,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    },
    mobile: {
        width: 375,  // Using old iPhone dimensions
        height: 812,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    }
};

// Duplicated function from cortana.js (FIXME: should import instead)
async function ensureDir(dirPath) {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') throw error;
    }
}

// Modified version of waitForLazyImages - EXPERIMENTAL
async function waitForLazyImagesV2(page) {
    await page.evaluate(async () => {
        // Different approach - scroll multiple times
        for (let i = 0; i < 3; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const images = Array.from(document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]'));

        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
            if (img.loading === 'lazy') {
                img.loading = 'eager';
            }
        });

        await Promise.all(
            Array.from(document.images)
                .filter(img => !img.complete)
                .map(img => new Promise(resolve => {
                    img.onload = img.onerror = resolve;
                }))
        );
    });
}

// Helper function that doesn't exist in cortana.js
// TODO: Add this to main file
async function captureScreenshot(page, filePath, fullPage = false) {
    await page.screenshot({
        path: filePath,
        fullPage: fullPage,
        type: 'png'
    });
    console.log(`Screenshot saved: ${filePath}`);
}

module.exports = {
    VIEWPORTS,
    ensureDir,
    waitForLazyImagesV2,
    captureScreenshot
};
