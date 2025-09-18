import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || !["admin", "observer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const { data, error } = await service
      .from("assignments")
      .select(`
        id,
        student_id,
        subject_id,
        assigned_by,
        created_at,
        student:profiles!student_id(
          first_name,
          last_name,
          email
        ),
        subject:subjects!subject_id(
          title,
          main_supervisor_name
        ),
        assigned_by_profile:profiles!assigned_by(
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ assignments: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Check if student already has an assignment
    const { data: existingStudentAssignment } = await service
      .from("assignments")
      .select("id")
      .eq("student_id", payload.student_id)
      .single()

    if (existingStudentAssignment) {
      return NextResponse.json({ error: "Student already has an assignment" }, { status: 400 })
    }

    // Check if subject is already assigned
    const { data: existingSubjectAssignment } = await service
      .from("assignments")
      .select("id")
      .eq("subject_id", payload.subject_id)
      .single()

    if (existingSubjectAssignment) {
      return NextResponse.json({ error: "Subject is already assigned to another student" }, { status: 400 })
    }

    const { data, error } = await service
      .from("assignments")
      .insert({
        student_id: payload.student_id,
        subject_id: payload.subject_id,
        assigned_by: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ assignment: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}
