# Guía de Autenticación para el Frontend (Implementación de Refresh Tokens)

Esta guía detalla los recientes cambios en la arquitectura de autenticación del backend para evitar cierres de sesión prematuros. Hemos migrado de un único token de 24 horas a un modelo dual: un **Access Token corto (15 min)** y un **Refresh Token largo (7 días)**.

Esta guía está adaptada a la arquitectura **Next.js** utilizando `cookies()` y `fetch` nativo desde el lado del servidor (Server Actions / Route Handlers).

---

## 1. Cambios en la Respuesta del Backend

Anteriormente, al iniciar sesión o cambiar la contraseña, el backend devolvía solo el `access_token`. Ahora devolverá adicionalmente un `refresh_token`.

### POST `/auth/login` y POST `/auth/change-password`
```json
{
  "access_token": "eyJhbGci... (expira en 15 minutos)",
  "refresh_token": "eyJhbGci... (expira en 7 días)",
  "mustChangePassword": false
}
```

**Requisito para Next.js (Route Handlers / Server Actions):**
El cliente (JS del navegador) NO debe ver estos tokens. Cuando Next.js reciba esta respuesta tras un login exitoso, debe guardar **AMBOS** tokens como cookies `HttpOnly`:
- `access_token` (Cookie HttpOnly, expira en 15 minutos)
- `refresh_token` (Cookie HttpOnly, expira en 7 días)

---

## 2. Nuevo Endpoint: POST `/auth/refresh`

Dado que el `access_token` caduca muy rápido (15 min), el servidor de Next.js deberá encargarse de renovarlo tras bambalinas usando este nuevo endpoint.

- **URL:** `POST /auth/refresh`
- **Body:**
```json
{
  "refreshToken": "el_refresh_token_obtenido_de_las_cookies"
}
```
- **Respuesta Exitosa (200 OK):** Devuelve un nuevo par de tokens.
```json
{
  "access_token": "nuevo_access_token",
  "refresh_token": "nuevo_refresh_token"
}
```

---

## 3. Implementación Sugerida en los Fetch Helpers (`src/lib/api-client.ts`)

Dado que todas las llamadas pasan por tus helpers `apiGet`, `apiPost`, etc., la lógica de "interceptar y reintentar" debe residir allí, del lado del servidor de Next.js.

El flujo a implementar en el helper base (ej. `apiFetch`) es el siguiente:

1. **Intento Inicial:** 
   Se lee la cookie `access_token` usando `cookies().get('access_token')` y se inyecta en el header `Authorization: Bearer ...`. Se realiza el `fetch` nativo al backend.

2. **Manejo de Errores (El Interceptor manual):**
   Si la respuesta del backend es **401 Unauthorized**:
   - Detén el flujo normal (no le devuelvas el error al cliente todavía).
   - Lee la cookie `refresh_token`. Si no existe, borra las cookies y redirige al login.
   - Haz un `fetch` a `POST /auth/refresh` pasando el `refresh_token`.

3. **Reintento o Cierre de Sesión:**
   - **Si el refresh es exitoso (200):** 
     La respuesta traerá nuevos tokens. Actualiza las cookies `access_token` y `refresh_token` de Next.js (`cookies().set(...)`), inyecta el nuevo `access_token` en el header original y **vuelve a hacer el `fetch` inicial**. Si este tiene éxito, el usuario no notará que nada pasó.
   - **Si el refresh falla (ej. 401 porque caducó a los 7 días o fue revocado en la base de datos):** 
     Significa que la sesión realmente terminó. Debes ejecutar la lógica de "Cerrar sesión" en Next.js (eliminar las cookies `access_token` y `refresh_token`) y hacer un `redirect('/login')`.

### ⚠️ Aclaración importante sobre Códigos HTTP
Asegúrate de que la lógica de refresco se dispare **exclusivamente ante un código `401 Unauthorized`**. Si recibes un `403 Forbidden`, `400 Bad Request` o `422`, son errores regulares de reglas de negocio o falta de permisos para esa ruta en particular; no debes interpretar que el token expiró.
