# Supabase Setup

## 1. Create Project

Create a new project in Supabase and wait until the database is ready.

## 2. Create Tables

Open SQL Editor and run:

```sql
-- Paste the contents of ../supabase-schema.sql here
```

The schema creates:

- `stock_sessions`
- `stock_items`
- index on `stock_items(session_id, sort_order)`
- prototype RLS policies

If your table was created before Party supported values like `1/18`, run this migration once:

```sql
alter table public.stock_items
  alter column party type text using party::text,
  alter column party set default '';
```

## 3. Configure Frontend

Open `app/supabase-config.js` and set:

```js
window.STOCK_OPNAME_SUPABASE = {
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "SUPABASE_ANON_KEY",
};
```

Use the anon key only. Never put the service role key in this file.

## 4. Test

1. Refresh the app.
2. Confirm the status says Supabase is connected.
3. Add a row.
4. Click `Save DB`.
5. Refresh the page.
6. Click `Load DB`.

## Security Note

The current RLS policies allow public reads and writes. This is acceptable only for a prototype or private testing.

Before production:

- Add Supabase Auth.
- Add a `user_id` or `organization_id` column.
- Restrict select/insert/update/delete policies to authenticated users.
- Consider separate roles for counter, supervisor, and admin.
