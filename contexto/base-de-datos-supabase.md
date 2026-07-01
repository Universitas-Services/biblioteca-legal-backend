# Base de Datos en Supabase

Este documento describe la configuración actual de la base de datos de PostgreSQL alojada en **Supabase**, cómo se conecta la aplicación (backend y Prisma) y detalles operativos importantes para el desarrollo y despliegue.

## 1. Conexión y Poolers (Supabase)

Supabase implementa PgBouncer de manera nativa, lo cual significa que existen dos formas (modos) de conectarse a la base de datos:

* **Modo Transaccional (Transaction Mode - Puerto 6543):**
  - **Uso:** Es el recomendado para el tráfico de la aplicación y operaciones regulares (consultas de Prisma Client).
  - **Variable:** `DATABASE_URL`
  - **URL:** `postgresql://[USER]:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true`
  - **Ventaja:** Maneja un alto volumen de conexiones cortas de manera muy eficiente, ideal para entornos Serverless o Cloud Run.

* **Modo Sesión (Session Mode - Puerto 5432):**
  - **Uso:** Es requerido para comandos CLI que necesitan mantener un estado en la conexión, específicamente **las migraciones de Prisma** (`prisma migrate dev` y `prisma migrate deploy`).
  - **Variable:** `DIRECT_URL`
  - **URL:** `postgresql://[USER]:[PASSWORD]@[HOST]:5432/postgres`

## 2. Configuración en Prisma (`schema.prisma`)

Prisma está configurado para aprovechar ambos modos de conexión automáticamente. En el archivo `schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

* El código de la aplicación usa internamente `url` (pooler transaccional).
* Cuando ejecutas `npx prisma migrate ...`, Prisma usa internamente `directUrl` (pooler de sesión).

## 3. Manejo de Secretos en GCP (Cloud Run)

En Google Cloud Secret Manager (Proyecto: `agente-manual-contrataciones`), los secretos se configuraron de la siguiente manera:

1. **`DATABASE_URL`**: Almacena la conexión por el puerto `6543`.
2. **`DIRECT_URL`**: Almacena la conexión por el puerto `5432`.

Cloud Run inyecta ambos secretos como variables de entorno al contenedor. Esto permite que el `Dockerfile` pueda ejecutar las migraciones en el arranque (`CMD npx prisma migrate deploy && npm run start:prod`) utilizando la conexión directa, y luego levante el servidor usando el pooler.

> **Importante:** Al actualizar secretos en GCP por consola/terminal, asegúrate siempre de que las URL no contengan espacios en blanco o saltos de línea al final, ya que Prisma fallaría al parsear el puerto y Cloud Run no arrancaría.

## 4. Estructura de Datos y Esquemas

La aplicación se ejecuta íntegramente sobre el esquema **`public`** de PostgreSQL.
Aunque Supabase cuenta con herramientas propias para autenticación y almacenamiento (esquemas `auth` y `storage`), **este proyecto no los utiliza**; en su lugar gestiona:
- **Autenticación:** Propia, mediante JWT (Tokens) en el backend y la tabla `User`.
- **Almacenamiento:** Archivos guardados en Google Cloud Storage.

### Tablas Principales
* `User`: Maneja usuarios, roles y autenticación.
* Jerarquía de Documentos: `TemaPrincipal` ➔ `SubcarpetaNorma` ➔ `CarpetaInterna` ➔ `Documento`.
* Metadatos y Matrices: `Metadata`, `MatrizA`, `MatrizB` (vinculadas a los Documentos).
* Otros: `NotaInterna`, `HistorialConsulta`, `Favorito`, `Notificacion`.

Las migraciones están registradas de forma estándar en la tabla `_prisma_migrations`, la cual almacena el historial completo de las 13 migraciones existentes.

## 5. Resumen de Migración desde Render
La base de datos original residía en Render. La migración se realizó el 30 de Junio de 2026 empleando:
- `pg_dump` con formato `custom` para extraer datos de Render de manera íntegra.
- `pg_restore` apuntando al `DIRECT_URL` de Supabase, preservando las 14 tablas sin pérdidas de datos.
- Cambio de variables de entorno locales (`.env`) y productivas (Secret Manager).
