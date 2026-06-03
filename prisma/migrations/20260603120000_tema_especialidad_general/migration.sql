-- Especialidad "General": permite a curadores y revisores operar en cualquier tema.
INSERT INTO "TemaPrincipal" ("id", "nombre", "slug", "gcsUri", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'General',
  'general',
  'gs://biblioteca-legal/tema-principal/general/',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "TemaPrincipal" WHERE "slug" = 'general'
);
