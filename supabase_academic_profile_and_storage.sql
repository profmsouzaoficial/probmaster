-- ==============================================================================
-- PROBMASTER UFJF · MIGRAÇÃO: DADOS ACADÊMICOS (TURMA, SEMESTRE) E FOTO DO ALUNO
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em 'SQL Editor' -> 'New Query'
-- 3. Cole este script e clique no botão 'Run' (Executar)
-- ==============================================================================

-- 1. Adicionar colunas 'turma', 'semestre' e 'avatar_url' na tabela 'public.profiles'
alter table public.profiles
  add column if not exists turma text default 'Estatística I - Turma A',
  add column if not exists semestre text default '2026.1',
  add column if not exists avatar_url text;

-- 2. Atualizar ou preencher registros existentes sem turma/semestre
update public.profiles
set
  turma = coalesce(turma, institution, 'Estatística I - Turma A'),
  semestre = coalesce(semestre, '2026.1')
where turma is null or semestre is null;

-- 3. Criar o bucket de armazenamento público 'avatars' no Supabase Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- limite de 5MB
  array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];

-- 4. Configurar Políticas de Segurança (RLS) para o bucket de avatares
-- Qualquer pessoa pode visualizar as fotos dos alunos (bucket público)
drop policy if exists "Avatares são publicamente acessíveis" on storage.objects;
create policy "Avatares são publicamente acessíveis"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Alunos autenticados ou anônimos com token do app podem enviar/atualizar suas fotos
drop policy if exists "Alunos podem enviar seus avatares" on storage.objects;
create policy "Alunos podem enviar seus avatares"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

drop policy if exists "Alunos podem atualizar seus avatares" on storage.objects;
create policy "Alunos podem atualizar seus avatares"
  on storage.objects for update
  using (bucket_id = 'avatars');

drop policy if exists "Alunos podem deletar seus avatares" on storage.objects;
create policy "Alunos podem deletar seus avatares"
  on storage.objects for delete
  using (bucket_id = 'avatars');

-- 5. Atualizar o trigger de novos usuários para incluir os novos campos por padrão
create or replace function public.handle_new_user()
returns trigger as $$
declare
  raw_mat text;
  clean_mat text;
  display_name text;
begin
  raw_mat := coalesce(new.raw_user_meta_data->>'matricula', split_part(new.email, '@', 1));
  clean_mat := lower(regexp_replace(raw_mat, '[^a-zA-Z0-9]', '', 'g'));
  display_name := coalesce(new.raw_user_meta_data->>'student_name', 'Estudante ' || clean_mat);

  insert into public.profiles (
    id,
    matricula,
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
    display_name,
    'UFJF - Estatística',
    coalesce(new.raw_user_meta_data->>'turma', 'Estatística I - Turma A'),
    coalesce(new.raw_user_meta_data->>'semestre', '2026.1'),
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
    student_name = coalesce(public.profiles.student_name, excluded.student_name),
    turma = coalesce(public.profiles.turma, excluded.turma),
    semestre = coalesce(public.profiles.semestre, excluded.semestre),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$ language plpgsql security definer;
