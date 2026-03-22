const AUTH_KEY = 'closet-auth-token'

export function getToken(): string {
  return localStorage.getItem(AUTH_KEY) ?? ''
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_KEY)
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers = new Headers(init.headers)

  if (token && !(init.body instanceof FormData)) {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(path, { ...init, headers })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
  }

  return res
}

export async function apiFetchJSON<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error)
  }
  return res.json() as Promise<T>
}
