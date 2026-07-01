# **Despliegue GCP: Biblioteca Legal Backend 29/06/2026**

# 

El backend de la aplicación ha sido desplegado exitosamente en **Google Cloud Platform (GCP)** utilizando la arquitectura Serverless proporcionada por **Cloud Run**. A continuación se detalla toda la información relevante de la infraestructura y cómo interactuar con ella.

## **URLs del Servicio**

**TIP**

**URL Base de la API:** https://biblioteca-legal-backend-693924722323.us-central1.run.app

**Swagger UI (Documentación de Endpoints):** https://biblioteca-legal-backend-693924722323.us-central1.run.app/api/docs# *(Asumiendo que el prefijo del swagger configurado sea `/api`)*

## **Arquitectura de Infraestructura**

1. **Google Cloud Run (Compute):**
    - El contenedor Node.js / NestJS se ejecuta de forma completamente administrada y escala a cero automáticamente si no hay tráfico (lo cual optimiza costos).
    - Configuración: `512MB RAM`, `1 vCPU`, `Min instances: 1` (para reducir cold starts), `Max instances: 10`.
    - Se habilitó el acceso público sin autenticación IAM (`-allow-unauthenticated`), ya que el backend maneja su propia autenticación mediante JWT.
2. **Artifact Registry (Almacenamiento de Contenedores):**
    - Las imágenes de Docker generadas se guardan en el repositorio `backend-repo` en la región `us-central1`.
3. **Secret Manager (Seguridad de Variables):**
    - Toda variable sensible (como credenciales de DB o Cloudinary) no fue puesta en texto plano. Se guardaron en **Secret Manager** y Cloud Run las consume de forma segura inyectándolas en tiempo de ejecución.
4. **Service Account y Permisos (Identity & Access):**
    - Se creó una cuenta de servicio dedicada: `run-sa@agente-manual-contrataciones.iam.gserviceaccount.com`.
    - **Permisos Otorgados:**
        - `roles/storage.objectAdmin`: Permite a la app crear y eliminar archivos en el bucket de Cloud Storage `biblioteca-legal` (sin necesidad del archivo local `credentials.json`).
        - `roles/secretmanager.secretAccessor`: Permite a la app acceder dinámicamente a las credenciales en Secret Manager.

## **Cambios en el Código Realizados**

**NOTE**

Se modificó el archivo `src/storage/storage.service.ts` para que la variable `GCP_KEY_FILE_PATH` **sea opcional**. En el entorno de producción (Cloud Run), el SDK de Google utiliza ahora **Application Default Credentials (ADC)** de manera nativa. Solo requerirás el archivo `credentials.json` cuando ejecutes el backend en tu entorno local.

## **Referencia Rápida para Futuros Despliegues**

Si en el futuro realizas cambios en el código de tu repositorio local y necesitas **actualizar** la versión que está en la nube, debes ejecutar los siguientes comandos desde tu consola (`powershell`):

**Paso 1: Construir y subir la imagen (Cloud Build)**

```
powershell

gcloud builds submit--tag us-central1-docker.pkg.dev/agente-manual-contrataciones/backend-repo/biblioteca-legal-backend:latest
```

**Paso 2: Desplegar la nueva revisión (Cloud Run)**

```
powershell

gcloud run deploy biblioteca-legal-backend`
--image="us-central1-docker.pkg.dev/agente-manual-contrataciones/backend-repo/biblioteca-legal-backend:latest"`
--region="us-central1"
```

*(Los secretos y la cuenta de servicio ya están enlazados, así que no necesitas volver a pasar todas las banderas del comando inicial, Google Cloud Run recordará la configuración).*

## **Comprobación (Health Check)**

Puedes visitar la URL del Swagger de la aplicación o hacer una petición GET a un endpoint público para verificar que los datos se conectan correctamente a la base de datos alojada en **Render** y que el almacenamiento de documentos apunta al bucket `biblioteca-legal`.