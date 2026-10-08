# UniHaven — Repositorio Académico Digital
### Universidad Popular del Cesar

> Plataforma web para la gestión, publicación y consulta de proyectos de grado, investigaciones y proyectos de aula de la Universidad Popular del Cesar (UPC).

---

## Tabla de Contenidos

1. [Descripción General y Propósito](#descripción-general-y-propósito)
2. [Contexto del Proyecto de Grado](#contexto-del-proyecto-de-grado)
3. [Objetivos](#objetivos)
4. [Requisitos Funcionales](#requisitos-funcionales)
5. [Requisitos No Funcionales](#requisitos-no-funcionales)
6. [Arquitectura y Stack Tecnológico](#arquitectura-y-stack-tecnológico)
7. [Integraciones](#integraciones)
8. [Modelo de Datos](#modelo-de-datos)
9. [Roles y Permisos](#roles-y-permisos)
10. [Estructura del Proyecto](#estructura-del-proyecto)
11. [Flujos de la Aplicación (explicados paso a paso)](#flujos-de-la-aplicación-explicados-paso-a-paso)
12. [Metodología](#metodología)
13. [Cronograma](#cronograma)
14. [Instalación y Configuración](#instalación-y-configuración)
15. [Variables de Entorno](#variables-de-entorno)
16. [Despliegue](#despliegue)
17. [Autores](#autores)

---

## Descripción General y Propósito

**UniHaven** es un repositorio académico digital desarrollado para la Universidad Popular del Cesar. Su **propósito** es doble:

1. **Centralizar** toda la producción intelectual estudiantil — tesis de grado, proyectos de investigación y proyectos de aula — en un único lugar, en lugar de que queden archivados físicamente o dispersos en sistemas desarticulados.
2. **Darle mayor alcance y visibilidad** a esos trabajos, haciéndolos accesibles a toda la comunidad académica y al público general, fomentando la consulta, la reutilización y la cultura de documentación abierta.

Cada proyecto subido genera automáticamente un **repositorio en GitHub** bajo la cuenta institucional, garantizando preservación a largo plazo, control de versiones y disponibilidad permanente. La plataforma incluye funcionalidades sociales (comentarios, reacciones, seguimiento, marcadores), mensajería, un sistema de moderación con flujo de revisión, notificaciones en tiempo real y un panel de administración completo.

> **En una frase:** "Un 'Google Académico' interno de la UPC donde los estudiantes publican sus trabajos, se guardan en GitHub y los administradores aprueban lo que se hace público."

---

## Contexto del Proyecto de Grado

| Campo | Detalle |
|---|---|
| **Institución** | Universidad Popular del Cesar |
| **Programa** | Ingeniería de Sistemas (o afín) |
| **Tipo de proyecto** | Desarrollo de Software / Innovación Tecnológica |
| **Modalidad** | Proyecto de Grado |a
| **Línea de investigación** | Ingeniería de Software, Sistemas de Información |
| **Área de conocimiento** | Tecnologías de la Información y las Comunicaciones |

### Problema

La UPC carece de un sistema centralizado para gestionar y difundir los trabajos académicos de sus estudiantes. Los proyectos de grado terminan archivados físicamente o en sistemas desarticulados, dificultando su consulta, reutilización y visibilidad.

### Justificación

Un repositorio digital institucional:
- Preserva el conocimiento generado en la universidad.
- Facilita la investigación y evita duplicación de esfuerzos.
- Incrementa la visibilidad académica de la UPC.
- Fomenta la cultura de documentación y código abierto entre los estudiantes.

### Alcance

- Aplica a estudiantes activos y egresados de la UPC.
- Cubre los tipos de trabajo: **Tesis de Grado**, **Investigación** y **Proyecto de Aula**.
- El acceso público permite consulta sin registro; la **publicación requiere una cuenta institucional** (`@unicesar.edu.co`) y la **aprobación de un administrador**.

---

## Objetivos

### Objetivo General

Diseñar e implementar una plataforma web que permita a los estudiantes de la Universidad Popular del Cesar publicar, gestionar y difundir sus proyectos académicos, integrando control de versiones mediante GitHub, un flujo de revisión y aprobación, y funcionalidades de interacción comunitaria.

### Objetivos Específicos

1. Desarrollar un módulo de autenticación que distinga usuarios institucionales (`UPC_STUDENT`) de usuarios externos (`GENERAL`).
2. Implementar la integración con la API de GitHub para la creación automática de repositorios por cada proyecto subido.
3. Construir un sistema de revisión, moderación y reporte de contenido administrado por roles.
4. Diseñar una interfaz de búsqueda y filtrado que facilite la exploración del repositorio.
5. Integrar notificaciones en tiempo real mediante WebSockets (Pusher) para todas las interacciones sociales.
6. Permitir la colaboración entre autores mediante la asignación de coautores.

---

## Requisitos Funcionales

| ID | Requisito |
|---|---|
| **RF-01** | El sistema debe permitir el registro de usuarios mediante correo electrónico y contraseña, con verificación por email antes de activar la cuenta. |
| **RF-02** | El sistema debe permitir el inicio de sesión mediante OAuth con Google. |
| **RF-03** | Los usuarios con rol `UPC_STUDENT` (o `ADMIN`) deben poder subir proyectos completando un formulario multi-paso con título, resumen, tipo, área, palabras clave, **coautores**, año, licencia y archivos. |
| **RF-04** | Al crear un proyecto, el sistema debe generar automáticamente un repositorio **privado** en GitHub, subir los archivos y registrar el SHA del commit. |
| **RF-05** | Los proyectos nuevos y sus actualizaciones deben quedar en estado **"Requiere revisión"** y ser **aprobados manualmente por un administrador** antes de ser visibles públicamente. |
| **RF-06** | El sistema debe permitir a los administradores aprobar, rechazar, retirar y reinstaurar proyectos, controlando su visibilidad pública. |
| **RF-07** | El sistema debe permitir buscar proyectos por texto libre y filtrar por tipo, área de conocimiento y año. |
| **RF-08** | El sistema debe mostrar un feed paginado de proyectos aprobados ordenados cronológicamente, con imagen de portada, tipo, área y autores. |
| **RF-09** | Los usuarios autenticados deben poder comentar en proyectos, responder comentarios y eliminar sus propios comentarios. |
| **RF-10** | Los usuarios autenticados deben poder reaccionar a proyectos con emojis (Me gusta, Me encanta, Celebrar, Pensativo). |
| **RF-11** | Los usuarios autenticados deben poder guardar proyectos en marcadores (bookmarks) y consultarlos desde su perfil. |
| **RF-12** | Los usuarios deben poder seguir proyectos para ser notificados de nuevas versiones, y seguir a otros usuarios. |
| **RF-13** | Los autores deben poder añadir **coautores** (usuarios registrados con rol `ADMIN` o `UPC_STUDENT`) a un proyecto al subirlo. |
| **RF-14** | Los autores deben poder subir nuevas versiones de un proyecto, registrando el changelog; cada versión vuelve a pasar por revisión. |
| **RF-15** | Los administradores deben poder crear, editar y eliminar anuncios institucionales, con opción de fijarlos y añadir imagen de portada. |
| **RF-16** | El sistema debe enviar notificaciones en tiempo real para comentarios, reacciones, marcadores, coautorías, seguimiento, versiones, reportes, aprobaciones y rechazos. |
| **RF-17** | Los usuarios deben poder reportar proyectos con contenido inapropiado; los administradores visualizan y gestionan los reportes. |
| **RF-18** | El sistema debe ofrecer mensajería: chat por proyecto y mensajes directos entre usuarios. |
| **RF-19** | Los usuarios deben poder **marcar como leídas** y **eliminar** sus notificaciones (individualmente o todas). |
| **RF-20** | El sistema debe permitir descargar todos los archivos de un proyecto en un único ZIP. |

---

## Requisitos No Funcionales

| ID | Requisito |
|---|---|
| **RNF-01** | **Rendimiento:** Las páginas de listado deben cargar en menos de 2 segundos, utilizando renderizado del lado del servidor (SSR) y paginación. |
| **RNF-02** | **Disponibilidad:** Disponibilidad mínima del 99 % mensual, apoyada en Vercel y Neon PostgreSQL. |
| **RNF-03** | **Seguridad:** Contraseñas cifradas con bcrypt (12 rondas). Rutas protegidas validadas con middleware en el edge. |
| **RNF-04** | **Seguridad:** Los tokens de verificación de email expiran en 24 horas y son de un solo uso. |
| **RNF-05** | **Escalabilidad:** Arquitectura que soporta el crecimiento del repositorio sin cambios estructurales, usando GitHub y Vercel Blob para los archivos. |
| **RNF-06** | **Usabilidad:** Interfaz responsiva y accesible (WCAG 2.1 AA). |
| **RNF-07** | **Mantenibilidad:** Estructura de carpetas de Next.js App Router con separación entre Server Components, Client Components y Server Actions. |
| **RNF-08** | **Portabilidad:** Desplegable en cualquier proveedor compatible con Node.js 18+, cambiando únicamente variables de entorno. |
| **RNF-09** | **Compatibilidad:** Navegadores Chrome, Firefox, Safari y Edge (últimos 2 años). |
| **RNF-10** | **Privacidad:** Los repositorios de GitHub se crean como privados y solo se hacen públicos tras la aprobación de un administrador. |
| **RNF-11** | **Tiempo real:** Notificaciones con latencia máxima de ~500 ms mediante WebSockets (Pusher Channels). |
| **RNF-12** | **Internacionalización:** Interfaz en español (es-CO). |
| **RNF-13** | **SEO:** Metadatos Open Graph y Twitter Card dinámicos en las páginas de proyectos. |
| **RNF-14** | **Integridad de datos:** Validación de archivos subidos (máx. **15 MB por archivo** y **30 MB en total**; portada máx. 5 MB) tanto en cliente como en servidor. |

---

## Arquitectura y Stack Tecnológico

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                     │
│           React 19 + Next.js 16 (App Router)                │
│          Server Components + Client Components               │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                    Vercel Edge / Node.js                      │
│   Next.js Server   │  Middleware (Auth)  │  Server Actions   │
│   (SSR / SSG)      │  (Edge Runtime)     │  (API backend)    │
└──────┬─────────────┴──────────┬──────────┴────────┬──────────┘
       │                        │                    │
┌──────▼──────┐   ┌─────────────▼──────┐  ┌────────▼────────┐
│  Neon DB    │   │   GitHub API       │  │  Vercel Blob    │
│ PostgreSQL  │   │  (Octokit REST)    │  │  (Archivos)     │
│  (Prisma)   │   │  Repositorios      │  │  Imágenes       │
└─────────────┘   └────────────────────┘  └─────────────────┘
       │
┌──────▼──────┐   ┌────────────────────┐
│   Pusher    │   │  Gmail SMTP        │
│  Channels   │   │  (Nodemailer)      │
│ (Real-time) │   │  Verificación      │
└─────────────┘   └────────────────────┘
```

### Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js | 16.x (App Router) |
| UI Library | React | 19.x |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | shadcn/ui | Latest |
| ORM | Prisma | 7.x (generador `prisma-client`) |
| Base de Datos | PostgreSQL (Neon, serverless) | 16.x |
| Autenticación | Auth.js (NextAuth) | v5 (beta) |
| API GitHub | Octokit REST | Latest |
| Almacenamiento | Vercel Blob | Latest |
| Tiempo Real | Pusher Channels | Latest |
| Email | Nodemailer + Gmail SMTP | Latest |
| Despliegue | Vercel | Latest |

---

## Integraciones

| Servicio | Para qué se usa | Dónde está el código |
|---|---|---|
| **GitHub (Octokit)** | Crear un repositorio privado por proyecto, subir archivos como commits, hacer público/privado el repo, leer archivos. | `lib/github.ts` |
| **Vercel Blob** | Almacenar portadas e imágenes (URLs públicas). | usado en `app/actions/projects.ts` y `app/actions/announcements.ts` |
| **Auth.js (NextAuth v5)** | Autenticación con Google OAuth y credenciales (email/contraseña). Sesiones con JWT. | `lib/auth.ts`, `auth.config.ts` |
| **Neon (PostgreSQL)** | Base de datos serverless. Se accede con Prisma y el adaptador HTTP `@prisma/adapter-neon`. | `lib/prisma.ts` |
| **Pusher Channels** | Tiempo real: notificaciones (badge de la campana), mensajes de chat y DM, refresco de rol. | `lib/pusher.ts` (servidor), `lib/pusher-client.ts` (cliente) |
| **Nodemailer + Gmail SMTP** | Envío de correos de verificación de cuenta y de restablecimiento de contraseña. | `lib/email.ts` |
| **ZIP propio** | Generación de un ZIP "al vuelo" (streaming, sin dependencias) para descargar todos los archivos. | `lib/zip.ts` |

---

## Modelo de Datos

Base de datos **PostgreSQL** gestionada con **Prisma**. El esquema completo está en `prisma/schema.prisma`.

### Enums

| Enum | Valores |
|---|---|
| `Role` | `ADMIN`, `UPC_STUDENT`, `GENERAL` |
| `ProjectType` | `THESIS`, `RESEARCH`, `CLASSROOM` |
| `ProjectStatus` | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_REVISION` |
| `ReactionType` | `LIKE`, `LOVE`, `CELEBRATE`, `THINKING` |
| `ReportCategory` | `INAPPROPRIATE`, `PLAGIARISM`, `FALSE_INFO`, `OTHER` |
| `ReportStatus` | `PENDING`, `DISMISSED`, `ACTIONED` |
| `NotificationType` | `COMMENT`, `REACTION`, `MENTION`, `PROJECT_APPROVED`, `PROJECT_REJECTED`, `PROJECT_NEEDS_REVISION`, `ANNOUNCEMENT`, `NEW_FOLLOWER`, `PROJECT_UPDATE`, `REPORT_ACTIONED`, `PROJECT_BOOKMARKED`, `COAUTHOR_ADDED`, `NEW_REPORT` |
| `ChatType` | `DM`, `PROJECT` |

### Entidades Principales

```
User
├── id, name, email, emailVerified, image, password, bio, orcid
├── role: ADMIN | UPC_STUDENT | GENERAL
├── suspended (boolean)
└── relations: accounts, sessions, projects (autorías), comments,
    reactions, notifications, reports, messages, bookmarks, follows

Project
├── id, title, abstract, type, status, year, license, githubRepo
├── coverImage, keywords[], views, downloads, rejectionNote
└── relations: area, authors, files, versions, comments,
    reactions, reports, bookmarks, followers, chat

ProjectAuthor   → relación muchos-a-muchos User ↔ Project (autores/coautores)
ProjectFile     → archivos de un proyecto (nombre, githubPath o blobUrl, mimeType, size)
ProjectVersion  → versiones (número, commitSHA, changelog)

Comment         → comentarios con respuestas anidadas (parentId) y ocultamiento
Reaction        → reacciones a proyectos o comentarios
Report          → reportes de contenido (categoría, descripción, estado)
Notification    → notificaciones (tipo, referencia JSON, leída/no leída)
Chat            → chat de proyecto (projectId único) o DM (type)
ChatParticipant → participantes de un chat
Message         → mensajes de un chat

KnowledgeArea   → áreas/facultades de conocimiento (con slug)
Announcement    → anuncios institucionales (título, cuerpo, fijado, portada)
Bookmark        → marcadores de proyectos por usuario
UserFollow      → seguimiento entre usuarios
ProjectFollow   → seguimiento de proyectos
PendingRegistration → registro pendiente de verificación por email
Account / Session / VerificationToken → modelos requeridos por Auth.js
```

---

## Roles y Permisos

| Acción | `GENERAL` (externo) | `UPC_STUDENT` | `ADMIN` |
|---|---|---|---|
| Ver proyectos aprobados | ✅ | ✅ | ✅ |
| Comentar / reaccionar / guardar / seguir | ✅ | ✅ | ✅ |
| Subir proyectos | ❌ | ✅ | ✅ |
| Añadir coautores | ❌ | ✅ | ✅ |
| Subir nuevas versiones (solo autor) | ❌ | ✅ | ✅ |
| Ver proyectos en revisión (solo si es autor) | ❌ | ✅ (propios) | ✅ (todos) |
| Panel de administración | ❌ | ❌ | ✅ |
| Aprobar / rechazar / retirar / reinstaurar proyectos | ❌ | ❌ | ✅ |
| Gestionar reportes y anuncios | ❌ | ❌ | ✅ |
| Gestionar usuarios (roles, borrar) | ❌ | ❌ | ✅ |

- Un correo `@unicesar.edu.co` obtiene automáticamente el rol `UPC_STUDENT`; los correos externos quedan como `GENERAL`.
- `ADMIN` se asigna manualmente (ver [Instalación](#instalación-y-configuración)).

---

## Estructura del Proyecto

```
unihaven/
├── app/                            # Next.js App Router
│   ├── (auth)/                     # login, register, forgot-password, reset-password
│   ├── actions/                    # Server Actions (lógica de negocio)
│   │   ├── projects.ts             # crear/aprobar/rechazar/reinstaurar/eliminar proyectos + versiones + reportes + búsqueda de coautores
│   │   ├── comments.ts             # comentarios y reacciones
│   │   ├── notifications.ts        # listar, marcar leídas, eliminar notificaciones
│   │   ├── follows.ts              # seguir usuarios y proyectos
│   │   ├── bookmarks.ts            # marcadores
│   │   ├── auth.ts                 # registro, login, restablecer contraseña
│   │   ├── announcements.ts        # CRUD de anuncios (admin)
│   │   ├── chat.ts                 # chat de proyecto
│   │   ├── dm.ts                   # mensajes directos
│   │   ├── profile.ts              # editar perfil
│   │   └── admin.ts                # gestión de usuarios y reportes (admin)
│   ├── admin/                      # panel de administración
│   │   ├── page.tsx                # reportes pendientes
│   │   ├── review/                 # cola de proyectos "pendientes de aprobación"
│   │   ├── projects/               # todos los proyectos
│   │   ├── users/                  # gestión de usuarios
│   │   └── announcements/          # anuncios
│   ├── api/                        # rutas de API (route handlers)
│   │   ├── auth/[...nextauth]/     # endpoints de Auth.js
│   │   ├── projects/[id]/files/    # servir/descargar un archivo
│   │   ├── projects/[id]/zip/      # descargar todos los archivos como ZIP
│   │   └── seed/                   # seed de demostración (solo desarrollo)
│   ├── projects/                   # feed público y formulario de subida
│   │   ├── page.tsx                # feed con búsqueda/filtros
│   │   ├── [id]/page.tsx           # detalle del proyecto
│   │   └── new/page.tsx            # formulario de subida
│   ├── announcements/              # página pública de anuncios
│   ├── profile/[id]/               # perfil de usuario
│   ├── verify-email/               # verificación de correo
│   └── page.tsx                    # landing / home
├── components/                     # componentes reutilizables
│   ├── admin/                      # componentes del panel (aprobar, rechazar, roles...)
│   ├── announcements/              # banner y tarjetas de anuncios
│   ├── chat/                       # chat de proyecto y mensajes directos
│   ├── follows/                    # botones de seguir / iniciar DM
│   ├── layout/                     # navbar, providers, session-watcher
│   ├── notifications/              # campana de notificaciones
│   ├── projects/                   # formulario, comentarios, reacciones, reporte...
│   └── ui/                         # componentes shadcn/ui
├── lib/                            # utilidades y configuración
│   ├── auth.ts                     # Auth.js (Google + credenciales)
│   ├── auth.config.ts              # (en la raíz) config edge de Auth.js
│   ├── constants.ts                # roles, tipos, estados, límites, dominio UPC
│   ├── email.ts                    # envío de correos (Nodemailer)
│   ├── github.ts                   # helpers de la API de GitHub
│   ├── notifications.ts            # helpers de notificaciones (Pusher)
│   ├── prisma.ts                   # cliente Prisma (Neon HTTP adapter)
│   ├── project-access.ts           # control de acceso a proyectos
│   ├── pusher.ts / pusher-client.ts# Pusher servidor / cliente
│   ├── zip.ts                      # generador de ZIP en streaming
│   ├── db/areas.ts                 # seed de áreas de conocimiento
│   └── generated/prisma/           # cliente Prisma GENERADO (no editar)
├── prisma/
│   ├── schema.prisma               # esquema de base de datos
│   ├── seed.ts                     # seed de demostración
│   └── migrations/                 # migraciones SQL
├── scripts/
│   └── create-admin.mjs            # crear el primer administrador
├── types/
│   └── next-auth.d.ts              # tipos extendidos de sesión
├── auth.config.ts                  # config Auth.js segura para edge
├── middleware.ts                   # protección de rutas
├── next.config.ts / tsconfig.json  # configuración
└── .env / .env.example             # variables de entorno
```

---

## Flujos de la Aplicación (explicados paso a paso)

> Esta sección describe **qué hace el usuario** y **qué pasa por debajo** en cada flujo. Está pensada para que cualquier persona pueda explicar el funcionamiento sin conocer el código.

### 1. Registro e inicio de sesión

1. El usuario se registra con nombre, correo y contraseña.
2. *Por debajo:* se guarda un registro **pendiente** (`PendingRegistration`) con la contraseña cifrada (bcrypt) y un token de verificación. Se envía un correo con el enlace de verificación (Nodemailer/Gmail).
3. El usuario abre el enlace y su cuenta se activa.
4. Si el correo es `@unicesar.edu.co`, el rol queda como `UPC_STUDENT`; si no, `GENERAL`.
5. También puede iniciar sesión con **Google** (OAuth): el rol se asigna igual según el dominio del correo.

> **Pregunta típica:** *¿Por qué hay dos formas de entrar?* — Para que sea fácil para los estudiantes (Google institucional) y para permitir credenciales propias a quienes prefieran email/contraseña.

### 2. Subir un proyecto (formulario multi-paso)

1. Un usuario con rol `UPC_STUDENT` o `ADMIN` entra a **"Subir proyecto"**.
2. Completa 3 pasos:
   - **Paso 1 (Información):** título, resumen, tipo (Tesis/Investigación/Proyecto de aula), área, año, licencia, portada, palabras clave y **coautores**.
   - **Paso 2 (Archivos):** arrastra los archivos del proyecto.
   - **Paso 3 (Revisión):** confirma y envía.
3. *Por debajo:*
   - Se crea un **repositorio privado en GitHub** con un nombre generado (año + tipo + título).
   - Se suben los archivos a la carpeta `/files` del repo y se genera un `README.md` automático.
   - Se guarda el proyecto en la base de datos con estado **`NEEDS_REVISION`** ("Requiere revisión") — **no** es público todavía.
   - Se registran los autores (el creador y los coautores) y la **versión 1**.
   - Se notifica a los administradores (`PROJECT_NEEDS_REVISION`) y a los coautores (`COAUTHOR_ADDED`).

> **Pregunta típica:** *¿El proyecto se publica de inmediato?* — No. Queda en "Requiere revisión" hasta que un administrador lo apruebe.

### 3. Coautores

1. En el paso 1, el autor busca a otra persona por nombre o correo.
2. *Por debajo:* la búsqueda (`searchCoAuthors`) solo devuelve usuarios registrados con rol `ADMIN` o `UPC_STUDENT` (no `GENERAL`).
3. Al añadir a alguien, esa persona queda registrada como autor del proyecto y recibe una notificación (`COAUTHOR_ADDED`).

### 4. Revisión y aprobación (panel de administración)

1. El administrador entra a **Panel → Revisión** (la "cola de pendientes").
2. Ve todos los proyectos en `DRAFT`, `IN_REVIEW` o `NEEDS_REVISION`.
3. Puede:
   - **Aprobar:** el proyecto pasa a `APPROVED`, el repositorio de GitHub se hace **público** y el autor recibe `PROJECT_APPROVED`.
   - **Rechazar:** pasa a `REJECTED` con una nota, el repo queda privado y el autor recibe `PROJECT_REJECTED`.
4. *Por debajo:* solo los proyectos `APPROVED` aparecen en el feed público y en la home. Los demás solo los ven sus autores y los administradores.

> **Pregunta típica:** *¿Dónde se controla la visibilidad?* — En el estado del proyecto y en el repositorio de GitHub (privado = no público, público = aprobado).

### 5. Subir una nueva versión

1. Un autor (de un proyecto ya aprobado) usa **"Subir nueva versión"**, escribe el changelog y sube los archivos actualizados.
2. *Por debajo:*
   - Se hace un nuevo commit en el repo de GitHub.
   - El proyecto vuelve a **`NEEDS_REVISION`** y el repo se hace privado de nuevo.
   - Se notifica a los administradores (`PROJECT_NEEDS_REVISION`).
3. Cuando el administrador lo **aprueba** de nuevo:
   - Se hace público el repo.
   - Los **seguidores** del proyecto reciben `PROJECT_UPDATE` (recién en este punto, cuando la actualización ya es visible).

> **Pregunta típica:** *¿Las actualizaciones también requieren aprobación?* — Sí, cada nueva versión vuelve a pasar por revisión.

### 6. Interacción social (comentarios, reacciones, marcadores, seguimiento)

| Acción | Qué pasa | Notificación |
|---|---|---|
| Comentar | Se crea un comentario (o respuesta) | `COMMENT` a los autores |
| Reaccionar | Se crea/elimina una reacción (emoji) | `REACTION` al autor del proyecto o comentario |
| Guardar (marcador) | Se añade a los marcadores del usuario | `PROJECT_BOOKMARKED` a los autores |
| Seguir usuario | Se crea un `UserFollow` | `NEW_FOLLOWER` al usuario seguido |
| Seguir proyecto | Se crea un `ProjectFollow` | (recibirá `PROJECT_UPDATE` en futuras versiones) |

### 7. Notificaciones (campana)

- Las notificaciones llegan en **tiempo real** vía Pusher (el número del badge se actualiza solo).
- La campana muestra cada notificación con su icono y enlace.
- El usuario puede: **marcar como leída** (una o todas) y **eliminar** (una o todas).

### 8. Reportes y moderación

1. Un usuario reporta un proyecto (elige categoría y escribe una descripción).
2. *Por debajo:* se crea un `Report` en estado `PENDING` y se notifica a los administradores (`NEW_REPORT`).
3. El administrador, en **Panel → Reportes**, puede:
   - **Descartar** el reporte (estado `DISMISSED`).
   - **Retirar el proyecto** (el reporte pasa a `ACTIONED`, el proyecto a `REJECTED`).
4. En ambos casos el reportante recibe `REPORT_ACTIONED`.

### 9. Anuncios

- El administrador crea, edita o elimina **anuncios institucionales** (con portada y opción de "fijado").
- Los anuncios se muestran en la home y en la página de anuncios.

### 10. Mensajería (chat de proyecto y mensajes directos)

- **Chat de proyecto:** se crea al abrir el chat de un proyecto; los mensajes se transmiten en tiempo real por Pusher.
- **Mensajes directos (DM):** un usuario puede iniciar un chat privado con otro; el destinatario recibe una notificación (`MENTION`).

---

## Metodología

El proyecto sigue la metodología **SCRUM adaptada** para trabajo individual/pequeño equipo, con sprints de 2 semanas y entregables parciales verificables.

### Fases del Proyecto

- **Fase 0 — Iniciación y Planificación:** requisitos, alcance, riesgos, selección del stack.
- **Fase 1 — Infraestructura y Autenticación:** esquema de BD (Prisma + Neon), Auth.js (OAuth + credenciales), verificación de email, middleware y roles.
- **Fase 2 — Núcleo (Publicación):** formulario multi-paso, integración GitHub, feed con búsqueda/filtros, detalle de proyecto.
- **Fase 3 — Interacción Social:** comentarios, reacciones, marcadores, seguimiento, versionado, coautores.
- **Fase 4 — Administración y Moderación:** panel admin, flujo de aprobación/rechazo, reportes, anuncios.
- **Fase 5 — Tiempo Real y Notificaciones:** Pusher, notificaciones para todas las interacciones.
- **Fase 6 — Optimización y Despliegue:** SEO, rendimiento, pruebas, despliegue.

---

## Cronograma

| Semana | Fase | Actividades Principales | Entregable |
|---|---|---|---|
| 1 | Iniciación | Requisitos, planificación, riesgos | Documento de requisitos |
| 2 | Iniciación | Stack, entorno, repo base | Proyecto Next.js configurado |
| 3 | Infraestructura | Esquema BD, Prisma, Neon | Schema + migraciones |
| 4 | Infraestructura | Auth, roles, middleware, email | Login / Registro funcional |
| 5 | Núcleo | Formulario de proyecto, validaciones | Formulario multi-paso |
| 6 | Núcleo | GitHub API, creación de repos | Proyectos en GitHub |
| 7 | Núcleo | Feed, búsqueda, filtros, paginación | Feed público funcional |
| 8 | Social | Comentarios, respuestas, reacciones | Interacción en proyectos |
| 9 | Social | Bookmarks, follows, versionado, coautores | Perfil completo |
| 10 | Admin | Panel admin, moderación, revisión | Panel de administración |
| 11 | Admin | Reportes, anuncios | Moderación + anuncios |
| 12 | Tiempo Real | Pusher, notificaciones completas | Notificaciones en vivo |
| 13 | Optimización | SEO, rendimiento, pruebas | Auditoría Lighthouse |
| 14 | Despliegue | Producción, documentación final | Aplicación en producción |

---

## Instalación y Configuración

### Prerrequisitos

- Node.js 18.17 o superior
- npm 9+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL)
- Cuenta en [GitHub](https://github.com) con Personal Access Token (scopes: `repo`, `delete_repo`)
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Pusher](https://pusher.com)
- Cuenta Gmail con 2FA (para SMTP / App Password)

### Instalación Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/mtorresweb/UniHaven3.git
cd UniHaven3

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Variables de Entorno)

# 4. Aplicar migraciones y generar el cliente Prisma
npx prisma migrate deploy
npx prisma generate

# 5. (Opcional) Poblar áreas de conocimiento / datos de demostración
#    - Las áreas se siembran automáticamente al abrir /projects/new la primera vez.
#    - Para datos de demostración, en desarrollo: POST http://localhost:3000/api/seed

# 6. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

> Alternativa rápida sin migraciones (solo desarrollo): `npx prisma db push`.

### Primer administrador

Hay dos formas:

```bash
# Opción A — script incluido
npm run create-admin
```

```sql
-- Opción B — SQL directo (Neon Console o cualquier cliente PostgreSQL)
UPDATE "User" SET role = 'ADMIN' WHERE email = 'tu@correo.com';
```

---

## Variables de Entorno

Copia `.env.example` como `.env` y completa los valores:

```env
# Base de datos
DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require"

# Auth.js — generar con: openssl rand -base64 32
AUTH_SECRET="..."

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"

# GitHub — Personal Access Token (scopes: repo, delete_repo)
GITHUB_TOKEN="ghp_xxx"
GITHUB_USERNAME="tu-usuario"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"

# Pusher Channels
PUSHER_APP_ID="xxxxx"
PUSHER_KEY="xxxxxxxxxxxxxxxx"
PUSHER_SECRET="xxxxxxxxxxxxxxxx"
PUSHER_CLUSTER="us2"
NEXT_PUBLIC_PUSHER_KEY="xxxxxxxxxxxxxxxx"
NEXT_PUBLIC_PUSHER_CLUSTER="us2"

# Gmail SMTP — App Password (myaccount.google.com/apppasswords)
SMTP_USER="tucorreo@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"

# URLs
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

<div align="center">
  <sub>Desarrollado para la Universidad Popular del Cesar · 2025</sub>
</div>
