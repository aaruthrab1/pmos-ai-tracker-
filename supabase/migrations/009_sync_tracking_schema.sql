-- 009: Sync tracking tables with frontend schema (sleep_logs bedtime, mood_logs, metabolic_logs, etc.)
-- Safe to re-run. Run in Supabase SQL Editor, then NOTIFY reloads PostgREST schema cache.

-- ─── ENUMS (idempotent) ──────────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE flow_intensity AS ENUM ('spotting', 'light', 'medium', 'heavy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE weight_unit AS ENUM ('kg', 'lb');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'conflict');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── SLEEP_LOGS ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS logged_date DATE;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS logged_at DATE;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(3,1);
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS hours NUMERIC(3,1);
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS sleep_quality INTEGER;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS quality INTEGER;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS bedtime TIME;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS wake_time TIME;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS interruptions INTEGER DEFAULT 0;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'synced';
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill legacy → canonical
UPDATE sleep_logs SET logged_date = logged_at WHERE logged_date IS NULL AND logged_at IS NOT NULL;
UPDATE sleep_logs SET logged_date = created_at::date WHERE logged_date IS NULL;
UPDATE sleep_logs SET sleep_hours = hours WHERE sleep_hours IS NULL AND hours IS NOT NULL;
UPDATE sleep_logs SET sleep_quality = quality WHERE sleep_quality IS NULL AND quality IS NOT NULL;

ALTER TABLE sleep_logs ALTER COLUMN logged_date SET DEFAULT CURRENT_DATE;

DO $$ BEGIN
  ALTER TABLE sleep_logs ADD CONSTRAINT sleep_logs_user_logged_date_key UNIQUE (user_id, logged_date);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── PERIOD_LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS period_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS period_end DATE;
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS flow_intensity flow_intensity DEFAULT 'medium';
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS pain_level INTEGER;
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS cycle_length INTEGER;
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS symptoms TEXT[] DEFAULT '{}';
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'synced';
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE period_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ─── WEIGHT_LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS logged_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS unit weight_unit DEFAULT 'kg';
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS body_fat_percent NUMERIC(4,1);
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS sync_status sync_status DEFAULT 'synced';
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE weight_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE weight_logs SET logged_date = created_at::date WHERE logged_date IS NULL;

-- ─── MOOD_LOGS (create if missing; symptom_logs may exist separately) ────────

CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood mood_type NOT NULL DEFAULT 'neutral',
  energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 10)),
  anxiety_level INTEGER CHECK (anxiety_level IS NULL OR (anxiety_level >= 1 AND anxiety_level <= 10)),
  triggers TEXT[] DEFAULT '{}',
  notes TEXT,
  client_id TEXT,
  sync_status sync_status DEFAULT 'synced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, logged_date)
);

-- Migrate symptom_logs → mood_logs when mood_logs is empty (symptom_logs uses created_at for date)
INSERT INTO mood_logs (user_id, logged_date, mood, notes, created_at)
SELECT s.user_id,
       s.created_at::date,
       COALESCE(s.mood::mood_type, 'neutral'),
       s.notes,
       s.created_at
FROM symptom_logs s
WHERE NOT EXISTS (
  SELECT 1 FROM mood_logs m
  WHERE m.user_id = s.user_id AND m.logged_date = s.created_at::date
)
ON CONFLICT DO NOTHING;

-- ─── METABOLIC_LOGS ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metabolic_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  energy_level INTEGER CHECK (energy_level IS NULL OR (energy_level >= 1 AND energy_level <= 5)),
  hunger_level INTEGER CHECK (hunger_level IS NULL OR (hunger_level >= 1 AND hunger_level <= 5)),
  sugar_cravings BOOLEAN DEFAULT FALSE,
  brain_fog BOOLEAN DEFAULT FALSE,
  notes TEXT,
  client_id TEXT,
  sync_status sync_status DEFAULT 'synced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_metabolic_logs_user ON metabolic_logs(user_id, logged_date DESC);

ALTER TABLE metabolic_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY metabolic_logs_select_own ON metabolic_logs FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metabolic_logs_insert_own ON metabolic_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metabolic_logs_update_own ON metabolic_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY metabolic_logs_delete_own ON metabolic_logs FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── RLS for sleep/period/weight/mood if not already enabled ────────────────

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE period_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY sleep_logs_select_own ON sleep_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY sleep_logs_insert_own ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY sleep_logs_update_own ON sleep_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY mood_logs_select_own ON mood_logs FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY mood_logs_insert_own ON mood_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY mood_logs_update_own ON mood_logs FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
