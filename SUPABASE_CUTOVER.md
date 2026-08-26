# Supabase cutover

The application server now uses a Supabase/Postgres-backed compatibility layer behind the existing `firestoreService` interface.

Required Render environment variables:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

The secret key must remain server-side. Existing server modules can continue importing `firestoreService` while the compatibility layer is progressively removed.

Startup PRIME identity repair is intentionally disabled. Identity repair is explicit/on-demand so application startup does not mutate customer or configuration data.
