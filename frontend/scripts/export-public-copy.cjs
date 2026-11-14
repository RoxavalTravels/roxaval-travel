// Keep PHP's initial public content sourced from the same reviewed UI copy.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const copy = {};
const customerCopy = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/i18n/customer-copy.json'), 'utf8'));
function copyKey(text) { let hash=2166136261; for(let i=0;i<text.length;i++) hash=Math.imul(hash^text.charCodeAt(i),16777619); return `text_${(hash>>>0).toString(16)}`; }
for (const locale of ['en', 'de', 'fr']) {
  copy[locale] = {};
  copy[locale].phrases = Object.fromEntries(customerCopy.map(row => [row[0], row[['en','de','fr'].indexOf(locale)]]));
  for (const ns of ['common', 'home', 'packages', 'destinations', 'activities', 'blog']) {
    copy[locale][ns] = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/i18n/locales', locale, ns+'.json'), 'utf8'));
  }
  fs.writeFileSync(path.join(root, 'frontend/src/i18n/locales', locale, 'copy.json'), JSON.stringify(Object.fromEntries(customerCopy.map(row=>[copyKey(row[0]),row[['en','de','fr'].indexOf(locale)]]))));
}
fs.writeFileSync(path.join(root, 'backend-php/resources/public-page-copy.json'), JSON.stringify(copy));
