-- Ejecutar en producción ANTES de migrate deploy (solo lectura / diagnóstico)
SELECT COUNT(*) AS total_documentos FROM "Documento";
SELECT COUNT(*) AS total_usuarios FROM "User";
SELECT DISTINCT "estado" FROM "Documento";
