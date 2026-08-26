# ID Card Management System

Clean-rebuild ID card module, meant to be dropped into the Palak Enterprises
project (or run standalone). Built to the spec: Vite + React + TypeScript +
Tailwind on the frontend, Supabase (Postgres + Auth + Storage) on the backend.

## What's here

```
supabase/migrations/0001_idcard_schema.sql   schema + RLS + storage bucket
src/lib/supabase/client.ts                   the ONE Supabase client instance
src/context/AuthContext.tsx                  auth state machine (4 terminal states)
src/components/auth/RequireIdCardAccess.tsx  UX-level route guard
src/lib/idcard/                              types, database access layer,
                                              validation, CSV import, generation
src/pages/admin/idcard/                      the six pages from the spec
src/components/idcard/                       reusable UI pieces
```

## Setup

1. **Run the migration.** In your Supabase project's SQL editor, run
   `supabase/migrations/0001_idcard_schema.sql`. It's additive/idempotent —
   safe on a project that already has other tables (uses `if not exists` /
   `drop policy if exists` throughout).

2. **Create your first user role.** The migration doesn't seed anyone into
   `user_roles`, since it can't know your Supabase user IDs. After you sign
   up/in once, run:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('<your-auth-uid>', 'ADMIN');
   ```

3. **Env vars.** Copy `.env.example` to `.env.local` and fill in your real
   project URL and anon key.

4. **Google OAuth (optional).** If you want the Google button to work,
   enable the Google provider in Supabase Auth settings and add
   `<your-domain>/auth/callback` as an authorized redirect URL.

5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## What I verified here (no live Supabase access in my sandbox)

- `npx tsc -b` → **PASS**
- `npm run build` → **PASS**
- `npx oxlint` → **0 errors**, 9 stylistic warnings (all "fetch data in
  useEffect" patterns — oxlint's react-compiler rule flags these on principle,
  but it's the standard, correct way to load data on mount in a non-Suspense
  app; nothing here causes an infinite loop or duplicate request)

## What I could NOT verify — do this yourself before calling it done

- **The 10-reload forensic test** from the spec. I have no live browser or
  network path to your Supabase project from here. Open `/admin/id-cards`
  ten times in a row, watch the network tab, and confirm: no infinite
  spinner, no duplicate auth calls, no duplicate project fetch triggered by
  a token refresh.
- **RLS policies against real data.** The policies are written and are
  logically sound (ADMIN full access, MANAGER project-level access, STAFF
  read/write on persons only), but they need to be exercised against your
  actual project with real ADMIN/MANAGER/STAFF accounts.
- **Google OAuth end-to-end.** Code is standard `signInWithOAuth`, but I
  can't click through a real consent screen from here.
- **Photo upload / signed URLs against your storage bucket.** Bucket and
  policies are created by the migration; upload/download logic is written
  and type-checks, but hasn't touched a real bucket.

## Known simplifications

- The template editor positions fields in millimeters on a simple absolute
  grid — no drag-and-drop yet, just numeric X/Y/W/H inputs. Matches the
  spec's "keep it simple, not a graphic design editor" instruction.
- Card rendering uses the Canvas API directly (no `html2canvas`), so fonts
  render exactly as specified in `sans-serif` — swap in a custom font by
  loading it via `FontFace` before calling `renderCardToBlob` if you want
  something other than the system sans-serif.
- CSV import only requires `student_id` and `name`; everything else is
  optional, per school ID-card reality (not every school tracks blood group,
  address, etc. for every student).
