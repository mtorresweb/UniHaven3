import bcrypt from "bcryptjs";
import { Octokit } from "octokit";
import prisma from "@/lib/prisma";
import { Role } from "@/lib/constants";
import { seedKnowledgeAreas } from "@/lib/db/areas";

type SeedUser = {
  name: string;
  email: string;
  role: (typeof Role)[keyof typeof Role];
  bio: string;
  orcid?: string;
  image?: string;
};

type SeedProject = {
  title: string;
  abstract: string;
  type: "THESIS" | "RESEARCH" | "CLASSROOM";
  year: number;
  license: string;
  areaSlug: string;
  keywords: string[];
  repo: string;
  authors: string[];
  files: Array<{ name: string; path: string; mimeType: string; size: number }>;
  changelog: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PASSWORD = "Unihaven123!";

const USERS: SeedUser[] = [
  {
    name: "Andrea Paola Rodríguez",
    email: "andrea.rodriguez@unicesar.edu.co",
    role: Role.ADMIN,
    bio: "Docente e investigadora en ingeniería de software. Coordino procesos de publicación y revisión en UniHaven.",
    orcid: "0000-0002-5198-1123",
  },
  {
    name: "Carlos David Pacheco",
    email: "carlos.pacheco@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Estudiante de Ingeniería de Sistemas enfocado en backend, DevOps y observabilidad.",
    orcid: "0000-0001-8190-4521",
  },
  {
    name: "María José Daza",
    email: "maria.daza@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Investigadora junior en analítica educativa y ciencia de datos aplicada.",
  },
  {
    name: "Juan Esteban Oñate",
    email: "juan.onate@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Desarrollo frontend con React y arquitectura de diseño para productos académicos.",
  },
  {
    name: "Valentina Romero",
    email: "valentina.romero@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Interesada en ciberseguridad, respuesta a incidentes y análisis forense digital.",
  },
  {
    name: "Sebastián Arias",
    email: "sebastian.arias@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Trabajo en automatización de pruebas y calidad de software para aplicaciones web.",
  },
  {
    name: "Laura Catalina Quintero",
    email: "laura.quintero@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Apasionada por UX research, accesibilidad y diseño centrado en usuario.",
  },
  {
    name: "Daniel Felipe Duarte",
    email: "daniel.duarte@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Arquitectura cloud y microservicios para plataformas de alto tráfico.",
  },
  {
    name: "Paula Andrea Cárdenas",
    email: "paula.cardenas@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Procesamiento de lenguaje natural para sistemas académicos en español.",
  },
  {
    name: "Miguel Ángel Rincón",
    email: "miguel.rincon@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Experiencia en redes, IoT y plataformas de monitoreo en tiempo real.",
  },
  {
    name: "Natalia Herrera",
    email: "natalia.herrera@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Investigación aplicada en aprendizaje automático para salud pública.",
  },
  {
    name: "José Armando Mejía",
    email: "jose.mejia@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Integro software y hardware para soluciones de agricultura inteligente.",
  },
  {
    name: "Camila Torres",
    email: "camila.torres@gmail.com",
    role: Role.GENERAL,
    bio: "Egresada UPC interesada en tendencias de tecnología educativa y comunidades open source.",
  },
  {
    name: "Felipe Sánchez",
    email: "felipe.sanchez@gmail.com",
    role: Role.GENERAL,
    bio: "Product manager con foco en plataformas de investigación y repositorios institucionales.",
  },
  {
    name: "Ana Lucía Vega",
    email: "ana.vega@yahoo.com",
    role: Role.GENERAL,
    bio: "Diseñadora de información para portales científicos y bibliotecas digitales.",
  },
  {
    name: "Cristian Narváez",
    email: "cristian.narvaez@unicesar.edu.co",
    role: Role.UPC_STUDENT,
    bio: "Construyo dashboards operativos para gestión académica y análisis institucional.",
  },
];

const PROJECTS: SeedProject[] = [
  {
    title: "Plataforma predictiva de deserción académica usando series temporales",
    abstract:
      "Este trabajo propone una arquitectura de analítica institucional para estimar riesgo de deserción por cohorte estudiantil. Se integran variables socioeconómicas, rendimiento por corte, asistencia y participación en campus virtual, entrenando modelos híbridos con gradiente boosting y redes recurrentes. El sistema entrega alertas tempranas y explica factores de riesgo por programa.",
    type: "THESIS",
    year: 2026,
    license: "MIT",
    areaSlug: "ingenieria-tecnologia",
    keywords: ["analitica", "educacion", "machine-learning", "prediccion", "desercion"],
    repo: "upc-academia/2026-thesis-desercion-academica-predictiva",
    authors: [
      "maria.daza@unicesar.edu.co",
      "daniel.duarte@unicesar.edu.co",
    ],
    files: [
      { name: "documento-final.pdf", path: "files/documento-final.pdf", mimeType: "application/pdf", size: 4_240_000 },
      { name: "dataset-limpio.csv", path: "files/dataset-limpio.csv", mimeType: "text/csv", size: 1_720_000 },
      { name: "notebooks-modelado.ipynb", path: "files/notebooks-modelado.ipynb", mimeType: "application/x-ipynb+json", size: 890_000 },
    ],
    changelog: [
      "Versión inicial con EDA y baseline logístico.",
      "Se incorpora modelo XGBoost y validación temporal.",
      "Se añade módulo de explicabilidad con SHAP y reporte institucional.",
    ],
  },
  {
    title: "Asistente de escritura académica en español para trabajos de grado",
    abstract:
      "Se desarrolla un asistente de apoyo a redacción académica para estudiantes de la UPC con enfoque en gramática, coherencia argumentativa y normalización de citas. El prototipo usa un pipeline NLP para detección de ambigüedad, repetición léxica y formato de referencias, con retroalimentación contextual dentro de una interfaz web.",
    type: "RESEARCH",
    year: 2025,
    license: "Apache-2.0",
    areaSlug: "ciencias-sociales",
    keywords: ["nlp", "espanol", "redaccion", "investigacion", "educacion"],
    repo: "upc-academia/2025-research-asistente-redaccion-academica",
    authors: [
      "paula.cardenas@unicesar.edu.co",
      "laura.quintero@unicesar.edu.co",
    ],
    files: [
      { name: "informe-investigacion.pdf", path: "files/informe-investigacion.pdf", mimeType: "application/pdf", size: 3_860_000 },
      { name: "corpus-anonimizado.json", path: "files/corpus-anonimizado.json", mimeType: "application/json", size: 650_000 },
      { name: "resultados-evaluacion.xlsx", path: "files/resultados-evaluacion.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 420_000 },
    ],
    changelog: [
      "Base lingüística inicial y reglas de estilo.",
      "Integración de análisis de coherencia y citas APA.",
      "Panel de recomendaciones y métricas comparativas.",
    ],
  },
  {
    title: "Gemelo digital para monitoreo de cultivos en clima semiárido",
    abstract:
      "Proyecto interdisciplinar que integra sensores IoT, telemetría y modelos de simulación para seguimiento de humedad del suelo y estrés hídrico en cultivos de maíz. El gemelo digital permite comparar escenarios de riego y fertilización, optimizando consumo de agua y productividad en parcelas piloto del Cesar.",
    type: "THESIS",
    year: 2024,
    license: "CC BY 4.0",
    areaSlug: "ciencias-agropecuarias",
    keywords: ["iot", "agrotech", "digital-twin", "riego", "sensores"],
    repo: "upc-academia/2024-thesis-gemelo-digital-cultivos",
    authors: [
      "jose.mejia@unicesar.edu.co",
      "miguel.rincon@unicesar.edu.co",
    ],
    files: [
      { name: "tesis-gemelo-digital.pdf", path: "files/tesis-gemelo-digital.pdf", mimeType: "application/pdf", size: 5_100_000 },
      { name: "firmware-sensores.zip", path: "files/firmware-sensores.zip", mimeType: "application/zip", size: 2_780_000 },
      { name: "dashboard-prototipo.fig", path: "files/dashboard-prototipo.fig", mimeType: "application/octet-stream", size: 1_480_000 },
    ],
    changelog: [
      "Definición de arquitectura de sensores y pasarela MQTT.",
      "Modelo de simulación y tablero de monitoreo.",
      "Ajustes de calibración y validación en campo.",
    ],
  },
  {
    title: "Sistema de trazabilidad para reactivos en laboratorios universitarios",
    abstract:
      "Se propone una solución de trazabilidad para inventario de reactivos y material sensible con códigos QR, alertas de vencimiento y bitácora de uso. El sistema mejora control interno y minimiza pérdidas, con reportes auditables por laboratorio y periodo académico.",
    type: "CLASSROOM",
    year: 2026,
    license: "GPL-3.0",
    areaSlug: "ciencias-salud",
    keywords: ["trazabilidad", "inventario", "laboratorio", "qr", "seguridad"],
    repo: "upc-academia/2026-classroom-trazabilidad-reactivos",
    authors: [
      "valentina.romero@unicesar.edu.co",
      "cristian.narvaez@unicesar.edu.co",
    ],
    files: [
      { name: "proyecto-aula-reactivos.pdf", path: "files/proyecto-aula-reactivos.pdf", mimeType: "application/pdf", size: 2_760_000 },
      { name: "api-spec.yaml", path: "files/api-spec.yaml", mimeType: "application/yaml", size: 210_000 },
      { name: "manual-operativo.docx", path: "files/manual-operativo.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 520_000 },
    ],
    changelog: [
      "MVP con catálogo de reactivos y vencimientos.",
      "Lectura QR y bitácora de préstamo por laboratorio.",
      "Indicadores de uso, desperdicio y auditoría.",
    ],
  },
  {
    title: "Optimización de rutas de transporte universitario con heurísticas híbridas",
    abstract:
      "Este estudio evalúa técnicas metaheurísticas para optimizar rutas de transporte universitario considerando demanda variable, ventanas de tiempo y congestión urbana. Se plantea una estrategia híbrida con búsqueda tabú y recocido simulado para reducir tiempos de viaje y costos operativos.",
    type: "RESEARCH",
    year: 2025,
    license: "MIT",
    areaSlug: "ingenieria-tecnologia",
    keywords: ["optimizacion", "rutas", "metaheuristicas", "movilidad", "logistica"],
    repo: "upc-academia/2025-research-optimizacion-rutas-transporte",
    authors: [
      "carlos.pacheco@unicesar.edu.co",
      "sebastian.arias@unicesar.edu.co",
    ],
    files: [
      { name: "paper-ruteo.pdf", path: "files/paper-ruteo.pdf", mimeType: "application/pdf", size: 1_900_000 },
      { name: "instancias-prueba.json", path: "files/instancias-prueba.json", mimeType: "application/json", size: 440_000 },
      { name: "simulador-rutas.py", path: "files/simulador-rutas.py", mimeType: "text/x-python", size: 120_000 },
    ],
    changelog: [
      "Formulación del problema y dataset sintético.",
      "Heurística híbrida y evaluación comparativa.",
      "Ajuste de parámetros y visualización de rutas.",
    ],
  },
  {
    title: "Repositorio multimedia para memoria histórica del Cesar",
    abstract:
      "Proyecto de aula orientado a preservar memoria oral y documental de comunidades del Cesar mediante una biblioteca multimedia indexada. Incluye ingesta de entrevistas, metadatos normalizados y motor de búsqueda por territorio, periodo y actores sociales.",
    type: "CLASSROOM",
    year: 2024,
    license: "CC BY-SA 4.0",
    areaSlug: "bellas-artes",
    keywords: ["memoria-historica", "archivo", "multimedia", "busqueda", "patrimonio"],
    repo: "upc-academia/2024-classroom-memoria-historica-cesar",
    authors: [
      "ana.vega@yahoo.com",
      "laura.quintero@unicesar.edu.co",
    ],
    files: [
      { name: "informe-curatorial.pdf", path: "files/informe-curatorial.pdf", mimeType: "application/pdf", size: 3_440_000 },
      { name: "catalogo-metadatos.csv", path: "files/catalogo-metadatos.csv", mimeType: "text/csv", size: 260_000 },
      { name: "linea-editorial.md", path: "files/linea-editorial.md", mimeType: "text/markdown", size: 32_000 },
    ],
    changelog: [
      "Esquema de metadatos y flujo de digitalización.",
      "Motor de consulta por facetas y filtros semánticos.",
      "Sección de exhibiciones temáticas y colecciones.",
    ],
  },
  {
    title: "Framework de pruebas automáticas para apps web universitarias",
    abstract:
      "Se diseña un framework de automatización de pruebas end-to-end y contract testing orientado a aplicaciones académicas. El enfoque incorpora pipelines CI, selección de casos críticos por impacto y tableros de calidad para seguimiento de regresiones.",
    type: "THESIS",
    year: 2026,
    license: "MIT",
    areaSlug: "ingenieria-tecnologia",
    keywords: ["testing", "qa", "ci-cd", "e2e", "calidad"],
    repo: "upc-academia/2026-thesis-framework-testing-web",
    authors: [
      "sebastian.arias@unicesar.edu.co",
      "juan.onate@unicesar.edu.co",
    ],
    files: [
      { name: "tesis-testing.pdf", path: "files/tesis-testing.pdf", mimeType: "application/pdf", size: 2_980_000 },
      { name: "suite-pruebas.zip", path: "files/suite-pruebas.zip", mimeType: "application/zip", size: 1_140_000 },
      { name: "matriz-riesgo.xlsx", path: "files/matriz-riesgo.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 310_000 },
    ],
    changelog: [
      "Definición de arquitectura de pruebas y criterios de riesgo.",
      "Integración con CI y reportes automáticos por módulo.",
      "Cobertura ampliada y métricas de confiabilidad.",
    ],
  },
  {
    title: "Modelo de análisis de sentimiento para opinión estudiantil en foros",
    abstract:
      "Investigación aplicada para identificar percepción estudiantil en foros institucionales y canales de retroalimentación. Se comparan modelos clásicos y transformadores ligeros, con énfasis en español colombiano y explicaciones por aspecto.",
    type: "RESEARCH",
    year: 2025,
    license: "Apache-2.0",
    areaSlug: "interdisciplinar",
    keywords: ["sentimiento", "nlp", "foros", "analitica-social", "transformers"],
    repo: "upc-academia/2025-research-sentimiento-foros-estudiantiles",
    authors: [
      "natalia.herrera@unicesar.edu.co",
      "paula.cardenas@unicesar.edu.co",
      "felipe.sanchez@gmail.com",
    ],
    files: [
      { name: "articulo-sentimiento.pdf", path: "files/articulo-sentimiento.pdf", mimeType: "application/pdf", size: 2_220_000 },
      { name: "dataset-etiquetado.jsonl", path: "files/dataset-etiquetado.jsonl", mimeType: "application/json", size: 980_000 },
      { name: "metricas-modelos.csv", path: "files/metricas-modelos.csv", mimeType: "text/csv", size: 120_000 },
    ],
    changelog: [
      "Corpus inicial y esquema de etiquetado por aspecto.",
      "Comparación de modelos y calibración por dominio.",
      "Tablero de insights con explicaciones por categoría.",
    ],
  },
];

const PROJECT_COMMENT_SNIPPETS = [
  "Excelente enfoque metodológico, especialmente la validación cruzada por cohorte.",
  "Me gustó que incluyeran limitaciones y trabajo futuro con bastante detalle.",
  "¿Han probado comparar este modelo con una línea base más simple para estimar ganancia real?",
  "La documentación del repositorio está clara y facilita replicar los resultados.",
  "Este proyecto podría escalar muy bien a nivel institucional con pocos ajustes.",
];

const DM_SNIPPETS = [
  "Hola, ¿puedes revisar el apartado de resultados antes de la sustentación?",
  "Claro, te dejo comentarios sobre métricas y visualizaciones en un rato.",
  "Perfecto, también quiero validar el changelog de la versión 3.",
  "Listo, acabo de subir recomendaciones y pruebas adicionales.",
  "Gracias, con esto ya podemos cerrar la entrega final.",
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * DAY_MS);
}

function fakeSha(seed: number) {
  const alphabet = "abcdef0123456789";
  let value = "";
  for (let index = 0; index < 40; index++) {
    const pos = (seed * 13 + index * 17 + 7) % alphabet.length;
    value += alphabet[pos];
  }
  return value;
}

function pickDifferentUsers(userIds: string[], start: number, count: number) {
  const result: string[] = [];
  let cursor = start;
  while (result.length < Math.min(count, userIds.length)) {
    const candidate = userIds[cursor % userIds.length];
    if (!result.includes(candidate)) {
      result.push(candidate);
    }
    cursor += 3;
  }
  return result;
}

async function deleteExistingGithubRepos(repos: string[]) {
  const uniqueRepos = Array.from(new Set(repos.filter(Boolean)));
  if (uniqueRepos.length === 0) {
    return {
      attempted: 0,
      deleted: 0,
      failed: 0,
      failures: [] as string[],
      skipped: false,
      skipReason: null as string | null,
    };
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      attempted: uniqueRepos.length,
      deleted: 0,
      failed: uniqueRepos.length,
      failures: uniqueRepos.map((repo) => `${repo}: falta GITHUB_TOKEN`),
      skipped: true,
      skipReason: "GITHUB_TOKEN no está configurado.",
    };
  }

  const octokit = new Octokit({ auth: token });
  let deleted = 0;
  const failures: string[] = [];

  for (const fullRepo of uniqueRepos) {
    const [owner, repo] = fullRepo.split("/");
    if (!owner || !repo) {
      failures.push(`${fullRepo}: formato inválido`);
      continue;
    }
    try {
      await octokit.rest.repos.delete({ owner, repo });
      deleted += 1;
    } catch (error) {
      if (error instanceof Error) {
        failures.push(`${fullRepo}: ${error.message}`);
      } else {
        failures.push(`${fullRepo}: error desconocido`);
      }
    }
  }

  return {
    attempted: uniqueRepos.length,
    deleted,
    failed: failures.length,
    failures,
    skipped: false,
    skipReason: null as string | null,
  };
}

async function clearDatabase() {
  await prisma.message.deleteMany();
  await prisma.chatParticipant.deleteMany();
  await prisma.chat.deleteMany();

  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();

  await prisma.projectVersion.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.projectAuthor.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.projectFollow.deleteMany();
  await prisma.userFollow.deleteMany();
  await prisma.project.deleteMany();

  await prisma.announcement.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
}

export async function runShowcaseSeed() {
  await seedKnowledgeAreas();

  const existingRepos = await prisma.project.findMany({
    where: { githubRepo: { not: null } },
    select: { githubRepo: true },
  });

  const repoCleanup = await deleteExistingGithubRepos(
    existingRepos.map((project) => project.githubRepo ?? "").filter(Boolean),
  );

  await clearDatabase();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  for (const [index, user] of USERS.entries()) {
    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: passwordHash,
        role: user.role,
        bio: user.bio,
        orcid: user.orcid ?? null,
        image:
          user.image ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1d4ed8&color=fff`,
        createdAt: daysAgo(220 - index * 6),
      },
    });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });
  const userIdByEmail = new Map(users.map((user) => [user.email, user.id]));
  const allUserIds = users.map((user) => user.id);

  const areas = await prisma.knowledgeArea.findMany({
    select: { id: true, slug: true, name: true },
  });
  const areaIdBySlug = new Map(areas.map((area) => [area.slug, area.id]));

  const projectIds: string[] = [];
  const commentIds: string[] = [];

  for (const [projectIndex, projectSeed] of PROJECTS.entries()) {
    const areaId = areaIdBySlug.get(projectSeed.areaSlug);
    if (!areaId) {
      throw new Error(`Área no encontrada para slug: ${projectSeed.areaSlug}`);
    }

    const project = await prisma.project.create({
      data: {
        title: projectSeed.title,
        abstract: projectSeed.abstract,
        type: projectSeed.type,
        status: "APPROVED",
        year: projectSeed.year,
        license: projectSeed.license,
        githubRepo: projectSeed.repo,
        keywords: projectSeed.keywords,
        views: 500 + projectIndex * 137,
        downloads: 80 + projectIndex * 29,
        areaId,
        createdAt: daysAgo(180 - projectIndex * 9),
      },
    });
    projectIds.push(project.id);

    const authorIds = projectSeed.authors.map((email) => {
      const userId = userIdByEmail.get(email);
      if (!userId) {
        throw new Error(`Autor no encontrado: ${email}`);
      }
      return userId;
    });

    for (const authorId of authorIds) {
      await prisma.projectAuthor.create({
        data: {
          projectId: project.id,
          userId: authorId,
        },
      });
    }

    for (const file of projectSeed.files) {
      await prisma.projectFile.create({
        data: {
          projectId: project.id,
          name: file.name,
          githubPath: file.path,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: daysAgo(175 - projectIndex * 8),
        },
      });
    }

    for (const [versionIndex, changelog] of projectSeed.changelog.entries()) {
      await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          number: versionIndex + 1,
          commitSHA: fakeSha(projectIndex * 100 + versionIndex + 1),
          changelog,
          createdAt: daysAgo(170 - projectIndex * 8 - versionIndex * 4),
        },
      });
    }

    const projectChat = await prisma.chat.create({
      data: {
        type: "PROJECT",
        projectId: project.id,
        createdAt: daysAgo(160 - projectIndex * 7),
      },
    });

    const participantIds = pickDifferentUsers(
      allUserIds.filter((id) => !authorIds.includes(id)),
      projectIndex,
      3,
    );
    const chatParticipantIds = [...authorIds, ...participantIds];
    for (const participantId of chatParticipantIds) {
      await prisma.chatParticipant.create({
        data: { chatId: projectChat.id, userId: participantId },
      });
    }

    const projectMessages = [
      "Comparto el avance de esta semana con ajustes en metodología.",
      "Excelente, revisé los resultados y quedaron sólidos.",
      "Voy a subir una versión con más pruebas y benchmark.",
      "También dejé pendiente la sección de conclusiones.",
      "Listo, actualicé el repositorio y el changelog.",
      "Ya validé consistencia de datos y gráficas finales.",
    ];
    for (const [messageIndex, messageText] of projectMessages.entries()) {
      const senderId = chatParticipantIds[messageIndex % chatParticipantIds.length];
      await prisma.message.create({
        data: {
          chatId: projectChat.id,
          userId: senderId,
          content: messageText,
          createdAt: daysAgo(150 - projectIndex * 6 - messageIndex),
        },
      });
    }

    const topCommentIds: string[] = [];
    for (const [commentIndex, commentText] of PROJECT_COMMENT_SNIPPETS.entries()) {
      const commenterId = allUserIds[(projectIndex + commentIndex) % allUserIds.length];
      const comment = await prisma.comment.create({
        data: {
          projectId: project.id,
          userId: commenterId,
          content: commentText,
          createdAt: daysAgo(140 - projectIndex * 5 - commentIndex),
        },
      });
      commentIds.push(comment.id);
      topCommentIds.push(comment.id);
    }

    for (const [replyIndex, parentCommentId] of topCommentIds.slice(0, 2).entries()) {
      const replierId = allUserIds[(projectIndex + replyIndex + 5) % allUserIds.length];
      const reply = await prisma.comment.create({
        data: {
          projectId: project.id,
          userId: replierId,
          parentId: parentCommentId,
          content:
            replyIndex === 0
              ? "Gracias por el feedback, estamos agregando ese análisis comparativo."
              : "Tomamos el punto, documentamos supuestos y reproducibilidad en la sección final.",
          createdAt: daysAgo(136 - projectIndex * 4 - replyIndex),
        },
      });
      commentIds.push(reply.id);
    }

    const reactionTypes = ["LIKE", "LOVE", "CELEBRATE", "THINKING"] as const;
    for (const [reactionTypeIndex, reactionType] of reactionTypes.entries()) {
      const reactors = pickDifferentUsers(allUserIds, projectIndex + reactionTypeIndex, 5);
      for (const reactorId of reactors) {
        await prisma.reaction.create({
          data: {
            userId: reactorId,
            projectId: project.id,
            type: reactionType,
            createdAt: daysAgo(130 - projectIndex * 4 - reactionTypeIndex),
          },
        });
      }
    }

    for (const [commentReactionIndex, commentId] of topCommentIds.entries()) {
      const reactors = pickDifferentUsers(allUserIds, projectIndex + commentReactionIndex + 2, 3);
      const reactionType = reactionTypes[commentReactionIndex % reactionTypes.length];
      for (const reactorId of reactors) {
        await prisma.reaction.create({
          data: {
            userId: reactorId,
            commentId,
            type: reactionType,
            createdAt: daysAgo(128 - projectIndex * 4 - commentReactionIndex),
          },
        });
      }
    }

    const followers = pickDifferentUsers(
      allUserIds.filter((id) => !authorIds.includes(id)),
      projectIndex + 7,
      6,
    );
    for (const followerId of followers) {
      await prisma.projectFollow.create({
        data: {
          userId: followerId,
          projectId: project.id,
          createdAt: daysAgo(120 - projectIndex * 3),
        },
      });
    }

    const bookmarkers = pickDifferentUsers(allUserIds, projectIndex + 4, 4);
    for (const userId of bookmarkers) {
      await prisma.bookmark.create({
        data: {
          userId,
          projectId: project.id,
          collection: projectIndex % 2 === 0 ? "investigacion" : "referencias",
          createdAt: daysAgo(110 - projectIndex * 2),
        },
      });
    }

    for (const authorId of authorIds) {
      await prisma.notification.create({
        data: {
          userId: authorId,
          type: "PROJECT_UPDATE",
          reference: {
            projectId: project.id,
            title: project.title,
            version: projectSeed.changelog.length,
          },
          read: false,
          createdAt: daysAgo(100 - projectIndex * 2),
        },
      });
    }
  }

  const followPairs: Array<[string, string]> = [
    ["carlos.pacheco@unicesar.edu.co", "maria.daza@unicesar.edu.co"],
    ["maria.daza@unicesar.edu.co", "daniel.duarte@unicesar.edu.co"],
    ["sebastian.arias@unicesar.edu.co", "juan.onate@unicesar.edu.co"],
    ["valentina.romero@unicesar.edu.co", "natalia.herrera@unicesar.edu.co"],
    ["camila.torres@gmail.com", "paula.cardenas@unicesar.edu.co"],
    ["felipe.sanchez@gmail.com", "carlos.pacheco@unicesar.edu.co"],
    ["ana.vega@yahoo.com", "laura.quintero@unicesar.edu.co"],
  ];
  for (const [followerEmail, userEmail] of followPairs) {
    const followerId = userIdByEmail.get(followerEmail);
    const userId = userIdByEmail.get(userEmail);
    if (!followerId || !userId) continue;
    await prisma.userFollow.create({
      data: {
        followerId,
        userId,
        createdAt: daysAgo(60),
      },
    });
  }

  const dmPairs: Array<[string, string]> = [
    ["carlos.pacheco@unicesar.edu.co", "maria.daza@unicesar.edu.co"],
    ["daniel.duarte@unicesar.edu.co", "paula.cardenas@unicesar.edu.co"],
    ["sebastian.arias@unicesar.edu.co", "juan.onate@unicesar.edu.co"],
    ["valentina.romero@unicesar.edu.co", "natalia.herrera@unicesar.edu.co"],
  ];
  for (const [pairIndex, [aEmail, bEmail]] of dmPairs.entries()) {
    const aId = userIdByEmail.get(aEmail);
    const bId = userIdByEmail.get(bEmail);
    if (!aId || !bId) continue;

    const dmChat = await prisma.chat.create({
      data: {
        type: "DM",
        createdAt: daysAgo(55 - pairIndex * 2),
      },
    });

    await prisma.chatParticipant.create({ data: { chatId: dmChat.id, userId: aId } });
    await prisma.chatParticipant.create({ data: { chatId: dmChat.id, userId: bId } });

    for (const [msgIndex, text] of DM_SNIPPETS.entries()) {
      const senderId = msgIndex % 2 === 0 ? aId : bId;
      await prisma.message.create({
        data: {
          chatId: dmChat.id,
          userId: senderId,
          content: text,
          createdAt: daysAgo(50 - pairIndex * 2 - msgIndex),
        },
      });
    }
  }

  const announcements = [
    {
      title: "Convocatoria 2026-2 para publicación de proyectos",
      body: "Se abre la convocatoria institucional para registrar trabajos de grado y proyectos de investigación del periodo 2026-2. Recuerda incluir resumen, palabras clave y archivos finales en formato verificable.",
      pinned: true,
      createdAt: daysAgo(20),
    },
    {
      title: "Nueva guía de buenas prácticas para repositorios GitHub",
      body: "Ya está disponible la guía oficial con lineamientos de estructura de carpetas, convenciones de commits y criterios mínimos de documentación para proyectos publicados en UniHaven.",
      pinned: false,
      createdAt: daysAgo(15),
    },
    {
      title: "Mantenimiento programado de servicios",
      body: "El próximo sábado entre 02:00 y 04:00 AM se realizará mantenimiento preventivo de base de datos y notificaciones en tiempo real.",
      pinned: false,
      createdAt: daysAgo(5),
    },
  ] as const;
  for (const announcement of announcements) {
    await prisma.announcement.create({ data: announcement });
  }

  if (projectIds.length >= 2) {
    const reportOwnerId = allUserIds[0];
    await prisma.report.create({
      data: {
        reporterId: reportOwnerId,
        projectId: projectIds[0],
        category: "OTHER",
        description: "Se solicita ajuste de metadatos en la sección de anexos.",
        status: "PENDING",
        createdAt: daysAgo(7),
      },
    });
    await prisma.report.create({
      data: {
        reporterId: allUserIds[1],
        projectId: projectIds[1],
        category: "FALSE_INFO",
        description: "Un valor de referencia estadística requiere aclaración metodológica.",
        status: "DISMISSED",
        createdAt: daysAgo(6),
      },
    });
  }

  const [userCount, projectCount, commentCount, reactionCount, messageCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.comment.count(),
      prisma.reaction.count(),
      prisma.message.count(),
    ]);

  return {
    ok: true,
    credentials: {
      defaultPassword: DEFAULT_PASSWORD,
      sampleAdmin: "andrea.rodriguez@unicesar.edu.co",
      sampleStudent: "carlos.pacheco@unicesar.edu.co",
    },
    deletedPreviousRepos: repoCleanup,
    totals: {
      users: userCount,
      projects: projectCount,
      comments: commentCount,
      reactions: reactionCount,
      messages: messageCount,
      versionsPerProject: "3",
    },
  };
}
