import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { apiGetList } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { copy } from '../../i18n';

interface UpcomingBooking {
  _id: string;
  bookingReference: string;
  tourPackage?: { name: string };
  itinerary?: { title?: string };
  travelDate: string;
}

/**
 * "Hello {name} — your next adventure starts in N days" hero, based on the
 * nearest upcoming Confirmed booking. Renders nothing if none exists.
 */
export function CountdownWidget() {
  const { i18n } = useTranslation('common');
  const { user } = useAuth();
  const [booking, setBooking] = useState<UpcomingBooking | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString();
    apiGetList<UpcomingBooking>('/bookings/my-bookings', {
      status: 'Confirmed',
      'travelDate[gte]': today,
      sort: 'travelDate',
      limit: 1,
    }).
    then(({ data }) => {
      if (!cancelled) setBooking(data[0] || null);
    }).
    catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  if (!booking) return null;

  const days = Math.max(0, Math.ceil((new Date(booking.travelDate).getTime() - Date.now()) / 86400000));
  const tourName = booking.tourPackage?.name || booking.itinerary?.title || copy('your custom tour');

  return (
    <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-forest to-emerald p-6 text-white shadow-lift sm:flex-row sm:items-center">
      <div>
        <p className="text-lg font-semibold">{copy('Hello {{name}}', { name: user?.fullName?.split(' ')[0] || copy('Traveler') })} 👋</p>
        <p className="mt-1 text-cream/85">
          <span className="font-semibold text-white">{tourName}</span> — {copy('Your next adventure starts in')}{' '}
          <span className="font-display text-2xl font-bold text-gold">{days}</span> {copy(days === 1 ? 'Day' : 'Days')}
        </p>
      </div>
      <Link
        to={`/my-tours/bookings/${booking._id}`}
        className="flex shrink-0 items-center gap-2 rounded-full bg-gold px-6 py-3 text-sm font-semibold text-forest transition-transform hover:scale-105">
        {copy('View Tour')} <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>);

}
