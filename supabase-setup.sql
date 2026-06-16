-- ═══════════════════════════════════════════════════════
-- PlayHub — Etapa 2: Schema corrigido
-- Rodar no Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════

-- Tabela de perfis
create table if not exists public.profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  name          text        not null default '',
  email         text        not null default '',
  user_type     text        not null default 'atleta'
                            check (user_type in ('atleta','empresa','visitante')),
  bio           text,
  location      text,
  avatar_url    text,
  sports        text[]      default '{}',
  empresa_status text       default null
                            check (empresa_status in ('pendente','aprovado','rejeitado','suspenso') or empresa_status is null),
  cnpj          text,
  empresa_nome  text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Qualquer autenticado pode ler perfis
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (true);

-- Utilizador edita apenas o próprio perfil
create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- FIX: INSERT via trigger (roda como service_role / postgres)
-- Usar "to authenticated, anon" NÃO resolve o trigger
-- Correto: policy sem "to" limita → usar "to postgres" ou sem restrição de role
-- A forma mais segura: policy separada que permite insert pelo próprio user
-- E o trigger usar SECURITY DEFINER que bypassa RLS
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ── Trigger: criação automática do perfil ────────────
-- SECURITY DEFINER + SET search_path garante que bypassa RLS
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Usar INSERT ... ON CONFLICT DO NOTHING para idempotência
  insert into public.profiles (id, email, name, user_type)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'user_type', 'atleta')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Garantir que o trigger existe
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ── Verificação: desabilitar confirmação de email (OPCIONAL) ──
-- Se quiser cadastro sem confirmação de email durante dev:
-- Supabase Dashboard → Authentication → Settings → Email Auth
-- Desabilitar "Enable email confirmations"
-- OU definir no config: auth.email.enable_confirmations = false
