import { supabase } from "./supabase";

/**
 * fetch() for /api/member/* that sends the signed-in member's access token.
 * Pass the token when calling from inside onAuthStateChange: awaiting getSession() there can deadlock supabase-js.
 */
export async function memberFetch(url: string, init: RequestInit = {}, accessToken?: string): Promise<Response> {
  const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}
