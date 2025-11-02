-- 20251026171917_enable_uuid_extensions_safe.sql
-- Enables UUID generation functions used in legacy migrations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";