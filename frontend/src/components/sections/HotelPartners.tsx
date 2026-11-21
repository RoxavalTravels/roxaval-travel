import React from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeading } from '../ui/SectionHeading';

interface HotelPartner {
  name: string;
  logo: string;
  // The Browns source file is a wide 1298x537 canvas with the crest crammed
  // into the top-left ~40% and the rest transparent padding, so a plain
  // object-contain renders it tiny and pushed toward one edge next to the
  // other (tightly-cropped) logos. This zooms/repositions the raw image
  // within a fixed 56x56 box to match how the other logos already read.
  crop?: { width: number; height: number; left: number; top: number };
}

const HOTEL_PARTNERS: HotelPartner[] = [
{ name: 'Amaya Resorts', logo: '/partners/amaya.jpg' },
{ name: 'Browns Hotels', logo: '/partners/browns.png', crop: { width: 321, height: 133, left: -130, top: 3 } },
{ name: 'Cinnamon Hotels', logo: '/partners/cinnamon.png' },
{ name: 'Teardrop Hotels', logo: '/partners/teardrop.jpg' },
{ name: '98 Acres', logo: '/partners/98-acres.jpg' }];


// Duplicated once so the CSS marquee can loop seamlessly at -50% translateX.
const MARQUEE_ITEMS = [...HOTEL_PARTNERS, ...HOTEL_PARTNERS];

export function HotelPartners() {
  const { t } = useTranslation('home');
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t('hotelPartners.eyebrow')} title={t('hotelPartners.title')} subtitle={t('hotelPartners.subtitle')} />
      </div>

      <div className="relative mt-14 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-cream to-transparent sm:w-32" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-cream to-transparent sm:w-32" />
        <div className="flex w-max animate-marquee gap-6">
          {MARQUEE_ITEMS.map((partner, i) =>
          <div
            key={i}
            className="flex h-28 w-64 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-forest/10 bg-white px-8 py-4 shadow-soft transition-shadow hover:shadow-lift">

              {partner.crop ?
            <div className="relative h-14 w-14 overflow-hidden">
                  <img
                src={partner.logo}
                alt={partner.name}
                style={{ width: partner.crop.width, height: partner.crop.height, left: partner.crop.left, top: partner.crop.top }}
                className="absolute max-w-none" />

                </div> :

            <img src={partner.logo} alt={partner.name} className="h-14 max-w-full object-contain" />
            }
              <p className="font-display text-center text-xs font-semibold tracking-wide text-forest/50">{partner.name}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}
