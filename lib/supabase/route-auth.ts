import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"

export type Role = "student" | "supervisor" | "admin" | "observer"

export interface RouteUser {
  id: string
  email: string | null
  role: Role
}

/**
 * Resolve the logged-in user for an API route from the request cookies.
 * Returns null when there is no valid session or no profile.
 */
export async function getRouteUser(request: NextRequest): Promise<RouteUser | null> {
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
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!profile) return null

  return { id: user.id, email: user.email ?? null, role: profile.role as Role }
}

/** Escape a string for safe interpolation into HTML (e.g. email bodies). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
