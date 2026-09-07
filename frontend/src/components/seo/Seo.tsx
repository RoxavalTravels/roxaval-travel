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
  const canonical = absoluteUrl(canonicalPath || location.pathname);
  const ogImage = absoluteImage(image);
  const jsonLdList = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLdList.map((schema, i) =>
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>);

}
