import { supabase } from './supabase'

export const WEB = 'https://bazidpur.com'

export async function webAPI(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: object,
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${WEB}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function webUpload(path: string, formData: FormData): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession()
  return fetch(`${WEB}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ''}`,
      // Do NOT set Content-Type — let fetch set multipart boundary automatically
    },
    body: formData,
  })
}
