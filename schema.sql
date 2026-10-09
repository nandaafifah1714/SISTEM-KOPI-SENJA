-- Kopi Senja: empat entitas bisnis (menu, promo, penjualan, detail_penjualan).
-- Dapat dijalankan pada project baru atau schema Kopi Senja sebelumnya.
-- Buat backup database sebelum migrasi database lama.
begin;

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.menu') is null and to_regclass('public.products') is not null then
    alter table public.products rename to menu;
  end if;
  if to_regclass('public.penjualan') is null and to_regclass('public.sales') is not null then
    alter table public.sales rename to penjualan;
  end if;
  if to_regclass('public.detail_penjualan') is null and to_regclass('public.sale_items') is not null then
    alter table public.sale_items rename to detail_penjualan;
  end if;
end;
$$;

create table if not exists public.menu (
  id_menu uuid primary key default gen_random_uuid(),
  nama_menu text not null check (length(trim(nama_menu)) between 1 and 120),
  kategori text not null default 'Kopi',
  harga numeric(12,2) not null check (harga >= 0),
  status_menu boolean not null default true,
  kode_menu text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo (
  id_promo uuid primary key default gen_random_uuid(),
  nama_promo text not null unique check (length(trim(nama_promo)) between 1 and 100),
  jenis_promo text not null check (jenis_promo in ('persentase', 'nominal')),
  nilai_promo numeric(12,2) not null check (
    (jenis_promo = 'persentase' and nilai_promo > 0 and nilai_promo <= 100)
    or (jenis_promo = 'nominal' and nilai_promo > 0)
  ),
  tanggal_mulai date not null,
  tanggal_selesai date not null,
  status_promo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_tanggal_valid check (tanggal_mulai <= tanggal_selesai)
);

create table if not exists public.penjualan (
  id_penjualan uuid primary key default gen_random_uuid(),
  nomor_penjualan text not null unique,
  tanggal_penjualan timestamptz not null default now(),
  total_penjualan numeric(14,2) not null default 0 check (total_penjualan >= 0),
  metode_pembayaran text not null check (metode_pembayaran in ('Tunai', 'QRIS', 'Debit', 'Transfer')),
  id_promo uuid references public.promo(id_promo) on delete restrict,
  nama_promo text,
  diskon_penjualan numeric(14,2) not null default 0 check (diskon_penjualan >= 0)
);

create table if not exists public.detail_penjualan (
  id_detail uuid primary key default gen_random_uuid(),
  id_penjualan uuid not null references public.penjualan(id_penjualan) on delete cascade,
  id_menu uuid not null references public.menu(id_menu) on delete restrict,
  nama_menu text not null,
  jumlah integer not null check (jumlah > 0),
  harga_satuan numeric(12,2) not null check (harga_satuan >= 0),
  subtotal numeric(14,2) generated always as (jumlah * harga_satuan) stored
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='id') then
    alter table public.menu rename column id to id_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='product_code') then
    alter table public.menu rename column product_code to kode_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='name') then
    alter table public.menu rename column name to nama_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='category') then
    alter table public.menu rename column category to kategori;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='price') then
    alter table public.menu rename column price to harga;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='is_active') then
    alter table public.menu rename column is_active to status_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='kategori_lama') then
    alter table public.menu rename column kategori_lama to kategori;
  end if;

  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='penjualan' and column_name='id') then
    alter table public.penjualan rename column id to id_penjualan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='penjualan' and column_name='sale_code') then
    alter table public.penjualan rename column sale_code to nomor_penjualan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='penjualan' and column_name='transaction_date') then
    alter table public.penjualan rename column transaction_date to tanggal_penjualan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='penjualan' and column_name='total_amount') then
    alter table public.penjualan rename column total_amount to total_penjualan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='penjualan' and column_name='payment_method') then
    alter table public.penjualan rename column payment_method to metode_pembayaran;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='id') then
    alter table public.detail_penjualan rename column id to id_detail;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='sale_id') then
    alter table public.detail_penjualan rename column sale_id to id_penjualan;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='product_id') then
    alter table public.detail_penjualan rename column product_id to id_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='product_name') then
    alter table public.detail_penjualan rename column product_name to nama_menu;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='quantity') then
    alter table public.detail_penjualan rename column quantity to jumlah;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='unit_price') then
    alter table public.detail_penjualan rename column unit_price to harga_satuan;
  end if;
end;
$$;

alter table public.menu add column if not exists id_kategori uuid;
alter table public.menu add column if not exists kategori text;
do $$
begin
  if to_regclass('public.kategori_menu') is not null
     and exists (select 1 from information_schema.columns where table_schema='public' and table_name='menu' and column_name='id_kategori') then
    if exists (select 1 from information_schema.columns where table_schema='public' and table_name='kategori_menu' and column_name='kategori') then
      execute $q$
        update public.menu m
        set kategori = coalesce(nullif(trim(k.kategori), ''), nullif(trim(k.nama_kategori), ''), 'Kopi')
        from public.kategori_menu k
        where m.id_kategori = k.id_kategori and (m.kategori is null or trim(m.kategori) = '')
      $q$;
    else
      update public.menu m
      set kategori = coalesce(nullif(trim(k.nama_kategori), ''), 'Kopi')
      from public.kategori_menu k
      where m.id_kategori = k.id_kategori and (m.kategori is null or trim(m.kategori) = '');
    end if;
  end if;
