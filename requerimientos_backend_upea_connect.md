# 📋 Requerimientos del Backend — UPEA Connect API

> **Versión:** 1.0  
> **Fecha:** 2026-08-14  
> **Stack Backend:** Next.js 15 (App Router) · TypeScript · Prisma ORM · PostgreSQL (Neon) · Vercel  
> **Stack Frontend:** Flutter (Dart) — desarrollado por tercero, consume esta API vía HTTP/JSON  
> **Arquitectura:** REST API con autenticación JWT Bearer

---

## 1. Contexto del Proyecto

**UPEA Connect** es una aplicación móvil multiplataforma desarrollada en Flutter dirigida a estudiantes de la Universidad Pública de El Alto (UPEA). Su objetivo es servir como asistente académico personal que permita:

- Gestionar perfiles de estudiante (nombre, email, carrera, semestre, foto).
- Crear, editar, buscar y eliminar apuntes académicos con soporte multi-página, texto enriquecido, imágenes flotantes y exportación a PowerPoint.
- Gestionar un calendario académico con eventos, fechas de evaluaciones y recordatorios.
- Consultar un asistente con IA (integración futura vía API de terceros).

La aplicación fue construida inicialmente como **100 % offline**, utilizando `SharedPreferences` y almacenamiento local. Los nuevos requerimientos obligan a migrar a una arquitectura **cliente-servidor** para:

1. **Persistencia remota:** los datos deben sobrevivir a desinstalaciones, cambios de dispositivo y formateos.
2. **Multi-dispositivo:** el estudiante puede acceder a sus apuntes desde cualquier teléfono.
3. **IA asistente:** requiere conectividad para consultar modelos de lenguaje (Gemini/OpenAI).
4. **Escalabilidad futura:** notificaciones push, sincronización en tiempo real, etc.

---

## 2. Alcance del Backend

Este documento define el backend necesario para **reemplazar el almacenamiento local** del frontend Flutter existente, sin modificar la UI ni la experiencia de usuario del lado del cliente.

El backend debe exponer una **API REST JSON** que el cliente Flutter consuma mediante el paquete `http` de Dart. La autenticación se realizará mediante **JWT (JSON Web Tokens)**.

---

## 3. Entidades y Modelo de Datos (Prisma)

### 3.1 Usuario (`User`)
Representa una cuenta de estudiante.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `String` (UUID/CUID) | PK | Identificador único |
| `nombre` | `String` | Sí | Nombre completo del estudiante |
| `email` | `String` | Sí, único | Correo institucional o personal |
| `password` | `String` | Sí | Hash bcrypt (nunca texto plano) |
| `carrera` | `String` | Sí | Carrera universitaria |
| `semestre` | `String` | Sí | Semestre actual (ej: "5to Semestre") |
| `fotoUrl` | `String?` | No | URL de foto de perfil (Cloudinary / S3 / Base64) |
| `createdAt` | `DateTime` | Auto | Fecha de registro |
| `updatedAt` | `DateTime` | Auto | Última actualización |

**Relaciones:**
- `User` → `Note[]` (1:N)
- `User` → `Event[]` (1:N)

### 3.2 Apunte (`Note`)
Documento académico creado por un estudiante.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `String` (UUID/CUID) | PK | Identificador único |
| `title` | `String` | Sí | Título del apunte |
| `content` | `String` | Sí | Texto plano completo (concatenación de páginas) |
| `courseName` | `String?` | No | Materia asociada (ej: "Física I") |
| `userId` | `String` | FK | Propietario del apunte |
| `createdAt` | `DateTime` | Auto | Fecha de creación |
| `updatedAt` | `DateTime` | Auto | Última modificación |

**Relaciones:**
- `Note` → `NotePage[]` (1:N)
- `Note` → `User` (N:1)

### 3.3 Página de Apunte (`NotePage`)
Cada apunte puede tener múltiples páginas (modelo A4 multi-página del editor).

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `String` (UUID/CUID) | PK | Identificador único |
| `pageIndex` | `Int` | Sí | Orden de la página (0, 1, 2...) |
| `textContent` | `String` | No | Texto del cuerpo de la página |
| `noteId` | `String` | FK | Apunte al que pertenece |

**Relaciones:**
- `NotePage` → `FloatingElement[]` (1:N)

### 3.4 Elemento Flotante (`FloatingElement`)
Imágenes o cajas de texto posicionadas libremente sobre el lienzo A4.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `String` (UUID/CUID) | PK | Identificador único |
| `type` | `Enum` | Sí | `TEXT` o `IMAGE` |
| `positionX` | `Float` | Sí | Posición X en el lienzo |
| `positionY` | `Float` | Sí | Posición Y en el lienzo |
| `width` | `Float` | Sí | Ancho del elemento |
| `height` | `Float` | Sí | Alto del elemento |
| `text` | `String?` | No | Contenido de texto (si type=TEXT) |
| `imageUrl` | `String?` | No | URL de imagen (si type=IMAGE) |
| `pageId` | `String` | FK | Página a la que pertenece |

