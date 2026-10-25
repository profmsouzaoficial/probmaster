-- ==============================================================================
-- PROBMASTER · UNIVERSIDADE FEDERAL DE JUIZ DE FORA (UFJF)
-- TABELA DO BANCO DE DESAFIOS E QUESTÕES (CHALLENGES)
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do Supabase (SQL Editor -> New Query)
-- 2. Cole este script e clique em RUN
-- ==============================================================================

-- 1. Criação da tabela de questões/desafios
create table if not exists public.challenges (
  id text primary key,
  dist_id text not null,
  dist_name text not null,
  title text not null,
  difficulty text not null check (difficulty in ('Iniciante', 'Intermediário', 'Avançado')),
  story text not null,
  question text not null,
  target_expression text not null,
  params jsonb not null default '{}'::jsonb,
  expected_answer numeric not null,
  tolerance numeric not null default 0.02,
  hint1 text not null,
  hint2 text not null,
  full_explanation text not null,
  xp_reward integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Índices para performance de busca por distribuição e dificuldade
create index if not exists idx_challenges_dist_id on public.challenges(dist_id);
create index if not exists idx_challenges_difficulty on public.challenges(difficulty);
create index if not exists idx_challenges_is_active on public.challenges(is_active);

-- 3. Habilitação de RLS (Row Level Security)
alter table public.challenges enable row level security;

-- Política de Leitura pública para estudantes (anon e authenticated)
drop policy if exists "Permitir leitura de desafios para todos" on public.challenges;
create policy "Permitir leitura de desafios para todos"
  on public.challenges for select
  using (is_active = true);

-- Política de Gerenciamento para inserção e atualização
drop policy if exists "Permitir gerenciamento de desafios" on public.challenges;
create policy "Permitir gerenciamento de desafios"
  on public.challenges for all
  using (true)
  with check (true);

-- 4. Povoamento inicial (Seed) com os 7 desafios aplicados
insert into public.challenges (
  id, dist_id, dist_name, title, difficulty, story, question, target_expression,
  params, expected_answer, tolerance, hint1, hint2, full_explanation, xp_reward, is_active
) values
(
  'norm_1',
  'normal',
  'Normal (Gaussiana)',
  'Controle de Qualidade de Peças Industriais',
  'Iniciante',
  'Uma usina automotiva produz eixos de precisão cujo diâmetro segue uma distribuição Normal com média μ = 50.0 mm e desvio padrão σ = 0.5 mm.',
  'Qual a probabilidade de um eixo selecionado ao acaso ter diâmetro menor que 49.5 mm, ou seja, P(X ≤ 49.5)?',
  'P(X ≤ 49.5)',
  '{"mu": 50, "sigma": 0.5}'::jsonb,
  0.1587,
  0.015,
  'Calcule o escore Z: Z = (49.5 - 50.0) / 0.5 = -1.0.',
  'Pela regra empírica da Normal, P(Z ≤ -1) corresponde a aproximadamente 15.87% da área.',
  'Padronizando: Z = (49.5 - 50)/0.5 = -1.00. Consultando a curva normal padrão, Φ(-1.00) = 0.158655 ≈ 15.87%.',
  60,
  true
),
(
  'binom_1',
  'binomial',
  'Binomial',
  'Inspeção de Lotes em Linha de Montagem',
  'Iniciante',
  'Um lote de 10 placas de circuito é inspecionado. A probabilidade histórica de qualquer placa apresentar defeito de solda é p = 0.10 (10%). As placas são independentes.',
  'Qual a probabilidade de encontrar EXATAMENTE 1 placa defeituosa no lote, isto é, P(X = 1) com n = 10 e p = 0.10?',
  'P(X = 1)',
  '{"n": 10, "p": 0.1}'::jsonb,
  0.3874,
  0.02,
  'Use a fórmula da PMF: P(X = 1) = C(10, 1) * (0.1)^1 * (0.9)^9.',
  'C(10, 1) = 10, e (0.9)^9 ≈ 0.3874.',
  'P(X = 1) = 10 × 0.10 × (0.90)^9 = 1 × 0.38742 = 0.3874 (38.74%).',
  65,
  true
),
(
  'poiss_1',
  'poisson',
  'Poisson',
  'Acessos a Servidores em Nuvem',
  'Intermediário',
  'Um servidor de autenticação de API recebe em média λ = 4 requisições por segundo, seguindo um processo de Poisson.',
  'Qual a probabilidade de o servidor receber NO MÁXIMO 2 requisições em um determinado segundo, ou seja, P(X ≤ 2)?',
  'P(X ≤ 2)',
  '{"lambda": 4}'::jsonb,
  0.2381,
  0.02,
  'P(X ≤ 2) = P(X = 0) + P(X = 1) + P(X = 2).',
  'Lembre-se: P(X = k) = (4^k * e^(-4)) / k! para k = 0, 1, 2.',
  'P(0) = e^-4 ≈ 0.0183; P(1) = 4 * e^-4 ≈ 0.0733; P(2) = (16/2) * e^-4 = 8 * e^-4 ≈ 0.1465. Soma = 0.2381 (23.81%).',
  75,
  true
),
(
  'exp_1',
  'exponential',
  'Exponencial',
  'Tempo de Vida de Lâmpadas Hospitalares',
  'Intermediário',
  'O tempo até a falha (em milhares de horas) de lâmpadas UV em salas cirúrgicas tem distribuição Exponencial com taxa λ = 0.5 (vida média de 2 mil horas).',
  'Qual a probabilidade de uma lâmpada durar MAIS de 3 mil horas, ou seja, P(X ≥ 3)?',
  'P(X ≥ 3)',
  '{"lambda": 0.5}'::jsonb,
  0.2231,
  0.02,
  'Para a distribuição exponencial, a cauda superior é P(X ≥ x) = e^(-λx).',
  'Calcule e^(-0.5 * 3) = e^(-1.5).',
  'P(X ≥ 3) = e^(-0.5 × 3) = e^(-1.5) ≈ 0.22313 (22.31%).',
  70,
  true
),
(
  't_1',
  'student_t',
  't de Student',
  'Intervalo Crítico de Estudo Clínico',
  'Avançado',
  'Um pesquisador realiza um teste t com amostra de tamanho n = 11 pacientes (portanto ν = n - 1 = 10 graus de liberdade) para avaliar a redução de pressão arterial.',
  'Qual a probabilidade de a estatística t cair entre -1.81 e +1.81, isto é, P(-1.81 ≤ t ≤ 1.81) com ν = 10?',
  'P(-1.81 ≤ t ≤ 1.81)',
  '{"df": 10}'::jsonb,
  0.90,
  0.03,
  'Este é o intervalo bilateral de confiança de 90% para 10 graus de liberdade.',
  'A área em cada uma das caudas fora do intervalo é de 5% (0.05).',
  'Para ν = 10, o valor crítico bilateral a 10% de significância é t ≈ 1.812. Portanto, P(-1.81 ≤ t ≤ 1.81) ≈ 0.90 (90.0%).',
  90,
  true
),
(
  'chi_1',
  'chi_square',
  'Qui-Quadrado (χ²)',
  'Teste de Aderência Genética',
  'Avançado',
  'Em um cruzamento genético com 5 categorias fenotípicas (graus de liberdade k = 5 - 1 = 4), calculou-se a estatística χ².',
  'Qual a probabilidade de obter um valor de qui-quadrado menor ou igual a 9.49 com 4 graus de liberdade, P(X ≤ 9.49)?',
  'P(X ≤ 9.49)',
  '{"df": 4}'::jsonb,
  0.95,
  0.02,
  '9.49 é o valor crítico clássico para α = 0.05 (95% de confiança) com 4 graus de liberdade.',
  'Avalie a função acumulada do Qui-Quadrado para x = 9.49.',
  'A função acumulada P(k/2, x/2) para k=4 e x=9.488 resulta exatamente em 0.95 (95.0%).',
  95,
  true
),
(
  'beta_1',
  'beta_dist',
  'Beta',
  'Modelagem Bayesiana de Conversão Web',
  'Avançado',
  'Uma equipe de Growth modela a taxa de conversão θ de um novo checkout com uma distribuição Beta(α=3, β=7) após um teste A/B.',
  'Qual a média esperada da taxa de conversão E[X] = α / (α + β)? (Digite em decimal, ex: 0.30)',
  'E[X]',
  '{"alpha": 3, "beta": 7}'::jsonb,
  0.30,
  0.01,
  'A média da distribuição Beta é dada por E[X] = α / (α + β).',
  'Calcule 3 / (3 + 7).',
  'E[X] = 3 / (3 + 7) = 3 / 10 = 0.30 (30.0% de conversão esperada).',
  80,
  true
)
on conflict (id) do update set
  dist_id = excluded.dist_id,
  dist_name = excluded.dist_name,
  title = excluded.title,
  difficulty = excluded.difficulty,
  story = excluded.story,
  question = excluded.question,
  target_expression = excluded.target_expression,
  params = excluded.params,
  expected_answer = excluded.expected_answer,
  tolerance = excluded.tolerance,
  hint1 = excluded.hint1,
  hint2 = excluded.hint2,
  full_explanation = excluded.full_explanation,
  xp_reward = excluded.xp_reward,
  is_active = excluded.is_active,
  updated_at = now();
