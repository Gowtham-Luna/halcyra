import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set");
}

export const supabase = createClient(url, anonKey);

export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8787";
