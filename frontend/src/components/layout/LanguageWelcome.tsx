import { useEffect, useRef } from 'react';
import { LanguageFlag } from './LanguageFlag';
import { languages, localizedPath, rememberLanguage, rememberedLanguage } from '../../i18n/routing';

export function LanguageWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  const show = window.location.pathname === '/' && !rememberedLanguage();
  useEffect(() => {
    if (!show) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [show]);
  if (!show) return null;
  const labels = { en: 'English', de: 'Deutsch', fr: 'Français' };
  return <dialog ref={dialog} aria-labelledby="language-welcome" aria-describedby="language-instruction" onCancel={event => event.preventDefault()} className="w-[calc(100%-2rem)] max-w-md rounded-3xl border border-gold/30 bg-cream p-6 sm:p-10 text-center text-forest shadow-2xl backdrop:bg-forest/70 backdrop:backdrop-blur-sm">
    <img src="/roxaval-logo.png" alt="Roxaval Travels" className="mx-auto mb-6 h-20 object-contain" />
    <h2 id="language-welcome" className="font-display text-3xl">Welcome to Roxaval Travels</h2>
    <p id="language-instruction" className="mt-3 mb-6 text-forest/70">Select your language</p>
    <div className="space-y-3">{languages.map(language => <a key={language} lang={language} href={localizedPath('/', language) + window.location.search + window.location.hash} onClick={() => rememberLanguage(language)} className="flex items-center justify-center gap-3 rounded-xl border border-forest/20 bg-white px-6 py-4 font-semibold transition hover:bg-forest hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><LanguageFlag language={language} />{labels[language]}</a>)}</div>
  </dialog>;
}
