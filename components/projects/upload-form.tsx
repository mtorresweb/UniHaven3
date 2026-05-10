"use client";

import { useActionState, useState, useRef, useCallback, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { createProject, type CreateProjectState } from "@/app/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  File,
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

type Area = { id: string; name: string };

const STEPS = ["Información", "Archivos", "Revisión"];

const LICENSE_OPTIONS = [
  "CC BY 4.0",
  "CC BY-SA 4.0",
  "CC BY-NC 4.0",
  "CC BY-NC-SA 4.0",
  "CC BY-ND 4.0",
  "Todos los derechos reservados",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".ppt", ".pptx", ".zip", ".txt", ".png", ".jpg", ".jpeg", ".svg",
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Subiendo proyecto…
        </>
      ) : (
        <>
          <GitBranch className="mr-2 h-4 w-4" />
          Publicar en repositorio
        </>
      )}
    </Button>
  );
}

export function UploadForm({ areas }: { areas: Area[] }) {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [dragOver, setDragOver] = useState(false);
  // The actual named file input that gets submitted
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropInputRef = useRef<HTMLInputElement>(null);

  const [state, formAction] = useActionState<CreateProjectState, FormData>(
    createProject,
    {}
  );

  // Keep the named file input in sync with files state
  useEffect(() => {
    const el = fileInputRef.current;
    if (!el) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    el.files = dt.files;
  }, [files]);

  const addKeyword = useCallback(() => {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords((prev) => [...prev, kw]);
      setKwInput("");
    }
  }, [kwInput, keywords]);

  const removeKeyword = (kw: string) =>
    setKeywords((prev) => prev.filter((k) => k !== kw));

  const addFiles = useCallback((incoming: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [
        ...prev,
        ...incoming.filter((f) => !existing.has(f.name) && f.size <= MAX_FILE_SIZE),
      ];
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "transition-colors",
                i === step
                  ? "text-primary"
                  : i < step
                  ? "text-primary/60"
                  : "text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Global error */}
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-6">
        {/* Always-present hidden named file input — synced via useEffect */}
        <input ref={fileInputRef} type="file" name="files" multiple className="sr-only" aria-hidden tabIndex={-1} />
        {/* Hidden keywords field */}
        <input type="hidden" name="keywords" value={keywords.join(",")} />

        {/* ── STEP 0: Metadata ──────────────────────────────────────────── */}
        <div className={cn(step !== 0 && "hidden")}>
          <div className="grid gap-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Título del proyecto *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: Sistema de gestión de inventarios para PYMES del Cesar"
                required
                minLength={5}
                maxLength={200}
              />
              {state.fieldErrors?.title && (
                <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="abstract">Resumen / Abstract *</Label>
              <Textarea
                id="abstract"
                name="abstract"
                placeholder="Describe brevemente el proyecto, sus objetivos y conclusiones…"
                rows={5}
                required
                minLength={50}
                maxLength={2000}
              />
              {state.fieldErrors?.abstract && (
                <p className="text-xs text-destructive">{state.fieldErrors.abstract}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de proyecto *</Label>
                <Select name="type" required defaultValue="">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="THESIS">Tesis de Grado</SelectItem>
                    <SelectItem value="RESEARCH">Investigación</SelectItem>
                    <SelectItem value="CLASSROOM">Proyecto de Aula</SelectItem>
                  </SelectContent>
                </Select>
                {state.fieldErrors?.type && (
                  <p className="text-xs text-destructive">{state.fieldErrors.type}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Área de conocimiento *</Label>
                <Select name="areaId" required defaultValue="">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.fieldErrors?.areaId && (
                  <p className="text-xs text-destructive">{state.fieldErrors.areaId}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="year">Año *</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                  defaultValue={new Date().getFullYear()}
                  required
                />
                {state.fieldErrors?.year && (
                  <p className="text-xs text-destructive">{state.fieldErrors.year}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Licencia</Label>
                <Select name="license" defaultValue="CC BY 4.0">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Palabras clave (máx. 10)</Label>
              <div className="flex gap-2">
                <Input
                  value={kwInput}
                  onChange={(e) => setKwInput(e.target.value)}
                  placeholder="Escribe una palabra y presiona Agregar"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  maxLength={40}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addKeyword}
                  disabled={keywords.length >= 10}
                >
                  Agregar
                </Button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <button type="button" onClick={() => removeKeyword(kw)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={() => setStep(1)}>
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── STEP 1: Files ─────────────────────────────────────────────── */}
        <div className={cn(step !== 1 && "hidden")}>
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => dropInputRef.current?.click()}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Arrastra los archivos aquí</p>
                <p className="text-sm text-muted-foreground">
                  o haz clic para seleccionar — máx. 50 MB por archivo
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, PowerPoint, ZIP, imágenes, texto
              </p>
              {/* Non-named input just for picking via dialog */}
              <input
                ref={dropInputRef}
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(",")}
                className="sr-only"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {files.length} archivo{files.length !== 1 ? "s" : ""} — Total:{" "}
                  {formatBytes(totalSize)}
                </p>
                {files.map((f) => (
                  <Card key={f.name} className="py-0">
                    <CardContent className="flex items-center gap-3 p-3">
                      <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeFile(f.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {state.fieldErrors?.files && (
              <p className="text-sm text-destructive">{state.fieldErrors.files}</p>
            )}
          </div>

          <div className="mt-6 flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={files.length === 0}
            >
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── STEP 2: Review ────────────────────────────────────────────── */}
        <div className={cn(step !== 2 && "hidden")}>
          <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm text-primary font-semibold">
              <CheckCircle className="h-4 w-4" /> Listo para enviar a revisión
            </div>
            <p className="text-sm text-muted-foreground">
              Tu proyecto se subirá a un repositorio{" "}
              <strong>privado</strong> en GitHub. Un administrador lo revisará
              y lo hará público cuando sea aprobado.
            </p>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>📁 {files.length} archivo{files.length !== 1 ? "s" : ""} ({formatBytes(totalSize)})</li>
              <li>🔒 Visibilidad inicial: privado</li>
              <li>⚡ Versión 1 — commit automático en GitHub</li>
            </ul>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <SubmitButton />
          </div>
        </div>
      </form>
    </div>
  );
}
