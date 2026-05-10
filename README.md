# Stock Opname Web App

A lightweight browser-based stock opname count sheet for recording production codes, products, party quantities, yard counts, notes, and PDF/CSV exports.

The app works offline with browser localStorage by default. Supabase can be enabled for cloud save/load.

## Features

- Stock opname production details: produksi name, location, start date, end date
- Count sheet rows: Jam, Kode Produksi, Product, Party (for example `1/18`), Yard, product total yard, status, notes
- Summary metrics: total items, counted rows, total yard
- Multiple saved local sessions in the same browser
- Add/delete rows
- Search by kode produksi or product
- Load sample data
- Import CSV
- Import PDF from text-based PDF tables
- Export CSV
- Export PDF
- Optional Supabase cloud save/load
- Static deployment on Vercel

## Project Structure

```text
app/
  index.html                  Main app page
  styles.css                  App styling
  app.js                      App logic
  supabase-config.js          Local Supabase config
  supabase-config.example.js  Example Supabase config
docs/
  handover.md                 Handover notes for the next developer
  supabase.md                 Supabase setup guide
README.md
package.json
supabase-schema.sql
vercel.json
```

## Run Locally

Open this file in a browser:

```text
app/index.html
```

No build step is required.

For a local HTTP server:

```bash
npx serve app
```

## Supabase Setup

Supabase is optional. The app still works without it.

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run the SQL from `supabase-schema.sql`.
4. Copy your project URL and anon key.
5. Update `app/supabase-config.js`:

```js
window.STOCK_OPNAME_SUPABASE = {
  url: "https://PROJECT_ID.supabase.co",
  anonKey: "SUPABASE_ANON_KEY",
};
```

Refresh the app. The status should show Supabase is connected.

## Deploy To Vercel

The project is configured as a static app using `vercel.json`.

```bash
vercel deploy --prod
```

If the local folder name causes Vercel project-name issues, deploy from a folder with a lowercase name such as `stock-opname`.

## Notes

- PDF import only works for PDFs that contain selectable text. Scanned/image PDFs need OCR first.
- Current Supabase policies are open for prototype use. Add authentication and stricter RLS before production use.
- Local sessions are stored in browser localStorage. Clearing browser site data will remove local-only sessions.
- `app/supabase-config.js` currently stores public anon config. Do not put service-role keys in frontend files.
