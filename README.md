# Daymark — Life Tracker (GitHub + Vercel edition)

Daily priorities, study sessions, sleep, energy, reflections, and a seven-day overview.

## Data and privacy

This edition stores entries in your browser's localStorage. There is no account or cloud database. Your entries do not sync between browsers or devices and can be lost if you clear site data. Data from the separately hosted private Sites edition is not automatically transferred. Anyone with the Vercel URL can open the blank app, but they cannot see entries stored in your browser.

## Deploy using GitHub Desktop and Vercel

1. Extract this ZIP to a folder. Do not upload the ZIP itself as your repository's only file.
2. In GitHub Desktop, choose **File → Add local repository** and select the extracted folder. If it says the folder is not a Git repository, choose **Create a repository here**. Commit the files and click **Publish repository**. Choose **Private** if you want the source code private.
3. In Vercel, choose **Add New → Project**, connect GitHub if prompted, and import the Daymark repository.
4. Keep **Next.js** as the detected framework and the repository root as the root directory. No environment variables are needed. Click **Deploy**.
5. Vercel gives you a `*.vercel.app` address automatically. A custom domain is optional. New commits to the connected GitHub branch trigger new deployments.

Vercel's default deployment is publicly reachable by URL. This version contains no server-side authentication. For synced private data across devices, add a database and sign-in before storing entries on a server.

## Local development

Requires Node.js 22.13+ and pnpm 11 (or Corepack). Run `pnpm install`, then `pnpm dev`. Verify the production build with `pnpm build`.
