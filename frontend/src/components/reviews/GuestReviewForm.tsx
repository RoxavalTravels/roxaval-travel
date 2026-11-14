import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost } from '../../lib/api';

export function GuestReviewForm({ tourPackage }: { tourPackage?: string }) {
  const { t } = useTranslation('reviews');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (sent) return <p role="status" className="my-6 rounded-2xl bg-emerald/10 p-6 text-forest">{t('form.success')}</p>;
  return <form id="write-review" className="my-8 space-y-4 rounded-3xl bg-white p-6 shadow-soft" onSubmit={async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      await apiPost('/reviews/guest', { reviewerName: fields.get('reviewerName'), rating: Number(fields.get('rating')), text: fields.get('text'), website: fields.get('website'), ...(tourPackage ? { tourPackage: Number(tourPackage) } : {}) });
      setSent(true);
    } catch { setError(t('form.error')); }
    finally { setBusy(false); }
  }}>
    <h2 className="font-display text-2xl font-semibold text-forest">{t('form.title')}</h2>
    <p className="text-sm text-forest/70">{t('form.notice')}</p>
    <label className="block">{t('form.name')}<input name="reviewerName" autoComplete="name" required minLength={2} maxLength={100} className="mt-1 block w-full rounded-xl border p-3" /></label>
    <label className="block">{t('form.rating')}<select name="rating" required defaultValue="" className="mt-1 block w-full rounded-xl border p-3"><option value="" disabled>{t('form.select')}</option>{[5,4,3,2,1].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>
    <label className="block">{t('form.text')}<textarea name="text" required minLength={20} maxLength={5000} rows={5} className="mt-1 block w-full rounded-xl border p-3" /></label>
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button disabled={busy} className="rounded-full bg-forest px-6 py-3 font-semibold text-white disabled:opacity-50">{t(busy ? 'form.sending' : 'form.submit')}</button>
  </form>;
}
