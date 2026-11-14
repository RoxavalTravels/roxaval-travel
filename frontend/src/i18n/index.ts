import i18n, { type BackendModule } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { pathLanguage } from './routing';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
] as const;
export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];
export const EDITABLE_NAMESPACES = ['common','home','packages','destinations','activities','auth','booking','dashboard','quotation','blog','reviews','terms','contact','about'];
const modules = import.meta.glob('./locales/*/*.json', { import: 'default' });
const overrides = new Map<string, Record<string, unknown>>();
function merge(a: Record<string, unknown>, b: Record<string, unknown>): Record<string, unknown> {
  const result = { ...a };
  for (const [key,value] of Object.entries(b)) {
    if (['__proto__','constructor','prototype'].includes(key)) continue;
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge((result[key] as Record<string, unknown>) || {}, value as Record<string, unknown>) : value;
  }
  return result;
}
export function applyResourceOverrides(locale: string, namespace: string, values: Record<string, unknown>) {
  overrides.set(`${locale}:${namespace}`, values);
  if (i18n.hasResourceBundle(locale, namespace)) i18n.addResourceBundle(locale, namespace, values, true, true);
}
const backend: BackendModule = {
  type: 'backend', init() {},
  read(language, namespace, callback) {
    const locale = language.split('-')[0];
    const load = modules[`./locales/${locale}/${namespace}.json`];
    if (!load) { callback(null, {}); return; }
    void load().then(async value => {
      let resource = value as Record<string, unknown>;
      if (namespace === 'common') resource = { ...resource, copy: await modules[`./locales/${locale}/copy.json`]() };
      callback(null, merge(resource, overrides.get(`${locale}:${namespace}`) || {}));
    }).catch(error => callback(error, false));
  },
};
const language = (typeof window !== 'undefined' ? pathLanguage(window.location.pathname) : undefined) || 'en';
export const languageReady = i18n.use(backend).use(initReactI18next).init({
  lng: language, fallbackLng: 'en', supportedLngs: ['en','de','fr'], load: 'languageOnly',
  defaultNS: 'common', ns: ['common'], interpolation: { escapeValue: false }, returnEmptyString: false,
});
if (typeof document !== 'undefined') document.documentElement.lang = language;
i18n.on('languageChanged', lng => { if (typeof document !== 'undefined') document.documentElement.lang = lng; });
export function getCurrentLanguage(): SupportedLanguageCode { return (i18n.language?.slice(0,2) as SupportedLanguageCode) || 'en'; }
function copyKey(text: string): string {
  let hash=2166136261;
  for (let index=0;index<text.length;index++) hash=Math.imul(hash^text.charCodeAt(index),16777619);
  return `text_${(hash>>>0).toString(16)}`;
}
export const copy = (text: string, values: Record<string,string|number> = {}) => i18n.t(`copy.${copyKey(text)}`, { ...values, ns:'common', defaultValue:text });
export default i18n;
