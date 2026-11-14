import { applyResourceOverrides, languageReady } from './index';
import { languages, PageTranslation, setTranslations, translations, internalPath, pathLanguage } from './routing';

type RouteTuple = [string, string | null, string | null, string | null];
interface Bootstrap { version?: number; routes: RouteTuple[]; pages?: PageTranslation[]; aliases?: { locale: string; slug: string; pageKey: string }[] }
const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();
const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

async function publicGet<T>(query: string): Promise<T> {
  const response = await fetch(`${base}/translations/pages?${query}`, { credentials: 'omit', headers: { Accept: 'application/json' }, cache: 'no-cache' });
  if (!response.ok) throw new Error('Public page translations could not be loaded');
  return (await response.json()).data;
}
function applyPages(rows: PageTranslation[]) {
  const merged = [...translations];
  for (const row of rows) {
    const index = merged.findIndex(r => r.pageKey === row.pageKey && r.locale === row.locale);
    if (!row.interfaceOnly) { if (index < 0) merged.push(row); else merged[index] = row; }
    loaded.add(`${row.locale}:${row.pageKey}`);
    Object.entries(row.messages || {}).forEach(([namespace, values]) => applyResourceOverrides(row.locale, namespace, values));
  }
  setTranslations(merged);
}
export async function loadRoutes(embedded?: string) {
  await languageReady;
  const data: Bootstrap | PageTranslation[] = embedded ? JSON.parse(embedded) : await publicGet('view=routes');
  // Backward compatibility with an existing cached document during rollout.
  if (Array.isArray(data)) { applyPages(data); return []; }
  const compact = data.routes.flatMap(([pageKey, ...slugs]) => slugs.flatMap((slug, index) => slug === null ? [] : [{ pageKey, locale: languages[index], slug }]));
  setTranslations(compact.map(row => translations.find(r => r.pageKey === row.pageKey && r.locale === row.locale) ? { ...translations.find(r => r.pageKey === row.pageKey && r.locale === row.locale)!, slug: row.slug } : row));
  if (data.pages) applyPages(data.pages);
  return data.aliases || [];
}
export async function loadCurrentPage(force = false) {
  const path = window.location.pathname;
  const locale = pathLanguage(path) || 'en';
  const internal = internalPath(path);
  const privateRoot = internal.match(/^\/(auth|forgot-password|reset-password|my-tours|profile|notifications|account-settings)(?:\/|$)/)?.[1];
  const pageKey = privateRoot ? '/'+privateRoot : internal;
  if (!privateRoot && !translations.some(r => r.pageKey === pageKey && r.locale === locale)) return;
  const key = `${locale}:${pageKey}`;
  if (!force && loaded.has(key)) return;
  if (pending.has(key)) return pending.get(key);
  const promise = publicGet<PageTranslation[]>(new URLSearchParams({ pageKey, locale }).toString())
    .then(applyPages).finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
