import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2Icon, SaveIcon, SearchIcon } from 'lucide-react';
import { apiGetAll, apiPost, ApiRequestError } from '../../../lib/api';
import { useToast } from '../../components/ToastProvider';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { TextField, TextAreaField, NumberField } from '../../components/fields/Fields';
import { formatDate } from '../../../lib/date';

interface CustomerRow {
  _id: string;
  user?: { fullName?: string; email?: string; phone?: string };
}

interface QuotationRow {
  _id: string;
  referenceNumber: string;
  travelDates?: { startDate: string; endDate: string };
  itinerary?: { _id: string; status: string; pricing?: { totalPrice?: number; currency?: string } };
}

export function AdminBookingNew() {
  const navigate = useNavigate();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerId, setCustomerId] = useState('');

  const [quotations, setQuotations] = useState<QuotationRow[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);
  const [itineraryId, setItineraryId] = useState('');

  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    apiGetAll<CustomerRow>('/customers', { sort: 'id' }).then((r) => setCustomers(r.data)).catch(() => toast('Unable to load customers. Please reload and try again.', 'error'));
  }, []);

  useEffect(() => {
    setItineraryId('');
    setQuotations([]);
    setQuotationsLoading(false);
    if (!customerId) {
      setQuotations([]);
      return;
    }
    setQuotationsLoading(true);
    let active = true;
    apiGetAll<QuotationRow>('/custom-tours', { customer: customerId, sort: 'id' }).
    then((r) => { if (active) setQuotations(r.data.filter((q) => q.itinerary && ['Sent', 'Accepted'].includes(q.itinerary.status))); }).
    catch(() => { if (active) toast('Unable to load quotations. Please select the customer again.', 'error'); }).
    finally(() => { if (active) setQuotationsLoading(false); });
    return () => { active = false; };
  }, [customerId]);

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const term = customerSearch.toLowerCase();
    return c.user?.fullName?.toLowerCase().includes(term) || c.user?.email?.toLowerCase().includes(term);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast('Please select the customer.', 'error');
      return;
    }
    if (!itineraryId) {
      toast('Please select the quotation this booking is for.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await apiPost<{ _id: string }>('/bookings/admin/create', {
        customer: customerId,
        itinerary: itineraryId,
        travelDate,
        travelers: { adults, children, infants },
        specialRequests
      });
      toast('Booking created.');
      navigate(`/admin/bookings/${result._id}`);
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to create booking.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Booking" subtitle="Add a booking confirmed over WhatsApp, phone or email on behalf of a customer" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <p className="mb-4 font-display text-sm font-semibold text-forest">Customer</p>
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
            <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search by name or email…" className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald" />
          </div>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-forest/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald">
            <option value="">Select customer…</option>
            {filteredCustomers.map((c) => <option key={c._id} value={c._id}>{c.user?.fullName} ({c.user?.email})</option>)}
          </select>
        </div>

        {customerId &&
        <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="mb-4 font-display text-sm font-semibold text-forest">Quotation</p>
            {quotationsLoading ?
          <div className="flex items-center gap-2 text-sm text-forest/50"><Loader2Icon className="h-4 w-4 animate-spin" /> Loading this customer's quotations…</div> :
          quotations.length === 0 ?
          <p className="text-sm text-forest/40">This customer has no sent quotation yet. Build and send one from Custom Tour Requests first.</p> :

          <div className="space-y-2">
                {quotations.map((q) => {
              const noPrice = !q.itinerary?.pricing?.totalPrice;
              return (
                <label key={q._id} className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition-colors ${noPrice ? 'cursor-not-allowed border-forest/10 opacity-60' : 'cursor-pointer'} ${itineraryId === q.itinerary!._id ? 'border-emerald bg-emerald/5' : 'border-forest/15 hover:bg-cream'}`}>
                    <div className="flex items-center gap-3">
                      <input type="radio" name="itinerary" disabled={noPrice} checked={itineraryId === q.itinerary!._id} onChange={() => setItineraryId(q.itinerary!._id)} className="h-4 w-4 accent-emerald" />
                      <div>
                        <p className="text-sm font-semibold text-forest">{q.referenceNumber}</p>
                        {q.travelDates &&
                    <p className="text-xs text-forest/50">{formatDate(q.travelDates.startDate)} — {formatDate(q.travelDates.endDate)}</p>
                    }
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {noPrice ?
                  <span className="text-xs font-semibold text-red-600" title="Open this request in Custom Tour Requests, set the pricing, and save before it can be booked.">No price set</span> :

                  <span className="text-sm font-semibold text-forest">{q.itinerary!.pricing!.currency} {q.itinerary!.pricing!.totalPrice!.toLocaleString()}</span>
                  }
                      <StatusBadge status={q.itinerary!.status} />
                    </div>
                  </label>);

            })}
              </div>
          }
          </div>
        }

        <div className="rounded-2xl bg-white p-6 shadow-soft">
          <p className="mb-4 font-display text-sm font-semibold text-forest">Trip Details</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TextField label="Travel Date" type="date" value={travelDate} onChange={setTravelDate} required />
            <NumberField label="Adults" value={adults} onChange={setAdults} min={1} required />
            <NumberField label="Children" value={children} onChange={setChildren} min={0} />
            <NumberField label="Infants" value={infants} onChange={setInfants} min={0} />
          </div>
          <div className="mt-4">
            <TextAreaField label="Special Requests" value={specialRequests} onChange={setSpecialRequests} rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/admin/bookings')} className="rounded-full border border-forest/15 px-6 py-3 text-sm font-semibold text-forest hover:bg-cream">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-full bg-forest px-6 py-3 text-sm font-semibold text-cream hover:bg-emerald disabled:opacity-70">
            {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
            Create Booking
          </button>
        </div>
      </form>
    </div>);

}
