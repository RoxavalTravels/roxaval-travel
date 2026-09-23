import React, { useEffect, useState } from 'react';
import { AddReview } from './AddReview';
import { CheckIcon, HomeIcon, SearchIcon, StarIcon, TrashIcon, XIcon, PencilIcon } from 'lucide-react';
import { useAdminList } from '../../hooks/useAdminList';
import { DataTable, Column } from '../../components/DataTable';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { useConfirm } from '../../components/ConfirmDialog';
import { useToast } from '../../components/ToastProvider';
import { apiDelete, apiGetAll, apiPatch, ApiRequestError } from '../../../lib/api';

interface AdminReview {
  _id: string;
  customer?: { user?: { fullName?: string } };
  reviewerName?: string;
  source?: string;
  tourPackage?: { _id: string; name: string };
  rating: number;
  title?: string;
  text: string;
  status: string;
  isFeatured: boolean;
  createdAt: string;
}

export function AdminReviewsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<AdminReview>();
  const { items, meta, loading, error, page, setPage, refetch } = useAdminList<AdminReview>('/reviews/admin/all', {
    q: search || undefined,
    status: status || undefined
  });
  const confirm = useConfirm();
  const toast = useToast();
  const [packages, setPackages] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    apiGetAll<{ _id: string; name: string }>('/packages/admin/all', { lang: 'en' }).then(({ data }) => setPackages(data.sort((a, b) => a.name.localeCompare(b.name)))).catch(() => toast('Unable to load packages. Reload to try again.', 'error'));
  }, []);

  const moderate = async (r: AdminReview, decision: 'approved' | 'rejected') => {
    try {
      await apiPatch(`/reviews/${r._id}/moderate`, { status: decision });
      toast(`Review ${decision}.`);
      refetch();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to update review.', 'error');
    }
  };

  const toggleFeatured = async (r: AdminReview) => {
    try {
      await apiPatch(`/reviews/${r._id}/featured`, { isFeatured: !r.isFeatured });
      toast(r.isFeatured ? 'Removed from homepage.' : 'Featured on homepage.');
      refetch();
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to update review.', 'error');
    }
  };

  const remove = (r: AdminReview) => {
    confirm({
      title: 'Delete review?',
      message: 'This review will be permanently removed.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await apiDelete(`/reviews/${r._id}`);
          toast('Review deleted.');
          refetch();
        } catch (err) {
          toast(err instanceof ApiRequestError ? err.message : 'Failed to delete review.', 'error');
        }
      }
    });
  };

  const columns: Column<AdminReview>[] = [
  { header: 'Customer', render: (r) => r.customer?.user?.fullName || r.reviewerName || '-' },
  { header: 'Package', render: (r) => <select aria-label={`Package for review ${r._id}`} className="max-w-52 border p-2" value={r.tourPackage?._id || ''} onChange={async event => {
    try { await apiPatch(`/reviews/${r._id}/package`, { tourPackage: event.target.value }); refetch(); }
    catch (error) { toast(error instanceof Error ? error.message : 'Unable to assign package', 'error'); }
  }}><option value="" disabled>Select package</option>{packages.map(pkg => <option key={pkg._id} value={pkg._id}>{pkg.name}</option>)}</select> },
  { header: 'Rating', render: (r) => <span className="inline-flex items-center gap-1"><StarIcon className="h-3.5 w-3.5 fill-gold text-gold" /> {r.rating}</span> },
  { header: 'Review', className: 'max-w-xs truncate', render: (r) => r.text },
  { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    header: 'Featured',
    render: (r) => r.status === 'approved' ?
    <button
      onClick={() => toggleFeatured(r)}
      title={r.isFeatured ? 'Showing on homepage — click to remove' : 'Not on homepage — click to feature'}
      className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${r.isFeatured ? 'bg-gold/15 text-gold hover:bg-gold/25' : 'text-forest/30 hover:bg-cream hover:text-forest/60'}`}>
        <HomeIcon className="h-4 w-4" />
      </button> :
    <span className="text-xs text-forest/30">—</span>
  },
  {
    header: 'Actions',
    render: (r) =>
    <div className="flex items-center gap-1.5">
          <button aria-label={`Edit review ${r._id}`} onClick={() => setEditing(r)} className="grid h-8 w-8 place-items-center rounded-lg text-forest/60 hover:bg-cream"><PencilIcon className="h-4 w-4" /></button>
          {r.status === 'pending' &&
      <>
              <button aria-label={`Approve review ${r._id}`} onClick={() => moderate(r, 'approved')} className="grid h-8 w-8 place-items-center rounded-lg text-emerald hover:bg-emerald/10"><CheckIcon className="h-4 w-4" /></button>
              <button aria-label={`Reject review ${r._id}`} onClick={() => moderate(r, 'rejected')} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50"><XIcon className="h-4 w-4" /></button>
            </>
      }
          <button onClick={() => remove(r)} className="grid h-8 w-8 place-items-center rounded-lg text-forest/60 hover:bg-red-50 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
        </div>

  }];


  return (
    <div>
      <PageHeader title="Reviews" subtitle="Moderate customer feedback before it goes live" />
      <AddReview key={editing?._id || 'new'} packages={packages} review={editing} onSaved={() => { setEditing(undefined); toast('Review saved. Approve it to publish.'); refetch(); }} />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews…" className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <DataTable columns={columns} rows={items} loading={loading} error={error} meta={meta} page={page} onPageChange={setPage} rowKey={(r) => r._id} emptyMessage="No reviews yet." />
    </div>);

}
