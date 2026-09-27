import { useState, useMemo } from "react";
import {
  Folder as FolderIcon,
  FolderOpen,
  FileText,
  Plus,
  MoreVertical,
  Pin,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Eye,
  Clock3,
} from "lucide-react";
import type { Folder, Note } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownPreview } from "@/components/studynotes/MarkdownPreview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  folders: Folder[];
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onTogglePin: (id: string) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
};

function getNoteSummary(content: string) {
  const checklist = Array.from(content.matchAll(/^\s*[-*+]\s+\[([ xX])\]\s+.*$/gm));
  const checklistTotal = checklist.length;
  const checklistDone = checklist.filter((item) => item[1]?.toLowerCase() === "x").length;
  const readableText = content
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+.*$/gm, "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~`|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return {
    checklistDone,
    checklistTotal,
    preview: readableText || "Catatan ini belum memiliki isi.",
    readingMinutes: Math.max(1, Math.ceil(words / 200)),
  };
}

export function FolderTree(props: Props) {
  const {
    folders,
    notes,
    activeNoteId,
    onSelectNote,
    onCreateNote,
    onDeleteNote,
    onTogglePin,
    onMoveNote,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
  } = props;

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | "root" | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [quickViewNote, setQuickViewNote] = useState<Note | null>(null);

  const childMap = useMemo(() => {
    const m: Record<string, Folder[]> = { root: [] };
    folders.forEach((f) => {
      const key = f.parent_id ?? "root";
      (m[key] ??= []).push(f);
    });
    return m;
  }, [folders]);

  const notesByFolder = useMemo(() => {
    const m: Record<string, Note[]> = { unfiled: [] };
    notes.forEach((n) => {
      const key = n.folder_id ?? "unfiled";
      (m[key] ??= []).push(n);
    });
    Object.values(m).forEach((arr) =>
      arr.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      })
    );
    return m;
  }, [notes]);

  const toggle = (id: string) => setOpenFolders((p) => ({ ...p, [id]: !p[id] }));

  const handleDrop = (folderId: string | null) => {
    if (dragNoteId) onMoveNote(dragNoteId, folderId);
    setDragNoteId(null);
    setDragOver(null);
  };

  const renderNote = (n: Note) => {
    const summary = getNoteSummary(n.content);
    const expanded = expandedNotes[n.id] ?? false;
    const progress = summary.checklistTotal
      ? Math.round((summary.checklistDone / summary.checklistTotal) * 100)
      : 0;

    return (
      <article
        key={n.id}
        draggable
        onDragStart={() => setDragNoteId(n.id)}
        onDragEnd={() => {
          setDragNoteId(null);
          setDragOver(null);
        }}
        onClick={() => onSelectNote(n.id)}
        className={`group/note my-1.5 ml-2 overflow-hidden rounded-md border cursor-pointer transition-all duration-200 hover:-translate-y-px hover:shadow-sm ${
          activeNoteId === n.id
            ? "border-primary/35 bg-primary/10"
            : "border-sidebar-border bg-background/70 hover:border-primary/25"
        }`}
      >
        <div className="flex items-start gap-2 px-3 pt-2.5">
          {n.pinned ? (
            <Pin className="mt-0.5 w-3.5 h-3.5 text-primary shrink-0 fill-primary" aria-label="Disematkan" />
          ) : (
            <FileText className="mt-0.5 w-3.5 h-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <h3 className="min-w-0 flex-1 text-[0.95rem] font-bold leading-snug text-foreground">
            {n.title || "Untitled"}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-70 sm:opacity-0 sm:group-hover/note:opacity-100 focus-visible:opacity-100"
                aria-label={`Menu ${n.title || "Untitled"}`}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onTogglePin(n.id)}>
                <Pin className="w-4 h-4 mr-2" /> {n.pinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <FolderIcon className="w-4 h-4 mr-2" /> Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onMoveNote(n.id, null)}>(Unfiled)</DropdownMenuItem>
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => onMoveNote(n.id, f.id)}>
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteNote(n.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className={`relative px-3 pt-2 text-xs leading-relaxed text-muted-foreground ${expanded ? "max-h-72 overflow-y-auto" : "note-preview-fade line-clamp-3"}`}>
          {summary.preview}
        </div>

        {summary.checklistTotal > 0 && (
          <div className="mx-3 mt-2 rounded-md bg-muted px-2 py-1.5" aria-label={`${summary.checklistDone} dari ${summary.checklistTotal} tugas selesai`}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-muted-foreground">
              <span>Checklist</span>
              <span>{summary.checklistDone}/{summary.checklistTotal} selesai</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1 border-t border-sidebar-border px-2 py-1.5">
          <span className="mr-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock3 className="h-3 w-3" aria-hidden="true" /> {summary.readingMinutes} min read
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-70 sm:opacity-0 sm:group-hover/note:opacity-100 focus-visible:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              setQuickViewNote(n);
            }}
            aria-label={`Quick View ${n.title || "Untitled"}`}
            title="Quick View"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedNotes((current) => ({ ...current, [n.id]: !expanded }));
            }}
            aria-expanded={expanded}
            aria-label={expanded ? "Ciutkan isi catatan" : "Perluas isi catatan"}
            title={expanded ? "Ciutkan" : "Perluas"}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </article>
    );
  };

  const renderFolder = (f: Folder, depth: number) => {
    const open = openFolders[f.id] ?? true;
    const kids = childMap[f.id] ?? [];
    const folderNotes = notesByFolder[f.id] ?? [];
    return (
      <div key={f.id}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(f.id);
          }}
          onDragLeave={() => setDragOver((p) => (p === f.id ? null : p))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(f.id);
          }}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`group flex items-center gap-1 pr-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-accent ${
            dragOver === f.id ? "bg-primary/10 ring-1 ring-primary" : ""
          }`}
        >
          <button onClick={() => toggle(f.id)} className="p-0.5">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {open ? (
            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
          ) : (
            <FolderIcon className="w-4 h-4 text-primary shrink-0" />
          )}
          <span className="truncate flex-1 font-medium" onClick={() => toggle(f.id)}>
            {f.name}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-background rounded">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateNote(f.id)}>
                <Plus className="w-4 h-4 mr-2" /> New note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCreateFolder(f.id)}>
                <FolderPlus className="w-4 h-4 mr-2" /> New subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRenameFolder(f.id)}>
                <Edit2 className="w-4 h-4 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeleteFolder(f.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {open && (
          <div className="animate-fade-in">
            {kids.map((k) => renderFolder(k, depth + 1))}
            <div style={{ paddingLeft: `${depth * 12}px` }}>
              {folderNotes.map(renderNote)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const rootFolders = childMap.root ?? [];
  const unfiled = notesByFolder.unfiled ?? [];

  return (
    <>
      <div className="space-y-0.5">
        {rootFolders.map((f) => renderFolder(f, 0))}
        {unfiled.length > 0 && (
        <div
          className={`mt-2 ${dragOver === "root" ? "bg-primary/10 ring-1 ring-primary rounded-md" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver("root");
          }}
          onDragLeave={() => setDragOver((p) => (p === "root" ? null : p))}
          onDrop={(e) => {
            e.preventDefault();
            handleDrop(null);
          }}
        >
          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Unfiled
          </div>
          {unfiled.map(renderNote)}
        </div>
        )}
      </div>

      <Dialog open={!!quickViewNote} onOpenChange={(open) => !open && setQuickViewNote(null)}>
        <DialogContent className="flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <DialogTitle className="text-xl leading-snug">{quickViewNote?.title || "Untitled"}</DialogTitle>
            <DialogDescription className="flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {quickViewNote ? getNoteSummary(quickViewNote.content).readingMinutes : 1} min read
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8">
            {quickViewNote && <MarkdownPreview source={quickViewNote.content} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
