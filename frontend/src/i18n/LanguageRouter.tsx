import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Router, createPath, parsePath } from 'react-router-dom';
import type { Navigator, To } from 'react-router-dom';
import i18n from './index';
import { internalPath, localizedPath, pathLanguage, rememberedLanguage, translations } from './routing';
import { loadRoutes, loadCurrentPage } from './pageLoader';
import { InitialPublicContent } from '../components/seo/InitialPublicContent';

// Keep existing route identities stable while emitting real localized hrefs.
// Every Link, NavLink and navigate() uses this navigator, including forms.
export function LanguageRouter({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const embedded = document.getElementById('roxaval-translations')?.textContent;
    loadRoutes(embedded || undefined).then(async aliases => {
      if (!active) return;
      const currentLocale = pathLanguage(window.location.pathname);
      const currentSlug = window.location.pathname.slice(4).replace(/\/$/, '');
      const alias = aliases.find(row => row.locale === currentLocale && row.slug === currentSlug);
      if (alias && !translations.some(row => row.locale === currentLocale && row.slug === currentSlug)) {
        window.location.replace(localizedPath(alias.pageKey, currentLocale!) + window.location.search + window.location.hash);
        return;
      }
      await loadCurrentPage();
      if (active) setReady(true);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const update = () => setRevision(n => n + 1);
    window.addEventListener('popstate', update);
    window.addEventListener('roxaval-translations-updated', update);
    // A preview or a tab returning from the editor must not retain its old embedded registry.
    let active = true;
    const refresh = () => {
      if (window.location.pathname.startsWith('/admin')) return;
      loadRoutes().then(() => active ? loadCurrentPage(true) : undefined).catch(() => { /* Keep the loaded page usable during a temporary outage. */ });
    };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('popstate', update); window.removeEventListener('roxaval-translations-updated', update); window.removeEventListener('focus', refresh); };
  }, []);
  const pathname = window.location.pathname;
  const locale = pathLanguage(pathname) || 'en';
  useEffect(() => {
    if (ready) void loadCurrentPage().catch(() => { /* Existing content remains usable; retry on focus. */ });
  }, [ready, pathname]);
  useLayoutEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale, pathname]);
  useEffect(() => {
    if (ready && pathname === '/' && rememberedLanguage()) {
      window.location.replace(localizedPath('/', rememberedLanguage()!) + window.location.search + window.location.hash);
    }
  }, [ready, pathname]);
  const navigator = useMemo<Navigator>(() => {
    const href = (to: To) => {
      const parts = typeof to === 'string' ? parsePath(to) : to;
      const path = parts.pathname || internalPath(window.location.pathname);
      return createPath({ ...parts, pathname: pathLanguage(path) ? path : localizedPath(path, locale) });
    };
    const move = (to: To, state: unknown, replace = false) => {
      window.history[replace ? 'replaceState' : 'pushState']({ usr: state, key: Math.random().toString(36).slice(2) }, '', href(to));
      setRevision(n => n + 1);
    };
    return { createHref: href, go: n => window.history.go(n), push: (to, state) => move(to, state), replace: (to, state) => move(to, state, true) };
  }, [locale]);
  if (!ready && !pathname.startsWith('/admin')) return <InitialPublicContent><div className="min-h-screen bg-cream grid place-items-center text-forest" role="status">{error ? <div className="text-center">Unable to load the website.<button className="block mx-auto mt-4 underline" onClick={() => window.location.reload()}>Try again</button></div> : 'Roxaval Travels…'}</div></InitialPublicContent>;
  return <Router navigator={navigator} location={{ pathname: internalPath(pathname), search: window.location.search, hash: window.location.hash, state: window.history.state?.usr ?? null, key: String(revision) }}>{children}</Router>;
}
