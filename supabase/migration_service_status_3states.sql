-- ============================================================
-- Migración: Simplificar estados de órdenes de servicio
-- De: presupuesto | en_curso | finalizado | cancelado
-- A:  presupuesto | en_curso | finalizada
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Actualizar registros con estados legacy
UPDATE service_orders SET status = 'finalizada' WHERE status = 'finalizado';
UPDATE service_orders SET status = 'presupuesto' WHERE status = 'cancelado';

-- 2. Eliminar el CHECK constraint existente (si lo hay) y crear uno nuevo
--    Supabase nombra los constraints automáticamente; intenta los dos nombres más comunes:
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_check;
ALTER TABLE service_orders DROP CONSTRAINT IF EXISTS service_orders_status_fkey;

-- 3. Añadir el nuevo CHECK constraint con los 3 estados válidos
ALTER TABLE service_orders
  ADD CONSTRAINT service_orders_status_check
  CHECK (status IN ('presupuesto', 'en_curso', 'finalizada'));

-- 4. Actualizar el valor por defecto
ALTER TABLE service_orders ALTER COLUMN status SET DEFAULT 'presupuesto';