### 3.5 Evento del Calendario (`Event`)
Eventos académicos (exámenes, entregas, clases, recordatorios).

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `id` | `String` (UUID/CUID) | PK | Identificador único |
| `title` | `String` | Sí | Título del evento |
| `description` | `String?` | No | Detalle adicional |
| `date` | `DateTime` | Sí | Fecha y hora del evento |
| `type` | `Enum` | Sí | `EXAM`, `ASSIGNMENT`, `CLASS`, `REMINDER`, `OTHER` |
| `isCompleted` | `Boolean` | Default false | ¿El estudiante ya lo cumplió? |
| `userId` | `String` | FK | Propietario del evento |
| `createdAt` | `DateTime` | Auto | Fecha de creación |
| `updatedAt` | `DateTime` | Auto | Última modificación |

---

## 4. Endpoints de la API

### 4.1 Autenticación (`/api/auth`)

#### `POST /api/auth/register`
Registro de nuevo estudiante.

**Request Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@upea.edu.bo",
  "password": "contraseñaSegura123",
  "carrera": "Ingeniería de Sistemas",
  "semestre": "5to Semestre"
}
```

**Response 201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cl...",
    "nombre": "Juan Pérez",
    "email": "juan@upea.edu.bo",
    "carrera": "Ingeniería de Sistemas",
    "semestre": "5to Semestre",
    "fotoUrl": null
  }
}
```

**Response 409:** Email ya registrado.

---

#### `POST /api/auth/login`
Inicio de sesión.

**Request Body:**
```json
{
  "email": "juan@upea.edu.bo",
  "password": "contraseñaSegura123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

**Response 401:** Credenciales inválidas.

---

#### `GET /api/auth/me`
Obtener perfil del usuario autenticado.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "cl...",
  "nombre": "Juan Pérez",
  "email": "juan@upea.edu.bo",
  "carrera": "Ingeniería de Sistemas",
  "semestre": "5to Semestre",
  "fotoUrl": null,
  "createdAt": "2026-08-14T17:44:00Z"
}
```

---

#### `PUT /api/auth/profile`
Actualizar perfil del usuario.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "nombre": "Juan Pérez López",
  "carrera": "Ingeniería de Sistemas",
  "semestre": "6to Semestre",
  "fotoUrl": "https://..."
}
```

**Response 200:** Usuario actualizado.

---

### 4.2 Apuntes (`/api/notes`)

#### `GET /api/notes`
Listar todos los apuntes del usuario autenticado. Soporta búsqueda por query param.

**Headers:** `Authorization: Bearer <token>`

**Query Params (opcionales):**
- `?search=física` — busca en título, contenido o courseName (case-insensitive)
- `?courseName=Física` — filtra por materia exacta

**Response 200:**
```json
{
  "notes": [
    {
      "id": "note_abc",
      "title": "Ley de Ohm",
      "content": "V = I × R\n---\nEjercicios...",
      "courseName": "Física I",
      "createdAt": "2026-08-10T10:00:00Z",
      "updatedAt": "2026-08-14T12:30:00Z"
    }
  ]
}
```

---

#### `GET /api/notes/:id`
Obtener un apunte completo con todas sus páginas y elementos flotantes.

**Headers:** `Authorization: Bearer <token>`

**Response 200:**
```json
{
  "id": "note_abc",
  "title": "Ley de Ohm",
  "content": "V = I × R\n---\nEjercicios...",
  "courseName": "Física I",
  "userId": "user_xyz",
  "createdAt": "2026-08-10T10:00:00Z",
  "updatedAt": "2026-08-14T12:30:00Z",
  "pages": [
    {
      "id": "page_1",
      "pageIndex": 0,
      "textContent": "V = I × R",
      "floatingElements": [
        {
          "id": "elem_1",
          "type": "IMAGE",
          "positionX": 50.0,
          "positionY": 100.0,
          "width": 200.0,
          "height": 150.0,
          "imageUrl": "https://...",
          "text": null
        }
      ]
    }
  ]
}
```

---

#### `POST /api/notes`
Crear un nuevo apunte.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Ley de Ohm",
  "content": "V = I × R\n---\nEjercicios...",
  "courseName": "Física I",
  "pages": [
    {
      "pageIndex": 0,
      "textContent": "V = I × R",
      "floatingElements": [
        {
          "type": "TEXT",
          "positionX": 40.0,
          "positionY": 40.0,
          "width": 180.0,
          "height": 100.0,
          "text": "Nota importante"
        }
      ]
    }
  ]
}
```

