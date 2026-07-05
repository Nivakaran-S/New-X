const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = await res.json()
      message = body?.message || body?.error || message
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, message)
  }
  const body = await res.json()
  return (body?.data !== undefined ? body.data : body) as T
}

function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders(token),
    cache: 'no-store',
  })
  return handleResponse<T>(res)
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function apiDelete<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  })
  return handleResponse<T>(res)
}

export { ApiError }
