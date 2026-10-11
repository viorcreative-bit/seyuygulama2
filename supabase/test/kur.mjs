import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';

export async function kur() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`
    create schema extensions;
    create extension pgcrypto schema extensions;
    create schema auth; create schema storage;
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    grant usage on schema public, auth, extensions, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, instance_id uuid, aud text, role text, email text, phone text unique,
      phone_confirmed_at timestamptz, encrypted_password text, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
      created_at timestamptz, updated_at timestamptz, banned_until timestamptz,
      confirmation_token text default '', recovery_token text, email_change_token_new text, email_change text);
    create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant select on auth.users to authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid default gen_random_uuid() primary key, bucket_id text, name text, owner uuid);
    alter table storage.objects enable row level security;
    grant all on storage.objects, storage.buckets to authenticated, anon;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
  `);
  return db;
}

export async function semalar(db, dosyalar) {
  for (const d of dosyalar) {
    try { await db.exec(readFileSync(new URL(`../${d}`, import.meta.url), 'utf8')); console.log('OK   ', d); }
    catch (e) { console.log('HATA ', d, '->', e.message.slice(0, 300)); throw e; }
  }
}
