-- =====================================================================
-- Inferra Labs QR Interview System
-- Run after the existing applications migration (public.applications must exist).
-- Safe to re-run: uses "if not exists" and "drop policy if exists".
-- =====================================================================

-- 0. Duplicate-application guard used by submit-application (error 23505).
-- If this fails, first find duplicates: select lower(email), count(*) from applications group by 1 having count(*) > 1;
create unique index if not exists applications_email_lower_key
  on public.applications (lower(email));

-- 1. Roles and panels ---------------------------------------------------
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null check (role in ('admin', 'staff', 'judge')),
  created_at timestamptz not null default now()
);

create table if not exists public.interview_panels (
  id         uuid primary key default gen_random_uuid(),
  panel_name text not null unique,
  room_name  text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.panel_judges (
  id            uuid primary key default gen_random_uuid(),
  panel_id      uuid not null references public.interview_panels (id) on delete cascade,
  judge_user_id uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (panel_id, judge_user_id),
  unique (judge_user_id)                       -- a judge belongs to one panel
);

-- Enforce exactly up to three judges per panel
create or replace function public.enforce_max_three_judges()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.panel_judges where panel_id = new.panel_id) >= 3 then
    raise exception 'A panel can have at most 3 judges';
  end if;
  return new;
end $$;

drop trigger if exists panel_judges_max_three on public.panel_judges;
create trigger panel_judges_max_three
  before insert on public.panel_judges
  for each row execute function public.enforce_max_three_judges();

create table if not exists public.staff_panel_access (
  user_id    uuid not null references auth.users (id) on delete cascade,
  panel_id   uuid not null references public.interview_panels (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, panel_id)
);

