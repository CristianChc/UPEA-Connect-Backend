# UPEA Connect API

Backend REST para la app **UPEA Connect** (asistente académico para estudiantes de la UPEA). Reemplaza el almacenamiento local del frontend Flutter y expone autenticación JWT, apuntes y calendario vía HTTP/JSON.

**Stack:** Next.js 16 (App Router) · TypeScript · Prisma 7 · PostgreSQL · JWT (`jose`) · `bcryptjs` · `zod`

> El contrato completo de la API (endpoints, modelos y formatos JSON) está en [`requerimientos_backend_upea_connect.md`](requerimientos_backend_upea_connect.md).

## Estado actual

Cimientos implementados:

- Schema Prisma: `User`, `Note`, `NotePage`, `FloatingElement`, `Event` + enums (migración inicial aplicada).
- Autenticación: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- Infraestructura: cliente Prisma singleton (`lib/prisma.ts`), helpers de auth (`lib/auth.ts`), formato de error uniforme (`lib/api-response.ts`), validación Zod (`lib/validation.ts`).
- `GET /api/health` para verificar conectividad con la base.
- CORS configurable vía `CORS_ORIGIN`.

Pendiente (según checklist del documento): CRUD de `/api/notes` y `/api/events`, `PUT /api/auth/profile`, paginación, `API.md` y deploy.

## Puesta en marcha

```bash
npm install            # instala deps y genera el cliente Prisma (postinstall)
docker run -d --name upea-postgres \
  -e POSTGRES_USER=upea -e POSTGRES_PASSWORD=upea_dev_pass -e POSTGRES_DB=upea_connect \
  -p 5432:5432 -v upea_pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
cp .env.example .env   # ajustá las URLs de la base y JWT_SECRET
npm run db:migrate     # aplica las migraciones
npm run dev
```

Probar:

```bash
curl http://localhost:3000/api/health
```

## Endpoints

| Método | Ruta | Auth | Descripción |
| ------ | ---- | ---- | ----------- |
| GET | `/api/health` | — | Healthcheck + estado de la DB |
| POST | `/api/auth/register` | — | Registro de estudiante → `{ token, user }` |
| POST | `/api/auth/login` | — | Login → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Perfil del usuario autenticado |
| PUT | `/api/auth/profile` | Bearer | Actualizar perfil (nombre, carrera, semestre, fotoUrl) |
| POST | `/api/notes` | Bearer | Crear apunte con páginas y elementos flotantes |
| GET | `/api/notes` | Bearer | Listar apuntes (`?search=&courseName=&page=&limit=`) |
| GET | `/api/notes/:id` | Bearer | Detalle de apunte con páginas y elementos flotantes |
| PUT | `/api/notes/:id` | Bearer | Reemplazo completo: actualiza y reconstruye páginas/elementos (transacción) |
| DELETE | `/api/notes/:id` | Bearer | Elimina apunte con todo su contenido anidado (cascada) |
| GET | `/api/events` | Bearer | Lista eventos: `?start&end` rango de fechas, `?type`, `?page&limit` → `{ events, total, page, limit }` |
| POST | `/api/events` | Bearer | Crea evento `{ title, description?, date, type }` |
| PUT | `/api/events/:id` | Bearer | Actualiza evento (campos opcionales) |
| PATCH | `/api/events/:id/complete` | Bearer | Marca/desmarca completado `{ isCompleted }` |
| DELETE | `/api/events/:id` | Bearer | Elimina evento |

## Variables de entorno

| Variable | Descripción |
| -------- | ----------- |
| `DATABASE_URL` | Conexión a PostgreSQL (runtime). En Neon usar la URL **pooled**. |
| `DIRECT_URL` | Conexión directa, la usan las migraciones (`prisma migrate`). En Neon usar la URL **directa**. |
| `JWT_SECRET` | Secreto para firmar tokens (`openssl rand -base64 32`). |
| `JWT_EXPIRES_IN` | Expiración del token (default `7d`). |
| `CORS_ORIGIN` | Origen permitido, `*` para desarrollo. |

### Neon (producción)

Crear un proyecto en [console.neon.tech](https://console.neon.tech). En `Connect` → copiar la conexión **pooled** en `DATABASE_URL` y la **directa** en `DIRECT_URL` (`?sslmode=require`). Deploy en Vercel con esas variables + `JWT_SECRET`.

## Comandos útiles

```bash
npm run db:generate   # regenerar cliente Prisma
npm run db:migrate    # crear/aplicar migraciones (dev)
npm run db:deploy     # aplicar migraciones (producción)
npm run db:studio     # explorar la base
```
