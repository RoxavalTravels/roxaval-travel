import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, Loader2Icon, PlusIcon, SearchIcon, UserCheckIcon, XCircleIcon } from 'lucide-react';
import { useAdminList } from '../../hooks/useAdminList';
import { DataTable, Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { PriorityBadge } from '../../components/PriorityBadge';
import { useToast } from '../../components/ToastProvider';
import { apiDelete, apiPatch, apiPost, ApiRequestError } from '../../../lib/api';
import { useConfirm } from '../../components/ConfirmDialog';
import { formatDate } from '../../../lib/date';

interface AdminCustomRequest {
  _id: string;
  referenceNumber: string;
  customer?: { user?: { fullName?: string; email?: string } };
  travelDates: { startDate: string; endDate: string };
  travelers: { adults: number; children: number };
  estimatedBudget: { amount: number; currency: string };
  status: string;
  priority: string;
  assignedAdmin?: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['Pending', 'Under Review', 'Awaiting Customer Approval', 'Approved', 'Rejected', 'Booking Confirmed'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];
const SORT_OPTIONS = [
{ value: '-createdAt', label: 'Newest Submitted' },
{ value: 'createdAt', label: 'Oldest Submitted' },
{ value: 'travelDates.startDate', label: 'Arrival Date (soonest)' },
{ value: '-travelDates.startDate', label: 'Arrival Date (latest)' }];


function tripDays(r: AdminCustomRequest) {
  const ms = new Date(r.travelDates.endDate).getTime() - new Date(r.travelDates.startDate).getTime();
  return Math.max(1, Math.round(ms / 86400000));
}

export function AdminCustomRequestsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const toast = useToast();
  const confirm = useConfirm();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { items, meta, loading, error, page, setPage, refetch } = useAdminList<AdminCustomRequest>('/custom-tours', {
    q: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    sort
  });

  const assignToMe = async (id: string) => {
    setAssigningId(id);
    try {
      await apiPatch(`/custom-tours/${id}/assign`, {});
      toast('Request assigned to you.');
      refetch();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to assign request.', 'error');
    } finally {
      setAssigningId(null);
    }
  };

  // price is only sent on the retry after the backend says one is needed
  // (no sent/priced quotation yet) -- the common case (a priced quotation
  // already exists) never prompts for it at all.
  const confirmBooking = async (r: AdminCustomRequest, price?: string) => {
    setConfirmingId(r._id);
    try {
      await apiPost(`/bookings/confirm-inquiry/${r._id}`, price ? { price: Number(price) } : undefined);
      toast('Booking confirmed.');
      refetch();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Could not confirm booking.';
      if (!price && message.includes('enter a price')) {
        confirm({
          title: 'Enter a price to confirm',
          message: `${r.referenceNumber} has no sent, priced quotation yet. Enter the agreed total price (USD) to confirm this booking directly, skipping the Itinerary Builder. The customer will be notified.`,
          confirmLabel: 'Confirm Booking',
          input: { label: 'Total price (USD)', type: 'number', placeholder: 'e.g. 1200', required: true },
          onConfirm: (value) => confirmBooking(r, value),
        });
      } else {
        toast(message, 'error');
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const columns: Column<AdminCustomRequest>[] = [
  { header: 'Inquiry ID', render: (r) => <span className="font-mono text-xs font-semibold">{r.referenceNumber}</span> },
  { header: 'Customer', render: (r) => r.customer?.user?.fullName || '-' },
  { header: 'Submitted', render: (r) => formatDate(r.createdAt) },
  { header: 'Arrival Date', render: (r) => formatDate(r.travelDates.startDate) },
  { header: 'Days', render: (r) => tripDays(r) },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { header: 'Priority', render: (r) => <PriorityBadge priority={r.priority} /> },
  {
    header: 'Quick Actions',
    render: (r) =>
    <div className="flex items-center gap-1.5">
          {!r.assignedAdmin &&
      <button
        onClick={() => assignToMe(r._id)}
        disabled={assigningId === r._id}
        title="Assign to me"
        className="grid h-8 w-8 place-items-center rounded-lg text-forest/60 hover:bg-cream hover:text-forest disabled:opacity-50">

              {assigningId === r._id ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <UserCheckIcon className="h-4 w-4" />}
            </button>
      }
          {r.status !== 'Booking Confirmed' ? <button type="button" disabled={confirmingId !== null} onClick={() => confirm({
            title: 'Confirm booking?',
            message: `Confirm ${r.referenceNumber} for ${r.customer?.user?.fullName || 'this customer'} using the saved quotation, dates and travelers? Only continue after the customer has confirmed the booking. A booking will be created or its existing booking confirmed, and the customer notified. This does not mark any payment as paid. If there's no sent, priced quotation yet, you'll be asked for a price next.`,
            confirmLabel: 'Confirm Booking',
            onConfirm: () => confirmBooking(r)
          })} className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald hover:bg-cream disabled:opacity-50">{confirmingId === r._id ? 'Confirming…' : 'Confirm Booking'}</button> :
          <button type="button" disabled={confirmingId !== null} onClick={() => confirm({
            title: 'Un-confirm this booking?',
            message: `Undo the confirmation for ${r.referenceNumber}? Only possible while no payment has been recorded yet -- use this to correct a confirmation that was clicked by mistake. The customer will be notified that it's under review again.`,
            confirmLabel: 'Unconfirm Booking',
            tone: 'danger',
            onConfirm: async () => {
              setConfirmingId(r._id);
              try {
                await apiDelete(`/bookings/confirm-inquiry/${r._id}`);
                toast('Booking confirmation undone.'); refetch();
              } catch (err) { toast(err instanceof ApiRequestError ? err.message : 'Could not un-confirm booking.', 'error'); }
              finally { setConfirmingId(null); }
            }
          })} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-cream disabled:opacity-50">
            {confirmingId === r._id ? 'Undoing…' : <><XCircleIcon className="h-3.5 w-3.5" /> Unconfirm</>}
          </button>}
          <Link to={`/admin/custom-requests/${r._id}`} title="View" className="grid h-8 w-8 place-items-center rounded-lg text-forest/60 hover:bg-cream hover:text-forest">
            <EyeIcon className="h-4 w-4" />
          </Link>
        </div>

  }];


  return (
    <div>
      <PageHeader
        title="Custom Tour Requests"
        subtitle="Review inquiries and craft personalized itineraries"
        action={
        <Link to="/admin/custom-requests/new" className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream hover:bg-emerald">
            <PlusIcon className="h-4 w-4" /> New Query
          </Link>
        } />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by reference…" className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald">
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald">
          {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} error={error} meta={meta} page={page} onPageChange={setPage} rowKey={(r) => r._id} emptyMessage="No custom tour requests yet." />
    </div>);

}
