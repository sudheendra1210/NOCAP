# NO CAP — quick start

Welcome! This guide shows how to open a local preview of the NO CAP website on Windows. You can browse the public page and its demo theories without setting up login or a database.

## Open the website on your computer

### 1. Download the project

1. Open the [NO CAP GitHub repository](https://github.com/sudheendra1210/NOCAP).
2. Select **Code**, then **Download ZIP**.
3. When the download finishes, right-click the ZIP and choose **Extract All**.

### 2. Install Node.js

Install Node.js from [nodejs.org](https://nodejs.org/). This project needs Node.js **20.19 or newer in the 20.x line, or 22.12 or newer**.

### 3. Open the app folder in VS Code

1. Open Visual Studio Code.
2. Select **File → Open Folder**.
3. In the extracted project, open the inner folder named **NO-CAP**—the one that contains `package.json`.
4. If VS Code asks whether you trust the folder, choose **Trust** only if you downloaded it from the repository above.

### 4. Start the preview

In VS Code, select **Terminal → New Terminal**. Copy and paste these commands one at a time, pressing **Enter** after each:

```powershell
npm install
```

Wait until it finishes, then run:

```powershell
npm run dev
```

The terminal will show a local address, usually `http://localhost:5173/`. Copy that address into Chrome or Edge. Keep the terminal open while viewing the site. To stop the preview, return to the terminal and press **Ctrl+C**.

> Don’t open `index.html` by double-clicking it. The site needs Vite to load its JavaScript modules and 3D model correctly.

## What works without extra setup?

- The landing page, countdown, and rotating 3D model.
- Home and Theories navigation.
- Public demo theories.
- The temporary photo-viewer preview in Curiosity Stall.

The site currently has one temporary gallery image. The slideshow arrows become useful once the real stall photos are added.

Login requires the project’s Clerk configuration. Live theory submissions require Supabase and the secure Clerk-to-Supabase integration to be configured by the project owner. Without those, you can still browse the page, but login or live submissions may be unavailable.

## Local configuration (optional)

The owner can provide the **publishable** Clerk and Supabase values privately if you need to try login. Create a file named `.env.local` in the same **NO-CAP** folder as `package.json`, then add the variable names below with the values the owner provides:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_CLERK_SUPABASE_INTEGRATION_READY=false
```

`VITE_SUPABASE_ANON_KEY` can be used instead of `VITE_SUPABASE_PUBLISHABLE_KEY` if that is what the owner provides. Do not add or share Clerk secret keys, Supabase service-role keys, or the `.env.local` file. It is ignored by Git and must stay on your own computer. Leave the integration flag set to `false` unless the owner confirms that secure Clerk-to-Supabase authorization is fully configured.

After changing `.env.local`, stop and restart the preview with `npm run dev`.

## Important

`localhost` is only reachable on the computer running the preview. A friend on another computer cannot open your `localhost` link. To view the website without installing anything, the project owner must deploy it to a web host and share that public link.
