"use client"

/**
 * Client-side data layer.
 *
 * Every call goes straight from the browser to Supabase with the user's own
 * session. Authorization is enforced by the row-level-security policies in
 * scripts/*.sql, not by application code. There is no server component and no
 * service-role key anywhere in the app.
 */
import { createClient } from "@/lib/supabase/client"

export type Role = "student" | "supervisor" | "admin" | "observer"
export const ROLES: readonly Role[] = ["student", "supervisor", "admin", "observer"] as const

export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: Role
  created_at: string
  updated_at?: string
}

export interface SubjectInput {
  title: string
  description: string
  pdf_url: string | null
  team_info: string
  main_supervisor_name: string
  main_supervisor_email: string
  co_supervisors_names: string
  co_supervisors_emails: string
}

const PDF_BUCKET = "subject-pdfs"

function friendly(error: { code?: string; message: string } | null, fallback: string): Error {
  if (!error) return new Error(fallback)
  if (error.code === "23505") {
    // unique_violation on assignments(student_id) or assignments(subject_id)
    if (error.message.includes("student_id")) return new Error("Student already has an assignment")
    if (error.message.includes("subject_id")) return new Error("Subject is already assigned to another student")
  }
  if (error.code === "42501") return new Error("You are not allowed to do that")
  return new Error(error.message || fallback)
}

// ---------------------------------------------------------------------------
// Session / profile
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = createClient()
  const user = await getCurrentUser()
  if (!user) return null
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  return (data as Profile | null) ?? null
}

export async function updateMyProfile(first_name: string, last_name: string): Promise<Profile> {
  const supabase = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("profiles")
    .update({ first_name, last_name })
    .eq("id", user.id)
    .select()
    .single()
  if (error) throw friendly(error, "Failed to update profile")
  return data as Profile
}

// ---------------------------------------------------------------------------
// Admin: users
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })
  if (error) throw friendly(error, "Failed to load users")
  return (data as Profile[]) ?? []
}

export async function setUserRole(userId: string, role: Role): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId)
  if (error) throw friendly(error, "Failed to change role")
}

export async function deleteUserProfile(userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("profiles").delete().eq("id", userId)
  if (error) throw friendly(error, "Failed to delete user")
}

// ---------------------------------------------------------------------------
// Admin: choices and assignments
// ---------------------------------------------------------------------------

export async function listChoices() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("student_choices")
    .select(
      `id, student_id, subject_id, choice_rank, created_at,
       student:profiles!student_id(first_name, last_name, email),
       subject:subjects!subject_id(title, main_supervisor_name)`,
    )
    .order("created_at", { ascending: false })
  if (error) throw friendly(error, "Failed to load choices")
  return data ?? []
}

/** Shape used by the admin dashboard. */
export async function listAssignments() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("assignments")
    .select(
      `id, student_id, subject_id, assigned_by, created_at,
       student:profiles!student_id(first_name, last_name, email),
       subject:subjects!subject_id(title, main_supervisor_name),
       assigned_by_profile:profiles!assigned_by(first_name, last_name)`,
    )
    .order("created_at", { ascending: false })
  if (error) throw friendly(error, "Failed to load assignments")
  return data ?? []
}

/** Shape used by the observer dashboard. */
export async function listAssignmentsDetailed() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("assignments")
    .select(
      `*,
       student:profiles!assignments_student_id_fkey(id, first_name, last_name, email),
       subject:subjects!assignments_subject_id_fkey(id, title, description, main_supervisor_name,
         main_supervisor_email, co_supervisors_names, co_supervisors_emails, status)`,
    )
    .order("created_at", { ascending: false })
  if (error) throw friendly(error, "Failed to load assignments")
  return data ?? []
}

export async function createAssignment(student_id: string, subject_id: string) {
  const supabase = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const { data, error } = await supabase
    .from("assignments")
    .insert({ student_id, subject_id, assigned_by: user.id })
    .select()
    .single()
  if (error) throw friendly(error, "Failed to create assignment")
  return data
}

export async function deleteAssignment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("assignments").delete().eq("id", id)
  if (error) throw friendly(error, "Failed to delete assignment")
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function listAllSubjects() {
  const supabase = createClient()
  const { data, error } = await supabase.from("subjects").select("*").order("created_at", { ascending: false })
  if (error) throw friendly(error, "Failed to load subjects")
  return data ?? []
}

export async function createSubject(input: SubjectInput): Promise<void> {
  const supabase = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("subjects").insert({
    ...input,
    co_supervisors_names: input.co_supervisors_names || "",
    co_supervisors_emails: input.co_supervisors_emails || "",
    supervisor_id: user.id,
  })
  if (error) throw friendly(error, "Failed to submit subject")
}

/**
 * Supervisors editing their subject send it back to "pending" for review
 * (the RLS policy also refuses any other status from a supervisor).
 * Admins editing keep the current status.
 */
export async function updateSubject(id: string, input: SubjectInput, role: Role): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, unknown> = {
    ...input,
    co_supervisors_names: input.co_supervisors_names || "",
    co_supervisors_emails: input.co_supervisors_emails || "",
  }
  if (role === "supervisor") patch.status = "pending"
  const { error } = await supabase.from("subjects").update(patch).eq("id", id)
  if (error) throw friendly(error, "Failed to update subject")
}

// ---------------------------------------------------------------------------
// PDF storage
// ---------------------------------------------------------------------------

/** Upload a PDF into the caller's own folder. Returns "subject-pdfs/<uid>/<ts>.pdf". */
export async function uploadSubjectPdf(file: File): Promise<string> {
  const supabase = createClient()
  const user = await getCurrentUser()
  if (!user) throw new Error("Unauthorized")
  const ext = (file.name.split(".").pop() || "").toLowerCase()
  if (ext !== "pdf" || (file.type && file.type !== "application/pdf")) throw new Error("Only PDF files are accepted")
  if (file.size > 20 * 1024 * 1024) throw new Error("File too large (max 20 MB)")
  const objectPath = `${user.id}/${Date.now()}.pdf`
  const { error } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(objectPath, file, { contentType: "application/pdf", upsert: false })
  if (error) throw new Error(error.message || "Failed to upload PDF")
  return `${PDF_BUCKET}/${objectPath}`
}

/** Turn a stored "bucket/object" reference (or a plain URL) into an openable URL. */
export async function resolvePdfUrl(pdfField: string | null | undefined): Promise<string | null> {
  if (!pdfField) return null
  if (/^https?:\/\//i.test(pdfField)) return pdfField
  const firstSlash = pdfField.indexOf("/")
  if (firstSlash <= 0) return null
  const bucket = pdfField.slice(0, firstSlash)
  const objectPath = pdfField.slice(firstSlash + 1)
  if (bucket !== PDF_BUCKET) return null
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300)
  if (error) return null
  return data?.signedUrl ?? null
}

// ---------------------------------------------------------------------------
// Email (Supabase Edge Function; the Resend key lives there, never in the browser)
// ---------------------------------------------------------------------------

export interface AssignmentEmailPayload {
  studentEmail: string
  studentName: string
  subjectTitle: string
  supervisorName: string
}

export async function sendAssignmentEmail(payload: AssignmentEmailPayload): Promise<{ emailId?: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke("send-assignment-email", { body: payload })
  if (error) {
    // FunctionsHttpError carries the function's JSON body in context
    let detail = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === "function") {
        const j = await ctx.json()
        if (j?.error) detail = j.error
      }
    } catch {}
    throw new Error(detail || "Failed to send email")
  }
  if (data && data.success === false) throw new Error(data.error || "Failed to send email")
  return { emailId: data?.emailId }
}
