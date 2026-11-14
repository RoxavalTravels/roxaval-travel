import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Compass } from 'lucide-react';

export function PrivateTours() {
  const { t } = useTranslation('home');
  return <section aria-labelledby="private-tours-title" className="bg-white py-16">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <h2 id="private-tours-title" className="font-display text-3xl font-semibold text-forest">{t('privateTours.title')}</h2>
      <p className="mt-5 max-w-4xl leading-relaxed text-forest/70">{t('privateTours.intro')}</p>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {['why', 'destinations', 'tailorMade', 'choose'].map(key => <div key={key}>
          <h3 className="font-display text-xl font-semibold text-forest">{t(`privateTours.${key}.title`)}</h3>
          {key === 'destinations' || key === 'choose' ? <ul className="mt-3 space-y-3 leading-relaxed text-forest/70">{(t(`privateTours.${key}.items`, { returnObjects: true }) as string[]).map(item => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 leading-relaxed text-forest/70">{t(`privateTours.${key}.text`)}</p>}
          {key !== 'choose' && <Link to={key === 'why' ? '/activities' : key === 'destinations' ? '/destinations' : '/packages'} className="mt-4 inline-block font-semibold text-emerald underline">{t(`privateTours.${key}.link`)}</Link>}
        </div>)}
      </div>
      <div className="relative mt-12 isolate overflow-hidden rounded-[2rem] bg-forest shadow-xl md:grid md:grid-cols-[0.85fr_1.15fr]">
        <div className="relative h-56 overflow-hidden sm:h-72 md:h-auto md:min-h-[380px]" aria-hidden="true">
          <img src="/pkg-misty-hills-tea-trails.jpg" alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-forest via-transparent to-black/10 md:bg-gradient-to-r md:from-transparent md:to-forest/30" />
          <div className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-forest/25 text-white backdrop-blur-sm">
            <Compass className="h-6 w-6" strokeWidth={1.25} />
          </div>
        </div>
        <div className="relative px-7 pb-9 pt-3 sm:px-10 sm:pb-12 md:flex md:flex-col md:justify-center md:py-12 lg:px-14">
          <Compass aria-hidden="true" className="pointer-events-none absolute -right-16 -top-12 h-64 w-64 text-white/[0.04]" strokeWidth={0.6} />
          <div aria-hidden="true" className="mb-6 h-0.5 w-12 bg-gold" />
          <h3 className="relative max-w-md font-display text-3xl font-medium leading-tight text-white sm:text-4xl lg:text-[2.75rem]">{t('privateTours.plan.title')}</h3>
          <p className="relative mt-5 max-w-lg text-base leading-relaxed text-white/80">{t('privateTours.plan.text')}</p>
          <Link to="/packages#custom-tour" className="group relative mt-7 inline-flex w-fit max-w-full items-center justify-center gap-4 rounded-full bg-gold py-3 pl-6 pr-3 font-semibold text-forest transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            <span>{t('privateTours.plan.link')}</span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest/10"><ArrowUpRight aria-hidden="true" className="h-5 w-5 motion-safe:transition-transform motion-safe:group-hover:-translate-y-0.5 motion-safe:group-hover:translate-x-0.5" /></span>
          </Link>
        </div>
      </div>
    </div>
  </section>;
}
