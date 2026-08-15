# UPEA Connect API — Guía de Consumo (Flutter)

Contrato de la API REST del backend de UPEA Connect. La consume el app Flutter
vía HTTP/JSON. Autenticación con **JWT Bearer**. Cuando el backend esté en
producción, reemplazá `BASE_URL` por `https://tu-api.vercel.app`.

## Quick path

1. Registrate o iniciá sesión en `POST /api/auth/login` (o `/register`).
2. Guardá el campo `token` en `flutter_secure_storage` (NO en SharedPreferences).
3. Enviá el header `Authorization: Bearer <token>` en **todas** las peticiones, excepto `register` y `login`.
4. Probá con `GET /api/auth/me` para verificar la sesión.

## Información general

| Tema | Valor |
|------|-------|
| Formato | JSON (`Content-Type: application/json`) |
| Fechas | ISO-8601 UTC, ej. `"2026-08-20T08:00:00Z"` |
| Base URL (dev) | `http://localhost:3000` |
| Base URL (prod) | `https://<tu-proyecto>.vercel.app` |
| Auth | Header `Authorization: Bearer <token>` |

## Errores

Toda la API responde errores con el mismo formato:

```json
{ "error": "VALIDATION_ERROR", "message": "Descripción legible", "statusCode": 400 }
```

| Código | Error | Cuándo |
|--------|-------|--------|
| 400 | `VALIDATION_ERROR` | Datos inválidos (falta campo, formato incorrecto) |
| 401 | `UNAUTHORIZED` | Token faltante, inválido o expirado; credenciales incorrectas |
| 404 | `NOT_FOUND` | Recurso no existe o no te pertenece |
| 409 | `DUPLICATE_RESOURCE` | El email ya está registrado |
| 500 | `INTERNAL_SERVER_ERROR` | Error del servidor |

Mostrá `message` directo en un `SnackBar` en Flutter.

---

## 1. Autenticación `/api/auth`

### POST `/api/auth/register`

**Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@upea.edu.bo",
  "password": "contraseñaSegura123",
  "carrera": "Ingeniería de Sistemas",
  "semestre": "5to Semestre"
}
```

**201:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "cmst...",
    "nombre": "Juan Pérez",
    "email": "juan@upea.edu.bo",
    "carrera": "Ingeniería de Sistemas",
    "semestre": "5to Semestre",
    "fotoUrl": null
  }
}
```

**Errores:** 400 datos inválidos · 409 email ya registrado · 409 `DUPLICATE_RESOURCE`.

### POST `/api/auth/login`

**Body:** `{ "email": "...", "password": "..." }`

**200:** mismo formato que `register` (`token` + `user`).

**Errores:** 400 · 401 credenciales inválidas.

### GET `/api/auth/me`

Obtiene el perfil actual.

**200:**
```json
{
  "id": "cmst...",
  "nombre": "Juan Pérez",
  "email": "juan@upea.edu.bo",
  "carrera": "Ingeniería de Sistemas",
  "semestre": "5to Semestre",
  "fotoUrl": null,
  "createdAt": "2026-08-14T17:44:00Z",
  "updatedAt": "2026-08-14T17:44:00Z"
}
```

### PUT `/api/auth/profile`

Actualiza el perfil. Todos los campos son opcionales (envía solo lo que cambia).
`"fotoUrl": null` borra la foto.

**Body:** `{ "nombre": "Juan Pérez López", "carrera": "Ingeniería de Sistemas", "semestre": "6to Semestre", "fotoUrl": "https://..." }`

**200:** usuario actualizado (mismo formato que `me`).

---

## 2. Apuntes `/api/notes`

Un apunte tiene **páginas** (modelo A4 multi-página) y cada página tiene
**elementos flotantes** de tipo `TEXT` o `IMAGE`.

### Tipos de elementos flotantes

| type | Campos obligatorios |
|------|---------------------|
| `TEXT` | `text` |
| `IMAGE` | `imageUrl` (URL de la imagen) |

Comunes a ambos: `positionX`, `positionY`, `width`, `height` (números `float`).

### GET `/api/notes`

Lista apuntes del usuario. Devuelve solo datos del apunte (sin páginas).

**Query params (opcionales):** `?search=` (título/contenido/materia, sin mayúsculas), `?courseName=` (exacto), `?page=` `?limit=` (default 1/20, máx 100).

