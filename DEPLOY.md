# Despliegue en Render (producción)

## Variables de entorno (Web Service)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL **interna** de Render Postgres |
| `JWT_SECRET` | Secreto estable (no cambiar sin avisar: invalida sesiones) |
| `GCP_PROJECT_ID` | Proyecto GCP |
| `GCP_KEY_FILE_PATH` | Ruta al JSON de cuenta de servicio |
| `GCP_STORAGE_BUCKET_NAME` | Bucket de PDFs |

## Comandos en Render (Dashboard → Settings)

| Campo | Valor |
|-------|-------|
| **Build Command** | `npm ci && npx prisma generate && npm run build` |
| **Start Command** | `npm run start:prod` |
| **Release Command** | `npx prisma migrate deploy` |

El Release Command aplica solo migraciones pendientes; no borra datos ya migrados.

## Backup antes de migrar (obligatorio en producción)

1. Render Dashboard → tu base Postgres → **Backups** → crear snapshot manual.
2. Opcional: exportar con `pg_dump` usando la URL externa de Render.

## Migración manual (si no usas Release Command)

Con `DATABASE_URL` apuntando a producción (no commitear `.env`):

```powershell
npx prisma migrate status
npx prisma migrate deploy
```

Diagnóstico previo:

```powershell
Get-Content prisma/scripts/pre-migrate-prod-check.sql | npx prisma db execute --stdin --schema prisma/schema.prisma
```

## Despliegue de código

Push a la rama `dev` → GitHub Actions (lint, test, build) → Deploy Hook de Render.

## Post-deploy

- `GET /api/docs` en la URL del servicio
- Login y una petición autenticada
- `POST /auth/logout` (el token anterior debe dejar de funcionar)
- Usuarios deben **volver a iniciar sesión** tras el deploy (JWT con `tokenVersion`)

## Desarrollo local

```powershell
docker compose up -d
# DATABASE_URL local en .env
npx prisma migrate deploy
npm run start:dev
```
