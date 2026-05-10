# Handover Notes

## What This App Does

This is a simple stock opname web app for counting inventory by production code. It is intentionally built as a static frontend so it can run from a browser, Vercel, or any static host.

The main workflow is:

1. Fill in session details.
2. Add or import item rows.
3. Enter Party and Yard values.
4. Review status and summary metrics.
5. Export CSV/PDF or save to Supabase.

## Important Files

- `app/index.html`: Layout, buttons, table, and script imports.
- `app/styles.css`: Visual design and responsive layout.
- `app/app.js`: Local state, import/export, PDF generation, Supabase save/load.
- `app/supabase-config.js`: Supabase URL and anon key.
- `supabase-schema.sql`: Database tables, indexes, and prototype RLS policies.
- `vercel.json`: Static deployment config.

## Current Data Model

The app keeps one active stock opname session in browser localStorage.

When Supabase is enabled, it saves to:

- `stock_sessions`: one row per opname session.
- `stock_items`: rows linked to a session.

The app currently loads the most recently updated session from Supabase.

Locally, the app keeps the active session in `stock-opname-count-sheet` and a browser-local session list in `stock-opname-sessions`. The session picker opens saved local sessions without requiring Supabase.

## Known Limitations

- No user login yet.
- Supabase RLS policies are open for prototype use.
- PDF import does not OCR scanned PDFs.
- Export PDF depends on browser download behavior and jsPDF.
- The app only has one active local session at a time.

## Recommended Next Steps

1. Add Supabase Auth.
2. Replace public write RLS with authenticated policies.
3. Expand the local session picker into a Supabase-backed session list page.
4. Add barcode scanning for kode produksi.
5. Add finalization/approval status for completed opname sessions.
6. Add better PDF table parsing once real source PDF examples are available.

## Vercel

This project was previously deployed from a temporary lowercase folder because Vercel rejected the local folder name `New project`.

Use this command for production deploy:

```bash
vercel deploy --prod
```

If needed, rename or copy the repo to a lowercase folder before deploying.
