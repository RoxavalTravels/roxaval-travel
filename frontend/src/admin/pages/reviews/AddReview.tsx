import { useState } from 'react';
import { apiPost, apiPatch } from '../../../lib/api';

export interface EditableReview { _id: string; reviewerName?: string; customer?: { user?: { fullName?: string } }; tourPackage?: { _id: string }; rating: number; source?: string; title?: string; country?: string; text: string }

export function AddReview({ packages, onSaved, review }: { packages: { _id: string; name: string }[]; onSaved: () => void; review?: EditableReview }) {
  const [open, setOpen] = useState(!!review);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="mb-6">
    <button className="rounded-xl bg-forest px-5 py-3 text-white" onClick={() => setOpen(!open)}>{review ? 'Edit package review' : 'Add package review'}</button>
    {open && <form className="mt-4 grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = Object.fromEntries(new FormData(form));
      setBusy(true); setError('');
      try { const data = { ...fields, rating: Number(fields.rating) }; if (review) await apiPatch(`/reviews/${review._id}`, data); else await apiPost('/reviews/admin', data); form.reset(); setOpen(false); onSaved(); }
      catch (error) { setError(error instanceof Error ? error.message : 'Unable to save review'); }
      finally { setBusy(false); }
    }}>
      <p className="text-sm sm:col-span-2">Enter genuine customer feedback with its original rating and wording. Saved reviews stay pending until approved.</p>
      <label>Package<select aria-label="Package" required name="tourPackage" defaultValue={review?.tourPackage?._id || ''} className="block w-full border p-2"><option value="">Select package</option>{packages.map(pkg => <option value={pkg._id} key={pkg._id}>{pkg.name}</option>)}</select></label>
      <label>Reviewer name<input required name="reviewerName" defaultValue={review?.customer?.user?.fullName || review?.reviewerName || ''} maxLength={255} className="block w-full border p-2" /></label>
      <label>Rating<select name="rating" defaultValue={review?.rating || 5} className="block w-full border p-2">{[5,4,3,2,1].map(rating => <option key={rating}>{rating}</option>)}</select></label>
      <label>Source<select name="source" defaultValue={review?.source || 'website'} className="block w-full border p-2"><option value="website">Customer feedback</option><option value="tripadvisor">Tripadvisor</option></select></label>
      <label>Title<input name="title" defaultValue={review?.title || ''} maxLength={255} className="block w-full border p-2" /></label>
      <label>Country<input name="country" defaultValue={review?.country || ''} maxLength={255} className="block w-full border p-2" /></label>
      <label className="sm:col-span-2">Review<textarea required name="text" defaultValue={review?.text || ''} maxLength={10000} rows={4} className="block w-full border p-2" /></label>
      <button disabled={busy} className="rounded-xl bg-forest p-3 text-white">{busy ? 'Saving…' : 'Save pending review'}</button>
      {error && <p role="alert">{error}</p>}
    </form>}
  </div>;
}
