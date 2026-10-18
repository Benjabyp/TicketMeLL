-- Ejecuta este archivo en Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_name text not null check (char_length(user_name) between 1 and 100),
  infrastructure text not null check (char_length(infrastructure) between 1 and 120),
  topic text not null check (char_length(topic) between 1 and 160),
  description text not null check (char_length(description) between 1 and 4000),
  attachment_url text,
  priority text not null default 'Media' check (priority in ('Alta','Media','Baja')),
  status text not null default 'Pendiente' check (status in ('Pendiente','En proceso','Realizado')),
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_history (
  id bigint generated always as identity primary key,
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  field_name text not null,
  field_label text not null,
  old_value text,
  new_value text,
  changed_by text,
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;
alter table public.ticket_history enable row level security;
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.tickets to anon, authenticated;
grant select on public.ticket_history to anon, authenticated;

-- MVP compartido sin cuentas: cualquier persona con la URL puede ver, registrar y editar.
drop policy if exists "Public can read tickets" on public.tickets;
drop policy if exists "Public can create tickets" on public.tickets;
drop policy if exists "Public can update tickets" on public.tickets;
drop policy if exists "Public can read history" on public.ticket_history;
create policy "Public can read tickets" on public.tickets for select to anon, authenticated using (true);
create policy "Public can create tickets" on public.tickets for insert to anon, authenticated with check (true);
create policy "Public can update tickets" on public.tickets for update to anon, authenticated using (true) with check (true);
create policy "Public can read history" on public.ticket_history for select to anon, authenticated using (true);

create or replace function public.record_ticket_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.user_name is distinct from new.user_name then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'user_name','Usuario',old.user_name,new.user_name);
  end if;
  if old.infrastructure is distinct from new.infrastructure then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'infrastructure','Infraestructura',old.infrastructure,new.infrastructure);
  end if;
  if old.topic is distinct from new.topic then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'topic','Tema',old.topic,new.topic);
  end if;
  if old.description is distinct from new.description then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'description','Descripción',old.description,new.description);
  end if;
  if old.attachment_url is distinct from new.attachment_url then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'attachment_url','Adjunto',old.attachment_url,new.attachment_url);
  end if;
  if old.priority is distinct from new.priority then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'priority','Prioridad',old.priority,new.priority);
  end if;
  if old.status is distinct from new.status then
    insert into public.ticket_history(ticket_id,field_name,field_label,old_value,new_value) values(new.id,'status','Estado',old.status,new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists ticket_changes_trigger on public.tickets;
create trigger ticket_changes_trigger after update on public.tickets for each row execute function public.record_ticket_changes();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('evidencias','evidencias',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "Public can view evidence" on storage.objects;
drop policy if exists "Public can upload evidence" on storage.objects;
create policy "Public can view evidence" on storage.objects for select to anon, authenticated using (bucket_id = 'evidencias');
create policy "Public can upload evidence" on storage.objects for insert to anon, authenticated with check (bucket_id = 'evidencias');
