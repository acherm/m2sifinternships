# Deploying the internships app on the university VM

Public URL: https://m2sif2627.istic.univ-rennes1.fr/ (SSH reachable only from the
ISTIC network, e.g. via the `welcome1` login server).

## Architecture

The app is a **static site**: `next build` (with `output: "export"`) writes plain
HTML/JS to `out/`, which nginx serves. There is no Node server in production.
The browser talks directly to Supabase (auth, database, storage) and to the
Supabase Edge Function `send-assignment-email` (which holds the Resend key).
Authorization is enforced by the row-level-security policies in `scripts/`.

Consequence: the VM needs **no outbound network access** except to GitHub
(`git pull`) and the npm registry (`npm ci`) at update time.

## First install (once, on the VM)

```bash
curl -fsSL https://raw.githubusercontent.com/acherm/m2sifinternships/main/deploy/bootstrap.sh | bash
```

This clones the repo to `/var/www/m2sif` and installs Node.js 22, nginx and certbot.

## Environment file (once)

Create `/var/www/m2sif/.env.local` (only public values are needed now):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://m2sif2627.istic.univ-rennes1.fr
```

`NEXT_PUBLIC_*` values are baked in at build time. The service-role and Resend
keys are **not** used by the site any more and should not be on the VM.

## Certificate (once)

```bash
sudo certbot certonly --nginx -d m2sif2627.istic.univ-rennes1.fr
```

## Build and publish (first time and every update)

Push to `main` on GitHub, then on the VM:

```bash
bash /var/www/m2sif/deploy/update.sh
```

## Supabase side

- Run `scripts/006_lock_down_roles.sql` then `scripts/007_client_only_policies.sql`
  in the SQL editor.
- Authentication > URL Configuration: add
  `https://m2sif2627.istic.univ-rennes1.fr/auth/confirm` to the redirect list.
- Edge function (from a machine with the Supabase CLI, logged in and linked):

  ```bash
  supabase functions deploy send-assignment-email --use-api
  supabase secrets set RESEND_API_KEY=re_... SITE_URL=https://m2sif2627.istic.univ-rennes1.fr
  ```

## Useful commands on the VM

```bash
sudo nginx -t && sudo systemctl reload nginx
sudo tail -f /var/log/nginx/error.log
sudo certbot renew --dry-run
```
