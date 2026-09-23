import { formatMoney } from '../../lib/money';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, ArrowRightIcon, BedDoubleIcon, CalendarIcon, CarIcon, LanguagesIcon, Loader2Icon, MapPinIcon, PlaneIcon, PrinterIcon, StarIcon, UsersIcon } from 'lucide-react';
import { WHATSAPP_DISPLAY_SL, CONTACT_EMAIL, WEBSITE_DISPLAY } from '../../lib/contact';
import { apiGetOne } from '../../lib/api';
import { getCurrentLanguage, SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '../../i18n';
import { NotesBlock } from './NotesBlock';
import { RouteMap } from './RouteMap';
import { Seo } from '../seo/Seo';

interface RefName {
  _id: string;
  name: string;
  mapLocation?: { lat?: number; lng?: number };
}

interface HotelRef {
  _id: string;
  name: string;
  category?: string;
  starRating?: number;
  images?: string[];
  address?: string;
  description?: string;
  destination?: RefName;
  roomTypes?: { name: string; mealPlan?: string }[];
}

interface ActivityRef {
  _id: string;
  name: string;
  image?: string;
  description?: string;
  category?: string;
}

interface TransferRef {
  _id: string;
  name: string;
  type?: string;
  supplier?: string;
  transferFor?: string;
  vehicle?: { name: string; type?: string };
}

interface RoomOccupancy {
  single: number;
  double: number;
  triple: number;
  quad: number;
  extraBed: number;
  childWithBed: number;
  childNoBed: number;
  infant: number;
}

export interface QuotationDay {
  dayNumber: number;
  date?: string;
  title: string;
  schedule?: string;
  notes?: string;
  destinations?: RefName[];
  hotel?: HotelRef;
  roomType?: string;
  // roomType above is a frozen snapshot (whatever language the admin's
  // panel was in when they picked it) -- roomTypeRef is the live, still-
  // translatable reference, preferred for display when present.
  roomTypeRef?: { name: string };
  mealPlan?: string;
  numberOfRooms?: number;
  roomOccupancy?: RoomOccupancy;
  activityPricing?: { activity?: ActivityRef; adultCount: number; childCount: number; infantCount: number; selected?: boolean }[];
  transfers?: { transfer?: TransferRef; vehicleCount: number; selected?: boolean }[];
  flights?: { airline?: string; flightNumber?: string; from?: string; to?: string; departureTime?: string; arrivalTime?: string; selected?: boolean }[];
}

interface QuotationVehicle {
  name: string;
  type?: string;
  capacity?: number;
  driverIncluded?: boolean;
  images?: string[];
}

interface QuotationGuide {
  name: string;
  photo?: string;
  languages?: string[];
  yearsExperience?: number;
  rating?: number;
}

export interface QuotationItinerary {
  title: string;
  summary?: string;
  bannerImage?: string;
  days: QuotationDay[];
  pricing: { basePrice: number; discount: number; totalPrice: number; currency: string; pricePerPerson: boolean; showPrice?: boolean };
  sightseeingIncluded?: boolean;
  visaRequirements?: string;
  travelInsurance?: string;
  cancellationPolicy?: string;
  inclusions?: string;
  exclusions?: string;
  customerFacingNotes?: string;
  vehicle?: QuotationVehicle;
  tourGuide?: QuotationGuide;
}

export interface QuotationRequest {
  referenceNumber: string;
  travelDates: { startDate: string; endDate: string };
  travelers: { adults: number; children: number; infants: number };
  travelStyle?: string;
  itinerary: QuotationItinerary;
}

const HEADER_IMAGES = {
  couple: '/banner-images/couple-banner.jpg',
  family: '/banner-images/family-banner.jpg',
  nature: '/banner-images/nature-banner.jpg',
  traditional: '/banner-images/anuradhapura-banner.jpg',
  default: '/banner-images/default-banner.jpg',
};

// Picks the quotation's header photo to match who's actually travelling —
// family (any children/infants) takes priority since it's the clearest
// signal, then a childless couple of exactly two, then the customer's
// stated travel style for the remaining cases. Falls back to the original
// banner when nothing matches.
function resolveHeaderImage(travelers: QuotationRequest['travelers'], travelStyle?: string): string {
  if (travelers.children > 0 || travelers.infants > 0 || travelStyle === 'Family') return HEADER_IMAGES.family;
  if (travelStyle === 'Honeymoon' || (travelers.adults === 2 && travelers.children === 0 && travelers.infants === 0)) return HEADER_IMAGES.couple;
  if (travelStyle === 'Cultural') return HEADER_IMAGES.traditional;
  if (travelStyle === 'Adventure') return HEADER_IMAGES.nature;
  return HEADER_IMAGES.default;
}

const fmtDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

const occupancyLabel = (o?: RoomOccupancy) => {
  if (!o) return '';
  const map: [keyof RoomOccupancy, string][] = [['single', 'SGL'], ['double', 'DBL'], ['triple', 'TRPL'], ['quad', 'QUAD'], ['extraBed', 'Extra Bed']];
  return map.filter(([k]) => o[k] > 0).map(([k, label]) => `${label}: ${o[k]}`).join(', ') || '-';
};

const nextDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return fmtDate(d.toISOString());
};

