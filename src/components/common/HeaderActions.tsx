// Aksi header bersama: tampil sebagai tombol di layar lebar,
// dan diringkas jadi satu menu di layar kecil supaya header tidak sesak.
import type { ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Compass, LogOut, Moon, MoreVertical, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";

export type HeaderAction = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  title?: string;
};

const GUIDE: HeaderAction = { to: "/guide", label: "Panduan", icon: Compass };

export function HeaderActions({ extras = [] }: { extras?: HeaderAction[] }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const items = [GUIDE, ...extras];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      {/* Layar lebar: tombol terpisah */}
      <div className="hidden lg:flex items-center gap-1">
        {items.map((it) => (
          <Button
            key={it.to}
            asChild
            size="sm"
            variant="ghost"
            className="h-9 gap-1.5"
            title={it.title ?? it.label}
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={it.to as any}>
              <it.icon className="w-4 h-4" />
              <span className="text-xs">{it.label}</span>
            </Link>
          </Button>
        ))}
        <button
          type="button"
          onClick={toggle}
          className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-accent"
          title="Ganti tema"
          aria-label="Ganti tema terang atau gelap"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="h-9 w-9 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Keluar"
          aria-label="Keluar dari akun"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Layar kecil: satu menu ringkas */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-accent"
              aria-label="Menu lainnya"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {items.map((it) => (
              <DropdownMenuItem key={it.to} asChild className="gap-2 py-2.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Link to={it.to as any}>
                  <it.icon className="w-4 h-4" />
                  {it.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={toggle} className="gap-2 py-2.5">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Mode terang" : "Mode gelap"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()} className="gap-2 py-2.5">
              <LogOut className="w-4 h-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
