import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BadgeCheckIcon, ZoomInIcon, XIcon } from 'lucide-react';
import { SectionHeading } from '../ui/SectionHeading';

const DOCS = [
{ key: 'Sltda', src: '/sltda-licence.webp', w: 1800, h: 1270, tilt: -2 },
{ key: 'Slaito', src: '/slaito-certificate.webp', w: 1295, h: 1976, tilt: 2 }] as
const;

export function CredentialDocuments() {
  const { t } = useTranslation('about');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {if (e.key === 'Escape') setOpen(null);};
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {window.removeEventListener('keydown', onKey);document.body.style.overflow = prev;};
  }, [open]);

  return (
    <section className="relative overflow-hidden bg-cream py-20">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-emerald/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t('docsEyebrow')} title={t('docsTitle')} subtitle={t('docsSubtitle')} />
        <div className="mx-auto mt-14 grid max-w-5xl items-start gap-10 md:grid-cols-[1.5fr_1fr]">
          {DOCS.map((d, i) =>
          <motion.figure
            key={d.key}
            initial={{ opacity: 0, y: 50, rotate: d.tilt * 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
            whileHover={{ y: -8, rotate: d.tilt / 2 }}
            className="group">
              <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`${t('docView')}: ${t(`doc${d.key}Title`)}`}
              className="relative block w-full overflow-hidden rounded-2xl bg-white p-3 text-left shadow-lift ring-1 ring-forest/10 transition-shadow duration-300 hover:shadow-2xl">
                <div className="relative overflow-hidden rounded-lg">
                  <img src={d.src} alt={t(`doc${d.key}Title`)} width={d.w} height={d.h} loading="lazy" decoding="async"
                  className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-forest/85 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100">
                    <ZoomInIcon className="h-3.5 w-3.5" />{t('docView')}
                  </span>
                </div>
              </button>
              <figcaption className="mt-5 px-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                  <BadgeCheckIcon className="h-4 w-4" />{t('docVerified')}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold text-forest">{t(`doc${d.key}Title`)}</h3>
                <p className="mt-1 text-sm text-forest/60">{t(`doc${d.key}Meta`)}</p>
              </figcaption>
            </motion.figure>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open !== null &&
        <motion.div
          key="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={t(`doc${DOCS[open].key}Title`)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <button type="button" onClick={() => setOpen(null)} aria-label={t('docClose')}
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
              <XIcon className="h-6 w-6" />
            </button>
            <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            src={DOCS[open].src}
            alt={t(`doc${DOCS[open].key}Title`)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-full rounded-lg bg-white object-contain shadow-2xl" />
          </motion.div>
        }
      </AnimatePresence>
    </section>);
}
