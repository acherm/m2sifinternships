-- 999: Reset the database for a new academic year
--
-- !!! DESTRUCTIVE. Run by hand, only after taking a backup. !!!
--
-- Backup first, either from the dashboard (Database > Backups, or export each
-- table from the Table Editor as CSV) or from the CLI:
--
--     supabase db dump --linked -f backup-$(date +%F).sql --data-only
--
-- What this deletes:
--   - all assignments
--   - all student choices
--   - all subjects (the PDFs in the "subject-pdfs" storage bucket are NOT
--     deleted by SQL; empty the bucket from Storage in the dashboard)
--   - all accounts whose role is "student" (both the profile and the auth user)
--
-- What this keeps:
--   - admin, observer and supervisor accounts, so supervisors can log in and
--     resubmit or duplicate their subjects.
--
-- Run it inside a transaction so a mistake can be rolled back before COMMIT.

BEGIN;

DELETE FROM public.assignments;
DELETE FROM public.student_choices;
DELETE FROM public.subjects;

-- Remove student accounts. Deleting from auth.users cascades to profiles
-- (profiles.id references auth.users(id) ON DELETE CASCADE).
DELETE FROM auth.users
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'student');

-- Sanity check before committing: these should all be 0, and the last one
-- should list only supervisors, admins and observers.
SELECT count(*) AS assignments FROM public.assignments;
SELECT count(*) AS choices     FROM public.student_choices;
SELECT count(*) AS subjects    FROM public.subjects;
SELECT role, count(*) FROM public.profiles GROUP BY role;

-- If the counts look right:
COMMIT;
-- If not:
-- ROLLBACK;
