// Called only by the isolated SQLite browser harness. No external requests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
module.exports=async({browser,base,scratch})=>{
 const results={conditions:'Local Chromium, unthrottled CPU/network; external fonts/services blocked; first JS delayed 600ms to observe takeover. Synthetic SQLite catalog.',pages:[],viewports:[]};
 const api=await browser.newContext();
 const data=(await(await api.request.get(base+'/api/v1/translations/pages')).json()).data;
 for(const row of data){
  const url=base+'/'+row.locale+'/'+row.slug+(row.slug?'/':'');
  const response=await api.request.get(url),html=await response.text();
  const canonical=[...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)];
  const alternates=[...html.matchAll(/<link\b[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g)];
  const ld=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.equal(response.status(),200);assert.equal(canonical.length,1);assert.equal(alternates.length,4);
  assert.ok(canonical[0][0].includes('https://www.roxavaltravels.com/'+row.locale+'/'+row.slug+(row.slug?'/':'')));
  for(const [ ,lang,href] of alternates){const target=data.find(r=>r.pageKey===row.pageKey&&r.locale===(lang==='x-default'?'en':lang));assert.ok(target);assert.equal(href,'https://www.roxavaltravels.com/'+target.locale+'/'+target.slug+(target.slug?'/':''));}
  results.pages.push({pageKey:row.pageKey,locale:row.locale,htmlBytes:Buffer.byteLength(html),h1Count:(html.match(/<h1\b/g)||[]).length,structuredData:ld.map(x=>x['@type']||'graph')});
 }
 await api.close();
 for(const width of [390,768,1440])for(const locale of ['en','de','fr']){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  const requests=[],errors=[];
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname.endsWith('.js'))await new Promise(r=>setTimeout(r,600));return route.continue();});
  await context.addInitScript(()=>{
   window.__qa={shifts:[],lcp:0,h1Max:0};
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__qa.shifts.push({value:e.value,time:e.startTime});}).observe({type:'layout-shift',buffered:true});
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__qa.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   new MutationObserver(()=>window.__qa.h1Max=Math.max(window.__qa.h1Max,document.querySelectorAll('h1').length)).observe(document,{childList:true,subtree:true});
   localStorage.setItem('roxaval_lang',location.pathname.split('/')[1]);
  });
  const page=await context.newPage();page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+locale+'/',{waitUntil:'domcontentloaded'});
  const initialH1=await page.locator('h1').innerText();
  await page.screenshot({path:path.join(scratch,`initial-${locale}-${width}.png`)});
  await page.locator('#home').waitFor();await page.waitForTimeout(1800);
  const metrics=await page.evaluate(()=>{const img=document.querySelector('#home img');return {...window.__qa,overflow:document.documentElement.scrollWidth>innerWidth,h1:document.querySelectorAll('h1').length,canonical:document.querySelectorAll('link[rel=canonical]').length,alternates:document.querySelectorAll('link[hreflang]').length,hero:img?{src:img.currentSrc,width:img.naturalWidth,priority:img.fetchPriority,complete:img.complete}:null};});
  let cls=0,sum=0,start=0,prev=0;for(const s of metrics.shifts){if(s.time-prev>1000||s.time-start>5000){sum=0;start=s.time;}sum+=s.value;prev=s.time;cls=Math.max(cls,sum);}
  await page.screenshot({path:path.join(scratch,`rendered-${locale}-${width}.png`)});
  const renderedH1=await page.locator('h1').innerText();
  results.viewports.push({width,locale,...metrics,cls,initialH1,renderedH1,errors,translationRequests:requests.filter(u=>u.includes('/translations/pages'))});
  await context.close();
 }
 fs.writeFileSync(path.join(scratch,'seo-review.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify({routes:results.pages.length,observations:results.viewports.map(({width,locale,cls,lcp,overflow,h1,h1Max,hero,errors})=>({width,locale,cls,lcp,overflow,h1,h1Max,hero,errors})),evidence:scratch},null,2));
};
