// Central SEO constants + helpers shared by the <Seo> component and every
// page's structured-data (JSON-LD) blocks. Keeping the site's canonical
// domain/name/default image in one place avoids nine different pages
// drifting out of sync with each other.

import { getCurrentLanguage } from '../i18n';
import { localizedPath, pathLanguage } from '../i18n/routing';

export const SITE_URL = 'https://www.roxavaltravels.com';
export const SITE_NAME = 'Roxaval Travels';
export const DEFAULT_TITLE = 'Roxaval Travels | Sri Lanka Tours & Custom Itineraries';
export const DEFAULT_DESCRIPTION =
  'Plan your perfect Sri Lanka holiday with Roxaval Travels. Private tour packages, honeymoon tours, wildlife safaris and beach holidays, custom-built itineraries, hotels, guides and transport in one place.';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/f1dc4405-8788-4026-86f6-8dcd6433d54c.jpg`;
export const TWITTER_HANDLE = '@roxavaltravels';

export const absoluteUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${pathLanguage(path) ? path : localizedPath(path, getCurrentLanguage())}`;
};

export const absoluteImage = (url?: string): string => {
  if (!url) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

// Meta descriptions should land around 150-160 characters -- long enough to
// be useful, short enough that Google won't truncate it mid-sentence.
export const truncateDescription = (text: string, max = 158): string => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
};

export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'TravelAgency',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/roxaval-logo.png`,
  image: DEFAULT_OG_IMAGE,
  description: DEFAULT_DESCRIPTION,
  areaServed: {
    '@type': 'Country',
    name: 'Sri Lanka',
  },
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'LK',
  },
  sameAs: [
    'https://www.facebook.com/share/19QafrCEGn/?mibextid=wwXIfr',
    'https://www.instagram.com/roxavaltravels',
    'https://www.tiktok.com/@roxavaltravels',
    'https://www.tripadvisor.com/Attraction_Review-g293962-d27987234-Reviews-Roxaval_Travels-Colombo_Western_Province.html',
  ],
});

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export const breadcrumbSchema = (items: BreadcrumbItem[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const faqSchema = (items: { q: string; a: string }[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
});

export interface TourPackageSchemaInput {
  name: string;
  description: string;
  image: string;
  path: string;
  price?: number;
  currency?: string;
  durationDays?: number;
  rating?: number;
  reviewsCount?: number;
}

export const tourPackageSchema = (pkg: TourPackageSchemaInput) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  name: pkg.name,
  description: pkg.description,
  image: absoluteImage(pkg.image),
  url: absoluteUrl(pkg.path),
  provider: {
    '@type': 'TravelAgency',
    name: SITE_NAME,
    url: SITE_URL,
  },
  ...(pkg.durationDays ? { itinerary: { '@type': 'ItemList', numberOfItems: pkg.durationDays } } : {}),
  ...(pkg.price ?
    {
      offers: {
        '@type': 'Offer',
        price: pkg.price,
        priceCurrency: pkg.currency || 'USD',
        availability: 'https://schema.org/InStock',
        url: absoluteUrl(pkg.path),
      },
    } :
    {}),
  ...(pkg.rating && pkg.reviewsCount ?
    {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: pkg.rating,
        reviewCount: pkg.reviewsCount,
      },
    } :
    {}),
});

export const touristDestinationSchema = (input: { name: string; description: string; image: string; path: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristDestination',
  name: input.name,
  description: input.description,
  image: absoluteImage(input.image),
  url: absoluteUrl(input.path),
  containedInPlace: {
    '@type': 'Country',
    name: 'Sri Lanka',
  },
});

export const touristAttractionSchema = (input: { name: string; description: string; image: string; path: string }) => ({
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: input.name,
  description: input.description,
  image: absoluteImage(input.image),
  url: absoluteUrl(input.path),
});

export const blogPostingSchema = (input: {
  title: string;
  description: string;
  image: string;
  path: string;
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: input.title,
  description: input.description,
  image: absoluteImage(input.image),
  url: absoluteUrl(input.path),
  ...(input.publishedAt ? { datePublished: input.publishedAt } : {}),
  ...(input.updatedAt ? { dateModified: input.updatedAt } : {}),
  author: {
    '@type': input.authorName ? 'Person' : 'Organization',
    name: input.authorName || SITE_NAME,
  },
  publisher: {
    '@type': 'Organization',
    name: SITE_NAME,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/roxaval-logo.png`,
    },
  },
});
