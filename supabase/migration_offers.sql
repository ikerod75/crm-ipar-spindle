-- ============================================================
-- MIGRACIÓN: Sistema de ofertas
-- INSTRUCCIONES:
--   1. Abre Supabase → SQL Editor
--   2. Pega TODO este contenido y pulsa "Run"
--   3. Luego ve a Storage → New bucket → nombre: "offers"
--      desmarca "Public bucket" (debe ser privado)
-- ============================================================


-- ── PASO 1: Tabla offers ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID        NOT NULL,
  company_id   UUID        NOT NULL REFERENCES companies(id)        ON DELETE CASCADE,
  order_id     UUID                    REFERENCES service_orders(id) ON DELETE CASCADE,
  offer_number TEXT        NOT NULL,
  offer_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12, 2),
  pdf_path     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID                    REFERENCES profiles(id)       ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS offers_company_id_idx ON offers(company_id);
CREATE INDEX IF NOT EXISTS offers_org_id_idx     ON offers(org_id);
CREATE INDEX IF NOT EXISTS offers_order_id_idx   ON offers(order_id);


-- ── PASO 2: Row Level Security ────────────────────────────────────────────────

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

-- Elimina políticas previas si existen (para poder re-ejecutar sin errores)
DROP POLICY IF EXISTS "offers_select" ON offers;
DROP POLICY IF EXISTS "offers_insert" ON offers;
DROP POLICY IF EXISTS "offers_update" ON offers;

CREATE POLICY "offers_select"
  ON offers FOR SELECT
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "offers_insert"
  ON offers FOR INSERT
  WITH CHECK (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "offers_update"
  ON offers FOR UPDATE
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));


-- ── PASO 3: Storage bucket "offers" ──────────────────────────────────────────
-- Crea el bucket si no existe. Si falla, créalo manualmente en
-- Supabase Dashboard → Storage → New bucket → "offers" (privado).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('offers', 'offers', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
DROP POLICY IF EXISTS "offers_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "offers_storage_select"  ON storage.objects;

CREATE POLICY "offers_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'offers' AND auth.role() = 'authenticated');

CREATE POLICY "offers_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'offers' AND auth.role() = 'authenticated');


-- ── VERIFICACIÓN ──────────────────────────────────────────────────────────────
-- Ejecuta esta query para confirmar que todo existe:
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'offers';
-- SELECT id, name, public FROM storage.buckets WHERE id = 'offers';
