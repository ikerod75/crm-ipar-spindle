-- ============================================================
-- Migración: Número de orden manual (quitar auto-generado)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Quitar el default de la secuencia en order_number
-- A partir de ahora el usuario introduce el número manualmente.
-- Los valores existentes (OS-01001, OS-01002…) se conservan tal cual.
ALTER TABLE service_orders ALTER COLUMN order_number DROP DEFAULT;

-- Opcional: eliminar la secuencia si ya no se usa
-- DROP SEQUENCE IF EXISTS service_order_seq;
