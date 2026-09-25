# Administrator and Observer Accounts

Since migration `scripts/006_lock_down_roles.sql`, **every new account is created as a student**, whatever page or API it was created from. The role stored in signup metadata is ignored by the database trigger, and users cannot change their own role (enforced by a row-level-security policy, not just by the UI).

Administrator and observer rights are granted only by an existing administrator.

## Granting admin or observer rights

1. Ask the person to sign up (any signup page works; `/auth/admin-signup` and `/auth/observer-signup` still exist and explain the process).
2. Log in as an administrator and open the **User Management** tab of the dashboard.
3. Use the role selector next to the person's name to set `admin` or `observer`.

Behind the scenes the browser updates the `profiles` row directly. The row-level-security policy "Admins can update any profile" (scripts/007) only lets administrators do this, and refuses an admin demoting themself. There is no server in between.

## Bootstrapping the first administrator

On a fresh database with no admin yet, promote the first account directly in the Supabase SQL editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.org';
```

## Role permissions summary

| Role | Can view subjects | Can validate subjects | Can manage assignments | Can send emails | Can manage users |
|------|------------------|---------------------|----------------------|-----------------|------------------|
| Student | ✅ (validated only) | ❌ | ❌ | ❌ | ❌ |
| Supervisor | ✅ (own subjects) | ✅ (own subjects) | ❌ | ❌ | ❌ |
| Observer | ✅ (validated only) | ❌ | ❌ | ❌ | ❌ |
| Administrator | ✅ (all) | ✅ (all) | ✅ | ✅ | ✅ |

## History

Before September 2026 the two "hidden" signup URLs created admin and observer accounts directly, based on a role field sent by the browser. Anyone who knew the URL, or who called the Supabase signup API with the public anon key, could create an administrator. That path is closed.