**200:**
```json
{
  "notes": [
    {
      "id": "cmst...",
      "title": "Ley de Ohm",
      "content": "V = I x R",
      "courseName": "Física I",
      "createdAt": "2026-08-10T10:00:00Z",
      "updatedAt": "2026-08-14T12:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### GET `/api/notes/:id`

Apunte completo con páginas y elementos flotantes.

**200:**
```json
{
  "id": "cmst...",
  "title": "Ley de Ohm",
  "content": "V = I x R",
  "courseName": "Física I",
  "userId": "cmst...",
  "createdAt": "2026-08-10T10:00:00Z",
  "updatedAt": "2026-08-14T12:30:00Z",
  "pages": [
    {
      "id": "cmst...",
      "pageIndex": 0,
      "textContent": "V = I x R",
      "floatingElements": [
        {
          "id": "cmst...",
          "type": "IMAGE",
          "positionX": 50.0,
          "positionY": 100.0,
          "width": 200.0,
          "height": 150.0,
          "text": null,
          "imageUrl": "https://..."
        }
      ]
    }
  ]
}
```

### POST `/api/notes`

Crea un apunte. **201** al crearlo (respuesta = apunte completo como en `GET /:id`).

**Body:**
```json
{
  "title": "Ley de Ohm",
  "content": "V = I x R",
  "courseName": "Física I",
  "pages": [
    {
      "pageIndex": 0,
      "textContent": "V = I x R",
      "floatingElements": [
        { "type": "TEXT", "positionX": 40.0, "positionY": 40.0, "width": 180.0, "height": 100.0, "text": "Nota importante" }
      ]
    }
  ]
}
```

### PUT `/api/notes/:id`

**Reemplazo completo**: actualiza título/contenido y reconstruye páginas y elementos.
Mandá el apunte entero igual que en POST. **200** con el apunte actualizado.

### DELETE `/api/notes/:id`

Elimina el apunte con todas sus páginas y elementos. **204** sin cuerpo.

---

## 3. Eventos del calendario `/api/events`

Tipos válidos: `EXAM` · `ASSIGNMENT` · `CLASS` · `REMINDER` · `OTHER`.

### GET `/api/events`

**Query params (opcionales):** `?start=` `?end=` (rango de fechas; para incluir el día final enviá `end` con hora `T23:59:59Z`), `?type=` (exacto), `?page=` `?limit=` (default 1/20, máx 100). Ordenados por fecha ascendente.

**200:**
```json
{
  "events": [
    {
      "id": "cmst...",
      "title": "Examen de Física",
      "description": "Capítulos 1-5",
      "date": "2026-08-20T08:00:00Z",
      "type": "EXAM",
      "isCompleted": false,
      "createdAt": "2026-08-14T17:44:00Z",
      "updatedAt": "2026-08-14T17:44:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### POST `/api/events`

**Body:** `{ "title": "Examen de Física", "description": "Capítulos 1-5", "date": "2026-08-20T08:00:00Z", "type": "EXAM" }` → **201** con el evento creado. `description` es opcional.

### PUT `/api/events/:id`

Actualiza el evento. Todos los campos opcionales (parcial). **200** con el evento actualizado.

### PATCH `/api/events/:id/complete`

Marca/desmarca completado.

**Body:** `{ "isCompleted": true }` → **200** con el evento actualizado.

### DELETE `/api/events/:id`

Elimina el evento. **204** sin cuerpo.

---

## Notas para el frontend

- **Duración del token:** 7 días. Si una petición responde `401`, redirigí a login y limpiá el token guardado.
- **Ownership:** un usuario solo ve y modifica sus propios apuntes/eventos. Un `404` también significa "no te pertenece" (no se filtra información de otros usuarios).
- **Paginación:** usá `page` + `limit` con el `total` devuelto para el scroll infinito.
- **`DELETE` devuelve 204 sin cuerpo** — no intentes parsear JSON en esos casos.

## Endpoints de referencia

| Método | Path | Body/Query | Respuesta |
|--------|------|-----------|-----------|
| POST | `/api/auth/register` | nombre, email, password, carrera, semestre | 201 |
| POST | `/api/auth/login` | email, password | 200 |
| GET | `/api/auth/me` | — | 200 |
| PUT | `/api/auth/profile` | parcial + fotoUrl | 200 |
| GET | `/api/notes` | search, courseName, page, limit | 200 |
| GET | `/api/notes/:id` | — | 200 |
| POST | `/api/notes` | title, content, courseName?, pages[] | 201 |
| PUT | `/api/notes/:id` | apunte completo | 200 |
| DELETE | `/api/notes/:id` | — | 204 |
| GET | `/api/events` | start, end, type, page, limit | 200 |
| POST | `/api/events` | title, description?, date, type | 201 |
| PUT | `/api/events/:id` | parcial | 200 |
| PATCH | `/api/events/:id/complete` | isCompleted | 200 |
| DELETE | `/api/events/:id` | — | 204 |
| GET | `/api/health` | — | 200 (healthcheck) |
