const fs=require('node:fs'),path=require('node:path');
module.exports=async({browser,base,scratch})=>{
 const api=await browser.newContext();const rows=(await(await api.request.get(base+'/api/v1/translations/pages')).json()).data;await api.close();
 const keys=['/','/packages',...['/packages/','/destinations/','/activity/'].map(prefix=>rows.find(r=>r.pageKey.startsWith(prefix)).pageKey),'/blog',rows.find(r=>r.pageKey.startsWith('/blog/')).pageKey];
 const results=[];
 const measure=page=>page.evaluate(()=>{const rect=e=>e?Object.fromEntries(['x','y','width','height'].map(k=>[k,Math.round(e.getBoundingClientRect()[k]*100)/100])):null;const h=document.querySelector('h1');return{h1:h?.textContent?.replace(/\s+/g,' ').trim(),h1Count:document.querySelectorAll('h1').length,heading:rect(h),nav:rect(document.querySelector('header')),hero:rect(document.querySelector('[data-initial-hero]')||document.querySelector('main section')),overflow:document.documentElement.scrollWidth>innerWidth,title:document.title,description:document.querySelector('meta[name=description]')?.content,canonical:[...document.querySelectorAll('link[rel=canonical]')].map(e=>e.href),alternates:[...document.querySelectorAll('link[hreflang]')].map(e=>[e.hreflang,e.href]),images:[...document.querySelectorAll('main section:first-of-type img')].map(e=>({src:e.currentSrc,loaded:e.complete&&e.naturalWidth>0})),shifts:window.__visualShifts||[]};});
 for(const key of keys)for(const locale of (process.env.VISUAL_SMOKE?['en']:['en','de','fr']))for(const width of(process.env.VISUAL_SMOKE?[390]:[390,768,1440])){
  const row=rows.find(r=>r.pageKey===key&&r.locale===locale);const id=locale+'-'+(key==='/'?'home':key.slice(1).replaceAll('/','-'))+'-'+width;
  let release;const gate=new Promise(r=>release=r);const errors=[];
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
  await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.pathname.endsWith('.js')){await gate;await new Promise(r=>setTimeout(r,250));}if(u.pathname.includes('/api/v1/')&&!u.pathname.includes('translations'))await new Promise(r=>setTimeout(r,250));return route.continue();});
  await context.addInitScript(()=>{window.__visualShifts=[];new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__visualShifts.push(e.value);}).observe({type:'layout-shift',buffered:true});localStorage.setItem('roxaval_lang',location.pathname.split('/')[1]);});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/'+locale+'/'+row.slug+(row.slug?'/':''),{waitUntil:'commit'});await page.locator('[data-initial-page] h1').waitFor();
   await page.waitForFunction(()=>[...document.querySelectorAll('link[rel=stylesheet]')].every(e=>e.sheet)&&[...document.querySelectorAll('main section:first-of-type img')].every(e=>e.complete));
   const initial=await measure(page);await page.screenshot({path:path.join(scratch,id+'-initial.png')});
   release();await page.waitForTimeout(100);const loading=await measure(page);await page.screenshot({path:path.join(scratch,id+'-loading.png')});
   await page.waitForFunction(()=>!document.querySelector('[data-initial-page]')&&document.querySelectorAll('h1').length===1,{},{timeout:45000});
   const takeover=await measure(page);await page.screenshot({path:path.join(scratch,id+'-takeover.png')});
   await page.waitForLoadState('networkidle');await page.waitForTimeout(750);const final=await measure(page);await page.screenshot({path:path.join(scratch,id+'-final.png')});
   const delta=Math.max(...['x','y','width','height'].map(k=>Math.abs(initial.heading[k]-final.heading[k])));
   results.push({id,key,locale,width,initial,loading,takeover,final,headingDelta:delta,errors});
   console.log(id+' heading delta '+delta+' H1 match '+(initial.h1===final.h1));
  }catch(e){release();await page.screenshot({path:path.join(scratch,id+'-failed.png')});results.push({id,key,locale,width,error:e.message,body:(await page.locator('body').innerText()).slice(0,1200),errors});console.log(id+' FAILED '+e.message);}
  finally{await context.close();fs.writeFileSync(path.join(scratch,'visual-results.json'),JSON.stringify(results,null,2));}
 }
 console.log('Evidence: '+scratch);
};
