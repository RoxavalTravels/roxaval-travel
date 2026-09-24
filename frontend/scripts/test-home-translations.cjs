const { chromium }=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const copy=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../src/i18n/customer-copy.json')));
const testimonial=copy.find(r=>r[0].startsWith("Loved the resort's ambience"));
const server=http.createServer((req,res)=>{const candidate=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);const file=candidate.startsWith(root+path.sep)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(root,'index.html');res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));});
let browser;
(async()=>{
 await new Promise(r=>server.listen(4188,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 const context=await browser.newContext();await context.addInitScript(()=>localStorage.setItem('roxaval_lang','en'));
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.includes('/api/v1/')){const data=u.pathname.endsWith('/reviews')?[{_id:'4',text:testimonial[0],reviewerName:'Guest Name',rating:5,createdAt:'2026-09-01',images:[]}]:u.pathname.endsWith('/settings')?{}:[];return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data,meta:{total:Array.isArray(data)?data.length:1,totalPages:1,page:1}})});}if(u.hostname!=='127.0.0.1')return route.abort();return route.continue();});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [index,lang] of ['en','de','fr'].entries()){
  await page.setViewportSize({width:lang==='fr'?375:1440,height:900});
  await page.goto('http://127.0.0.1:4188/'+lang+'/');
  const activity=copy.find(r=>r[0]==='Wildlife Safari')[index];await page.locator('#activities h3').filter({hasText:activity}).waitFor();
  for(const english of ['Experienced Travel Experts','Fully Customized Tours','Trusted Local Guides','Comfortable Accommodation','Affordable Prices','Secure Booking Process','24/7 Customer Support','Safe & Reliable Transport']) assert.ok((await page.locator('#my-tours').innerText()).includes(copy.find(r=>r[0]===english)[index]));
  assert.ok((await page.locator('#destinations').innerText()).includes(copy.find(r=>r[0].startsWith('Climb the legendary'))[index]));
  await page.locator('#reviews').waitFor();assert.ok((await page.locator('#reviews').innerText()).includes(testimonial[index].slice(0,80)));assert.ok((await page.locator('#reviews').innerText()).includes('Guest Name'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log('PASS '+lang+' activity, destination, eight features and testimonial translations');
 }
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
