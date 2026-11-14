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
        const body=[];response.on('data',chunk=>body.push(chunk));response.on('end',()=>{if(!res.destroyed){res.writeHead(response.statusCode,response.headers);res.end(Buffer.concat(body));}resolve();});response.on('error',resolve);
      });
      upstream.setTimeout(20000,()=>upstream.destroy(new Error('Local PHP response timeout')));upstream.on('error',error=>{res.writeHead(502);res.end(error.message);resolve();});upstream.end(Buffer.concat(chunks));
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


  function mailCode(email){const messages=fs.readFileSync(path.join(scratch,'mailbox.jsonl'),'utf8').trim().split('\n').map(JSON.parse);return messages.filter(m=>m.to===email).at(-1).text.match(/\b([0-9]{6})\b/)[1];}
  const address='email-code-guest@example.test';
  for(const lang of ['en','de','fr']){
    await page.setViewportSize({width:lang==='en'?1440:375,height:900});
    await page.goto(base+'/'+lang+'/auth/');await page.locator('[name=fullName]').waitFor();
    assert.equal(await page.locator('main form input:visible').count(),3);
    assert.equal(await page.locator('input[type=password]').count(),0);
    assert.equal(await page.locator('main h1').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.goto(base+'/en/auth/');
  await page.locator('main form button[type=submit], main form button:not([type])').click();
  assert.equal(await page.locator('[name=fullName]').evaluate(e=>e.validity.valueMissing),true);
  await page.locator('[name=fullName]').fill('1234');
  await page.locator('[name=email]').fill(address);
  await page.locator('[name=phone]').fill('+94 77 123 4567');
  await page.getByRole('button',{name:'Send email code',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Enter your name'}).waitFor();
  await page.locator('[name=fullName]').fill('Email Code Guest');
  await page.locator('[name=phone]').fill('0771234567');
  await page.getByRole('button',{name:'Send email code',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'international mobile'}).waitFor();
  await page.locator('[name=phone]').fill('+94 77 123 4567');
  const sent=page.waitForResponse(r=>r.url().includes('/auth/customer-code?')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Send email code',exact:true}).click();
  const response=await sent;assert.equal(response.status(),200);
  const challenge=(await response.json()).data.challengeId;
  await page.locator('[name=code]').waitFor();
  assert.equal((await context.request.get(base+'/api/v1/auth/me')).status(),401);
  assert.equal(await page.getByRole('button',{name:/Resend available/}).isDisabled(),true);
  await page.locator('[name=code]').fill('000000');
  await page.getByRole('button',{name:'Verify and sign in',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'invalid, expired'}).waitFor();
  const code=mailCode(address);
  await page.locator('[name=code]').fill(code);
  await page.getByRole('button',{name:'Verify and sign in',exact:true}).click();
  await page.waitForURL(url=>!url.pathname.includes('/auth'));
  const me=(await (await context.request.get(base+'/api/v1/auth/me')).json()).data.user;
  assert.equal(me.email,address);assert.equal(me.role,'customer');assert.equal(me.emailVerified,true);assert.equal(me.phone,'+94771234567');
  assert.equal((await context.request.post(base+'/api/v1/auth/customer-code/verify',{data:{challengeId:challenge,code}})).status(),400);
  assert.equal((await context.request.get(base+'/api/v1/reviews/admin/all')).status(),403);
  console.log('PASS three-field multilingual form, validation, real email-code sign-in and replay protection');
  const bookingResponse=await context.request.post(base+'/api/v1/bookings/from-package',{data:{tourPackage:fixture.package._id,travelDate:'2026-12-20',travelers:{adults:1,children:0},expectedCurrency:'USD',expectedUnitPrice:900.01}});
  assert.equal(bookingResponse.status(),201);
  const bookingId=(await bookingResponse.json()).data._id;
  // A fresh code after the DB resend cooldown, using the same existing account.
  await page.waitForTimeout(1000);
  const adjust=spawnSync(php,['-r',"$app=require 'tests/Browser/bootstrap.php';$app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap();Illuminate\\Support\\Facades\\DB::table('customer_login_codes')->update(['requested_at'=>now()->subMinutes(2)]);"],{cwd:path.join(root,'backend-php'),env,encoding:'utf8'});assert.equal(adjust.status,0,adjust.stderr);
  await context.request.post(base+'/api/v1/auth/logout');
  await page.goto(base+'/en/auth/');
  await page.locator('[name=fullName]').fill('Do Not Overwrite');
  await page.locator('[name=email]').fill(address);
  await page.locator('[name=phone]').fill('+33123456789');
  await page.getByRole('button',{name:'Send email code',exact:true}).click();await page.locator('[name=code]').waitFor();
  await page.locator('[name=code]').fill(mailCode(address));await page.getByRole('button',{name:'Verify and sign in',exact:true}).click();await page.waitForURL(url=>!url.pathname.includes('/auth'));
  const existing=(await (await context.request.get(base+'/api/v1/auth/me')).json()).data.user;assert.equal(existing._id,me._id);assert.equal(existing.fullName,'Email Code Guest');assert.equal(existing.phone,me.phone);
  const mine=(await (await context.request.get(base+'/api/v1/bookings/my-bookings')).json()).data;assert.ok(mine.some(b=>b._id===bookingId));
  console.log('PASS returning customer retains profile and booking access');
  await context.request.post(base+'/api/v1/auth/logout');await page.goto(base+'/admin/login');await page.locator('input[type=email]').fill('browser-admin@example.test');await page.locator('input[type=password]').fill('LocalBrowserTest123!');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/admin/dashboard');
  assert.equal((await context.request.get(base+'/api/v1/reviews/admin/all')).status(),200);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(scratch,'customer-code-result.json'),JSON.stringify({passed:true,errors},null,2));
  console.log('PASS admin password login unchanged; local email-code integration: '+scratch);
})().catch(error=>{console.error(error.message?.split('Call log:')[0]);console.error(error.stack?.split('\n').filter(x=>x.includes('.cjs:')).join('\n'));process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();gateway.closeAllConnections();gateway.close();server.kill();fs.closeSync(log);});
