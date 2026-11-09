# NO CAP app

This folder contains the Vite app. For beginner-friendly download and run steps, see the [repository quick-start guide](../README.md).

## Main files

- `index.html` and `style.css` — page sections and visual styling
- `script.js` — countdown and rotating Three.js hero model
- `auth.js` and `auth-ui.js` — shared Clerk instance and custom sign-in/sign-up UI
- `community.js` — public theories, submission flow, and profile placeholder panels
- `supabase.js` — Supabase client setup and safe configuration checks
- `photo-gallery.js` — accessible photo slideshow/lightbox
- `supabase/migrations/` — SQL migration for the theories table and its policies
- `assets/logo.png` and `assets/dancer.glb` — NO CAP branding and hero model

## Configuration and data

Local environment values belong in `.env.local`, beside `package.json`. Never commit that file, Clerk secret keys, or Supabase service-role keys. Public theory submissions stay disabled until the project owner confirms the secure Clerk-to-Supabase integration is configured.
