import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarIcon, CheckIcon, DownloadIcon, EyeIcon, Loader2Icon, PencilIcon, PlusIcon, UsersIcon, XIcon } from 'lucide-react';
import { apiGetOne, apiPatch, apiPost, ApiRequestError, documentFileUrl } from '../../../lib/api';
import { formatDate, formatDateTime } from '../../../lib/date';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { TextField, NumberField, SelectField, TextAreaField } from '../../components/fields/Fields';
import { HotelVouchersPanel } from '../../components/HotelVouchersPanel';

interface PaymentItem {
  _id: string;
  paymentReference: string;
  amount: number;
  currency: string;
  method: string;
  paymentType: string;
  paymentDate?: string;
  bankReference?: string;
  notes?: string;
  status: string;
  createdAt: string;
  voidReason?: string;
  voidedAt?: string;
}

interface BookingDetail {
  _id: string;
  bookingReference: string;
  customer?: { user?: { fullName?: string; email?: string; phone?: string } };
  sourceType: string;
  tourPackage?: { name: string; heroImage?: string };
  itinerary?: { pricing?: { totalPrice?: number } };
  travelDate: string;
  returnDate?: string;
  travelers: { adults: number; children: number; infants: number };
  pricing: {
    subtotal: number; discount: number; totalAmount: number; advanceAmount: number; balanceAmount: number;
    amountPaid: number; currency: string; remainingBalance: number; paymentStatus: 'Unpaid' | 'Partially Paid' | 'Fully Paid';
    advancePercentage: number;
  };
  status: string;
  specialRequests: string;
  statusHistory: { status: string; note: string; at: string }[];
  createdAt: string;
  driverName?: string;
  driverPhone?: string;
  payments?: PaymentItem[];
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  'Pending': ['Awaiting Approval', 'Confirmed', 'Cancelled'],
  'Awaiting Approval': ['Approved', 'Confirmed', 'Cancelled'],
  'Approved': ['Payment Pending', 'Confirmed', 'Cancelled'],
  'Payment Pending': ['Payment Verification', 'Confirmed', 'Cancelled'],
  'Payment Verification': ['Confirmed', 'Payment Pending', 'Cancelled'],
  'Confirmed': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': []
};

// "Client Voucher"/"Customer Itinerary" are the spec's names for what the
// backend already generates as 'booking_confirmation'/'itinerary' -- no new
// document types needed for those two. Driver Itinerary is admin-only and
// only available once the booking is actually Confirmed (enforced server-
// side too; the client-side gate here is just so staff aren't shown a
// button that will 400).
const DOCUMENT_TYPES: { label: string; path: string; requiresConfirmed?: boolean }[] = [
{ label: 'Customer Itinerary', path: 'itinerary' },
{ label: 'Driver Itinerary', path: 'driver-itinerary', requiresConfirmed: true },
{ label: 'Client Voucher', path: 'confirmation' },
{ label: 'Invoice', path: 'invoice' }];

const PAYMENT_METHOD_OPTIONS = ['bank_transfer', 'cash', 'card', 'online', 'whatsapp', 'other'].map((v) => ({
  label: v.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
  value: v
}));

const titleCase = (v: string) => v.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

