"use client";

import { useActionState, useState, useRef, useCallback } from "react";
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

// Step 0 fields tracked in state so we can put them in hidden inputs on submit
type Meta = {
  title: string;
  abstract: string;
  type: string;
  areaId: string;
  year: string;
  license: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creando repositorio y subiendo archivos…
        </>
      ) : (
        <>
          <GitBranch className="mr-2 h-4 w-4" />
          Publicar proyecto
        </>
      )}
    </Button>
  );
}

export function UploadForm({ areas }: { areas: Area[] }) {
  const [step, setStep] = useState(0);

  // Step 0 — controlled metadata state
  const [meta, setMeta] = useState<Meta>({
    title: "",
    abstract: "",
    type: "",
    areaId: "",
    year: String(new Date().getFullYear()),
    license: "CC BY 4.0",
  });
  const [metaErrors, setMetaErrors] = useState<Partial<Meta & { files: string }>>({});

  // Step 1 — files
  const [fileList, setFileList] = useState<{ name: string; size: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Persistent File[] across step changes (fileInputRef goes null when step 1 unmounts)
  const filesRef = useRef<File[]>([]);

  // Keywords
  const [keywords, setKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");

  const [state, formAction] = useActionState<CreateProjectState, FormData>(
    createProject,
    {}
  );

  // ── Validation ────────────────────────────────────────────────────────────
  function validateStep0(): boolean {
    const errs: Partial<Meta> = {};
    if (!meta.title.trim() || meta.title.trim().length < 5)
      errs.title = "El título debe tener al menos 5 caracteres.";
    if (!meta.abstract.trim() || meta.abstract.trim().length < 50)
      errs.abstract = "El resumen debe tener al menos 50 caracteres.";
    if (!meta.type) errs.type = "Selecciona el tipo de proyecto.";
    if (!meta.areaId) errs.areaId = "Selecciona un área de conocimiento.";
    const y = parseInt(meta.year, 10);
    if (isNaN(y) || y < 1990 || y > new Date().getFullYear() + 1)
      errs.year = "Año inválido.";
    setMetaErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goToStep1() {
    if (validateStep0()) setStep(1);
  }

  function goToStep2() {
    if (fileList.length === 0) {
      setMetaErrors((e) => ({ ...e, files: "Debes subir al menos un archivo." }));
      return;
    }
    setMetaErrors((e) => { const n = { ...e }; delete n.files; return n; });
    setStep(2);
  }

  // ── File management ───────────────────────────────────────────────────────
  const syncDisplayList = useCallback((files: File[]) => {
    setFileList(files.map((f) => ({ name: f.name, size: f.size })));
  }, []);

  const mergeFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const existing = new Set(filesRef.current.map((f) => f.name));
      Array.from(incoming).forEach((f) => {
        if (!existing.has(f.name) && f.size > 0 && f.size <= MAX_FILE_SIZE) {
          filesRef.current.push(f);
          existing.add(f.name);
        }
      });
      syncDisplayList(filesRef.current);
      // Also sync the live DOM input if mounted
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        filesRef.current.forEach((f) => dt.items.add(f));
        fileInputRef.current.files = dt.files;
      }
    },
    [syncDisplayList]
  );

  const removeFile = useCallback(
    (name: string) => {
      filesRef.current = filesRef.current.filter((f) => f.name !== name);
      syncDisplayList(filesRef.current);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        filesRef.current.forEach((f) => dt.items.add(f));
        fileInputRef.current.files = dt.files;
      }
    },
    [syncDisplayList]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      mergeFiles(e.dataTransfer.files);
    },
    [mergeFiles]
  );

  const addKeyword = () => {
    const kw = kwInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && keywords.length < 10) {
      setKeywords((p) => [...p, kw]);
      setKwInput("");
    }
  };

  const totalSize = fileList.reduce((acc, f) => acc + f.size, 0);

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
                i === step ? "text-primary" : i < step ? "text-primary/60" : "text-muted-foreground"
              )}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
        <Progress value={((step + 1) / STEPS.length) * 100} />
      </div>

      {/* Server-side error */}
      {state.error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      {/* ── STEP 0: Metadata (not a form, just controlled inputs) ── */}
      {step === 0 && (
        <div className="grid gap-5">
          <div className="space-y-1.5">
            <Label>Título del proyecto *</Label>
            <Input
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              placeholder="Ej: Sistema de gestión de inventarios para PYMES del Cesar"
              maxLength={200}
            />
            {metaErrors.title && <p className="text-xs text-destructive">{metaErrors.title}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Resumen / Abstract *</Label>
            <Textarea
              value={meta.abstract}
              onChange={(e) => setMeta((m) => ({ ...m, abstract: e.target.value }))}
              placeholder="Describe brevemente el proyecto, sus objetivos y conclusiones…"
              rows={5}
              maxLength={2000}
            />
            {metaErrors.abstract && <p className="text-xs text-destructive">{metaErrors.abstract}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo de proyecto *</Label>
              <Select
                value={meta.type}
                onValueChange={(v) => setMeta((m) => ({ ...m, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THESIS">Tesis de Grado</SelectItem>
                  <SelectItem value="RESEARCH">Investigación</SelectItem>
                  <SelectItem value="CLASSROOM">Proyecto de Aula</SelectItem>
                </SelectContent>
              </Select>
              {metaErrors.type && <p className="text-xs text-destructive">{metaErrors.type}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Área de conocimiento *</Label>
              <Select
                value={meta.areaId}
                onValueChange={(v) => setMeta((m) => ({ ...m, areaId: v }))}
              >
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
              {metaErrors.areaId && <p className="text-xs text-destructive">{metaErrors.areaId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Año *</Label>
              <Input
                type="number"
                value={meta.year}
                onChange={(e) => setMeta((m) => ({ ...m, year: e.target.value }))}
                min={1990}
                max={new Date().getFullYear() + 1}
              />
              {metaErrors.year && <p className="text-xs text-destructive">{metaErrors.year}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Licencia</Label>
              <Select
                value={meta.license}
                onValueChange={(v) => setMeta((m) => ({ ...m, license: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                maxLength={40}
              />
              <Button type="button" variant="outline" onClick={addKeyword} disabled={keywords.length >= 10}>
                Agregar
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <button type="button" onClick={() => setKeywords((p) => p.filter((k) => k !== kw))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={goToStep1}>
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Files ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Upload className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Arrastra los archivos aquí</p>
              <p className="text-sm text-muted-foreground">o haz clic para seleccionar — máx. 50 MB por archivo</p>
            </div>
            <p className="text-xs text-muted-foreground">PDF, Word, Excel, PowerPoint, ZIP, imágenes, texto</p>
          </div>

          {/* Real file input — triggered programmatically */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS.join(",")}
            className="sr-only"
            onChange={(e) => mergeFiles(e.target.files)}
          />

          {fileList.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {fileList.length} archivo{fileList.length !== 1 ? "s" : ""} — Total: {formatBytes(totalSize)}
              </p>
              {fileList.map((f) => (
                <Card key={f.name} className="py-0">
                  <CardContent className="flex items-center gap-3 p-3">
                    <File className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(f.name)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {metaErrors.files && <p className="text-sm text-destructive">{metaErrors.files}</p>}
          {state.fieldErrors?.files && <p className="text-sm text-destructive">{state.fieldErrors.files}</p>}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <Button type="button" onClick={goToStep2} disabled={fileList.length === 0}>
              Siguiente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Review + actual form submission ── */}
      {step === 2 && (
        <form action={formAction} noValidate>
          {/* All metadata as hidden fields — no required, no native validation issues */}
          <input type="hidden" name="title" value={meta.title} />
          <input type="hidden" name="abstract" value={meta.abstract} />
          <input type="hidden" name="type" value={meta.type} />
          <input type="hidden" name="areaId" value={meta.areaId} />
          <input type="hidden" name="year" value={meta.year} />
          <input type="hidden" name="license" value={meta.license} />
          <input type="hidden" name="keywords" value={keywords.join(",")} />

          {/* File input — populated from the persistent filesRef */}
          <input
            type="file"
            name="files"
            multiple
            className="sr-only"
            ref={(el) => {
              if (el && filesRef.current.length > 0) {
                const dt = new DataTransfer();
                filesRef.current.forEach((f) => dt.items.add(f));
                el.files = dt.files;
              }
            }}
          />

          <div className="rounded-xl border bg-muted/30 p-5 space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-primary font-semibold">
              <CheckCircle className="h-4 w-4" /> Listo para publicar
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><span className="font-medium text-foreground">Título:</span> {meta.title}</p>
              <p><span className="font-medium text-foreground">Tipo:</span> {{ THESIS: "Tesis de Grado", RESEARCH: "Investigación", CLASSROOM: "Proyecto de Aula" }[meta.type]}</p>
              <p><span className="font-medium text-foreground">Año:</span> {meta.year}</p>
            </div>
            <ul className="text-sm space-y-1 text-muted-foreground pt-1 border-t">
              <li>📁 {fileList.length} archivo{fileList.length !== 1 ? "s" : ""} ({formatBytes(totalSize)})</li>
              <li>🌐 Se publicará públicamente en GitHub de inmediato</li>
              <li>⚡ Versión 1 — commit automático</li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>
            <SubmitButton />
          </div>
        </form>
      )}
    </div>
  );
}
