"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, GitBranch, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { uploadProjectVersion } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface UploadVersionButtonProps {
  projectId: string;
  currentVersion: number;
}

type FileEntry = { file: File; path: string };

/** Ruta relativa del archivo (preserva la estructura al subir carpetas). */
function getFilePath(file: File): string {
  return file.webkitRelativePath || file.name;
}

export function UploadVersionButton({
  projectId,
  currentVersion,
}: UploadVersionButtonProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      return [
        ...prev,
        ...selected
          .map((file) => ({ file, path: getFilePath(file) }))
          .filter((entry) => !existing.has(entry.path)),
      ];
    });
    e.target.value = "";
  }

  function removeFile(path: string) {
    setFiles((prev) => prev.filter((f) => f.path !== path));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Debes seleccionar al menos un archivo.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    // Replace files field with actual File objects + their relative paths
    formData.delete("files");
    formData.delete("paths");
    for (const entry of files) {
      formData.append("files", entry.file);
      formData.append("paths", entry.path);
    }

    startTransition(async () => {
      const result = await uploadProjectVersion(projectId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Versión v${currentVersion + 1} enviada para revisión.`);
      setOpen(false);
      setFiles([]);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <GitBranch className="h-4 w-4" />
          Subir nueva versión
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva versión — v{currentVersion + 1}</DialogTitle>
          <DialogDescription>
            Sube los archivos actualizados y describe los cambios realizados. La
            nueva versión quedará pendiente de aprobación por un administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-4 mt-2">
          {/* Changelog */}
          <div className="space-y-1.5">
            <Label htmlFor="changelog">Descripción de cambios</Label>
            <Textarea
              id="changelog"
              name="changelog"
              placeholder="Describe brevemente qué cambió en esta versión…"
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* File picker */}
          <div className="space-y-1.5">
            <Label>Archivos</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Upload className="h-5 w-5" />
              Haz clic para seleccionar archivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              {...({
                webkitdirectory: "",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/25 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <FolderOpen className="h-4 w-4" />
              Seleccionar carpeta
            </button>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {files.map((entry) => (
                <li
                  key={entry.path}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span className="mr-2 min-w-0 flex-1 truncate">
                    {entry.path}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(entry.path)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || files.length === 0}
              className="gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar v{currentVersion + 1} para revisión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
