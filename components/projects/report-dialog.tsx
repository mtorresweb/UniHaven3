"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flag, Loader2, CheckCircle } from "lucide-react";
import { reportProject } from "@/app/actions/projects";

const CATEGORIES = [
  { value: "INAPPROPRIATE", label: "Contenido inapropiado" },
  { value: "PLAGIARISM", label: "Plagio o copia" },
  { value: "FALSE_INFO", label: "Información falsa" },
  { value: "OTHER", label: "Otro" },
] as const;

export function ReportDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!category) { setError("Selecciona una categoría."); return; }
    setError("");
    startTransition(async () => {
      const res = await reportProject(
        projectId,
        category as "INAPPROPRIATE" | "PLAGIARISM" | "FALSE_INFO" | "OTHER",
        description
      );
      if (res.error) { setError(res.error); return; }
      setSent(true);
    });
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) { setSent(false); setError(""); setCategory(""); setDescription(""); }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-destructive"
        >
          <Flag className="mr-2 h-3.5 w-3.5" />
          Reportar este proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reportar proyecto</DialogTitle>
          <DialogDescription>
            Los reportes son revisados por el equipo de administración. Solo usa
            esta función para contenido que incumpla las normas de la comunidad.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-primary" />
            <p className="font-medium">Reporte enviado</p>
            <p className="text-sm text-muted-foreground">
              Gracias por contribuir a mantener UniHaven. Lo revisaremos a la brevedad.
            </p>
            <Button onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Motivo *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo…" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report-desc">Descripción (opcional)</Label>
                <Textarea
                  id="report-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente el problema…"
                  rows={3}
                  maxLength={500}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                variant="destructive"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Flag className="mr-2 h-4 w-4" />
                )}
                Enviar reporte
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
