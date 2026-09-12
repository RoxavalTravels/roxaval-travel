import { Language } from '../../i18n/routing';

// SVG flags also render on Windows, where flag emoji appear as country letters.
export function LanguageFlag({ language }: { language: Language }) {
  return <svg aria-hidden="true" viewBox="0 0 60 40" className="inline-block h-5 w-8 rounded-sm align-middle shadow-sm">
    {language === 'de' ? <><path fill="#171717" d="M0 0h60v14H0z" /><path fill="#d00" d="M0 14h60v13H0z" /><path fill="#ffce00" d="M0 27h60v13H0z" /></> : language === 'fr' ? <><path fill="#0055a4" d="M0 0h20v40H0z" /><path fill="#fff" d="M20 0h20v40H20z" /><path fill="#ef4135" d="M40 0h20v40H40z" /></> : <><path fill="#012169" d="M0 0h60v40H0z" /><path stroke="#fff" strokeWidth="8" d="m0 0 60 40M60 0 0 40" /><path stroke="#c8102e" strokeWidth="3" d="m0 0 60 40M60 0 0 40" /><path stroke="#fff" strokeWidth="13" d="M30 0v40M0 20h60" /><path stroke="#c8102e" strokeWidth="7" d="M30 0v40M0 20h60" /></>}
  </svg>;
}
