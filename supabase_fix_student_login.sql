-- ==============================================================================
-- PROBMASTER UFJF · CORREÇÃO DEFINITIVA DE LOGIN E CADASTRO DE ALUNOS
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral esquerdo, clique em 'SQL Editor' -> 'New Query'
-- 3. Cole TODO este script e clique no botão 'Run' (Executar)
-- ==============================================================================

-- 1. Adicionar coluna 'email' na tabela 'public.profiles' caso não exista
alter table public.profiles
  add column if not exists email text;

-- 2. Preencher o email de todos os usuários já existentes a partir de auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email != u.email);

-- 3. Permitir busca e leitura de perfis de alunos (necessário para verificação de matrícula)
drop policy if exists "Alunos podem ver seus próprios perfis" on public.profiles;
drop policy if exists "Perfis são publicamente legíveis" on public.profiles;
create policy "Perfis são publicamente legíveis"
  on public.profiles for select
  using (true);

-- 4. Função segura (RPC) para encontrar o login do aluno por Matrícula ou E-mail
create or replace function public.resolve_student_login(identifier text)
returns json as $$
declare
  clean_id text;
  found_user record;
begin
  clean_id := trim(identifier);

  -- Busca por matrícula na tabela profiles
  select p.id, p.matricula, p.student_name, u.email
  into found_user
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.matricula = clean_id
     or lower(regexp_replace(p.matricula, '[^a-zA-Z0-9]', '', 'g')) = lower(regexp_replace(clean_id, '[^a-zA-Z0-9]', '', 'g'))
  limit 1;

  if found_user.id is not null then
    return json_build_object(
      'found', true,
      'user_id', found_user.id,
      'matricula', found_user.matricula,
      'student_name', found_user.student_name,
      'email', found_user.email
    );
  end if;

  -- Busca direta na tabela auth.users por email
  select p.id, coalesce(p.matricula, split_part(u.email, '@', 1)) as matricula, coalesce(p.student_name, 'Estudante') as student_name, u.email
  into found_user
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(clean_id)
     or lower(split_part(u.email, '@', 1)) = lower(clean_id)
  limit 1;

  if found_user.email is not null then
    return json_build_object(
      'found', true,
      'user_id', found_user.id,
      'matricula', found_user.matricula,
      'student_name', found_user.student_name,
      'email', found_user.email
    );
  end if;

  return json_build_object('found', false);
end;
$$ language plpgsql security definer;

-- Conceder permissão de execução para anônimos e autenticados
grant execute on function public.resolve_student_login(text) to anon, authenticated;

-- 5. Atualizar o trigger de novos cadastros para salvar o email e evitar erros de duplicação
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
    email,
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
    email = excluded.email,
    student_name = coalesce(public.profiles.student_name, excluded.student_name),
    turma = coalesce(public.profiles.turma, excluded.turma),
    semestre = coalesce(public.profiles.semestre, excluded.semestre),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$ language plpgsql security definer;
