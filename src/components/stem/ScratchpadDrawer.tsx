// src/components/stem/ScratchpadDrawer.tsx
import { useState } from "react";
import { Calculator, Sigma } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScratchpadCanvas } from "./ScratchpadCanvas";
import { FormulaLibrary } from "./FormulaLibrary";

/**
 * Tombol "Papan hitung & rumus" yang membuka drawer dengan 2 tab:
 * - Papan Coret: canvas untuk menghitung
 * - Rumus Cepat: perpustakaan rumus yang bisa dicari
 */
export function ScratchpadDrawer({ height = 340 }: { height?: number }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"canvas" | "formula">("canvas");

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button size="sm" variant="secondary" className="h-8 text-xs gap-1">
          <Calculator className="w-3.5 h-3.5" /> Papan hitung
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Papan hitung &amp; rumus
          </DrawerTitle>
          <DrawerDescription>
            Coret-coret bebas atau cari rumus cepat — semuanya bisa sambil mengerjakan soal.
          </DrawerDescription>
        </DrawerHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "canvas" | "formula")}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="px-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="canvas" className="gap-1.5 text-xs">
                <Calculator className="w-3.5 h-3.5" /> Papan Coret
              </TabsTrigger>
              <TabsTrigger value="formula" className="gap-1.5 text-xs">
                <Sigma className="w-3.5 h-3.5" /> Rumus Cepat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="canvas" className="flex-1 min-h-0 px-4 pb-6 pt-3 overflow-y-auto">
            <ScratchpadCanvas height={height} />
          </TabsContent>

          <TabsContent
            value="formula"
            className="flex-1 min-h-0 pt-0 pb-6 overflow-hidden data-[state=active]:flex"
          >
            <div className="flex-1 min-h-0 flex flex-col">
              <FormulaLibrary />
            </div>
          </TabsContent>
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}