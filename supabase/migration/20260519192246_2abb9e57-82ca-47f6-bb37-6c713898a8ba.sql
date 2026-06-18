
-- Pharmacies (medicine stock holders)
create table if not exists public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  phone text,
  lat double precision,
  lng double precision,
  is_verified boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.pharmacies enable row level security;
drop policy if exists "pharmacies public read" on public.pharmacies;
create policy "pharmacies public read" on public.pharmacies for select using (true);
drop policy if exists "pharmacies admin write" on public.pharmacies;
create policy "pharmacies admin write" on public.pharmacies for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Medicine catalog with live stock
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies(id) on delete cascade,
  name text not null,
  brand text,
  price numeric not null default 0,
  stock integer not null default 0,
  unit text not null default 'unit',
  updated_at timestamptz not null default now()
);
create index if not exists medicines_name_idx on public.medicines (lower(name));
create index if not exists medicines_pharmacy_idx on public.medicines (pharmacy_id);
alter table public.medicines enable row level security;
drop policy if exists "medicines public read" on public.medicines;
create policy "medicines public read" on public.medicines for select using (true);
drop policy if exists "medicines admin write" on public.medicines;
create policy "medicines admin write" on public.medicines for all
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Extend pharmacy_orders for status flow, ETA, courier tracking
alter table public.pharmacy_orders
  add column if not exists pharmacy_id uuid,
  add column if not exists eta_minutes integer,
  add column if not exists accepted_at timestamptz,
  add column if not exists dispatched_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists courier_lat double precision,
  add column if not exists courier_lng double precision,
  add column if not exists total_amount numeric;

-- Demo seed: a few verified pharmacies (only if empty)
insert into public.pharmacies (name, city, address, phone, lat, lng)
select * from (values
  ('MediPlus 24x7', 'Bengaluru', '12 MG Road, Bengaluru', '+91 98000 11111', 12.9716, 77.5946),
  ('CarePoint Pharmacy', 'Bengaluru', '45 Indiranagar, Bengaluru', '+91 98000 22222', 12.9719, 77.6412),
  ('Wellness Drugs', 'Bengaluru', '7 Koramangala, Bengaluru', '+91 98000 33333', 12.9352, 77.6245)
) as v(name, city, address, phone, lat, lng)
where not exists (select 1 from public.pharmacies);

-- Demo seed: medicines per pharmacy
insert into public.medicines (pharmacy_id, name, brand, price, stock, unit)
select p.id, m.name, m.brand, m.price, m.stock, 'strip'
from public.pharmacies p
cross join (values
  ('Paracetamol 500mg','Crocin', 25, 120),
  ('Azithromycin 500mg','Azee', 95, 40),
  ('Cetirizine 10mg','Cetzine', 18, 80),
  ('Amoxicillin 500mg','Mox', 70, 25),
  ('Pantoprazole 40mg','Pan', 55, 60),
  ('Metformin 500mg','Glycomet', 30, 200),
  ('Atorvastatin 10mg','Atorva', 85, 35),
  ('Vitamin D3 60K','Calcirol', 65, 90),
  ('ORS Sachets','Electral', 20, 300),
  ('Ibuprofen 400mg','Brufen', 35, 0)
) as m(name, brand, price, stock)
where not exists (select 1 from public.medicines where pharmacy_id = p.id);

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.pharmacy_orders; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.medicines; exception when duplicate_object then null; end;
end $$;
