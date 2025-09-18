import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"

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

    // Verify user owns the subject or is admin
    const { data: profile } = await supabase.from("profiles").select("id, role").eq("id", user.id).single()
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Check if user owns the subject or is admin
    const { data: subjectData } = await service.from("subjects").select("supervisor_id").eq("id", payload.id).single()
    if (!subjectData) return NextResponse.json({ error: "Subject not found" }, { status: 404 })

    if (subjectData.supervisor_id !== user.id && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: any = {
      title: payload.title,
      description: payload.description,
      pdf_url: payload.pdf_url ?? null,
      team_info: payload.team_info,
      main_supervisor_name: payload.main_supervisor_name,
      main_supervisor_email: payload.main_supervisor_email,
      co_supervisors_names: payload.co_supervisors_names || "",
      co_supervisors_emails: payload.co_supervisors_emails || "",
      updated_at: new Date().toISOString(),
    }

    // If supervisor is updating (not admin), set status to "pending" for review
    if (profile.role === "supervisor") {
      updateData.status = "pending"
    }

    const { error } = await service.from("subjects").update(updateData).eq("id", payload.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}
