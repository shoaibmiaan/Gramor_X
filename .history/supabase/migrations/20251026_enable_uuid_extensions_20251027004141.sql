-- 20251026_enable_uuid_extensions.sql
-- Enables UUID generation functions used in legacy migrations
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
