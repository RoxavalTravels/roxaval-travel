// Real Laravel HTTP + scratch SQLite + real browser. No API response mocks.
// First build with VITE_API_URL=http://127.0.0.1:4190/api/v1 into backups/package-e2e-dist.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const http = require('node:http');
const root = path.resolve(__dirname, '../..'), base = 'http://127.0.0.1:4190';
const php = process.env.PHP_PATH || 'php';
const scratch = fs.mkdtempSync(path.join(root, 'backups/package-e2e-'));
const env = { ...process.env, ROXAVAL_E2E_DB: path.join(scratch, 'database.sqlite') };
const seed = spawnSync(php, ['tests/Browser/seed.php'], { cwd: path.join(root, 'backend-php'), env, encoding: 'utf8' });
if (seed.status !== 0) throw new Error(seed.stderr || seed.stdout);
let fixture;
try { fixture = JSON.parse(seed.stdout); } catch { throw new Error('Fixture setup failed: '+seed.stdout); }
const log = fs.openSync(path.join(scratch, 'server.log'), 'w');
const server = spawn(php, ['-S', '127.0.0.1:4191', 'tests/Browser/router.php'], { cwd: path.join(root, 'backend-php'), env, stdio: ['ignore', log, log], windowsHide: true });
// Keep Chromium's speculative connections away from PHP's single-thread Windows dev server.
// This is a transport proxy, not an API mock: every API/HTML response comes from Laravel.
let queue=Promise.resolve();
const gateway=http.createServer((req,res)=>{
  const dist=path.join(root,'backups/package-e2e-dist');
  const filename=path.resolve(dist,'.'+new URL(req.url,base).pathname);
  if(filename.startsWith(dist+path.sep) && fs.existsSync(filename) && fs.statSync(filename).isFile()) {
    res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(filename)]||'application/octet-stream');fs.createReadStream(filename).pipe(res);return;
  }
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{
    queue=queue.then(()=>new Promise(resolve=>{
      const upstream=http.request({hostname:'127.0.0.1',port:4191,path:req.url,method:req.method,agent:false,headers:{...req.headers,connection:'close'}},response=>{
        res.writeHead(response.statusCode,response.headers);response.pipe(res);response.on('end',resolve);response.on('close',resolve);response.on('error',resolve);res.on('close',()=>response.resume());if(res.destroyed)response.resume();
      });
      upstream.on('error',error=>{res.writeHead(502);res.end(error.message);resolve();});upstream.end(Buffer.concat(chunks));
    }));
  });
});
let browser;
(async () => {
  await new Promise(resolve=>gateway.listen(4190,'127.0.0.1',resolve));
  for (let i=0; i<50; i++) { try { if ((await fetch(base+'/api/v1/settings')).ok) break; } catch {} await new Promise(resolve=>setTimeout(resolve,200)); }
  browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH } : {}) });
  const context = await browser.newContext(); context.setDefaultTimeout(60000);
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.addInitScript(()=>{try{localStorage.setItem('roxaval_lang','en')}catch{/* External sandboxed map frames deny storage. */}});
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page = await context.newPage();

  const packagePath='/en/packages/'+fixture.package.slug+'/';
  await page.goto(base+packagePath);
  await page.locator('#write-review').waitFor();
  assert.equal(await page.locator('main h1').count(),1);
  assert.equal(await page.locator('main').innerText().then(t=>/0 reviews|0\.0 \(0\)/i.test(t)),false);
  await page.locator('[name=reviewerName]').fill('Unauthenticated guest');
  await page.locator('[name=rating]').selectOption('4');
  await page.locator('[name=text]').fill('Our private trip was thoughtfully arranged and our guide was excellent.');
  await page.getByRole('button',{name:'Submit for approval',exact:true}).click();
  await page.getByRole('status').filter({hasText:'submitted for approval'}).waitFor();
  const pending=await context.request.get(base+'/api/v1/reviews?tourPackage='+fixture.package._id);
  assert.equal((await pending.json()).meta.total,0);
  assert.equal((await context.request.get(base+'/api/v1/auth/me')).status(),401);
  console.log('PASS unauthenticated submission stays pending and private');
  await page.goto(base+'/admin/login');
  await page.locator('input[type=email]').fill('browser-admin@example.test');
  await page.locator('input[type=password]').fill('LocalBrowserTest123!');
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.waitForURL('**/admin/dashboard');await page.waitForLoadState('networkidle');console.log('PASS admin login');
  await page.getByRole('link',{name:'Reviews',exact:true}).click();await page.getByRole('heading',{name:'Reviews',exact:true}).waitFor();
  const all=(await (await context.request.get(base+'/api/v1/reviews/admin/all')).json()).data;
  const review=all.find(r=>r.reviewerName==='Unauthenticated guest');assert.ok(review);
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).click();
  await page.getByText('Review approved.',{exact:true}).waitFor();
  let pkg=(await (await context.request.get(base+'/api/v1/packages/slug/'+fixture.package.slug)).json()).data;
  assert.equal(pkg.reviewsCount,1);assert.equal(pkg.rating,4);
  const publicPage=await context.newPage();await publicPage.goto(base+packagePath);
  await publicPage.getByText('Unauthenticated guest',{exact:true}).waitFor();
  await publicPage.getByText('4.0 (1)',{exact:false}).waitFor();
  await page.getByRole('button',{name:'Reject review '+review._id,exact:true}).click();
  await page.getByText('Review rejected.',{exact:true}).waitFor();
  await publicPage.reload();await publicPage.locator('#write-review').waitFor();
  assert.equal(await publicPage.getByText('Unauthenticated guest',{exact:true}).count(),0);
  pkg=(await (await context.request.get(base+'/api/v1/packages/slug/'+fixture.package.slug)).json()).data;assert.equal(pkg.reviewsCount,0);assert.equal(pkg.rating,0);
  await page.getByRole('button',{name:'Edit review '+review._id,exact:true}).click();
  await page.locator('textarea[name=text]').fill('Edited genuine feedback retained for the correct tour.');
  await page.getByLabel('Package',{exact:true}).selectOption(fixture.other._id);
  await page.getByRole('button',{name:'Save pending review',exact:true}).click();
  await page.getByText('Review saved. Approve it to publish.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).click();
  await page.getByText('Review approved.',{exact:true}).waitFor();
  const stats=(await (await context.request.get(base+'/api/v1/packages/slug/'+fixture.other.slug)).json()).data;assert.equal(stats.reviewsCount,2);assert.equal(stats.rating,4.5);
  await page.getByRole('button',{name:'Delete review '+review._id,exact:true}).click();
  await page.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByText('Review deleted.',{exact:true}).waitFor();
  console.log('PASS real admin approval, rejection, editing, assignment, approved counts and deletion');
  const long='Explore the landscape with a local guide and enjoy time to discover this beautiful island. Visit ancient temples and learn about the history of this remarkable destination. Stop for a relaxed lunch and enjoy the local food with your family or friends. Spend the afternoon exploring the countryside and meeting people along the way. Return to your hotel in the evening with time to relax after a memorable day. Discover more of the island tomorrow at your own pace.';
  assert.equal((await context.request.patch(base+'/api/v1/packages/'+fixture.package._id,{data:{description:{en:long,de:long,fr:long}}})).status(),200);
  for(const lang of ['en','de','fr']){
    await publicPage.setViewportSize({width:lang==='de'?375:1440,height:900});
    await publicPage.goto(base+'/'+lang+'/');
    const section=publicPage.locator('section[aria-labelledby="private-tours-title"]');await section.waitFor();
    assert.equal(await publicPage.locator('main h1').count(),1);assert.equal(await section.locator('h2').count(),1);assert.equal(await section.locator('h3').count(),5);assert.equal(await section.locator('a').count(),4);
    for(const href of await section.locator('a').evaluateAll(a=>a.map(e=>e.getAttribute('href')))){assert.ok(href.startsWith('/'+lang+'/'),href);const r=await context.request.get(base+href.split('#')[0]);assert.equal(r.status(),200,href);}
    await publicPage.waitForTimeout(1000);if(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth)){await publicPage.screenshot({path:path.join(scratch,'overflow-'+lang+'.png')});console.log(await publicPage.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,70)}))));}assert.equal(await publicPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await publicPage.goto(base+'/'+lang+'/packages/'+fixture.package.slug+'/');await publicPage.locator('#write-review').waitFor();
    const blocks=await publicPage.locator('main .space-y-4.leading-relaxed > p').allTextContents();assert.ok(blocks.length>=3);assert.equal(blocks.slice(0,3).join(' '),long);
    assert.equal(await publicPage.locator('[name=reviewerName]').count(),1);
  }
  console.log('PASS multilingual private-tour content, mobile layout, headings, localized links and paragraph preservation');
  await publicPage.goto(base+'/en/sri-lanka-tours/');await publicPage.locator('article').first().waitFor();
  const emptyCard=publicPage.locator('article').filter({hasText:'Browser Tour'});assert.equal(await emptyCard.locator('.fill-gold').count(),0);
  const ratedCard=publicPage.locator('article').filter({hasText:'Other Tour'});assert.equal(await ratedCard.locator('.fill-gold').count(),1);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(scratch,'guest-review-result.json'),JSON.stringify({passed:true,errors},null,2));
  console.log('PASS guest review integration; artifacts: '+scratch);
})().catch(error=>{console.error(error.message?.split('Call log:')[0]);console.error(error.stack?.split('\n').filter(x=>x.includes('.cjs:')).join('\n'));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();gateway.closeAllConnections();gateway.close();server.kill();fs.closeSync(log);});
