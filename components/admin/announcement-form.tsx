"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementListItem,
} from "@/app/actions/announcements";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MAX_COVER_IMAGE_SIZE = 5 * 1024 * 1024;

interface AnnouncementFormProps {
  announcement?: Pick<
    AnnouncementListItem,
    "id" | "title" | "body" | "pinned" | "coverImage"
  >;
}

export function AnnouncementForm({ announcement }: AnnouncementFormProps) {
  const router = useRouter();
  const isEditing = Boolean(announcement);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(announcement?.title ?? "");
  const [body, setBody] = useState(announcement?.body ?? "");
  const [pinned, setPinned] = useState(announcement?.pinned ?? false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [removeCoverImage, setRemoveCoverImage] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    announcement?.coverImage ?? null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview]);

  function updateCoverPreview(nextPreview: string | null) {
    setCoverPreview((currentPreview) => {
      if (currentPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(currentPreview);
      }

      return nextPreview;
    });
  }

  function resetFields() {
    setTitle(announcement?.title ?? "");
    setBody(announcement?.body ?? "");
    setPinned(announcement?.pinned ?? false);
    setCoverFile(null);
    setRemoveCoverImage(false);
    updateCoverPreview(announcement?.coverImage ?? null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      resetFields();
    }
  }

  function handleCoverChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setCoverFile(null);
      updateCoverPreview(removeCoverImage ? null : announcement?.coverImage ?? null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      setCoverFile(null);
      toast.error("Solo se permiten imágenes para la portada.");
      return;
    }

    if (file.size > MAX_COVER_IMAGE_SIZE) {
      event.target.value = "";
      setCoverFile(null);
      toast.error("La portada no puede superar los 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setRemoveCoverImage(false);
    setCoverFile(file);
    updateCoverPreview(objectUrl);
  }

  function clearSelectedFile() {
    setCoverFile(null);
    setRemoveCoverImage(false);
    updateCoverPreview(announcement?.coverImage ?? null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleRemoveCoverImage() {
    if (coverFile) {
      clearSelectedFile();
      return;
    }

    setRemoveCoverImage(true);
    updateCoverPreview(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData();
    formData.set("title", title);
    formData.set("body", body);
    if (pinned) {
      formData.set("pinned", "on");
    }
    if (coverFile) {
      formData.set("coverImage", coverFile);
    }
    if (removeCoverImage) {
      formData.set("removeCoverImage", "on");
    }

    startTransition(async () => {
      const result = isEditing
        ? await updateAnnouncement(announcement!.id, formData)
        : await createAnnouncement(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEditing
          ? "Anuncio actualizado correctamente."
          : "Anuncio creado correctamente."
      );
      handleOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        ) : (
          <Button type="button">
            <Plus className="h-4 w-4" />
            Nuevo anuncio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar anuncio" : "Crear nuevo anuncio"}
          </DialogTitle>
          <DialogDescription>
            Publica información importante para toda la comunidad de UniHaven.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor={
                isEditing ? `announcement-title-${announcement?.id}` : "announcement-title"
              }
            >
              Título
            </Label>
            <Input
              id={
                isEditing ? `announcement-title-${announcement?.id}` : "announcement-title"
              }
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={
                isEditing ? `announcement-body-${announcement?.id}` : "announcement-body"
              }
            >
              Contenido
            </Label>
            <Textarea
              id={
                isEditing ? `announcement-body-${announcement?.id}` : "announcement-body"
              }
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={7}
              maxLength={5000}
              placeholder="Comparte fechas, cambios o información relevante para los usuarios."
              disabled={isPending}
              required
            />
          </div>

          <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
            <div className="space-y-2">
              <Label
                htmlFor={
                  isEditing ? `announcement-cover-${announcement?.id}` : "announcement-cover"
                }
              >
                Imagen de portada
              </Label>
              <Input
                ref={fileInputRef}
                id={
                  isEditing ? `announcement-cover-${announcement?.id}` : "announcement-cover"
                }
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                disabled={isPending}
              />
              <p className="text-sm text-muted-foreground">
                Opcional. Se sube a Vercel Blob al guardar el anuncio.
              </p>
            </div>

            {coverPreview ? (
              <div className="space-y-3">
                <div className="relative h-40 overflow-hidden rounded-xl border bg-background">
                  <Image
                    src={coverPreview}
                    alt="Vista previa de la portada"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveCoverImage}
                  disabled={isPending}
                >
                  {coverFile ? "Descartar imagen seleccionada" : "Quitar imagen actual"}
                </Button>
              </div>
            ) : null}

            {!coverPreview && removeCoverImage && announcement?.coverImage ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                <span>La imagen actual se eliminará al guardar.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRemoveCoverImage(false);
                    updateCoverPreview(announcement?.coverImage ?? null);
                  }}
                  disabled={isPending}
                >
                  Restaurar imagen
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-3">
            <Checkbox
              id={isEditing ? `announcement-pinned-${announcement?.id}` : "announcement-pinned"}
              checked={pinned}
              onCheckedChange={(checked) => setPinned(checked === true)}
              disabled={isPending}
            />
            <div className="space-y-1">
              <Label
                htmlFor={
                  isEditing ? `announcement-pinned-${announcement?.id}` : "announcement-pinned"
                }
              >
                Fijar anuncio
              </Label>
              <p className="text-sm text-muted-foreground">
                Los anuncios fijados aparecen primero y pueden mostrarse en el feed principal.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEditing ? "Guardar cambios" : "Publicar anuncio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
