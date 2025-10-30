// extract-from-html.js
const fs = require('fs');
const path = require('path');
const input = process.argv[2]; if(!input) return console.error('Uso: node extract-from-html.js <ruta a page.html>');
const html = fs.readFileSync(input,'utf8'); const dir = path.dirname(input);
// extraer clases
const classRegex = /class\s*=\s*["']([^"']+)["']/gi; const classes = new Set(); let m;
while((m=classRegex.exec(html))!==null){ m[1].split(/\s+/).map(s=>s.trim()).filter(Boolean).forEach(c=>classes.add(c)); }
fs.writeFileSync(path.join(dir,'classes_list.txt'), Array.from(classes).join('\n'),'utf8');
// detectar stack
const lower = html.toLowerCase(); const detected = { tailwind:false, gsap:false, lenis:false, webflow:false, react:false, nextjs:false };
if(lower.includes('tailwind') || /class=["'][^"']*(?:p-|m-|text-|bg-|flex|grid|gap-)/.test(lower)){ detected.tailwind=true; }
if(lower.includes('gsap')) detected.gsap=true; if(lower.includes('lenis')) detected.lenis=true; if(lower.includes('webflow')) detected.webflow=true; if(lower.includes('react')) detected.react=true; if(lower.includes('/_next/')) detected.nextjs=true;
fs.writeFileSync(path.join(dir,'detected_stack.json'), JSON.stringify(detected,null,2),'utf8');
let url=''; const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i); if(canonical && canonical[1]) url=canonical[1];
fs.writeFileSync(path.join(dir,'fetch_info.txt'), `source_html: ${path.basename(input)}\nurl_detected: ${url}\nfetched_at: ${new Date().toISOString()}\n`,'utf8');
console.log('Extracción completada en:', dir);
