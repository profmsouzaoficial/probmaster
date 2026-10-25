-- ==============================================================================
-- PROBMASTER · UNIVERSIDADE FEDERAL DE JUIZ DE FORA (UFJF)
-- ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (PostgreSQL + RLS + Triggers)
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá em 'SQL Editor' no menu lateral esquerdo
-- 3. Clique em 'New Query' (Nova Consulta)
-- 4. Cole TODO este arquivo e clique em 'RUN' (Executar)
-- ==============================================================================

-- 1. TABELA DE PERFIS DOS ESTUDANTES (PROFILES)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  matricula text not null unique,
  student_name text default 'Estudante UFJF',
  institution text default 'UFJF - Estatística',
  turma text default 'Estatística I - Turma A',
  semestre text default '2026.1',
  avatar_url text,
  level integer not null default 1,
  level_title text not null default 'Calouro Amostral',
  xp integer not null default 0,
  next_level_xp integer not null default 100,
  streak_days integer not null default 1,
  total_calculations_done integer not null default 0,
  challenges_solved_count integer not null default 0,
  accuracy_rate integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. TABELA DE MAESTRIA POR DISTRIBUIÇÃO (DISTRIBUTION_MASTERY)
create table if not exists public.distribution_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dist_id text not null,
  mastery integer not null default 0 check (mastery >= 0 and mastery <= 100),
  updated_at timestamptz not null default now(),
  unique(user_id, dist_id)
);

-- 3. TABELA DE HISTÓRICO DE TENTATIVAS DE DESAFIOS (CHALLENGE_HISTORY)
create table if not exists public.challenge_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  challenge_id text not null,
  challenge_title text not null,
  dist_id text not null,
  dist_name text not null,
  difficulty text not null,
  user_answer numeric not null,
  expected_answer numeric not null,
  is_correct boolean not null,
  score_percent integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

-- 4. TABELA DE CONQUISTAS E MEDALHAS (STUDENT_BADGES)
create table if not exists public.student_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  badge_id text not null,
  unlocked_at timestamptz not null default now(),
  unique(user_id, badge_id)
);

-- 5. TABELA DE LOGS DE CÁLCULO E PRÁTICA (CALCULATION_LOGS)
create table if not exists public.calculation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dist_id text not null,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================
create index if not exists idx_profiles_matricula on public.profiles(matricula);
create index if not exists idx_distribution_mastery_user on public.distribution_mastery(user_id);
create index if not exists idx_challenge_history_user on public.challenge_history(user_id);
create index if not exists idx_student_badges_user on public.student_badges(user_id);
create index if not exists idx_calculation_logs_user on public.calculation_logs(user_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA POR ALUNO
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.distribution_mastery enable row level security;
alter table public.challenge_history enable row level security;
alter table public.student_badges enable row level security;
alter table public.calculation_logs enable row level security;

-- Políticas para Profiles
drop policy if exists "Alunos podem ver seus próprios perfis" on public.profiles;
create policy "Alunos podem ver seus próprios perfis"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Alunos podem atualizar seus próprios perfis" on public.profiles;
create policy "Alunos podem atualizar seus próprios perfis"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Alunos podem inserir seus próprios perfis" on public.profiles;
create policy "Alunos podem inserir seus próprios perfis"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Políticas para Distribution Mastery
drop policy if exists "Alunos gerenciam sua própria maestria" on public.distribution_mastery;
create policy "Alunos gerenciam sua própria maestria"
  on public.distribution_mastery for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para Challenge History
drop policy if exists "Alunos gerenciam seu próprio histórico de desafios" on public.challenge_history;
create policy "Alunos gerenciam seu próprio histórico de desafios"
  on public.challenge_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para Student Badges
drop policy if exists "Alunos gerenciam suas próprias medalhas" on public.student_badges;
create policy "Alunos gerenciam suas próprias medalhas"
  on public.student_badges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Políticas para Calculation Logs
drop policy if exists "Alunos registram seus próprios cálculos" on public.calculation_logs;
create policy "Alunos registram seus próprios cálculos"
  on public.calculation_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ==============================================================================
-- TRIGGER AUTOMÁTICO: CRIAÇÃO DO PERFIL NO SIGNUP DO ALUNO
-- ==============================================================================
create or replace function public.handle_new_student()
returns trigger as $$
declare
  v_matricula text;
begin
  -- Extrai matrícula dos metadados ou do prefixo do email (ex: 12345@probmaster.com.br -> 12345)
  v_matricula := coalesce(
    new.raw_user_meta_data->>'matricula',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (
    id,
    matricula,
    student_name,
    institution,
    level,
    level_title,
    xp,
    next_level_xp,
    streak_days,
    total_calculations_done,
    challenges_solved_count,
    accuracy_rate
  ) values (
    new.id,
    v_matricula,
    coalesce(new.raw_user_meta_data->>'student_name', 'Aluno ' || v_matricula),
    'UFJF - ICE / Depto de Estatística',
    1,
    'Calouro Amostral',
    0,
    100,
    1,
    0,
    0,
    0
  )
  on conflict (id) do update set
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger se já existir para permitir reexecução idempotente
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_student();

-- ==============================================================================
-- VISÃO PARA O PROFESSOR (Acompanhamento Geral das Turmas)
-- ==============================================================================
create or replace view public.view_teacher_student_overview as
select
  p.id as user_id,
  p.matricula,
  p.student_name,
  p.institution,
  p.level,
  p.level_title,
  p.xp,
  p.total_calculations_done,
  p.challenges_solved_count,
  p.accuracy_rate,
  p.updated_at as last_activity,
  count(distinct h.id) as total_attempts,
  count(distinct case when h.is_correct then h.id end) as successful_attempts
from public.profiles p
left join public.challenge_history h on p.id = h.user_id
group by p.id, p.matricula, p.student_name, p.institution, p.level, p.level_title, p.xp, p.total_calculations_done, p.challenges_solved_count, p.accuracy_rate, p.updated_at
order by p.xp desc;
