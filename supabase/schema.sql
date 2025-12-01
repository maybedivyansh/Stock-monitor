-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables
create table if not exists users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  name text not null,
  category text,
  price numeric not null,
  stock_quantity integer not null default 0,
  expiry_date date,
  low_stock_threshold integer not null default 50,
  expiry_alert_days integer not null default 20,
  procurement_price numeric,
  lot_size integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists sales (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) not null,
  product_id uuid references products(id) not null,
  quantity integer not null,
  unit_price numeric,
  total_price numeric not null,
  profit numeric,
  sale_date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table users enable row level security;
alter table products enable row level security;
alter table sales enable row level security;

-- Users policies
drop policy if exists "Users can view their own data" on users;
create policy "Users can view their own data" on users for select using (auth.uid() = id);

drop policy if exists "Users can update their own data" on users;
create policy "Users can update their own data" on users for update using (auth.uid() = id);

-- Products policies
drop policy if exists "Users can view their own products" on products;
create policy "Users can view their own products" on products for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own products" on products;
create policy "Users can insert their own products" on products for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own products" on products;
create policy "Users can update their own products" on products for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own products" on products;
create policy "Users can delete their own products" on products for delete using (auth.uid() = user_id);

-- Sales policies
drop policy if exists "Users can view their own sales" on sales;
create policy "Users can view their own sales" on sales for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own sales" on sales;
create policy "Users can insert their own sales" on sales for insert with check (auth.uid() = user_id);
