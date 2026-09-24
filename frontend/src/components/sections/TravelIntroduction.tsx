import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function TravelIntroduction() {
  const { t } = useTranslation('home');
  const topics = [
    ['culture', '/destinations'], ['wildlife', '/activities'],
    ['coast', '/packages'], ['hills', '/packages#custom-tour'],
  ] as const;
  return <section aria-labelledby="sri-lanka-holidays" className="bg-cream py-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <h2 id="sri-lanka-holidays" className="font-display text-3xl font-semibold text-forest sm:text-4xl">{t('travelIntro.title')}</h2>
      <p className="mt-5 max-w-3xl leading-relaxed text-forest/70">{t('travelIntro.introduction')}</p>
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {topics.map(([key, href]) => <div key={key}>
          <h3 className="font-display text-xl font-semibold text-forest">{t(`travelIntro.${key}.title`)}</h3>
          <p className="mt-3 leading-relaxed text-forest/70">{t(`travelIntro.${key}.text`)}</p>
          <Link to={href} className="mt-3 inline-block font-semibold text-emerald underline decoration-emerald/30 underline-offset-4 hover:decoration-emerald">{t(`travelIntro.${key}.link`)}</Link>
        </div>)}
      </div>
    </div>
  </section>;
}
