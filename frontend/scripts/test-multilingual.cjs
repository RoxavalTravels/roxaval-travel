// Run with PLAYWRIGHT_CORE_PATH pointing to an installed playwright-core package.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../backend-php/resources/multilingual-pages.json')));
const tour = { _id:'1',slug:'test-tour',name:'Test tour',description:'A private Sri Lanka journey.',category:'Scenic',tourType:'Private',heroImage:'/f1dc4405-8788-4026-86f6-8dcd6433d54c.jpg',gallery:[],destinations:[],activities:[],hotels:[],itinerary:[],includedServices:[],excludedServices:[],highlights:[],durationDays:14,durationNights:13,price:1000,currency:'USD',minTravelers:1,maxTravelers:6,rating:0,reviewsCount:0,showPrice:false };
for (const [locale,slug] of [['en','sri-lanka-tour-14-days'],['de','sri-lanka-rundreise-14-tage'],['fr','circuit-sri-lanka-14-jours']]) rows.push({pageKey:'/packages/test-tour',locale,slug,metaTitle:`Tour ${locale}`,metaDescription:`Description ${locale}`,h1:`Heading ${locale}`,imageAlt:`Image ${locale}`});
const server = http.createServer((req,res) => {
  const filename = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  const file = filename.startsWith(root + path.sep) && fs.existsSync(filename) && fs.statSync(filename).isFile() ? filename : path.join(root,'index.html');
  res.setHeader('Content-Type', ({'.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)] || 'text/html');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(4179,'127.0.0.1',resolve));
  const browser = await chromium.launch({ headless:true, ...(process.env.CHROMIUM_PATH ? { executablePath:process.env.CHROMIUM_PATH } : {}) });
  try {
    const context = await browser.newContext();
    let signedIn = false;
    let inquiry;
    let savedTranslation;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.includes('/api/v1/')) {
        const apiPath = url.pathname.split('/api/v1')[1];
        if (apiPath === '/hotels/admin/all') {
          const current = Number(url.searchParams.get('page') || 1);
          const hotels = Array.from({length:181}, (_, i) => ({_id:String(i+1), name:`Hotel ${i+1}`,status:i===180?'inactive':'active'}));
          return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:hotels.slice((current-1)*100,current*100),meta:{total:181,page:current,limit:100,totalPages:2}})});
        }
        if (apiPath === '/auth/me' && signedIn) return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{user:{_id:'1',fullName:'Test Admin',email:'admin@example.test',role:'superadmin'}}})});
        if (apiPath === '/custom-tours' && route.request().method() === 'POST') inquiry = route.request().postDataJSON();
        if (apiPath === '/translations/pages' && route.request().method() === 'PATCH') {
          savedTranslation = route.request().postDataJSON();
          Object.assign(rows.find(row => row.pageKey === savedTranslation.pageKey && row.locale === savedTranslation.locale), savedTranslation);
        }
        const auth = apiPath.startsWith('/auth/');
        return route.fulfill({ status:auth?401:200, contentType:'application/json', body:JSON.stringify({success:!auth,data:apiPath.startsWith('/translations/pages')?rows:apiPath==='/packages/slug/test-tour'?tour:[],meta:{total:0,totalPages:0,page:1,limit:12}}) });
      }
      if (url.hostname !== '127.0.0.1') return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:4179/de/sri-lanka-rundreise-14-tage/?gclid=first-ad#details');
    await page.locator('dialog[open]').waitFor();
    await page.getByRole('heading',{name:'Heading de'}).waitFor();
    await page.getByRole('link',{name:'English',exact:true}).click();
    await page.waitForURL('**/en/sri-lanka-tour-14-days/?gclid=first-ad#details');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.evaluate(()=>localStorage.clear());
    await page.goto('http://127.0.0.1:4179/');
    await page.locator('dialog[open]').waitFor();
    await page.getByRole('link',{name:'Deutsch',exact:true}).click();
    await page.waitForURL('**/de/');
    await page.waitForFunction(()=>document.documentElement.lang==='de');
    assert.equal(await page.locator('dialog[open]').count(),0);
    await page.goto('http://127.0.0.1:4179/');
    await page.waitForURL('**/de/');
    await page.goto('http://127.0.0.1:4179/fr/circuits-sri-lanka/?gclid=test');
    await page.waitForFunction(()=>document.documentElement.lang==='fr');
    await page.locator('h1').waitFor();
    assert.match(page.url(),/\/fr\/circuits-sri-lanka\/\?gclid=test$/);
    assert.equal(await page.locator('dialog[open]').count(),0);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://www.roxavaltravels.com/fr/circuits-sri-lanka/');
    assert.equal(await page.locator('link[hreflang=de]').getAttribute('href'),'https://www.roxavaltravels.com/de/sri-lanka-rundreisen/');
    await page.locator('nav').getByRole('button',{name:/langue|language|Sprache/i}).click();
    await page.getByRole('button',{name:'Deutsch',exact:true}).click();
    await page.waitForURL('**/de/sri-lanka-rundreisen/?gclid=test');
    await page.locator('h1').waitFor();
    const home = page.locator('nav a[href="/de/"]').first();
    await home.click();
    await page.waitForURL('**/de/');
    await page.goBack();
    await page.waitForURL('**/de/sri-lanka-rundreisen/?gclid=test');
    await page.goto('http://127.0.0.1:4179/de/sri-lanka-rundreise-14-tage/?gclid=landing');
    await page.getByRole('heading',{name:'Heading de'}).waitFor();
    assert.equal(await page.title(),'Tour de');
    assert.equal(await page.getByAltText('Image de').count(),1);
    await page.locator('nav').getByRole('button',{name:/langue|language|Sprache/i}).click();
    await page.getByRole('button',{name:'Français',exact:true}).click();
    await page.waitForURL('**/fr/circuit-sri-lanka-14-jours/?gclid=landing');
    await page.getByRole('heading',{name:'Heading fr'}).waitFor();
    assert.equal(await page.title(),'Tour fr');
    for (const width of [375,768,1440]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(()=>localStorage.clear());
      await page.goto('http://127.0.0.1:4179/');
      await page.locator('dialog[open]').waitFor();
      const box=await page.locator('dialog').boundingBox();
      assert.ok(box.width<=width && box.x>=0,'Modal fits viewport');
      await page.screenshot({path:path.resolve(__dirname,`../../backups/language-popup-${width}.png`)});
    }
    await page.getByRole('link',{name:'English',exact:true}).click();
    await page.waitForURL('**/en/');
    await page.setViewportSize({width:375,height:900});
    await page.locator('nav button[aria-expanded]').last().click();
    await page.getByRole('button',{name:'Change language',exact:true}).click();
    await page.getByRole('button',{name:'Deutsch',exact:true}).click();
    await page.waitForURL('**/de/');
    signedIn = true;
    await page.goto('http://127.0.0.1:4179/admin/packages/new');
    await page.getByText('Hotel 181 (inactive)',{exact:true}).first().waitFor();
    assert.equal(await page.getByText('Hotel 101',{exact:true}).count()>0,true);
    await page.goto('http://127.0.0.1:4179/admin/custom-requests/new');
    await page.locator('option[value="Solo"]').waitFor({state:'attached'});
    for (const style of ['Solo','Discovery','Romantic','Wildlife','Nature','Wellness','Scenic']) assert.ok(await page.locator(`option[value="${style}"]`).count());
    await page.setViewportSize({width:1440,height:1000});
    await page.goto('http://127.0.0.1:4179/de/sri-lanka-rundreisen/#custom-tour');
    const wizard = page.locator('#custom-tour');
    await wizard.getByRole('heading',{name:'Gestalten Sie Ihre Traumreise'}).waitFor();
    await wizard.getByPlaceholder('dd/mm/yyyy').fill('15/12/2026');
    for (let step=0;step<3;step++) await wizard.getByRole('button',{name:'Nächster Schritt',exact:true}).click();
    await wizard.getByRole('button',{name:'Nur Frühstück',exact:true}).click();
    await wizard.locator('select').selectOption('Double');
    for (let step=0;step<2;step++) await wizard.getByRole('button',{name:'Nächster Schritt',exact:true}).click();
    await wizard.getByRole('button',{name:'Anfrage senden',exact:true}).click();
    await page.getByRole('heading',{name:'Anfrage erfolgreich gesendet!'}).waitFor();
    assert.equal(inquiry.hotelCategory,'Standard');
    assert.equal(inquiry.roomTypePreference,'Double');
    assert.deepEqual(inquiry.mealPreferences,['Breakfast Only']);
    await page.goto('http://127.0.0.1:4179/admin/translations');
    await page.getByRole('heading',{name:'Languages & SEO',exact:true}).waitFor();
    await page.getByLabel('Language',{exact:true}).selectOption('de');
    await page.locator('main input').first().fill('Admin edited title');
    await page.getByRole('button',{name:'Save translation',exact:true}).click();
    await page.getByText('Saved. Open the page preview to review your changes.').waitFor();
    assert.equal(savedTranslation.locale,'de');
    assert.equal(savedTranslation.metaTitle,'Admin edited title');
    assert.equal(savedTranslation.pageKey,'/');
    await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage disabled');}}));
    await page.goto('http://127.0.0.1:4179/');
    await page.locator('dialog[open]').waitFor();
    await page.getByRole('link',{name:'English',exact:true}).click();
    await page.waitForURL('**/en/');
    assert.equal(await page.locator('dialog[open]').count(),0);
    assert.deepEqual(errors,[]);
    console.log('Passed: preference and storage denial, direct ads URLs, equivalent tour slugs, H1/alt/SEO, desktop/mobile switching, navigation/back, responsive modal, German enquiry submission with unchanged API enums, admin SEO save; no browser errors.');
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
