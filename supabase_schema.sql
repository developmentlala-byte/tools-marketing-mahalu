-- Suggested production schema (Supabase/PostgreSQL)

create table if not exists content_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,
  objective text,
  treatment_focus text,
  campaign text,
  notes text,
  status text not null default 'draft',
  submitted_at timestamptz,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists content_plan_items (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references content_weeks(id) on delete cascade,
  plan_date date not null,
  scheduled_time time not null,
  platform text not null,
  format text not null,
  pillar text,
  winning_framing text,
  hook text,
  idea text,
  treatment text,
  asset_path text,
  approval_status text not null default 'draft',
  ceo_comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists daily_execution (
  id uuid primary key default gen_random_uuid(),
  execution_date date not null,
  scheduled_time time not null,
  platform text not null,
  format text not null,
  slot_type text not null,
  actual_published_at timestamptz,
  published_url text,
  evidence_path text,
  status text not null default 'planned',
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists content_approvals (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references content_plan_items(id) on delete cascade,
  decision text not null,
  comment text,
  decided_by uuid,
  decided_at timestamptz default now()
);

create table if not exists work_uploads (
  id uuid primary key default gen_random_uuid(),
  work_type text not null,
  platform text,
  work_date date,
  slot_label text,
  note text,
  file_path text not null,
  uploaded_by uuid,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz default now()
);
