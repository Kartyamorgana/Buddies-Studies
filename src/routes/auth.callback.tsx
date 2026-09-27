import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS otomatis parse token dari URL hash setelah redirect Google.
    let cancelled = false;

    const finish = async () => {
      // Beri waktu supabase memproses hash URL
      await supabase.auth.getSession();
      if (cancelled) return;

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate({ to: "/", replace: true });
      } else {
        navigate({ to: "/auth", replace: true });
      }
    };

    // Beri 300ms agar supabase sempat parse hash
    const t = setTimeout(finish, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [navigate]);

  return (
    <div className="min-h-dvh grid place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Menyelesaikan login…</span>
      </div>
    </div>
  );
}