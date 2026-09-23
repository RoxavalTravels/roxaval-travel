import { getCurrentLanguage } from '../../i18n';
import { localizedPath, pageTranslation, languages } from '../../i18n/routing';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { absoluteImage, absoluteUrl, SITE_NAME } from '../../lib/seo';

interface SeoProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: object | object[];
  canonicalPath?: string;
}

// Every public page renders one of these near the top. It owns <title>,
// meta description/keywords, canonical link, Open Graph + Twitter Card tags,
// and any JSON-LD structured data for that page -- one place instead of
// each page hand-rolling <head> tags differently.
export function Seo({ title, description, keywords, image, type = 'website', noindex = false, jsonLd, canonicalPath }: SeoProps) {
  const location = useLocation();
  const locale = getCurrentLanguage();
  const page = pageTranslation(location.pathname, locale);
  title = page?.metaTitle || title;
  description = page?.metaDescription || description;
  keywords = page?.keywords || keywords;
  const effectiveKeywords = keywords || title;
  const socialTitle = page?.socialTitle || title;
  const socialDescription = page?.socialDescription || description;
  const canonical = absoluteUrl(localizedPath(canonicalPath || location.pathname, locale));
  const ogImage = absoluteImage(image);
  const jsonLdList = [...(page?.structuredData ? [page.structuredData] : []), ...(jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [])];

  return (
    <Helmet>
      <html lang={locale} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={effectiveKeywords} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <link rel="canonical" href={canonical} />
      {!noindex && languages.filter(language => pageTranslation(location.pathname, language)).map(language => <link key={language} rel="alternate" hrefLang={language} href={absoluteUrl(localizedPath(location.pathname, language))} />)}
      {!noindex && page && <link rel="alternate" hrefLang="x-default" href={absoluteUrl(localizedPath(location.pathname, 'en'))} />}
      <meta property="og:locale" content={{ en: 'en_GB', de: 'de_DE', fr: 'fr_FR' }[locale]} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={socialTitle} />
      <meta property="og:description" content={socialDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={socialTitle} />
      <meta name="twitter:description" content={socialDescription} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdList.map((schema, i) =>
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>);

}
