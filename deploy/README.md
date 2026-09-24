# Deploying the internships app on the university VM

Public URL: http://m2sif202627.univ-rennes1.fr/ (VM: m2sif2627.istic.univ-rennes1.fr,
reachable over SSH only from the ISTIC network, e.g. via the `welcome1` login server).

## First install (once, on the VM)

```bash
curl -fsSL https://raw.githubusercontent.com/acherm/m2sifinternships/main/deploy/bootstrap.sh | bash
```

This clones the repo to `/var/www/m2sif`, installs Node.js 22, nginx and a
`m2sif` systemd service, and enables the nginx site. It then stops because
`.env.local` does not exist yet.

## Environment file (once)

Create `/var/www/m2sif/.env.local` with the same keys as the local one
(Supabase URL and keys, Resend key) and the public site URL:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
NEXT_PUBLIC_SITE_URL=http://m2sif202627.univ-rennes1.fr
```

`NEXT_PUBLIC_*` values are baked in at build time, so set the URL before building.
Then `chmod 600 .env.local` and run `bash /var/www/m2sif/deploy/update.sh`.

## Every later update

Push to `main` on GitHub, then on the VM:

```bash
bash /var/www/m2sif/deploy/update.sh
```

## HTTPS

Once the public hostname reaches the VM on port 80 from the internet:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d m2sif202627.univ-rennes1.fr
```

then change `NEXT_PUBLIC_SITE_URL` to `https://...` and run `update.sh` again.
If the university terminates TLS on a front proxy instead, nothing to do here.

## Supabase settings to update for the new URL

Authentication > URL Configuration: add `http://m2sif202627.univ-rennes1.fr/auth/confirm`
to the redirect allow list (and the https variant later).

## Useful commands on the VM

```bash
systemctl status m2sif          # service state
journalctl -u m2sif -f          # app logs
sudo nginx -t && sudo systemctl reload nginx
```
