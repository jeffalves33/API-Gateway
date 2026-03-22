BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS kanban;

-- =========================================================
-- LIMPEZA DO LEGADO QUE NÃO SERÁ MAIS USADO
-- =========================================================
DROP TABLE IF EXISTS kanban.client_goal_month CASCADE;
DROP TABLE IF EXISTS kanban.card_asset CASCADE;
DROP TABLE IF EXISTS kanban.card_history CASCADE;
DROP TABLE IF EXISTS kanban.card_role_run CASCADE;
DROP TABLE IF EXISTS kanban.card_role CASCADE;
DROP TABLE IF EXISTS kanban.team_member CASCADE;
DROP TABLE IF EXISTS kanban.card_label CASCADE;
DROP TABLE IF EXISTS kanban.card_assignee CASCADE;
DROP TABLE IF EXISTS kanban.card_comment CASCADE;
DROP TABLE IF EXISTS kanban.card CASCADE;
DROP TABLE IF EXISTS kanban.label CASCADE;
DROP TABLE IF EXISTS kanban.board_column CASCADE;
DROP TABLE IF EXISTS kanban.board CASCADE;
DROP TABLE IF EXISTS kanban.client_approver CASCADE;

-- client_profile continua sendo a relação cliente da agência -> kanban
ALTER TABLE IF EXISTS kanban.client_profile
  ADD COLUMN IF NOT EXISTS external_token TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'kanban'
      AND indexname = 'ux_kanban_client_profile_external_token'
  ) THEN
    CREATE UNIQUE INDEX ux_kanban_client_profile_external_token
      ON kanban.client_profile (external_token)
      WHERE external_token IS NOT NULL;
  END IF;
END $$;

-- =========================================================
-- QUADRO E COLUNAS (AGORA POR ACCOUNT)
-- =========================================================
CREATE TABLE kanban.board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_account BIGINT NOT NULL REFERENCES accounts(id_account) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Quadro principal',
  is_default BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_kanban_board_default_account
  ON kanban.board (id_account)
  WHERE is_default = TRUE;

CREATE TABLE kanban.board_column (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban.board(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#8592a3',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_kanban_board_column_position UNIQUE (board_id, position)
);

CREATE INDEX idx_kanban_board_column_board ON kanban.board_column(board_id, position);

-- =========================================================
-- ETIQUETAS (AGORA POR ACCOUNT)
-- =========================================================
CREATE TABLE kanban.label (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_account BIGINT NOT NULL REFERENCES accounts(id_account) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#696cff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_kanban_label_account_name_ci
  ON kanban.label (id_account, lower(name));

-- =========================================================
-- CARDS SIMPLES
-- =========================================================
CREATE TABLE kanban.card (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES kanban.board(id) ON DELETE CASCADE,
  id_account BIGINT NOT NULL REFERENCES accounts(id_account) ON DELETE CASCADE,
  id_customer INTEGER NULL REFERENCES public.customer(id_customer) ON DELETE SET NULL,
  title TEXT NOT NULL,
  week TEXT NOT NULL DEFAULT 'S1',
  due_date DATE NULL,
  copy_text TEXT NULL,
  column_id UUID NULL REFERENCES kanban.board_column(id) ON DELETE SET NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_by_user_id BIGINT NULL REFERENCES public."user"(id_user) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_kanban_card_week CHECK (week IN ('S1','S2','S3','S4'))
);

CREATE INDEX idx_kanban_card_board_column ON kanban.card(board_id, column_id, position);
CREATE INDEX idx_kanban_card_customer ON kanban.card(id_customer);
CREATE INDEX idx_kanban_card_account ON kanban.card(id_account);

CREATE TABLE kanban.card_label (
  card_id UUID NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES kanban.label(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE kanban.card_assignee (
  card_id UUID NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  assignee_user_id BIGINT NOT NULL REFERENCES public."user"(id_user) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, assignee_user_id)
);

CREATE TABLE kanban.card_comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL DEFAULT 'client',
  author TEXT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_kanban_comment_actor CHECK (actor_type IN ('user','client'))
);

CREATE INDEX idx_kanban_card_comment_card ON kanban.card_comment(card_id, created_at);


-- =========================================================
-- Artes
-- =========================================================

CREATE TABLE IF NOT EXISTS kanban.card_art (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kanban_card_art_card
  ON kanban.card_art (card_id, created_at);


-- =========================================================
-- SEED INICIAL
-- 1 quadro por account já existente
-- =========================================================
INSERT INTO kanban.board (id_account, name, is_default)
SELECT a.id_account, 'Quadro principal', TRUE
FROM accounts a;

INSERT INTO kanban.board_column (board_id, name, position, color)
SELECT b.id, 'A fazer', 1, '#696cff' FROM kanban.board b;

INSERT INTO kanban.board_column (board_id, name, position, color)
SELECT b.id, 'Em andamento', 2, '#03c3ec' FROM kanban.board b;

INSERT INTO kanban.board_column (board_id, name, position, color)
SELECT b.id, 'Em revisão', 3, '#ffab00' FROM kanban.board b;

INSERT INTO kanban.board_column (board_id, name, position, color)
SELECT b.id, 'Concluído', 4, '#71dd37' FROM kanban.board b;

COMMIT;