end;
$$;
update public.menu set kategori = 'Kopi' where kategori is null or trim(kategori) = '';
update public.menu set status_menu = true where status_menu is null;
alter table public.menu alter column kategori set default 'Kopi';
alter table public.menu alter column kategori set not null;
alter table public.menu alter column status_menu set default true;
alter table public.menu alter column status_menu set not null;
alter table public.menu add column if not exists kode_menu text;
alter table public.menu add column if not exists status_menu boolean not null default true;
alter table public.menu add column if not exists created_at timestamptz not null default now();
alter table public.menu add column if not exists updated_at timestamptz not null default now();
alter table public.menu drop column if exists id_kategori cascade;
drop table if exists public.kategori_menu;

alter table public.penjualan add column if not exists nomor_penjualan text;
alter table public.penjualan add column if not exists tanggal_penjualan timestamptz not null default now();
alter table public.penjualan add column if not exists total_penjualan numeric(14,2) not null default 0;
alter table public.penjualan add column if not exists metode_pembayaran text;
alter table public.penjualan add column if not exists id_promo uuid references public.promo(id_promo) on delete restrict;
alter table public.penjualan add column if not exists nama_promo text;
alter table public.penjualan add column if not exists diskon_penjualan numeric(14,2) not null default 0;
do $$
declare
  customer_column text;
begin
  foreach customer_column in array array['customer_id', 'id_customer', 'id_pelanggan', 'pelanggan_id'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='penjualan' and column_name=customer_column
    ) then
      execute format('alter table public.penjualan drop column %I', customer_column);
    end if;
  end loop;
end;
$$;
update public.penjualan set nomor_penjualan = 'KS-LEGACY-' || id_penjualan::text where nomor_penjualan is null or trim(nomor_penjualan) = '';
update public.penjualan set metode_pembayaran = 'Tunai' where metode_pembayaran is null or trim(metode_pembayaran) = '';
alter table public.penjualan alter column nomor_penjualan set not null;
alter table public.penjualan alter column metode_pembayaran set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=any(c.conkey)
    where c.conrelid='public.penjualan'::regclass and c.contype='u' and a.attname='nomor_penjualan'
  ) then
    alter table public.penjualan add constraint penjualan_nomor_penjualan_key unique (nomor_penjualan);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.penjualan'::regclass and conname='penjualan_id_promo_fkey') then
    alter table public.penjualan add constraint penjualan_id_promo_fkey foreign key (id_promo) references public.promo(id_promo) on delete restrict;
  end if;
end;
$$;

alter table public.detail_penjualan add column if not exists id_menu uuid;
alter table public.detail_penjualan add column if not exists nama_menu text;
alter table public.detail_penjualan add column if not exists jumlah integer;
alter table public.detail_penjualan add column if not exists harga_satuan numeric(12,2);
update public.detail_penjualan d
set nama_menu = coalesce(nullif(d.nama_menu, ''), m.nama_menu, 'Menu historis'),
    harga_satuan = coalesce(d.harga_satuan, m.harga, 0)
from public.menu m
where d.id_menu = m.id_menu and (d.nama_menu is null or d.harga_satuan is null);
update public.detail_penjualan set nama_menu = 'Menu historis' where nama_menu is null;
update public.detail_penjualan set jumlah = 1 where jumlah is null or jumlah < 1;
update public.detail_penjualan set harga_satuan = 0 where harga_satuan is null or harga_satuan < 0;
do $$
declare
  subtotal_mismatch boolean;
  generated_subtotal boolean;
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='subtotal') then
    execute 'select exists (select 1 from public.detail_penjualan where subtotal is distinct from (jumlah * harga_satuan))'
      into subtotal_mismatch;
    if subtotal_mismatch then
      raise exception 'Migrasi dibatalkan: subtotal historis berbeda dari jumlah x harga_satuan. Periksa data sebelum migrasi.';
    end if;
    select is_generated = 'ALWAYS' into generated_subtotal
    from information_schema.columns
    where table_schema='public' and table_name='detail_penjualan' and column_name='subtotal';
    if not generated_subtotal then
      alter table public.detail_penjualan drop column subtotal;
    end if;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='detail_penjualan' and column_name='subtotal' and is_generated='ALWAYS') then
    alter table public.detail_penjualan add column subtotal numeric(14,2) generated always as (jumlah * harga_satuan) stored;
  end if;
end;
$$;
alter table public.detail_penjualan alter column nama_menu set not null;
alter table public.detail_penjualan alter column jumlah set not null;
alter table public.detail_penjualan alter column harga_satuan set not null;
do $$
declare
  detail_menu_constraint record;
begin
  for detail_menu_constraint in
    select conname from pg_constraint
    where conrelid='public.detail_penjualan'::regclass and contype='f' and confrelid='public.menu'::regclass
  loop
    execute format('alter table public.detail_penjualan drop constraint %I', detail_menu_constraint.conname);
  end loop;
  alter table public.detail_penjualan add constraint detail_penjualan_id_menu_fkey
    foreign key (id_menu) references public.menu(id_menu) on delete restrict;
