# Guía de Autenticación para el Frontend (Implementación de Refresh Tokens)

Esta guía detalla los recientes cambios arquitectónicos en la autenticación del backend para resolver el problema de las sesiones que expiraban prematuramente. Se ha migrado de un único token de 24 horas a un modelo dual de **Access Token corto (15 min)** y **Refresh Token largo (7 días)**.

---

## 1. Cambios en el Modelo de Datos Recibido

Anteriormente, al hacer Login o Cambio de Contraseña, solo recibías el `access_token` y un flag `mustChangePassword`. Ahora recibirás adicionalmente un `refresh_token`.

### POST `/auth/login` y POST `/auth/change-password`
```json
// Ejemplo de nueva respuesta exitosa
{
  "access_token": "eyJhbGci... (expira en 15 minutos)",
  "refresh_token": "eyJhbGci... (expira en 7 días)",
  "mustChangePassword": false
}
```

**Requisito para el Frontend:** 
Debes guardar **ambos** tokens.
- Recomendación: Guardar el `access_token` en memoria o en `localStorage`.
- Recomendación: Guardar el `refresh_token` en `localStorage` o `SecureStorage`.

---

## 2. Nuevo Endpoint: POST `/auth/refresh`

Puesto que el `access_token` ahora caduca en tan solo **15 minutos**, debes implementar un mecanismo automático (usualmente un *Axios Interceptor*) para refrescarlo sin que el usuario lo note.

- **URL:** `POST /auth/refresh`
- **Body:**
```json
{
  "refreshToken": "tu_refresh_token_guardado"
}
```
- **Respuesta Exitosa (200 OK):**
```json
{
  "access_token": "nuevo_access_token",
  "refresh_token": "nuevo_refresh_token"
}
```
*Recuerda reemplazar los tokens antiguos en tu almacenamiento local por estos nuevos.*

- **Respuesta Fallida (401 Unauthorized):**
Esto ocurrirá si el Refresh Token caducó (pasaron 7 días) o si **fue revocado por el servidor** (el usuario cerró sesión en otro dispositivo o cambió su contraseña). En este caso, **debes limpiar todo el almacenamiento local y redirigir al usuario a la pantalla de Login**.

---

## 3. Guía para implementar Axios Interceptors (Recomendado)

Para lograr una experiencia fluida, configura tu cliente HTTP (ej. Axios o Fetch) de la siguiente manera:

1. **Petición Saliente:** Adjunta siempre el `access_token` en el header `Authorization: Bearer <token>`.
2. **Petición Entrante (Intercepción de Errores):**
   - Si la petición falla con un código `401 Unauthorized`, **NO** envíes inmediatamente al usuario al Login.
   - Pausa la petición original.
   - Haz una petición a `POST /auth/refresh` enviando tu `refresh_token`.
   - **¿El refresh fue exitoso?** Guarda los nuevos tokens en el almacenamiento, actualiza el header `Authorization` de la petición original pausada y reinténtala. El usuario no notará nada.
   - **¿El refresh falló (401)?** Ahora sí, el Refresh Token murió o fue revocado. Limpia tu Storage y expulsa al usuario al Login.

### ⚠️ Aclaración importante sobre Códigos HTTP
Asegúrate de que tu Frontend solo active el flujo de refresh (y potencial cierre de sesión) **exclusivamente con errores `401 Unauthorized`**. 
No interceptes errores `403 Forbidden` (falta de permisos), `400 Bad Request` ni `422` como motivos de cierre de sesión, ya que son errores comunes de la aplicación y no indican que el token haya caducado.
