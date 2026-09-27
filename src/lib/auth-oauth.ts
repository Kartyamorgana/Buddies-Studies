import { supabase } from "@/integrations/supabase/client";

/**
 * Google OAuth via Supabase — tanpa perantara Lovable.
 * Setelah Google consent, Supabase redirect ke /auth/callback.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const base =
    redirectTo ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${base}/auth/callback`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) return { error };
  return { data };
}