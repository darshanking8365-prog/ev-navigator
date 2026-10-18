-- EV Navigator: Initial database schema

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    vehicle_name text not null,
    battery_capacity_kwh numeric(8,2),
    range_km numeric(8,2),
    connector_type text,
    created_at timestamptz not null default now()
);

create table if not exists public.charging_stations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    address text,
    latitude double precision not null,
    longitude double precision not null,
    connector_types text[] not null default '{}',
    power_kw numeric(8,2),
    price_per_kwh numeric(8,2),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.favourite_stations (
    user_id uuid not null references auth.users(id) on delete cascade,
    station_id uuid not null references public.charging_stations(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, station_id)
);

create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    station_id uuid not null references public.charging_stations(id),
    scheduled_at timestamptz not null,
    status text not null default 'pending'
        check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at timestamptz not null default now()
);

create table if not exists public.charging_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    station_id uuid references public.charging_stations(id) on delete set null,
    energy_kwh numeric(10,2),
    cost numeric(10,2),
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.charging_stations enable row level security;
alter table public.favourite_stations enable row level security;
alter table public.bookings enable row level security;
alter table public.charging_sessions enable row level security;

-- Profiles: users can manage their own profiles
create policy "Users manage own profile"
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Vehicles: users can manage their own vehicles
create policy "Users manage own vehicles"
on public.vehicles
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Charging stations: publicly readable active stations
create policy "Anyone can read active charging stations"
on public.charging_stations
for select
to anon, authenticated
using (is_active = true);

-- Favourites: users can manage their own favourites
create policy "Users manage own favourites"
on public.favourite_stations
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Bookings: users can manage their own bookings
create policy "Users manage own bookings"
on public.bookings
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Charging sessions: users can manage their own sessions
create policy "Users manage own charging sessions"
on public.charging_sessions
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Indexes for common queries
create index if not exists vehicles_user_id_idx
    on public.vehicles(user_id);

create index if not exists bookings_user_id_idx
    on public.bookings(user_id);

create index if not exists charging_sessions_user_id_idx
    on public.charging_sessions(user_id);

create index if not exists charging_stations_location_idx
    on public.charging_stations(latitude, longitude);