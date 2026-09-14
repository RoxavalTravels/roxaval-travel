import { useState } from 'react';
import { apiPost } from '../../../lib/api';

export function AddReview({ packages, onSaved }: { packages: { _id: string; name: string }[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return <div className="mb-6">
    <button className="rounded-xl bg-forest px-5 py-3 text-white" onClick={() => setOpen(!open)}>Add package review</button>
    {open && <form className="mt-4 grid gap-4 rounded-xl bg-white p-5 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = Object.fromEntries(new FormData(form));
      setBusy(true); setError('');
      try { await apiPost('/reviews/admin', { ...fields, rating: Number(fields.rating) }); form.reset(); setOpen(false); onSaved(); }
      catch (error) { setError(error instanceof Error ? error.message : 'Unable to save review'); }
      finally { setBusy(false); }
    }}>
      <p className="text-sm sm:col-span-2">Enter genuine customer feedback with its original rating and wording. Saved reviews stay pending until approved.</p>
      <label>Package<select aria-label="Package" required name="tourPackage" className="block w-full border p-2"><option value="">Select package</option>{packages.map(pkg => <option value={pkg._id} key={pkg._id}>{pkg.name}</option>)}</select></label>
      <label>Reviewer name<input required name="reviewerName" maxLength={255} className="block w-full border p-2" /></label>
      <label>Rating<select name="rating" className="block w-full border p-2">{[5,4,3,2,1].map(rating => <option key={rating}>{rating}</option>)}</select></label>
      <label>Source<select name="source" className="block w-full border p-2"><option value="website">Customer feedback</option><option value="tripadvisor">Tripadvisor</option></select></label>
      <label>Title<input name="title" maxLength={255} className="block w-full border p-2" /></label>
      <label>Country<input name="country" maxLength={255} className="block w-full border p-2" /></label>
      <label className="sm:col-span-2">Review<textarea required name="text" maxLength={10000} rows={4} className="block w-full border p-2" /></label>
      <button disabled={busy} className="rounded-xl bg-forest p-3 text-white">{busy ? 'Saving…' : 'Save pending review'}</button>
      {error && <p role="alert">{error}</p>}
    </form>}
  </div>;
}
