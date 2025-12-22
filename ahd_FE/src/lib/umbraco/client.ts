/**
 * Umbraco Delivery API client (server-only).
 *
 * Configure in .env (not PUBLIC):
 * - UMBRACO_BASE_URL=https://your-domain
 * - UMBRACO_API_KEY=your-api-key (optional; omit if your Delivery API is public)
 */

const BASE_URL = import.meta.env.PUBLIC_UMBRACO_BASE_URL as string | undefined;
const API_KEY = import.meta.env.PUBLIC_UMBRACO_API_KEY as string | undefined;

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, '');
}

function buildUrl(path: string): string {
  const base = BASE_URL ? normalizeBaseUrl(BASE_URL) : '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  if (!BASE_URL) throw new Error('UMBRACO_BASE_URL is not set');

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_KEY) headers['Api-Key'] = API_KEY; // Delivery API v2 supports Api-Key

  const response = await fetch(buildUrl(path), {
    method: 'GET',
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Umbraco ${response.status} ${response.statusText}: ${text}`);
  }
  return response.json() as Promise<TResponse>;
}

export const umbraco = {
  /** Get a single content item by its GUID/UDI ID */
  getItemById<TResponse = unknown>(id: string) {
    return request<TResponse>(`/umbraco/delivery/api/v2/content/item/${id}`);
  },

  /** Get a single content item by its route path, e.g. "/home" or "/siteSettings" */
  getItemByPath<TResponse = unknown>(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return request<TResponse>(`/umbraco/delivery/api/v2/content/item${normalized}`);
  },

  /** Search content by content type alias (doctype). Supports paging via take/skip */
  searchByContentType<TResponse = unknown>(contentType: string, take = 20, skip = 0) {
    const query = `/umbraco/delivery/api/v2/content?filter=contentType:${encodeURIComponent(contentType)}&take=${take}&skip=${skip}`;
    return request<TResponse>(query);
  },

  /** Get the root items of the content tree */
  getRoot<TResponse = unknown>() {
    return request<TResponse>('/umbraco/delivery/api/v2/content');
  },
};

export default umbraco;