-- 2. Queue, QR tokens, sessions, evaluations, audit ----------------------
create table if not exists public.interview_queue (
  id           uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications (id) on delete cascade,
  panel_id     uuid references public.interview_panels (id) on delete set null,
  queue_number integer check (queue_number is null or queue_number between 1 and 999),
  status       text not null default 'waiting'
               check (status in ('waiting','called','checked_in','interviewing','completed','absent','cancelled')),
  scheduled_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists interview_queue_panel_idx on public.interview_queue (panel_id, queue_number);

-- Only the newest token is live. Old tokens are kept (revoked) for audit.
create table if not exists public.student_qr_tokens (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  token_hash     text not null unique,            -- SHA-256 of the raw token, never the token itself
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  used_at        timestamptz,
  created_at     timestamptz not null default now()
);
create unique index if not exists student_qr_one_live_token
  on public.student_qr_tokens (application_id) where revoked_at is null;

create table if not exists public.interview_sessions (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  panel_id       uuid not null references public.interview_panels (id) on delete cascade,
  status         text not null default 'active' check (status in ('active','completed','cancelled')),
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  checked_in_by  uuid references auth.users (id) on delete set null
);
-- One active interview per student and one active interview per panel
create unique index if not exists one_active_session_per_student
  on public.interview_sessions (application_id) where status = 'active';
create unique index if not exists one_active_session_per_panel
  on public.interview_sessions (panel_id) where status = 'active';

create table if not exists public.judge_evaluations (
  id                       uuid primary key default gen_random_uuid(),
  session_id               uuid not null references public.interview_sessions (id) on delete cascade,
  judge_user_id            uuid not null references auth.users (id) on delete cascade,
  technical_score          integer not null check (technical_score between 0 and 10),
  communication_score      integer not null check (communication_score between 0 and 10),
  problem_solving_score    integer not null check (problem_solving_score between 0 and 10),
  feedback                 text check (char_length(feedback) <= 2000),
  submitted_at             timestamptz not null default now(),
  unique (session_id, judge_user_id)           -- one judge cannot overwrite another judge
);

create table if not exists public.interview_audit_logs (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references auth.users (id) on delete set null,
  application_id uuid,
  panel_id       uuid,
  action         text not null,
  metadata       jsonb not null default '{}'::jsonb,   -- never put tokens or PII here
  created_at     timestamptz not null default now()
);

create table if not exists public.scan_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists scan_attempts_user_time on public.scan_attempts (user_id, created_at);

-- 3. Row Level Security -------------------------------------------------
-- Every new table has RLS on. Browsers can only read their OWN role,
-- staff/judge assignment and the panel they belong to. Everything else
-- (tokens, sessions, evaluations, audit) is reached only through Edge
-- Functions that use the service role.
alter table public.user_roles           enable row level security;
alter table public.interview_panels     enable row level security;
alter table public.panel_judges         enable row level security;
alter table public.staff_panel_access   enable row level security;
alter table public.interview_queue      enable row level security;
alter table public.student_qr_tokens    enable row level security;
alter table public.interview_sessions   enable row level security;
alter table public.judge_evaluations    enable row level security;
alter table public.interview_audit_logs enable row level security;
alter table public.scan_attempts        enable row level security;

drop policy if exists "own role" on public.user_roles;
create policy "own role" on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own staff access" on public.staff_panel_access;
create policy "own staff access" on public.staff_panel_access for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "own judge assignment" on public.panel_judges;
create policy "own judge assignment" on public.panel_judges for select to authenticated
  using (judge_user_id = (select auth.uid()));

drop policy if exists "assigned panels" on public.interview_panels;
create policy "assigned panels" on public.interview_panels for select to authenticated
  using (
    exists (select 1 from public.staff_panel_access s
            where s.panel_id = public.interview_panels.id and s.user_id = (select auth.uid()))
    or exists (select 1 from public.panel_judges j
               where j.panel_id = public.interview_panels.id and j.judge_user_id = (select auth.uid()))
  );

-- Realtime: a judge may only listen to the private channel of their own panel.
-- Topic format used by the app: panel:<panel uuid>
drop policy if exists "judges receive own panel broadcasts" on realtime.messages;
create policy "judges receive own panel broadcasts" on realtime.messages for select to authenticated
  using (
    extension = 'broadcast'
    and exists (
      select 1
      from public.panel_judges j
      join public.interview_panels p on p.id = j.panel_id
      where j.judge_user_id = (select auth.uid())
        and realtime.topic() = 'panel:' || p.id::text
    )
  );

-- 4. Atomic check-in ----------------------------------------------------
-- One transaction: lock the token/queue row, validate, create the session.
-- Two simultaneous scans of the same pass serialise on the row lock, so
-- only the first creates a session. Callable by the service role only.
create or replace function public.perform_check_in(
  p_token_hash     text,      -- null for a manual check-in
  p_application_id uuid,      -- used only for manual check-in
  p_staff_id       uuid,
  p_room_panel_id  uuid,
  p_manual_reason  text       -- required for manual check-in
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tok      public.student_qr_tokens%rowtype;
  q        public.interview_queue%rowtype;
  p        public.interview_panels%rowtype;
  existing public.interview_sessions%rowtype;
  app_id   uuid;
  new_session uuid;
begin
  if p_token_hash is not null then
    select * into tok from public.student_qr_tokens where token_hash = p_token_hash for update;
    if not found then
      return jsonb_build_object('result', 'invalid');
    end if;
    if tok.revoked_at is not null then
      return jsonb_build_object('result', 'revoked');
    end if;
    if tok.expires_at <= now() then
      return jsonb_build_object('result', 'expired');
    end if;
    app_id := tok.application_id;
  else
    if p_manual_reason is null or length(trim(p_manual_reason)) < 3 then
      return jsonb_build_object('result', 'reason_required');
    end if;
    app_id := p_application_id;
  end if;

  -- Already checked in? (covers repeated scans, active or finished sessions)
  select * into existing from public.interview_sessions
    where application_id = app_id order by started_at desc limit 1;
  if found then
    return jsonb_build_object('result', 'already_checked_in',
      'application_id', app_id, 'session_id', existing.id, 'checked_in_at', existing.started_at);
  end if;

  select * into q from public.interview_queue where application_id = app_id for update;
  if not found or q.panel_id is null or q.status = 'cancelled' then
    return jsonb_build_object('result', 'not_assigned', 'application_id', app_id);
  end if;

  select * into p from public.interview_panels where id = q.panel_id;
  if p_room_panel_id <> q.panel_id then
    return jsonb_build_object('result', 'wrong_room', 'application_id', app_id,
      'assigned_panel_name', p.panel_name, 'assigned_room_name', p.room_name);
  end if;

  if exists (select 1 from public.interview_sessions
             where panel_id = q.panel_id and status = 'active') then
    return jsonb_build_object('result', 'panel_busy', 'application_id', app_id,
      'panel_name', p.panel_name);
  end if;

  insert into public.interview_sessions (application_id, panel_id, status, checked_in_by)
  values (app_id, q.panel_id, 'active', p_staff_id)
  returning id into new_session;

  update public.interview_queue set status = 'interviewing' where id = q.id;

  if p_token_hash is not null then
    update public.student_qr_tokens set used_at = now() where id = tok.id;
  end if;

  insert into public.interview_audit_logs (actor_user_id, application_id, panel_id, action, metadata)
  values (p_staff_id, app_id, q.panel_id,
          case when p_token_hash is null then 'manual_check_in' else 'check_in' end,
          jsonb_build_object('session_id', new_session, 'reason', p_manual_reason));

  return jsonb_build_object('result', 'checked_in', 'application_id', app_id,
    'session_id', new_session, 'panel_id', q.panel_id,
    'panel_name', p.panel_name, 'room_name', p.room_name);

exception
  when unique_violation then
    -- a concurrent request won the race; nothing from this call was kept
    return jsonb_build_object('result', 'conflict');
end $$;

revoke all on function public.perform_check_in(text, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.perform_check_in(text, uuid, uuid, uuid, text) to service_role;

-- 5. Seed templates (run manually after creating accounts) ---------------
-- insert into public.interview_panels (panel_name, room_name)
--   values ('Panel 1', 'Room 1'), ('Panel 2', 'Room 2')
--   on conflict (panel_name) do nothing;
--
-- Staff member for Room 1 (user id from Authentication -> Users):
--   insert into public.user_roles (user_id, role) values ('<STAFF_UUID>', 'staff');
--   insert into public.staff_panel_access (user_id, panel_id)
--     select '<STAFF_UUID>', id from public.interview_panels where panel_name = 'Panel 1';
--
-- Judge for Panel 1 (max three per panel):
--   insert into public.user_roles (user_id, role) values ('<JUDGE_UUID>', 'judge');
--   insert into public.panel_judges (panel_id, judge_user_id)
--     select id, '<JUDGE_UUID>' from public.interview_panels where panel_name = 'Panel 1';
--
-- Admin:
--   insert into public.user_roles (user_id, role) values ('<ADMIN_UUID>', 'admin');
--
-- Assign a student (queue number 1, Panel 1):
--   insert into public.interview_queue (application_id, panel_id, queue_number)
--     select '<APPLICATION_UUID>', id, 1 from public.interview_panels where panel_name = 'Panel 1';
