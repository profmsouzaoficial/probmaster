-- ==============================================================================
-- PROBMASTER UFJF/GV · ATUALIZAÇÃO ACADÊMICA: ICV, DCBV E CAMPOS DE PERFIL
-- Autoria: Prof. Márcio Souza - DCBV - ICV - UFJF/GV
-- ==============================================================================
-- Como executar:
-- 1. Acesse o painel do Supabase (https://supabase.com/dashboard)
-- 2. Entre no seu projeto e clique no menu lateral em 'SQL Editor' -> 'New query'
-- 3. Cole o código abaixo e clique em 'Run' (Executar)
-- ==============================================================================

-- 1. Garantir que todas as colunas de dados acadêmicos e contato existam em public.profiles
alter table public.profiles
  add column if not exists email text,
  add column if not exists personal_email text,
  add column if not exists turma text default 'Estatística I - Turma A',
  add column if not exists semestre text default '2026.1',
  add column if not exists institution text default 'UFJF/GV - ICV - DCBV',
  add column if not exists avatar_url text;

-- 2. Atualizar registros antigos para o Instituto de Ciências da Vida (ICV / DCBV)
update public.profiles
set institution = 'UFJF/GV - ICV - DCBV'
where institution is null
   or institution like '%ICE%'
   or institution like '%Estatística%';

-- 3. Sincronizar emails existentes com a tabela auth.users caso ainda não estejam preenchidos
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 4. Garantir permissões de leitura e atualização (RLS) para os alunos editarem seus dados
alter table public.profiles enable row level security;

drop policy if exists "Perfis são publicamente legíveis" on public.profiles;
create policy "Perfis são publicamente legíveis"
  on public.profiles for select
  using (true);

drop policy if exists "Alunos podem atualizar seus próprios perfis" on public.profiles;
create policy "Alunos podem atualizar seus próprios perfis"
  on public.profiles for update
  using (true)
  with check (true);

drop policy if exists "Permitir inserção de novos perfis" on public.profiles;
create policy "Permitir inserção de novos perfis"
  on public.profiles for insert
  with check (true);

-- 5. Atualizar o Trigger de cadastro para salvar todos os campos obrigatórios e opcionais
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_mat text;
  clean_mat text;
  display_name text;
  user_turma text;
  user_semestre text;
  user_personal_email text;
begin
  raw_mat := coalesce(new.raw_user_meta_data->>'matricula', split_part(new.email, '@', 1));
  clean_mat := lower(regexp_replace(raw_mat, '[^a-zA-Z0-9]', '', 'g'));
  display_name := coalesce(new.raw_user_meta_data->>'student_name', 'Estudante ' || clean_mat);
  user_turma := coalesce(new.raw_user_meta_data->>'turma', 'Estatística I - Turma A');
  user_semestre := coalesce(new.raw_user_meta_data->>'semestre', '2026.1');
  user_personal_email := new.raw_user_meta_data->>'personal_email';

  insert into public.profiles (
    id,
    matricula,
    email,
    personal_email,
    student_name,
    institution,
    turma,
    semestre,
    avatar_url,
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
    clean_mat,
    new.email,
    user_personal_email,
    display_name,
    'UFJF/GV - ICV - DCBV',
    user_turma,
    user_semestre,
    new.raw_user_meta_data->>'avatar_url',
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
    matricula = excluded.matricula,
    email = excluded.email,
    personal_email = coalesce(excluded.personal_email, public.profiles.personal_email),
    student_name = coalesce(public.profiles.student_name, excluded.student_name),
    institution = 'UFJF/GV - ICV - DCBV',
    turma = coalesce(public.profiles.turma, excluded.turma),
    semestre = coalesce(public.profiles.semestre, excluded.semestre),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$ language plpgsql security definer;

-- 6. Configurar bucket de armazenamento para fotos de perfil dos alunos (Storage 'avatars')
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Fotos de perfil são públicas" on storage.objects;
create policy "Fotos de perfil são públicas"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Alunos autenticados podem enviar fotos" on storage.objects;
create policy "Alunos autenticados podem enviar fotos"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

drop policy if exists "Alunos podem atualizar suas fotos" on storage.objects;
create policy "Alunos podem atualizar suas fotos"
  on storage.objects for update
  using (bucket_id = 'avatars');
