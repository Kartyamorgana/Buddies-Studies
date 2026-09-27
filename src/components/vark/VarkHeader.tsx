// src/components/vark/VarkHeader.tsx
import type { ReactNode } from "react";
import { HeaderActions } from "@/components/common/HeaderActions";
import { StemTopNav } from "@/components/stem/StemTopNav";

/** Header bersama untuk halaman Auditory & Kinesthetic Studio. */
export function VarkHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-border flex items-center gap-2 px-2 sm:px-4 bg-card/50 backdrop-blur">
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
          {icon}
        </div>
        <div className="hidden xl:block min-w-0">
          <div className="font-semibold leading-none text-sm truncate">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>
        </div>
      </div>

      <StemTopNav className="ml-auto min-w-0" />

      <HeaderActions />
    </header>
  );
}

