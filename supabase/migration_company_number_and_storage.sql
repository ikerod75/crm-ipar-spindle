-- ============================================================
-- Migración: company_number autonumérico + Storage bucket
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Añadir company_number a companies
--    Los registros existentes recibirán números secuenciales automáticamente.
CREATE SEQUENCE IF NOT EXISTS companies_number_seq START 1;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS company_number INTEGER DEFAULT nextval('companies_number_seq');

-- Asignar números a registros existentes que tengan NULL
UPDATE companies
  SET company_number = nextval('companies_number_seq')
  WHERE company_number IS NULL;

-- Hacer obligatorio a partir de ahora
ALTER TABLE companies
  ALTER COLUMN company_number SET NOT NULL;

-- Índice único para búsqueda rápida por número
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_number ON companies(company_number);

-- Asociar la secuencia a la columna (para que se auto-gestione)
ALTER SEQUENCE companies_number_seq OWNED BY companies.company_number;


-- ============================================================
-- 2. Supabase Storage — bucket "company-files"
-- ============================================================

-- Crear bucket privado (public = false)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-files',
  'company-files',
  false,
  52428800,   -- 50 MB por archivo
  null        -- cualquier tipo de archivo
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para storage.objects
-- (Las políticas de storage se activan automáticamente para buckets privados)

-- Leer archivos: usuarios autenticados de la organización
CREATE POLICY "company_files_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'company-files');

-- Subir archivos: usuarios autenticados
CREATE POLICY "company_files_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-files');

-- Eliminar archivos: usuarios autenticados
CREATE POLICY "company_files_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company-files');
