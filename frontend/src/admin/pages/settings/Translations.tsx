import { useEffect, useState } from 'react';
import { apiGetOne, apiPatch, ApiRequestError } from '../../../lib/api';
import i18n from '../../../i18n';
import { PageTranslation, Language, localizedPath, setTranslations } from '../../../i18n/routing';
import { PageHeader } from '../../components/PageHeader';

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, string> {
  return Object.assign({}, ...Object.entries(value).map(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof item === 'string' ? { [path]: item } : item && typeof item === 'object' && !Array.isArray(item) ? flatten(item as Record<string, unknown>, path) : {};
  }));
}
export function AdminTranslations() {
  const [rows, setRows] = useState<PageTranslation[]>([]);
  const [page, setPage] = useState('/');
  const [locale, setLocale] = useState<Language>('en');
  const [draft, setDraft] = useState<PageTranslation>();
  const [namespace, setNamespace] = useState('home');
  const [filter, setFilter] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { apiGetOne<PageTranslation[]>('/translations/pages/admin').then(setRows).catch(error => setStatus(error.message)); }, []);
  useEffect(() => {
    const row = rows.find(row => row.pageKey === page && row.locale === locale);
    setDraft(row ? { ...row, messages: rows.find(item => item.pageKey === '/' && item.locale === locale)?.messages || {} } : undefined);
  }, [rows, page, locale]);
  const update = (field: keyof PageTranslation, value: string) => setDraft(old => old ? { ...old, [field]: value } : old);
  const fields = { metaTitle: 'Meta title', metaDescription: 'Meta description', slug: 'URL slug (without language prefix)', h1: 'H1 heading', imageAlt: 'Main image alt text', socialTitle: 'Social sharing title', socialDescription: 'Social sharing description' } as const;
  const messages = flatten(i18n.getResourceBundle(locale, namespace) || {});
  const overrides = flatten(draft?.messages?.[namespace] || {});
  const save = async () => {
    if (!draft) return;
    setSaving(true); setStatus('');
    try {
      await apiPatch('/translations/pages', draft);
      const fresh = await apiGetOne<PageTranslation[]>('/translations/pages/admin');
      setRows(fresh); setTranslations(fresh);
      setStatus('Saved. Open the page preview to review your changes.');
    } catch (error) { setStatus(error instanceof ApiRequestError && error.errors?.length ? error.errors.map(item => `${item.field}: ${item.message}`).join(' · ') : error instanceof Error ? error.message : 'Save failed'); }
    finally { setSaving(false); }
  };
  return <div className="space-y-6">
    <PageHeader title="Languages & SEO" subtitle="Edit English, German and French pages independently. Catalog descriptions and itineraries remain editable in their existing catalog forms." />
    <p className="text-sm text-forest/70">Choose a page and language. Interface text changes apply throughout that language version. Save before switching pages or languages.</p>
    <div className="flex flex-wrap gap-4">
      <label>Page<select aria-label="Page" className="block max-w-full rounded-lg border p-3" value={page} onChange={event => setPage(event.target.value)}>{[...new Set(rows.map(row => row.pageKey))].map(key => <option key={key} value={key}>{key === '/' ? 'Home' : key}</option>)}</select></label>
      <label>Language<select aria-label="Language" className="block rounded-lg border p-3" value={locale} onChange={event => setLocale(event.target.value as Language)}><option value="en">English</option><option value="de">Deutsch</option><option value="fr">Français</option></select></label>
    </div>
    {draft && <>
      <div className="grid gap-4 rounded-2xl bg-white p-6 md:grid-cols-2">{Object.entries(fields).map(([field, label]) => <label key={field} className="block text-sm font-medium text-forest">{label}<input className="mt-2 block w-full rounded-xl border border-forest/15 px-3 py-2.5 font-normal" value={String(draft[field as keyof PageTranslation] || '')} onChange={event => update(field as keyof PageTranslation, event.target.value)} /></label>)}</div>
      <a className="text-emerald underline" href={localizedPath(page, locale)} target="_blank" rel="noreferrer">Preview saved page ↗</a>
      <section className="space-y-4 rounded-2xl bg-white p-6">
        <h2 className="text-xl font-semibold">Editable interface content</h2>
        <div className="flex flex-wrap gap-4"><label>Content group<select className="block border rounded-lg p-2" value={namespace} onChange={event => setNamespace(event.target.value)}>{(i18n.options.ns as string[]).map(ns => <option key={ns}>{ns}</option>)}</select></label><label>Find text<input className="block border rounded-lg p-2" value={filter} onChange={event => setFilter(event.target.value)} /></label></div>
        {Object.entries(messages).filter(([key, value]) => `${key} ${value}`.toLowerCase().includes(filter.toLowerCase())).map(([key, value]) => <label className="block text-sm" key={key}>{key}<textarea className="mt-1 block w-full rounded-lg border p-3" rows={2} value={overrides[key] ?? value} onChange={event => {
          const bundle = structuredClone(draft.messages?.[namespace] || {});
          const parts = key.split('.'); let cursor = bundle;
          parts.slice(0, -1).forEach(part => { cursor[part] ||= {}; cursor = cursor[part] as Record<string, unknown>; });
          cursor[parts[parts.length - 1]] = event.target.value;
          setDraft({ ...draft, messages: { ...draft.messages, [namespace]: bundle } });
        }} /></label>)}
      </section>
      <button disabled={saving} onClick={save} className="rounded-xl bg-forest px-6 py-3 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save translation'}</button>
    </>}
    <p role="status">{status}</p>
  </div>;
}
