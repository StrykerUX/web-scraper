// fetch-fusion.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

function delay(ms){return new Promise(r=>setTimeout(r, ms));}

(async () => {
  const url = process.argv[2]; if(!url) return console.error('Uso: node fetch-fusion.js <url>');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = path.join(process.cwd(),'fetch-results', ts); fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width:1366, height:768 } });
  const page = await context.newPage();

  await page.goto(url, { waitUntil:'networkidle', timeout:90000 });
  await page.waitForTimeout(800);

  // intentar aceptar cookies
  const cookieSelectors = ['text=/aceptar/i','text=/accept/i','button[aria-label=close]'];
  for(const sel of cookieSelectors){ try{ const el=await page.$(sel); if(el){ await el.click({timeout:1500}).catch(()=>{}); await page.waitForTimeout(300); break;} }catch(e){} }

  // interacción básica
  await page.mouse.move(300,300,{steps:12}); await page.waitForTimeout(400);

  // scroll lazy load
  await page.evaluate(async ()=>{ await new Promise((res)=>{ let total=0; const step=400; const t=setInterval(()=>{ window.scrollBy(0,step); total+=step; if(total>=document.body.scrollHeight){ clearInterval(t); res(); } },250); }); });
  await page.waitForTimeout(800);

  // detectar slider
  const nextBtn = await page.$('button[aria-label="next"], .w-slider-arrow-right, .slider-next, .slick-next');
  const dots = await page.$$('.w-slider-dot, .slick-dots button, .carousel-dot');
  const slidesToCapture = Math.max(1, Math.min(6, dots.length || 3));

  for(let i=0;i<slidesToCapture;i++){
    if(dots.length && dots[i]){ await dots[i].click().catch(()=>{}); }
    else if(nextBtn){ await nextBtn.click().catch(()=>{}); }
    else{ await page.mouse.wheel(0,300).catch(()=>{}); }
    await page.waitForTimeout(900);
    await page.addStyleTag({ content:'*{ animation-play-state: paused !important; transition: none !important; }' });
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `screenshot_slide_${i+1}.png`), fullPage: true });
    await page.evaluate(()=>{ Array.from(document.querySelectorAll('style')).filter(s=>s.innerText.includes('animation-play-state')).forEach(s=>s.remove()); }).catch(()=>{});
    await page.waitForTimeout(250);
  }

  await page.screenshot({ path: path.join(out,'screenshot_desktop.png'), fullPage: true });
  await page.setViewportSize({ width:390, height:844 }); await delay(800);
  await page.screenshot({ path: path.join(out,'screenshot_mobile.png'), fullPage: true });

  const html = await page.content(); fs.writeFileSync(path.join(out,'page.html'), html, 'utf8');
  const classes = await page.evaluate(()=>Array.from(document.querySelectorAll('[class]')).flatMap(el=>el.className.split(/\s+/)).filter(Boolean));
  fs.writeFileSync(path.join(out,'classes_list.txt'), Array.from(new Set(classes)).join('\n'),'utf8');
  const resources = await page.evaluate(()=>Array.from(document.querySelectorAll('link[href], script[src]')).map(n=>({tag:n.tagName, url:n.href||n.src}))); fs.writeFileSync(path.join(out,'resources.json'), JSON.stringify(resources,null,2),'utf8');
  fs.writeFileSync(path.join(out,'fetch_info.txt'), `url: ${url}\nfetched_at: ${new Date().toISOString()}\nslides_captured: ${slidesToCapture}\n`,'utf8');

  await context.close().catch(()=>{}); await browser.close().catch(()=>{});
  console.log('Fetch fusion completo en:', out);
})();
