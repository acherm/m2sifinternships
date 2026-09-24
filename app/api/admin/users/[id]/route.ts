import { NextResponse, type NextRequest } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getRouteUser } from "@/lib/supabase/route-auth"

const ROLES = ["student", "supervisor", "admin", "observer"] as const

function serviceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
}

/** Change a user's role. Admins only. This is the sole way to grant admin or observer rights. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getRouteUser(request)
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const body = (await request.json()) as { role?: unknown }
    const role = body.role
    if (typeof role !== "string" || !(ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    if (id === admin.id && role !== "admin") {
      return NextResponse.json({ error: "You cannot remove your own admin role" }, { status: 400 })
    }

    const service = serviceClient()
    if (!service) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const { data, error } = await service
      .from("profiles")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, role")
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    console.log(`Admin ${admin.id} set role of ${id} to ${role}`)
    return NextResponse.json({ ok: true, profile: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getRouteUser(request)
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    if (id === admin.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 })
    }

    const service = serviceClient()
    if (!service) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const { error } = await service.from("profiles").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 })
  }
}
