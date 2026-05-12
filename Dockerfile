# Etapa de construcción
FROM node:18-alpine AS builder
WORKDIR /app

# Instalar OpenSSL necesario para Prisma en Alpine
RUN apk add --no-cache openssl

# Copiar dependencias y esquema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm install

# Generar el cliente de Prisma
RUN npx prisma generate

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# Etapa de producción
FROM node:18-alpine
WORKDIR /app

# Instalar OpenSSL necesario para Prisma en la imagen final
RUN apk add --no-cache openssl

# Copiar archivos compilados y módulos de la etapa anterior
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exponer el puerto
EXPOSE 3000

# Ejecutar migraciones de Prisma y luego iniciar la app
CMD npx prisma migrate deploy && npm run start:prod