interface HotelStayRow {
  hotel?: HotelRef;
  roomType?: string;
  mealPlan?: string;
  occupancy?: RoomOccupancy;
  firstDate?: string;
  lastDate?: string;
}

// roomType is a frozen snapshot from whichever language the admin's panel
// was in when they picked the room, so it never re-translates when the
// customer switches language -- roomTypeRef is the live reference, still
// pointing at the real room type record, so it's what actually translates.
const roomTypeName = (d: { roomType?: string; roomTypeRef?: { name: string } }) => d.roomTypeRef?.name || d.roomType || '';

// The itinerary is one row per night, so a 2-night stay at the same hotel
// showed up as two identical-looking rows in the financial summary. Merges
// consecutive nights back into a single row (same hotel/room/meal plan/
// occupancy) spanning check-in to check-out, the way a real quote reads.
function mergeConsecutiveHotelStays(days: QuotationDay[]): HotelStayRow[] {
  const rows: HotelStayRow[] = [];
  let previousDay: QuotationDay | undefined;
  [...days].sort((a, b) => a.dayNumber - b.dayNumber).forEach((d) => {
    if (!d.hotel) {
      previousDay = undefined;
      return;
    }
    const last = rows[rows.length - 1];
    const sameStay = last && previousDay && d.dayNumber === previousDay.dayNumber + 1 &&
      d.numberOfRooms === previousDay.numberOfRooms &&
      last.hotel?._id === d.hotel?._id &&
      last.roomType === roomTypeName(d) &&
      last.mealPlan === d.mealPlan &&
      occupancyLabel(last.occupancy) === occupancyLabel(d.roomOccupancy);
    if (sameStay) {
      last.lastDate = d.date;
    } else {
      rows.push({ hotel: d.hotel, roomType: roomTypeName(d), mealPlan: d.mealPlan, occupancy: d.roomOccupancy, firstDate: d.date, lastDate: d.date });
    }
    previousDay = d;
  });
  return rows;
}

