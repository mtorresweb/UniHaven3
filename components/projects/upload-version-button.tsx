"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, GitBranch } from "lucide-react";
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

export function UploadVersionButton({ projectId, currentVersion }: UploadVersionButtonProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...selected.filter((f) => !existing.has(f.name))];
    });
    e.target.value = "";
  }

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Debes seleccionar al menos un archivo.");
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    // Replace files field with actual File objects
    formData.delete("files");
    for (const file of files) formData.append("files", file);

    startTransition(async () => {
      const result = await uploadProjectVersion(projectId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Versión v${currentVersion + 1} publicada correctamente.`);
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
            Sube los archivos actualizados y describe los cambios realizados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
          </div>

          {/* File list */}
          {files.length > 0 && (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  <span className="truncate mr-2">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(file.name)}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || files.length === 0} className="gap-2">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Publicar v{currentVersion + 1}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
