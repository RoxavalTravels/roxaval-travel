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
    res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.avif':'image/avif','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(filename)]||'application/octet-stream');fs.createReadStream(filename).pipe(res);return;
  }
  const chunks=[];req.on('data',chunk=>chunks.push(chunk));req.on('end',()=>{
    queue=queue.then(()=>new Promise(resolve=>{
      const upstream=http.request({hostname:'127.0.0.1',port:4191,path:req.url,method:req.method,agent:false,headers:{...req.headers,connection:'close'}},response=>{
        const body=[]; response.on('data',chunk=>body.push(chunk)); response.on('end',()=>{if(!res.destroyed){res.writeHead(response.statusCode,response.headers);res.end(Buffer.concat(body));}resolve();});response.on('close',resolve);response.on('error',resolve);
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
  if (process.env.SEO_VISUAL_ONLY === '1') {
    await require('./test-seo-visual.cjs')({browser,base,scratch});
    return;
  }
  if (process.env.SEO_REVIEW_ONLY === '1') {
    await require('./review-seo-candidate.cjs')({browser,base,scratch});
    return;
  }
  const context = await browser.newContext(); context.setDefaultTimeout(45000);
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.addInitScript(()=>{try{localStorage.setItem('roxaval_lang','en')}catch{}});
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const page = await context.newPage();
  await page.goto(base+'/admin/login');
  await page.locator('input[type=email]').fill('browser-admin@example.test');
  await page.locator('input[type=password]').fill('LocalBrowserTest123!');
  await page.getByRole('button',{name:'Sign In',exact:true}).click();
  await page.waitForURL('**/admin/dashboard');
  assert.equal((await context.request.get(base+'/api/v1/auth/me')).status(),200,'Real login cookie authenticates requests');
  console.log('PASS real admin login and authenticated dashboard');

  if(process.env.SEO_ONLY!=='1') {
  await page.goto(base+'/admin/custom-requests/'+fixture.quoteRequest);
  const field = (name, input='input') => page.locator('div').filter({has:page.locator('label').filter({hasText:new RegExp('^'+name+'$')})}).filter({has:page.locator(input)}).last().locator(input).first();
  const vehicleField=field('Vehicle','select');
  await vehicleField.locator('option[value="'+fixture.vehicle+'"]').waitFor({state:'attached'});
  await vehicleField.selectOption(fixture.vehicle);
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('label')).find(l=>l.textContent==='Base Price')?.parentElement.querySelector('input')?.value==='75');
  assert.equal(await field('Total Price').inputValue(),'75');
  await field('Markup \\(\\$\\)').fill('20');
  await field('Discount').fill('5');
  assert.equal(await field('Total Price').inputValue(),'90');
  await vehicleField.selectOption('');assert.equal(await field('Total Price').inputValue(),'15');
  await vehicleField.selectOption(fixture.vehicle);assert.equal(await field('Total Price').inputValue(),'90');
  await page.getByRole('button',{name:'Add Day',exact:true}).click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('label')).find(l=>l.textContent==='Total Price')?.parentElement.querySelector('input')?.value==='165');
  await page.getByTitle('Remove this day',{exact:true}).last().click();
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('label')).find(l=>l.textContent==='Total Price')?.parentElement.querySelector('input')?.value==='90');
  await page.getByText(/Day 1.*untitled/).click();
  await page.getByRole('button',{name:'Add Transfer',exact:true}).first().click();
  await page.getByRole('row').filter({hasText:'Test Transfer'}).getByRole('button',{name:'Select',exact:true}).click();
  await page.getByText('Total: USD 40',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Add Transfer',exact:true}).last().click();
  await page.getByRole('button',{name:'Use this amount',exact:true}).click();
  assert.equal(await field('Total Price').inputValue(),'130');
  const draftSaved=page.waitForResponse(r=>r.url().includes('/itinerary/draft')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Save',exact:true}).last().click();assert.equal((await draftSaved).status(),200);
  await page.reload();await vehicleField.locator('option[value="'+fixture.vehicle+'"]').waitFor({state:'attached'});
  assert.equal(await field('Total Price').inputValue(),'130','Reload must not add vehicle twice');
  const savedQuote=await(await context.request.get(base+'/api/v1/custom-tours/'+fixture.quoteRequest)).json();
  assert.equal(savedQuote.data.itinerary.pricing.basePrice,115);assert.equal(savedQuote.data.itinerary.pricing.totalPrice,130);
  console.log('PASS real quotation vehicle addition/removal, markup/discount, draft persistence and reload without double counting');
  const anonymous=await browser.newContext();
  const publicVehicles=await(await anonymous.request.get(base+'/api/v1/vehicles')).json();
  assert.equal(publicVehicles.data[0].pricePerDay,undefined,'Supplier rates remain private');
  assert.equal((await anonymous.request.get(base+'/api/v1/vehicles/admin/all')).status(),401);
  await anonymous.close();
  // Existing quotations may have a legacy primary hotel without hotelOptions.
  // A row's remove button must target its own day, even when no picker is open.
  const activityId=(await(await context.request.get(base+'/api/v1/activities')).json()).data[0]._id;
  const removalDay={dayNumber:1,title:{en:'Removal regression'},hotel:fixture.hotels.Amaya,roomType:'Double',roomCost:100,activities:[activityId],activityPricing:[{activity:activityId,adultCount:2,childCount:0,infantCount:0,cost:30,selected:true}],meals:[]};
  const removalPayload={title:'Removal regression',days:[removalDay,{...removalDay,dayNumber:2}],pricing:{basePrice:260,totalPrice:260,currency:'USD'}};
  assert.equal((await context.request.post(base+'/api/v1/custom-tours/'+fixture.quoteRequest+'/itinerary/draft',{data:removalPayload,headers:{Origin:base,'X-Roxaval-Request':'1'}})).status(),200);
  await page.reload();
  await page.getByRole('button',{name:/Day 1.*Removal regression/}).click();
  await page.getByRole('button',{name:'Remove hotel option 1 from day 1',exact:true}).click();
  await page.getByRole('button',{name:/Remove activity .* from day 1/}).click();
  await page.getByRole('button',{name:'Use this amount',exact:true}).click();
  assert.equal(await field('Total Price').inputValue(),'130');
  const removedSaved=page.waitForResponse(r=>r.url().includes('/itinerary/draft')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Save',exact:true}).last().click();assert.equal((await removedSaved).status(),200);
  await page.reload();
  const removedQuote=(await(await context.request.get(base+'/api/v1/custom-tours/'+fixture.quoteRequest)).json()).data.itinerary;
  assert.ok(!removedQuote.days[0].hotel);
  assert.equal(removedQuote.days[0].hotelOptions.length,0);
  assert.equal((removedQuote.days[0].activityIds || []).length,0);
  assert.equal(removedQuote.days[0].activityPricing.length,0);
  assert.equal(removedQuote.days[1].hotel._id,fixture.hotels.Amaya);
  assert.equal(removedQuote.days[1].activityPricing.length,1);
  assert.equal(removedQuote.days[1].activityIds.length,1);
  console.log('PASS legacy hotel and activity removal persists after reload and leaves the other day intact');
  await page.getByRole('button',{name:'Copy to New Customer',exact:true}).click();
  // The existing builder may have normalized legacy fields after loading.
  // Explicitly discard those unsaved edits: duplication uses the saved source.
  const discardForCopy=page.getByRole('button',{name:'Discard & Go Back',exact:true});
  await discardForCopy.waitFor({state:'visible',timeout:2000}).then(()=>discardForCopy.click()).catch(()=>{});
  await page.waitForURL('**/admin/custom-requests/new?copyFrom=*');
  await page.getByRole('button',{name:'+ New Customer',exact:true}).click();
  await field('Full Name.*').fill('Copied Quotation Guest');
  await field('Email.*').fill('copied-quotation@example.test');
  await field('From Date.*').fill('2027-02-01');
  await field('To Date.*').fill('2027-02-02');
  await field('Adults.*').fill('4');
  const copyResponse=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/copy')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'Create Draft Copy',exact:true}).click();
  const copiedResponse=await copyResponse;
  assert.equal(copiedResponse.status(),201);
  const copiedId=(await copiedResponse.json()).data._id;
  await page.waitForURL('**/admin/custom-requests/'+copiedId);
  const copied=(await(await context.request.get(base+'/api/v1/custom-tours/'+copiedId)).json()).data;
  assert.equal(copied.customer.user.email,'copied-quotation@example.test');
  assert.equal(copied.itinerary.status,'Draft');
  assert.equal(copied.itinerary.pricing.totalPrice,0);
  assert.equal(copied.itinerary.days.length,2);
  assert.notEqual(copied.itinerary._id,removedQuote._id);
  assert.equal(copied.itinerary.days[1].hotel._id,fixture.hotels.Amaya);
  console.log('PASS Copy to New Customer UI creates an independent draft with new dates, customer and zero final price');
  if(process.env.QUOTATION_ONLY==='1') {
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(scratch,'result.json'),JSON.stringify({passed:true,checks:['vehicle addition/removal','day count changes','transfer cost','markup/discount','draft persistence and reload','private rates','legacy hotel and activity removal','other day selections preserved','copy to new customer'],errors},null,2));
    console.log('PASS quotation integration; artifacts: '+scratch);return;
  }

  }
  await page.goto(base+'/admin/settings');
  await page.getByLabel('USD to EUR').fill('0.85');
  await page.getByRole('button',{name:'Save Settings',exact:true}).click();
  await page.getByText('Settings saved.',{exact:true}).waitFor();
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('[aria-label="USD to EUR"]')?.value==='0.85');
  const visitor = await context.newPage();
  const publicTranslationRequests=[];
  visitor.on('request',request=>{if(request.url().includes('/translations/pages'))publicTranslationRequests.push(request.url());});
  const expected = {
    en:{price:'US$900.01',activity:'Wildlife Safari',meals:'Breakfast, Lunch, Dinner',day:'Arrival',included:'Guide included',excluded:'Flights excluded'},
    de:{price:'765,01',activity:'Wildtiersafari',meals:'Frühstück, Mittagessen, Abendessen',day:'Ankunft',included:'Reiseleitung inklusive',excluded:'Flüge nicht inbegriffen'},
    fr:{price:'765,01',activity:'Safari animalier',meals:'Petit-déjeuner, Déjeuner, Dîner',day:'Arrivée',included:'Guide inclus',excluded:'Vols non inclus'},
  };
  const identity='/packages/'+fixture.package.slug;
  for (const locale of ['en','de','fr']) {
    await page.goto(base+'/admin/translations?page='+encodeURIComponent(identity)+'&locale='+locale);
    await page.getByLabel('Meta title',{exact:true}).fill('Saved title '+locale);
    await page.getByLabel('Meta description',{exact:true}).fill('Saved description '+locale);
    await page.getByLabel('Keywords (comma-separated)',{exact:true}).fill('Sri Lanka, test '+locale);
    await page.getByRole('button',{name:'Save SEO changes',exact:true}).click();
    await page.getByText('Saved. Open the page preview to review your changes.',{exact:true}).waitFor();
    await page.reload();
    await page.waitForFunction(value=>[...document.querySelectorAll('input')].some(i=>i.value===value),'Saved title '+locale);
    assert.equal(await page.getByLabel('Meta description',{exact:true}).inputValue(),'Saved description '+locale);
    assert.equal(await page.getByLabel('Language',{exact:true}).inputValue(),locale);
    const url=base+'/'+locale+identity+'/';
    const raw=await context.request.get(url); assert.equal(raw.status(),200);
    const html=await raw.text();
    assert.ok(html.includes('<title data-rh="true">Saved title '+locale+'</title>'));
    assert.ok(html.includes('name="description" content="Saved description '+locale+'"'));
    assert.ok(html.includes('name="keywords" content="Sri Lanka, test '+locale+'"'));
    assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
    assert.equal((html.match(/hreflang=/g)||[]).length,4);
    assert.equal((html.match(/<h1\b/g)||[]).length,1,'Initial HTML contains a real H1');
    const bootstrap=JSON.parse(html.match(/<script id="roxaval-translations" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(bootstrap.version,2);assert.equal(bootstrap.pages.length,1);assert.equal(bootstrap.pages[0].locale,locale);
    await visitor.goto(url);
    await visitor.getByText(expected[locale].meals,{exact:false}).waitFor();
    assert.equal(await visitor.title(),'Saved title '+locale);
    assert.equal(await visitor.locator('meta[name=description]').getAttribute('content'),'Saved description '+locale);
    assert.equal(await visitor.locator('meta[name=keywords]').getAttribute('content'),'Sri Lanka, test '+locale);
    await visitor.getByText(expected[locale].activity,{exact:true}).first().waitFor();
    await visitor.getByText(expected[locale].included,{exact:true}).waitFor();
    await visitor.getByText(expected[locale].excluded,{exact:true}).waitFor();
    const priceText=await visitor.locator('aside').innerText(); assert.ok(priceText.includes(expected[locale].price),priceText);
    assert.ok(locale==='en' ? priceText.includes('$') : priceText.includes('€'));
    assert.equal(await visitor.locator('#package-reviews-title').count(),1);
    const list=await(await context.request.get(base+'/api/v1/packages?lang='+locale)).json();
    const pkg=list.data.find(p=>p._id===fixture.package._id);
    assert.equal(pkg.currency,locale==='en'?'USD':'EUR'); assert.equal(pkg.discountPrice,locale==='en'?900.01:765.01);
    await visitor.goto(base+'/'+locale+'/');
    await visitor.locator('#packages article').first().waitFor();
    assert.ok((await visitor.locator('#packages').innerText()).includes(expected[locale].price));
    const listingPath={en:'/en/sri-lanka-tours/',de:'/de/sri-lanka-rundreisen/',fr:'/fr/circuits-sri-lanka/'}[locale];
    await visitor.locator('a[href="'+listingPath+'"]').first().click();
    await visitor.waitForURL('**'+listingPath);
    await visitor.waitForFunction(path=>document.querySelector('link[rel=canonical]')?.getAttribute('href')?.endsWith(path),listingPath);
    try { await visitor.waitForFunction(()=>document.querySelectorAll('link[hreflang]').length===4,{},{timeout:10000}); }
    catch(error){fs.writeFileSync(path.join(scratch,'failed-seo-head.html'),await visitor.locator('head').innerHTML());throw error;}
    assert.equal(await visitor.locator('link[hreflang]').count(),4);
    console.log('PASS '+locale+' real SEO persistence, source/head, package translations and card/detail money');
  }
  assert.ok(publicTranslationRequests.some(url=>new URL(url).searchParams.has('pageKey')),'SPA navigation loads page metadata on demand');
  assert.ok(publicTranslationRequests.every(url=>new URL(url).searchParams.has('pageKey')||new URL(url).searchParams.get('view')==='routes'),'Public browser never requests the full page registry');

  await page.goto(base+'/admin/reviews');
  await page.getByRole('button',{name:'Add package review',exact:true}).click();
  await page.getByLabel('Package',{exact:true}).selectOption(fixture.package._id);
  await page.getByLabel('Reviewer name').fill('Package Test Guest');
  await page.locator('select[name=rating]').selectOption('4');
  await page.getByLabel('Review',{exact:true}).fill('Feedback for the specific test package');
  const createdPromise=page.waitForResponse(r=>r.url().endsWith('/reviews/admin?lang=en') && r.request().method()==='POST');
  await page.getByRole('button',{name:'Save pending review',exact:true}).click();
  const createdResponse=await createdPromise; assert.equal(createdResponse.status(),201); const review=(await createdResponse.json()).data;
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).click();
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).waitFor({state:'detached'});
  await visitor.goto(base+'/en'+identity+'/');
  await visitor.getByText('Feedback for the specific test package',{exact:true}).waitFor();
  assert.equal(await visitor.getByText('Unrelated package feedback',{exact:true}).count(),0);
  assert.equal(await visitor.locator('section[aria-labelledby=package-reviews-title] time').count(),1);
  let data=await(await context.request.get(base+'/api/v1/packages/slug/'+fixture.package.slug)).json();
  assert.equal(data.data.rating,4); assert.equal(data.data.reviewsCount,1);
  await page.getByRole('button',{name:'Edit review '+review._id,exact:true}).click();
  await page.locator('select[name=rating]').selectOption('3');
  await page.getByLabel('Review',{exact:true}).fill('Corrected guest feedback');
  await page.getByRole('button',{name:'Save pending review',exact:true}).click();
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).click();
  await page.getByRole('button',{name:'Approve review '+review._id,exact:true}).waitFor({state:'detached'});
  const assigned=page.waitForResponse(r=>r.url().includes('/reviews/'+review._id+'/package') && r.request().method()==='PATCH');
  await page.getByLabel('Package for review '+review._id,{exact:true}).selectOption(fixture.other._id);
  assert.equal((await assigned).status(),200);
  await visitor.goto(base+'/en'+identity+'/');
  await visitor.getByText('No reviews yet',{exact:true}).waitFor();
  await visitor.goto(base+'/en/packages/'+fixture.other.slug+'/');
  await visitor.getByText('Corrected guest feedback',{exact:true}).waitFor();
  data=await(await context.request.get(base+'/api/v1/packages/slug/'+fixture.other.slug)).json();
  assert.equal(data.data.rating,4); assert.equal(data.data.reviewsCount,2);
  console.log('PASS real review creation, approval, editing, assignment, package isolation, dates and recalculated ratings');

  const ids=[];for(let p=1;p<=3;p++) {const response=await context.request.get(base+'/api/v1/hotels/admin/all?sort=name&limit=100&page='+p);assert.equal(response.status(),200);const body=await response.json();ids.push(...body.data.map(h=>h._id));}
  assert.equal(ids.length,201);assert.equal(new Set(ids).size,201);assert.equal(ids[0],fixture.hotels.Amaya);
  await page.goto(base+'/admin/packages/new');
  await page.getByLabel('Amaya',{exact:true}).waitFor();
  const labels=await page.locator('label').filter({has:page.locator('input[type=checkbox]')}).allTextContents();
  const names=labels.filter(label=>Object.keys(fixture.hotels).includes(label.trim())).map(s=>s.trim());
  assert.equal(names.length,201);assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base',numeric:true})));
  await page.getByLabel('Amaya',{exact:true}).check();assert.equal(await page.getByLabel('Amaya',{exact:true}).isChecked(),true);
  console.log('PASS real 201-hotel API pagination, global alphabetical order and selection');
  const customerContext=await browser.newContext();customerContext.setDefaultTimeout(15000);
  await customerContext.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await customerContext.addInitScript(()=>{try{localStorage.setItem('roxaval_lang','en')}catch{}});
  const customerPage=await customerContext.newPage();customerPage.on('pageerror',e=>errors.push(e.message));
  await customerPage.goto(base+'/en/auth/');
  await customerPage.getByRole('button',{name:'Register',exact:true}).click();
  await customerPage.locator('[name=fullName]').fill('Browser Test Customer');
  await customerPage.locator('[name=email]').fill('browser-customer@example.test');
  await customerPage.locator('[name=phone]').fill('+94771234567');
  await customerPage.locator('[name=password]').fill('LocalCustomerTest123!');
  const verified=customerPage.waitForResponse(r=>r.url().includes('/auth/register')&&r.request().method()==='POST');
  await customerPage.getByRole('button',{name:'Create Account',exact:true}).click();
  assert.equal((await verified).status(),200);
  await customerPage.goto(base+'/de'+identity+'/');
  await customerPage.locator('aside button').click();
  await customerPage.getByPlaceholder('dd/mm/yyyy',{exact:true}).fill('20/12/2026');
  await customerPage.locator('input[type=number]').nth(0).fill('2');
  await customerPage.locator('input[type=number]').nth(1).fill('2');
  await customerPage.getByText(/2\.295,04\s*€/).waitFor();
  const booked=customerPage.waitForResponse(r=>r.url().includes('/bookings/from-package') && r.request().method()==='POST');
  await customerPage.getByRole('button',{name:'Buchung Bestätigen',exact:true}).click();
  const bookingResponse=await booked;assert.equal(bookingResponse.status(),201);
  const booking=(await bookingResponse.json()).data;
  assert.equal(booking.pricing.currency,'EUR');assert.equal(booking.pricing.totalAmount,2295.04);
  assert.equal(booking.pricing.advanceAmount,688.51,'30 percent advance rounded once');
  assert.equal(booking.pricing.balanceAmount,1606.53,'Balance is total minus advance');
  assert.equal(Math.round((booking.pricing.advanceAmount+booking.pricing.balanceAmount)*100),229504);
  const mine=await customerContext.request.get(base+'/api/v1/bookings/my-bookings');assert.equal(mine.status(),200);
  assert.ok((await mine.text()).includes('2295.04'));
  assert.equal((await customerContext.request.get(base+'/api/v1/notifications')).status(),200);
  await customerContext.close();
  console.log('PASS real customer password registration, rounded EUR booking and notifications');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(scratch,'result.json'),JSON.stringify({passed:true,checks:['real admin login','quotation pricing','legacy hotel and activity removal','other day selections preserved','copy to new customer','EUR settings','EN/DE/FR prices and translations','SEO DB/source/Helmet','review lifecycle','201 hotel pagination and selection','customer registration and booking'],errors},null,2));
  console.log('PASS full local browser integration; artifacts: '+scratch);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();gateway.closeAllConnections();gateway.close();server.kill();fs.closeSync(log);});
