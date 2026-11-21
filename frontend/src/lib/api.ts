import { getCurrentLanguage } from '../i18n';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v\d+\/?$/, '');

// New private documents and receipts use authenticated API download URLs.
// Prefix the API origin for legacy relative links.
export const resolveFileUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `${API_ORIGIN}${url}`);
// download=true forces a Content-Disposition: attachment response instead
// of the default inline view -- same endpoint, same file, just how the
// browser is told to handle it (open in-tab for Preview/Print vs. save to
// disk for Download).
export const documentFileUrl = (documentId: string, download = false) => `${API_BASE_URL}/documents/${documentId}/file${download ? '?download=true' : ''}`;
export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: ApiMeta;
  errors?: ApiFieldError[];
}

export class ApiRequestError extends Error {
  status: number;
  errors?: ApiFieldError[];

  constructor(message: string, status: number, errors?: ApiFieldError[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.errors = errors;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildQueryString(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-Roxaval-Request': '1' } }).
    then((res) => res.ok).
    catch(() => false).
    finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

// Used by the session probe: ask for a fresh access token only when the server says a refresh cookie exists.
export { tryRefresh as refreshSession };

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  formData?: FormData;
  params?: QueryParams;
  skipRefresh?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = 'GET', body, formData, params, skipRefresh } = options;

  const init: RequestInit = {
    method,
    credentials: 'include',
    headers: { ...(formData ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-Roxaval-Request': '1' }) },
    body: formData || (body !== undefined ? JSON.stringify(body) : undefined)
  };

  // Every request carries the active site language so catalog endpoints
  // (Tour Packages/Destinations/Activities/Hotels/Blog) can return
  // admin-authored content in the right locale, with no per-call-site changes.
  // An explicit `lang` in params (e.g. the Quotation page's own language
  // switcher, independent of the site-wide language) overrides the default.
  const url = `${API_BASE_URL}${path}${buildQueryString({ lang: getCurrentLanguage(), ...params })}`;
  let res = await fetch(url, init);

  if (res.status === 401 && !skipRefresh && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(url, init);
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const envelope: ApiEnvelope<T> = contentType.includes('application/json') ?
  await res.json() :
  { success: res.ok, message: res.statusText, data: undefined as T };

  if (!res.ok || !envelope.success) {
    const baseMessage = envelope.message || 'Something went wrong. Please try again.';
    const detail = envelope.errors?.length ?
    envelope.errors.
    map((e) => `${e.field.replace(/^body\./, '')}: ${e.message}`).
    join('; ') :
    '';
    throw new ApiRequestError(detail ? `${baseMessage} - ${detail}` : baseMessage, res.status, envelope.errors);
  }
  return { data: envelope.data, meta: envelope.meta };
}

export function apiGetList<T>(path: string, params?: QueryParams): Promise<{ data: T[]; meta: ApiMeta }> {
  return request<T[]>(path, { params }).then((r) => ({ data: r.data, meta: r.meta as ApiMeta }));
}

export function apiGetOne<T>(path: string, params?: QueryParams): Promise<T> {
  return request<T>(path, { params }).then((r) => r.data);
}

// Selectors must follow pagination instead of silently omitting later records.
export async function apiGetAll<T>(path: string, params?: QueryParams): Promise<{ data: T[] }> {
  const data: T[] = [];
  let page = 1;
  for (;;) {
    const result = await apiGetList<T>(path, { ...params, limit: 100, page });
    data.push(...result.data);
    if (!result.meta || page >= result.meta.totalPages || result.data.length === 0) break;
    page++;
  }
  return { data };
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'POST', body }).then((r) => r.data);
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method: 'PATCH', body }).then((r) => r.data);
}

export function apiDelete<T = null>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' }).then((r) => r.data);
}

export function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, { method: 'POST', formData }).then((r) => r.data);
}

export function apiUploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('image', file);
  return request<{ url: string }>('/uploads/image', { method: 'POST', formData }).then((r) => r.data);
}

export function apiUploadImages(files: File[]): Promise<{ urls: string[] }> {
  const formData = new FormData();
  files.forEach((f) => formData.append('images[]', f));
  return request<{ urls: string[] }>('/uploads/images', { method: 'POST', formData }).then((r) => r.data);
}