**Response 201:** Apunte creado con `id` asignado.

---

#### `PUT /api/notes/:id`
Actualizar un apunte existente (incluyendo páginas y elementos flotantes).

**Headers:** `Authorization: Bearer <token>`

**Request Body:** mismo formato que POST, pero con `id` existente. El backend debe reemplazar las páginas/elementos anidados (upsert/delete).

**Response 200:** Apunte actualizado.

---

#### `DELETE /api/notes/:id`
Eliminar un apunte y todo su contenido anidado.

**Headers:** `Authorization: Bearer <token>`

**Response 204:** No content.

---

### 4.3 Eventos del Calendario (`/api/events`)

#### `GET /api/events`
Listar eventos del usuario. Soporta filtro por rango de fechas.

**Headers:** `Authorization: Bearer <token>`

**Query Params (opcionales):**
- `?start=2026-08-01&end=2026-08-31` — rango de fechas
- `?type=EXAM` — filtra por tipo

**Response 200:**
```json
{
  "events": [
    {
      "id": "evt_1",
      "title": "Examen de Física",
      "description": "Capítulos 1-5",
      "date": "2026-08-20T08:00:00Z",
      "type": "EXAM",
      "isCompleted": false,
      "createdAt": "2026-08-14T17:44:00Z"
    }
  ]
}
```

---

#### `POST /api/events`
Crear evento.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "title": "Examen de Física",
  "description": "Capítulos 1-5",
  "date": "2026-08-20T08:00:00Z",
  "type": "EXAM"
}
```

**Response 201:** Evento creado.

---

#### `PUT /api/events/:id`
Actualizar evento.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** mismos campos que POST.

**Response 200:** Evento actualizado.

---

#### `PATCH /api/events/:id/complete`
Marcar/desmarcar evento como completado.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "isCompleted": true
}
```

**Response 200:** Evento actualizado.

---

#### `DELETE /api/events/:id`
Eliminar evento.

**Headers:** `Authorization: Bearer <token>`

**Response 204:** No content.

---

## 5. Flujo de Datos: Flutter ↔ Backend

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLUTTER (Cliente)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LoginScreen │  │ HomeScreen  │  │ NotesScreen │  │ CalendarScreen      │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                │                    │             │
│         ▼                ▼                ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    flutter_secure_storage (JWT)                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                │                │                    │             │
│         ▼                ▼                ▼                    ▼             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              HTTP Client (package:http) — JSON/REST                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                │                │                    │             │
└─────────┼────────────────┼────────────────┼────────────────────┼─────────────┘
          │                │                │                    │
          ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS API (Servidor)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│
