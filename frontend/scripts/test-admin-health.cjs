const {chromium}=require(process.env.PLAYWRIGHT_CORE_PATH||'playwright-core');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())file=path.join(root,'index.html');res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/html');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(4181,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH});
 try{
 const context=await browser.newContext();let dashboardFail=true;const requests=[];
 await context.route('**/*',async route=>{const url=new URL(route.request().url());if(!url.pathname.includes('/api/v1/')){if(url.hostname!=='127.0.0.1')return route.abort();return route.continue();}
 const p=url.pathname.split('/api/v1')[1];requests.push(p);let data=[],status=200,meta={total:0,page:1,limit:100,totalPages:1};
 const user={_id:'1',fullName:'Audit Admin',email:'audit@example.test',role:'superadmin'};
 if(p==='/auth/me')data={user};
 if(p==='/translations/pages')data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../backend-php/resources/multilingual-pages.json')));
 if(p==='/reports/dashboard'){if(dashboardFail){dashboardFail=false;return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({success:false,message:'Temporary outage'})});}data={totalBookings:0,monthlyRevenue:0,pendingInquiries:0,totalCustomers:201,popularDestinations:[],popularPackages:[],recentActivity:[]};}
 if(p==='/customers'){const all=Array.from({length:201},(_,i)=>({_id:String(i+1),user:{fullName:`Customer ${i+1}`,email:`customer${i+1}@example.test`}}));const page=Number(url.searchParams.get('page')||1),limit=Number(url.searchParams.get('limit')||100);data=all.slice((page-1)*limit,page*limit);meta={total:201,page,limit,totalPages:Math.ceil(201/limit)};}
 if(p==='/custom-tours'&&url.searchParams.get('customer')){const customer=url.searchParams.get('customer');const all=Array.from({length:101},(_,i)=>({_id:String(i+1),referenceNumber:`Q-${customer}-${i+1}`,itinerary:{_id:String(i+1),status:'Sent',pricing:{totalPrice:100,currency:'USD'}}}));const page=Number(url.searchParams.get('page')||1);data=all.slice((page-1)*100,page*100);meta={total:101,page,limit:100,totalPages:2};}
 if(p==='/settings')data={companyName:'Audit',logoUrl:'',address:'',phone:'',email:'',website:'',socialLinks:{},bankDetails:{},seoDefaults:{},maintenanceMode:false};
 if(p==='/admins/me')data={_id:'1',user,department:'operations'};
 if(p==='/customers/me')data={user};
 if(p==='/birthdays/config')data={enabled:false,subject:'Happy Birthday',message:'Happy Birthday',sendTime:'09:00',timezone:'Asia/Colombo'};
 if(p==='/custom-tours'&&url.searchParams.get('customer')==='1')await new Promise(resolve=>setTimeout(resolve,700));
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:true,data,meta})});});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4181/admin/dashboard');await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('link',{name:'Create Quotation',exact:true}).waitFor();
 for(const endpoint of ['/packages/admin/all','/destinations/admin/all','/activities/admin/all','/hotels/admin/all'])assert.ok(requests.includes(endpoint));
 console.log('PASS dashboard error/retry and all-record counters');
 await page.goto('http://127.0.0.1:4181/admin/bookings/new');await page.locator('option[value="201"]').waitFor({state:'attached'});await page.locator('main select').first().selectOption('201');await page.getByText('Q-201-101',{exact:true}).waitFor();console.log('PASS customer 201 and quotation 101 are selectable');
 await page.locator('main select').first().selectOption('1');await page.waitForTimeout(100);await page.locator('main select').first().selectOption('2');await page.getByText('Q-2-101',{exact:true}).waitFor();await page.waitForTimeout(1600);assert.equal(await page.getByText('Q-1-1',{exact:true}).count(),0);console.log('PASS slow previous-customer response cannot replace current quotations');
 const screens=['packages','destinations','activities','hotels','vehicles','tour-guides','transfers','blog','customers','custom-requests','bookings','payments','reviews','contact','documents','notifications','settings','profile','birthdays',...['packages','destinations','activities','hotels','vehicles','tour-guides','transfers','blog','customers','custom-requests'].map(x=>x+'/new')];
 const results=[];
 for(const screen of screens){const before=errors.length;await page.goto('http://127.0.0.1:4181/admin/'+screen);try{await page.locator('main h1').first().waitFor({timeout:10000});await page.waitForTimeout(100);assert.equal(errors.length,before);results.push({screen,passed:true});}catch(e){results.push({screen,passed:false,error:e.message,errors:errors.slice(before)});}}
 fs.writeFileSync(path.resolve(__dirname,'../../backups/admin-screen-audit.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));assert.ok(results.every(x=>x.passed),'All admin screens render');assert.deepEqual(errors,[]);
 console.log('PASS admin health audit');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
