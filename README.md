# UniHaven — Repositorio Académico Digital
### Universidad Popular del Cesar

> Plataforma web para la gestión, publicación y consulta de proyectos de grado, investigaciones y proyectos de aula de la Universidad Popular del Cesar (UPC).

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Contexto del Proyecto de Grado](#contexto-del-proyecto-de-grado)
3. [Objetivos](#objetivos)
4. [Requisitos Funcionales](#requisitos-funcionales)
5. [Requisitos No Funcionales](#requisitos-no-funcionales)
6. [Arquitectura y Stack Tecnológico](#arquitectura-y-stack-tecnológico)
7. [Modelo de Datos](#modelo-de-datos)
8. [Estructura del Proyecto](#estructura-del-proyecto)
9. [Metodología](#metodología)
10. [Cronograma](#cronograma)
11. [Instalación y Configuración](#instalación-y-configuración)
12. [Variables de Entorno](#variables-de-entorno)
13. [Despliegue](#despliegue)
14. [Autores](#autores)

---

## Descripción General

**UniHaven** es un repositorio académico digital desarrollado para la Universidad Popular del Cesar. Su propósito es centralizar la producción intelectual estudiantil — tesis de grado, proyectos de investigación y proyectos de aula — haciéndola accesible a toda la comunidad académica y al público general.

Cada proyecto subido genera automáticamente un repositorio en GitHub bajo la cuenta institucional, garantizando preservación a largo plazo, control de versiones y disponibilidad permanente. La plataforma incluye funcionalidades sociales (comentarios, reacciones, seguimiento), sistema de moderación, notificaciones en tiempo real y un panel de administración completo.

---

## Contexto del Proyecto de Grado

| Campo | Detalle |
|---|---|
| **Institución** | Universidad Popular del Cesar |
| **Programa** | Ingeniería de Sistemas (o afín) |
| **Tipo de proyecto** | Desarrollo de Software / Innovación Tecnológica |
| **Modalidad** | Proyecto de Grado |
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
- Cubre los tipos de trabajo: Tesis de Grado, Investigación y Proyecto de Aula.
- El acceso público permite consulta sin registro; la publicación requiere cuenta institucional (@unicesar.edu.co).

---

## Objetivos

### Objetivo General

Diseñar e implementar una plataforma web que permita a los estudiantes de la Universidad Popular del Cesar publicar, gestionar y difundir sus proyectos académicos, integrando control de versiones mediante GitHub y funcionalidades de interacción comunitaria.

### Objetivos Específicos

1. Desarrollar un módulo de autenticación que distinga usuarios institucionales de usuarios externos.
2. Implementar la integración con la API de GitHub para la creación automática de repositorios por cada proyecto subido.
3. Construir un sistema de moderación y reporte de contenido administrado por roles.
4. Diseñar una interfaz de búsqueda y filtrado que facilite la exploración del repositorio.
5. Integrar notificaciones en tiempo real mediante WebSockets (Pusher).

---

## Requisitos Funcionales

| ID | Requisito |
|---|---|
| **RF-01** | El sistema debe permitir el registro de usuarios mediante correo electrónico y contraseña, con verificación por email antes de activar la cuenta. |
| **RF-02** | El sistema debe permitir el inicio de sesión mediante OAuth con Google, restringiendo el registro institucional a cuentas `@unicesar.edu.co`. |
| **RF-03** | Los usuarios con rol `UPC_STUDENT` deben poder subir proyectos completando un formulario multi-paso con título, resumen, tipo, área, palabras clave, autores, año y archivos. |
| **RF-04** | Al crear un proyecto, el sistema debe generar automáticamente un repositorio privado en GitHub bajo la cuenta configurada, subir los archivos y registrar el SHA del commit. |
| **RF-05** | El sistema debe permitir a los administradores aprobar, rechazar, retirar y reinstaurar proyectos, controlando su visibilidad pública. |
| **RF-06** | Los usuarios deben poder buscar proyectos por texto libre (título, resumen, palabras clave) y filtrar por tipo, área de conocimiento y año. |
| **RF-07** | El sistema debe mostrar un feed paginado de proyectos aprobados ordenados cronológicamente, con imagen de portada, tipo, área y autores. |
| **RF-08** | Los usuarios autenticados deben poder comentar en proyectos, responder comentarios y eliminar sus propios comentarios. |
| **RF-09** | Los usuarios autenticados deben poder reaccionar a proyectos con emojis (Me gusta, Me encanta, Celebrar, Pensativo). |
| **RF-10** | Los usuarios autenticados deben poder guardar proyectos en marcadores (bookmarks) y consultarlos desde su perfil. |
| **RF-11** | Los usuarios deben poder seguir proyectos para ser notificados de nuevas versiones, y seguir a otros usuarios. |
| **RF-12** | Los autores y administradores deben poder subir nuevas versiones de un proyecto, registrando el changelog y el nuevo commit en GitHub. |
| **RF-13** | Los administradores deben poder crear, editar y eliminar anuncios institucionales, con opción de fijarlos y añadir imagen de portada. |
| **RF-14** | El sistema debe enviar notificaciones en tiempo real a los usuarios cuando reciban comentarios en sus proyectos, nuevos seguidores o mensajes directos. |
| **RF-15** | Los usuarios deben poder reportar proyectos con contenido inapropiado; los administradores visualizan y gestionan los reportes desde el panel de administración. |

---

## Requisitos No Funcionales

| ID | Requisito |
|---|---|
| **RNF-01** | **Rendimiento:** Las páginas de listado deben cargar en menos de 2 segundos bajo condiciones normales de red, utilizando renderizado del lado del servidor (SSR) y paginación. |
| **RNF-02** | **Disponibilidad:** La plataforma debe tener una disponibilidad mínima del 99 % mensual, apoyada en la infraestructura de Vercel y Neon PostgreSQL. |
| **RNF-03** | **Seguridad:** Las contraseñas deben almacenarse cifradas con bcrypt (mínimo 12 rondas). Las rutas protegidas deben validarse mediante middleware de autenticación en el edge. |
| **RNF-04** | **Seguridad:** Los tokens de verificación de email deben tener expiración de 24 horas y ser de un solo uso. |
| **RNF-05** | **Escalabilidad:** La arquitectura debe soportar el crecimiento del repositorio sin cambios estructurales, aprovechando el almacenamiento ilimitado de GitHub y Vercel Blob para archivos binarios. |
| **RNF-06** | **Usabilidad:** La interfaz debe ser responsiva y funcional en dispositivos móviles, tabletas y escritorio, siguiendo principios de diseño accesible (WCAG 2.1 AA). |
| **RNF-07** | **Mantenibilidad:** El código debe seguir la estructura de carpetas de Next.js App Router, con separación clara entre Server Components, Client Components y Server Actions. |
| **RNF-08** | **Portabilidad:** La aplicación debe poder desplegarse en cualquier proveedor compatible con Node.js 18+ sin modificaciones al código fuente, cambiando únicamente variables de entorno. |
| **RNF-09** | **Compatibilidad:** El sistema debe funcionar correctamente en los navegadores Chrome, Firefox, Safari y Edge en sus versiones de los últimos 2 años. |
| **RNF-10** | **Privacidad:** Los repositorios de GitHub se crean como privados y solo se hacen públicos tras la aprobación de un administrador, protegiendo trabajos en revisión. |
| **RNF-11** | **Tiempo real:** Las notificaciones deben entregarse con una latencia máxima de 500 ms desde el evento hasta la visualización en el cliente, utilizando WebSockets (Pusher Channels). |
| **RNF-12** | **Internacionalización:** La interfaz de usuario debe estar completamente en español (es-CO), incluyendo mensajes de error, etiquetas y fechas formateadas según la configuración regional colombiana. |
| **RNF-13** | **SEO:** Las páginas de proyectos deben incluir metadatos Open Graph y Twitter Card dinámicos para permitir la indexación por motores de búsqueda y la previsualización en redes sociales. |
| **RNF-14** | **Trazabilidad:** Toda acción administrativa (aprobación, rechazo, eliminación de proyectos, gestión de usuarios) debe quedar registrada con información del administrador que la ejecutó. |
| **RNF-15** | **Integridad de datos:** El sistema debe validar los archivos subidos (tamaño máximo 100 MB por archivo, tipos permitidos) tanto en el cliente como en el servidor antes de enviarlos a Vercel Blob o GitHub. |

---

## Arquitectura y Stack Tecnológico

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                     │
│           React 19 + Next.js 15 (App Router)                │
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
| Framework | Next.js | 15.x |
| UI Library | React | 19.x |
| Lenguaje | TypeScript | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes UI | shadcn/ui | Latest |
| ORM | Prisma | 7.x |
| Base de Datos | PostgreSQL (Neon) | 16.x |
| Autenticación | Auth.js (NextAuth) | v5 |
| API GitHub | Octokit REST | 21.x |
| Almacenamiento | Vercel Blob | Latest |
| Tiempo Real | Pusher Channels | Latest |
| Email | Nodemailer + Gmail | 6.x |
| Despliegue | Vercel | Latest |

---

## Modelo de Datos

### Entidades Principales

```
User
├── id, name, email, password, image, bio
├── role: ADMIN | UPC_STUDENT | GENERAL
└── relations: projects, comments, reactions, bookmarks, notifications

Project
├── id, title, abstract, type: THESIS | RESEARCH | CLASSROOM
├── year, keywords[], status: PENDING | APPROVED | REJECTED | WITHDRAWN
├── githubRepo, coverImage, views
└── relations: authors, files, versions, comments, reactions, reports

ProjectVersion
├── id, projectId, number, changelog, commitSHA
└── createdAt

KnowledgeArea
├── id, name, slug, description
└── projects[]

Announcement
├── id, title, body, pinned, coverImage
└── createdAt, updatedAt

Notification
├── id, userId, type, reference (JSON), read
└── createdAt
```

---

## Estructura del Proyecto

```
unihaven/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas de autenticación (login, register)
│   ├── actions/                  # Server Actions (lógica de negocio)
│   │   ├── projects.ts           # CRUD proyectos + GitHub
│   │   ├── comments.ts           # Comentarios y reacciones
│   │   ├── announcements.ts      # Anuncios
│   │   ├── bookmarks.ts          # Marcadores
│   │   ├── follows.ts            # Seguimiento
│   │   ├── notifications.ts      # Notificaciones
│   │   └── auth.ts               # Registro y login
│   ├── admin/                    # Panel de administración
│   ├── announcements/            # Página pública de anuncios
│   ├── profile/[id]/             # Perfiles de usuario
│   ├── projects/                 # Feed y detalle de proyectos
│   ├── verify-email/             # Verificación de correo
│   └── layout.tsx                # Layout raíz
├── components/                   # Componentes React reutilizables
│   ├── admin/                    # Componentes del panel admin
│   ├── announcements/            # Banner y tarjetas de anuncios
│   ├── follows/                  # Botones de seguimiento
│   ├── layout/                   # Navbar, providers
│   ├── notifications/            # Campana de notificaciones
│   ├── projects/                 # Tarjetas, comentarios, reacciones
│   └── ui/                       # Componentes shadcn/ui
├── lib/                          # Utilidades y configuración
│   ├── auth.ts                   # Configuración Auth.js
│   ├── email.ts                  # Envío de correos
│   ├── github.ts                 # Helpers GitHub API
│   ├── notifications.ts          # Triggers Pusher
│   ├── prisma.ts                 # Cliente Prisma
│   ├── pusher.ts                 # Pusher servidor
│   └── pusher-client.ts          # Pusher cliente
└── prisma/
    └── schema.prisma             # Esquema de base de datos
```

---

## Metodología

El proyecto sigue la metodología **SCRUM adaptada** para trabajo individual/pequeño equipo, con sprints de 2 semanas y entregables parciales verificables.

### Fases del Proyecto

#### Fase 0 — Iniciación y Planificación (Semanas 1–2)
- Levantamiento de requisitos con stakeholders (directivos UPC, estudiantes)
- Definición de alcance, restricciones y riesgos
- Selección del stack tecnológico y justificación
- Configuración del entorno de desarrollo
- Creación del repositorio y estructura base del proyecto

#### Fase 1 — Infraestructura y Autenticación (Semanas 3–4)
- Diseño y creación del esquema de base de datos (Prisma + Neon)
- Implementación de autenticación (Auth.js v5, OAuth Google, credenciales)
- Verificación de email con token (Nodemailer)
- Middleware de protección de rutas
- Sistema de roles (ADMIN, UPC_STUDENT, GENERAL)

#### Fase 2 — Núcleo — Publicación de Proyectos (Semanas 5–7)
- Formulario multi-paso de carga de proyectos
- Integración GitHub API: creación de repositorios, upload de archivos, commits
- Almacenamiento de archivos en Vercel Blob (imágenes de portada)
- Feed con paginación, búsqueda y filtros
- Página de detalle del proyecto

#### Fase 3 — Interacción Social (Semanas 8–9)
- Sistema de comentarios con respuestas anidadas
- Reacciones con emojis
- Marcadores (bookmarks)
- Seguimiento de usuarios y proyectos
- Versionado de proyectos (nuevas versiones con changelog)

#### Fase 4 — Administración y Moderación (Semanas 10–11)
- Panel de administración (proyectos, usuarios, reportes, anuncios)
- Flujo de moderación: aprobar, rechazar, retirar, reinstaurar
- Sistema de reportes por parte de usuarios
- Gestión de anuncios institucionales

#### Fase 5 — Tiempo Real y Notificaciones (Semana 12)
- Integración Pusher Channels
- Notificaciones en tiempo real (comentarios, seguidores)
- Banner de anuncios fijados

#### Fase 6 — Optimización y Despliegue (Semanas 13–14)
- SEO: metadatos dinámicos, Open Graph, Twitter Cards
- Auditoría de rendimiento (Lighthouse)
- Pruebas de usabilidad
- Configuración de variables de entorno en Vercel
- Despliegue a producción
- Documentación final

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
| 9 | Social | Bookmarks, follows, versionado | Perfil de usuario completo |
| 10 | Admin | Panel admin, moderación | Panel de administración |
| 11 | Admin | Reportes, anuncios | Moderación + anuncios |
| 12 | Tiempo Real | Pusher, notificaciones | Notificaciones en vivo |
| 13 | Optimización | SEO, rendimiento, pruebas | Auditoría Lighthouse |
| 14 | Despliegue | Producción, documentación final | Aplicación en producción |

---

## Instalación y Configuración

### Prerrequisitos

- Node.js 18.17 o superior
- npm 9+
- Cuenta en [Neon](https://neon.tech) (PostgreSQL)
- Cuenta en [GitHub](https://github.com) con Personal Access Token
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Pusher](https://pusher.com)
- Cuenta Gmail con 2FA habilitado (para SMTP)

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

# 4. Sincronizar la base de datos
npx prisma db push
npx prisma generate

# 5. Poblar áreas de conocimiento iniciales
# Visitar http://localhost:3000/api/seed (solo en desarrollo)

# 6. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

### Primer administrador

Después de registrarse, ejecutar en Neon Console o cualquier cliente PostgreSQL:

```sql
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

## Despliegue

### Vercel (Producción)

1. Conectar el repositorio en [vercel.com/new](https://vercel.com/new)
2. Configurar todas las variables de entorno en **Settings → Environment Variables**
3. Actualizar `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` con la URL de producción (ej: `https://unihaven.vercel.app`)
4. En Google Cloud Console → OAuth Client → **Authorized redirect URIs** añadir:
   ```
   https://unihaven.vercel.app/api/auth/callback/google
   ```
5. Vercel desplegará automáticamente en cada push a `main`

---

## Autores

| Nombre | Rol | Contacto |
|---|---|---|
| Michael Torres | Desarrollador Principal | [@mtorresweb](https://github.com/mtorresweb) |

---

<div align="center">
  <sub>Desarrollado para la Universidad Popular del Cesar · 2025</sub>
</div>
