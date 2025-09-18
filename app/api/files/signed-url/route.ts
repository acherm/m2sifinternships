import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const path = url.searchParams.get("path")
    const expiresIn = Number(url.searchParams.get("expiresIn") || 300) // default 5 minutes

    if (!path) return NextResponse.json({ error: "Missing path" }, { status: 400 })

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
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })

    const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // path should be of form `${bucket}/${objectPath}`
    const firstSlash = path.indexOf("/")
    if (firstSlash <= 0) return NextResponse.json({ error: "Invalid path format" }, { status: 400 })

    const bucket = path.slice(0, firstSlash)
    const objectPath = path.slice(firstSlash + 1)

    const { data, error } = await service.storage.from(bucket).createSignedUrl(objectPath, expiresIn)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ url: data?.signedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal error" }, { status: 500 })
  }
}


