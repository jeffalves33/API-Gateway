-- MIGRATION KANBAN ATUALIZADA

BEGIN;

CREATE SCHEMA IF NOT EXISTS kanban;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE kanban.card_status AS ENUM (
    'produce',
    'doing',
    'review',
    'approval',
    'changes',
    'approved',
    'scheduled',
    'published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kanban.week_code AS ENUM ('S1','S2','S3','S4');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kanban.role_key AS ENUM ('briefing','design','text','review','schedule');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kanban.comment_target AS ENUM ('comment','design','text','both');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kanban.actor_type AS ENUM ('user','client');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- EQUIPE (sem FK em lugar nenhum)
-- =========================
CREATE TABLE IF NOT EXISTS kanban.team_member (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user     integer NOT NULL, -- ERA uuid
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_user, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_team_member_user_name_ci
ON kanban.team_member (id_user, lower(name));

CREATE INDEX IF NOT EXISTS idx_team_member_user
ON kanban.team_member(id_user);

-- =========================
-- CLIENT PROFILE (1:1 com customer)
-- =========================
CREATE TABLE IF NOT EXISTS kanban.client_profile (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user            integer NOT NULL, -- ERA uuid

  -- 1 config extra para cada customer existente
  id_customer        integer NOT NULL REFERENCES public.customer(id_customer) ON DELETE CASCADE,
  UNIQUE (id_customer),

  -- Responsáveis internos (salva NOME direto, sem FK)
  role_briefing_name text NULL,
  role_design_name   text NULL,
  role_text_name     text NULL,
  role_review_name   text NULL,
  role_schedule_name text NULL,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_profile_user
ON kanban.client_profile(id_user);

CREATE INDEX IF NOT EXISTS idx_client_profile_customer
ON kanban.client_profile(id_customer);

-- múltiplos aprovadores do cliente (nome/email)
CREATE TABLE IF NOT EXISTS kanban.client_approver (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES kanban.client_profile(id) ON DELETE CASCADE,
  name              text NULL,
  email             text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_client_approver_email_ci
ON kanban.client_approver (client_profile_id, lower(email));

CREATE INDEX IF NOT EXISTS idx_client_approver_client
ON kanban.client_approver(client_profile_id);

-- =========================
-- CARDS
-- =========================
CREATE TABLE IF NOT EXISTS kanban.card (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user            integer NOT NULL, -- ERA uuid
  client_profile_id  uuid NOT NULL REFERENCES kanban.client_profile(id) ON DELETE CASCADE,

  title              text NOT NULL,
  week               kanban.week_code NOT NULL DEFAULT 'S2',
  status             kanban.card_status NOT NULL DEFAULT 'produce',

  due_date           date NULL,
  tags               text[] NOT NULL DEFAULT '{}',

  briefing           text NULL,
  description        text NULL,
  copy_text          text NULL,

  feedback_count     integer NOT NULL DEFAULT 0,
  change_targets     kanban.role_key[] NOT NULL DEFAULT '{}',

  -- responsáveis fixos designados na criação (NOME sem FK)
  owner_briefing_name text NULL,
  owner_design_name   text NULL,
  owner_text_name     text NULL,

  approved_at        timestamptz NULL,
  scheduled_at       timestamptz NULL,
  published_at       timestamptz NULL,

  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_user
ON kanban.card(id_user);

CREATE INDEX IF NOT EXISTS idx_card_client
ON kanban.card(client_profile_id);

CREATE INDEX IF NOT EXISTS idx_card_status
ON kanban.card(status);

CREATE INDEX IF NOT EXISTS idx_card_due
ON kanban.card(due_date);

-- Roles do card (design/text/review/schedule)
CREATE TABLE IF NOT EXISTS kanban.card_role (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        uuid NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  role           kanban.role_key NOT NULL,
  member_name    text NULL,
  estimate_hours numeric(6,2) NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT false,
  done_at        timestamptz NULL,
  UNIQUE (card_id, role)
);

CREATE INDEX IF NOT EXISTS idx_card_role_card
ON kanban.card_role(card_id);

-- Time tracking (runs)
CREATE TABLE IF NOT EXISTS kanban.card_role_run (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  role        kanban.role_key NOT NULL,
  status      kanban.card_status NOT NULL,
  member_name text NULL,
  started_at  timestamptz NOT NULL,
  ended_at    timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_role_run_card
ON kanban.card_role_run(card_id);

CREATE INDEX IF NOT EXISTS idx_role_run_member
ON kanban.card_role_run(lower(member_name));

-- Histórico
CREATE TABLE IF NOT EXISTS kanban.card_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     uuid NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  from_status kanban.card_status NULL,
  to_status   kanban.card_status NULL,
  role        kanban.role_key NULL,
  actor_type  kanban.actor_type NULL,
  actor_name  text NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_history_card
ON kanban.card_history(card_id);

CREATE INDEX IF NOT EXISTS idx_card_history_created
ON kanban.card_history(created_at);

-- Comentários (cliente)
CREATE TABLE IF NOT EXISTS kanban.card_comment (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  actor_type kanban.actor_type NOT NULL DEFAULT 'client',
  author     text NULL,
  target     kanban.comment_target NOT NULL DEFAULT 'comment',
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_comment_card
ON kanban.card_comment(card_id);

-- Assets (S3)
CREATE TABLE IF NOT EXISTS kanban.card_asset (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    uuid NOT NULL REFERENCES kanban.card(id) ON DELETE CASCADE,
  s3_key     text NOT NULL,
  url        text NULL,
  file_name  text NULL,
  mime_type  text NULL,
  size_bytes bigint NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_asset_card
ON kanban.card_asset(card_id);

-- =========================
-- METAS por cliente por mês
-- =========================
CREATE TABLE IF NOT EXISTS kanban.client_goal_month (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_user           integer NOT NULL, -- ERA uuid
  client_profile_id uuid NOT NULL REFERENCES kanban.client_profile(id) ON DELETE CASCADE,

  month             date NOT NULL, -- YYYY-MM-01
  posts_per_month   integer NOT NULL DEFAULT 0,
  ontime_pct_goal   integer NOT NULL DEFAULT 0,
  quality_goal      integer NOT NULL DEFAULT 0,
  max_rework        integer NOT NULL DEFAULT 0,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (id_user, client_profile_id, month)
);

CREATE INDEX IF NOT EXISTS idx_goal_user_month
ON kanban.client_goal_month(id_user, month);

CREATE INDEX IF NOT EXISTS idx_goal_client_month
ON kanban.client_goal_month(client_profile_id, month);

COMMIT;