// This page has no navbar, so it doesn't inherit the site-wide language
// switcher. It picks up the site's current language as a starting point
// but then owns its own language independently -- an admin previewing a
// quotation, or a customer opening a shared link, can flip it here without
// touching the rest of the site's language.
export function QuotationView({ endpoint, backHref }: { endpoint: string; backHref?: string }) {
  const { t } = useTranslation('quotation');
  const [docLang, setDocLang] = useState<SupportedLanguageCode>(getCurrentLanguage());
  const [request, setRequest] = useState<QuotationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingPrint, setPreparingPrint] = useState(false);

  // The route map needs to resize (and often re-fetch different-zoom tiles)
  // for the print layout -- calling window.print() immediately after that
  // kicks off doesn't reliably give the browser time to actually load them
  // first, so the PDF could still capture a stale/wrong-looking map even
  // though the resize itself happened. Firing this ahead of time and
  // waiting a moment gives the new tiles a real chance to arrive.
  const handlePrint = () => {
    if (preparingPrint) return;
    setPreparingPrint(true);
    window.dispatchEvent(new Event('roxaval:prepare-print'));
    setTimeout(() => {
      window.print();
      setPreparingPrint(false);
    }, 900);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetOne<QuotationRequest>(endpoint, { lang: docLang }).
      then((r) => { if (!cancelled) setRequest(r); }).
      finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint, docLang]);

  if (loading && !request) {
    return <div className="grid min-h-screen place-items-center bg-cream"><Loader2Icon className="h-6 w-6 animate-spin text-forest/40" /></div>;
  }
  if (!request?.itinerary) {
    return <div className="grid min-h-screen place-items-center bg-cream text-sm text-forest/50">{t('notReady')}</div>;
  }

  const itin = request.itinerary;
  const days = itin.days || [];
  const nights = Math.max(0, days.length - 1);
  const showPrice = itin.pricing.showPrice !== false;

  // Ordered, de-duplicated route (consecutive repeats collapsed) built from
  // each day's destination tags — falls back to hotel destinations when a
  // day has no explicit destination set.
  const route: string[] = [];
  days.forEach((d) => {
    const name = d.destinations?.[0]?.name || d.hotel?.destination?.name;
    if (name && route[route.length - 1] !== name) route.push(name);
  });

  return (
    <div className="min-h-screen bg-cream/40 pb-20 print:min-h-0 print:pb-0">
      {/* Private, per-customer quotation - never indexable. */}
      <Seo title="Your Quotation | Roxaval Travels" description="Your personalised Sri Lanka tour quotation from Roxaval Travels." noindex />
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between bg-forest px-4 py-3 sm:px-8">
        <div className="flex items-center gap-4">
          {backHref &&
            <Link to={backHref} className="flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white">
              <ArrowLeftIcon className="h-3.5 w-3.5" /> {t('back')}
            </Link>
          }
          <p className="text-sm font-semibold text-white">{t('documentTitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            {SUPPORTED_LANGUAGES.map((l) =>
              <button
                key={l.code}
                type="button"
                onClick={() => setDocLang(l.code)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${docLang === l.code ? 'bg-gold text-forest' : 'text-white/70 hover:text-white'}`}
              >
                {l.code.toUpperCase()}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handlePrint}
            disabled={preparingPrint}
            className="flex items-center gap-2 rounded-full bg-gold px-4 py-2 text-xs font-semibold text-forest transition-transform hover:scale-105 disabled:cursor-wait disabled:hover:scale-100"
          >
            {preparingPrint ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PrinterIcon className="h-3.5 w-3.5" />} {t('print')}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-4xl rounded-2xl border border-forest/15 bg-white px-6 py-10 shadow-soft print:mt-0 print:rounded-none print:shadow-none sm:px-10">
        <img
          src={itin.bannerImage || resolveHeaderImage(request.travelers, request.travelStyle)}
          alt="Roxaval Travels"
          className="-mx-6 -mt-10 mb-8 h-60 w-[calc(100%+3rem)] max-w-none rounded-t-2xl object-cover print:mb-4 print:h-56 print:rounded-none sm:-mx-10 sm:h-80 sm:w-[calc(100%+5rem)]" />

        {/* Header */}
        <div className="border-b border-forest/10 pb-6 print:pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-display text-2xl font-semibold text-forest sm:text-3xl">{itin.title || t('defaultTitle', { days: days.length })}</p>
              <p className="mt-1 text-sm text-forest/50">{t('quotationNo', { ref: request.referenceNumber })}</p>
            </div>
            {showPrice && <div className="rounded-2xl bg-forest px-5 py-3 text-right text-white">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">{t('totalCost')}</p>
              <p className="font-display text-xl font-bold">{formatMoney(itin.pricing.totalPrice, itin.pricing.currency, docLang)}</p>
            </div>}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-forest/70">
            <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4 text-emerald" /> {t('duration', { nights, days: days.length })}</span>
            <span className="flex items-center gap-1.5"><UsersIcon className="h-4 w-4 text-emerald" /> {request.travelers.adults} {t('adults')}{request.travelers.children ? `, ${request.travelers.children} ${t('children')}` : ''}{request.travelers.infants ? `, ${request.travelers.infants} ${t('infants')}` : ''}</span>
            <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4 text-emerald" /> {fmtDate(request.travelDates.startDate)} – {fmtDate(request.travelDates.endDate)}</span>
          </div>

          {route.length > 0 &&
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-forest">
              {route.map((r, i) =>
                <React.Fragment key={i}>
                  {i > 0 && <ArrowRightIcon className="h-3.5 w-3.5 text-forest/30" />}
                  <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5 text-emerald" /> {r}</span>
                </React.Fragment>
              )}
            </div>
          }
        </div>

        <RouteMap days={days} lang={docLang} />

        {/* Day by day */}
        <div className="mt-8 space-y-8 print:mt-4 print:space-y-5">
          {days.map((d) => {
            const activities = (d.activityPricing || []).filter((a) => a.selected !== false && a.activity);
            const transfers = (d.transfers || []).filter((t) => t.selected !== false && t.transfer);
            const flights = (d.flights || []).filter((f) => f.selected !== false);

            return (
              <div key={d.dayNumber}>
                <div className="flex items-center gap-3 print:break-inside-avoid">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald text-sm font-bold text-white">{d.dayNumber}</div>
                  <div>
                    <p className="font-display text-base font-semibold text-forest">{t('day')} {String(d.dayNumber).padStart(2, '0')}{(d.title?.trim() || d.destinations?.[0]?.name) ? ` (${d.title?.trim() || d.destinations?.[0]?.name})` : ''}</p>
                    {d.date && <p className="text-xs text-forest/50">{fmtDate(d.date)}</p>}
                  </div>
                </div>

                <div className="mt-3 space-y-3 pl-12">
                  {d.notes && d.notes.trim() &&
                    <ul className="space-y-1 print:break-inside-avoid">
                      {d.notes.split('\n').map((line) => line.trim()).filter(Boolean).map((line, i) =>
                        <li key={i} className="flex gap-2 text-xs leading-relaxed text-forest/70">
                          <span className="text-emerald">•</span> <span>{line.replace(/^[-•]\s*/, '')}</span>
                        </li>
                      )}
                    </ul>
                  }
                  {activities.map((a, i) =>
                    <div key={i} className="flex gap-3 rounded-xl border border-forest/10 p-3 print:break-inside-avoid">
                      {a.activity?.image && <img src={a.activity.image} alt={a.activity.name} className="h-20 w-28 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-forest">{a.activity?.name}</p>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-emerald">{a.activity?.category || t('sightseeing')}</p>
                        <p className="mt-0.5 text-xs text-forest/50">{t('forTravelers')} {a.adultCount} {t('adults')}{a.childCount ? `, ${a.childCount} ${t('children')}` : ''}{a.infantCount ? `, ${a.infantCount} ${t('infants')}` : ''}</p>
                        {a.activity?.description && <p className="mt-1 text-xs leading-relaxed text-forest/60 line-clamp-3">{a.activity.description}</p>}
                      </div>
                    </div>
                  )}

                  {transfers.map((tr, i) =>
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-forest/10 p-3 print:break-inside-avoid">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-forest"><CarIcon className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-semibold text-forest">{tr.transfer?.name}</p>
                        <p className="text-xs text-forest/50">{tr.transfer?.type || t('private')} · {tr.transfer?.vehicle?.name || t('vehicle')} × {tr.vehicleCount}</p>
                      </div>
                    </div>
                  )}

                  {flights.map((f, i) =>
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-forest/10 p-3 print:break-inside-avoid">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-forest"><PlaneIcon className="h-5 w-5" /></div>
                      <div>
                        <p className="text-sm font-semibold text-forest">{f.airline} {f.flightNumber}</p>
                        <p className="text-xs text-forest/50">{f.from} → {f.to}{f.departureTime ? ` · ${f.departureTime}` : ''}</p>
                      </div>
                    </div>
                  )}

                  {d.hotel &&
                    <div className="flex gap-3 rounded-xl border border-emerald/20 bg-emerald/5 p-3 print:break-inside-avoid">
                      {d.hotel.images?.[0] && <img src={d.hotel.images[0]} alt={d.hotel.name} className="h-24 w-32 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-forest">
                          <BedDoubleIcon className="h-3.5 w-3.5 text-emerald" /> {d.hotel.name}
                          {Boolean(d.hotel.starRating) &&
                            <span className="flex items-center text-gold">{Array.from({ length: d.hotel.starRating || 0 }).map((_, s) => <StarIcon key={s} className="h-3 w-3 fill-gold" />)}</span>
                          }
                        </p>
                        <p className="text-xs text-forest/50">{d.hotel.destination?.name}{d.hotel.address ? ` · ${d.hotel.address}` : ''}</p>
                        <p className="mt-1 text-xs text-forest/70">
                          {t('checkIn')} {fmtDate(d.date)} · {t('checkOut')} {nextDate(d.date)}
                          {roomTypeName(d) && <> · {t('room')}: {roomTypeName(d)}</>}
                          {d.mealPlan && <> · {d.mealPlan}</>}
                        </p>
                        {d.hotel.description && <p className="mt-1 text-xs leading-relaxed text-forest/60 line-clamp-3">{d.hotel.description}</p>}
                      </div>
                    </div>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Vehicle & guide */}
        {(itin.vehicle || itin.tourGuide) &&
        <div className="mt-10 grid gap-6 border-t border-forest/10 pt-6 print:mt-6 print:break-inside-avoid sm:grid-cols-2">
            {itin.vehicle &&
          <div className="flex gap-3 rounded-xl border border-emerald/20 bg-emerald/5 p-3">
                {itin.vehicle.images?.[0] && <img src={itin.vehicle.images[0]} alt={itin.vehicle.name} className="h-24 w-32 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-forest"><CarIcon className="h-3.5 w-3.5 text-emerald" /> {t('vehicle')}</p>
                  <p className="mt-1 text-sm text-forest">{itin.vehicle.name}</p>
                  <p className="mt-0.5 text-xs text-forest/60">
                    {itin.vehicle.type}
                    {Boolean(itin.vehicle.capacity) && <> · {t('seats', { count: itin.vehicle.capacity })}</>}
                    {itin.vehicle.driverIncluded !== false && <> · {t('withDriver')}</>}
                  </p>
                </div>
              </div>
          }
            {itin.tourGuide &&
          <div className="flex gap-3 rounded-xl border border-emerald/20 bg-emerald/5 p-3">
                {itin.tourGuide.photo && <img src={itin.tourGuide.photo} alt={itin.tourGuide.name} className="h-24 w-24 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-forest"><UsersIcon className="h-3.5 w-3.5 text-emerald" /> {t('tourGuide')}</p>
                  <p className="mt-1 text-sm text-forest">{itin.tourGuide.name}</p>
                  {Boolean(itin.tourGuide.languages?.length) &&
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-forest/60"><LanguagesIcon className="h-3 w-3" /> {itin.tourGuide.languages!.join(', ')}</p>
              }
                  {Boolean(itin.tourGuide.yearsExperience) &&
              <p className="mt-0.5 text-xs text-forest/60">{t('yearsExperience', { count: itin.tourGuide.yearsExperience })}</p>
              }
                </div>
              </div>
          }
          </div>
        }

        {/* Financial summary */}
        <div className="mt-10 border-t border-forest/10 pt-6 print:mt-6 print:break-inside-avoid">
          <p className="font-display text-lg font-semibold text-forest">{showPrice ? t('financialSummary') : t('accommodationSummary')} {showPrice && <span className="text-sm font-normal text-forest/50">[ in {itin.pricing.currency} ]</span>}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead>
                <tr className="border-b border-forest/10 text-forest/50">
                  <th className="py-2 pr-3 font-semibold">{t('tableHotel')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('tableDestination')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('tableRoomType')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('tableMealPlan')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('tableRooms')}</th>
                  <th className="py-2 font-semibold">{t('tableStay')}</th>
                </tr>
              </thead>
              <tbody>
                {mergeConsecutiveHotelStays(days).map((row, i) => {
                  return (
                    <tr key={i} className="border-b border-forest/5">
                      <td className="py-2 pr-3 text-forest">{row.hotel?.name}{row.hotel?.starRating ? ` (${row.hotel.starRating}★)` : ''}</td>
                      <td className="py-2 pr-3 text-forest/70">{row.hotel?.destination?.name}</td>
                      <td className="py-2 pr-3 text-forest/70">{row.roomType || '-'}</td>
                      <td className="py-2 pr-3 text-forest/70">{row.mealPlan || '-'}</td>
                      <td className="py-2 pr-3 text-forest/70">{occupancyLabel(row.occupancy)}</td>
                      <td className="py-2 text-forest/70">{fmtDate(row.firstDate)} → {nextDate(row.lastDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col items-end gap-1 border-t border-forest/10 pt-4">
            {showPrice ? (
              <>
                {itin.pricing.discount > 0 &&
                  <p className="text-xs text-forest/50">{t('basePrice')}: {formatMoney(itin.pricing.basePrice, itin.pricing.currency, docLang)} &nbsp; {t('discount')}: {formatMoney(itin.pricing.discount, itin.pricing.currency, docLang)}</p>
                }
                <p className="font-display text-xl font-bold text-forest">
                  {t('total')}: {formatMoney(itin.pricing.totalPrice, itin.pricing.currency, docLang)}
                </p>
              </>
            ) : null}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${itin.sightseeingIncluded === false ? 'bg-gold/15 text-forest/70' : 'bg-emerald/10 text-emerald'}`}>
              {itin.sightseeingIncluded === false ? t('sightseeingNotIncluded') : t('sightseeingIncluded')}
            </span>
          </div>
        </div>

        {/* Inclusions / Exclusions */}
        <div className="mt-10 grid gap-8 border-t border-forest/10 pt-6 print:mt-6 print:break-inside-avoid sm:grid-cols-2">
          <div>
            <p className="font-display text-sm font-semibold text-emerald">✅ {t('inclusions')}</p>
            <div className="mt-3"><NotesBlock text={itin.inclusions} /></div>
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-red-600">❌ {t('exclusions')}</p>
            <div className="mt-3"><NotesBlock text={itin.exclusions} /></div>
          </div>
        </div>

        {(itin.visaRequirements || itin.travelInsurance) &&
          <div className="mt-8 grid gap-8 border-t border-forest/10 pt-6 print:mt-5 print:break-inside-avoid sm:grid-cols-2">
            {itin.visaRequirements &&
              <div>
                <p className="font-display text-sm font-semibold text-forest">{t('visaRequirements')}</p>
                <p className="mt-2 text-xs leading-relaxed text-forest/60">{itin.visaRequirements}</p>
              </div>
            }
            {itin.travelInsurance &&
              <div>
                <p className="font-display text-sm font-semibold text-forest">{t('travelInsurance')}</p>
                <p className="mt-2 text-xs leading-relaxed text-forest/60">{itin.travelInsurance}</p>
              </div>
            }
          </div>
        }

        {itin.cancellationPolicy &&
          <div className="mt-8 border-t border-forest/10 pt-6 print:mt-5 print:break-inside-avoid">
            <p className="font-display text-sm font-semibold text-forest">💸 {t('cancellationPolicy')}</p>
            <div className="mt-3"><NotesBlock text={itin.cancellationPolicy} /></div>
          </div>
        }

        {itin.customerFacingNotes &&
          <div className="mt-8 border-t border-forest/10 pt-6 print:mt-5 print:break-inside-avoid">
            <p className="font-display text-sm font-semibold text-forest">📌 {t('importantNotes')}</p>
            <div className="mt-3"><NotesBlock text={itin.customerFacingNotes} /></div>
          </div>
        }

        {/* Footer */}
        <div className="mt-10 border-t border-forest/10 pt-6 text-center text-xs text-forest/50 print:mt-6 print:break-inside-avoid">
          <p className="font-display text-sm font-semibold text-forest">Roxaval Travels</p>
          <p className="mt-1">{WHATSAPP_DISPLAY_SL} &nbsp;|&nbsp; {CONTACT_EMAIL} &nbsp;|&nbsp; {WEBSITE_DISPLAY}</p>
        </div>
      </div>
    </div>
  );
}
