import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  PanelLeftClose,
  PanelLeft,
  Plus,
  FolderPlus,
  Sun,
  Moon,
  Download,
  Upload,
  Sparkles,
  ListChecks,
  Loader2,
  BookOpen,
  Pin,
  Trash2,
  FileDown,
  X,
  Eye,
  Pencil,
  FileUp,
  Gamepad2,
  Brain,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchAll,
  createNote as dbCreateNote,
  updateNote as dbUpdateNote,
  deleteNote as dbDeleteNote,
  createFolder as dbCreateFolder,
  renameFolder as dbRenameFolder,
  deleteFolder as dbDeleteFolder,
  type Folder,
  type Note,
} from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { FolderTree } from "@/components/studynotes/FolderTree";
import { MarkdownEditor } from "@/components/studynotes/MarkdownEditor";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import { runNoteAi } from "@/lib/ai.functions";
import { MaterialImportDialog } from "@/components/studynotes/MaterialImportDialog";
import { StudyGamePanel } from "@/components/studynotes/StudyGamePanel";
import { NoteGameHistory } from "@/components/studynotes/NoteGameHistory";
import { StudyMethodsPanel } from "@/components/studynotes/StudyMethodsPanel";
import { useIsMobile } from "@/hooks/use-mobile";
import { StemTopNav } from "@/components/stem/StemTopNav";
import { SignOutButton } from "@/components/studynotes/SignOutButton";
import { ensureTutorialNote } from "@/lib/onboarding";

type View = "edit" | "preview" | "game" | "methods";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "StudyNotes — Catatan Belajar Interaktif" },
      {
        name: "description",
        content:
          "Aplikasi catatan belajar dengan editor Markdown, folder, syntax highlighting, dan asisten AI.",
      },
      { property: "og:title", content: "StudyNotes" },
      { property: "og:description", content: "Catatan belajar interaktif dengan AI." },
    ],
  }),
  component: StudyNotesApp,
});

