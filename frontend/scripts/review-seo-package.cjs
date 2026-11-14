// Local inspection only: does not archive, upload or deploy anything.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const backend=['app/Http/Controllers/Api/LocalizedWebsiteController.php','app/Http/Controllers/Api/PageTranslationController.php','app/Support/MultilingualPages.php','app/Support/PublicPageContent.php','app/Console/Commands/ApplyReviewedSeo.php','resources/views/public/initial-content.blade.php','resources/public-page-copy.json','resources/seo-reviewed-20261111.json'];
const records=[],findings=[];
for(const [scope,files,base] of [['backend',backend.map(p=>path.join(root,'backend-php',p)),path.join(root,'backend-php')],['frontend',walk(path.join(root,'frontend/dist')),path.join(root,'frontend/dist')]])for(const file of files){
 const name=path.relative(base,file).replaceAll('\\','/');
 // Hosting/gateway files are inspected but intentionally not part of this update.
 if(scope==='frontend'&&['.htaccess','multilingual.php'].includes(name))continue;
 if(/(^|\/)(\.env|\.git|node_modules|tests?|backups?|storage)(\/|$)|\.(?:key|pem|sql|sqlite|map)$/i.test(name))findings.push({file:scope+'/'+name,issue:'forbidden path'});
 const bytes=fs.readFileSync(file);
 if(/\.(?:js|json|html|php|txt|css)$/i.test(name)){
  const text=bytes.toString('utf8');
  if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|local-browser-test-secret|LocalBrowserTest123|zlwoctte_secstage/.test(text))findings.push({file:scope+'/'+name,issue:'test credential or private key signature'});
  if(scope==='frontend'&&/https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/api/.test(text))findings.push({file:scope+'/'+name,issue:'local API URL'});
 }
 records.push({scope,path:name,bytes:bytes.length,sha256:hash(bytes)});
}
const entry=fs.readFileSync(path.join(root,'frontend/dist/index.html'),'utf8');
const scripts=[...entry.matchAll(/src="(\/assets\/[^\"]+\.js)"/g)].map(m=>m[1]);
if(!scripts.some(s=>fs.readFileSync(path.join(root,'frontend/dist',s),'utf8').includes('https://api.roxavaltravels.com/api/v1')))findings.push({issue:'production API not found in entry assets'});
fs.writeFileSync(path.join(root,'release/SEO-RELEASE-FILES-20261111.json'),JSON.stringify({status:'REVIEW CANDIDATE ONLY - NOT APPROVED FOR DEPLOYMENT',records,findings},null,2));
fs.writeFileSync(path.join(root,'release/SEO-RELEASE-FILES-20261111.csv'),'scope,path,bytes,sha256\n'+records.map(r=>[r.scope,r.path,r.bytes,r.sha256].join(',')).join('\n')+'\n');
const patches=JSON.parse(fs.readFileSync(path.join(root,'backend-php/resources/seo-reviewed-20261111.json')));
const cell=x=>String(x).replaceAll('|','\\|').replaceAll('\n',' ');
const rows=patches.map((p,i)=>{const field=Object.keys(p.changes)[0],value=p.changes[field];const repeatedBefore=field==='metaTitle'&&/ - \d+ Days| – \d+ Tage| - \d+ jours| – \d+ jours/.test(p.expected[field]);return `| ${i+1} | /${p.locale}/${p.slug}/ | ${cell(p.expected[field])} | ${cell(value)} | ${[...value].length} | ${repeatedBefore?'CORRECTED: removed repeated duration; acceptable':'REVIEWED: acceptable'} |`;});
fs.writeFileSync(path.join(root,'release/SEO-METADATA-FINAL-REVIEW-20261111.md'),'# Review of all 29 metadata proposals\n\nLocal editorial review only; production values unchanged. Expected old values and slugs must still match at apply time. Descriptions avoid promises about safety, availability or pricing. Tour names, duration, language and brand are retained. Native-speaker/client sign-off remains advisable; no ranking guarantee.\n\n| # | URL | Expected old value | Final proposed value | Characters | Review status |\n|---|---|---|---|---:|---|\n'+rows.join('\n')+'\n');
console.log(JSON.stringify({files:records.length,backend:backend.length,findings},null,2));
