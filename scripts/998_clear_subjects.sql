-- 998: Clear last year's internship subjects (and what depends on them)
--
-- !!! DESTRUCTIVE. Run by hand in the Supabase SQL editor, after a backup. !!!
--
-- Deletes:  all subjects, all student choices, all assignments.
-- Keeps:    every account (students, supervisors, admins, observers).
-- Does NOT: delete the PDF files in the "subject-pdfs" storage bucket. Empty the
--           bucket from the dashboard (Storage > subject-pdfs > select all > Delete),
--           or leave the files; nothing references them any more.
--
-- Backup first, e.g. from the dashboard (Table Editor > subjects > Export as CSV,
-- same for student_choices and assignments), or from a machine with the CLI:
--     supabase db dump --linked --data-only -f backup-$(date +%F).sql
--
-- The whole script runs in one transaction: check the counts before COMMIT.

BEGIN;

-- Before
SELECT 'before' AS step,
       (SELECT count(*) FROM public.assignments)     AS assignments,
       (SELECT count(*) FROM public.student_choices) AS choices,
       (SELECT count(*) FROM public.subjects)        AS subjects,
       (SELECT count(*) FROM public.profiles)        AS profiles;

-- Children first (they also cascade from subjects, but be explicit).
DELETE FROM public.assignments;
DELETE FROM public.student_choices;
DELETE FROM public.subjects;

-- After: the first three must be 0, profiles unchanged.
SELECT 'after' AS step,
       (SELECT count(*) FROM public.assignments)     AS assignments,
       (SELECT count(*) FROM public.student_choices) AS choices,
       (SELECT count(*) FROM public.subjects)        AS subjects,
       (SELECT count(*) FROM public.profiles)        AS profiles;

-- If the counts look right:
COMMIT;
-- If not:
-- ROLLBACK;