function StudyNotesApp() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();

  // Sidebar tertutup secara default di layar kecil
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("edit");
  const [materialOpen, setMaterialOpen] = useState(false);
  const [gameHistoryRefresh, setGameHistoryRefresh] = useState(0);

  const searchRef = useRef<HTMLInputElement>(null);
  const callAi = useServerFn(runNoteAi);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem("studynotes-theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggleDark = () => {
    const nv = !dark;
    setDark(nv);
    document.documentElement.classList.toggle("dark", nv);
    localStorage.setItem("studynotes-theme", nv ? "dark" : "light");
  };

  // Load
  useEffect(() => {
    (async () => {
      try {
        const tutorial = await ensureTutorialNote();
        const d = await fetchAll();
        setFolders(d.folders);
        setNotes(d.notes);
        const first = tutorial
          ? (d.notes.find((n) => n.id === tutorial.id) ?? tutorial)
          : d.notes[0];
        if (first) setActiveId(first.id);
        if (tutorial) {
          setView("preview");
          toast.success("Panduan penggunaan sudah disiapkan untukmu");
        }
      } catch (e) {
        toast.error("Gagal memuat data", { description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = useMemo(() => notes.find((n) => n.id === activeId) ?? null, [notes, activeId]);

  // Auto-save debounced
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Note> | null>(null);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");

  const flushSave = useCallback(async () => {
    if (!activeId || !pending.current) return;
    const patch = pending.current;
    pending.current = null;
    setSavingState("saving");
    try {
      await dbUpdateNote(activeId, patch);
      setSavingState("saved");
      setTimeout(() => setSavingState("idle"), 1200);
    } catch (e) {
      setSavingState("idle");
      toast.error("Gagal menyimpan", { description: (e as Error).message });
    }
  }, [activeId]);

  const scheduleSave = useCallback(
    (patch: Partial<Note>) => {
      pending.current = { ...(pending.current ?? {}), ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, 700);
    },
    [flushSave],
  );

  const updateActive = (patch: Partial<Note>) => {
    if (!activeId) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeId ? { ...n, ...patch, updated_at: new Date().toISOString() } : n,
      ),
    );
    scheduleSave(patch);
  };

  // CRUD
  const handleCreateNote = async (folderId: string | null) => {
    try {
      const n = await dbCreateNote(folderId);
      setNotes((p) => [n, ...p]);
      setActiveId(n.id);
      setView("edit");
    } catch (e) {
      toast.error("Gagal membuat catatan", { description: (e as Error).message });
    }
  };

  const createNoteFromMaterial = async (title: string, content: string) => {
    try {
      const n = await dbCreateNote(active?.folder_id ?? null);
      await dbUpdateNote(n.id, { title, content });
      const full = { ...n, title, content };
      setNotes((p) => [full, ...p]);
      setActiveId(n.id);
      setView("preview");
    } catch (e) {
      toast.error("Gagal menyimpan catatan", { description: (e as Error).message });
    }
  };

  const [confirmDelete, setConfirmDelete] = useState<
    { kind: "note"; id: string } | { kind: "folder"; id: string } | null
  >(null);

  const reallyDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.kind === "note") {
        await dbDeleteNote(confirmDelete.id);
        setNotes((p) => p.filter((n) => n.id !== confirmDelete.id));
        if (activeId === confirmDelete.id) setActiveId(null);
      } else {
        await dbDeleteFolder(confirmDelete.id);
        setFolders((p) => p.filter((f) => f.id !== confirmDelete.id));
        // notes cascade delete on DB; refresh
        const fresh = await fetchAll();
        setFolders(fresh.folders);
        setNotes(fresh.notes);
      }
      toast.success("Berhasil dihapus");
    } catch (e) {
      toast.error("Gagal menghapus", { description: (e as Error).message });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleTogglePin = async (id: string) => {
    const n = notes.find((x) => x.id === id);
    if (!n) return;
    const pinned = !n.pinned;
    setNotes((p) => p.map((x) => (x.id === id ? { ...x, pinned } : x)));
    try {
      await dbUpdateNote(id, { pinned });
    } catch (e) {
      toast.error("Gagal", { description: (e as Error).message });
    }
  };

  const handleMoveNote = async (id: string, folderId: string | null) => {
    setNotes((p) => p.map((n) => (n.id === id ? { ...n, folder_id: folderId } : n)));
    try {
      await dbUpdateNote(id, { folder_id: folderId });
      toast.success("Catatan dipindahkan");
    } catch (e) {
      toast.error("Gagal memindahkan", { description: (e as Error).message });
    }
  };

  // Folder dialogs
  const [folderDialog, setFolderDialog] = useState<
    { mode: "create"; parentId: string | null } | { mode: "rename"; id: string } | null
  >(null);
  const [folderName, setFolderName] = useState("");

  const openCreateFolder = (parentId: string | null) => {
    setFolderDialog({ mode: "create", parentId });
    setFolderName("");
  };
  const openRenameFolder = (id: string) => {
    setFolderDialog({ mode: "rename", id });
    setFolderName(folders.find((f) => f.id === id)?.name ?? "");
  };
  const submitFolder = async () => {
    if (!folderDialog || !folderName.trim()) return;
    try {
      if (folderDialog.mode === "create") {
        const f = await dbCreateFolder(folderName.trim(), folderDialog.parentId);
        setFolders((p) => [...p, f]);
      } else {
        await dbRenameFolder(folderDialog.id, folderName.trim());
        setFolders((p) =>
          p.map((f) => (f.id === folderDialog.id ? { ...f, name: folderName.trim() } : f)),
        );
      }
      setFolderDialog(null);
    } catch (e) {
      toast.error("Gagal", { description: (e as Error).message });
    }
  };

  // Search
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return notes
      .filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, notes]);

  // Export / Import
  const exportAll = () => {
    const data = JSON.stringify({ folders, notes, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studynotes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportActiveMd = () => {
    if (!active) return;
    const blob = new Blob([`# ${active.title}\n\n${active.content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${active.title || "note"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace" | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const onImportFile = (f: File) => {
    setImportFile(f);
    setImportMode("merge");
  };
  const runImport = async () => {
    if (!importFile || !importMode) return;
    try {
      const text = await importFile.text();
      const data = JSON.parse(text) as { folders?: Folder[]; notes?: Note[] };
      if (importMode === "replace") {
        await supabase.from("notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("folders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (data.folders?.length) {
        await supabase.from("folders").insert(
          data.folders.map((f) => ({
            id: f.id,
            name: f.name,
            parent_id: f.parent_id,
          })),
        );
      }
      if (data.notes?.length) {
        await supabase.from("notes").insert(
          data.notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            folder_id: n.folder_id,
            pinned: n.pinned ?? false,
            tags: n.tags ?? [],
          })),
        );
      }
      const fresh = await fetchAll();
      setFolders(fresh.folders);
      setNotes(fresh.notes);
      toast.success("Impor selesai");
    } catch (e) {
      toast.error("Gagal mengimpor", { description: (e as Error).message });
    } finally {
      setImportFile(null);
      setImportMode(null);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  // AI
  const [aiLoading, setAiLoading] = useState<"refine" | "summarize" | null>(null);
  const [aiResult, setAiResult] = useState<{ mode: "refine" | "summarize"; text: string } | null>(
    null,
  );

  const runAi = async (mode: "refine" | "summarize") => {
    if (!active) return;
    if (!active.content.trim()) {
      toast.error("Catatan kosong");
      return;
    }
    setAiLoading(mode);
    try {
      const res = await callAi({ data: { mode, content: active.content } });
      setAiResult({ mode, text: res.text });
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("429")) toast.error("Terlalu banyak permintaan, coba sebentar lagi");
      else if (msg.includes("402")) toast.error("Kredit AI habis, tambah kredit di workspace");
      else toast.error("AI gagal", { description: msg });
    } finally {
      setAiLoading(null);
    }
  };

  const applyAiResult = () => {
    if (!aiResult || aiResult.mode !== "refine") return;
    updateActive({ content: aiResult.text });
    setAiResult(null);
    toast.success("Catatan diperbarui");
  };

  // Shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleCreateNote(null);
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flushSave();
        toast.success("Tersimpan");
      } else if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushSave]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      <a
        href="#note-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-3 focus:py-1.5 focus:rounded-md focus:text-sm"
      >
        Lompat ke isi catatan
      </a>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
          className="md:hidden fixed inset-0 z-30 bg-foreground/40 backdrop-blur-sm animate-fade-in"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar"
        aria-label="Daftar catatan dan folder"
        aria-hidden={!sidebarOpen}
        className={`fixed md:static inset-y-0 left-0 z-40 h-full w-[86vw] max-w-xs md:max-w-none shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform md:transition-[width] duration-200 ease-out ${
          sidebarOpen
            ? "translate-x-0 md:w-80"
            : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0"
        }`}
      >
        <div className="p-3 border-b border-sidebar-border">
          <StemTopNav size="comfortable" className="mb-2" />
          <Link
            to="/guide"
            className="mb-3 flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Compass className="w-3.5 h-3.5" /> Panduan interaktif
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="font-semibold leading-none">StudyNotes</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Catatan belajar interaktif
              </div>
            </div>
            <button
              onClick={toggleDark}
              className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent"
              title="Ganti tema"
              aria-label="Ganti tema terang atau gelap"
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <SignOutButton />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari catatan... (Ctrl+F)"
              className="pl-8 h-9 bg-background"
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden animate-fade-in">
                {searchResults.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setActiveId(n.id);
                      setSearch("");
                      setView("edit");
                      if (isMobile) setSidebarOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b border-border last:border-b-0"
                  >
                    <div className="font-medium truncate">{n.title || "Untitled"}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {n.content.slice(0, 80) || "Kosong"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1.5 mt-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => handleCreateNote(null)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Catatan
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => openCreateFolder(null)}
              className="flex-1 h-8 text-xs gap-1"
            >
              <FolderPlus className="w-3.5 h-3.5" /> Folder
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMaterialOpen(true)}
            className="w-full h-8 text-xs gap-1 mt-1.5"
          >
            <FileUp className="w-3.5 h-3.5" /> Dari PPT / PDF / Audio
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="text-sm text-muted-foreground p-3">Memuat...</div>
          ) : (
            <FolderTree
              folders={folders}
              notes={notes}
              activeNoteId={activeId}
              onSelectNote={(id) => {
                setActiveId(id);
                setView("edit");
                if (isMobile) setSidebarOpen(false);
              }}
              onCreateNote={handleCreateNote}
              onDeleteNote={(id) => setConfirmDelete({ kind: "note", id })}
              onTogglePin={handleTogglePin}
              onMoveNote={handleMoveNote}
              onCreateFolder={openCreateFolder}
              onRenameFolder={openRenameFolder}
              onDeleteFolder={(id) => setConfirmDelete({ kind: "folder", id })}
            />
          )}
        </div>

        <div className="border-t border-sidebar-border p-2.5 text-xs text-muted-foreground flex items-center justify-between">
          <div>
            📚 {notes.length} catatan · 📁 {folders.length} folder
          </div>
          <div className="flex gap-1">
            <button
              onClick={exportAll}
              title="Ekspor JSON"
              aria-label="Ekspor semua catatan"
              className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-accent"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => importFileRef.current?.click()}
              title="Impor JSON"
              aria-label="Impor catatan dari berkas"
              className="h-9 w-9 inline-flex items-center justify-center rounded hover:bg-accent"
            >
              <Upload className="w-4 h-4" />
            </button>

            <input
              ref={importFileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
              }}
            />
          </div>
        </div>
      </aside>

      {/* Main */}
      <main id="note-content" className="flex-1 flex flex-col min-w-0">
        <header className="h-12 shrink-0 border-b border-border flex items-center gap-2 px-3 bg-card/50 backdrop-blur">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded hover:bg-accent"
            title="Tampilkan / sembunyikan daftar catatan"
            aria-label="Tampilkan atau sembunyikan daftar catatan"
          >

            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeft className="w-4 h-4" />
            )}
          </button>
          {active ? (
            <>
              <Input
                value={active.title}
                onChange={(e) => updateActive({ title: e.target.value })}
                className="border-0 bg-transparent text-base font-semibold focus-visible:ring-0 px-2 h-9 flex-1 min-w-0"
                placeholder="Judul catatan"
              />
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                {savingState === "saving" && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Menyimpan
                  </span>
                )}
                {savingState === "saved" && <span>✓ Tersimpan</span>}
                <span className="hidden md:inline">
                  ·{" "}
                  {new Date(active.updated_at).toLocaleString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => runAi("refine")}
                  disabled={!!aiLoading}
                  className="h-8 text-xs gap-1"
                >
                  {aiLoading === "refine" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Rapihkan
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => runAi("summarize")}
                  disabled={!!aiLoading}
                  className="h-8 text-xs gap-1"
                >
                  {aiLoading === "summarize" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ListChecks className="w-3.5 h-3.5" />
                  )}
                  Ringkas
                </Button>
                <Button
                  size="sm"
                  variant={view === "game" ? "default" : "secondary"}
                  onClick={() => setView(view === "game" ? "edit" : "game")}
                  className="h-8 text-xs gap-1"
                >
                  <Gamepad2 className="w-3.5 h-3.5" /> Latihan
                </Button>
                <Button
                  size="sm"
                  variant={view === "methods" ? "default" : "secondary"}
                  onClick={() => setView(view === "methods" ? "edit" : "methods")}
                  className="h-8 text-xs gap-1"
                >
                  <Brain className="w-3.5 h-3.5" /> Metode
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleTogglePin(active.id)}
                  className="h-8 w-8 p-0"
                  title="Pin"
                >
                  <Pin className={`w-4 h-4 ${active.pinned ? "text-primary fill-primary" : ""}`} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={exportActiveMd}
                  className="h-8 w-8 p-0"
                  title="Unduh .md"
                >
                  <FileDown className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete({ kind: "note", id: active.id })}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile overflow menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="md:hidden h-8 w-8 p-0"
                    aria-label="Aksi catatan"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleTogglePin(active.id)}>
                    <Pin className="w-4 h-4 mr-2" /> {active.pinned ? "Lepas pin" : "Pin catatan"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportActiveMd}>
                    <FileDown className="w-4 h-4 mr-2" /> Unduh .md
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMaterialOpen(true)}>
                    <FileUp className="w-4 h-4 mr-2" /> Impor materi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDelete({ kind: "note", id: active.id })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Hapus catatan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Tidak ada catatan dipilih</div>
          )}
        </header>

        {active ? (
          <>
            {/* Mobile tabs */}
            <div className="md:hidden border-b border-border bg-card/30 overflow-x-auto">
              <Tabs value={view} onValueChange={(v) => setView(v as View)}>
                <TabsList className="w-full min-w-max rounded-none bg-transparent h-10">
                  <TabsTrigger value="edit" className="flex-1 gap-1 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="flex-1 gap-1 text-xs">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </TabsTrigger>
                  <TabsTrigger value="game" className="flex-1 gap-1 text-xs">
                    <Gamepad2 className="w-3.5 h-3.5" /> Latihan
                  </TabsTrigger>
                  <TabsTrigger value="methods" className="flex-1 gap-1 text-xs">
                    <Brain className="w-3.5 h-3.5" /> Metode
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {/* Panel Latihan & Metode tetap hidup (tidak di-unmount) saat pindah tab */}
            <div
              className={`${view === "game" ? "flex" : "hidden"} flex-1 min-h-0 overflow-y-auto bg-background`}
            >
              <div className="max-w-3xl w-full mx-auto space-y-4">
                <StudyGamePanel
                  content={active.content}
                  noteId={active.id}
                  noteTitle={active.title}
                  onSessionSaved={() => setGameHistoryRefresh((k) => k + 1)}
                />
                <NoteGameHistory refreshKey={gameHistoryRefresh} />
              </div>
            </div>
            <div
              className={`${view === "methods" ? "flex" : "hidden"} flex-1 min-h-0 overflow-y-auto bg-background`}
            >
              <div className="max-w-3xl w-full mx-auto">
                <StudyMethodsPanel
                  content={active.content}
                  noteId={active.id}
                  onAppend={(md) => updateActive({ content: active.content + md })}
                />
              </div>
            </div>
            <div
              className={`${view === "edit" || view === "preview" ? "flex" : "hidden"} flex-1 min-h-0`}
            >
              <div
                className={`${view === "edit" ? "flex" : "hidden"} md:flex flex-1 min-w-0 border-r border-border`}
              >
                <MarkdownEditor
                  value={active.content}
                  onChange={(v) => updateActive({ content: v })}
                  onSave={flushSave}
                />
              </div>
              <div
                className={`${view === "preview" ? "flex" : "hidden"} md:flex flex-1 min-w-0 overflow-y-auto p-6 bg-background animate-fade-in`}
              >
                <div className="max-w-3xl w-full mx-auto">
                  <MarkdownPreview source={active.content} />
                </div>
              </div>
            </div>

            {/* Mobile AI buttons */}
            <div className="md:hidden border-t border-border p-2 flex gap-2 bg-card/50">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => runAi("refine")}
                disabled={!!aiLoading}
                className="flex-1 gap-1"
              >
                {aiLoading === "refine" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Rapihkan
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => runAi("summarize")}
                disabled={!!aiLoading}
                className="flex-1 gap-1"
              >
                {aiLoading === "summarize" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ListChecks className="w-4 h-4" />
                )}
                Ringkas
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div className="max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Selamat datang di StudyNotes</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Mulai dari catatan kosong, atau unggah PPT, PDF, Word, atau rekaman audio — AI akan
                menyusun catatan lengkap beserta kuis dan flashcard.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => handleCreateNote(null)} className="gap-1">
                  <Plus className="w-4 h-4" /> Buat catatan baru
                </Button>
                <Button variant="outline" onClick={() => setMaterialOpen(true)} className="gap-1">
                  <FileUp className="w-4 h-4" /> Impor materi
                </Button>
              </div>
              <div className="mt-6 text-xs text-muted-foreground space-y-1">
                <div>
                  Pintasan: <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+N</kbd>{" "}
                  baru · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+S</kbd>{" "}
                  simpan · <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+F</kbd>{" "}
                  cari
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <MaterialImportDialog
        open={materialOpen}
        onOpenChange={setMaterialOpen}
        activeContent={active?.content}
        onCreated={createNoteFromMaterial}
        onEnriched={(title, content) => {
          updateActive({ title, content });
          setView("preview");
        }}
      />

      {/* Folder dialog */}
      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {folderDialog?.mode === "create" ? "Folder baru" : "Rename folder"}
            </DialogTitle>
            <DialogDescription>Beri nama folder kamu.</DialogDescription>
          </DialogHeader>
          <Input
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Nama folder"
            onKeyDown={(e) => e.key === "Enter" && submitFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderDialog(null)}>
              Batal
            </Button>
            <Button onClick={submitFolder}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin ingin menghapus?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "folder"
                ? "Folder dan semua catatan di dalamnya akan dihapus permanen."
                : "Catatan akan dihapus permanen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={reallyDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import mode dialog */}
      <Dialog open={!!importFile} onOpenChange={(o) => !o && setImportFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impor data</DialogTitle>
            <DialogDescription>
              Pilih cara menggabungkan data dari file{" "}
              <span className="font-mono">{importFile?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setImportMode("merge")}
              className={`p-3 rounded-md border-2 text-left transition-colors ${
                importMode === "merge"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="font-medium text-sm">Gabungkan</div>
              <div className="text-xs text-muted-foreground mt-1">Tambah ke data yang ada</div>
            </button>
            <button
              onClick={() => setImportMode("replace")}
              className={`p-3 rounded-md border-2 text-left transition-colors ${
                importMode === "replace"
                  ? "border-destructive bg-destructive/5"
                  : "border-border hover:bg-accent"
              }`}
            >
              <div className="font-medium text-sm">Ganti semua</div>
              <div className="text-xs text-muted-foreground mt-1">Hapus data lama dulu</div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportFile(null)}>
              Batal
            </Button>
            <Button onClick={runImport}>Impor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI result modal */}
      <Dialog open={!!aiResult} onOpenChange={(o) => !o && setAiResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {aiResult?.mode === "refine" ? (
                <>
                  <Sparkles className="w-4 h-4 text-primary" /> Hasil perbaikan AI
                </>
              ) : (
                <>
                  <ListChecks className="w-4 h-4 text-primary" /> Ringkasan
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {aiResult?.mode === "refine"
                ? "Pratinjau hasil. Terapkan untuk menggantikan teks asli."
                : "Poin-poin kunci dari catatanmu."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto border border-border rounded-md p-4 bg-background">
            {aiResult && <MarkdownPreview source={aiResult.text} />}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                if (aiResult) navigator.clipboard.writeText(aiResult.text);
                toast.success("Disalin");
              }}
            >
              Salin
            </Button>
            {aiResult?.mode === "summarize" && active && (
              <Button
                variant="secondary"
                onClick={() => {
                  updateActive({
                    content: active.content + "\n\n## Ringkasan\n\n" + aiResult.text,
                  });
                  setAiResult(null);
                }}
              >
                Sisipkan ke catatan
              </Button>
            )}
            {aiResult?.mode === "refine" && <Button onClick={applyAiResult}>Terapkan</Button>}
            <Button variant="outline" onClick={() => setAiResult(null)}>
              <X className="w-4 h-4 mr-1" /> Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster richColors position="bottom-right" />
    </div>
  );
}
