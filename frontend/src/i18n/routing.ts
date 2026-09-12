export const languages = ['en', 'de', 'fr'] as const;
export type Language = typeof languages[number];
export interface PageTranslation {
  pageKey: string; locale: Language; slug: string; metaTitle?: string;
  metaDescription?: string; h1?: string; imageAlt?: string;
  socialTitle?: string; socialDescription?: string; messages?: Record<string, Record<string, unknown>>;
  structuredData?: object;
}
export let translations: PageTranslation[] = [];
export function setTranslations(rows: PageTranslation[]) { translations = rows; }
export const cleanPath = (path: string) => '/' + path.split('/').filter(Boolean).join('/');
export const pathLanguage = (path: string): Language | undefined => languages.find(l => path === `/${l}` || path.startsWith(`/${l}/`));
let sessionLanguage: Language | undefined;
export function rememberedLanguage(): Language | undefined {
  try { const value = localStorage.getItem('roxaval_lang'); return languages.find(l => l === value) || sessionLanguage; } catch { return sessionLanguage; }
}
export function rememberLanguage(language: Language) {
  sessionLanguage = language;
  try { localStorage.setItem('roxaval_lang', language); } catch { /* Browsing works when storage is blocked. */ }
}
export const defaultSlugs: Record<string, Record<Language, string>> = {
  '/': { en: '', de: '', fr: '' },
  '/packages': { en: 'sri-lanka-tours', de: 'sri-lanka-rundreisen', fr: 'circuits-sri-lanka' },
  '/destinations': { en: 'destinations', de: 'reiseziele', fr: 'destinations' },
  '/activities': { en: 'activities', de: 'aktivitaeten', fr: 'activites' },
  '/about': { en: 'about-us', de: 'ueber-uns', fr: 'a-propos' },
  '/contact': { en: 'contact-us', de: 'kontakt', fr: 'contact' },
  '/blog': { en: 'blog', de: 'blog', fr: 'blog' },
  '/reviews': { en: 'reviews', de: 'bewertungen', fr: 'avis' },
  '/terms': { en: 'terms', de: 'bedingungen', fr: 'conditions' },
};
export function pageTranslation(pageKey: string, locale: Language) {
  return translations.find(row => row.pageKey === cleanPath(pageKey) && row.locale === locale);
}
export function localizedPath(pageKey: string, locale: Language): string {
  const key = cleanPath(pageKey);
  if (/^\/(admin|api|uploads|assets)(\/|$)/.test(key)) return pageKey;
  const slug = pageTranslation(key, locale)?.slug ?? defaultSlugs[key]?.[locale] ?? key.slice(1);
  return `/${locale}/${slug.replace(/^\/+|\/+$/g, '')}${slug ? '/' : ''}`;
}
export function internalPath(path: string): string {
  const locale = pathLanguage(path);
  if (!locale) return cleanPath(path);
  const slug = cleanPath(path.slice(3)).slice(1);
  const row = translations.find(r => r.locale === locale && r.slug === slug);
  if (row) return row.pageKey;
  return Object.keys(defaultSlugs).find(key => defaultSlugs[key][locale] === slug) ?? cleanPath(slug);
}
