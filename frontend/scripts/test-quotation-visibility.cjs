const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer((req,res) => {
  const candidate = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  const file = candidate.startsWith(root + path.sep) && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(root,'index.html');
  res.setHeader('Content-Type', ({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.jpg':'image/jpeg'})[path.extname(file)] || 'text/html');
  res.end(fs.readFileSync(file));
});
let browser;
(async()=>{
  await new Promise(resolve=>server.listen(4187,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('roxaval_lang','en'));
  let showPrice=false; const tiles=[];
  await context.route('**/*', route=>{
    const u=new URL(route.request().url());
    const respond=data=>route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data})});
    if(u.pathname.includes('/api/v1/')) {
      if(u.pathname.endsWith('/auth/me')) return respond({user:{_id:'1',role:'superadmin',fullName:'Test Admin'}});
      if(u.pathname.endsWith('/custom-tours/1')) return respond({referenceNumber:'TEST-QUOTE',travelDates:{startDate:'2026-12-01',endDate:'2026-12-03'},travelers:{adults:2,children:0,infants:0},itinerary:{title:'Visibility test',days:[{dayNumber:1,title:'Sigiriya to Kandy',destinations:[{_id:'d1',name:'Kandy',mapLocation:{lat:7.29,lng:80.63}}]}],pricing:{basePrice:1234.56,discount:0,totalPrice:1234.56,currency:'USD',pricePerPerson:false,showPrice}}});
      return respond(u.pathname.includes('/translations/')?[]:{});
    }
    if(u.hostname==='tile.openstreetmap.org') {tiles.push(u.href);return route.abort();}
    if(u.hostname!=='127.0.0.1') return route.abort();
    return route.continue();
  });
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  for(const visible of [false,true]) {
    showPrice=visible;
    await page.goto('http://127.0.0.1:4187/admin/custom-requests/1/quotation');
    await page.getByText('Visibility test',{exact:true}).waitFor();
    await page.getByText('Day 01 (Sigiriya to Kandy)',{exact:true}).waitFor();
    for(const media of ['screen','print']) {
      await page.emulateMedia({media});
      assert.equal((await page.locator('body').innerText()).includes('1,234.56'),visible);
    }
  }
  assert.ok(tiles.length>0,'Map uses the keyless OSM endpoint');
  assert.deepEqual(errors,[]);
  console.log('PASS quotation prices hidden/shown in screen and print, keyless map URL, no runtime errors. API/tile responses mocked; live tiles not tested.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();server.close();});
