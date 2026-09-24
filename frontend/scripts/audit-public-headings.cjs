// Local production build with read-only public API responses. No production writes.
const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'../dist'),workspace=path.resolve(__dirname,'../..');
const server=http.createServer((req,res)=>{const candidate=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);const file=candidate.startsWith(root+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(root,'index.html');res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));});
let browser;
(async()=>{
 const rows=(await(await fetch('https://api.roxavaltravels.com/api/v1/translations/pages')).json()).data;
 const selected=rows.filter(r=>r.locale==='en'||r.pageKey.split('/').filter(Boolean).length<2||r.pageKey.startsWith('/packages/'));
 for(const lang of ['de','fr'])for(const prefix of ['/destinations/','/activity/','/blog/']){const row=rows.find(r=>r.locale===lang&&r.pageKey.startsWith(prefix));if(row)selected.push(row);}
 const report=[];let cursor=0;const cache=new Map();
 await new Promise(r=>server.listen(4189,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 async function worker(){const context=await browser.newContext();context.setDefaultTimeout(15000);await context.addInitScript(()=>{try{localStorage.setItem('roxaval_lang','en');}catch{ /* Sandboxed external map frames have no storage. */ }});
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.pathname.includes('/api/v1/')){if(req.method()!=='GET')return route.abort();if(u.pathname.endsWith('/auth/me'))return route.fulfill({status:401,contentType:'application/json',body:'{"success":false}'});
   if(!cache.has(u.href))cache.set(u.href,fetch(u.href).then(async r=>({status:r.status,body:await r.text()})));const r=await cache.get(u.href);return route.fulfill({...r,contentType:'application/json'});}
  if(u.hostname!=='127.0.0.1'||['image','font','media'].includes(req.resourceType()))return route.abort();return route.continue();});
 const page=await context.newPage();let errors=[];page.on('pageerror',e=>errors.push(e.message));
 while(cursor<selected.length){const row=selected[cursor++];const pathname='/'+row.locale+'/'+(row.slug?row.slug+'/':'');errors=[];try{
  await page.goto('http://127.0.0.1:4189'+pathname,{waitUntil:'networkidle'});await page.locator('main h1').waitFor();
  const data=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(e=>e.textContent),headings:[...document.querySelectorAll('main h1,main h2,main h3,main h4')].map(e=>({level:Number(e.tagName[1]),text:e.textContent})),links:[...document.querySelectorAll('main a[href]')].map(e=>({href:e.getAttribute('href'),text:e.textContent?.trim()})),canonical:[...document.querySelectorAll('link[rel=canonical]')].map(e=>e.href),reviews:!!document.querySelector('#package-reviews-title'),paragraphs:document.querySelectorAll('main p').length}));
  const jumps=data.headings.filter((h,i)=>i>0&&h.level>data.headings[i-1].level+1);
  const known=new Set(rows.filter(r=>r.locale===row.locale).map(r=>'/'+r.locale+'/'+(r.slug?r.slug+'/':'')));
  const brokenLinks=data.links.filter(l=>{const u=new URL(l.href,'http://127.0.0.1:4189'+pathname);if(!['127.0.0.1','www.roxavaltravels.com'].includes(u.hostname))return false;const p=u.pathname.replace(/\/?$/,'/');if(p==='/'||/\/(auth|my-tours|profile|search|notifications|admin|account-settings)(\/|$)/.test(p))return false;return !known.has(p);});
  report.push({path:pathname,h1:data.h1,headingJumps:jumps,brokenLinks,runtimeErrors:[...errors],canonical:data.canonical,reviewSection:data.reviews,paragraphs:data.paragraphs});
 }catch(e){report.push({path:pathname,error:e.message});}
 if(report.length%20===0)console.log('Checked '+report.length+'/'+selected.length);
 }
 await context.close();}
 await Promise.all([worker(),worker()]);
 fs.writeFileSync(path.join(workspace,'backups/public-heading-audit-20260924.json'),JSON.stringify(report,null,2));
 const failures=report.filter(r=>r.error||r.h1.length!==1||r.headingJumps.length||r.brokenLinks.length||r.runtimeErrors.length||r.canonical.length!==1||(r.path.includes('/packages/')&&!r.reviewSection));
 console.log(JSON.stringify({checked:report.length,failures},null,2));if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
