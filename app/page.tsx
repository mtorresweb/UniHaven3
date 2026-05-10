import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Search, Upload, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24 gap-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-12 w-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
          El repositorio académico de la{" "}
          <span className="text-primary">UPC</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl">
          Descubre, comparte y preserva proyectos de grado, investigaciones y
          trabajos de aula de la Universidad Popular del Cesar.
        </p>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button asChild size="lg">
            <Link href="/projects">Explorar proyectos</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Crear cuenta</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 py-20 px-4">
        <div className="container mx-auto grid md:grid-cols-3 gap-8 max-w-4xl">
          {[
            {
              icon: Upload,
              title: "Sube tu proyecto",
              desc: "Estudiantes UPC pueden subir proyectos completos. Cada proyecto genera un repositorio GitHub automáticamente.",
            },
            {
              icon: Search,
              title: "Busca y descubre",
              desc: "Explora el conocimiento generado en la UPC. Filtra por área, año, tipo o palabras clave.",
            },
            {
              icon: Users,
              title: "Colabora y comenta",
              desc: "Deja reacciones, comenta, guarda favoritos y sigue proyectos que te interesan.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3">
              <div className="rounded-full bg-primary/10 p-4">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

