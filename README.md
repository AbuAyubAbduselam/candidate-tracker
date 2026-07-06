# Candidate Tracker

A mobile-first candidate management mini-app built with **React + Vite + Tailwind CSS v4** and **Supabase** (database + storage).

## Features

- 📋 Candidate table with **live search + filters** (status, tasheer, travel)
- ➕ **Register** new candidates (Name, Passport #, Narrative, Narrative Phone, optional Passport Scan)
- ✏️ **Inline editing** of every field — tap a value to change it
- 🎛️ Dropdowns for **Current Status** & **Tasheer**, a **Yes/No** toggle for Traveled, date pickers, file upload
- 📱 **Mobile-first** responsive design (cards on phones, full table on desktop)
- ☁️ **Supabase** for database + passport-scan storage
- ⚡ Optimistic updates + toast feedback

## Columns

Name · Passport Number · Labour ID · Narrative · Narrative Phone · Current Status · Tasheer · Tasheer Date · Ticket · Ticket Date · Traveled · Payment · Passport Scan

## Getting started

```bash
npm install
npm run dev
```

Then set up Supabase (see below) so data can be saved.

## Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard: **SQL Editor → New query**, paste the contents of
   [`supabase-schema.sql`](./supabase-schema.sql) and click **Run**.
   This creates the `candidates` table, the `passport-scans` storage bucket,
   and the access policies.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Both values are in **Project Settings → API**.
4. Restart `npm run dev`.

## Build for production

```bash
npm run build
npm run preview
```

## Security note

The frontend uses the public **anon** key and the SQL policies allow the `anon`
role full access — fine for an internal/demo tool. For a public deployment, add
[Supabase Auth](https://supabase.com/docs/guides/auth) and tighten the Row Level
Security policies in `supabase-schema.sql`.
# candidate-tracker