export function AdminBookingDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, { id: string; fileName: string }>>({});

  const [editingDriver, setEditingDriver] = useState(false);
  const [driverNameInput, setDriverNameInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);

  const [editingAdvance, setEditingAdvance] = useState(false);
  const [advanceMode, setAdvanceMode] = useState<'percentage' | 'amount'>('percentage');
  const [advanceValue, setAdvanceValue] = useState(0);
  const [savingAdvance, setSavingAdvance] = useState(false);

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentInputMode, setPaymentInputMode] = useState<'amount' | 'percentage'>('amount');
  const [paymentPercentage, setPaymentPercentage] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [lastPaymentSummary, setLastPaymentSummary] = useState<{ remainingBalance: number; currency: string; paymentStatus: string } | null>(null);

  const [voidingPaymentId, setVoidingPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voidingBusy, setVoidingBusy] = useState(false);

  const load = () => {
    if (!id) return Promise.resolve(undefined);
    return apiGetOne<BookingDetail>(`/bookings/${id}`).then((b) => {
      setBooking(b);
      return b;
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    setGeneratedDocs({});
  }, [id]);

  const changeStatus = (nextStatus: string) => {
    const isCancel = nextStatus === 'Cancelled';
    confirm({
      title: `${isCancel ? 'Cancel' : 'Update'} booking?`,
      message: `Move booking ${booking?.bookingReference} to "${nextStatus}"?`,
      confirmLabel: 'Confirm',
      tone: isCancel ? 'danger' : 'default',
      onConfirm: async () => {
        setTransitioning(true);
        try {
          await apiPatch(`/bookings/${id}/status`, { status: nextStatus, note });
          toast(`Booking updated to ${nextStatus}.`);
          setNote('');
          load();
        } catch (err) {
          toast(err instanceof ApiRequestError ? err.message : 'Failed to update status.', 'error');
        } finally {
          setTransitioning(false);
        }
      }
    });
  };

  const generateDocument = async (docPath: string, label: string) => {
    setGenerating(docPath);
    try {
      const result = await apiPost<{ _id: string; fileName: string } | { _id: string; fileName: string }[]>(`/documents/bookings/${id}/${docPath}`);
      const first = Array.isArray(result) ? result[0] : result;
      if (first?._id) {
        setGeneratedDocs((prev) => ({ ...prev, [docPath]: { id: first._id, fileName: first.fileName } }));
        window.open(documentFileUrl(first._id), '_blank');
        toast(`${label} generated.`);
      }
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : `Failed to generate ${label}.`, 'error');
    } finally {
      setGenerating(null);
    }
  };

  const startEditDriver = () => {
    setDriverNameInput(booking?.driverName || '');
    setDriverPhoneInput(booking?.driverPhone || '');
    setEditingDriver(true);
  };

  const saveDriver = async () => {
    setSavingDriver(true);
    try {
      await apiPatch(`/bookings/${id}/driver`, { driverName: driverNameInput || null, driverPhone: driverPhoneInput || null });
      toast('Driver details updated.');
      setEditingDriver(false);
      load();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to update driver details.', 'error');
    } finally {
      setSavingDriver(false);
    }
  };

  const startEditAdvance = () => {
    setAdvanceMode('percentage');
    setAdvanceValue(booking?.pricing.advancePercentage || 0);
    setEditingAdvance(true);
  };

  const saveAdvance = async () => {
    setSavingAdvance(true);
    try {
      await apiPatch(`/bookings/${id}/advance`, advanceMode === 'percentage' ? { percentage: advanceValue } : { amount: advanceValue });
      toast('Expected advance updated.');
      setEditingAdvance(false);
      load();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to update expected advance.', 'error');
    } finally {
      setSavingAdvance(false);
    }
  };

  // Percentage is a pure UI convenience -- any percentage, not just fixed
  // presets -- that computes the amount actually sent to the backend.
  // The backend itself only ever stores/validates a plain amount.
  const applyPaymentPercentage = (pct: number) => {
    setPaymentPercentage(pct);
    if (booking) {
      setPaymentAmount(Math.round(booking.pricing.totalAmount * pct / 100 * 100) / 100);
    }
  };

  const submitPayment = async () => {
    if (paymentAmount <= 0) {
      toast('Enter an amount greater than zero.', 'error');
      return;
    }
    setSubmittingPayment(true);
    try {
      await apiPost(`/bookings/${id}/payments`, {
        amount: paymentAmount,
        method: paymentMethod,
        paymentDate,
        reference: paymentReference || undefined,
        notes: paymentNotes || undefined
      });
      toast('Payment recorded.');
      setShowAddPayment(false);
      setPaymentAmount(0);
      setPaymentPercentage(0);
      setPaymentReference('');
      setPaymentNotes('');
      const updated = await load();
      if (updated) {
        setLastPaymentSummary({
          remainingBalance: updated.pricing.remainingBalance,
          currency: updated.pricing.currency,
          paymentStatus: updated.pricing.paymentStatus
        });
      }
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to record payment.', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const startVoidPayment = (paymentId: string) => {
    setVoidingPaymentId(paymentId);
    setVoidReason('');
  };

  const confirmVoidPayment = async () => {
    if (!voidingPaymentId) return;
    if (voidReason.trim().length < 3) {
      toast('Enter a reason (at least 3 characters) for voiding this payment.', 'error');
      return;
    }
    setVoidingBusy(true);
    try {
      await apiPatch(`/payments/${voidingPaymentId}/void`, { reason: voidReason.trim() });
      toast('Payment voided.');
      setVoidingPaymentId(null);
      setVoidReason('');
      load();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to void payment.', 'error');
    } finally {
      setVoidingBusy(false);
    }
  };

  if (loading || !booking) return <div className="grid h-64 place-items-center"><Loader2Icon className="h-6 w-6 animate-spin text-forest/40" /></div>;

  const nextStatuses = VALID_TRANSITIONS[booking.status] || [];

  return (
    <div>
      <PageHeader
        title={`Booking ${booking.bookingReference}`}
        subtitle={`Created ${formatDateTime(booking.createdAt)}`}
        action={<button onClick={() => navigate('/admin/bookings')} className="rounded-full border border-forest/15 px-5 py-2.5 text-sm font-semibold text-forest hover:bg-cream">Back to list</button>} />


      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-forest">Trip Details</p>
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-forest/50">Package</p>
                <p className="mt-1 text-sm text-forest">{booking.tourPackage?.name || 'Customized Tour'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-forest/50">Source</p>
                <p className="mt-1 text-sm capitalize text-forest">{booking.sourceType}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-forest/50">Travel Date</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-forest"><CalendarIcon className="h-3.5 w-3.5" /> {formatDate(booking.travelDate)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-forest/50">Travelers</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-forest"><UsersIcon className="h-3.5 w-3.5" /> {booking.travelers.adults} Adults, {booking.travelers.children} Children, {booking.travelers.infants} Infants</p>
              </div>
            </div>
            {booking.specialRequests &&
            <div className="mt-4">
                <p className="text-xs font-semibold uppercase text-forest/50">Special Requests</p>
                <p className="mt-1 text-sm text-forest/70">{booking.specialRequests}</p>
              </div>
            }
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-semibold text-forest">Payment Summary</p>
              <StatusBadge status={booking.pricing.paymentStatus} />
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-forest/60">Subtotal</span><span className="text-forest">{booking.pricing.currency} {booking.pricing.subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-forest/60">Discount</span><span className="text-forest">-{booking.pricing.currency} {booking.pricing.discount.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-forest/10 pt-2 font-semibold"><span className="text-forest">Total Booking Amount</span><span className="text-forest">{booking.pricing.currency} {booking.pricing.totalAmount.toLocaleString()}</span></div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-forest/60">Expected Advance ({booking.pricing.advancePercentage}%)</span>
                  <span className="flex items-center gap-1.5 text-forest">
                    {booking.pricing.currency} {booking.pricing.advanceAmount.toLocaleString()}
                    {!editingAdvance &&
                    <button onClick={startEditAdvance} title="Edit expected advance" className="text-forest/40 hover:text-forest">
                        <PencilIcon className="h-3 w-3" />
                      </button>
                    }
                  </span>
                </div>
                {editingAdvance &&
                <div className="mt-2 space-y-2 rounded-lg bg-cream/50 p-3">
                    <SelectField
                    label="Set by"
                    value={advanceMode}
                    onChange={(v) => setAdvanceMode(v as 'percentage' | 'amount')}
                    options={[{ label: 'Percentage of total', value: 'percentage' }, { label: `Fixed amount (${booking.pricing.currency})`, value: 'amount' }]} />

                    <NumberField label={advanceMode === 'percentage' ? 'Percentage' : `Amount (${booking.pricing.currency})`} value={advanceValue} onChange={setAdvanceValue} min={0} />
                    <div className="flex gap-2">
                      <button onClick={saveAdvance} disabled={savingAdvance} className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald disabled:opacity-60">
                        {savingAdvance ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />} Save
                      </button>
                      <button onClick={() => setEditingAdvance(false)} className="flex items-center gap-1.5 rounded-lg border border-forest/15 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream">
                        <XIcon className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </div>
                    <p className="text-xs text-forest/50">This only changes the expected deposit figure, never what's actually been received.</p>
                  </div>
                }
              </div>

              <div className="flex justify-between border-t border-forest/10 pt-2"><span className="text-forest/60">Total Amount Received</span><span className="font-semibold text-emerald">{booking.pricing.currency} {(booking.pricing.amountPaid || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-forest/60">Remaining Balance</span><span className="font-semibold text-forest">{booking.pricing.currency} {booking.pricing.remainingBalance.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-sm font-semibold text-forest">Payment History</p>
              <button
                onClick={() => {
                  setShowAddPayment((v) => !v);
                  setLastPaymentSummary(null);
                }}
                className="flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-emerald">

                <PlusIcon className="h-3.5 w-3.5" /> Add Payment
              </button>
            </div>

            {showAddPayment &&
            <div className="mt-4 space-y-3 rounded-xl border border-forest/10 bg-cream/30 p-4">
                <p className="text-xs text-forest/60">Record a payment that has already been received (cash, a confirmed bank transfer, etc). This does not initiate a new charge.</p>
                <SelectField
                label="Enter amount by"
                value={paymentInputMode}
                onChange={(v) => setPaymentInputMode(v as 'amount' | 'percentage')}
                options={[{ label: 'Fixed amount', value: 'amount' }, { label: 'Percentage of total', value: 'percentage' }]} />

                <div className="grid gap-3 sm:grid-cols-2">
                  {paymentInputMode === 'percentage' ?
                  <>
                      <NumberField label="Percentage of total" value={paymentPercentage} onChange={applyPaymentPercentage} min={0} />
                      <div>
                        <p className="mb-1.5 text-xs font-medium text-forest/70">Amount ({booking.pricing.currency})</p>
                        <p className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm text-forest">{paymentAmount.toLocaleString()}</p>
                      </div>
                    </> :

                  <NumberField label={`Amount (${booking.pricing.currency})`} value={paymentAmount} onChange={setPaymentAmount} min={0} />
                  }
                  <SelectField label="Method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHOD_OPTIONS} />
                  <TextField label="Date Received" type="date" value={paymentDate} onChange={setPaymentDate} />
                  <TextField label="Reference / Transaction No. (optional)" value={paymentReference} onChange={setPaymentReference} />
                </div>
                <TextAreaField label="Notes (optional)" value={paymentNotes} onChange={setPaymentNotes} rows={2} />
                <div className="flex gap-2">
                  <button onClick={submitPayment} disabled={submittingPayment || paymentAmount <= 0} className="flex items-center gap-2 rounded-lg bg-forest px-4 py-2 text-xs font-semibold text-white hover:bg-emerald disabled:opacity-60">
                    {submittingPayment && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />} Record Payment
                  </button>
                  <button onClick={() => setShowAddPayment(false)} className="rounded-lg border border-forest/15 px-4 py-2 text-xs font-semibold text-forest hover:bg-cream">Cancel</button>
                </div>
              </div>
            }

            {lastPaymentSummary &&
            <div className="mt-4 space-y-3 rounded-xl border border-emerald/30 bg-emerald/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-forest">Payment recorded</p>
                  <StatusBadge status={lastPaymentSummary.paymentStatus} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-forest/60">Remaining Balance</span>
                  <span className="font-semibold text-forest">{lastPaymentSummary.currency} {lastPaymentSummary.remainingBalance.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => generateDocument('invoice', 'Invoice')} disabled={generating === 'invoice'} className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald disabled:opacity-60">
                    {generating === 'invoice' ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <EyeIcon className="h-3.5 w-3.5" />} {generatedDocs.invoice ? 'Regenerate Invoice' : 'Generate Invoice'}
                  </button>
                  {generatedDocs.invoice &&
                  <>
                      <a href={documentFileUrl(generatedDocs.invoice.id)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-forest/60 hover:text-forest">
                        <EyeIcon className="h-3 w-3" /> Preview / Print
                      </a>
                      <a href={documentFileUrl(generatedDocs.invoice.id, true)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-forest/60 hover:text-forest">
                        <DownloadIcon className="h-3 w-3" /> Download
                      </a>
                    </>
                  }
                </div>
              </div>
            }

            <div className="mt-4 space-y-2">
              {(!booking.payments || booking.payments.length === 0) && <p className="text-sm text-forest/40">No payments recorded yet.</p>}
              {booking.payments?.map((p) =>
              <div key={p._id} className="border-b border-forest/5 pb-2.5 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className={`text-sm font-medium text-forest ${p.status === 'Voided' ? 'line-through text-forest/40' : ''}`}>
                        {p.currency} {p.amount.toLocaleString()} <span className="font-normal text-forest/50">· {titleCase(p.method)}</span>
                      </p>
                      <p className="text-xs text-forest/50">
                        {formatDate(p.paymentDate || p.createdAt)}{p.bankReference ? ` · Ref: ${p.bankReference}` : ''}
                      </p>
                      {p.notes && <p className="mt-0.5 text-xs text-forest/40">{p.notes}</p>}
                      {p.status === 'Voided' && p.voidReason && <p className="mt-0.5 text-xs text-red-500">Voided: {p.voidReason}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={p.status} />
                      {p.status === 'Verified' &&
                      <button onClick={() => startVoidPayment(p._id)} title="Void this payment" className="text-xs font-semibold text-red-500 hover:text-red-600">
                          Void
                        </button>
                      }
                    </div>
                  </div>
                  {voidingPaymentId === p._id &&
                  <div className="mt-2 space-y-2 rounded-lg bg-red-50 p-3">
                      <TextAreaField label="Reason for voiding (required)" value={voidReason} onChange={setVoidReason} rows={2} />
                      <p className="text-xs text-forest/50">This payment will never be deleted — it stays on record as voided and drops out of all totals and the invoice.</p>
                      <div className="flex gap-2">
                        <button onClick={confirmVoidPayment} disabled={voidingBusy || voidReason.trim().length < 3} className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                          {voidingBusy && <Loader2Icon className="h-3.5 w-3.5 animate-spin" />} Confirm Void
                        </button>
                        <button onClick={() => setVoidingPaymentId(null)} className="flex items-center gap-1.5 rounded-lg border border-forest/15 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream">
                          <XIcon className="h-3.5 w-3.5" /> Cancel
                        </button>
                      </div>
                    </div>
                  }
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Status History</p>
            <div className="mt-3 space-y-3">
              {booking.statusHistory.length === 0 && <p className="text-sm text-forest/40">No history yet.</p>}
              {booking.statusHistory.map((h, i) =>
              <div key={i} className="flex items-start justify-between gap-3 border-b border-forest/5 pb-2.5 last:border-0">
                  <div>
                    <StatusBadge status={h.status} />
                    {h.note && <p className="mt-1 text-xs text-forest/60">{h.note}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-forest/40">{formatDateTime(h.at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Customer</p>
            <p className="mt-3 text-sm font-medium text-forest">{booking.customer?.user?.fullName}</p>
            <p className="text-xs text-forest/60">{booking.customer?.user?.email}</p>
            <p className="text-xs text-forest/60">{booking.customer?.user?.phone}</p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Update Status</p>
            {nextStatuses.length === 0 ?
            <p className="mt-3 text-sm text-forest/40">This booking is in a final state.</p> :

            <>
                <div className="mt-3"><TextAreaField label="Note (optional)" value={note} onChange={setNote} rows={2} /></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextStatuses.map((s) =>
                <button
                  key={s}
                  disabled={transitioning}
                  onClick={() => changeStatus(s)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                  s === 'Cancelled' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-forest text-cream hover:bg-emerald'}`
                  }>

                      {s}
                    </button>
                )}
                </div>
              </>
            }
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Driver Info</p>
            {!editingDriver &&
            <button onClick={startEditDriver} className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-forest/50 hover:text-forest">
                <PencilIcon className="h-3 w-3" /> {booking.driverName ? 'Edit' : 'Assign a driver'}
              </button>
            }
            {!editingDriver ?
            booking.driverName ?
            <div className="mt-2 text-sm">
                  <p className="font-medium text-forest">{booking.driverName}</p>
                  {booking.driverPhone && <p className="text-forest/60">{booking.driverPhone}</p>}
                </div> :

            <p className="mt-2 text-sm text-forest/40">No driver assigned yet.</p> :


            <div className="mt-3 space-y-3">
                <TextField label="Driver Name" value={driverNameInput} onChange={setDriverNameInput} />
                <TextField label="Driver Contact" value={driverPhoneInput} onChange={setDriverPhoneInput} />
                <div className="flex gap-2">
                  <button onClick={saveDriver} disabled={savingDriver} className="flex items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald disabled:opacity-60">
                    {savingDriver ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <CheckIcon className="h-3.5 w-3.5" />} Save
                  </button>
                  <button onClick={() => setEditingDriver(false)} className="flex items-center gap-1.5 rounded-lg border border-forest/15 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream">
                    <XIcon className="h-3.5 w-3.5" /> Cancel
                  </button>
                </div>
              </div>
            }
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Booking Documents</p>
            <div className="mt-3 space-y-3">
              {DOCUMENT_TYPES.map((d) => {
                const blocked = d.requiresConfirmed && !['Confirmed', 'Completed'].includes(booking.status);
                const doc = generatedDocs[d.path];
                return (
                  <div key={d.path} className="rounded-xl border border-forest/10 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-forest">{d.label}</span>
                      <button
                        disabled={generating === d.path || blocked}
                        onClick={() => generateDocument(d.path, d.label)}
                        title={blocked ? 'Available once this booking is Confirmed.' : undefined}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald disabled:opacity-50">

                        {generating === d.path ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <EyeIcon className="h-3.5 w-3.5" />}
                        {doc ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                    {blocked && <p className="mt-1 text-xs text-forest/40">Available once this booking is Confirmed.</p>}
                    {doc &&
                    <div className="mt-2 flex gap-3">
                        <a href={documentFileUrl(doc.id)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-forest/60 hover:text-forest">
                          <EyeIcon className="h-3 w-3" /> Preview / Print
                        </a>
                        <a href={documentFileUrl(doc.id, true)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-semibold text-forest/60 hover:text-forest">
                          <DownloadIcon className="h-3 w-3" /> Download
                        </a>
                      </div>
                    }
                  </div>);

              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <HotelVouchersPanel bookingId={id!} bookingStatus={booking.status} />
      </div>
    </div>);

}