end;
$$;

drop table if exists public.customers;
drop table if exists public.customer;
drop table if exists public.pelanggan;

create index if not exists idx_menu_kategori on public.menu(kategori);
create index if not exists idx_penjualan_tanggal on public.penjualan(tanggal_penjualan desc);
create index if not exists idx_detail_penjualan_penjualan on public.detail_penjualan(id_penjualan);
create index if not exists idx_detail_penjualan_menu on public.detail_penjualan(id_menu);
create index if not exists idx_promo_periode on public.promo(status_promo, tanggal_mulai, tanggal_selesai);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists menu_set_updated_at on public.menu;
create trigger menu_set_updated_at before update on public.menu for each row execute function public.set_updated_at();
drop trigger if exists promo_set_updated_at on public.promo;
create trigger promo_set_updated_at before update on public.promo for each row execute function public.set_updated_at();

do $$
begin
  if to_regclass('public.sale_code_seq') is not null and to_regclass('public.penjualan_nomor_seq') is null then
    alter sequence public.sale_code_seq rename to penjualan_nomor_seq;
  end if;
end;
$$;
create sequence if not exists public.penjualan_nomor_seq start 1;
create or replace function public.generate_sale_code()
returns text language sql volatile as $$
  select 'KS-' || to_char(now(), 'YYMMDD') || '-' || lpad(nextval('public.penjualan_nomor_seq')::text, 5, '0');
$$;

drop function if exists public.create_sale_with_details(text, jsonb);
create or replace function public.create_sale_with_details(
  p_metode_pembayaran text,
  p_items jsonb,
  p_id_promo uuid default null
)
returns jsonb
language plpgsql
volatile
as $$
declare
  v_penjualan public.penjualan%rowtype;
  v_menu public.menu%rowtype;
  v_promo public.promo%rowtype;
  v_item jsonb;
  v_jumlah integer;
  v_subtotal numeric(14,2);
  v_total_before numeric(14,2) := 0;
  v_discount numeric(14,2) := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if p_metode_pembayaran is null or p_metode_pembayaran not in ('Tunai', 'QRIS', 'Debit', 'Transfer') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Transaksi harus memiliki minimal satu menu.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'id_menu', '') = '' or coalesce(v_item->>'jumlah', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Menu dan jumlah transaksi tidak valid.';
    end if;
    v_jumlah := (v_item->>'jumlah')::integer;
    select * into v_menu from public.menu
    where id_menu = (v_item->>'id_menu')::uuid and status_menu = true
    for share;
    if not found then raise exception 'Menu tidak ditemukan atau sedang nonaktif.'; end if;
    v_total_before := v_total_before + v_menu.harga * v_jumlah;
  end loop;

  if p_id_promo is not null then
    select * into v_promo from public.promo where id_promo = p_id_promo for share;
    if not found or not v_promo.status_promo or current_date not between v_promo.tanggal_mulai and v_promo.tanggal_selesai then
      raise exception 'Promo tidak aktif atau sudah di luar periode berlaku.';
    end if;
    if v_promo.jenis_promo = 'persentase' then
      v_discount := round(v_total_before * v_promo.nilai_promo / 100, 2);
    else
      v_discount := least(v_total_before, v_promo.nilai_promo);
    end if;
  end if;

  insert into public.penjualan (nomor_penjualan, metode_pembayaran, id_promo, nama_promo, diskon_penjualan, total_penjualan)
  values (
    public.generate_sale_code(), p_metode_pembayaran, p_id_promo,
    case when p_id_promo is null then null else v_promo.nama_promo end,
    v_discount, greatest(0, v_total_before - v_discount)
  )
  returning * into v_penjualan;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_jumlah := (v_item->>'jumlah')::integer;
    select * into v_menu from public.menu where id_menu = (v_item->>'id_menu')::uuid and status_menu = true for share;
    v_subtotal := v_menu.harga * v_jumlah;
    insert into public.detail_penjualan (id_penjualan, id_menu, nama_menu, jumlah, harga_satuan)
    values (v_penjualan.id_penjualan, v_menu.id_menu, v_menu.nama_menu, v_jumlah, v_menu.harga);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id_menu', v_menu.id_menu, 'nama_menu', v_menu.nama_menu, 'jumlah', v_jumlah,
      'harga_satuan', v_menu.harga, 'subtotal', v_subtotal
    ));
  end loop;

  return jsonb_build_object(
    'id_penjualan', v_penjualan.id_penjualan, 'nomor_penjualan', v_penjualan.nomor_penjualan,
    'tanggal_penjualan', v_penjualan.tanggal_penjualan, 'total_sebelum_diskon', v_total_before,
    'diskon_penjualan', v_discount, 'total_penjualan', v_penjualan.total_penjualan,
    'metode_pembayaran', v_penjualan.metode_pembayaran, 'id_promo', v_penjualan.id_promo,
    'nama_promo', v_penjualan.nama_promo, 'items', v_items
  );
end;
$$;

commit;
