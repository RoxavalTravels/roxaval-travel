import { useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { ApiMeta, ApiRequestError, apiGetList } from '../../../lib/api';
import { PageHeader } from '../../components/PageHeader';

interface SupplierProperty {
  name: string;
  hotelId: number | null;
  matchStatus: 'matched' | 'missing_candidate' | 'on_hold';
  matchNotes?: string | null;
}

interface SupplierContractRate {
  _id: string;
  rateType: 'base_contract' | 'tactical_offer' | 'short_stay_package' | 'wellness_package' | 'room_category_supplement';
  roomCategory: string;
  mealPlan: string;
  periodLabel?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  currency: string;
  rateBasis: string;
  rateAmount: string;
  singleRate?: string | null;
  doubleRate?: string | null;
  tripleRate?: string | null;
  quadRate?: string | null;
  extraBedRate?: string | null;
  singleReduction?: string | null;
  tripleSupplement?: string | null;
  quadSupplement?: string | null;
  occupancyNotes?: string | null;
  normalizationStatus: 'verified' | 'needs_review';
}

interface SupplierChildPolicy {
  _id: string;
  policyType: 'child' | 'infant_cot' | 'child_limit' | 'other';
  ageMin?: string | null;
  ageMax?: string | null;
  mealPlan?: string | null;
  rateAmount?: string | null;
  currency: string;
  rateBasis?: string | null;
  includesExtraBed?: boolean | null;
  isFree: boolean;
  maxChildren?: number | null;
  policyText: string;
  normalizationStatus: 'verified' | 'needs_review';
}

interface SupplierRateEntry {
  _id: string;
  recordType: string;
  season?: string | null;
  sourcePdf: string;
  sourcePages?: string | null;
  rawDetails: string;
  contractPropertyName?: string | null;
  importStatus: 'available' | 'pending_match' | 'on_hold';
  property?: SupplierProperty | null;
  rates: SupplierContractRate[];
  childPolicies: SupplierChildPolicy[];
}

const PAGE_SIZE = 50;

function formatAmount(amount: string | null | undefined, currency: string): string {
  return amount == null ? '—' : `${currency} ${Number(amount).toFixed(2)}`;
}

export function AdminSupplierContractRates() {
  const [entries, setEntries] = useState<SupplierRateEntry[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    apiGetList<SupplierRateEntry>('/supplier-contract-rates', {
      q: search || undefined,
      season: season || undefined,
      page,
      limit: PAGE_SIZE
    }).then((result) => {
      if (!active) return;
      setEntries(result.data);
      setMeta(result.meta);
    }).catch((requestError: unknown) => {
      if (!active) return;
      setError(requestError instanceof ApiRequestError ? requestError.message : 'Failed to load supplier contract rates.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [search, season, page]);

  const setSearchFilter = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const setSeasonFilter = (value: string) => {
    setSeason(value);
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Supplier Contract Rates" subtitle="Private Jetwing contract reference data" />

      <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        Confidential supplier net rates. This admin-only reference does not change public selling prices or hotel room pricing.
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/40" />
          <input
            value={search}
            onChange={(event) => setSearchFilter(event.target.value)}
            placeholder="Search supplier properties or source files"
            className="w-full rounded-xl border border-forest/15 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald"
          />
        </div>
        <select
          value={season}
          onChange={(event) => setSeasonFilter(event.target.value)}
          className="rounded-xl border border-forest/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald"
        >
          <option value="">All periods</option>
          <option value="Winter 2026/27">Winter 2026/27</option>
          <option value="Summer 2027">Summer 2027</option>
        </select>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-forest/60">Loading private supplier rates…</div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-forest/60">No supplier rate entries found.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <article key={entry._id} className="rounded-2xl bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-forest">{entry.property?.name || entry.contractPropertyName || 'Shared contract terms'}</h2>
                  <p className="mt-1 text-xs text-forest/60">
                    {entry.season || 'All periods'} · {entry.recordType}
                  </p>
                  <p className="mt-1 text-xs text-forest/60">
                    {entry.property?.matchStatus === 'matched'
                      ? `Linked to hotel ID ${entry.property.hotelId}`
                      : entry.property?.matchStatus === 'on_hold'
                        ? 'Identity on hold; not linked to a hotel'
                        : entry.property?.matchStatus === 'missing_candidate'
                          ? 'Not in supplied catalog; not linked to a public hotel'
                          : 'Shared source terms'}
                    {entry.importStatus === 'on_hold' ? ' · Rate entry on hold' : ''}
                    {entry.importStatus === 'pending_match' ? ' · Pending catalog match' : ''}
                  </p>
                </div>
                <p className="max-w-full break-all text-xs text-forest/50">{entry.sourcePdf}{entry.sourcePages ? ` · p. ${entry.sourcePages}` : ''}</p>
              </div>

              {entry.property?.matchNotes && <p className="mt-3 text-xs text-forest/60">{entry.property.matchNotes}</p>}
              {entry.rates.length === 0 && entry.recordType !== 'Shared tactical offer terms' && (
                <p className="mt-3 text-xs text-amber-700">
                  No normalized rate rows are available for this source entry. Use the exact source excerpt below; do not infer missing values.
                </p>
              )}
              {entry.rates.length > 0 && (
                <details className="mt-4 border-t border-forest/10 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-emerald">
                    View normalized rates ({entry.rates.length})
                  </summary>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="text-forest/60">
                        <tr>
                          <th className="p-2">Room category</th>
                          <th className="p-2">Meal</th>
                          <th className="p-2">Rate type</th>
                          <th className="p-2">Period</th>
                          <th className="p-2">Valid dates</th>
                          <th className="p-2">Source rate</th>
                          <th className="p-2">Single</th>
                          <th className="p-2">Double</th>
                          <th className="p-2">Triple</th>
                          <th className="p-2">Quad</th>
                          <th className="p-2">Extra bed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.rates.map((rate) => (
                          <tr key={rate._id} className="border-t border-forest/10 align-top">
                            <td className="p-2 font-medium">{rate.roomCategory}</td>
                            <td className="p-2">{rate.mealPlan}</td>
                            <td className="p-2">{rate.rateType.replace(/_/g, ' ')}</td>
                            <td className="p-2">
                              {rate.periodLabel || 'Standard'}
                              {rate.normalizationStatus === 'needs_review' && <span className="block text-amber-700">Needs review</span>}
                              {rate.occupancyNotes && <span className="block text-amber-700">{rate.occupancyNotes}</span>}
                            </td>
                            <td className="whitespace-nowrap p-2">{rate.validFrom || '—'} – {rate.validTo || '—'}</td>
                            <td className="whitespace-nowrap p-2">
                              {formatAmount(rate.rateAmount, rate.currency)}
                              <span className="block text-forest/50">{rate.rateBasis.replace(/_/g, ' ')}</span>
                            </td>
                            <td className="whitespace-nowrap p-2">{formatAmount(rate.singleRate, rate.currency)}</td>
                            <td className="whitespace-nowrap p-2">{formatAmount(rate.doubleRate, rate.currency)}</td>
                            <td className="whitespace-nowrap p-2">{formatAmount(rate.tripleRate, rate.currency)}</td>
                            <td className="whitespace-nowrap p-2">{formatAmount(rate.quadRate, rate.currency)}</td>
                            <td className="whitespace-nowrap p-2">{formatAmount(rate.extraBedRate, rate.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              {entry.childPolicies.length > 0 && (
                <details className="mt-3 border-t border-forest/10 pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-emerald">
                    View child and infant policies ({entry.childPolicies.length})
                  </summary>
                  <ul className="mt-3 space-y-2 text-xs text-forest/70">
                    {entry.childPolicies.map((policy) => (
                      <li key={policy._id} className="rounded-lg bg-cream p-3">
                        <div className="font-medium">
                          {policy.policyType.replace('_', ' ')}
                          {policy.ageMin != null || policy.ageMax != null
                            ? ` · age ${policy.ageMin ?? '—'}–${policy.ageMax ?? '—'}`
                            : ''}
                          {policy.mealPlan ? ` · ${policy.mealPlan}` : ''}
                          {policy.rateAmount != null ? ` · ${formatAmount(policy.rateAmount, policy.currency)}` : ''}
                          {policy.isFree ? ' · Free' : ''}
                          {policy.maxChildren != null ? ` · max ${policy.maxChildren} child(ren)` : ''}
                        </div>
                        {policy.rateBasis && <div className="mt-1">{policy.rateBasis}</div>}
                        {policy.includesExtraBed != null && (
                          <div className="mt-1">Extra bed {policy.includesExtraBed ? 'included' : 'excluded'}</div>
                        )}
                        <div className="mt-1">{policy.policyText}</div>
                        {policy.normalizationStatus === 'needs_review' && <div className="mt-1 text-amber-700">Needs review</div>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <details className="mt-4 border-t border-forest/10 pt-3">
                <summary className="cursor-pointer text-sm font-medium text-emerald">View exact source excerpt</summary>
                <pre className="mt-3 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl bg-cream p-4 font-sans text-xs leading-relaxed text-forest">{entry.rawDetails}</pre>
              </details>
            </article>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm text-forest/70">
          <span>{meta.total} source entries · Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-full border border-forest/15 px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              disabled={page >= meta.totalPages}
              className="rounded-full border border-forest/15 px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
