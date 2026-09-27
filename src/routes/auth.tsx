import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth-oauth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Masuk — StudyNotes" },
      {
        name: "description",
        content:
          "Masuk atau buat akun StudyNotes untuk menyimpan catatan belajar dan latihan STEM secara pribadi.",
      },
      { property: "og:title", content: "Masuk — StudyNotes" },
      {
        property: "og:description",
        content: "Masuk ke StudyNotes untuk mengakses catatan belajar pribadimu.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await signInWithGoogle(window.location.origin);
      if (error) throw error;
      // Redirect ke Google akan terjadi; kode di bawah hanya jalan bila gagal.
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal masuk dengan Google",
      );
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Cek emailmu untuk konfirmasi akun.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background px-4 py-10">
      <Toaster />
      <div className="w-full max-w-[22rem] mx-auto">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-sm">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">StudyNotes</h1>
            <p className="text-sm text-muted-foreground">
              Catatan belajar &amp; latihan STEM
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6">
          {sent ? (
            <div className="text-sm text-center">
              <p className="font-medium">Konfirmasi email terkirim</p>
              <p className="mt-2 text-muted-foreground">
                Buka link di email {email} untuk mengaktifkan akun, lalu masuk di sini.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => {
                  setSent(false);
                  setMode("signin");
                }}
              >
                Kembali ke masuk
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-medium text-center mb-5">
                {mode === "signin" ? "Masuk ke akunmu" : "Buat akun baru"}
              </h2>

              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={busy}
                onClick={handleGoogle}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.6-5.2 3.6-8.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.7-4.9H1.3v3.1A12 12 0 0 0 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z"
                  />
                </svg>
                Lanjutkan dengan Google
              </Button>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">atau email</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === "signin" ? "Masuk" : "Buat akun"}
                </Button>
              </form>

              <button
                type="button"
                className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setMode(mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin"
                  ? "Belum punya akun? Buat akun"
                  : "Sudah punya akun? Masuk"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}