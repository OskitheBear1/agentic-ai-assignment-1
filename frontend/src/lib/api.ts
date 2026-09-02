import { getAccessToken } from './neon';

const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export type Priority = 'high' | 'medium' | 'low';

export interface Contact {
  id: number;
  user_id: string;
  name: string;
  company: string | null;
  role: string | null;
  where_met: string | null;
  notes: string | null;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface ContactInput {
  name: string;
  company?: string;
  role?: string;
  where_met?: string;
  notes?: string;
  priority: Priority;
}

export interface ListParams {
  sort: 'name' | 'company' | 'priority' | 'created_at' | 'updated_at';
  direction: 'asc' | 'desc';
  priority?: Priority;
  search?: string;
}

/** A field-level message the form can show next to the offending input. */
export interface FieldError {
  field: string;
  message: string;
}

/** An error carrying the server's message, safe to show the user directly. */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Calls our Node backend with the signed-in user's JWT.
 *
 * Note what is NOT sent: no user id, no ownership hint of any kind. The server
 * derives who you are from the verified token, so the browser cannot claim to
 * be somebody else.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new ApiError(401, 'Your session has ended. Please sign in again.');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach the server. Check your connection and try again.',
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (body.message as string) ?? 'Something went wrong. Please try again.',
      (body.errors as FieldError[]) ?? [],
    );
  }

  return body as T;
}

export const contactsApi = {
  list(params: ListParams): Promise<{ contacts: Contact[] }> {
    const query = new URLSearchParams({
      sort: params.sort,
      direction: params.direction,
    });
    if (params.priority) query.set('priority', params.priority);
    if (params.search) query.set('search', params.search);

    return request(`/api/contacts?${query.toString()}`);
  },

  create(input: ContactInput): Promise<{ contact: Contact }> {
    return request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(clean(input)),
    });
  },

  update(id: number, input: ContactInput): Promise<{ contact: Contact }> {
    return request(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(clean(input)),
    });
  },

  remove(id: number): Promise<void> {
    return request(`/api/contacts/${id}`, { method: 'DELETE' });
  },
};

/** Drop blank optional fields so the server stores NULL rather than "". */
function clean(input: ContactInput): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => typeof value !== 'string' || value.trim() !== '',
    ),
  );
}
