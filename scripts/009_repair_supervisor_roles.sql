-- 009: Repair accounts that asked for "supervisor" at signup but got "student"
--
-- Between migration 006 (2026-09) and 008, every signup became a student even
-- when the form said "supervisor". The requested role is still in the auth
-- metadata, so we can fix exactly those accounts and nobody else.
--
-- Run the SELECT first, read the list, then run the UPDATE.

-- 1. Preview: who is affected?
SELECT p.email, p.first_name, p.last_name, p.role AS current_role,
       u.raw_user_meta_data ->> 'role' AS requested_role, p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'student'
  AND u.raw_user_meta_data ->> 'role' = 'supervisor'
ORDER BY p.created_at;

-- 2. Fix them (same condition, so the list above is exactly what changes).
UPDATE public.profiles p
SET role = 'supervisor'
FROM auth.users u
WHERE u.id = p.id
  AND p.role = 'student'
  AND u.raw_user_meta_data ->> 'role' = 'supervisor';

-- 3. Check: should return 0 rows.
SELECT count(*) AS still_wrong
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'student' AND u.raw_user_meta_data ->> 'role' = 'supervisor';
