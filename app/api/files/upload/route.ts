import { NextResponse, type NextRequest } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const file = form.get("file") as File | null
    const userId = form.get("userId") as string | null

    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 })
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const supabase = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const ext = (file.name.split(".").pop() || "pdf").toLowerCase()
    const objectPath = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("subject-pdfs")
      .upload(objectPath, bytes, { contentType: file.type || "application/pdf", upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    return NextResponse.json({ path: `subject-pdfs/${objectPath}` })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}


