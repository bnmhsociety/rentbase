-- SQL sans suppression pour préparer le nouveau tunnel client RentBase

create extension if not exists pgcrypto;

alter table public.booking_requests
add column if not exists payment_choice text,
add column if not exists request_message text,
add column if not exists agency_total_amount numeric default 0,
add column if not exists agency_deposit_amount numeric default 0,
add column if not exists agency_remaining_amount numeric default 0,
add column if not exists rental_days numeric default 0,
add column if not exists agency_message text,
add column if not exists refusal_reason text,
add column if not exists acceptance_token text default encode(gen_random_bytes(32), 'hex'),
add column if not exists acceptance_expires_at timestamptz,
add column if not exists accepted_email_sent_at timestamptz,
add column if not exists received_email_sent_at timestamptz,
add column if not exists client_confirmation_status text default 'Non confirmé',
add column if not exists client_confirmed_at timestamptz,
add column if not exists payment_status text default 'En attente',
add column if not exists payment_link_url text,
add column if not exists accepted_at timestamptz,
add column if not exists refused_at timestamptz,
add column if not exists finalized_at timestamptz,
add column if not exists license_front_path text,
add column if not exists license_back_path text,
add column if not exists id_front_path text,
add column if not exists id_back_path text,
add column if not exists address_proof_path text,
add column if not exists vehicle_deposit_amount numeric default 0,
add column if not exists total_amount numeric default 0,
add column if not exists deposit_amount numeric default 0,
add column if not exists payment_method text,
add column if not exists license_number text,
add column if not exists address text;

alter table public.vehicles
add column if not exists booking_deposit_amount numeric default 0;

create index if not exists booking_requests_agency_status_idx
on public.booking_requests (agency_id, status);

create index if not exists booking_requests_vehicle_dates_idx
on public.booking_requests (vehicle_id, start_date, end_date);

create index if not exists booking_requests_acceptance_token_idx
on public.booking_requests (acceptance_token);

-- Policies publiques de lecture, sans DROP. Elles ne suppriment aucune donnée.
alter table public.agencies enable row level security;
alter table public.vehicles enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'agencies'
    and policyname = 'Public can read website agencies'
  ) then
    execute 'create policy "Public can read website agencies" on public.agencies for select using (website_slug is not null)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'vehicles'
    and policyname = 'Public can read website vehicles'
  ) then
    execute 'create policy "Public can read website vehicles" on public.vehicles for select using (agency_id in (select id from public.agencies where website_slug is not null))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
    and tablename = 'bookings'
    and policyname = 'Public can read website booking calendar'
  ) then
    execute 'create policy "Public can read website booking calendar" on public.bookings for select using (agency_id in (select id from public.agencies where website_slug is not null))';
  end if;
end $$;
