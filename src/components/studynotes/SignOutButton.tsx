import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function SignOutButton({
  className,
  label = false,
}: {
  className?: string;
  label?: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      title="Keluar"
      className={cn(
        "inline-flex items-center gap-1.5 rounded p-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        className,
      )}
    >
      <LogOut className="w-3.5 h-3.5" />
      {label && <span>Keluar</span>}
    </button>
  );
}
