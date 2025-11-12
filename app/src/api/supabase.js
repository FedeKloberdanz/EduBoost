import { createClient } from "@supabase/supabase-js";
import { API_CONFIG } from "../../config";

// Use your computer's IP address - phone needs to reach it on the same network
const SUPABASE_URL = API_CONFIG.POSTGREST_URL;
// Dummy key (required by Supabase client but won't be used due to custom fetch)
const SUPABASE_ANON_KEY = "dummy-key-for-postgrest-without-auth";

console.log("Using Supabase URL:", SUPABASE_URL);

// Custom fetch that doesn't send Authorization header
const customFetch = async (url, options = {}) => {
  const { headers = {}, ...rest } = options;
  
  // Remove /rest/v1/ path that Supabase client adds (PostgREST doesn't use it)
  const fixedUrl = url.replace('/rest/v1/', '/');
  
  console.log("Custom fetch - Original URL:", url);
  console.log("Custom fetch - Fixed URL:", fixedUrl);
  
  // Remove Authorization header that Supabase client adds
  const newHeaders = { ...headers };
  delete newHeaders['Authorization'];
  delete newHeaders['authorization'];
  delete newHeaders['apikey'];
  
  const response = await fetch(fixedUrl, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...newHeaders
    }
  });
  
  console.log("Custom fetch - Response status:", response.status);
  const text = await response.text();
  console.log("Custom fetch - Response body:", text);
  
  // Return a response-like object that Supabase can parse
  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: {},
    fetch: customFetch
  },
});
