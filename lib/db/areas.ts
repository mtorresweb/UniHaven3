import prisma from "@/lib/prisma";

const KNOWLEDGE_AREAS = [
  {
    name: "Ingeniería y Tecnología",
    slug: "ingenieria-tecnologia",
    description: "Facultad de Ingenierías y Tecnologías. Incluye Ingeniería de Sistemas, Ingeniería Civil, Electrónica, Agroindustrial.",
  },
  {
    name: "Ciencias Jurídicas y Políticas",
    slug: "ciencias-juridicas",
    description: "Facultad de Derecho, Ciencias Políticas y Sociales. Derecho, Ciencia Política.",
  },
  {
    name: "Ciencias de la Salud",
    slug: "ciencias-salud",
    description: "Facultad de Ciencias de la Salud. Medicina, Enfermería, Bacteriología, Regencia de Farmacia.",
  },
  {
    name: "Ciencias Económicas y Administrativas",
    slug: "ciencias-economicas",
    description: "Facultad de Ciencias Económicas y Administrativas. Administración de Empresas, Contaduría, Economía, Negocios Internacionales.",
  },
  {
    name: "Ciencias Básicas",
    slug: "ciencias-basicas",
    description: "Facultad de Ciencias Básicas. Biología, Química, Matemáticas, Física, Microbiología.",
  },
  {
    name: "Ciencias Sociales y Humanas",
    slug: "ciencias-sociales",
    description: "Facultad de Ciencias Sociales y Humanidades. Trabajo Social, Comunicación Social, Sociología, Psicología.",
  },
  {
    name: "Ciencias de la Educación",
    slug: "ciencias-educacion",
    description: "Facultad de Ciencias de la Educación. Licenciaturas, Pedagogía, Didáctica.",
  },
  {
    name: "Bellas Artes y Humanidades",
    slug: "bellas-artes",
    description: "Facultad de Bellas Artes y Humanidades. Artes Plásticas, Música, Literatura, Diseño.",
  },
  {
    name: "Ciencias Agropecuarias",
    slug: "ciencias-agropecuarias",
    description: "Facultad de Ciencias Agropecuarias. Agronomía, Zootecnia, Medicina Veterinaria.",
  },
  {
    name: "Interdisciplinar",
    slug: "interdisciplinar",
    description: "Proyectos que integran múltiples áreas del conocimiento.",
  },
];

export async function seedKnowledgeAreas() {
  console.log("🌱 Seeding knowledge areas...");
  let created = 0;
  for (const area of KNOWLEDGE_AREAS) {
    await prisma.knowledgeArea.upsert({
      where: { slug: area.slug },
      create: area,
      update: { name: area.name, description: area.description },
    });
    created++;
  }
  console.log(`✅ Seeded ${created} knowledge areas.`);
}
