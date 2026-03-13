/**
 * Utility for making API requests to our backend.
 * Expects JSON responses in the format { success: boolean, data?: any, error?: string }
 */

export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.error || `HTTP Error ${res.status}`);
  }

  return json.data as T;
}
