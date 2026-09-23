import { useEffect, useMemo, useState } from 'react';
import { apiGetList, ApiMeta, QueryParams } from '../lib/api';
import { useTranslation } from 'react-i18next';

interface UseApiListResult<T> {
  items: T[];
  meta: ApiMeta | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

/**
 * Fetches a paginated list endpoint and accumulates pages as `page` grows,
 * refetching from page 1 whenever the query params (search/filters/sort)
 * change. Shared by the Activities and Tour Packages list pages.
 */
export function useApiList<T>(path: string, params: QueryParams, limit = 9): UseApiListResult<T> {
  const { i18n } = useTranslation();
  const paramsKey = JSON.stringify({ ...params, lang: params.lang || i18n.resolvedLanguage });
  const queryKey = JSON.stringify([path, paramsKey, limit]);
  const [pagination, setPagination] = useState({ key: queryKey, page: 1 });
  const page = pagination.key === queryKey ? pagination.page : 1;
  const [result, setResult] = useState<{ key: string; items: T[] }>({ key: queryKey, items: [] });
  const items = result.key === queryKey ? result.items : [];
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiGetList<T>(path, { ...JSON.parse(paramsKey), page, limit }).
    then(({ data, meta: nextMeta }) => {
      if (cancelled) return;
      setResult(prev => ({ key: queryKey, items: page === 1 || prev.key !== queryKey ? data : [...prev.items, ...data] }));
      setMeta(nextMeta);
    }).
    catch((err: Error) => {
      if (cancelled) return;
      setError(err.message);
    }).
    finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, page, limit, queryKey]);

  const hasMore = useMemo(() => !!meta && meta.page < meta.totalPages, [meta]);

  return { items, meta, loading, error, hasMore, loadMore: () => setPagination({ key: queryKey, page: page + 1 }) };
}
