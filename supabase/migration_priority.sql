-- ============================================================
-- Migración: añadir campo priority a la tabla companies
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS priority text
    CHECK (priority IN ('A', 'B', 'C', 'D'));

-- Índice para filtrar rápido por prioridad
CREATE INDEX IF NOT EXISTS idx_companies_priority ON companies(priority);