│  │ /api/auth/* │  │ /api/notes  │  │ /api/events │  │ Middleware JWT      ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘│
│         │                │                │                                  │
│         ▼                ▼                ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Prisma ORM                                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│         │                │                │                                  │
│         ▼                ▼                ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL (Neon — Serverless)                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Consideraciones Técnicas del Backend

### 6.1 Autenticación JWT
- Almacenar `JWT_SECRET` en variables de entorno de Vercel.
- El token debe incluir `userId` en el payload.
- Expiración recomendada: **7 días** (para no molestar al usuario con re-login frecuente).
- El Flutter guarda el token con `flutter_secure_storage` (más seguro que `SharedPreferences`).

### 6.2 Transacciones Anidadas (Notes)
Al crear/actualizar un apunte con páginas y elementos flotantes, usar **transacciones Prisma** para garantizar integridad referencial:
```typescript
await prisma.$transaction([
  prisma.note.update({ ... }),
  prisma.notePage.deleteMany({ where: { noteId } }),
  prisma.notePage.createMany({ ... }),
  prisma.floatingElement.createMany({ ... }),
]);
```

### 6.3 Soft Delete vs Hard Delete
Para un proyecto académico, **hard delete** está bien. Si quieren escalabilidad futura, considerar soft delete con campo `deletedAt`.

### 6.4 Paginación
Los endpoints `GET /api/notes` y `GET /api/events` deben soportar paginación:
```
GET /api/notes?page=1&limit=20
```

### 6.5 CORS
Configurar CORS en Next.js para permitir peticiones desde el dominio del app Flutter (en desarrollo: `*` o el puerto del emulador).

### 6.6 Imágenes
Las imágenes de los elementos flotantes y la foto de perfil pueden manejarse de dos formas:
- **Opción A (recomendada):** Subir a Cloudinary/AWS S3 y guardar solo la URL en PostgreSQL.
- **Opción B (MVP rápido):** Base64 en el campo `imageUrl` (no recomendado para producción, pero funciona para un demo académico).

---

## 7. Infraestructura Propuesta

| Servicio | Proveedor | Uso |
|----------|-----------|-----|
| **Base de Datos** | Neon (PostgreSQL) | Serverless, gratis en tier hobby, buena latencia para Vercel |
| **Backend/API** | Vercel (Next.js) | Deploy automático desde GitHub, HTTPS, serverless functions |
| **Almacenamiento de Imágenes** | Cloudinary (free tier) | Subida de fotos de perfil e imágenes de apuntes |
| **IA Asistente** | Google Gemini API | SDK oficial para Flutter, free tier generoso |

### ¿Por qué Neon + Vercel?
- Neon es **serverless PostgreSQL**, se escala a cero cuando no hay tráfico (ideal para proyectos académicos).
- Vercel y Neon están en la misma región (US East), latencia baja.
- Prisma funciona perfectamente con Neon.
- Ambos tienen tiers gratuitos suficientes para un proyecto académico.

---

## 8. Recomendaciones Adicionales

### 8.1 No replicar el "Account Switcher" del frontend
El frontend actual tiene una pantalla para cambiar entre múltiples cuentas guardadas localmente. **Con autenticación real esto ya no tiene sentido.** Cada usuario tiene una sola sesión activa. El frontend puede eliminar esa pantalla o convertirla en un simple "Cerrar sesión / Iniciar sesión con otra cuenta".

### 8.2 Schema de Prisma — recomendación de índices
```prisma
model Note {
  id        String   @id @default(cuid())
  title     String
  content   String   @db.Text
  courseName String?
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  pages     NotePage[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([userId, courseName])
}

model Event {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text
  date        DateTime
  type        EventType
  isCompleted Boolean  @default(false)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([userId, date])
}
```

### 8.3 Rate Limiting
En Vercel + Next.js, agregar rate limiting simple en los endpoints de auth para evitar ataques de fuerza bruta:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
```

### 8.4 Validación de Entrada
Usar **Zod** para validar todos los bodies de request antes de tocar Prisma. Esto evita errores de tipo y ataques de inyección.

### 8.5 Manejo de Errores Uniforme
Toda la API debe responder con el mismo formato de error:
```json
{
  "error": "TÍTULO_DEL_ERROR",
  "message": "Descripción legible para el usuario",
  "statusCode": 400
}
```
Así el Flutter puede mostrar `SnackBar` con el mensaje sin parsear nada raro.

### 8.6 Documentación Interactiva
Instalar `next-swagger-doc` para generar Swagger UI automáticamente en `/api/docs`. Tu compañero podrá probar los endpoints desde el navegador sin escribir una línea de Dart.

---

## 9. Checklist de Implementación

- [ ] Crear repo de backend con Next.js 15 + Prisma + PostgreSQL
- [ ] Configurar Neon y conectar DATABASE_URL
- [ ] Definir schema de Prisma (User, Note, NotePage, FloatingElement, Event)
- [ ] Ejecutar `prisma migrate dev`
- [ ] Implementar `/api/auth/register`
- [ ] Implementar `/api/auth/login`
- [ ] Implementar middleware JWT
- [ ] Implementar `/api/auth/me` y `/api/auth/profile`
- [ ] Implementar CRUD completo de `/api/notes`
- [ ] Implementar CRUD completo de `/api/events`
- [ ] Agregar validación Zod a todos los endpoints
- [ ] Configurar CORS
- [ ] Deploy en Vercel
- [ ] Crear documento `API.md` para el compañero Flutter
- [ ] (Opcional) Agregar Swagger UI

---

## 10. Glosario para el Compañero Flutter

| Término | Significado para él |
|---------|---------------------|
| **JWT** | Un string largo que recibe al hacer login. Debe guardarlo y enviarlo en el header `Authorization: Bearer <token>` de cada petición. |
| **Endpoint** | Una URL específica de la API. Ej: `https://mi-api.vercel.app/api/notes` |
| **JSON** | El formato de texto en el que envía y recibe datos. En Dart se convierte con `jsonEncode()` y `jsonDecode()`. |
| **HTTP Status** | El número que devuelve la API: `200` = OK, `201` = Creado, `400` = Error de datos, `401` = No autorizado, `404` = No encontrado, `500` = Error del servidor. |
| **Bearer Token** | La palabra mágica que va antes del JWT en el header. Siempre es `Bearer ` + el token. |

---

> **Nota final:** Este documento es un contrato técnico entre backend y frontend. Una vez que ambos estén de acuerdo con estos endpoints y formatos de JSON, cada uno puede desarrollar en paralelo sin bloquearse. El backend puede ser probado con Postman/Insomnia mientras el frontend aún no está conectado.
