import { NextResponse, type NextRequest } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { getRouteUser } from "@/lib/supabase/route-auth"

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!["supervisor", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })

    const ext = (file.name.split(".").pop() || "").toLowerCase()
    if (ext !== "pdf" || (file.type && file.type !== "application/pdf")) {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 })
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const bytes = new Uint8Array(await file.arrayBuffer())
    // The folder is the authenticated user's id, never a client-supplied value.
    const objectPath = `${user.id}/${Date.now()}.pdf`

    const { error: uploadError } = await supabase.storage
      .from("subject-pdfs")
      .upload(objectPath, bytes, { contentType: "application/pdf", upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    return NextResponse.json({ path: `subject-pdfs/${objectPath}` })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Internal error" }, { status: 500 })
  }
}
